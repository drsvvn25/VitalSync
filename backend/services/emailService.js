/**
 * emailService.js
 * Sends real emails using nodemailer.
 * Requires EMAIL_USER and EMAIL_PASS in .env.
 */
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Log email status for debugging
 */
function logStatus(to, subject, result) {
    console.log(`📧 Email Status [${result ? 'SUCCESS' : 'FAILED'}]`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
}

/**
 * Send appointment booking confirmation
 */
async function sendAppointmentConfirmation({ patientName, patientEmail, doctorName, appointmentDate, queueToken, queuePosition, priority, triageResult }) {
    const subject = `VitalSync – Appointment Confirmation | Token: ${queueToken}`;
    const isEmergency = priority === 'high';
    
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Appointment Confirmed</h2>
            <p>Dear ${patientName},</p>
            <p>Your appointment has been successfully booked on VitalSync.</p>
            ${isEmergency ? '<p style="color: red; font-weight: bold;">⚠️ EMERGENCY PRIORITY – Assigned HIGH PRIORITY status.</p>' : ''}
            <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
                <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
                <p><strong>Date & Time:</strong> ${new Date(appointmentDate).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
                <p><strong>Token:</strong> ${queueToken}</p>
                <p><strong>Queue Position:</strong> #${queuePosition}</p>
            </div>
            <p>Please arrive 10 minutes early. Track your status in the dashboard.</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"VitalSync" <${process.env.EMAIL_USER}>`,
            to: patientEmail,
            subject: subject,
            html: htmlBody,
        });
        logStatus(patientEmail, subject, true);
    } catch (err) {
        console.error('Email error:', err);
        logStatus(patientEmail, subject, false);
    }

    return { subject, patientEmail, queueToken };
}

/**
 * Send prescription email
 */
async function sendPrescriptionEmail({ patientName, patientEmail, doctorName, diagnosis, prescription, notes, date, medications }) {
    const subject = `VitalSync – Prescription from Dr. ${doctorName}`;
    
    const medsHtml = medications && Array.isArray(medications) 
        ? `<ul>${medications.map(m => `<li><strong>${m.name}</strong>: ${m.frequency}h for ${m.duration} days</li>`).join('')}</ul>`
        : `<p>${prescription || 'No specific medications listed.'}</p>`;

    const htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #2c3e50;">New Prescription from Dr. ${doctorName}</h2>
            <p>Dear ${patientName},</p>
            <p>A new prescription has been added to your medical record on VitalSync.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid #3498db;">
                <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
                <p><strong>Diagnosis:</strong> ${diagnosis}</p>
                <h3>Medications:</h3>
                ${medsHtml}
                ${notes ? `<h3>Notes:</h3><p>${notes}</p>` : ''}
            </div>
            <p>Please log in to your dashboard to view/download the full PDF.</p>
        </div>
    `;

    // Generate PDF in memory matching frontend jsPDF layout
    const pdfBuffer = await new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 0, size: 'A4' }); // Use 0 margin to draw full-width headers
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const pageW = 595.28; // A4 width in points
        const pageH = 841.89; // A4 height in points
        const margin = 50;
        const contentW = pageW - margin * 2;
        let y = 0;

        // --- Helper for rounded rectangles ---
        const drawSection = (yPos, height, bgColor, title, titleColor, content, contentColor, icon = '') => {
            doc.roundedRect(margin, yPos, contentW, height, 5).fill(bgColor);
            doc.font('Helvetica-Bold').fontSize(10).fillColor(titleColor).text(`${icon ? icon + ' ' : ''}${title}`, margin + 15, yPos + 20);
            doc.font('Helvetica').fontSize(10).fillColor(contentColor).text(content, margin + 15, yPos + 40, { width: contentW - 30 });
            return yPos + height + 15; // Return next Y position
        };

        // Header Background
        doc.rect(0, 0, pageW, 120).fill('#0d6efd');

        // Logo / Title
        doc.font('Helvetica-Bold').fontSize(26).fillColor('#ffffff').text('VitalSync', margin, 40);
        doc.font('Helvetica').fontSize(12).text('Health Management System', margin, 70);
        doc.font('Helvetica-Bold').fontSize(14).text('PRESCRIPTION REPORT', margin, 95);

        // Date on right
        doc.font('Helvetica').fontSize(10).text(`Date: ${new Date(date).toLocaleDateString('en-IN', { dateStyle: 'long' })}`, pageW - margin - 200, 95, { align: 'right', width: 200 });

        y = 150;

        // Doctor + Patient Info row
        doc.roundedRect(margin, y, contentW, 70, 5).fill('#f0f8ff'); // Light blue bg
        
        // Physician Column
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0d6efd').text('Physician', margin + 15, y + 20);
        doc.font('Helvetica').fontSize(10).fillColor('#1e1e1e').text(`Dr. ${doctorName}`, margin + 15, y + 40);
        
        // Patient Column (approx center)
        const centerOffset = margin + (contentW / 2) + 15;
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#0d6efd').text('Patient', centerOffset, y + 20);
        doc.font('Helvetica').fontSize(10).fillColor('#1e1e1e').text(`${patientName}`, centerOffset, y + 40);

        y += 100;

        // Divider
        doc.moveTo(margin, y).lineTo(pageW - margin, y).lineWidth(1).strokeColor('#0d6efd').stroke();
        y += 20;

        // Diagnosis Section
        y = drawSection(y, 60, '#f0fdf4', 'DIAGNOSIS', '#15803d', diagnosis || 'Not specified', '#1e1e1e');

        // Prescription Section
        let presText = '';
        if (medications && Array.isArray(medications) && medications.length > 0) {
            presText = medications.map(m => `• ${m.name}: ${m.frequency}h for ${m.duration} days`).join('\n');
        } else {
            presText = prescription || 'No specific medications listed.';
        }
        
        // Calculate dynamic height for prescription based on lines
        doc.font('Helvetica').fontSize(10);
        const presHeight = Math.max(70, doc.heightOfString(presText, { width: contentW - 30 }) + 50);
        y = drawSection(y, presHeight, '#fffbeb', 'PRESCRIPTION', '#92400e', presText, '#1e1e1e', '💊');

        // Notes Section
        if (notes) {
            const notesHeight = Math.max(60, doc.heightOfString(notes, { width: contentW - 30 }) + 50);
            y = drawSection(y, notesHeight, '#f8faff', 'DOCTOR NOTES', '#6d28d9', notes, '#1e1e1e');
        }

        // Footer
        doc.rect(0, pageH - 70, pageW, 70).fill('#0d6efd');
        doc.font('Helvetica').fontSize(9).fillColor('#ffffff')
           .text('This is a computer-generated prescription from VitalSync Health Management System.', margin, pageH - 50, { align: 'center', width: contentW })
           .text('Please follow all medication instructions carefully and consult your doctor for any concerns.', margin, pageH - 35, { align: 'center', width: contentW });

        doc.end();
    });

    try {
        await transporter.sendMail({
            from: `"VitalSync" <${process.env.EMAIL_USER}>`,
            to: patientEmail,
            subject: subject,
            html: htmlBody,
            attachments: [
                {
                    filename: `VitalSync_Prescription_${new Date(date).toISOString().split('T')[0]}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        });
        logStatus(patientEmail, subject, true);
    } catch (err) {
        console.error('Email error:', err);
        logStatus(patientEmail, subject, false);
    }

    return { subject, patientEmail, doctorName };
}

module.exports = { sendAppointmentConfirmation, sendPrescriptionEmail };
