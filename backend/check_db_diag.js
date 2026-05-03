const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkDB() {
    console.log('Connecting to DB with:', {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('--- TABLES ---');
        const [tables] = await connection.query('SHOW TABLES');
        console.log(JSON.stringify(tables, null, 2));

        console.log('\n--- MEDICAL RECORDS ---');
        const [records] = await connection.query('SELECT * FROM medical_records');
        console.log(JSON.stringify(records, null, 2));

        console.log('\n--- USERS ---');
        const [users] = await connection.query('SELECT id, name, email, role FROM users');
        console.log(JSON.stringify(users, null, 2));

        console.log('\n--- PATIENTS ---');
        const [patients] = await connection.query('SELECT * FROM patients');
        console.log(JSON.stringify(patients, null, 2));

        console.log('\n--- DOCTORS ---');
        const [doctors] = await connection.query('SELECT * FROM doctors');
        console.log(JSON.stringify(doctors, null, 2));

        await connection.end();
    } catch (err) {
        console.error('DB ERROR:', err.message);
    }
}

checkDB();
