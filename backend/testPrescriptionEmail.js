const { sendPrescriptionEmail } = require('./services/emailService');

async function test() {
    console.log('Testing prescription email with PDF attachment...');
    try {
        const res = await sendPrescriptionEmail({
            patientName: 'Test Patient',
            patientEmail: process.env.EMAIL_USER || 'your-email@gmail.com', // fallback
            doctorName: 'Test Doctor',
            diagnosis: 'Test Diagnosis',
            prescription: 'Test Prescription details here',
            notes: 'Test Notes',
            date: new Date(),
            medications: [{name: 'Meds', frequency: 12, duration: 5}]
        });
        console.log('Result:', res);
        console.log('Test completed without throwing exceptions.');
    } catch (err) {
        console.error('Test threw an error:', err);
    }
}

test();
