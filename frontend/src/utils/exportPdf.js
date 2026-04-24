import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportToPdf({ title, headers, data, filename }) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.setTextColor(30, 27, 75);
  doc.text(title, 14, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  // Table
  doc.autoTable({
    startY: 35,
    head: [headers],
    body: data,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    styles: {
      cellPadding: 4,
      overflow: 'linebreak',
    },
  });

  doc.save(filename || `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
