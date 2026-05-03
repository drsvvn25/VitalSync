const db = require('../config/db');

// Get wallet balance and transactions for a patient
const getWallet = async (req, res) => {
    try {
        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0) return res.status(404).json({ success: false, message: 'Patient record not found.' });
        const patient_id = patientRows[0].patient_id;

        // Get or Create Wallet
        let [walletRows] = await db.query('SELECT * FROM patient_wallets WHERE patient_id = ?', [patient_id]);
        if (walletRows.length === 0) {
            await db.query('INSERT INTO patient_wallets (patient_id, balance) VALUES (?, 0)', [patient_id]);
            [walletRows] = await db.query('SELECT * FROM patient_wallets WHERE patient_id = ?', [patient_id]);
        }
        const wallet = walletRows[0];

        // Get Transactions
        const [txRows] = await db.query(
            'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY transaction_date DESC LIMIT 50',
            [wallet.wallet_id]
        );

        // Get Bills
        const [billRows] = await db.query(
            'SELECT * FROM medical_bills WHERE patient_id = ? ORDER BY bill_date DESC LIMIT 50',
            [patient_id]
        );

        res.json({ success: true, wallet, transactions: txRows, bills: billRows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Add Funds
const addFunds = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount.' });

        const [patientRows] = await db.query('SELECT patient_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0) return res.status(404).json({ success: false, message: 'Patient record not found.' });
        const patient_id = patientRows[0].patient_id;

        const [walletRows] = await db.query('SELECT wallet_id FROM patient_wallets WHERE patient_id = ?', [patient_id]);
        if(walletRows.length === 0) return res.status(404).json({ success: false, message: 'Wallet not found.'});
        const wallet_id = walletRows[0].wallet_id;

        await db.query('UPDATE patient_wallets SET balance = balance + ? WHERE wallet_id = ?', [amount, wallet_id]);
        await db.query(
            'INSERT INTO transactions (wallet_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
            [wallet_id, amount, 'credit', 'Funds added via Dashboard']
        );

        res.json({ success: true, message: 'Funds added successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Automatically generate a bill during appointment completion
const autoGenerateBill = async (patient_id, record_id, consultation_fee, medicines_cost) => {
    try {
        const total = consultation_fee + medicines_cost;
        
        // Create bill
        const [result] = await db.query(
            'INSERT INTO medical_bills (patient_id, record_id, consultation_fee, medicines_cost, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)',
            [patient_id, record_id, consultation_fee, medicines_cost, total, 'unpaid']
        );
        const bill_id = result.insertId;

        // Try to auto-deduct from wallet if they have enough balance
        let [walletRows] = await db.query('SELECT wallet_id, balance FROM patient_wallets WHERE patient_id = ?', [patient_id]);
        
        // If they don't have a wallet, make one
        if (walletRows.length === 0) {
            await db.query('INSERT IGNORE INTO patient_wallets (patient_id, balance) VALUES (?, 0)', [patient_id]);
            [walletRows] = await db.query('SELECT wallet_id, balance FROM patient_wallets WHERE patient_id = ?', [patient_id]);
        }

        const wallet = walletRows[0];

        if (wallet.balance >= total) {
            await db.query('UPDATE patient_wallets SET balance = balance - ? WHERE wallet_id = ?', [total, wallet.wallet_id]);
            await db.query(
                'INSERT INTO transactions (wallet_id, amount, transaction_type, description) VALUES (?, ?, ?, ?)',
                [wallet.wallet_id, total, 'debit', `Auto-payment for Bill #${bill_id}`]
            );
            await db.query('UPDATE medical_bills SET status = ? WHERE bill_id = ?', ['paid', bill_id]);
            return { billed: true, auto_paid: true, total };
        } else {
            return { billed: true, auto_paid: false, total, reason: 'Insufficient wallet balance.' };
        }

    } catch (err) {
        console.error('Error auto-generating bill:', err);
        return { billed: false, error: err.message };
    }
};

module.exports = { getWallet, addFunds, autoGenerateBill };
