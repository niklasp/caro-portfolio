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
| `src/data/bearbeiten.ts`                | Client side: EmDash's edit mode on the React island (edit marks, key guard, admin link)       |
| `src/ideas/Drehbuehne.tsx`              | The stage (React + three.js)                                                                  |
| `src/ideas/drehWerte.ts`, `drehConfig.ts` | Stage settings: value lists and defaults (browser-free), and the "Stellwerk" try-out panel |
| `src/cms/vorschau.ts`, `src/cms/adresse.ts` | Link-preview images (`og:image`), description shortening, the public base URL              |
| `src/pages/sitemap.xml.ts`              | The sitemap (replaces EmDash's own)                                                            |

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
| About            | `/about`                | The Seiten entry `about`: portrait and intro side by side, the Lebenslauf below |
| (old Lebenslauf) | `/lebenslauf`           | 301 to `/about#lebenslauf`                                 |

## Schema

- `projekte` collection: `title`, `rolle`, `jahr` (display text such as "seit 2021"), `ort`, `farbe` (Blau, Orange, Magenta, Pink), `position` (order on the stage: small number in front, empty = very front), `beschreibung`, `credits` (one line per credit), `bilder` (repeater of media-library images), `links` (repeater of label + URL), `video` (Vimeo player URL), `video_datei` (path or URL of an mp4 projected on the stage screen). The slug is the permalink (`lost-2025`).
- Taxonomy `category`, labelled "Kategorien": each term is one side of the stage, in the order of the term list. A project sits on the side of its first category; without a category it goes to the last one. Categories without projects get no side.
- `seiten` collection, entry `about`: `title`, `bild` (the portrait, left of the intro), `content` (the intro, Portable Text), `lebenslauf` (Portable Text), `lebenslauf_pdf` (file; while empty, `public/lebenslauf-carolin-pflueger.pdf` is offered). Rendered are headings (H1/H2 as a section with a rule, H3–H6 small italic), paragraphs, quotes, lists and tables, with bold, italic, underline, strike-through and links (`alsText` in `src/cms/daten.ts`, `src/ansichten/About.tsx`). Images and embeds inside the text are not shown. A table row is drawn like the old Lebenslauf: the first cell in a fixed 84 px year column, the rest beside it; stored column widths are ignored. In the editor, Tab in the last cell adds a row. A link to `/drehbuehne/<slug>` opens without reload and shows the project's main photo at the mouse.
- The Lebenslauf used to be its own collection `lebenslauf` with one repeater per section. `src/cms/lebenslaufText.ts` turns those rows into the Portable Text above (one table per section, work titles bold italic, linked to their project). The site, the seed and `~/code/caro-sicherung/lebenslauf-umziehen.mjs` all use it. While the `lebenslauf` field is empty, `ladeDaten()` falls back to the old collection if it still exists. Live still has it until the move script runs there.
- `buehne` collection: one entry with the slug `drehbuehne` holding the stage settings (background, screen, light, blocks, LED ticker, motion). Field slugs are the snake_case form of the keys in `DrehConfig`; select options are the labels from `src/ideas/drehWerte.ts`. This collection has no drafts: saving applies at once. Two things are not plain values: the images (`leinwand_bild`, `grund_bild`) and `leinwand_kategorien`, a repeater of category name + image that gives each category its own stage picture.
- Site settings: `title` is the name in the header, `tagline` the line under the name in the opening animation.

A project appears on the stage once it is published and has at least one photo.

The seed holds the full content: 16 projects with 147 photos. The photos of twelve projects are Carolin's delivery of 20 Nov 2026 as web-sized copies (at most 1600 px wide) in `seed/fotos/`; the seed fetches them, and the 19 older photos, from GitHub by commit. A photo whose download fails during seeding is left out without an error, so count the photos afterwards (147).

## Search engines and link previews

`src/layouts/Seite.astro` writes the head for every page. EmDash's `EmDashHead` emits description, canonical, Open Graph, Twitter card and the WebSite JSON-LD. The layout adds:

- `og:locale`, the image size and alt text, and `theme-color`;
- the favicon `public/favicon.svg` (only while Settings → Website-Identität has none) and `public/apple-touch-icon.png`. Both are placeholders drawn from the stage.
- a Person JSON-LD for Carolin. Project pages add a CreativeWork; About adds a ProfilePage.

The preview image (`og:image`) is chosen as follows:

- A project uses its main photo, fetched through `/_image?…&w=1200&f=jpeg`. Some platforms show no WebP and no 20 MB originals. The Images binding does not crop (`fit=cover` is ignored), so the photo keeps its proportions.
- About uses the portrait.
- Everything else uses Settings → SEO "Standardbild für soziale Medien". While that is empty, it uses `public/og-carolin-pflueger.jpg` (1200×630: the stage with Carolin's name, a screenshot of the site). Renew that screenshot when the stage looks very different.

`/drehbuehne` shows the same as `/` and points its canonical there.

Absolute URLs (canonical, `og:url`, images, sitemap) use Settings → Allgemein "Website-URL" (button "Domain ändern") when set, otherwise the requested host (`basisAdresse()`). After the move to the custom domain, enter it there.

The island renders only in the browser. So each page also carries its content as plain HTML in `.ohne-skript`, the slot of `Seite.astro`: name, project list with links, project text, the About text. This is for crawlers without JavaScript; browsers hide it (`display: none`, shown under `<noscript>`). It must mirror what the page shows.

`src/pages/sitemap.xml.ts` lists `/`, `/about` and every project on the stage, with its photos for image search. EmDash's own sitemap would only list collections with SEO fields and does not know the stage URLs; it steps aside when the project has its own `sitemap.xml`. `robots.txt` stays EmDash's.

While the site is in staging (Settings → Allgemein → "Website-Status"), EmDash puts `noindex` on every page.

## Admin

`admin.hiddenNavItems` in `astro.config.mjs` hides the built-in sections this site does not use (calendar, comments, menus, redirects, widgets, sections, bylines, import). The pages stay reachable by URL. A one-page guide for Carolin is in `docs/kurzanleitung-admin.pdf` (source: the `.html` next to it, printed to PDF with Chrome).

## Edit mode on the site

Signed-in editors see EmDash's toolbar on the site. Its "Bearbeitungsmodus" switch makes everything clickable that carries a `data-emdash-ref` attribute. The pages are a React island, so the server passes each entry's mark through the inline JSON (`ref`, only in edit mode; visitors get none) and `feld(ref, '<cms field>')` from `src/data/bearbeiten.ts` puts it on the element.

- The toolbar saves the element's whole text. An element with a mark must show exactly one stored field, nothing else.
- One-line texts (project title, role, year, place, page titles) and the project description are edited in place. Everything else (credits, links, the About intro and Lebenslauf, the portrait) opens the entry in the admin. Photos are WebGL textures and cannot be clicked: the toolbar's arrow opens the current project in the admin.
- Edits are saved as a draft; "Veröffentlichen" in the toolbar publishes them. Edit mode shows drafts.
- Key handlers of the pages must skip while a field is being edited (`tipptImFeld()`).

## Stage settings and the Stellwerk

The Stellwerk panel on the stage is for trying things out; its changes stay in that browser (localStorage). The published state for all visitors is the `buehne` entry. Local try-outs are discarded as soon as the `buehne` entry changes.

The stage picture is chosen in this order: an upload tried out in the Stellwerk, the category's own picture (`leinwand_kategorien`, matched to the category by name or slug, ignoring capitals and punctuation), the general own picture, the fixed motif, the project's photo. With the floor projection each face of the disc carries the picture of its category.

The background (`grund_art`) is a colour, a gradient (`grund` to `grund2`, direction `grund_richtung`) or an image (`grund_bild`). `grund` stays a plain hex colour in every case: fog, curtain and the project view use it, so the project view is always the flat colour.

A field that is new in the seed is missing in a database that is already set up. `~/code/caro-sicherung/felder-nachziehen.mjs` adds missing seed fields to a running site through the API.

The seeded values are Carolin's own Stellwerk settings from her screenshot of 20 Nov 2026 (background `#6266bf`, view "Große Bilder untereinander", floor projection with the "Matratze im Grün" motif, fixed crop). Her "Kulissen" and "Bewegung" folders (second screenshot, same day) are all at the defaults: block depth 0.5, three photos per project, turn speed 3.4.
