# 💙 VitalSync – Smart Health Data Synchronization System

> A complete full-stack healthcare management platform enabling patients and doctors to manage and synchronize health data in real time.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js |
| **Database** | MySQL |
| **Authentication** | JWT (JSON Web Tokens) + bcryptjs |
| **Frontend** | HTML5 + CSS3 + Bootstrap 5 + Chart.js |
| **API** | RESTful API |

---

## 📁 Project Structure

```
vitalsync/
├── backend/
│   ├── server.js              ← Express entry point
│   ├── package.json
│   ├── .env                   ← Environment variables
│   ├── config/
│   │   └── db.js              ← MySQL connection pool
│   ├── middleware/
│   │   └── auth.js            ← JWT + Role guard middleware
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── patientController.js
│   │   ├── doctorController.js
│   │   ├── vitalsController.js
│   │   ├── appointmentController.js
│   │   └── recordsController.js
│   └── routes/
│       ├── auth.js
│       ├── patient.js
│       ├── doctor.js
│       ├── vitals.js
│       ├── appointments.js
│       └── records.js
├── frontend/
│   ├── index.html             ← Landing page
│   ├── login.html
│   ├── register.html
│   ├── patient-dashboard.html
│   ├── doctor-dashboard.html
│   ├── add-health-data.html
│   ├── medical-records.html
│   ├── book-appointment.html
│   ├── patient-list.html
│   ├── prescriptions.html
│   ├── css/
│   │   └── style.css          ← Custom styles
│   └── js/
│       ├── auth.js            ← JWT helpers + apiFetch
│       └── charts.js          ← Chart.js renderers
└── database/
    └── vitalsync_schema.sql   ← Schema + Sample Data
```

---

## ⚙️ Setup Instructions

### Step 1 – Prerequisites

Make sure you have installed:
- [Node.js v18+](https://nodejs.org/)
- [MySQL 8+](https://dev.mysql.com/downloads/)
- A MySQL client (MySQL Workbench or CLI)

---

### Step 2 – Database Setup

Open MySQL CLI or Workbench and run:

```sql
source path/to/vitalsync/database/vitalsync_schema.sql
```

Or paste the file contents directly. This creates the `vitalsync` database with all tables and sample data.

---

### Step 3 – Backend Configuration

Open `backend/.env` and update your MySQL credentials:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE
DB_NAME=vitalsync
JWT_SECRET=vitalsync_super_secret_jwt_key_2024
JWT_EXPIRES_IN=24h
```

---

### Step 4 – Install Backend Dependencies

```bash
cd vitalsync/backend
npm install
```

---

### Step 5 – Start the Backend

```bash
npm start
# OR for development with auto-restart:
npm run dev
```

Server starts at: `http://localhost:5000`

Health check: `http://localhost:5000/api/health`

---

### Step 6 – Run the Frontend

Open the `frontend/` folder in any of these ways:

**Option A – VS Code Live Server** (Recommended)
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension and right-click `index.html` → **Open with Live Server**.

**Option B – Python simple server**
```bash
cd vitalsync/frontend
python -m http.server 3000
```
Then open: `http://localhost:3000`

**Option C – npx serve**
```bash
cd vitalsync/frontend
npx serve .
```

---

## 🔑 Sample Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Doctor** | `doctor1@vitalsync.com` | `Password@123` |
| **Doctor** | `doctor2@vitalsync.com` | `Password@123` |
| **Patient** | `patient1@vitalsync.com` | `Password@123` |
| **Patient** | `patient2@vitalsync.com` | `Password@123` |
| **Patient** | `patient3@vitalsync.com` | `Password@123` |

> The login page also has **Demo** buttons to auto-fill credentials.

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register patient or doctor |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/auth/me` | JWT | Get current user |

### Patient
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/patient/profile` | patient | Get own profile |
| PUT | `/api/patient/update` | patient | Update profile |
| GET | `/api/patient/all` | doctor | List all patients |
| GET | `/api/patient/:id` | doctor | Get patient by ID |

### Vitals
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/vitals/add` | patient | Add vital stats |
| GET | `/api/vitals/my/all` | patient | Get own vitals |
| GET | `/api/vitals/:patientId` | both | Get patient vitals |

### Appointments
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/appointments/book` | patient | Book appointment |
| GET | `/api/appointments/list` | both | List appointments |
| PUT | `/api/appointments/update/:id` | doctor | Confirm/reject |

### Medical Records
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/records/add` | doctor | Add medical record |
| GET | `/api/records/my/all` | patient | Own records |
| GET | `/api/records/:patientId` | both | Patient records |

---

## 🔒 Security Features

- ✅ Password hashing with **bcryptjs** (12 salt rounds)
- ✅ **JWT authentication** with 24h expiry
- ✅ **Role-based access control** (patient/doctor) on every protected route
- ✅ Input validation with **express-validator**
- ✅ Abnormal vitals detection and alerts

---

## 💡 Innovation Statement

> "VitalSync integrates patient vitals and medical records in a centralized system enabling real-time monitoring and improving communication between patients and healthcare providers."

---

## 👥 User Roles

### 🧑‍⚕️ Doctor
- View and manage all registered patients
- Monitor patient vital statistics with color-coded alerts
- Confirm or reject appointment requests
- Add diagnoses, prescriptions, and treatment notes

### 🧑‍🤝‍🧑 Patient
- Register and login securely
- Add daily vital statistics (heart rate, BP, oxygen, temperature)
- View real-time trend charts with historical data
- Book appointments with available doctors
- View full medical history and downloadable prescriptions

---

*Built with ❤️ for VitalSync Mini Project – 2026*
