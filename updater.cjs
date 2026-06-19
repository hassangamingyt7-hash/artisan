const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');

const filesToPatch = [
  { file: "BrandView.tsx", array: "brands", dateVar: "created_at" },
  { file: "CustomerView.tsx", array: "customers", dateVar: "created_at" },
  { file: "ExpenseView.tsx", array: "expenses", dateVar: "expense_date" },
  { file: "InventoryView.tsx", array: "inventory", dateVar: "created_at" },
  { file: "OrderView.tsx", array: "orders", dateVar: "order_date" },
  { file: "PaymentView.tsx", array: "payments", dateVar: "payment_date" },
  { file: "PurchaseView.tsx", array: "purchases", dateVar: "purchase_date" },
  { file: "SupplierView.tsx", array: "suppliers", dateVar: "created_at" },
  { file: "InvoiceView.tsx", array: "invoices", dateVar: "invoice_date" }
];

for (const { file, array, dateVar } of filesToPatch) {
  const filePath = path.join(componentsDir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('TableActionControls')) continue;

  console.log('Patching ' + file);

  // 1. Imports
  content = content.replace(/(import React.*?;\n)/, `$1import TableActionControls, { exportToExcel, filterByDateRange } from "./TableActionControls.tsx";\n`);

  // 2. State definition
  const stateRegex = /const \[search, setSearch\] = useState[\<string\>]*\(""\);/;
  if (stateRegex.test(content)) {
    content = content.replace(stateRegex, `const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState({ start: "", end: "" });`);
  } else {
    // some files don't have search? Let's just put it after component decl
    content = content.replace(/(export default function \w+\(.*\) \{)/, `$1\n  const [dateFilter, setDateFilter] = useState("all");\n  const [customDate, setCustomDate] = useState({ start: "", end: "" });`);
  }

  // 3. Filter definition
  const filterRegex = new RegExp(`const filtered([a-zA-Z]*) = ${array}\\.filter\\(`);
  if (filterRegex.test(content)) {
    content = content.replace(filterRegex, `const timeFiltered$1 = filterByDateRange(${array}, "${dateVar}", dateFilter, customDate);
  const filtered$1 = timeFiltered$1.filter(`);
  } else {
    // If not found (e.g. they use another variable or just map directly)
    // We'll wrap the `array.map` in the render block instead
  }

  // 4. Inject TableActionControls UI
  // Usually goes right after the Search/Filter input block, before `<table` 
  const tableRegex = /<table/;
  const injectUI = `
      <TableActionControls 
        onPrint={() => window.print()} 
        onPdf={() => window.print()} 
        onExcel={() => exportToExcel(timeFiltered || filtered || ${array}, "${file.replace('View.tsx', '').toLowerCase()}")}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customDateRange={customDate}
        setCustomDateRange={setCustomDate}
      />
      <table`;
  
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
        />
        <table`);

    // Let's dynamically fix the export array to be the filtered one
    const checkFiltered = new RegExp(`const filtered([a-zA-Z]*) = timeFiltered`);
    const match = content.match(/const filtered([a-zA-Z]*) = timeFiltered/);
    if (match) {
        content = content.replace(/exportToExcel\([^,]+,/, `exportToExcel(filtered${match[1]},`);
    }
  }

  fs.writeFileSync(filePath, content);
}
console.log("Done");
