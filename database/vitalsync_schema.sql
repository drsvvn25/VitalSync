-- ============================================================
-- VitalSync – Health Data Management System
-- Database Schema + Sample Data (Unified Version)
-- ============================================================

CREATE DATABASE IF NOT EXISTS vitalsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vitalsync;

-- ── 1. CORE MODULES ──────────────────────────────────────────

-- Users
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)                        NOT NULL,
  email       VARCHAR(150)                        NOT NULL UNIQUE,
  password    VARCHAR(255)                        NOT NULL,
  role        ENUM('patient','doctor','admin')    NOT NULL DEFAULT 'patient',
  phone       VARCHAR(20),
  created_at  DATETIME                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME                            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  patient_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT            NOT NULL UNIQUE,
  age         INT,
  gender      ENUM('Male','Female','Other'),
  blood_group VARCHAR(5),
  address     TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Clinics
CREATE TABLE IF NOT EXISTS clinics (
  clinic_id   INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  address     TEXT NOT NULL,
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),
  city        VARCHAR(100),
  district    VARCHAR(100),
  contact     VARCHAR(50),
  type        ENUM('hospital','clinic','pharmacy') DEFAULT 'clinic',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
  doctor_id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT         NOT NULL UNIQUE,
  clinic_id       INT,
  specialization  VARCHAR(100),
  experience      INT         DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE SET NULL
);

-- Vital Statistics
CREATE TABLE IF NOT EXISTS vital_stats (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  patient_id      INT            NOT NULL,
  heart_rate      DECIMAL(5,1),
  blood_pressure  VARCHAR(20),
  oxygen_level    DECIMAL(5,1),
  temperature     DECIMAL(4,1),
  sugar_level     DECIMAL(5,1),
  record_date     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  INDEX idx_patient_date (patient_id, record_date)
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  patient_id       INT  NOT NULL,
  doctor_id        INT  NOT NULL,
  appointment_date DATETIME NOT NULL,
  status           ENUM('pending','confirmed','rejected','completed') NOT NULL DEFAULT 'pending',
  notes            TEXT,
  priority         ENUM('normal','high') DEFAULT 'normal',
  queue_token      VARCHAR(20),
  queue_position   INT DEFAULT 0,
  triage_result    VARCHAR(50) DEFAULT 'Routine',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id)   ON DELETE CASCADE,
  INDEX idx_patient   (patient_id),
  INDEX idx_doctor    (doctor_id),
  INDEX idx_status    (status)
);

-- Medical Records
CREATE TABLE IF NOT EXISTS medical_records (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT  NOT NULL,
  doctor_id    INT  NOT NULL,
  diagnosis    TEXT NOT NULL,
  prescription TEXT,
  notes        TEXT,
  date         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id)   ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id  INT NOT NULL,
  patient_id    INT,
  type          ENUM('critical','sos','reminder','info') DEFAULT 'info',
  vital_type    VARCHAR(50),
  value         VARCHAR(100),
  message       TEXT NOT NULL,
  is_read       TINYINT(1) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recipient (recipient_id),
  INDEX idx_read (is_read)
);

-- Medication Schedules
CREATE TABLE IF NOT EXISTS medication_schedules (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  patient_id          INT NOT NULL,
  doctor_id           INT NOT NULL,
  record_id           INT NOT NULL,
  medicine_name       VARCHAR(100) NOT NULL,
  frequency_hours     INT NOT NULL,
  duration_days       INT NOT NULL,
  last_reminder_sent  DATETIME,
  start_date          DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active           TINYINT(1) DEFAULT 1,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id)   ON DELETE CASCADE,
  FOREIGN KEY (record_id)  REFERENCES medical_records(id) ON DELETE CASCADE
);

-- ── 2. ADVANCED MODULES ──────────────────────────────────────

-- Hospital Beds
CREATE TABLE IF NOT EXISTS beds (
  bed_id      INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id   INT NOT NULL,
  ward_type   VARCHAR(100) NOT NULL,
  bed_number  VARCHAR(50) NOT NULL,
  status      ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
  FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bed_allocations (
  allocation_id  INT AUTO_INCREMENT PRIMARY KEY,
  patient_id     INT NOT NULL,
  bed_id         INT NOT NULL,
  admission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  discharge_date DATETIME NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (bed_id) REFERENCES beds(bed_id) ON DELETE CASCADE
);

-- Blood Bank
CREATE TABLE IF NOT EXISTS blood_inventory (
  inventory_id    INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id       INT NOT NULL,
  blood_group     VARCHAR(5) NOT NULL,
  available_units INT DEFAULT 0,
  last_updated    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE CASCADE,
  UNIQUE KEY unique_clinic_blood (clinic_id, blood_group)
);

CREATE TABLE IF NOT EXISTS blood_requests (
  request_id    INT AUTO_INCREMENT PRIMARY KEY,
  patient_id    INT NOT NULL,
  blood_group   VARCHAR(5) NOT NULL,
  urgency_level ENUM('normal', 'high', 'critical') DEFAULT 'normal',
  units_needed  INT DEFAULT 1,
  status        ENUM('pending', 'fulfilled', 'cancelled') DEFAULT 'pending',
  request_date  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- Patient Wallet & Billing
CREATE TABLE IF NOT EXISTS patient_wallets (
  wallet_id   INT AUTO_INCREMENT PRIMARY KEY,
  patient_id  INT NOT NULL UNIQUE,
  balance     DECIMAL(10, 2) DEFAULT 0.00,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  transaction_id   INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id        INT NOT NULL,
  amount           DECIMAL(10, 2) NOT NULL,
  transaction_type ENUM('credit', 'debit') NOT NULL,
  description      TEXT,
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES patient_wallets(wallet_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medical_bills (
  bill_id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id        INT NOT NULL,
  record_id         INT NULL,
  consultation_fee  DECIMAL(10, 2) DEFAULT 0.00,
  medicines_cost    DECIMAL(10, 2) DEFAULT 0.00,
  total_amount      DECIMAL(10, 2) DEFAULT 0.00,
  status            ENUM('unpaid', 'paid') DEFAULT 'unpaid',
  bill_date         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE SET NULL
);

-- Ambulance System
CREATE TABLE IF NOT EXISTS ambulances (
  ambulance_id     INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_number   VARCHAR(50) NOT NULL UNIQUE,
  driver_name      VARCHAR(100),
  driver_phone     VARCHAR(20),
  status           ENUM('available', 'dispatched', 'maintenance') DEFAULT 'available',
  current_lat      DECIMAL(10, 8),
  current_lng      DECIMAL(11, 8),
  last_updated     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ambulance_requests (
  request_id       INT AUTO_INCREMENT PRIMARY KEY,
  patient_id       INT NOT NULL,
  ambulance_id     INT NULL,
  pickup_address   TEXT NOT NULL,
  pickup_lat       DECIMAL(10, 8) NULL,
  pickup_lng       DECIMAL(11, 8) NULL,
  status           ENUM('pending', 'dispatched', 'arrived', 'completed', 'cancelled') DEFAULT 'pending',
  request_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
  FOREIGN KEY (ambulance_id) REFERENCES ambulances(ambulance_id) ON DELETE SET NULL
);

-- Telemedicine
CREATE TABLE IF NOT EXISTS telemedicine_sessions (
  session_id     INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE,
  meeting_link   TEXT NOT NULL,
  status         ENUM('active', 'ended') DEFAULT 'active',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- Medication Adherence Tracking
CREATE TABLE IF NOT EXISTS reminders_sent (
  reminder_id     INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id     INT NOT NULL,
  patient_id      INT NOT NULL,
  status          ENUM('pending', 'taken', 'skipped') DEFAULT 'pending',
  sent_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  taken_at        DATETIME NULL,
  FOREIGN KEY (schedule_id) REFERENCES medication_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Core Users (Passwords: bcrypt hash of "Password@123")
INSERT IGNORE INTO users (name, email, password, role, phone) VALUES
('Dr. Priya Sharma',   'doctor1@vitalsync.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfY/RCT5CwEyy', 'doctor',  '9876543210'),
('Dr. Raj Mehta',      'doctor2@vitalsync.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfY/RCT5CwEyy', 'doctor',  '9876543211'),
('Ananya Patel',       'patient1@vitalsync.com','$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfY/RCT5CwEyy', 'patient', '9123456780');

-- Clinics
INSERT IGNORE INTO clinics (name, address, latitude, longitude, city, district, contact, type) VALUES
('Anand General Hospital', 'Town Hall Road, Anand, Gujarat', 22.5629, 72.9282, 'Anand', 'Anand', '02692-242200', 'hospital'),
('Zydus Hospital Anand',   'NH-8, Anand-Vidyanagar Road, Anand', 22.5472, 72.9507, 'Anand', 'Anand', '02692-660000', 'hospital');

-- Doctors
INSERT IGNORE INTO doctors (user_id, clinic_id, specialization, experience) VALUES
(1, 1, 'Cardiologist', 12),
(2, 2, 'General Physician', 8);

-- Patients
INSERT IGNORE INTO patients (user_id, age, gender, blood_group, address) VALUES
(3, 28, 'Female', 'B+', '12 MG Road, Ahmedabad, Gujarat');

-- Sample Beds
INSERT IGNORE INTO beds (clinic_id, ward_type, bed_number, status) VALUES 
(1, 'ICU', 'ICU-01', 'available'),
(1, 'General', 'GEN-10', 'available');

-- Sample Blood Inventory
INSERT IGNORE INTO blood_inventory (clinic_id, blood_group, available_units) VALUES
(1, 'A+', 10),
(1, 'O+', 15);

-- Sample Wallets
INSERT IGNORE INTO patient_wallets (patient_id, balance) VALUES
(1, 5000.00);

-- Sample Ambulances
INSERT IGNORE INTO ambulances (vehicle_number, driver_name, driver_phone, current_lat, current_lng) VALUES
('GJ01-AB-1234', 'Ramesh Kumar', '9898989898', 22.5629, 72.9282),
('GJ01-XY-9876', 'Suresh Patel', '9797979797', 22.5598, 72.9352);
