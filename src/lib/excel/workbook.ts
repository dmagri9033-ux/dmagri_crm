import ExcelJS from "exceljs";

export const MAX_IMPORT_ROWS = 1000;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export type SheetRow = Record<string, string>;

export async function createTemplateBuffer(
  headers: string[],
  sheetName = "Import",
  sampleRow?: string[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DM Agree CRM";
  const sheet = workbook.addWorksheet(sheetName);
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  if (sampleRow) {
    sheet.addRow(sampleRow);
  }
  headers.forEach((_, index) => {
    sheet.getColumn(index + 1).width = Math.max(headers[index].length + 2, 16);
  });
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export async function parseWorkbookFirstSheet(
  buffer: ArrayBuffer | Buffer,
): Promise<{ headers: string[]; rows: SheetRow[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Workbook has no sheets");
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.text ?? cell.value ?? "").trim();
  });

  if (headers.filter(Boolean).length === 0) {
    throw new Error("Header row is empty");
  }

  const rows: SheetRow[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: SheetRow = {};
    let empty = true;
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      let value = "";
      if (cell.value instanceof Date) {
        value = cell.value.toISOString().slice(0, 10);
      } else if (typeof cell.value === "object" && cell.value && "text" in cell.value) {
        value = String((cell.value as { text?: string }).text ?? "").trim();
      } else if (cell.value != null) {
        value = String(cell.text ?? cell.value).trim();
      }
      record[header] = value;
      if (value) empty = false;
    });
    if (!empty) rows.push(record);
  });

  if (rows.length > MAX_IMPORT_ROWS) {
    throw new Error(`Too many rows (max ${MAX_IMPORT_ROWS})`);
  }

  return { headers, rows };
}

export function mapRowByHeaders(
  row: SheetRow,
  headerMap: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, header] of Object.entries(headerMap)) {
    result[key] = (row[header] ?? "").trim();
  }
  return result;
}

export function parseYesNo(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (!v) return false;
  if (["yes", "y", "true", "1"].includes(v)) return true;
  if (["no", "n", "false", "0"].includes(v)) return false;
  return null;
}
