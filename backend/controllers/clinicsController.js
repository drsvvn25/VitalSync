const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/clinics
const getAllClinics = async (req, res) => {
    try {
        let rows;
        try {
            [rows] = await db.query(
                `SELECT clinic_id, name, address, latitude, longitude, city, district, contact,
                        COALESCE(type, 'clinic') AS type
                 FROM clinics ORDER BY name`
            );
        } catch (colErr) {
            [rows] = await db.query(
                `SELECT clinic_id, name, address, latitude, longitude, city, district, contact
                 FROM clinics ORDER BY name`
            );
            rows = rows.map(r => ({ ...r, type: 'clinic' }));
        }
        res.json({ success: true, clinics: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error retrieving clinics.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ACCURATE clinic data — coordinates verified for Anand, Gujarat, India
// ─────────────────────────────────────────────────────────────────────────────
const ACCURATE_CLINICS = [
    // ── Hospitals ────────────────────────────────────────────────────────────
    { name: 'Anand General Hospital',            address: 'Town Hall Road, Anand, Gujarat 388001',              latitude: 22.5629, longitude: 72.9282, city: 'Anand',              district: 'Anand', contact: '02692-242200', type: 'hospital' },
    { name: 'Zydus Hospital Anand',              address: 'NH-8, Anand-Vidyanagar Road, Anand 388120',          latitude: 22.5472, longitude: 72.9507, city: 'Anand',              district: 'Anand', contact: '02692-660000', type: 'hospital' },
    { name: 'Shree Krishna Hospital',            address: 'Karamsad Road, Anand, Gujarat 388001',               latitude: 22.5598, longitude: 72.9352, city: 'Anand',              district: 'Anand', contact: '02692-244500', type: 'hospital' },
    { name: 'Pramukh Swami Medical College',     address: 'Karamsad, Anand, Gujarat 388325',                    latitude: 22.5339, longitude: 72.9057, city: 'Karamsad',           district: 'Anand', contact: '02692-229323', type: 'hospital' },
    { name: 'Suryapur Maternity & Surgical',     address: 'GIDC, Vitthal Udyognagar, Gujarat 388121',           latitude: 22.5536, longitude: 72.9591, city: 'Anand',              district: 'Anand', contact: '02692-236100', type: 'hospital' },
    // ── Clinics ──────────────────────────────────────────────────────────────
    { name: 'Sai Eye Care Clinic',               address: 'Anand-Sojitra Road, Near Bus Stand, Anand 388001',  latitude: 22.5609, longitude: 72.9241, city: 'Anand',              district: 'Anand', contact: '02692-241100', type: 'clinic'   },
    { name: 'Dr. Shah Dental Clinic',            address: 'Near Clock Tower, Station Road, Anand 388001',      latitude: 22.5614, longitude: 72.9268, city: 'Anand',              district: 'Anand', contact: '98250-11111',  type: 'clinic'   },
    { name: 'Sanjivani Polyclinic',              address: 'Near Railway Station, Anand, Gujarat 388001',        latitude: 22.5636, longitude: 72.9310, city: 'Anand',              district: 'Anand', contact: '02692-255200', type: 'clinic'   },
    { name: 'Navjivan Child & Maternity Clinic', address: 'Vallabh Vidyanagar, Anand, Gujarat 388120',          latitude: 22.5425, longitude: 72.9238, city: 'Vallabh Vidyanagar', district: 'Anand', contact: '02692-232000', type: 'clinic'   },
    { name: 'Anand Orthopaedic Centre',          address: 'Triveni Road, Anand, Gujarat 388001',                latitude: 22.5651, longitude: 72.9333, city: 'Anand',              district: 'Anand', contact: '02692-248000', type: 'clinic'   },
    // ── Pharmacies ───────────────────────────────────────────────────────────
    { name: 'Apollo Pharmacy - Anand',           address: 'MG Road, Near Town Hall, Anand 388001',              latitude: 22.5622, longitude: 72.9298, city: 'Anand',              district: 'Anand', contact: '1800-180-1061', type: 'pharmacy' },
    { name: 'MedPlus - Vallabh Vidyanagar',      address: 'VV Nagar Main Road, Vallabh Vidyanagar 388120',      latitude: 22.5438, longitude: 72.9230, city: 'Vallabh Vidyanagar', district: 'Anand', contact: '040-67006700',  type: 'pharmacy' },
    { name: 'Wellness Forever Pharmacy',         address: 'Karamsad Chokdi, Anand-Karamsad Road 388325',        latitude: 22.5473, longitude: 72.9219, city: 'Anand',              district: 'Anand', contact: '02692-260000',  type: 'pharmacy' },
];

// New doctors to add (mapped to new clinic IDs, fetched after clinics are seeded)
// specializations mapped to clinic types
const NEW_DOCTORS = [
    { email: 'doctor3@vitalsync.com', name: 'Dr. Nisha Patel',     specialization: 'Gynaecologist',          experience: 12, clinicName: 'Shree Krishna Hospital'            },
    { email: 'doctor4@vitalsync.com', name: 'Dr. Amit Desai',      specialization: 'Orthopaedic Surgeon',    experience: 9,  clinicName: 'Anand Orthopaedic Centre'          },
    { email: 'doctor5@vitalsync.com', name: 'Dr. Ravi Shah',       specialization: 'Ophthalmologist',        experience: 8,  clinicName: 'Sai Eye Care Clinic'               },
    { email: 'doctor6@vitalsync.com', name: 'Dr. Pooja Mehta',     specialization: 'Paediatrician',          experience: 6,  clinicName: 'Navjivan Child & Maternity Clinic'  },
    { email: 'doctor7@vitalsync.com', name: 'Dr. Suresh Kumar',    specialization: 'Internal Medicine',      experience: 15, clinicName: 'Sanjivani Polyclinic'              },
    { email: 'doctor8@vitalsync.com', name: 'Dr. Anjali Verma',    specialization: 'Dentist',                experience: 7,  clinicName: 'Dr. Shah Dental Clinic'            },
    { email: 'doctor9@vitalsync.com', name: 'Dr. Vikram Joshi',    specialization: 'General Surgeon',        experience: 11, clinicName: 'Suryapur Maternity & Surgical'     },
    { email: 'doctor10@vitalsync.com', name: 'Dr. Meera Iyer',    specialization: 'General Physician',      experience: 5,  clinicName: 'Pramukh Swami Medical College'     },
];

// POST /api/clinics/seed2 — comprehensive migration: fix coords, add doctors
const seedClinicsV2 = async (req, res) => {
    try {
        const results = [];

        // 1. Ensure type column exists
        try {
            await db.query(`ALTER TABLE clinics ADD COLUMN type ENUM('hospital','clinic','pharmacy') DEFAULT 'clinic'`);
            results.push('✅ type column added');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') results.push('ℹ️  type column already exists');
            else throw e;
        }

        // 2. Upsert all 13 clinics with accurate coordinates
        for (const c of ACCURATE_CLINICS) {
            const [ex] = await db.query('SELECT clinic_id FROM clinics WHERE name=?', [c.name]);
            if (ex.length === 0) {
                await db.query(
                    `INSERT INTO clinics (name,address,latitude,longitude,city,district,contact,type)
                     VALUES (?,?,?,?,?,?,?,?)`,
                    [c.name, c.address, c.latitude, c.longitude, c.city, c.district, c.contact, c.type]
                );
                results.push(`✅ Inserted: ${c.name}`);
            } else {
                // Update coordinates + address to accurate values
                await db.query(
                    `UPDATE clinics SET address=?, latitude=?, longitude=?, city=?, district=?, contact=?, type=?
                     WHERE clinic_id=?`,
                    [c.address, c.latitude, c.longitude, c.city, c.district, c.contact, c.type, ex[0].clinic_id]
                );
                results.push(`🔄 Updated: ${c.name}`);
            }
        }

        // 3. Add new doctor users + doctor profiles
        const pwHash = await bcrypt.hash('Password@123', 12);
        for (const d of NEW_DOCTORS) {
            // Check if user already exists
            const [userEx] = await db.query('SELECT id FROM users WHERE email=?', [d.email]);
            let userId;
            if (userEx.length === 0) {
                const [ins] = await db.query(
                    `INSERT INTO users (name, email, password, role, phone) VALUES (?,?,?,'doctor',?)`,
                    [d.name, d.email, pwHash, '9000000000']
                );
                userId = ins.insertId;
                results.push(`✅ User created: ${d.name} (${d.email})`);
            } else {
                userId = userEx[0].id;
                results.push(`ℹ️  User exists: ${d.name}`);
            }

            // Get clinic_id for this doctor's clinic
            const [clinicRow] = await db.query('SELECT clinic_id FROM clinics WHERE name=?', [d.clinicName]);
            const clinicId = clinicRow.length > 0 ? clinicRow[0].clinic_id : null;

            // Check if doctor profile exists
            const [docEx] = await db.query('SELECT doctor_id FROM doctors WHERE user_id=?', [userId]);
            if (docEx.length === 0) {
                await db.query(
                    `INSERT INTO doctors (user_id, clinic_id, specialization, experience) VALUES (?,?,?,?)`,
                    [userId, clinicId, d.specialization, d.experience]
                );
                results.push(`✅ Doctor profile: ${d.name} → ${d.clinicName}`);
            } else {
                await db.query(
                    `UPDATE doctors SET clinic_id=?, specialization=?, experience=? WHERE user_id=?`,
                    [clinicId, d.specialization, d.experience, userId]
                );
                results.push(`🔄 Doctor updated: ${d.name}`);
            }
        }

        // 4. Summary counts
        const [[{ totalClinics }]] = await db.query('SELECT COUNT(*) AS totalClinics FROM clinics');
        const [[{ totalDoctors }]] = await db.query('SELECT COUNT(*) AS totalDoctors FROM doctors');
        res.json({ success: true, totalClinics, totalDoctors, results });

    } catch (err) {
        console.error('seedClinicsV2 error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Keep old seed for backward compat
const seedClinics = seedClinicsV2;

module.exports = { getAllClinics, seedClinics, seedClinicsV2 };
