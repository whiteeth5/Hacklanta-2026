# Home Base: household budget

A free, private budget website for households. It tracks monthly bills, yearly bills, groceries (including SNAP), and subscriptions. It works on any phone with a browser, works offline, and can be installed to the home screen like an app.

There's no account and no server: each person's budget is saved only on their own device. A backup file lets people move their budget to a new phone.

## What's in the folder

```
home-base/
├── index.html            The page itself
├── css/styles.css        All the styling (colors are at the top)
├── js/storage.js         Saving, backup, and restore
├── js/app.js             Everything the app does (tabs, totals, editing)
├── service-worker.js     Makes it work offline
├── manifest.webmanifest  Lets phones install it as an app
├── _headers              Security settings (used by Netlify and Cloudflare Pages)
├── fonts/                Atkinson Hyperlegible, a font made for easy reading
└── icons/                App icons
```

There are no build tools or installs. What you see is what goes online.

## Try it on your computer

The offline features only work when the site is served by a web server, not when you double-click `index.html`. Any of these work:

- **VS Code:** install the "Live Server" extension, right-click `index.html`, and choose "Open with Live Server."
- **Python** (already on Mac and most Linux): open a terminal in this folder and run `python3 -m http.server 8000`, then visit http://localhost:8000
- **Node.js:** run `npx serve` in this folder.

## Put it online for free

### Option 1: Netlify Drop (easiest, about 2 minutes)
1. Go to https://app.netlify.com/drop
2. Drag the whole `home-base` folder onto the page.
3. You get a live link right away. Create a free account to keep it and pick a nicer name.

To update later, drag the folder onto your site's "Deploys" page in Netlify.

### Option 2: GitHub Pages
1. Create a free GitHub account and a new repository.
2. Upload all the files in this folder (keep the folder structure).
3. In the repository, go to **Settings → Pages**, set the source to the `main` branch, and save.
4. Your site appears at `https://your-username.github.io/repository-name/` within a few minutes.

GitHub Pages ignores the `_headers` file. The site still works fine.

### Option 3: Cloudflare Pages
Create a project at https://pages.cloudflare.com, choose "Direct Upload," and upload the folder. No build settings are needed.

### Using your own web address
All three hosts let you connect a domain (like `homebaseatl.org`) in their settings. Domains cost about $10–20 a year.

## Making changes

**Every time you change a file and put it online again, open `service-worker.js` and change the version** (`home-base-v1` → `home-base-v2`). Otherwise, people who already visited will keep seeing the old version. When the version changes, they'll see a "Refresh" button.

Some common changes:

- **Colors:** edit the values at the top of `css/styles.css`. There's a light set and a dark set.
- **Words and labels:** they're in the view functions in `js/app.js` (`vOverview`, `vMonthly`, and so on).
- **Bill types:** edit the `CATS` list near the top of `js/app.js`.
- **The example household:** edit the `demo()` function at the bottom of `js/app.js`.

## Privacy

Budgets never leave the person's device. The site loads no outside scripts, fonts, trackers, or analytics, and the security headers block them. If you add analytics later, choose a privacy-friendly option and update the "Your data" text in the app so people know.

## Ideas for next steps

- Bill prediction and a 30-day forecast
- A local help tab (Atlanta-area services, with 211 always visible)
- A housing information tab for renters and homeowners
- Spanish translation
- Optional accounts with sync across devices (only `js/storage.js` would need to change)
