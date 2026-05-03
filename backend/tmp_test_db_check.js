const db = require('./config/db');

async function test() {
    try {
        const [users] = await db.query("SELECT id, name FROM users WHERE role = 'doctor'");
        console.log('--- DOCTOR USERS ---');
        console.log(JSON.stringify(users, null, 2));

        const [doctors] = await db.query("SELECT * FROM doctors");
        console.log('--- DOCTOR PROFILES ---');
        console.log(JSON.stringify(doctors, null, 2));

        const [clinics] = await db.query("SELECT clinic_id, name FROM clinics");
        console.log('--- CLINICS ---');
        console.log(JSON.stringify(clinics, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

test();
