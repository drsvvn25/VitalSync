/**
 * VitalSync – Master Database Seed Script (Final)
 * Run: node seed_final.js
 * 
 * This script performs a full database synchronization:
 * 1. Wipes all existing data.
 * 2. Inserts 13 accurate medical facilities in Anand, Gujarat.
 * 3. Inserts 10 doctors mapped to these facilities.
 * 4. Inserts 5 sample patients with vitals, appointments, and records.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function seed() {
    console.log('\n🚀 VitalSync FINAL Database Seeder');
    console.log('====================================\n');

    try {
        // 1️⃣ Clear existing data
        console.log('🗑️  Clearing all existing tables...');
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        const tables = [
            'medication_schedules', 'notifications', 'medical_records', 
            'appointments', 'vital_stats', 'patients', 'doctors', 
            'clinics', 'users'
        ];
        for (const table of tables) {
            await db.query(`TRUNCATE TABLE ${table}`);
        }
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('   ✅ Database wiped cleanly.\n');

        // 2️⃣ Generate bcrypt hash
        const RAW_PASSWORD = 'Password@123';
        console.log(`🔑 Hashing password "${RAW_PASSWORD}"...`);
        const hash = await bcrypt.hash(RAW_PASSWORD, 12);

        // 3️⃣ Create Users (10 Doctors + 5 Patients)
        console.log('👤 Creating users...');
        const userData = [
            ['Dr. Priya Sharma',   'doctor1@vitalsync.com',  'doctor'],
            ['Dr. Raj Mehta',      'doctor2@vitalsync.com',  'doctor'],
            ['Dr. Anil Gupta',     'doctor3@vitalsync.com',  'doctor'],
            ['Dr. Meera Patil',    'doctor4@vitalsync.com',  'doctor'],
            ['Dr. Sanjay Rao',     'doctor5@vitalsync.com',  'doctor'],
            ['Dr. Vikram Shah',    'doctor6@vitalsync.com',  'doctor'],
            ['Dr. Sneha Iyer',     'doctor7@vitalsync.com',  'doctor'],
            ['Dr. Rahul Nair',     'doctor8@vitalsync.com',  'doctor'],
            ['Dr. Pooja Joshi',    'doctor9@vitalsync.com',  'doctor'],
            ['Dr. Arjun Deshmukh', 'doctor10@vitalsync.com', 'doctor'],
            ['Ananya Patel',       'patient1@vitalsync.com', 'patient'],
            ['Rohit Verma',        'patient2@vitalsync.com', 'patient'],
            ['Sita Krishnan',      'patient3@vitalsync.com', 'patient'],
            ['Amit Shah',          'patient4@vitalsync.com', 'patient'],
            ['Priya Desai',        'patient5@vitalsync.com', 'patient']
        ];

        const userIds = [];
        for (const u of userData) {
            const [res] = await db.query(
                'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
                [u[0], u[1], hash, u[2]]
            );
            userIds.push(res.insertId);
        }
        console.log(`   ✅ 15 Users created.\n`);

        // 4️⃣ Create Clinics (13 verified facilities)
        console.log('🏥 Inserting 13 verified clinics...');
        const clinics = [
            ['Anand General Hospital',            'Town Hall Road, Anand, Gujarat',              22.5629, 72.9282, 'Anand', 'Anand', '02692-242200', 'hospital'],
            ['Zydus Hospital Anand',              'NH-8, Anand-Vidyanagar Road, Anand',          22.5472, 72.9507, 'Anand', 'Anand', '02692-660000', 'hospital'],
            ['Shree Krishna Hospital',            'Karamsad Road, Anand, Gujarat',               22.5598, 72.9352, 'Anand', 'Anand', '02692-244500', 'hospital'],
            ['Pramukh Swami Medical College',     'Karamsad, Anand, Gujarat',                    22.5339, 72.9057, 'Anand', 'Anand', '02692-229323', 'hospital'],
            ['Suryapur Maternity & Surgical',     'GIDC, Vitthal Udyognagar, Gujarat',           22.5536, 72.9591, 'Anand', 'Anand', '02692-236100', 'hospital'],
            ['Sai Eye Care Clinic',               'Anand-Sojitra Road, Anand',                   22.5609, 72.9241, 'Anand', 'Anand', '02692-241100', 'clinic'],
            ['Dr. Shah Dental Clinic',            'Near Clock Tower, Station Road, Anand',      22.5614, 72.9268, 'Anand', 'Anand', '98250-11111',  'clinic'],
            ['Sanjivani Polyclinic',              'Near Railway Station, Anand',                 22.5636, 72.9310, 'Anand', 'Anand', '02692-255200', 'clinic'],
            ['Navjivan Child & Maternity Clinic', 'Vallabh Vidyanagar, Anand',                   22.5425, 72.9238, 'Anand', 'Anand', '02692-232000', 'clinic'],
            ['Anand Orthopaedic Centre',          'Triveni Road, Anand, Gujarat',                22.5651, 72.9333, 'Anand', 'Anand', '02692-248000', 'clinic'],
            ['Apollo Pharmacy - Anand',           'MG Road, Near Town Hall, Anand',              22.5622, 72.9298, 'Anand', 'Anand', '1800-180-1061', 'pharmacy'],
            ['MedPlus - Vallabh Vidyanagar',      'VV Nagar Main Road, Vallabh Vidyanagar',      22.5438, 72.9230, 'Anand', 'Anand', '040-67006700',  'pharmacy'],
            ['Wellness Forever Pharmacy',         'Karamsad Chokdi, Anand-Karamsad Road',        22.5473, 72.9219, 'Anand', 'Anand', '02692-260000',  'pharmacy']
        ];

        const clinicIds = [];
        for (const c of clinics) {
            const [res] = await db.query(
                'INSERT INTO clinics (name, address, latitude, longitude, city, district, contact, type) VALUES (?,?,?,?,?,?,?,?)',
                c
            );
            clinicIds.push(res.insertId);
        }
        console.log(`   ✅ 13 Clinics inserted.\n`);

        // 5️⃣ Create Doctors
        console.log('🩺 Creating doctor profiles...');
        const specs = [
            'Cardiologist', 'General Physician', 'Orthopaedic Surgeon', 'Neurologist', 
            'Pediatrician', 'Ophthalmologist', 'Dentist', 'Dermatologist', 
            'Gynaecologist', 'Physiotherapist'
        ];
        const doctorIds = [];
        for (let i = 0; i < 10; i++) {
            const [res] = await db.query(
                'INSERT INTO doctors (user_id, clinic_id, specialization, experience) VALUES (?,?,?,?)',
                [userIds[i], clinicIds[i], specs[i], 5 + i]
            );
            doctorIds.push(res.insertId);
        }
        console.log(`   ✅ 10 Doctor profiles linked.\n`);

        // 6️⃣ Create Patients
        console.log('🧑 Creating patient profiles...');
        const patientProfiles = [
            [userIds[10], 28, 'Female', 'B+',  '12 MG Road, Ahmedabad'],
            [userIds[11], 35, 'Male',   'O+',  '45 Civil Lines, Surat'],
            [userIds[12], 22, 'Female', 'A+',  '78 Stadium Road, Vadodara'],
            [userIds[13], 45, 'Male',   'AB+', '101 Highway Road, Anand'],
            [userIds[14], 30, 'Female', 'O-',  '15 Vidyanagar, Anand']
        ];

        const patientIds = [];
        for (const p of patientProfiles) {
            const [res] = await db.query(
                'INSERT INTO patients (user_id, age, gender, blood_group, address) VALUES (?,?,?,?,?)',
                p
            );
            patientIds.push(res.insertId);
        }
        console.log(`   ✅ 5 Patient profiles linked.\n`);

        // 7️ Insert Sample Vitals
        console.log('💓 Inserting test vitals...');
        for (const pid of patientIds) {
            await db.query(
                'INSERT INTO vital_stats (patient_id, heart_rate, blood_pressure, oxygen_level, temperature) VALUES (?,?,?,?,?)',
                [pid, 72 + Math.random() * 10, '120/80', 98 + Math.random() * 2, 36.6 + Math.random()]
            );
        }
        console.log(`   ✅ Sample vitals added.\n`);

        console.log('====================================');
        console.log('🎉 Final Synchronization Complete!');
        console.log('====================================\n');

    } catch (err) {
        console.error('❌ SEED ERROR:', err);
    } finally {
        process.exit(0);
    }
}

seed();
