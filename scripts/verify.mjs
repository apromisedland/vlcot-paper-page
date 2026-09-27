import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');
const html = await read('index.html');
const paper = JSON.parse(await read('assets/data/paper.json'));
const results = JSON.parse(await read('assets/data/results.json'));
const ledger = JSON.parse(await read('assets/data/figure-provenance.json'));
const manifest = JSON.parse(await read('publication.json')).files;
const tables = Object.values(results.tables);
assert.equal(tables.length, 7);
assert.equal(tables.reduce((count, table) => count + table.rows.length, 0), 45);
assert.equal(tables.reduce((count, table) => count + table.rows.flatMap((row) => Object.values(row.values)).filter((value) => value !== null).length, 0), 162);
assert.deepEqual(JSON.parse(html.match(/<script id="paper-data" type="application\/json">([\s\S]*?)<\/script>/)[1]), { paper, results });
assert.equal(ledger.source_sha256, results.source.sha256);
const pdf = await readFile(path.join(root, paper.pdf));
assert.equal(createHash('sha256').update(pdf).digest('hex'), results.source.pdfSha256);
assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
for (const table of tables) {
  const region = html.split(`<!-- table:${table.id}:start -->`)[1].split(`<!-- table:${table.id}:end -->`)[0];
  const rows = [...region.matchAll(/<tr(?: class="our-row")?><th scope="row">[\s\S]*?<\/tr>/g)];
  assert.equal(rows.length, table.rows.length, `${table.id}: static row count`);
  table.rows.forEach((row, index) => {
    assert.deepEqual(Object.keys(row.values), table.keys);
    const cells = [...rows[index][0].matchAll(/<td>(.*?)<\/td>/g)].map((match) => match[1]).slice(table.hasSource ? 1 : 0);
    assert.deepEqual(cells, table.keys.map((key) => row.values[key] === null ? 'N/A' : key === 'latency' ? String(row.values[key]) : row.values[key].toFixed(1)), `${table.id}: ${row.name}`);
    for (const value of Object.values(row.values)) assert.ok(value === null || (Number.isFinite(value) && value >= 0));
  });
}
const repair = Object.fromEntries(results.tables.repair.rows.map((row) => [row.id, row.values]));
const expected = {
  timeReduction: (repair.full.time - repair.local.time) / repair.full.time * 100,
  recoveryGain: repair.local.recovery - repair.disabled.recovery,
  recoveryGap: repair.full.recovery - repair.local.recovery,
  latencyReduction: (repair.full.latency - repair.local.latency) / repair.full.latency * 100,
  vectorReduction: (repair.full.vectors - repair.local.vectors) / repair.full.vectors * 100
};
for (const [key, value] of Object.entries(expected)) assert.ok(Math.abs(results.derived[key].value - value) < 1e-10, key);
assert.equal(expected.timeReduction.toFixed(1), '19.9');
assert.equal(expected.recoveryGain.toFixed(1), '3.2');
assert.equal(expected.recoveryGap.toFixed(1), '0.4');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(ids.length, new Set(ids).size, 'Unique HTML IDs');
const links = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
for (const link of links) {
  if (/^https:\/\//.test(link)) continue;
  assert.ok(!link.startsWith('/') && !link.includes('\\'), `Relative link: ${link}`);
  if (link.startsWith('#')) { assert.ok(link === '#' || ids.includes(link.slice(1)), `Anchor ${link}`); continue; }
  const file = link.split('#')[0];
  assert.ok(manifest.includes(file), `Link in public allowlist: ${file}`);
  assert.ok((await stat(path.join(root, file))).isFile());
}
for (const file of manifest) {
  assert.ok(!/(^paper\/|\.qa\/|\.tex$|\.zip$|\.log$|node_modules|\.venv)/i.test(file), `No private file: ${file}`);
  assert.ok((await stat(path.join(root, file))).isFile(), file);
  if (/\.(html|css|js|json|svg|bib|md)$/.test(file)) {
    const content = await read(file);
    assert.ok(!/[A-Z]:[\\/](Users|Windows)|file:\/\//i.test(content), `No local absolute paths: ${file}`);
  }
}
for (const file of await readdir(path.join(root, 'assets'), { recursive: true })) {
  if ((await stat(path.join(root, 'assets', file))).isFile()) assert.ok(manifest.includes(`assets/${file.replaceAll('\\', '/')}`), `Unexpected public asset: ${file}`);
}
assert.ok(!/<a[^>]+(?:href="[^"]*\.(tex|zip))/i.test(html), 'No manuscript source download');
assert.ok(paper.authors.every((author) => html.includes(author.name)), 'All authors');
assert.ok(paper.affiliations.every((affiliation) => html.includes(affiliation.name)), 'Full university names');
console.log(`Verified 7 tables / 45 rows / 162 numerical cells, ${links.length} links, derived comparisons, PDF hash and ${manifest.length} publication files.`);
