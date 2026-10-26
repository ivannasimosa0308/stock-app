import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product } from '../models/product.model';
import { MovementLog } from '../models/inventory-log.model';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  /**
   * Exporta la lista de productos a formato CSV compatible con Microsoft Excel
   */
  exportProductsToCsv(products: Product[]): void {
    if (!products || products.length === 0) {
      alert('No hay datos disponibles para exportar.');
      return;
    }

    const headers = ['SKU', 'Nombre', 'Categoria', 'Stock Actual', 'Stock Minimo', 'Precio Unitario (EUR)', 'Valoracion Total (EUR)'];
    const rows = products.map(p => [
      `"${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.category?.name || 'Sin categoría').replace(/"/g, '""')}"`,
      p.stock,
      p.min_stock,
      p.unit_price.toFixed(2),
      (p.stock * p.unit_price).toFixed(2)
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
    this.downloadFile(csvContent, `StockFlow_Inventario_${this.getDateStamp()}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Exporta el historial de movimientos de existencias a formato CSV
   */
  exportMovementsToCsv(movements: MovementLog[]): void {
    if (!movements || movements.length === 0) {
      alert('No hay movimientos registrados para exportar.');
      return;
    }

    const headers = ['Fecha', 'SKU', 'Producto', 'Tipo Movimiento', 'Cantidad', 'Stock Previo', 'Stock Nuevo', 'Motivo', 'Usuario'];
    const rows = movements.map(m => [
      `"${new Date(m.timestamp).toLocaleString('es-ES')}"`,
      `"${m.sku}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      `"${m.movementType === 'IN' ? 'ENTRADA' : m.movementType === 'OUT' ? 'SALIDA' : m.movementType}"`,
      m.quantity,
      m.previousStock,
      m.newStock,
      `"${(m.reason || '').replace(/"/g, '""')}"`,
      `"${m.userEmail}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\r\n');
    this.downloadFile(csvContent, `StockFlow_Movimientos_${this.getDateStamp()}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Genera y descarga un informe ejecutivo en formato PDF corporativo usando jsPDF
   */
  exportInventoryToPdf(products: Product[]): void {
    if (!products || products.length === 0) {
      alert('No hay productos para generar el PDF.');
      return;
    }

    const doc = new jsPDF('p', 'pt', 'a4');

    // 1. Encabezado Corporativo
    doc.setFillColor(37, 99, 235); // Azul primario corporativo (#2563eb)
    doc.rect(0, 0, 595.28, 70, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('StockFlow Enterprise', 40, 42);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Informe Ejecutivo de Inventario y Existencias', 40, 58);

    // Fecha y Metadatos
    doc.setFontSize(9);
    doc.setTextColor(220, 230, 255);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 430, 42);
    doc.text('Sistema: PWA Ionic + Supabase', 430, 56);

    // 2. Resumen Métricas
    const totalUds = products.reduce((acc, p) => acc + p.stock, 0);
    const totalVal = products.reduce((acc, p) => acc + (p.stock * p.unit_price), 0);
    const lowStock = products.filter(p => p.stock <= p.min_stock).length;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen General del Almacén', 40, 100);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Referencias: ${products.length} productos`, 40, 118);
    doc.text(`Unidades Físicas en Stock: ${totalUds} unidades`, 200, 118);
    doc.text(`Productos con Stock Crítico: ${lowStock}`, 370, 118);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Verde
    doc.text(`Valoración Total: ${totalVal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, 40, 136);

    // 3. Tabla de Productos con autoTable
    const tableBody = products.map(p => [
      p.sku,
      p.name,
      p.category?.name || 'General',
      p.stock.toString(),
      `${p.unit_price.toFixed(2)} €`,
      `${(p.stock * p.unit_price).toFixed(2)} €`,
      p.stock <= p.min_stock ? 'REPOSICIÓN' : 'OK'
    ]);

    autoTable(doc, {
      startY: 155,
      head: [['SKU', 'Producto', 'Categoría', 'Stock', 'Precio U.', 'Subtotal', 'Estado']],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 8,
        cellPadding: 5
      },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 140 },
        2: { cellWidth: 90 },
        3: { halign: 'center', cellWidth: 45 },
        4: { halign: 'right', cellWidth: 55 },
        5: { halign: 'right', cellWidth: 60 },
        6: { halign: 'center', cellWidth: 60 }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw === 'REPOSICIÓN') {
            data.cell.styles.textColor = [239, 68, 68]; // Rojo
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [16, 185, 129]; // Verde
          }
        }
      }
    });

    // 4. Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento Confidencial - StockFlow PWA - Página ${i} de ${pageCount}`,
        40,
        doc.internal.pageSize.height - 20
      );
    }

    doc.save(`StockFlow_Informe_${this.getDateStamp()}.pdf`);
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private getDateStamp(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }
}
