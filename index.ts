// filepath: c:\Users\techl\Github\coptic-katameros-xlsx\index.ts
import { consola } from "consola";
import * as XLSX from "xlsx";

interface SimpleDayReferences {
  gregorianDate: string;
  copticDate: string;
  references: string[];
}

interface CategorizedReferences {
  gregorianDate: string;
  copticDate: string;
  catholicEpistle: string[];
  paulineEpistle: string[];
  acts: string[];
  psalm: string[];
  gospel: string[];
}

function categorizeReference(reference: string): { type: string; ref: string } {
  // Catholic Epistles
  const catholicEpistles = [
    "James",
    "1 Peter",
    "2 Peter",
    "1 John",
    "2 John",
    "3 John",
    "Jude",
  ];
  if (catholicEpistles.some((epistle) => reference.startsWith(epistle))) {
    return { type: "catholicEpistle", ref: reference };
  }

  // Pauline Epistles
  const paulineEpistles = [
    "Romans",
    "1 Corinthians",
    "2 Corinthians",
    "Galatians",
    "Ephesians",
    "Philippians",
    "Colossians",
    "1 Thessalonians",
    "2 Thessalonians",
    "1 Timothy",
    "2 Timothy",
    "Titus",
    "Philemon",
    "Hebrews",
  ];
  if (paulineEpistles.some((epistle) => reference.startsWith(epistle))) {
    return { type: "paulineEpistle", ref: reference };
  }

  // Acts
  if (reference.startsWith("Acts")) {
    return { type: "acts", ref: reference };
  }

  // Psalms
  if (reference.startsWith("Psalms")) {
    return { type: "psalm", ref: reference };
  }

  // Gospels
  const gospels = ["Matthew", "Mark", "Luke", "John"];
  if (gospels.some((gospel) => reference.startsWith(gospel))) {
    return { type: "gospel", ref: reference };
  }

  // Default to gospel if not categorized
  return { type: "gospel", ref: reference };
}

function parseDate(
  dateStr: string
): { day: number; month: number; year: number } | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  return { day, month, year };
}

function formatCopticDate(copticDateStr: string): string {
  if (!copticDateStr || copticDateStr === "N/A") {
    return "N/A";
  }

  // Coptic month names
  const copticMonths = [
    "Thout",
    "Paopi",
    "Hathor",
    "Kiahk",
    "Toba",
    "Meshir",
    "Paremhat",
    "Paremoude",
    "Pashons",
    "Paona",
    "Epep",
    "Mesra",
    "Nasie",
  ];

  // Parse the coptic date format "DD/MM/YYYY"
  const parts = copticDateStr.split("/");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return copticDateStr; // Return original if format is unexpected
  }

  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);

  if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 13) {
    return copticDateStr; // Return original if parsing fails
  }

  const monthName = copticMonths[month - 1]; // Convert to 0-based index
  const formattedDay = day.toString().padStart(2, "0");

  return `${monthName} ${formattedDay}, ${year}`;
}

async function getReferences(startDate: string, endDate: string) {
  const baseUrl = "https://api.katameros.app/readings/gregorian";
  const languageId = 2; // English

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    consola.error("Invalid date format. Please use DD-MM-YYYY format.");
    return;
  }

  const result: SimpleDayReferences[] = [];
  const categorizedResult: CategorizedReferences[] = [];

  consola.info(
    `Extracting liturgy references from ${startDate} to ${endDate}...`
  );

  // Generate date range
  const startDateObj = new Date(start.year, start.month - 1, start.day);
  const endDateObj = new Date(end.year, end.month - 1, end.day);

  if (startDateObj > endDateObj) {
    consola.error("Start date must be before or equal to end date.");
    return;
  }

  const currentDate = new Date(startDateObj);

  while (currentDate <= endDateObj) {
    const day = currentDate.getDate();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    const dateStr = `${day.toString().padStart(2, "0")}-${month
      .toString()
      .padStart(2, "0")}-${year}`;
    const url = `${baseUrl}/${dateStr}?languageId=${languageId}`;

    try {
      consola.log(`Processing: ${dateStr}`);
      const response = await fetch(url);

      if (!response.ok) {
        consola.warn(
          `Failed to fetch ${dateStr}: ${response.status} ${response.statusText}`
        );
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const data: any = await response.json();
      const references: string[] = [];

      // Extract fullReference strings from ONLY the Liturgy section
      if (data.sections) {
        for (const section of data.sections) {
          // Only process the Liturgy section
          if (section.title === "Liturgy") {
            if (section.subSections) {
              for (const subSection of section.subSections) {
                if (subSection.readings) {
                  for (const reading of subSection.readings) {
                    if (reading.passages) {
                      for (const passage of reading.passages) {
                        const fullRef = `${passage.bookTranslation} ${passage.ref}`;
                        references.push(fullRef);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } // Categorize references for Excel
      const categorized: CategorizedReferences = {
        gregorianDate: dateStr,
        copticDate: formatCopticDate(data.copticDate || "N/A"),
        catholicEpistle: [],
        paulineEpistle: [],
        acts: [],
        psalm: [],
        gospel: [],
      };

      references.forEach((ref) => {
        const { type, ref: reference } = categorizeReference(ref);
        switch (type) {
          case "catholicEpistle":
            categorized.catholicEpistle.push(reference);
            break;
          case "paulineEpistle":
            categorized.paulineEpistle.push(reference);
            break;
          case "acts":
            categorized.acts.push(reference);
            break;
          case "psalm":
            categorized.psalm.push(reference);
            break;
          case "gospel":
            categorized.gospel.push(reference);
            break;
        }
      });
      result.push({
        gregorianDate: dateStr,
        copticDate: formatCopticDate(data.copticDate || "N/A"),
        references: references,
      });

      categorizedResult.push(categorized);

      consola.success(`  Found ${references.length} liturgy references`);

      // Add a small delay to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      consola.error(`Error processing ${dateStr}:`, error);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Write to JSON file
  const outputPath = "./out.json";
  await Bun.write(outputPath, JSON.stringify(result, null, 2));

  // Create Excel file
  const excelData = categorizedResult.map((day) => ({
    Date: day.gregorianDate,
    "Coptic Date": day.copticDate,
    "Catholic Epistle": day.catholicEpistle.join("; "),
    "Pauline Epistle": day.paulineEpistle.join("; "),
    Acts: day.acts.join("; "),
    Psalm: day.psalm.join("; "),
    Gospel: day.gospel.join("; "),
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Liturgy References");

  const excelPath = "./out.xlsx";
  XLSX.writeFile(workbook, excelPath);

  consola.success(`\nSaved liturgy references to:`);
  consola.info(`JSON: ${outputPath}`);
  consola.info(`Excel: ${excelPath}`);
  consola.info(`Total days processed: ${result.length}`);
  consola.info(
    `Total liturgy references found: ${result.reduce(
      (sum, day) => sum + day.references.length,
      0
    )}`
  );
}

async function main() {
  consola.box("Katameros API Liturgy Reference Extractor");

  const startDate = (await consola.prompt("Enter start date (DD-MM-YYYY):", {
    type: "text",
    default: "20-06-2025",
  })) as string;

  const endDate = (await consola.prompt("Enter end date (DD-MM-YYYY):", {
    type: "text",
    default: "30-06-2025",
  })) as string;

  await getReferences(startDate, endDate);
}

// Run the script
main().catch(console.error);
