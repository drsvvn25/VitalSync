const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkID() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const [user] = await connection.query("SELECT id, name FROM users WHERE email = 'patient1@vitalsync.com'");
        console.log('User patient1:', user);
        
        if (user.length > 0) {
            const [patient] = await connection.query("SELECT patient_id FROM patients WHERE user_id = ?", [user[0].id]);
            console.log('Patient record for user:', patient);
            
            if (patient.length > 0) {
                const pId = patient[0].patient_id;
                const [records] = await connection.query("SELECT id FROM medical_records WHERE patient_id = ?", [pId]);
                console.log(`Records for patient_id ${pId}:`, records.length);
            }
        }

        const [allRecords] = await connection.query("SELECT patient_id, COUNT(*) as count FROM medical_records GROUP BY patient_id");
        console.log('All records by patient_id:', allRecords);

        const [allPatients] = await connection.query("SELECT p.patient_id, u.name FROM patients p JOIN users u ON p.user_id = u.id");
        console.log('All patients in DB:', allPatients);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkID();
