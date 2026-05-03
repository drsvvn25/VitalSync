const db = require('./config/db');

async function test() {
    try {
        const [rows] = await db.query(
            `SELECT d.doctor_id, u.name as doc_name, c.name as clinic_name, d.clinic_id
             FROM doctors d
             JOIN users u ON d.user_id = u.id
             LEFT JOIN clinics c ON d.clinic_id = c.clinic_id`
        );
        console.log('--- DOCTOR DATA ---');
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

test();
