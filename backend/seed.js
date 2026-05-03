/**
 * VitalSync – Database Seed Script
 * Run: node seed.js
 * This clears existing data and re-inserts sample users with CORRECT bcrypt hashes.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seed() {
    console.log('\n🌱 VitalSync Database Seeder');
    console.log('================================\n');

    try {
        // 1️⃣  Clear existing data (order matters due to FKs)
        console.log('🗑️  Clearing existing data...');
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('TRUNCATE TABLE medical_records');
        await db.query('TRUNCATE TABLE medication_schedules');
        await db.query('TRUNCATE TABLE appointments');
        await db.query('TRUNCATE TABLE vital_stats');
        await db.query('TRUNCATE TABLE patients');
        await db.query('TRUNCATE TABLE doctors');
        await db.query('TRUNCATE TABLE clinics');
        await db.query('TRUNCATE TABLE users');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('   ✅ Tables cleared.\n');

        // 2️⃣  Generate bcrypt hash for shared password
        const RAW_PASSWORD = 'Password@123';
        console.log(`🔑 Hashing password "${RAW_PASSWORD}" (salt rounds: 12)...`);
        const hash = await bcrypt.hash(RAW_PASSWORD, 12);
        console.log(`   Hash: ${hash}\n`);

        // 3️⃣  Insert users
        console.log('👤 Inserting users...');
        const [r1] = await db.query(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?,?,?,?,?)',
            ['Dr. Priya Sharma', 'doctor1@vitalsync.com', hash, 'doctor', '9876543210']
        );
        const [r2] = await db.query(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?,?,?,?,?)',
            ['Dr. Raj Mehta', 'doctor2@vitalsync.com', hash, 'doctor', '9876543211']
        );
        const [r3] = await db.query(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?,?,?,?,?)',
            ['Ananya Patel', 'patient1@vitalsync.com', hash, 'patient', '9123456780']
        );
        const [r4] = await db.query(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?,?,?,?,?)',
            ['Rohit Verma', 'patient2@vitalsync.com', hash, 'patient', '9123456781']
        );
        const [r5] = await db.query(
            'INSERT INTO users (name, email, password, role, phone) VALUES (?,?,?,?,?)',
            ['Sita Krishnan', 'patient3@vitalsync.com', hash, 'patient', '9123456782']
        );
        const [doc1Id, doc2Id, doc3Id, doc4Id, doc5Id, p1Id, p2Id, p3Id] = [
            r1.insertId, r2.insertId,
            (await db.query('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', ['Dr. Anil Gupta', 'doctor3@vitalsync.com', hash, 'doctor']))[0].insertId,
            (await db.query('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', ['Dr. Meera Patil', 'doctor4@vitalsync.com', hash, 'doctor']))[0].insertId,
            (await db.query('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)', ['Dr. Sanjay Rao', 'doctor5@vitalsync.com', hash, 'doctor']))[0].insertId,
            r3.insertId, r4.insertId, r5.insertId
        ];
        console.log(`   ✅ 5 doctors, 3 patients inserted\n`);

        // 4️⃣  Insert clinics (Real map data from Anand)
        console.log('🏥 Inserting live map clinics...');
        const clinicsData = [
            ['Zydus Hospital Anand', 'Anand-Vidyanagar Road, Anand', 22.5560, 72.9510, 'Anand', 'Anand', '02692-200002'],
            ['Sanjivani Hospital', 'Grid Road, Anand', 22.5613, 72.9608, 'Anand', 'Anand', '02692-234000'],
            ['Ruchi Orthopaedic Hospital', 'Vallabh Vidyanagar, Anand', 22.5570, 72.9619, 'Anand', 'Anand', '02692-231111'],
            ['ND Desai Hospital', 'Dharmaj Road, Anand', 22.5401, 72.9351, 'Anand', 'Anand', '02692-243333'],
            ['Amit Hospital', 'Near Town Hall, Anand', 22.5567, 72.9582, 'Anand', 'Anand', '02692-250000']
        ];
        
        const clinicIds = [];
        for (const c of clinicsData) {
            const [res] = await db.query(
                'INSERT INTO clinics (name, address, latitude, longitude, city, district, contact) VALUES (?,?,?,?,?,?,?)',
                c
            );
            clinicIds.push(res.insertId);
        }
        console.log(`   ✅ ${clinicIds.length} Clinics inserted from live map logic\n`);

        // 5️⃣  Insert doctors
        console.log('🩺 Inserting doctor profiles...');
        await db.query('INSERT INTO doctors (user_id, clinic_id, specialization, experience) VALUES (?,?,?,?)', [doc1Id, clinicIds[0], 'Cardiologist', 10]);
        await db.query('INSERT INTO doctors (user_id, clinic_id, specialization, experience) VALUES (?,?,?,?)', [doc2Id, clinicIds[1], 'General Physician', 7]);
        await db.query('INSERT INTO doctors (user_id, clinic_id, specialization, experience) VALUES (?,?,?,?)', [doc3Id, clinicIds[2], 'Orthopaedic Surgeon', 15]);
        await db.query('INSERT INTO doctors (user_id, clinic_id, specialization, experience) VALUES (?,?,?,?)', [doc4Id, clinicIds[3], 'Neurologist', 8]);
        await db.query('INSERT INTO doctors (user_id, clinic_id, specialization, experience) VALUES (?,?,?,?)', [doc5Id, clinicIds[4], 'Pediatrician', 12]);

        const [[d1]] = await db.query('SELECT doctor_id FROM doctors WHERE user_id = ?', [doc1Id]);
        const [[d2]] = await db.query('SELECT doctor_id FROM doctors WHERE user_id = ?', [doc2Id]);
        console.log(`   ✅ Doctors inserted (doctor_id ${d1.doctor_id}, ${d2.doctor_id})\n`);

        // 6️⃣  Insert patients
        console.log('🧑 Inserting patient profiles...');
        await db.query('INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?,?,?,?,?)',
            [p1Id, 28, 'Female', 'B+', '12 MG Road, Ahmedabad, Gujarat']);
        await db.query('INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?,?,?,?,?)',
            [p2Id, 35, 'Male', 'O+', '45 Civil Lines, Surat, Gujarat']);
        await db.query('INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?,?,?,?,?)',
            [p3Id, 22, 'Female', 'A+', '78 Stadium Road, Vadodara, Gujarat']);
        const [[pt1]] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [p1Id]);
        const [[pt2]] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [p2Id]);
        const [[pt3]] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [p3Id]);
        console.log(`   ✅ Patients inserted (patient_id ${pt1.patient_id}, ${pt2.patient_id}, ${pt3.patient_id})\n`);

        // 7️⃣  Insert vital stats
        console.log('💓 Inserting vital stats...');
        const vitals = [
            [pt1.patient_id, 72.0, '120/80', 98.5, 36.6, '2026-03-01 08:00:00'],
            [pt1.patient_id, 88.0, '130/85', 97.0, 37.0, '2026-03-02 08:00:00'],
            [pt1.patient_id, 65.0, '118/78', 99.0, 36.5, '2026-03-03 08:00:00'],
            [pt1.patient_id, 110.0, '140/90', 94.0, 37.5, '2026-03-04 08:00:00'],
            [pt1.patient_id, 76.0, '122/82', 98.0, 36.7, '2026-03-05 08:00:00'],
            [pt2.patient_id, 80.0, '125/82', 96.0, 36.8, '2026-03-03 09:00:00'],
            [pt2.patient_id, 75.0, '120/80', 97.5, 36.6, '2026-03-05 09:00:00'],
            [pt3.patient_id, 68.0, '115/75', 99.0, 36.4, '2026-03-04 10:00:00'],
        ];
        for (const v of vitals) {
            await db.query(
                'INSERT INTO vital_stats (patient_id, heart_rate, blood_pressure, oxygen_level, temperature, record_date) VALUES (?,?,?,?,?,?)', v
            );
        }
        console.log(`   ✅ ${vitals.length} vital records inserted.\n`);

        // 8️⃣  Insert appointments
        console.log('📅 Inserting appointments...');
        await db.query('INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES (?,?,?,?,?)',
            [pt1.patient_id, d1.doctor_id, '2026-03-10 10:00:00', 'confirmed', 'Regular cardiac check-up']);
        await db.query('INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES (?,?,?,?,?)',
            [pt1.patient_id, d2.doctor_id, '2026-03-12 14:00:00', 'pending', 'Flu symptoms follow-up']);
        await db.query('INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES (?,?,?,?,?)',
            [pt2.patient_id, d1.doctor_id, '2026-03-11 11:00:00', 'pending', 'Chest pain review']);
        await db.query('INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, notes) VALUES (?,?,?,?,?)',
            [pt3.patient_id, d2.doctor_id, '2026-03-09 09:30:00', 'completed', 'Annual health check']);
        console.log('   ✅ 4 appointments inserted.\n');

        // 9️⃣  Insert medical records
        console.log('📋 Inserting medical records...');
        await db.query('INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes, date) VALUES (?,?,?,?,?,?)',
            [pt1.patient_id, d1.doctor_id, 'Mild hypertension', 'Amlodipine 5mg once daily', 'Reduce sodium intake. Exercise 30min daily.', '2026-02-15 10:00:00']);
        await db.query('INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes, date) VALUES (?,?,?,?,?,?)',
            [pt1.patient_id, d2.doctor_id, 'Viral fever', 'Paracetamol 500mg if temp > 38°C', 'Rest and adequate hydration.', '2026-02-20 11:30:00']);
        await db.query('INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes, date) VALUES (?,?,?,?,?,?)',
            [pt2.patient_id, d1.doctor_id, 'Stable angina', 'Aspirin 75mg once daily, Atorvastatin 10mg', 'Avoid strenuous activity.', '2026-03-01 09:00:00']);
        await db.query('INSERT INTO medical_records (patient_id, doctor_id, diagnosis, prescription, notes, date) VALUES (?,?,?,?,?,?)',
            [pt3.patient_id, d2.doctor_id, 'Iron deficiency anaemia', 'Ferrous Sulfate 200mg twice daily', 'Include iron-rich foods in diet.', '2026-02-25 10:00:00']);
        console.log('   ✅ 4 medical records inserted.\n');

        console.log('================================');
        console.log('🎉 Seed complete! All sample data inserted.\n');
        console.log('📋 Login credentials:');
        console.log('   Doctor:  doctor1@vitalsync.com  | Password@123');
        console.log('   Doctor:  doctor2@vitalsync.com  | Password@123');
        console.log('   Patient: patient1@vitalsync.com | Password@123');
        console.log('   Patient: patient2@vitalsync.com | Password@123');
        console.log('   Patient: patient3@vitalsync.com | Password@123\n');

    } catch (err) {
        console.error('\n❌ Seed error:', err.message);
        console.error(err);
    } finally {
        process.exit(0);
    }
}

seed();
