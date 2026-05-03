const { sendPrescriptionEmail } = require('./services/emailService');
require('dotenv').config();

const testEmail = async () => {
  console.log('Starting VitalSync Email Test...');
  console.log('Using EMAIL_USER:', process.env.EMAIL_USER);

  try {
    await sendPrescriptionEmail({
      patientName: 'Test Patient',
      patientEmail: process.env.EMAIL_USER, // Send to yourself
      doctorName: 'VitalSync Test',
      diagnosis: 'System Verification',
      prescription: 'Nodemailer configuration is working!',
      notes: 'This is a test email from the VitalSync system.',
      date: new Date(),
      medications: [
        { name: 'Test Medicine', frequency: '8', duration: '1' }
      ]
    });
    console.log('\n✅ Test email sent successfully to your own address.');
    console.log('Please check your inbox (and spam folder).');
  } catch (error) {
    console.error('❌ Test email failed:', error);
  }
};

testEmail();
