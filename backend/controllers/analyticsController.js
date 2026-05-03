const db = require('../config/db');

// Calculate AI Risk Score for a single patient based on vitals history
const calculateRiskPrediction = async (patient_id) => {
    // Basic AI Heuristic: Looking at the last 10 vitals to determine trend instability
    const [vitals] = await db.query(
        'SELECT heart_rate, blood_pressure, oxygen_level, temperature, sugar_level, record_date FROM vital_stats WHERE patient_id = ? ORDER BY record_date ASC LIMIT 10',
        [patient_id]
    );

    if (vitals.length === 0) return { score: 0, level: 'Low Risk', trend: [] };

    let instabilityPoints = 0;
    const trend = [];

    vitals.forEach((v) => {
        let dailyScore = 0;
        // HR thresholds
        if (v.heart_rate > 100 || v.heart_rate < 60) dailyScore += 20;
        // O2 thresholds
        if (v.oxygen_level < 95) dailyScore += 30;
        if (v.oxygen_level < 90) dailyScore += 50; // Critical
        // Temp
        if (v.temperature > 37.5) dailyScore += 15;
        // Sugar
        if (v.sugar_level > 140) dailyScore += 10;

        instabilityPoints += dailyScore;
        trend.push({ date: v.record_date, risk: Math.min(dailyScore, 100) });
    });

    // Average risk over the window, heavily weighted by recent entries
    const recent = trend.slice(-3);
    const recentAvg = recent.reduce((sum, t) => sum + t.risk, 0) / (recent.length || 1);
    
    // Smooth out final score 0-100%
    const finalScore = Math.min(Math.round(recentAvg * 1.5), 100);
    
    let level = 'Low Risk';
    if (finalScore > 40) level = 'Moderate Risk';
    if (finalScore > 75) level = 'High Risk';

    return { score: finalScore, level, trend };
};

// Patient Endpoint: View their own AI Risk trend
const getMyRisk = async (req, res) => {
    try {
        const [pRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (pRows.length === 0) return res.status(404).json({ success: false, message: 'Patient not found.' });
        
        const riskData = await calculateRiskPrediction(pRows[0].patient_id);
        res.json({ success: true, ...riskData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Doctor Endpoint: Get flags for assigned patients
const getDoctorPatientRisks = async (req, res) => {
    try {
        // Find all unique patients assigned to this doctor via appointments or records
        const [docRows] = await db.query('SELECT doctor_id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (docRows.length === 0) return res.status(403).json({ success: false });

        const [pRows] = await db.query(
            `SELECT DISTINCT p.patient_id, u.name 
             FROM appointments a
             JOIN patients p ON a.patient_id = p.patient_id
             JOIN users u ON p.user_id = u.id
             WHERE a.doctor_id = ?`,
            [docRows[0].doctor_id]
        );

        const riskArray = [];
        for (const p of pRows) {
            const riskData = await calculateRiskPrediction(p.patient_id);
            if (riskData.score > 40) { // Only return flagged patients
                riskArray.push({
                    patient_id: p.patient_id,
                    name: p.name,
                    score: riskData.score,
                    level: riskData.level
                });
            }
        }
        res.json({ success: true, risks: riskArray });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { getMyRisk, getDoctorPatientRisks, calculateRiskPrediction };
