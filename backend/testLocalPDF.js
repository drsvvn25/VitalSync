const fs = require('fs');
const PDFDocument = require('pdfkit');

async function testPDF() {
    const doc = new PDFDocument({ margin: 0, size: 'A4' }); // Use 0 margin to draw full-width headers
    doc.pipe(fs.createWriteStream('test_styled_prescription.pdf'));

    const pageW = 595.28; // A4 width in points
    const pageH = 841.89; // A4 height in points
    const margin = 50;
    const contentW = pageW - margin * 2;
    let y = 0;

    const date = new Date();
    const doctorName = 'Test Doctor';
    const patientName = 'Test Patient';
    const diagnosis = 'Test Diagnosis';
    const prescription = 'Take 1 pill every 12 hours';
    const medications = [{name: 'Meds', frequency: 12, duration: 5}];
    const notes = 'Test Notes';

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
    console.log('Test PDF generated successfully.');
}

testPDF();
