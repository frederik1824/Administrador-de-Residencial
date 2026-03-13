import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StatementData {
    residentName: string;
    unit: string;
    date: string;
    payments: any[]; // The resident's payment history
    residentialName: string;
    residentialAddress: string;
    residentialPhone: string;
    residentialEmail: string;
    logoUrl?: string; // Optional logo
}

export const generateStatementPDF = async (data: StatementData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 20;

    // --- HEADING / HEADER ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(data.residentialName || 'Residencial', 14, currentY);

    currentY += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);

    if (data.residentialAddress) {
        doc.text(data.residentialAddress, 14, currentY);
        currentY += 5;
    }
    if (data.residentialPhone || data.residentialEmail) {
        const contactInfo = [data.residentialPhone, data.residentialEmail].filter(Boolean).join(' | ');
        doc.text(contactInfo, 14, currentY);
        currentY += 5;
    }

    // Title
    currentY += 10;
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADO DE CUENTA', 14, currentY);

    // Resident Info Box
    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    doc.text(`Residente: ${data.residentName}`, 14, currentY);
    doc.text(`Unidad/Apto: ${data.unit}`, 14, currentY + 6);

    // Right side: Date
    doc.text(`Fecha de Emisión: ${data.date}`, pageWidth - 14, currentY, { align: 'right' });

    currentY += 16;

    // --- PAYMENTS TABLE ---
    const tableData = data.payments.map((p) => {
        // Formatear montos
        const rawAmount = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^0-9.-]+/g, "") || "0");
        return [
            p.date || '-',
            p.transactionId || '-',
            p.title || 'Mantenimiento',
            p.status || 'Pendiente',
            `$${rawAmount.toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: currentY,
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' }, // slate-700
        alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
        margin: { top: 10, left: 14, right: 14 },
        head: [['Fecha', 'Ref', 'Concepto', 'Estado', 'Monto']],
        body: tableData,
    });

    // --- SUMMARY SECTION ---
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Calculate totals
    const totalPaid = data.payments
        .filter(p => p.status === 'Pagado')
        .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^0-9.-]+/g, "") || "0")), 0);

    const pendingAmount = data.payments
        .filter(p => p.status === 'Pendiente' || p.status === 'Vencido')
        .reduce((sum, p) => sum + (typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^0-9.-]+/g, "") || "0")), 0);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Cuenta:', 14, finalY);

    doc.setFont('helvetica', 'normal');
    // Green text for paid
    doc.setTextColor(34, 197, 94); // emerald-500
    doc.text(`Total Pagado (Histórico): $${totalPaid.toFixed(2)}`, 14, finalY + 8);

    // Red text for pending
    doc.setTextColor(239, 68, 68); // red-500
    doc.setFont('helvetica', 'bold');
    doc.text(`Balance Pendiente a Pagar: $${pendingAmount.toFixed(2)}`, 14, finalY + 16);

    // Reset Color
    doc.setTextColor(150);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Este documento es generado automáticamente por el sistema de administración del residencial.', pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

    // --- SAVE ---
    const filename = `Estado_de_Cuenta_${data.unit.replace(/[\s/]/g, '_')}_${data.date.replace(/-/g, '')}.pdf`;
    doc.save(filename);
};
