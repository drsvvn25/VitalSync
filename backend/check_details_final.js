const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkDetails() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const [records] = await connection.query(`
            SELECT mr.*, up.name as patient_name, ud.name as doctor_name 
            FROM medical_records mr
            JOIN patients p ON mr.patient_id = p.patient_id
            JOIN users up ON p.user_id = up.id
            JOIN doctors d ON mr.doctor_id = d.doctor_id
            JOIN users ud ON d.user_id = ud.id
        `);
        console.log('--- ALL RECORDS IN DB ---');
        records.forEach(r => {
            console.log(`ID: ${r.id} | Patient: ${r.patient_name} (PID: ${r.patient_id}) | Doctor: ${r.doctor_name} (DID: ${r.doctor_id}) | Diagnosis: ${r.diagnosis}`);
        });

        const [pats] = await connection.query("SELECT p.patient_id, u.name, u.email FROM patients p JOIN users u ON p.user_id = u.id");
        console.log('\n--- ALL PATIENTS ---');
        pats.forEach(p => console.log(`PID: ${p.patient_id} | Name: ${p.name} | Email: ${p.email}`));

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkDetails();
