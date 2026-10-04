import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export async function excelWorkbookResponse(options: {
  sheetName: string;
  filenamePrefix: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DM Agree CRM";
  const sheet = workbook.addWorksheet(options.sheetName);
  sheet.addRow(options.headers);
  sheet.getRow(1).font = { bold: true };

  for (const row of options.rows) {
    sheet.addRow(row.map((value) => value ?? ""));
  }

  options.headers.forEach((header, index) => {
    sheet.getColumn(index + 1).width = Math.max(header.length + 2, 14);
  });

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${options.filenamePrefix}-${stamp}.xlsx"`,
    },
  });
}
