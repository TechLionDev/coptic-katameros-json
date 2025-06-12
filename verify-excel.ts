// Test script to verify Excel Coptic date format
import * as XLSX from "xlsx";

const workbook = XLSX.readFile("./out.xlsx");
const worksheet = workbook.Sheets["Liturgy References"];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log("Excel Coptic Date formats:");
data.slice(0, 5).forEach((row: any, index) => {
  console.log(`Row ${index + 1}: ${row["Coptic Date"]}`);
});
