import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = path.join(root, 'paper/vlcot_iclr_tex/vlcot_iclr_en.tex');
const assets = path.join(root, 'assets');
const sourceAvailable = await access(sourcePath).then(() => true, () => false);
const paper = JSON.parse(await readFile(path.join(assets, 'data/paper.json'), 'utf8'));
const hash = (content) => createHash('sha256').update(content).digest('hex');
const tableConfigs = [
  { id: 'libero', label: 'tab:libero', number: '1', page: 7, title: 'LIBERO task success', context: 'Published references and measurements from this work. Four suites, ten tasks per suite. VLCoT equally weights the four suite scores; published averages retain their original definitions.', columns: ['Spatial', 'Object', 'Goal', 'Long', 'Average'], keys: ['spatial', 'object', 'goal', 'long', 'average'], units: ['%', '%', '%', '%', '%'], hasSource: true, sourceType: 'published_context', citation: 'A: OpenVLA-OFT; B: Fast-ThinkAct; C: LaRA-VLA.' },
  { id: 'robotwin50', label: 'tab:robotwin_50', number: '2a', page: 8, title: 'RoboTwin 2.0 · 50 tasks', context: 'Per-task success, averaged over the 50-task benchmark. The reported protocol uses 50 clean demonstrations per task and 100 tests per clean/randomized condition. Published baselines retain their original settings.', columns: ['Clean (Easy)', 'Randomized (Hard)'], keys: ['clean', 'randomized'], units: ['%', '%'], sourceType: 'published_context', citation: 'RoboTwin 2.0 (Chen et al., 2025).' },
  { id: 'robotwin10', label: 'tab:robotwin_10', number: '2b', page: 8, title: 'RoboTwin 2.0 · 10-task subset', context: 'The ten-task subset follows the Fast-ThinkAct reference protocol. Its task coverage differs from the 50-task benchmark; these averages must not be combined or directly ranked against that benchmark.', columns: ['Clean (Easy)', 'Randomized (Hard)'], keys: ['clean', 'randomized'], units: ['%', '%'], sourceType: 'published_context', citation: 'Fast-ThinkAct (Huang et al., 2026).' },
  { id: 'recover', label: 'tab:recover', number: '3', page: 8, title: 'LIBERO-RECOVER · recovery levels', context: 'Each level equally weights Spatial, Object, Goal and LIBERO-100. L1: action retry; L2: action adaptation; L3: object-state recovery; L4: environment-state recovery. These four columns do not average to the overall recovery statistic used in the controlled experiments.', columns: ['L1', 'L2', 'L3', 'L4'], keys: ['l1', 'l2', 'l3', 'l4'], units: ['%', '%', '%', '%'], sourceType: 'published_context', citation: 'LIBERO-RECOVER (Liu et al., 2026).' },
  { id: 'components', label: 'tab:component_ablation', number: '4', page: 8, title: 'Controlled component ablations', context: 'Measured means from this work. Controlled implementations use matched initialization, splits, training trajectories, observation access and execution intervals. Recovery first pools instances within each suite, then equally averages the four suites. N/A denotes the absence of a latent-stage verification interface.', columns: ['LIBERO avg.', 'LIBERO Long', 'Recovery', 'Stage F1'], keys: ['average', 'long', 'recovery', 'f1'], units: ['%', '%', '%', '%'], sourceType: 'controlled', rowIds: ['base', 'auxiliary', 'no-alignment', 'no-repair', 'complete'] },
  { id: 'repair', label: 'tab:repair_strategies', number: '5', page: 9, title: 'Measured repair strategies', context: 'Same recovery instances, step limits and task-level budget. Mean complete-episode inference time includes all model calls and both successful and failed episodes. Shared visual encoding is counted once. p95 is observation-to-executable-action latency. Regenerated vectors count deviation-triggered repairs only, excluding ordinary rolling extensions.', columns: ['Recovery', 'Time / episode', 'p95 latency', 'Vectors / episode'], keys: ['recovery', 'time', 'latency', 'vectors'], units: ['%', 's', 'ms', 'vectors'], sourceType: 'controlled', rowIds: ['disabled', 'full', 'current', 'local'] },
  { id: 'augmentation', label: 'tab:recover_ablation', number: '6', page: 9, title: 'Recovery data and observation history', context: 'Each augmentation is independently compared with the original configuration. Recovery instances are pooled within each suite before equally averaging the four suites. Recovery-data and initial-frame gains cannot be added to predict a joint result.', columns: ['Original', '+ Recovery data', '+ Initial frame'], keys: ['original', 'recoveryData', 'initialFrame'], units: ['%', '%', '%'], sourceType: 'published_context', citation: 'Published baselines: LIBERO-RECOVER (Liu et al., 2026).' }
];

const readableName = (name) => name.replaceAll('$\\pi_0$', 'π₀').replaceAll('$', '').replaceAll('Ours', 'VLCoT');
const readRows = (source, config) => {
  const section = source.split(`\\label{${config.label}}`)[1];
  if (!section) throw new Error(`Missing source table: ${config.label}`);
  const body = section.split('\\midrule')[1].split('\\bottomrule')[0];
  return body.split(/\r?\n/).filter((line) => line.includes('&')).map((line, index) => {
    const cells = line.trim().replace(/\\\\\s*$/, '').split('&').map((cell) => cell.trim());
    const name = readableName(cells[0]);
    const values = cells.slice(config.hasSource ? 2 : 1).map((value) => value === 'N/A' ? null : Number(value));
    if (values.length !== config.keys.length || values.some((value) => value !== null && !Number.isFinite(value))) throw new Error(`Invalid row in ${config.label}: ${line}`);
    return { id: config.rowIds?.[index] ?? (name === 'VLCoT' ? 'vlcot' : name.toLowerCase().replaceAll('π₀', 'pi0').replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')), name, source: config.hasSource ? cells[1] : (config.sourceType === 'controlled' || name === 'VLCoT' ? 'This work' : config.citation), values: Object.fromEntries(config.keys.map((key, column) => [key, values[column]])) };
  });
};

let results;
if (sourceAvailable) {
  const source = await readFile(sourcePath, 'utf8');
  const sourceBytes = await readFile(sourcePath);
  const pdfBytes = await readFile(path.join(root, 'paper/vlcot_iclr_en.pdf'));
  const tables = Object.fromEntries(tableConfigs.map(({ rowIds, ...config }) => [config.id, { ...config, rows: readRows(source, { ...config, rowIds }) }]));
  const repair = Object.fromEntries(tables.repair.rows.map((row) => [row.id, row.values]));
  const derived = {
    timeReduction: { value: (repair.full.time - repair.local.time) / repair.full.time * 100, unit: '%', formula: '(18.6 - 14.9) / 18.6 * 100', source: 'repair.full.time, repair.local.time', meaning: 'Lower mean complete-episode inference time relative to full replanning.' },
    recoveryGain: { value: repair.local.recovery - repair.disabled.recovery, unit: 'pp', formula: '26.0 - 22.8', source: 'repair.local.recovery, repair.disabled.recovery', meaning: 'Recovery increase relative to repair disabled.' },
    recoveryGap: { value: repair.full.recovery - repair.local.recovery, unit: 'pp', formula: '26.4 - 26.0', source: 'repair.full.recovery, repair.local.recovery', meaning: 'Recovery of local repair is lower than full replanning by this amount.' },
    latencyReduction: { value: (repair.full.latency - repair.local.latency) / repair.full.latency * 100, unit: '%', formula: '(820 - 430) / 820 * 100', source: 'repair.full.latency, repair.local.latency', meaning: 'Lower p95 decision latency relative to full replanning.' },
    vectorReduction: { value: (repair.full.vectors - repair.local.vectors) / repair.full.vectors * 100, unit: '%', formula: '(62.4 - 31.2) / 62.4 * 100', source: 'repair.full.vectors, repair.local.vectors', meaning: 'Fewer mean regenerated latent vectors relative to full replanning.' }
  };
  results = { schemaVersion: 1, updated: '2026-09-27', source: { manuscript: 'Author-supplied English LaTeX, September 27, 2026', sha256: hash(sourceBytes), pdfSha256: hash(pdfBytes), pdfDate: paper.pdfDate, pdfPages: paper.pdfPages, tableRows: 45, numericCells: 162, verification: 'All numeric cells checked against the supplied PDF on September 27, 2026; Chinese-source numeric cells also agree.' }, reporting: { seeds: 'Three independent seeds for configurations requiring retraining; seed identifiers and per-seed values are not supplied.', uncertainty: 'Tables report measured means without standard deviations or confidence intervals. No statistical-significance claim is supported.', scope: 'Simulation evaluation only. Real-robot transfer is not established.', budget: 'One reported evaluation setting; no continuous budget sweep or equal-success comparison.', hardware: 'Matched across repair strategies according to the manuscript; a concrete hardware specification and run-level timings are not supplied.', rawRecords: 'No episode-level experiment records are included in the supplied materials.' }, references: { A: { name: 'OpenVLA-OFT', citation: 'Kim et al., 2025', url: 'https://arxiv.org/abs/2502.19645v2' }, B: { name: 'Fast-ThinkAct', citation: 'Huang et al., 2026', url: 'https://arxiv.org/abs/2601.09708v2' }, C: { name: 'LaRA-VLA', citation: 'Bai et al., 2026', url: 'https://arxiv.org/abs/2602.01166v2' }, robotwin: { name: 'RoboTwin 2.0', citation: 'Chen et al., 2025', url: 'https://arxiv.org/abs/2506.18088v2' }, recover: { name: 'LIBERO-RECOVER', citation: 'Liu et al., 2026', url: 'https://arxiv.org/abs/2609.05178v2' } }, tables, derived };
  await mkdir(path.join(assets, 'paper'), { recursive: true });
  await mkdir(path.join(assets, 'figures'), { recursive: true });
  await writeFile(path.join(assets, 'data/results.json'), JSON.stringify(results, null, 2) + '\n');
  await copyFile(path.join(root, 'paper/vlcot_iclr_en.pdf'), path.join(assets, 'paper/vlcot-paper.pdf'));
  for (const name of ['vlcot_architecture', 'vlcot_libero_heatmap', 'vlcot_repair_pareto']) {
    for (const extension of ['svg', 'pdf']) await copyFile(path.join(root, `paper/${name}.${extension}`), path.join(assets, `figures/${name}.${extension}`));
  }
  const figureLedger = JSON.parse(await readFile(path.join(root, 'paper/figure_checks/validation.json'), 'utf8'));
  if (figureLedger.source_sha256 !== results.source.sha256) throw new Error('Figure ledger does not match the current manuscript.');
  delete figureLedger.source;
  figureLedger.source_description = 'Author-supplied English LaTeX; table identifiers and the SHA-256 hash provide the source mapping. Manuscript source is not part of this release.';
  await writeFile(path.join(assets, 'data/figure-provenance.json'), JSON.stringify(figureLedger, null, 2) + '\n');
} else {
  results = JSON.parse(await readFile(path.join(assets, 'data/results.json'), 'utf8'));
}

const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const formatValue = (value, key) => value === null ? 'N/A' : (key === 'latency' ? String(value) : value.toFixed(1));
const renderTable = (table) => `<div class="table-scroll" role="region" tabindex="0" aria-label="${escapeHtml(table.title)}"><table><caption>${escapeHtml(table.title)}. ${escapeHtml(table.columns.map((column, index) => `${column}: ${table.units[index]}`).join('; '))}.</caption><thead><tr><th scope="col">${table.id === 'components' ? 'Configuration' : 'Method'}</th>${table.hasSource ? '<th scope="col">Source</th>' : ''}${table.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${table.rows.map((row) => `<tr${['vlcot', 'complete', 'local'].includes(row.id) ? ' class="our-row"' : ''}><th scope="row">${escapeHtml(row.name)}</th>${table.hasSource ? `<td>${escapeHtml(row.source)}</td>` : ''}${table.keys.map((key) => `<td>${formatValue(row.values[key], key)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="table-note">${escapeHtml(table.context)} ${table.citation ? escapeHtml(table.citation) + ' ' : ''}<a href="${paper.pdf}#page=${table.page}">Table ${table.number} · PDF p. ${table.page} ↗</a></p>`;
const authorMarkup = `<p class="authors">${paper.authors.map((author) => `<span>${escapeHtml(author.name)}<sup>${author.affiliation}${author.coAuthor ? ',*' : ''}${author.corresponding ? ',†' : ''}</sup></span>`).join(' ')}</p><div class="affiliations">${paper.affiliations.map((affiliation) => `<span><sup>${affiliation.id}</sup> ${escapeHtml(affiliation.name)}</span>`).join('')}</div><p class="author-notes">${escapeHtml(paper.authorNotes)}</p>`;
const bibtex = `@inproceedings{qiang2026vlcot,\n  title = {${paper.title}},\n  author = {${paper.authors.map((author) => author.name).join(' and ')}},\n  booktitle = {International Conference on Machine Learning},\n  year = {${paper.year}},\n  note = {Accepted; author-supplied manuscript},\n  url = {${paper.siteUrl}}\n}`;
await writeFile(path.join(assets, 'paper/vlcot.bib'), bibtex + '\n');
const htmlPath = path.join(root, 'index.html');
if (await access(htmlPath).then(() => true, () => false)) {
  let html = await readFile(htmlPath, 'utf8');
  const replaceRegion = (name, content) => {
    const expression = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
    if (!expression.test(html)) throw new Error(`Missing generated region: ${name}`);
    html = html.replace(expression, (_, start, end) => `${start}\n${content}\n${end}`);
  };
  replaceRegion('authors', authorMarkup);
  for (const table of Object.values(results.tables)) replaceRegion(`table:${table.id}`, renderTable(table));
  replaceRegion('bibtex', escapeHtml(bibtex));
  replaceRegion('version', `<p>${escapeHtml(paper.versionNote)}</p>`);
  replaceRegion('data', `<script id="paper-data" type="application/json">${JSON.stringify({ paper, results }).replaceAll('<', '\\u003c')}</script>`);
  const headlineValues = { libero: results.tables.libero.rows.find((row) => row.id === 'vlcot').values.average, recovery: results.derived.recoveryGain.value, time: results.derived.timeReduction.value, gap: results.derived.recoveryGap.value };
  html = html.replace(/(<span data-number="([a-z]+)">)[\s\S]*?(<\/span>)/g, (_, start, key, end) => {
    if (!(key in headlineValues)) throw new Error(`Unknown numeric binding: ${key}`);
    return `${start}${headlineValues[key].toFixed(1)}${end}`;
  });
  await writeFile(htmlPath, html);
}
console.log(`Prepared ${Object.keys(results.tables).length} tables, ${results.source.tableRows} rows and ${results.source.numericCells} numeric cells. Manuscript source files are not published.`);
