const db = require('../config/db');

// Scoring rules for AI Risk Prediction
const scoreVitals = (v) => {
    let score = 0;
    const breakdown = [];

    if (v.heart_rate != null && v.heart_rate > 110) {
        score += 2;
        breakdown.push({ factor: 'Heart Rate', value: `${v.heart_rate} bpm`, points: 2, reason: 'HR > 110 bpm' });
    }
    if (v.oxygen_level != null && v.oxygen_level < 92) {
        score += 3;
        breakdown.push({ factor: 'Oxygen Level', value: `${v.oxygen_level}%`, points: 3, reason: 'O₂ < 92%' });
    }
    if (v.sugar_level != null && v.sugar_level > 200) {
        score += 2;
        breakdown.push({ factor: 'Sugar Level', value: `${v.sugar_level} mg/dL`, points: 2, reason: 'Sugar > 200 mg/dL' });
    }
    if (v.temperature != null && v.temperature > 38) {
        score += 2;
        breakdown.push({ factor: 'Temperature', value: `${v.temperature}°C`, points: 2, reason: 'Temp > 38°C' });
    }

    let level = 'Low';
    let color = '#22c55e';
    if (score >= 6) { level = 'High'; color = '#ef4444'; }
    else if (score >= 3) { level = 'Medium'; color = '#f59e0b'; }

    return { score, level, color, breakdown };
};

// GET /api/risk/my  → patient's own risk score
const getMyRisk = async (req, res) => {
    try {
        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0)
            return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const patient_id = patientRows[0].patient_id;

        // Get last 7 vitals for trend
        const [rows] = await db.query(
            'SELECT * FROM vital_stats WHERE patient_id = ? ORDER BY record_date DESC LIMIT 7',
            [patient_id]
        );

        if (rows.length === 0)
            return res.json({ success: true, score: 0, level: 'Low', color: '#22c55e', breakdown: [], trend: [] });

        const latest = rows[0];
        const { score, level, color, breakdown } = scoreVitals(latest);

        // Build trend array (oldest first for chart)
        const trend = rows.reverse().map(v => ({
            date: v.record_date,
            score: scoreVitals(v).score,
            level: scoreVitals(v).level,
        }));

        res.json({ success: true, score, level, color, breakdown, trend, latest });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/risk/:patientId  → doctor views patient risk
const getPatientRisk = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM vital_stats WHERE patient_id = ? ORDER BY record_date DESC LIMIT 7',
            [req.params.patientId]
        );

        if (rows.length === 0)
            return res.json({ success: true, score: 0, level: 'Low', color: '#22c55e', breakdown: [], trend: [] });

        const latest = rows[0];
        const { score, level, color, breakdown } = scoreVitals(latest);

        const trend = rows.reverse().map(v => ({
            date: v.record_date,
            score: scoreVitals(v).score,
            level: scoreVitals(v).level,
        }));

        res.json({ success: true, score, level, color, breakdown, trend, latest });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getMyRisk, getPatientRisk };
