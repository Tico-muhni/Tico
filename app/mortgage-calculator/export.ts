// ייצוא לאקסל ללא תלות חיצונית (כדי להימנע מפגיעויות אבטחה ידועות
// בגרסת ה-npm של xlsx) - בפורמט SpreadsheetML (XML) שאקסל פותח באופן
// טבעי, כולל תמיכה מלאה בעברית.

export type SheetData = {
  name: string;
  rows: (string | number)[][];
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cellXml(value: string | number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function sheetXml(sheet: SheetData) {
  const rowsXml = sheet.rows
    .map((row) => `<Row>${row.map(cellXml).join("")}</Row>`)
    .join("");
  return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rowsXml}</Table></Worksheet>`;
}

export function downloadExcel(filename: string, sheets: SheetData[]) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheets.map(sheetXml).join("\n")}
</Workbook>`;

  const blob = new Blob([xml], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
