/**
 * PDF Receipt Service
 * ===================
 * Generate PDF receipts for bookings using PDFKit.
 */

import PDFDocument from 'pdfkit';
import { formatPrice, formatDate } from '../lib/utils.js';

interface ReceiptData {
  bookingId: string;
  user: {
    name: string;
    email: string;
    phone?: string | null;
  };
  service: {
    title: string;
    category: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  slot: {
    date: Date;
    startTime: string;
    endTime: string;
  };
  amount: number;
  paymentMode: 'ONLINE' | 'CASH';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: Date;
}

/**
 * Generate PDF receipt for a booking
 * Returns a Buffer containing the PDF
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    // Collect chunks
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ===== HEADER =====
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#4f46e5')
      .text('Service Booking Platform', { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(16)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Booking Receipt', { align: 'center' })
      .moveDown(1);

    // Horizontal line
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);

    // ===== BOOKING INFO =====
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('BOOKING DETAILS', { underline: true })
      .moveDown(0.5);

    const leftColX = 50;
    const rightColX = 200;

    // Booking ID
    doc.font('Helvetica').fillColor('#6b7280').text('Booking ID:', leftColX, doc.y);
    doc.font('Helvetica-Bold').fillColor('#111827').text(data.bookingId, rightColX, doc.y - 12);
    doc.moveDown(0.3);

    // Date
    doc.font('Helvetica').fillColor('#6b7280').text('Booking Date:', leftColX, doc.y);
    doc.font('Helvetica').fillColor('#111827').text(formatDate(data.createdAt), rightColX, doc.y - 12);
    doc.moveDown(0.3);

    // Status
    doc.font('Helvetica').fillColor('#6b7280').text('Status:', leftColX, doc.y);
    const statusColor = data.paymentStatus === 'SUCCESS' ? '#10b981' : '#ef4444';
    doc.font('Helvetica-Bold').fillColor(statusColor).text(data.paymentStatus, rightColX, doc.y - 12);
    doc.moveDown(1.5);

    // ===== CUSTOMER INFO =====
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('CUSTOMER INFORMATION', { underline: true })
      .moveDown(0.5);

    doc.font('Helvetica').fillColor('#6b7280').text('Name:', leftColX, doc.y);
    doc.font('Helvetica').fillColor('#111827').text(data.user.name, rightColX, doc.y - 12);
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#6b7280').text('Email:', leftColX, doc.y);
    doc.font('Helvetica').fillColor('#111827').text(data.user.email, rightColX, doc.y - 12);
    doc.moveDown(0.3);

    if (data.user.phone) {
      doc.font('Helvetica').fillColor('#6b7280').text('Phone:', leftColX, doc.y);
      doc.font('Helvetica').fillColor('#111827').text(data.user.phone, rightColX, doc.y - 12);
      doc.moveDown(0.3);
    }
    doc.moveDown(1);

    // ===== SERVICE INFO =====
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('SERVICE DETAILS', { underline: true })
      .moveDown(0.5);

    doc.font('Helvetica').fillColor('#6b7280').text('Service:', leftColX, doc.y);
    doc.font('Helvetica-Bold').fillColor('#111827').text(data.service.title, rightColX, doc.y - 12);
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#6b7280').text('Category:', leftColX, doc.y);
    doc.font('Helvetica').fillColor('#111827').text(data.service.category, rightColX, doc.y - 12);
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#6b7280').text('Date:', leftColX, doc.y);
    doc.font('Helvetica').fillColor('#111827').text(formatDate(data.slot.date), rightColX, doc.y - 12);
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#6b7280').text('Time:', leftColX, doc.y);
    doc.font('Helvetica').fillColor('#111827').text(`${data.slot.startTime} - ${data.slot.endTime}`, rightColX, doc.y - 12);
    doc.moveDown(0.3);

    // Location
    if (data.service.address || data.service.city) {
      const location = [data.service.address, data.service.city, data.service.state]
        .filter(Boolean)
        .join(', ');
      doc.font('Helvetica').fillColor('#6b7280').text('Location:', leftColX, doc.y);
      doc.font('Helvetica').fillColor('#111827').text(location, rightColX, doc.y - 12, { width: 300 });
      doc.moveDown(0.3);
    }

    // Coordinates
    if (data.service.latitude && data.service.longitude) {
      doc.font('Helvetica').fillColor('#6b7280').text('Coordinates:', leftColX, doc.y);
      doc.font('Helvetica').fillColor('#111827')
        .text(`${data.service.latitude.toFixed(6)}, ${data.service.longitude.toFixed(6)}`, rightColX, doc.y - 12);
      doc.moveDown(0.3);
    }
    doc.moveDown(1);

    // ===== PAYMENT INFO =====
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('PAYMENT DETAILS', { underline: true })
      .moveDown(0.5);

    doc.font('Helvetica').fillColor('#6b7280').text('Payment Mode:', leftColX, doc.y);
    doc.font('Helvetica').fillColor('#111827').text(data.paymentMode, rightColX, doc.y - 12);
    doc.moveDown(0.3);

    doc.font('Helvetica').fillColor('#6b7280').text('Amount Paid:', leftColX, doc.y);
    doc.font('Helvetica-Bold').fillColor('#10b981').fontSize(14)
      .text(formatPrice(data.amount), rightColX, doc.y - 14);
    doc.moveDown(2);

    // ===== FOOTER =====
    // Horizontal line
    doc
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke()
      .moveDown(1);

    // Reset x position and use full width for centered footer text
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#10b981')
      .text('Thank you for your booking!', doc.page.margins.left, doc.y, { width: pageWidth, align: 'center' })
      .moveDown(0.3)
      .fillColor('#9ca3af')
      .text('This is a computer-generated receipt and does not require a signature.', doc.page.margins.left, doc.y, { width: pageWidth, align: 'center' })
      .moveDown(0.3)
      .text(`Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, doc.page.margins.left, doc.y, { width: pageWidth, align: 'center' });

    // Finalize PDF
    doc.end();
  });
}
