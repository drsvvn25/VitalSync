const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkIntegrity() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('--- Checking Individual Records ---');
        const [records] = await connection.query('SELECT * FROM medical_records');
        for (const r of records) {
            console.log(`\nRecord ID: ${r.id}`);
            console.log(`Patient ID: ${r.patient_id}`);
            console.log(`Doctor ID: ${r.doctor_id}`);

            const [p] = await connection.query('SELECT * FROM patients WHERE patient_id = ?', [r.patient_id]);
            console.log(`Patient exists: ${p.length > 0}`);
            if (p.length > 0) {
                const [pu] = await connection.query('SELECT name FROM users WHERE id = ?', [p[0].user_id]);
                console.log(`Patient user exists: ${pu.length > 0} (${pu[0]?.name})`);
            }

            const [d] = await connection.query('SELECT * FROM doctors WHERE doctor_id = ?', [r.doctor_id]);
            console.log(`Doctor exists: ${d.length > 0}`);
            if (d.length > 0) {
                const [du] = await connection.query('SELECT name FROM users WHERE id = ?', [d[0].user_id]);
                console.log(`Doctor user exists: ${du.length > 0} (${du[0]?.name})`);
            }
        }

        await connection.end();
    } catch (err) {
        console.error('INTEGRITY ERROR:', err.message);
    }
}

checkIntegrity();
