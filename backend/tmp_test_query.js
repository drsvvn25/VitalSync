const db = require('./config/db');

async function test() {
    try {
        const [rows] = await db.query(
            `SELECT u.id, u.name, u.email, d.doctor_id, d.specialization, d.experience,
              c.clinic_id, c.name AS clinic_name, c.address AS clinic_address, c.latitude, c.longitude, c.city, c.district, c.contact
             FROM users u
             JOIN doctors d ON u.id = d.user_id
             LEFT JOIN clinics c ON d.clinic_id = c.clinic_id
             WHERE u.role = 'doctor'
             ORDER BY u.name`
        );
        console.log('--- DOCTOR RESULTS ---');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

test();
