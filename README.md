# VLCoT · ICML 2026

**Stage-Verifiable Latent Chain-of-Thought with Local Repair for Long-Horizon Robotic Manipulation**

Yirong Qiang*, Jiahe Zhang*, Ming Zhou, Yuxiu Pei, and Lianlei Shan†.

*Co-authors. †Corresponding author. Author names, affiliations and ICML 2026 acceptance were supplied by the authors.

- Project page: https://apromisedland.github.io/vlcot-paper-page/
- Website repository: https://github.com/apromisedland/vlcot-paper-page
- Research implementation: https://github.com/apromisedland/VLCoT

This repository contains the English paper project page, its original explanatory interactions, the author-supplied PDF and figures, and reported numerical summaries. It does **not** contain the research implementation, model weights, raw episode records, manuscript LaTeX or source ZIP.

The separate research repository implements the paper's model, training, verification, repair and evaluation interfaces, with documented engineering choices for unspecified details. Its initial release has not run training, inference, simulation, tests or CI. The results displayed on this website remain the manuscript's reported measurements, not reproduced results of that implementation.

## Preview and maintain

The published page requires no build, backend, CDN, package installation or API key. Open `index.html`, or use Node.js 20 or later for a local HTTP preview:

```sh
node scripts/serve.mjs
```

Visit `http://127.0.0.1:4173/vlcot-paper-page/`. The preview supports both the repository subpath and `/`, and serves only public assets. Set `PORT` in the process environment if that port is occupied.

Canonical inputs:

- `assets/data/paper.json`: identity, author order, full affiliations, availability and version disclosure.
- `assets/data/results.json`: seven tables, 45 rows, 162 numerical cells, metric definitions, provenance hashes and derived comparisons.
- `assets/data/figure-provenance.json`: the supplied figure validation ledger, with its local source path removed.
- `index.html`: editorial content and generated regions.
- `styles.css` / `script.js`: responsive presentation and progressive enhancement.

After changing a canonical input, run:

```sh
node scripts/prepare-assets.mjs
node scripts/verify.mjs
node --check script.js
```

The preparation script regenerates author markup, all complete HTML tables, headline numbers, BibTeX and the embedded interaction data. With the private `paper/vlcot_icml2026/vlcot_icml2026.tex` available locally, it extracts the tables again and copies the original public PDF/figures. In a public checkout without that private directory, it rebuilds from the checked-in JSON. Do not edit generated HTML regions by hand. Keep the source hashes and version notes aligned with any future manuscript update.

## Interactions and accessibility

- Four conceptual execution scenarios, with manual stepping, play, pause and replay.
- Four discrete measured repair strategies in a keyboard-operable scatter plot.
- Separate benchmark tabs and metric selectors; no invented intermediate measurements.
- Controlled ablation comparison, including explicit N/A verification scores.
- Native figure dialog with zoom, keyboard dismissal and focus return.
- Citation copy with manual-selection fallback.
- Reduced-motion support, animation pause, offscreen/background suspension and no-JavaScript reading via full static tables and figures.

## Scientific and version boundaries

The downloadable PDF is the author-supplied ICML 2026 accepted manuscript with named authors, dated September 27, 2026. Its 13 pages include references and appendices. The PDF is preserved byte-for-byte from `paper/vlcot_icml2026/vlcot_icml2026.pdf`; the preparation script uses this file for publication. All 162 table values agree with this PDF and its source, and the page uses the updated table numbers and PDF pages. Original figures come from the supplied manuscript materials.

Published benchmark references are descriptive cross-paper comparisons. Controlled ablations are separate. The two RoboTwin task sets are not interchangeable. Per-level recovery columns must not be averaged to reconstruct the overall recovery statistic. N/A is not zero. Recovery-data and initial-frame augmentations are independent conditions.

The reported 19.9% inference-time reduction compares local repair with full replanning, accompanied by 0.4 percentage points lower recovery. The 3.2 percentage-point recovery gain compares local repair with repair disabled. Inference seconds per complete episode, p95 observation-to-action latency and regenerated vector counts have different accounting definitions.

Evidence is limited to reported simulation evaluations. Retrained configurations use three seeds, but no seed-level values, standard deviations or confidence intervals were supplied. The site makes no significance or real-robot-transfer claim. Website checks do not reproduce the robotics experiments.

## Publication

GitHub Pages serves the `main` branch, repository root, over HTTPS. No custom domain or Actions-based build is needed. `publication.json` is the explicit file allowlist. `paper/`, `.qa/`, environments, caches and logs are ignored and must not be committed. Inspect `git diff --cached --stat` and `git diff --cached --name-only` before publishing.

After pushing, confirm the Pages build succeeds and check the live page and downloads; a successful push alone is not a successful deployment. Test at 1440, 1024, 390 and 320px, including keyboard interaction, reduced motion, no JavaScript, and repository-subpath links. Local screenshots and QA records belong in ignored `.qa/`.

## Rights and acknowledgements

See `THIRD_PARTY_NOTICES.md`. The visual reference is the DIWA project page. This repository does not assign a new license to the manuscript, figures, data or third-party research material.
