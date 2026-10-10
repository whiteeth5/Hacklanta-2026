# HomeBridge

A housing stability and reintegration platform for people returning home after incarceration who live in halfway houses or transitional housing. Built for Hacklanta.

HomeBridge helps residents keep their living space safe, understand what independent living will cost, find reentry resources, and plan their move to their own place, with dignity, privacy and resident control built in.

## Try it

Open `dist/index.html` in any modern browser. No install, no server, no API keys. Data is saved in the browser.

**3-minute demo path**
1. **Dashboard → Simulate a water leak.** The Impact Engine walks through seven steps: detected, located on the HomeTwin, what it means (and doesn't), estimated cost (drag the "if no one fixes it" slider), auto-created maintenance report, staff notified, matched resources.
2. **HomeTwin.** Click or tab through rooms. Room 3 stays private to everyone; your room is private to you.
3. **Switch to Staff** (top right). Staff see shared areas and repairs, and can update a report's status, but never the resident's budget, pathway or bedroom readings.
4. **Living Simulator.** Try "Share with a roommate" or change the hourly wage and watch the budget, donut chart and move-in timeline update live.
5. **Settings.** Pick any of six palettes (Ocean Blue, Forest Green, Warm Neutral, Lavender, Sunset, High Contrast), switch light/dark, change text size. Choices persist.
6. **Settings → Reset demo** to start over.

## Features

| Area | What it does |
| --- | --- |
| Interactive dashboard | Housing status, alerts, repairs, living expenses, recommended next steps, resources |
| HomeTwin | Clickable, keyboard-accessible floor plan with simulated temperature, humidity, air-quality and leak sensors |
| Reintegration Impact Engine | Turns a simulated event into a located alert, explanation, cost estimate with assumptions, maintenance report, staff notification and resources |
| Independent Living Simulator | Income (hourly or monthly), 11 expense categories including court/supervision fees, housing presets, move-in costs, what-ifs, donut chart, savings projection |
| Maintenance | Resident reports vs. sensor alerts always labeled separately; notes, photos, timestamped timeline, staff status updates, resident confirmation |
| Resource Navigator | Housing, employment, food, transportation, ID documents, utilities, legal, health; search, filters, bookmarks, eligibility notes |
| Community | Demo listings of free meals, activities, classes, support groups and job events; filter, mark “going”, add to calendar |
| Calendar | Month view and next-30-days list; add, edit and delete appointments, court dates, shifts, viewings and deadlines; private to the resident |
| Document Helper | Paste, upload (.txt, or a photo on claude.ai) or pick a sample; explains what the document is, what it’s for, key dates (add to calendar), next steps and questions to ask. On claude.ai it asks Claude using the viewer’s own account; elsewhere a built-in reader runs on the device |
| Pathway | Optional checklist the resident controls: check off, add, hide steps; optional count-only sharing |
| Appearance | Six palettes × light/dark, text size, reduced motion |

## Privacy rules

- **Private to the resident:** their bedroom readings, budget, pathway, bookmarks. A bedroom alert reaches staff only if the resident taps "Share with staff".
- **Building-level (staff):** shared rooms, staff office, repair reports.
- **Never shown:** other residents' rooms.
- No facial recognition, location tracking, behavioral scoring or risk ratings exist in the code.

## Stack

React + TypeScript (strict), Tailwind CSS 3.4 (standalone CLI), Lucide icons (generated from the Lucide SVGs), charts built on d3-scale / d3-shape, bundled by esbuild into one self-contained HTML file. Recharts couldn't be installed in the build environment, so charts are small custom SVG components, each with a text summary and a data table.

```
npm run build                               # dist/index.html, dist/homebridge.html
node --import tsx --test tests/*.test.ts    # unit tests: budget math, impact model, privacy rules, document reader
node tests/e2e.mjs dist/index.html shots    # 35 browser checks (Playwright)
```

## Limitations

- **All sensor readings and events are simulated.** No hardware is connected; readings are never diagnoses.
- Repair cost ranges are illustrative ballparks, not quotes. Water is priced at $0.012/gallon as a stated assumption.
- Housing presets and most resources are demo data. The four real national services (211, SSA card replacement, LIHEAP, Lifeline) link to official pages; local availability isn't verified.
- One resident and one house in the demo; no accounts, sync or real staff notifications.
- Community events are invented demo listings. The Document Helper is a plain-language guide, not legal advice; the offline built-in reader recognizes common document types by keywords only, and PDFs must be pasted as text.
- Data lives in one browser only.
- Accessibility follows WCAG 2.2 AA practices but hasn't had a formal audit.
