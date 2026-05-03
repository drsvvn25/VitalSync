require('dotenv').config();
const db = require('./config/db');

const NEW_CLINICS = [
  { name: 'Shree Krishna Hospital',            address: 'Station Road, Anand',                latitude: 22.5603, longitude: 72.9416, city: 'Anand',              district: 'Anand', contact: '02692-244500', type: 'hospital' },
  { name: 'Pramukh Swami Medical College',     address: 'Karamsad, Anand',                    latitude: 22.5435, longitude: 72.9217, city: 'Karamsad',           district: 'Anand', contact: '02692-229323', type: 'hospital' },
  { name: 'Suryapur Maternity & Surgical',     address: 'Vitthal Udyognagar, Anand',          latitude: 22.5510, longitude: 72.9610, city: 'Anand',              district: 'Anand', contact: '02692-236100', type: 'hospital' },
  { name: 'Sai Eye Care Clinic',               address: 'Anand – Sojitra Road',               latitude: 22.5572, longitude: 72.9360, city: 'Anand',              district: 'Anand', contact: '02692-241100', type: 'clinic'   },
  { name: 'Dr. Shah Dental Clinic',            address: 'Near Clock Tower, Anand',            latitude: 22.5628, longitude: 72.9305, city: 'Anand',              district: 'Anand', contact: '98250-11111',  type: 'clinic'   },
  { name: 'Sanjivani Polyclinic',              address: 'Maninagar Road, Anand',              latitude: 22.5648, longitude: 72.9453, city: 'Anand',              district: 'Anand', contact: '02692-255200', type: 'clinic'   },
  { name: 'Navjivan Child & Maternity Clinic', address: 'Vallabh Vidyanagar',                 latitude: 22.5389, longitude: 72.9185, city: 'Vallabh Vidyanagar', district: 'Anand', contact: '02692-232000', type: 'clinic'   },
  { name: 'Anand Orthopaedic Centre',          address: 'Triveni Road, Anand',                latitude: 22.5660, longitude: 72.9500, city: 'Anand',              district: 'Anand', contact: '02692-248000', type: 'clinic'   },
  { name: 'Apollo Pharmacy – Anand',           address: 'MG Road, Anand',                     latitude: 22.5618, longitude: 72.9338, city: 'Anand',              district: 'Anand', contact: '1800-180-1061',type: 'pharmacy' },
  { name: 'MedPlus – Vallabh Vidyanagar',      address: 'VV Road, Vallabh Vidyanagar',        latitude: 22.5415, longitude: 72.9210, city: 'Vallabh Vidyanagar', district: 'Anand', contact: '040-67006700', type: 'pharmacy' },
  { name: 'Wellness Forever Pharmacy',         address: 'Karamsad Chokdi, Anand',             latitude: 22.5475, longitude: 72.9290, city: 'Anand',              district: 'Anand', contact: '02692-260000', type: 'pharmacy' },
];

async function run() {
  try {
    console.log('\n🔄 Running clinics migration...\n');

    // 1. Add `type` column (ignore if already exists)
    try {
      await db.query(`ALTER TABLE clinics ADD COLUMN type ENUM('hospital','clinic','pharmacy') DEFAULT 'clinic'`);
      console.log('✅ type column added to clinics');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  type column already exists – skipping');
      } else { throw e; }
    }

    // 2. Update existing 2 rows
    await db.query(`UPDATE clinics SET type='hospital' WHERE name LIKE '%Anand General%'`);
    await db.query(`UPDATE clinics SET type='hospital' WHERE name LIKE '%Zydus%'`);
    console.log('✅ Existing clinics updated with type=hospital');

    // 3. Insert new facilities (skip duplicates by name)
    for (const c of NEW_CLINICS) {
      const [existing] = await db.query(`SELECT clinic_id FROM clinics WHERE name=?`, [c.name]);
      if (existing.length === 0) {
        await db.query(
          `INSERT INTO clinics (name, address, latitude, longitude, city, district, contact, type) VALUES (?,?,?,?,?,?,?,?)`,
          [c.name, c.address, c.latitude, c.longitude, c.city, c.district, c.contact, c.type]
        );
        console.log(`  ➕ Inserted: ${c.name}`);
      } else {
        console.log(`  ⏭  Exists:   ${c.name}`);
      }
    }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM clinics`);
    console.log(`\n🎉 Done! Total clinics in DB: ${total}\n`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

run();
