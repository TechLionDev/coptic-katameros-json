// Test script to read and display Excel content
import * as XLSX from "xlsx";

const workbook = XLSX.readFile("./out.xlsx");
const worksheet = workbook.Sheets["Liturgy References"];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log("Excel file contents:");
console.log("Columns:", Object.keys(data[0]));
console.log("\nFirst few rows:");
data.slice(0, 3).forEach((row, index) => {
  console.log(`\nRow ${index + 1}:`);
  Object.entries(row).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
});

console.log(`\nTotal rows: ${data.length}`);
