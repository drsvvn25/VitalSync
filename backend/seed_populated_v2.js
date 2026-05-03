/**
 * VitalSync – Comprehensive Population Script (V2)
 * Run: node seed_populated_v2.js
 * 
 * Provides 5 clinics, 5 doctors, and 5 distinct patient profiles with 7+ vitals each
 * to demonstrate the full Analysis and Risk Prediction features.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seed() {
    console.log('\n🚀 VitalSync POPULATION SEEDER V2');
    console.log('====================================\n');

    try {
        console.log('🗑️  Clearing all existing tables...');
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        const tables = ['medication_schedules', 'notifications', 'medical_records', 'appointments', 'vital_stats', 'patients', 'doctors', 'clinics', 'users'];
        for (const table of tables) await db.query(`TRUNCATE TABLE ${table}`);
        await db.query('SET FOREIGN_KEY_CHECKS = 1');

        const hash = await bcrypt.hash('Password@123', 12);

        // 1. Users
        console.log('👤 Creating users...');
        const users = [
            ['Dr. Priya Sharma', 'doctor1@vitalsync.com', 'doctor'],
            ['Dr. Raj Mehta', 'doctor2@vitalsync.com', 'doctor'],
            ['Ananya Patel (Stable)', 'patient1@vitalsync.com', 'patient'],
            ['Rohit Verma (High HR)', 'patient2@vitalsync.com', 'patient'],
            ['Sita Krishnan (Low O2)', 'patient3@vitalsync.com', 'patient'],
            ['Amit Shah (Fever)', 'patient4@vitalsync.com', 'patient'],
            ['Priya Desai (High Sugar)', 'patient5@vitalsync.com', 'patient']
        ];
        const userIds = [];
        for (const u of users) {
            const [res] = await db.query('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', [u[0], u[1], hash, u[2]]);
            userIds.push(res.insertId);
        }

        // 2. Clinics
        console.log('🏥 Inserting 5 clinics...');
        const clinics = [
            ['Anand General Hospital', 'Town Hall Road, Anand', 22.5629, 72.9282, 'Anand', '02692-242200'],
            ['Zydus Hospital Anand', 'NH-8, Anand', 22.5472, 72.9507, 'Anand', '02692-660000'],
            ['Shree Krishna Hospital', 'Karamsad Road, Karamsad', 22.5598, 72.9352, 'Anand', '02692-244500'],
            ['Sanjivani Polyclinic', 'Station Road, Anand', 22.5636, 72.9310, 'Anand', '02692-255200'],
            ['Apollo Pharmacy - Anand', 'MG Road, Anand', 22.5622, 72.9298, 'Anand', '1800-180-1061']
        ];
        const clinicIds = [];
        for (const c of clinics) {
            const [res] = await db.query('INSERT INTO clinics (name, address, latitude, longitude, city, contact) VALUES (?,?,?,?,?,?)', c);
            clinicIds.push(res.insertId);
        }

        // 3. Doctors
        console.log('🩺 Creating doctor profiles...');
        const docSpecs = [['Cardiologist', 15], ['General Physician', 10]];
        const doctorIds = [];
        for (let i = 0; i < 2; i++) {
            const [res] = await db.query('INSERT INTO doctors (user_id, clinic_id, specialization, experience) VALUES (?,?,?,?)', [userIds[i], clinicIds[i], docSpecs[i][0], docSpecs[i][1]]);
            doctorIds.push(res.insertId);
        }

        // 4. Patients
        console.log('🧑 Creating patient profiles...');
        const patientData = [
            [userIds[2], 28, 'Female', 'B+', 'Ahmedabad'],
            [userIds[3], 35, 'Male', 'O+', 'Surat'],
            [userIds[4], 22, 'Female', 'A+', 'Vadodara'],
            [userIds[5], 45, 'Male', 'AB+', 'Anand'],
            [userIds[6], 30, 'Female', 'O-', 'Anand']
        ];
        const patientIds = [];
        for (const p of patientData) {
            const [res] = await db.query('INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?,?,?,?,?)', p);
            patientIds.push(res.insertId);
        }

        // 5. Vitals (7 records each for Trends)
        console.log('💓 Inserting detailed vital series for analysis...');
        const now = new Date();
        const vitalsSeries = [
            // P1: Stable
            Array.from({length:7}, (_, i) => [patientIds[0], 72 + Math.random()*2, '120/80', 98 + Math.random(), 36.6, 90, new Date(now - (7-i)*86400000)]),
            // P2: Increasing HR (Warning)
            Array.from({length:7}, (_, i) => [patientIds[1], 100 + i*4, '135/85', 96 + i/2, 36.8, 110, new Date(now - (7-i)*86400000)]),
            // P3: Decreasing O2 (Danger)
            Array.from({length:7}, (_, i) => [patientIds[2], 85 + Math.random()*5, '115/75', 98 - i*1.5, 37.0, 100, new Date(now - (7-i)*86400000)]),
            // P4: Fever (Spiking)
            Array.from({length:7}, (_, i) => [patientIds[3], 80 + i*2, '120/80', 97, 36.6 + i*0.4, 95, new Date(now - (7-i)*86400000)]),
            // P5: High Sugar (Danger)
            Array.from({length:7}, (_, i) => [patientIds[4], 78, '125/82', 98, 36.7, 150 + i*20, new Date(now - (7-i)*86400000)])
        ];

        for (const series of vitalsSeries) {
            for (const v of series) {
                await db.query('INSERT INTO vital_stats (patient_id, heart_rate, blood_pressure, oxygen_level, temperature, sugar_level, record_date) VALUES (?,?,?,?,?,?,?)', v);
            }
        }

        // 6. Appointments
        console.log('📅 Creating appointments...');
        const appointments = [
            [patientIds[0], doctorIds[0], '2026-03-20 10:00:00', 'confirmed', 'Monthly Heart Checkup'],
            [patientIds[1], doctorIds[0], '2026-03-21 11:30:00', 'pending', 'Chest palpitations monitoring'],
            [patientIds[2], doctorIds[1], '2026-03-19 09:00:00', 'confirmed', 'Respiratory difficulty follow-up'],
            [patientIds[3], doctorIds[1], '2026-03-22 14:00:00', 'pending', 'Fever assessment'],
            [patientIds[4], doctorIds[0], '2026-03-15 11:00:00', 'completed', 'Initial database population test']
        ];
        for (const a of appointments) {
            await db.query('INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES (?,?,?,?,?)', a);
        }

        // 7. Medical Records
        console.log('📋 Creating medical records...');
        const records = [
            [patientIds[0], doctorIds[0], 'Healthy Heart', 'None', 'Keep exercising.', new Date()],
            [patientIds[4], doctorIds[0], 'Type 2 Diabetes Initial diagnosis', 'Metformin 500mg', 'Starchy carbohydrate reduction', new Date()]
        ];
        for (const r of records) {
            await db.query('INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes, date) VALUES (?,?,?,?,?,?)', r);
        }

        console.log('\n🎉 Population V2 Complete! 🚀');
        console.log('5 Patients ready with distinct health trends for analysis.\n');

    } catch (err) {
        console.error('\n❌ SEED ERROR:', err);
    } finally {
        process.exit(0);
    }
}

seed();
