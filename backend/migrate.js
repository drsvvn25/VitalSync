require('dotenv').config();
const db = require('./config/db');

async function migrate() {
    try {
        console.log('\n🔄 Running VitalSync migration...\n');

        // Add sugar_level column to vital_stats if not exists
        try {
            await db.query('ALTER TABLE vital_stats ADD COLUMN sugar_level DECIMAL(5,1)');
            console.log('✅ sugar_level column added to vital_stats');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  sugar_level column already exists - skipping');
            } else { throw e; }
        }

        // Add AI Triage + Queue columns to appointments
        const apptColumns = [
            { col: 'priority', sql: "ALTER TABLE appointments ADD COLUMN priority ENUM('normal','high') DEFAULT 'normal'" },
            { col: 'queue_token', sql: "ALTER TABLE appointments ADD COLUMN queue_token VARCHAR(20)" },
            { col: 'queue_position', sql: "ALTER TABLE appointments ADD COLUMN queue_position INT DEFAULT 0" },
            { col: 'triage_result', sql: "ALTER TABLE appointments ADD COLUMN triage_result VARCHAR(50) DEFAULT 'Routine'" },
        ];
        for (const { col, sql } of apptColumns) {
            try {
                await db.query(sql);
                console.log(`✅ appointments.${col} column added`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') console.log(`ℹ️  appointments.${col} already exists - skipping`);
                else throw e;
            }
        }


        // Create clinics table
        await db.query(`
            CREATE TABLE IF NOT EXISTS clinics (
                clinic_id   INT AUTO_INCREMENT PRIMARY KEY,
                name        VARCHAR(150) NOT NULL,
                address     TEXT NOT NULL,
                latitude    DECIMAL(10, 8),
                longitude   DECIMAL(11, 8),
                city        VARCHAR(100),
                district    VARCHAR(100),
                contact     VARCHAR(50),
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ clinics table created/verified');

        // Add clinic_id to doctors
        try {
            await db.query('ALTER TABLE doctors ADD COLUMN clinic_id INT');
            await db.query('ALTER TABLE doctors ADD FOREIGN KEY (clinic_id) REFERENCES clinics(clinic_id) ON DELETE SET NULL');
            console.log('✅ clinic_id column added to doctors');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  clinic_id column already exists on doctors - skipping');
            } else { throw e; }
        }

        // Create notifications table
        await db.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                recipient_id  INT NOT NULL,
                patient_id    INT,
                type          ENUM('critical','sos','reminder','info') DEFAULT 'info',
                vital_type    VARCHAR(50),
                value         VARCHAR(100),
                message       TEXT NOT NULL,
                is_read       TINYINT(1) DEFAULT 0,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_recipient (recipient_id),
                INDEX idx_read (is_read)
            )
        `);
        console.log('✅ notifications table created/verified');

        // Create medication_schedules table
        await db.query(`
            CREATE TABLE IF NOT EXISTS medication_schedules (
                id                  INT AUTO_INCREMENT PRIMARY KEY,
                patient_id          INT NOT NULL,
                doctor_id           INT NOT NULL,
                record_id           INT NOT NULL,
                medicine_name       VARCHAR(100) NOT NULL,
                frequency_hours     INT NOT NULL,
                duration_days       INT NOT NULL,
                last_reminder_sent  DATETIME,
                start_date          DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active           TINYINT(1) DEFAULT 1,
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
                FOREIGN KEY (doctor_id)  REFERENCES doctors(doctor_id)   ON DELETE CASCADE,
                FOREIGN KEY (record_id)  REFERENCES medical_records(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ medication_schedules table created/verified');

        console.log('\n🎉 Migration complete! All tables are ready.\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ Migration error:', err.message);
        process.exit(1);
    }
}

migrate();
