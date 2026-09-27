(() => {
  'use strict';

  const { results } = JSON.parse(document.getElementById('paper-data').textContent);
  const byId = (id) => document.getElementById(id);
  const all = (selector) => [...document.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const fixed = (value) => value.toFixed(1);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reducedMotion.matches;
  let playing = false;
  let scenarioVisible = false;
  let scenarioTimer;
  let scenario = 'grasp';
  let phase = 0;
  let benchmark = 'libero';
  const phaseNames = ['Observe', 'Verify', 'Update'];
  const stageNames = ['Open drawer', 'Grasp cube', 'Place in tray'];
  const scenarios = {
    complete: {
      kicker: 'Supported completion', title: 'Evidence lets the plan move forward.',
      descriptions: ['The observation estimator finds the cube held by the gripper. The grasp is the current stage.', 'Valid consecutive observations support the expected grasp endpoint. Completion can now be confirmed.', 'Record the grasp as verified and advance to placement. No deviation-triggered suffix repair is needed.'],
      states: [['retained', 'active', ''], ['retained', 'retained', ''], ['retained', 'retained', 'active']],
      labels: [['Verified history', 'Observing grasp', 'Planned'], ['Still valid', 'Completion supported', 'Planned'], ['Retained prefix', 'Newly verified', 'Advance here']]
    },
    grasp: {
      kicker: 'Persistent deviation', title: 'A local error, a local update.',
      descriptions: ['The cube was not secured. The drawer remains open and accessible; the grasp is the current stage.', 'Reliable evidence supports a persistent grasp deviation. The still-required drawer prerequisite remains valid.', 'Retain the valid opening stage. Repair starts at stage 2 and rebuilds grasping and placement in the latent plan.'],
      states: [['retained', 'active', ''], ['retained', 'repair', ''], ['retained', 'repair', 'repair']],
      labels: [['Verified history', 'Observing grasp', 'Planned'], ['Prerequisite valid', 'Deviation confirmed', 'Depends on grasp'], ['Retained prefix', 'Repair starts here', 'Rebuilt suffix']]
    },
    prerequisite: {
      kicker: 'Earlier dependency invalidated', title: 'Repair follows what still depends on it.',
      descriptions: ['The grasp has deviated and the drawer is no longer accessible. Retrieval still requires an accessible drawer.', 'Reliable observations contradict the opening prerequisite. The earliest affected dependency is before the current grasp.', 'Repair starts at stage 1. The opening, grasping and placement stages are rebuilt because their dependencies are affected.'],
      states: [['unconfirmed', 'active', ''], ['repair', 'repair', ''], ['repair', 'repair', 'repair']],
      labels: [['Condition changed', 'Observing grasp', 'Planned'], ['Prerequisite lost', 'Deviation confirmed', 'Depends on prefix'], ['Repair starts here', 'Rebuilt suffix', 'Rebuilt suffix']]
    },
    uncertain: {
      kicker: 'Insufficient evidence', title: 'Uncertainty is not a verdict.',
      descriptions: ['The relation needed to establish the grasp is occluded. The observation does not establish completion or deviation.', 'The validity gate does not support a confident decision. Missing evidence is not itself proof that the grasp failed.', 'Keep the current stage unconfirmed. Do not advance or trigger repair solely from insufficient evidence.'],
      states: [['retained', 'unconfirmed', ''], ['retained', 'unconfirmed', ''], ['retained', 'unconfirmed', '']],
      labels: [['Verified history', 'Occluded relation', 'Planned'], ['Retained history', 'Evidence insufficient', 'Not advanced'], ['Retained history', 'Still unconfirmed', 'No repair triggered']]
    }
  };

  function renderScenario() {
    const current = scenarios[scenario];
    byId('scenario-kicker').textContent = current.kicker;
    byId('scenario-title').textContent = current.title;
    byId('phase-label').textContent = `0${phase + 1} / ${phaseNames[phase]}`;
    byId('scenario-description').textContent = current.descriptions[phase];
    byId('scenario-chain').innerHTML = stageNames.map((name, index) => {
      const state = current.states[phase][index];
      const symbol = { retained: '✓', repair: '↻', unconfirmed: '?', active: '→' }[state] || '·';
      return `<div class="latent-stage ${state}"><div class="latent-top"><span>0${index + 1}</span><span aria-hidden="true">${symbol}</span></div><strong>${name}</strong><div class="latent-vectors" aria-hidden="true"><i></i><i></i><i></i><i></i></div><small>${current.labels[phase][index]}</small></div>`;
    }).join('');
    all('[data-scenario]').forEach((button) => {
      const selected = button.dataset.scenario === scenario;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    });
    all('[data-phase]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.phase) === phase)));
    byId('scenario-next').setAttribute('aria-label', phase === 2 ? 'Replay demonstration from the first step' : 'Next demonstration step');
  }

  function syncPlayback() {
    clearTimeout(scenarioTimer);
    const paused = motionPaused || reducedMotion.matches || document.hidden;
    document.documentElement.classList.toggle('motion-paused', paused);
    all('[data-motion-toggle]').forEach((button) => {
      const label = paused ? 'Resume animations' : 'Pause animations';
      button.setAttribute('aria-label', label);
      button.title = reducedMotion.matches ? 'Animations paused by reduced-motion preference' : label;
      button.disabled = reducedMotion.matches;
      button.querySelector('use').setAttribute('href', paused ? '#icon-play' : '#icon-pause');
    });
    const running = playing && !paused && scenarioVisible;
    byId('scenario-play').querySelector('span').textContent = playing ? 'Pause' : (phase === 2 ? 'Replay' : 'Play');
    byId('scenario-play').querySelector('use').setAttribute('href', playing ? '#icon-pause' : '#icon-play');
    byId('scenario-play').disabled = reducedMotion.matches || motionPaused;
    byId('scenario-play').title = byId('scenario-play').disabled ? 'Use the step controls while animations are paused' : '';
    if (running) scenarioTimer = setTimeout(() => {
      if (phase < 2) phase += 1;
      if (phase === 2) playing = false;
      renderScenario();
      syncPlayback();
    }, 2300);
  }

  all('[data-scenario]').forEach((button) => button.addEventListener('click', () => {
    scenario = button.dataset.scenario;
    phase = 0;
    playing = false;
    renderScenario();
    syncPlayback();
  }));
  all('[data-phase]').forEach((button) => button.addEventListener('click', () => {
    phase = Number(button.dataset.phase);
    playing = false;
    renderScenario();
    syncPlayback();
  }));
  byId('scenario-next').addEventListener('click', () => {
    phase = (phase + 1) % 3;
    playing = false;
    renderScenario();
    syncPlayback();
  });
  byId('scenario-restart').addEventListener('click', () => {
    phase = 0;
    playing = false;
    renderScenario();
    syncPlayback();
  });
  byId('scenario-play').addEventListener('click', () => {
    playing = !playing;
    if (playing && phase === 2) phase = 0;
    renderScenario();
    syncPlayback();
  });
  all('[data-motion-toggle]').forEach((button) => button.addEventListener('click', () => {
    motionPaused = !motionPaused;
    syncPlayback();
  }));
  reducedMotion.addEventListener('change', () => {
    motionPaused = reducedMotion.matches;
    playing = false;
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);

  const repairRows = results.tables.repair.rows;
  const repairNotes = {
    disabled: 'The verifier remains active, but deviation-triggered latent repair is disabled. Zero regenerated repair vectors does not mean zero inference.',
    full: 'Rebuild the complete latent plan after a deviation. This does not mean repeating already completed physical actions.',
    current: 'Rebuild from the current stage without revisiting earlier invalidated prerequisites.',
    local: 'Retain the valid prefix and regenerate from the earliest affected still-required dependency.'
  };
  const pointNames = { disabled: 'Repair disabled', current: 'Current-stage-only', local: 'Local repair', full: 'Full replanning' };
  const compactPlot = window.matchMedia('(max-width: 540px)');
  function renderRepairPlot() {
    const compact = compactPlot.matches;
    const left = compact ? 34 : 64;
    const right = compact ? 332 : 554;
    const bottom = compact ? 257 : 330;
    const plotX = (value) => left + (value - 11) / 9 * (right - left);
    const plotY = (value) => bottom - (value - 22) / 5 * (compact ? 210 : 275);
    byId('repair-chart').innerHTML = `<svg viewBox="0 0 ${compact ? '360 323' : '610 403'}" role="group" aria-labelledby="repair-plot-title repair-plot-desc"><title id="repair-plot-title">Four measured recovery–time trade-offs</title><desc id="repair-plot-desc">Select a point or use the strategy menu. Time axis: 11 to 20 seconds per episode. Recovery axis: 22 to 27 percent, a detail range. No interpolation.</desc>${[22, 23, 24, 25, 26, 27].map((value) => `<line class="chart-grid" x1="${left}" x2="${right}" y1="${plotY(value)}" y2="${plotY(value)}"/><text class="chart-tick" x="${left - 12}" y="${plotY(value) + 4}" text-anchor="end">${value}</text>`).join('')}${[12, 14, 16, 18, 20].map((value) => `<text class="chart-tick" x="${plotX(value)}" y="${bottom + 22}" text-anchor="middle">${value}</text>`).join('')}<text class="chart-axis-label" x="${left}" y="23">Recovery (%) · detail range</text><text class="chart-axis-label" x="${(left + right) / 2}" y="${bottom + 54}" text-anchor="middle">${compact ? 'Inference time (s / episode)' : 'Mean inference time (s / complete episode)'}</text>${repairRows.map((row) => {
    const value = row.values;
    const below = row.id === 'current';
    const anchor = row.id === 'full' ? 'end' : 'start';
    const labelX = row.id === 'full' ? -12 : 13;
    const pointLabel = compact ? { disabled: 'Disabled', current: 'Current only', local: 'Local repair', full: 'Full replan' }[row.id] : pointNames[row.id];
    return `<g class="chart-dot" data-strategy="${row.id}" transform="translate(${plotX(value.time)},${plotY(value.recovery)})" tabindex="0" role="button" aria-pressed="false" aria-label="${escapeHtml(row.name)}: ${fixed(value.recovery)}% recovery, ${fixed(value.time)} seconds per episode"><circle r="19" fill="transparent"/><circle class="point-halo" r="14" stroke="${row.id === 'local' ? '#a85949' : '#496a82'}"/><circle r="6" fill="${row.id === 'local' ? '#a85949' : '#496a82'}"/><text class="chart-point-label" x="${compact && row.id === 'local' ? -12 : labelX}" y="${compact ? (below ? 25 : -16) : (below ? 24 : -15)}" text-anchor="${compact && row.id === 'local' ? 'end' : anchor}">${pointLabel}</text>${compact ? '' : `<text class="chart-point-value" x="${labelX}" y="${below ? 42 : 3}" text-anchor="${anchor}">${fixed(value.recovery)}% · ${fixed(value.time)} s</text>`}</g>`;
  }).join('')}</svg>`;
  }

  function renderStrategy() {
    const selected = byId('strategy-select').value;
    const value = repairRows.find((row) => row.id === selected).values;
    const metrics = [[fixed(value.recovery), '%', 'Overall recovery'], [fixed(value.time), 's', 'Inference / episode'], [value.latency, 'ms', 'p95 decision latency'], [fixed(value.vectors), '', 'Repair vectors / episode']];
    byId('strategy-values').innerHTML = metrics.map(([number, unit, label]) => `<div><strong>${number}<span>${unit}</span></strong><span>${label}</span></div>`).join('');
    const local = repairRows.find((row) => row.id === 'local').values;
    const full = repairRows.find((row) => row.id === 'full').values;
    const comparisons = {
      local: `<strong>${fixed(results.derived.timeReduction.value)}% less inference time</strong> than full replanning, with ${fixed(results.derived.recoveryGap.value)} percentage points lower recovery.`,
      full: `Highest measured recovery: <strong>${fixed(full.recovery)}%</strong>. It uses ${fixed(full.time - local.time)} more seconds per episode than local repair.`,
      current: `Compared with local repair: <strong>${fixed(local.time - value.time)} s less time</strong>, with ${fixed(local.recovery - value.recovery)} percentage points lower recovery.`,
      disabled: `Local repair improves recovery by <strong>${fixed(results.derived.recoveryGain.value)} percentage points</strong>, at ${fixed(local.time - value.time)} additional seconds per episode.`
    };
    byId('strategy-comparison').innerHTML = comparisons[selected];
    byId('strategy-description').textContent = repairNotes[selected];
    all('[data-strategy]').forEach((point) => {
      point.classList.toggle('is-selected', point.dataset.strategy === selected);
      point.setAttribute('aria-pressed', String(point.dataset.strategy === selected));
    });
  }
  byId('strategy-select').addEventListener('change', renderStrategy);
  function selectPoint(event) {
    const point = event.target.closest('[data-strategy]');
    if (!point) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    byId('strategy-select').value = point.dataset.strategy;
    renderStrategy();
  }
  byId('repair-chart').addEventListener('click', selectPoint);
  byId('repair-chart').addEventListener('keydown', selectPoint);
  compactPlot.addEventListener('change', () => { renderRepairPlot(); renderStrategy(); });

  function bars(rows, key, showSources = false) {
    return rows.map((row) => {
      const value = row.values[key];
      const ours = ['vlcot', 'complete'].includes(row.id);
      const source = showSources && ['A', 'B', 'C'].includes(row.source) ? `<span class="source-mark">[${row.source}]</span>` : '';
      return `<div class="bar-row${ours ? ' ours' : ''}${value === null ? ' unavailable' : ''}"><span class="bar-name">${escapeHtml(row.name)}${source}</span><span class="bar-track" aria-hidden="true">${value === null ? '' : `<span class="bar-fill" style="--bar-width:${value}%"></span>`}</span><span class="bar-value">${value === null ? 'N/A' : fixed(value)}</span></div>`;
    }).join('') + '<div class="bar-axis" aria-hidden="true"><div><span>0</span><span>50</span><span>100%</span></div></div>';
  }
  const takeaways = {
    libero: 'Average is the equally weighted mean of four suite scores. The small gap between the top reported averages is not evidence of statistical significance.',
    robotwin50: 'Clean and randomized conditions evaluate different environment distributions. The randomized result remains substantially below clean performance.',
    robotwin10: 'A separate ten-task reference protocol. These results are not interchangeable with the 50-task benchmark.',
    recover: 'Higher recovery levels require broader changes to execution. Environment-state recovery remains difficult. Do not average these levels to recover the overall controlled statistic.'
  };
  function renderBenchmark(resetMetric = false) {
    const table = results.tables[benchmark];
    const select = byId('benchmark-metric');
    if (resetMetric) {
      select.innerHTML = table.keys.map((key, index) => `<option value="${key}">${table.columns[index]}</option>`).join('');
      select.value = benchmark === 'libero' ? 'average' : table.keys[0];
    }
    const key = select.value;
    const row = table.rows.find((item) => item.id === 'vlcot');
    const sorted = [...table.rows].sort((first, second) => second.values[key] - first.values[key]);
    byId('benchmark-name').textContent = table.title;
    byId('benchmark-name').nextElementSibling.textContent = `Reported means · ${benchmark === 'recover' ? 'recovery' : 'success'} (%) · bars start at zero`;
    byId('benchmark-chart').innerHTML = bars(sorted, key, true);
    byId('benchmark-chart').setAttribute('aria-label', `${table.title}, ${table.columns[table.keys.indexOf(key)]}, percent`);
    byId('benchmark-highlight').innerHTML = `${fixed(row.values[key])}<span>%</span>`;
    byId('benchmark-highlight-label').textContent = `${table.columns[table.keys.indexOf(key)]} ${benchmark === 'recover' ? 'recovery' : 'success'}`;
    byId('benchmark-takeaway').textContent = takeaways[benchmark];
    byId('benchmark-suite-cells').innerHTML = table.keys.filter((item) => item !== 'average').map((item) => `<div class="suite-cell"><small>${table.columns[table.keys.indexOf(item)]}</small><strong>${fixed(row.values[item])}%</strong></div>`).join('');
    byId('benchmark-source').textContent = `Table ${table.number} · PDF p. ${table.page}. ${table.citation} ${table.context}`;
    byId('benchmark-panel').setAttribute('aria-labelledby', `tab-${benchmark}`);
    all('[data-benchmark]').forEach((button) => {
      const selected = button.dataset.benchmark === benchmark;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
  }
  const benchmarkButtons = all('[data-benchmark]');
  benchmarkButtons.forEach((button, index) => {
    button.addEventListener('click', () => { benchmark = button.dataset.benchmark; renderBenchmark(true); });
    button.addEventListener('keydown', (event) => {
      const positions = { ArrowRight: (index + 1) % benchmarkButtons.length, ArrowLeft: (index + benchmarkButtons.length - 1) % benchmarkButtons.length, Home: 0, End: benchmarkButtons.length - 1 };
      if (!(event.key in positions)) return;
      event.preventDefault();
      const target = benchmarkButtons[positions[event.key]];
      benchmark = target.dataset.benchmark;
      renderBenchmark(true);
      target.focus();
    });
  });
  byId('benchmark-metric').addEventListener('change', () => renderBenchmark());
  const ablationExplanations = {
    recovery: 'The complete system combines stage semantics and repair. The no-repair configuration retains the verifier but does not act on deviations. These are controlled component ablations, separate from published baseline scores.',
    f1: 'N/A means that no latent-stage verification interface exists; it is not zero. The no-repair and full configurations use the same verifier on the same static diagnostic inputs, so their reported F1 is identical.',
    average: 'The controlled base configuration is retrained under the matched protocol. Its score must not be substituted for a published baseline from the cross-paper comparison.',
    long: 'LIBERO Long probes long-horizon task completion. Reported mean differences do not establish statistical significance without per-run dispersion.'
  };
  function renderAblation() {
    const metric = byId('ablation-metric').value;
    byId('ablation-chart').innerHTML = bars(results.tables.components.rows, metric);
    byId('ablation-explanation').textContent = ablationExplanations[metric];
  }
  byId('ablation-metric').addEventListener('change', renderAblation);

  const dialog = byId('figure-dialog');
  const dialogImage = byId('dialog-image');
  let zoom = 1;
  let origin;
  const setZoom = (value) => {
    zoom = Math.min(4, Math.max(1, value));
    dialogImage.style.width = `${zoom * 100}%`;
    byId('zoom-out').disabled = zoom === 1;
    byId('zoom-in').disabled = zoom === 4;
    byId('zoom-fit').textContent = zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`;
  };
  all('[data-zoom]').forEach((link) => link.addEventListener('click', (event) => {
    if (!dialog.showModal || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    origin = link;
    dialogImage.src = link.href;
    dialogImage.alt = link.querySelector('img')?.alt || link.dataset.title;
    byId('figure-dialog-title').textContent = link.dataset.title;
    byId('figure-original').href = link.href;
    setZoom(1);
    dialog.showModal();
    document.body.classList.add('dialog-open');
    byId('figure-close').focus();
  }));
  byId('figure-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); origin?.focus(); });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
  byId('zoom-in').addEventListener('click', () => setZoom(zoom + 0.5));
  byId('zoom-out').addEventListener('click', () => setZoom(zoom - 0.5));
  byId('zoom-fit').addEventListener('click', () => setZoom(1));
  byId('copy-citation').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(byId('citation').textContent.trim());
      byId('copy-status').textContent = 'Citation copied to clipboard.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(byId('citation'));
      selection.removeAllRanges();
      selection.addRange(range);
      byId('copy-status').textContent = 'Citation selected. Press Ctrl+C (or ⌘C) to copy.';
    }
  });

  const menuToggle = document.querySelector('.menu-toggle');
  function closeMenu() {
    byId('navigation').classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }
  menuToggle.addEventListener('click', () => {
    const opened = byId('navigation').classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(opened));
    menuToggle.setAttribute('aria-label', opened ? 'Close navigation' : 'Open navigation');
  });
  all('#navigation a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') { closeMenu(); menuToggle.focus(); } });
  const navTargets = all('#navigation a[href^="#"]').map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }));
  let scrollPending = false;
  function updateScroll() {
    scrollPending = false;
    const distance = document.documentElement.scrollHeight - innerHeight;
    document.querySelector('.scroll-progress').style.transform = `scaleX(${distance > 0 ? scrollY / distance : 0})`;
    const current = navTargets.filter(({ section }) => section.getBoundingClientRect().top <= 150).at(-1);
    navTargets.forEach(({ link }) => { if (link === current?.link) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  }
  addEventListener('scroll', () => { if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  addEventListener('resize', updateScroll);

  renderScenario();
  renderRepairPlot();
  renderStrategy();
  renderBenchmark(true);
  renderAblation();
  all('[data-enhance]').forEach((element) => { element.hidden = false; });
  document.documentElement.classList.add('js');
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.remove('reveal-pending'); reveals.unobserve(entry.target); }
    }), { threshold: 0.06 });
    all('.reveal').forEach((element) => { if (!reducedMotion.matches && element.getBoundingClientRect().top > innerHeight) element.classList.add('reveal-pending'); reveals.observe(element); });
    const visibility = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('offscreen', !entry.isIntersecting);
        if (entry.target.id === 'scenario-workbench') scenarioVisible = entry.isIntersecting;
      });
      syncPlayback();
    }, { threshold: 0.05 });
    visibility.observe(document.querySelector('.hero-visual'));
    visibility.observe(byId('scenario-workbench'));
  } else scenarioVisible = true;
  syncPlayback();
  updateScroll();
})();
