const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkDB() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        const [rows] = await connection.query('SELECT COUNT(*) as count FROM medical_records');
        console.log('Total medical records:', rows[0].count);

        if (rows[0].count > 0) {
            const [records] = await connection.query(`
                SELECT mr.id, mr.patient_id, mr.doctor_id, mr.diagnosis, up.name as patient_name, ud.name as doctor_name 
                FROM medical_records mr
                JOIN patients p ON mr.patient_id = p.patient_id
                JOIN users up ON p.user_id = up.id
                JOIN doctors d ON mr.doctor_id = d.doctor_id
                JOIN users ud ON d.user_id = ud.id
            `);
            console.log('--- ALL RECORDS ---');
            records.forEach(r => {
                console.log(`ID: ${r.id} | Patient: ${r.patient_name} (ID: ${r.patient_id}) | Doctor: ${r.doctor_name} (ID: ${r.doctor_id}) | Diagnosis: ${r.diagnosis}`);
            });
        } else {
            console.log('The medical_records table is EMPTY.');
        }

        const [pats] = await connection.query('SELECT p.patient_id, u.name FROM patients p JOIN users u ON p.user_id = u.id');
        console.log('Available patients:', pats);

        const [docs] = await connection.query('SELECT d.doctor_id, u.name FROM doctors d JOIN users u ON d.user_id = u.id');
        console.log('Available doctors:', docs);

        await connection.end();
    } catch (err) {
        console.error('DB ERROR:', err.message);
    }
}

checkDB();
