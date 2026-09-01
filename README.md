# Wise Translations

This repo has two related pieces:

1. **`public-site/`** — a static, client-side catalog (search/browse only) meant for
   **GitHub Pages**. No backend, no server. This is what visitors see.
2. **The Next.js app** (`src/`) — the original dynamic app with a submit form and an
   admin review queue. GitHub Pages can't run this (it needs a server), but it's useful
   to run locally/on a real host if you want live submissions with a review flow instead
   of an external form.

See [`public-site/README` section below](#static-catalog--github-pages) for the Pages workflow.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- SQLite (via `better-sqlite3`) for metadata — stored at `data/translations.db`
- Uploaded files stored on the local filesystem at `data/uploads/`

Both `data/translations.db` and `data/uploads/` are gitignored — they're your local data, not code.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then edit ADMIN_PASSWORD
npm run dev
```

Visit `http://localhost:3000`.

Set `ADMIN_PASSWORD` in `.env.local` before you rely on this for anything real — it gates
the `/admin` review queue and defaults to `changeme` if unset.

## Importing your existing files

If you already have Word/PDF translations on disk, bulk-import them (they'll be marked
"approved" immediately, skipping the review queue) with a CSV manifest:

```bash
node scripts/import-existing.mjs path/to/manifest.csv
```

See `scripts/manifest.example.csv` for the expected columns:
`title,sourceLanguage,targetLanguage,translatorName,category,notes,filePath`
(`filePath` can be relative to the CSV or absolute).

## How submissions work

1. Someone fills out the form at `/submit` and uploads a file.
2. It's stored on disk and inserted into the database with `status = 'pending'`.
3. An admin signs in at `/admin`, reviews pending items, and approves or rejects them.
4. Only `approved` translations show up in the public search on `/`.

## Notes on the admin auth

Admin auth is intentionally simple: one shared password (`ADMIN_PASSWORD`) set as an
httpOnly cookie on login. There's no per-user accounts. If you later want individual
reviewer logins, audit trails, or role-based access, that's a natural next step — the
`status`/`reviewed_at` columns in `translations` are already there to build on.

## Deploying the Next.js app (not to GitHub Pages)

This app writes to the local filesystem (`data/`), so it needs a host with a persistent
disk (a VM, or a platform with a persistent volume) — not a purely serverless/edge
deployment, where local writes don't survive between requests. If you outgrow local
storage, swap the file read/write calls in `src/lib/db.ts` and the API routes for a
cloud storage bucket and a hosted database.

---

## Static catalog / GitHub Pages

`public-site/` is a plain HTML/CSS/JS site — no build step, no framework, no server. It
reads `public-site/data/translations.json` and renders a searchable/filterable list,
linking each entry to a file under `public-site/files/`. This is what GitHub Pages can
actually host, since Pages only serves static files.

### Rebuilding the catalog

Keep a CSV manifest of your translations (title, languages, translator, category, notes,
and a path to the source file) — see `scripts/manifest.example.csv` for the columns.
Whenever it changes, regenerate the site's data and files:

```bash
node scripts/build-catalog.mjs path/to/manifest.csv
```

This **replaces** everything in `public-site/files/` and rewrites
`public-site/data/translations.json` from the manifest, so the manifest (plus your
original source files, kept somewhere durable) is the source of truth — not the
generated `public-site/` output itself.

### Linking to externally-hosted translations

For translations you don't have the right to host copies of (someone else's files),
add catalog entries that link out to the original instead of copying them in. Put the
scraped/collected links in a JSON file under `scripts/sources/` (see
`scripts/sources/ipr-northwestern-wise-scales.json` for the shape and a real example —
74 IWISE water-insecurity-scale translations from Northwestern IPR), then run:

```bash
node scripts/add-external-links.mjs scripts/sources/<name>.json
```

This **appends** to `public-site/data/translations.json` (it doesn't replace it like
`build-catalog.mjs` does) and doesn't copy any files — cards for these entries show
"Hosted by \<org\>" and their download button reads "View source ↗", linking straight to
the original file so there's no ambiguity about where it's actually hosted.

### Deploying

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) redeploys
`public-site/` to GitHub Pages automatically on every push to `main` that touches that
folder. One-time setup in the repo's GitHub settings: **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

### Accepting new submissions

Since the static site can't run a submission form itself, point people at an external
form (a Google Form works well: file-upload question + short-answer fields for title/
languages/translator/category). Then, periodically:

1. Download new responses (Google Forms can save uploads straight to a Drive folder).
2. Add a row per translation to your CSV manifest, pointing `filePath` at the downloaded
   file.
3. Run `node scripts/build-catalog.mjs path/to/manifest.csv` and commit/push — that's
   your review step, since nothing reaches the public catalog until you do this.

Replace the four `SUBMIT_FORM_URL_PLACEHOLDER` occurrences in `public-site/index.html`
with your form's URL once you've created it.
