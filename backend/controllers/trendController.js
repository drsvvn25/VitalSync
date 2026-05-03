const db = require('../config/db');

// Analyze trend direction for a metric series (oldest first)
function detectTrend(values) {
    if (values.length < 3) return 'stable';
    const recent = values.slice(-3);
    const increasing = recent.every((v, i) => i === 0 || v > recent[i - 1]);
    const decreasing = recent.every((v, i) => i === 0 || v < recent[i - 1]);
    if (increasing) return 'increasing';
    if (decreasing) return 'decreasing';
    return 'stable';
}

// Check for spikes (value > mean + 1.5 * std)
function hasSpikePattern(values) {
    if (values.length < 3) return false;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / values.length);
    return values.some(v => v > mean + 1.5 * std);
}

const analyzeTrends = (rows) => {
    if (rows.length === 0) return { warnings: [], info: 'No vitals data available for trend analysis.' };

    // Rows are newest first – reverse to oldest first for trend
    const sorted = [...rows].reverse();

    const hrVals = sorted.map(v => v.heart_rate).filter(v => v != null);
    const o2Vals = sorted.map(v => v.oxygen_level).filter(v => v != null);
    const sugarVals = sorted.map(v => v.sugar_level).filter(v => v != null);
    const tempVals = sorted.map(v => v.temperature).filter(v => v != null);

    const warnings = [];

    const hrTrend = detectTrend(hrVals);
    const o2Trend = detectTrend(o2Vals);
    const sugarTrend = detectTrend(sugarVals);
    const tempTrend = detectTrend(tempVals);

    if (hrTrend === 'increasing' && hrVals[hrVals.length - 1] > 90)
        warnings.push({ type: 'heart_rate', icon: '❤️', level: 'warning', message: '⚠️ Warning: Heart rate showing an increasing trend. Monitor closely.' });
    if (hrTrend === 'decreasing' && hrVals[hrVals.length - 1] < 60)
        warnings.push({ type: 'heart_rate', icon: '❤️', level: 'warning', message: '⚠️ Warning: Heart rate showing a decreasing trend. Possible bradycardia risk.' });

    if (o2Trend === 'decreasing')
        warnings.push({ type: 'oxygen', icon: '🫁', level: 'danger', message: '🚨 Warning: Oxygen level decreasing trend detected. Seek medical attention.' });
    if (o2Vals.length > 0 && o2Vals[o2Vals.length - 1] < 95)
        warnings.push({ type: 'oxygen', icon: '🫁', level: 'danger', message: '🚨 Oxygen level is currently below 95%. Immediate check recommended.' });

    if (hasSpikePattern(sugarVals))
        warnings.push({ type: 'sugar', icon: '🩸', level: 'warning', message: '⚠️ Warning: Abnormal sugar level spikes detected in recent readings.' });
    if (sugarTrend === 'increasing' && sugarVals[sugarVals.length - 1] > 180)
        warnings.push({ type: 'sugar', icon: '🩸', level: 'warning', message: '⚠️ Warning: Sugar level has been steadily increasing.' });

    if (tempTrend === 'increasing' && tempVals[tempVals.length - 1] > 37.5)
        warnings.push({ type: 'temperature', icon: '🌡️', level: 'warning', message: '⚠️ Warning: Body temperature showing an upward trend. Watch for fever development.' });

    if (warnings.length === 0)
        warnings.push({ type: 'ok', icon: '✅', level: 'ok', message: '✅ All vitals appear stable over the last 7 readings. Keep it up!' });

    return { warnings };
};

// GET /api/trends/my  → patient's own trends
const getMyTrends = async (req, res) => {
    try {
        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0)
            return res.status(404).json({ success: false, message: 'Patient record not found.' });

        const [rows] = await db.query(
            'SELECT * FROM vital_stats WHERE patient_id = ? ORDER BY record_date DESC LIMIT 7',
            [patientRows[0].patient_id]
        );

        const analysis = analyzeTrends(rows);
        res.json({ success: true, ...analysis, vitals: [...rows].reverse() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET /api/trends/:patientId  → doctor views patient trends
const getPatientTrends = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM vital_stats WHERE patient_id = ? ORDER BY record_date DESC LIMIT 7',
            [req.params.patientId]
        );

        const analysis = analyzeTrends(rows);
        res.json({ success: true, ...analysis, vitals: [...rows].reverse() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getMyTrends, getPatientTrends };
