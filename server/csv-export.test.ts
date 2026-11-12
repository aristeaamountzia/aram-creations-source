import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, csvCell } from '../src/lib/csv-export';

test('CSV cells preserve quotes and Unicode while neutralizing spreadsheet formulas', () => {
  assert.equal(csvCell('Κολιέ "Άνοιξη"'), '"Κολιέ ""Άνοιξη"""');
  assert.equal(csvCell('=HYPERLINK("https://evil.example")'), '"\'=HYPERLINK(""https://evil.example"")"');
  assert.equal(csvCell('  +cmd'), '"\'  +cmd"');
  assert.equal(csvCell('@SUM(A1:A2)'), '"\'@SUM(A1:A2)"');
  assert.equal(csvCell('Κανονικό - κείμενο'), '"Κανονικό - κείμενο"');
});

test('buildCsv applies the same escaping to Shop and Portfolio rows', () => {
  const output = buildCsv(['Όνομα', 'Τιμή'], [['=2+2', 12.5], ['Χειροποίητο', '10']], ';');
  assert.equal(output, '"Όνομα";"Τιμή"\r\n"\'=2+2";"12.5"\r\n"Χειροποίητο";"10"');
});
