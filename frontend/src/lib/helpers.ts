import { jsPDF } from 'jspdf';
import { Service, TimeSlot, Booking } from '@/types';

export function generateReceipt(
  booking: Booking,
  service: Service,
  slot: TimeSlot,
  userName: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(67, 56, 202);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('BOOKIFY', pageWidth / 2, 25, { align: 'center' });

  // Title
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(18);
  doc.text('Booking Receipt', pageWidth / 2, 55, { align: 'center' });

  // Booking ID
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Receipt #${booking.id}`, pageWidth / 2, 65, { align: 'center' });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 75, pageWidth - 20, 75);

  // Details
  let y = 90;
  const leftMargin = 25;
  const rightCol = 80;

  const addRow = (label: string, value: string) => {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, leftMargin, y);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(value, rightCol, y);

    y += 12;
  };

  addRow('Customer Name:', userName);
  addRow('Service:', service.name);
  addRow('Organizer:', service.organizerName);
  addRow('Date:', new Date(slot.date).toLocaleDateString('en-IN', { dateStyle: 'long' }));
  addRow('Time:', `${slot.startTime} - ${slot.endTime}`);
  addRow('Duration:', `${service.slotDuration} minutes`);
  addRow('Payment Mode:', booking.paymentMode === 'online' ? 'Online Payment' : 'Cash Payment');

  // Location
  if (service.latitude && service.longitude) {
    addRow('Location:', `${service.latitude.toFixed(4)}, ${service.longitude.toFixed(4)}`);
  }

  // Price box
  y += 10;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(20, y, pageWidth - 40, 30, 5, 5, 'F');

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Amount', leftMargin, y + 12);

  doc.setTextColor(67, 56, 202);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`₹${booking.amount.toFixed(2)}`, pageWidth - 25, y + 20, { align: 'right' });

  // Footer
  y = 280;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for booking with Bookify!', pageWidth / 2, y, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, y + 8, { align: 'center' });

  // Download
  doc.save(`bookify-receipt-${booking.id}.pdf`);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function getPasswordStrength(password: string): { level: 'weak' | 'medium' | 'strong'; score: number } {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (score <= 2) return { level: 'weak', score: score / 6 };
  if (score <= 4) return { level: 'medium', score: score / 6 };
  return { level: 'strong', score: score / 6 };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
