import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

function safe(v) {
  return v === null || v === undefined ? '' : String(v);
}

export function exportDispatchesPdf({ records, defaults }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  const primary = [30, 41, 59]; // slate-ish
  const accent = [245, 158, 11]; // amber-ish

  const now = new Date();
  const generatedAt = format(now, 'yyyy-MM-dd HH:mm');

  const marginX = 40;
  const headerHeight = 96;
  const headerPaddingTop = 26;
  const headerY = headerPaddingTop + 14;

  doc.setFillColor(...primary);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DM Distribuciones', marginX, headerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Reporte de Trazabilidad - Despachos', marginX, headerY + 18);

  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240);
  doc.text(`Fecha de generación: ${generatedAt}`, marginX, headerY + 40);

  doc.setDrawColor(...accent);
  doc.setLineWidth(3);
  doc.line(marginX, headerHeight + 10, marginX + 160, headerHeight + 10);

  const d = {
    placa: defaults?.placa || '',
    conductor: defaults?.conductor || '',
  };

  const tableBody = (records ?? []).map((r) => ([
    safe(r.fechaDespacho ?? r.fecha),
    safe(r.hora),
    safe(r.cliente),
    safe(r.producto),
    safe(r.lote),
    safe(r.cantidadBolsas ?? r.cantidad),
    safe(r.peso),
    safe(r.destino),
    safe(r.placa || d.placa),
    safe(r.conductor || d.conductor),
    safe(r.observaciones),
  ]));

  autoTable(doc, {
    startY: headerHeight + 28,
    margin: { left: marginX, right: marginX },
    head: [[
      'Fecha',
      'Hora',
      'Cliente',
      'Producto',
      'Lote',
      'Cantidad',
      'Peso',
      'Destino',
      'Placa',
      'Conductor',
      'Observaciones',
    ]],
    body: tableBody,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 6,
      overflow: 'linebreak',
      textColor: [17, 24, 39],
    },
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 64 },
      1: { cellWidth: 46 },
      2: { cellWidth: 120 },
      3: { cellWidth: 100 },
      4: { cellWidth: 72 },
      5: { cellWidth: 58, halign: 'right' },
      6: { cellWidth: 48, halign: 'right' },
      7: { cellWidth: 130 },
      8: { cellWidth: 60 },
      9: { cellWidth: 110 },
      10: { cellWidth: 160 },
    },
    didDrawPage: (data) => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Registros: ${records?.length ?? 0}`,
        marginX,
        pageHeight - 26,
      );

      const pageCount = doc.internal.getNumberOfPages();
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageWidth - marginX,
        pageHeight - 26,
        { align: 'right' },
      );
    },
  });

  doc.save(`Trazabilidad_Despachos_${format(now, 'yyyyMMdd_HHmm')}.pdf`);
}

