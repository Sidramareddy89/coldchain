// load_datasets_node.js
// Node.js script to read two Excel files, summarize, and split into train/validation sets.
// Install dependencies:
//   npm install xlsx lodash

const XLSX = require('xlsx');
const _ = require('lodash');
const path = require('path');

// Update the paths if the files move
const file1 = path.resolve('C:/Users/Siddram reddy/Downloads/coldchain_twin_synthetic_dataset.csv.xlsx');
const file2 = path.resolve('C:/Users/Siddram reddy/Downloads/coldchain_twin_dataset.xlsx');

function loadExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: null });
}

function summarize(data, label) {
  console.log(`\n--- ${label} ---`);
  console.log(`Rows: ${data.length}`);
  if (data.length) {
    const cols = Object.keys(data[0]);
    console.log(`Columns (${cols.length}): ${cols.join(', ')}`);
    console.table(data.slice(0, 5));
  }
}

function split(data, ratio = 0.8) {
  const shuffled = _.shuffle(data);
  const trainSize = Math.floor(shuffled.length * ratio);
  return {
    train: shuffled.slice(0, trainSize),
    val: shuffled.slice(trainSize)
  };
}

// Load, summarize, split
const ds1 = loadExcel(file1);
const ds2 = loadExcel(file2);

summarize(ds1, 'Dataset 1');
summarize(ds2, 'Dataset 2');

const split1 = split(ds1);
const split2 = split(ds2);

console.log('\nDataset 1 split:');
console.log(`  Train rows: ${split1.train.length}`);
console.log(`  Validation rows: ${split1.val.length}`);

console.log('\nDataset 2 split:');
console.log(`  Train rows: ${split2.train.length}`);
console.log(`  Validation rows: ${split2.val.length}`);

// Optional: write splits back to CSV files (uncomment to use)
function exportCSV(arr, outPath) {
  const ws = XLSX.utils.json_to_sheet(arr);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, outPath);
}

// exportCSV(split1.train, path.resolve('dataset1_train.csv'));
// exportCSV(split1.val,   path.resolve('dataset1_val.csv'));
// exportCSV(split2.train, path.resolve('dataset2_train.csv'));
// exportCSV(split2.val,   path.resolve('dataset2_val.csv'));

console.log('\nFinished');
