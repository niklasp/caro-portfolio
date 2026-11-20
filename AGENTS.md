This is an EmDash site -- a CMS built on Astro with a full admin UI. It is the portfolio of Carolin Pflüger (stage and costume designer): one page, a 3D revolving stage ("Drehbühne") built with React and three.js, fed from the CMS.

## Commands

```bash
npm run dev           # Start the Astro dev server (needs Node >= 22.23.4, see .nvmrc)
npm run build         # Production build for Cloudflare Workers
npm run typecheck     # astro check
npx emdash types      # Regenerate TypeScript types from a running site
```

The admin UI is at `http://localhost:4321/_emdash/admin`; `/admin` redirects there (`src/pages/admin/[...pfad].astro`), because EmDash's own path cannot be changed. Locally, `http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` signs you in as a dev admin without a passkey and applies the seed on a fresh database.

Local data (D1 database, R2 media) lives in `.wrangler/`. Delete that folder to start from an empty database; the next dev-bypass or setup wizard run applies `seed/seed.json` again.

## Key Files

| File                                    | Purpose                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `astro.config.mjs`                      | Astro config with `emdash()` integration, D1 database, and R2 storage                         |
| `wrangler.jsonc`                        | Cloudflare bindings (`DB`, `MEDIA`), Durable Object, cron trigger                             |
| `src/live.config.ts`, `src/worker.ts`   | EmDash loader registration and Worker entry (boilerplate -- don't modify)                     |
| `seed/seed.json`                        | Schema + initial content (collections, fields, categories, the 14 projects, stage settings)  |
| `emdash-env.d.ts`                       | Generated types for collections (auto-regenerated on dev server start)                        |
| `src/cms/daten.ts`                      | Server side: queries EmDash and shapes the data for the stage                                 |
| `src/layouts/Seite.astro`               | Page shell: SEO tags, EmDash wiring, the data as inline JSON, the React island                |
| `src/pages/`                            | Astro pages -- all server-rendered                                                            |
| `src/data/projects.ts`                  | Client side: reads the inline JSON synchronously at module load                               |
| `src/ideas/Drehbuehne.tsx`              | The stage (React + three.js)                                                                  |
| `src/ideas/drehWerte.ts`, `drehConfig.ts` | Stage settings: value lists and defaults (browser-free), and the "Stellwerk" try-out panel |

## Skills

Agent skills are in `.agents/skills/`. Load them when working on specific tasks:

- **building-emdash-site** -- Querying content, schema design, seed files, site features. Start here.
- **creating-plugins** -- Building EmDash plugins.
- **emdash-cli** -- CLI commands for content management, seeding, type generation.

## Documentation

The EmDash docs are available as an MCP server at `https://docs.emdashcms.com/mcp` (configured in `.mcp.json`). When you need to verify an API, hook, config option, field type, or pattern, call `search_docs` against the live documentation rather than relying on training-data recall.

## Rules

- All content pages must be server-rendered (`output: "server"`). No `getStaticPaths()` for CMS content.
- Image fields are objects, not strings. Media-library images have no `src`; `src/cms/daten.ts` builds the URL from `meta.storageKey`.
- Every photo becomes a WebGL texture. Uploads wider than 1600 px are requested through `/_image?href=…&w=1600&f=webp` (Cloudflare Images binding, added by the adapter); smaller ones are used as uploaded. If the resized request fails, the browser loads the original (`originalVon` in `src/data/projects.ts`). Uploads are capped at 20 MB (`maxUploadSize` in `astro.config.mjs`), the largest file the Images binding accepts.
- `entry.id` is the slug (for URLs). `entry.data.id` is the database ULID (for API calls).
- Taxonomy names in queries must match the seed's `"name"` field exactly (`"category"`).
- Editing `seed/seed.json` does not change a database that is already set up. Change the schema there through the admin (Content Types) or the CLI, and keep the seed in step for new installs.

## How the site is put together

Every page is an Astro page that loads the CMS data on the server (`ladeDaten()`), writes the head tags, and mounts one React island (`src/Wurzel.tsx`, `client:only`). The island routes in the browser with React Router, so turning the stage from project to project does not reload the page.

The stage builds its project lists when its module loads, before React renders. Island props would arrive too late, so the layout writes the data as `<script type="application/json" id="caro-daten">` and `src/data/projects.ts` reads it synchronously. Keep that script element before the island.

| Page             | Path                    | What it shows                                              |
| ---------------- | ----------------------- | ---------------------------------------------------------- |
| Stage            | `/`, `/drehbuehne`      | The Drehbühne, first project of the first category in front |
| Stage on project | `/drehbuehne/<slug>`    | The Drehbühne turned to that project; 404 for unknown slugs |
| About            | `/about`                | The Seiten entry `about` (title, image, text)              |
| Lebenslauf       | `/lebenslauf`           | The Lebenslauf entry `lebenslauf` (rows per section, PDF)  |

## Schema

- `projekte` collection: `title`, `rolle`, `jahr` (display text such as "seit 2021"), `ort`, `farbe` (Blau, Orange, Magenta, Pink), `position` (order on the stage: small number in front, empty = very front), `beschreibung`, `credits` (one line per credit), `bilder` (repeater of media-library images), `links` (repeater of label + URL), `video` (Vimeo player URL), `video_datei` (path or URL of an mp4 projected on the stage screen). The slug is the permalink (`lost-2025`).
- Taxonomy `category`, labelled "Kategorien": each term is one side of the stage, in the order of the term list. A project sits on the side of its first category; without a category it goes to the last one. Categories without projects get no side.
- `seiten` collection: `title`, `bild`, `content` (Portable Text). Only headings and paragraphs are rendered so far, as plain text.
- `lebenslauf` collection: one entry with the slug `lebenslauf`. `title`, `einleitung` (one line per line on the page), `pdf` (file; while empty, `public/lebenslauf-carolin-pflueger.pdf` is offered), and one repeater per section: `ausbildung`, `werdegang`, `auszeichnungen` (rows of `jahr` + `text`), `skills` (`titel` + `text`), `arbeiten`, `ausstellungen` (`jahr` + `titel` + `text`). Row order in the admin is the order on the page. A work whose `titel` matches a project title links to that project. Section headings are fixed in `src/ansichten/Lebenslauf.tsx`.
- `buehne` collection: one entry with the slug `drehbuehne` holding the stage settings (background, screen, light, blocks, LED ticker, motion). Field slugs are the snake_case form of the keys in `DrehConfig`; select options are the labels from `src/ideas/drehWerte.ts`. This collection has no drafts: saving applies at once.
- Site settings: `title` is the name in the header, `tagline` the line under the name in the opening animation.

A project appears on the stage once it is published and has at least one photo.

The seed holds the full content: 16 projects with 147 photos. The photos of twelve projects are Carolin's delivery of 20 Nov 2026 as web-sized copies (at most 1600 px wide) in `seed/fotos/`; the seed fetches them, and the 19 older photos, from GitHub by commit. A photo whose download fails during seeding is left out without an error, so count the photos afterwards (147).

## Admin

`admin.hiddenNavItems` in `astro.config.mjs` hides the built-in sections this site does not use (calendar, comments, menus, redirects, widgets, sections, bylines, import). The pages stay reachable by URL. A one-page guide for Carolin is in `docs/kurzanleitung-admin.pdf` (source: the `.html` next to it, printed to PDF with Chrome).

## Stage settings and the Stellwerk

The Stellwerk panel on the stage is for trying things out; its changes stay in that browser (localStorage). The published state for all visitors is the `buehne` entry. Local try-outs are discarded as soon as the `buehne` entry changes.

The seeded values are Carolin's own Stellwerk settings from her screenshot of 20 Nov 2026 (background `#6266bf`, view "Große Bilder untereinander", floor projection with the "Matratze im Grün" motif, fixed crop). Her "Kulissen" and "Bewegung" folders (second screenshot, same day) are all at the defaults: block depth 0.5, three photos per project, turn speed 3.4.
