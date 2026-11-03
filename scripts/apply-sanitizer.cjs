const fs = require('fs');
const path = require('path');

// 1. Update ItemDetailModal.tsx
const itemDetailPath = path.resolve(__dirname, '../src/components/ItemDetailModal.tsx');
let idmContent = fs.readFileSync(itemDetailPath, 'utf8');
const isIdmCRLF = idmContent.includes('\r\n');
if (isIdmCRLF) idmContent = idmContent.replace(/\r\n/g, '\n');

if (!idmContent.includes('sanitizeVintedDescription')) {
  idmContent = "import { sanitizeVintedDescription } from '../lib/vinted-sanitizer';\n" + idmContent;
  idmContent = idmContent.replace(
    '{item.description}',
    '{sanitizeVintedDescription(item.description)}'
  );
}
if (isIdmCRLF) idmContent = idmContent.replace(/\n/g, '\r\n');
fs.writeFileSync(itemDetailPath, idmContent, 'utf8');
console.log('Successfully updated ItemDetailModal.tsx');

// 2. Update BackOfficeView.tsx
const boPath = path.resolve(__dirname, '../src/components/BackOfficeView.tsx');
let boContent = fs.readFileSync(boPath, 'utf8');
const isBoCRLF = boContent.includes('\r\n');
if (isBoCRLF) boContent = boContent.replace(/\r\n/g, '\n');

boContent = boContent.replace(
  /const stripVintedCondition = \(text: string \| null \| undefined\): string => \{[\s\S]*?\};\n/g,
  "import { sanitizeVintedDescription as stripVintedCondition } from '../lib/vinted-sanitizer';\n"
);

if (isBoCRLF) boContent = boContent.replace(/\n/g, '\r\n');
fs.writeFileSync(boPath, boContent, 'utf8');
console.log('Successfully updated BackOfficeView.tsx with centralized Vinted sanitizer');

