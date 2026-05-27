# Open Data Knowledge Base
### Built Environment & Climate Research

**Curated by Bilge Kobas**  
Chair of Building Technology and Climate-Responsive Design  
Technical University of Munich

---

A searchable, filterable catalogue of 70+ open data sources for built environment and climate research. Designed for students and researchers at all levels — from complete beginners to experienced coders. Includes beginner-friendliness ratings, plain-language glossary tooltips, example research questions for each dataset, and a guided "Start Here" wizard.

**Live site:** https://bilgekobas.github.io/sourcebook/

---

## Contents

- [Getting Started (2-minute setup)](#getting-started)
- [Local Development](#local-development)
- [Adding New Entries](#adding-new-entries)
- [For Students — Contributing a Dataset](#for-students--contributing-a-dataset)
- [Features](#features)
- [How to Cite](#how-to-cite)
- [Licence](#licence)

---

## Getting Started

### Step 1 — Fork and clone

Click **Fork** at the top right of this page, then clone your fork:

```bash
git clone https://github.com/bilgekobas/sourcebook.git
cd sourcebook
```

### Step 2 — Update the two config values

**`vite.config.js`** — change `base` to match your repository name:
```js
base: '/sourcebook/',   // already correct
// or
base: '/',                // if this is your user site (username.github.io)
```

**`src/App.jsx`** — `REPO_URL` is already set correctly:
```js
const REPO_URL = "https://github.com/bilgekobas/sourcebook";
```

### Step 3 — Enable GitHub Pages

1. Push your changes: `git add . && git commit -m "configure" && git push`
2. In your repo on GitHub: **Settings → Pages → Source → GitHub Actions**
3. The site deploys automatically on every push to `main`
4. Find your live URL under **Settings → Pages** after the first deploy (~2 minutes)

### Step 4 — Share with students

Send students the live URL. No account or installation needed to use the site.

---

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Changes to any file reload instantly.

To build for production:
```bash
npm run build
npm run preview   # preview the built site locally
```

---

## Adding New Entries

All dataset entries live in **`src/data/entries.js`**. This is the only file you need to edit when adding or updating entries — no UI code to touch.

### Entry template

Copy this template, fill in all fields, and append it to the `SEED_ENTRIES` array:

```js
{
  id: "seed-71",                        // increment from the last entry
  name: "Dataset Name",
  description: "Plain-language description. What is it? Why is it useful?",
  url: "https://...",
  category: "Climate & Atmosphere",     // must match one of the CATEGORIES list
  topics: ["Topic 1", "Topic 2"],
  costModel: "free",                    // "free" | "freemium" | "paid"
  codingRequired: "optional",           // "none" | "optional" | "required"
  scale: ["Global"],                    // any of: Global, Continental, National, Regional, Local
  regions: ["Global"],
  temporalCoverage: "1940–present",
  temporalResolution: "Hourly",
  spatialResolution: "~31 km grid cells",
  formats: ["NetCDF", "CSV"],
  beginnerRating: 3,                    // 1 (expert only) → 5 (very easy)
  researchQuestions: [
    "Plain-language research question 1?",
    "Plain-language research question 2?",
  ],
  dateAdded: "2026-06-01",             // YYYY-MM-DD — entries within 60 days show a "New" badge
},
```

After editing, commit and push — the site redeploys automatically via GitHub Actions.

---

## For Students — Contributing a Dataset

You can suggest new entries directly from the live site:

1. Click **+ Contribute a Dataset**
2. Fill in the form
3. Click **↗ Submit to Official Catalogue**

This opens a pre-filled GitHub Issue. Your submission will be reviewed and — if it meets the quality bar — added to the main catalogue by the curator.

### Quality bar for submissions

- The dataset should be freely accessible (free or free-with-registration)
- It should be relevant to built environment or climate research
- It should not already be in the catalogue (check the search first)
- Description should be in plain language — imagine explaining it to a first-year student
- Include at least 2 example research questions
- Beginner rating should be honest

---

## Features

| Feature | Description |
|---|---|
| 70+ curated entries | Covers climate, urban morphology, building energy, land cover, air quality, hazards, soil, emissions, mobility, social vulnerability, and more |
| Beginner ratings | 1–5 bar showing how accessible each dataset is without prior experience |
| Jargon tooltips | Hover over any red-underlined term (NetCDF, Reanalysis, STAC API…) for a plain-English definition |
| Research questions | 2–3 example questions per entry to help students map their problem to a dataset |
| Start Here wizard | 3-step filter to match students with appropriate starting datasets |
| Filter & sort | Filter by category, cost, coding level, and scale; sort A–Z, by beginner rating, or by date |
| Export CSV | Download the full catalogue as a spreadsheet |
| Citation helper | One-click citation copy per entry |
| New badge | Entries added within the last 60 days are marked "New" |
| Contribute guide | Collapsible in-page guide explaining the contribution process |
| GitHub Issues submission | Student contributions open a pre-filled Issue for curator review |

---

## How to Cite

**Citing the knowledge base itself:**

> Kobas, B. (2026). Sourcebook — Open Data for Built Environment & Climate Research. Chair of Building Technology and Climate-Responsive Design, Technical University of Munich. Available at: https://bilgekobas.github.io/sourcebook/

**Citing an individual entry:**

Use the **Cite** button on any expanded entry — it copies a ready-to-paste citation to your clipboard.

---

## Project Structure

```
sourcebook/
├── .github/
│   └── workflows/
│       └── deploy.yml          GitHub Actions auto-deploy
├── src/
│   ├── data/
│   │   └── entries.js          ← all dataset entries live here
│   ├── App.jsx                 UI components and application logic
│   └── main.jsx                React entry point
├── index.html                  HTML shell with font imports
├── package.json
├── vite.config.js              ← set base to your repo name
└── README.md
```

---

## Licence

Dataset descriptions are original prose written for this resource and are shared under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The underlying datasets are subject to their own licences — check each source before use in publications.

Application source code is MIT licensed.
