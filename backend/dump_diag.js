const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function dumpDB() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const tables = ['users', 'patients', 'doctors', 'medical_records'];

    for (const table of tables) {
        console.log(`\n=== TABLE: ${table} ===`);
        const [rows] = await connection.query(`SELECT * FROM ${table}`);
        console.table(rows);
    }

    await connection.end();
}

dumpDB().catch(console.error);
