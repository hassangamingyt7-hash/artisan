const fs = require('fs');
const filesToPatch = [
  { file: 'OperatorPerformanceView.tsx', array: 'operators', dateVar: 'created_at' },
  { file: 'ReportsView.tsx', array: 'invoices', dateVar: 'invoice_date' }
];

const path = require('path');
const componentsDir = path.join(process.cwd(), 'src', 'components');

for (const { file, array, dateVar } of filesToPatch) {
  const filePath = path.join(componentsDir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('TableActionControls')) continue;

  console.log('Patching ' + file);

  content = content.replace(/(import React.*?;\n)/, `$1import TableActionControls, { exportToExcel, filterByDateRange } from "./TableActionControls.tsx";\n`);

  const stateRegex = /const \[search, setSearch\] = useState.*\(""\);/;
  if (stateRegex.test(content)) {
    content = content.replace(stateRegex, `const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState({ start: "", end: "" });`);
  } else {
    content = content.replace(/(export default function \w+\(.*\) \{)/, `$1\n  const [dateFilter, setDateFilter] = useState("all");\n  const [customDate, setCustomDate] = useState({ start: "", end: "" });`);
  }

  const filterRegex = new RegExp(`const filtered([a-zA-Z]*) = ${array}\\.filter\\(`);
  if (filterRegex.test(content)) {
    content = content.replace(filterRegex, `const timeFiltered$1 = filterByDateRange(${array}, "${dateVar}", dateFilter, customDate);\n  const filtered$1 = timeFiltered$1.filter(`);
  }

  const tableRegex = /<table/;
  if (content.includes('<table')) {
    content = content.replace(tableRegex, `
        <TableActionControls 
          onPrint={() => window.print()} 
          onPdf={() => window.print()} 
          onExcel={() => exportToExcel(${array}, "${file.toLowerCase().replace('view.tsx', '')}")}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          customDateRange={customDate}
          setCustomDateRange={setCustomDate}
        />\n        <table`);

    const match = content.match(/const filtered([a-zA-Z]*) = timeFiltered/);
    if (match) {
        content = content.replace(/exportToExcel\([^,]+,/, `exportToExcel(filtered${match[1]},`);
    }
  }

  fs.writeFileSync(filePath, content);
}
console.log("Done");
