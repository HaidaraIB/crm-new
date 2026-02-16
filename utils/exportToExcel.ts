import ExcelJS from 'exceljs';

export type ExportColumn = { key: string; label: string };

/**
 * Export an array of objects to an Excel file and trigger download.
 * @param data Array of row objects (keys match column keys)
 * @param columns Column definitions: key (property name), label (header text)
 * @param filename Download filename (without extension)
 * @param sheetName Optional sheet name (default: Sheet1)
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, { headerRow: true });

  // Headers
  const headerRow = sheet.getRow(1);
  columns.forEach((col, i) => {
    headerRow.getCell(i + 1).value = col.label;
  });
  headerRow.font = { bold: true };

  // Data rows
  data.forEach((row, rowIndex) => {
    const r = sheet.getRow(rowIndex + 2);
    columns.forEach((col, colIndex) => {
      const val = row[col.key];
      r.getCell(colIndex + 1).value = val != null ? val : '';
    });
  });

  // Auto-fit columns (approximate)
  columns.forEach((_, i) => {
    let maxLen = 12;
    data.forEach(row => {
      const v = row[columns[i].key];
      const s = v != null ? String(v) : '';
      if (s.length > maxLen) maxLen = Math.min(s.length, 50);
    });
    sheet.getColumn(i + 1).width = maxLen + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
