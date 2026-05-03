const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible to controllers
app.set('io', io);

// Doctor room management: when a doctor connects, they join a room by their user_id
io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join_room', (data) => {
        // Accept both plain userId (legacy) and { userId, role } object
        const userId = typeof data === 'object' ? data.userId : data;
        const role = typeof data === 'object' ? data.role : null;

        // Always join personal room
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined room user_${userId}`);

        // Doctors also join the shared 'doctors' broadcast room
        if (role === 'doctor') {
            socket.join('doctors');
            console.log(`👨‍⚕️ Doctor ${userId} joined broadcast room 'doctors'`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });

});

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/records', require('./routes/records'));
app.use('/api/beds', require('./routes/beds'));
app.use('/api/blood', require('./routes/blood'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/risk', require('./routes/risk'));
app.use('/api/trends', require('./routes/trends'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/ambulance', require('./routes/ambulance'));
app.use('/api/telemedicine', require('./routes/telemedicine'));
app.use('/api/clinics', require('./routes/clinics'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'VitalSync API is running 🚀', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
});

// ── Start server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`\n🏥 VitalSync Backend running at http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 Socket.io enabled\n`);

    // Start medication reminder scheduler
    require('./controllers/reminderController').scheduleReminders(io);
});

module.exports = { app, io };
