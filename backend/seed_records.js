const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function seedRecords() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log('Seeding records for Ananya Patel (patient1)...');
        
        // 1. Get Ananya Patel ID
        const [patients] = await connection.query(`
            SELECT p.patient_id FROM patients p 
            JOIN users u ON p.user_id = u.id 
            WHERE u.email = 'patient1@vitalsync.com'
        `);
        
        if (patients.length === 0) {
            console.log('Patient not found!');
            return;
        }
        const patientId = patients[0].patient_id;

        // 2. Get Doctor IDs
        const [doctors] = await connection.query('SELECT doctor_id FROM doctors LIMIT 2');
        if (doctors.length < 2) {
            console.log('Not enough doctors!');
            return;
        }

        // 3. Insert Records
        const records = [
            [patientId, doctors[0].doctor_id, 'Mild Hypertension', 'Amlodipine 5mg once daily', 'Follow up in 2 weeks. Reduce salt intake.', new Date('2026-03-10')],
            [patientId, doctors[1].doctor_id, 'Seasonal Allergies', 'Cetirizine 10mg as needed', 'Avoid pollen exposure.', new Date('2026-03-12')]
        ];

        for (const r of records) {
            await connection.query(
                'INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes, date) VALUES (?,?,?,?,?,?)',
                r
            );
        }

        console.log('✅ Records seeded successfully.');

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

seedRecords();
