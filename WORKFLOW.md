# Workflow

How changes reach **Mathew - Blogs**. Read this before changing the site.

## Environments

| | Live site | Test site |
|---|---|---|
| Address | https://mathewvadasseril.github.io/msv-blogs/ | https://msvblogs-dev.netlify.app |
| Hosted on | GitHub Pages | Netlify (project `msvblogs-dev`) |
| Deploys from branch | `main` | `develop` |
| Who can see it | Everyone | Only the owner (Private) |
| Editor (`/admin`) saves to | `main` | `develop` |
| Cost per deploy | Free | Netlify credits (free plan: 300 a month) |

Both sites rebuild automatically, a minute or two after a push to their branch.
The live site's progress shows in the repo's **Actions** tab ("Deploy to GitHub Pages").

**Why two hosts:** every saved post is a deploy. GitHub Pages deploys for free, so
everyday publishing lives there. Netlify can keep a site private, so it's used only
for testing major changes, which keeps credit use low.

To push to `develop` without spending Netlify credits (for example, docs-only
changes), put `[skip netlify]` in the commit message.

## Which path to use

### Blog posts and small changes → straight to `main`

- **Posts, booklets and case studies:** write them at https://mathewvadasseril.github.io/msv-blogs/admin/.
  - Every post, booklet and case study has a **Draft** switch, **on by default**. Saving with it on keeps the entry hidden from the site and lists it under **Drafts** in the editor's sidebar (**Draft Posts**, **Draft Booklets**, **Draft Case Studies**). Open one there to keep editing, with the live preview.
  - The main button reads **Save** while Draft is on and **Publish** when it's off.
  - **To publish:** switch **Draft** off and click **Publish**. A confirmation asks you to type **admin** and press Enter; then the entry moves to **Blog Posts** / **Strategy Booklets** / **My Case Studies** and the live site updates a minute or two later. Switching Draft back on and saving hides it again.
  - Drafts stay until you delete them. The browser also backs up unsaved typing and offers to restore it.
  - **Site Settings** has no Draft switch: its button reads **Publish**, and it asks for the same **admin** confirmation before going live.
- **Small fixes** (copy, a button, a style tweak): commit directly to `main`.

### Major design changes or new features → through `develop`

1. **Sync:** bring `develop` up to date with `main`.
   GitHub pull request: base `develop` ← compare `main`, then merge.
2. **Build:** commit the changes to `develop`.
3. **Test:** check https://msvblogs-dev.netlify.app (desktop and phone, light and dark). Fix and repeat.
4. **Sync again just before release:** merge `main` into `develop` once more, so the test site shows the new design with every post written in the meantime. Re-check it.
5. **Release:** GitHub pull request: base `main` ← compare `develop`, then merge.

When no major change is in progress, `develop` sits idle and falls behind `main`. That's expected; step 1 catches it up.

## Rules

- **Never write real posts on the test site's `/admin`.** It saves to `develop`, and anything there goes live at the next release. Test posts must be marked **Draft** or deleted before step 5.
- **If a redesign changes the post or booklet format** (new or renamed fields), update every existing file in `content/` and `admin/config.yml` in the same change, so nothing breaks at release.
- **Don't edit `content/library.json`.** It's generated on every deploy and isn't stored in the repo.

## How the site is built

- `index.html` is the whole site. It loads `content/library.json` at startup.
- Posts live in `content/posts/*.json`, booklets in `content/booklets/*.json`, Mathew's own case studies (projects and case competitions) in `content/cases/*.json`, and the home page, header and footer text in `content/site.json` ("Site Settings" in the editor). The editor at `/admin` ([Sveltia CMS](https://github.com/sveltia/sveltia-cms), configured in `admin/config.yml`) creates and edits these files as commits.
- On every deploy, `node scripts/build-content.js` bundles the content into `content/library.json`.
  - GitHub Pages runs it from `.github/workflows/pages.yml` on every push to `main`.
  - Netlify runs it from `netlify.toml`. On builds of any branch other than `main`, it also points the editor at that branch.
- Paths in the site are relative (no leading `/`), because GitHub Pages serves it from the `/msv-blogs/` sub-folder. Keep new paths relative.
- Each booklet has a `chapters` list. A chapter's `type` picks its layout: `blocks` ("Build your own": a list of text, image, callout, cards, quote, table, metrics, timeline and listbox blocks), `intuition`, `framework`, `casestudy`, `slides`, `venture`, or `text` (free-form Markdown). Older files with fixed `ch1`–`ch5` fields still display.
- **My Case Studies** is its own page at `#case-studies` (linked from the header, the sidebar and a card on the home page); each one opens at `#case-<file name>`. A case study has the same chapter list as a booklet (the `chapters` field is shared through the `&chapters_field` YAML anchor), plus Type (Project, Case competition, Venture, Internship, Consulting), Year, Organisation or competition, My role, Result and Team. The page's title and introduction are in **Site Settings**. With no published case studies, the page shows a "coming soon" note.
- Uploaded images go to `images/uploads/`.
- In `admin/config.yml`, the Blog Posts, Strategy Booklets and My Case Studies collections show only entries with `draft` off, and the Draft Posts, Draft Booklets and Draft Case Studies collections show the same folders filtered to `draft: true` (they share fields through YAML anchors). `scripts/build-content.js` leaves drafts out of the site.
- `admin/editor.css` is the editor's theme: an earth palette (ivory, cream and linen surfaces; burgundy, walnut, sage, brass and terracotta accents) with layered shadows, serif field names, a burgundy top bar, and the preview set in a dark walnut frame. Fields are colour-coded by type: burgundy for titles and short text, sage for formatted text, walnut for lists, brass for grouped sections, terracotta for images and taupe for settings. Dark mode uses an espresso version of the same palette.
- `admin/editor.js` adds the editor's toolbar widgets and live previews:
  - **Widgets** (callout, cards, table, number tiles, timeline, list box) inserted from a text box's **Insert** menu are saved in the Markdown as ` ```msv-block ` fences holding JSON. `index.html` draws them with the same renderers as "Build your own" blocks.
  - **Publish confirmation:** whenever the main button would publish (Site Settings, or a post/booklet with Draft off), by click or Cmd/Ctrl+S, a dialog asks for the word `admin` first. Saving drafts doesn't ask.
  - **Previews** load the real site at `index.html#preview` and send it the entry being edited with `postMessage`, so the preview matches the live design.

### Preview locally

```sh
node scripts/build-content.js
npx serve .        # then open the address it prints
```

Opening `index.html` directly from disk won't work, because the browser blocks it from loading `content/library.json`.

## Scholar's Vault (students only)

Study guides, handbooks and workbooks for students, at `#prep` (header, sidebar and a card on the home page); each guide opens at `#prep-<file name>`. The page title and introduction are in **Site Settings**.

**The guides are not in this repository.** They live in a private Supabase storage bucket, and Supabase hands them only to a signed-in student on one of their recorded devices. This repository holds only the vault *page* (`index.html`, the "SCHOLAR'S VAULT" block).

| What | Where |
|---|---|
| The guides, PDFs, workbook and pictures | Private repo **`MathewVadasseril/msv-vault`**, folder `guides/`. Every push uploads them to the Supabase bucket `vault` (its Actions tab shows "Publish vault"). |
| Supabase rules (private bucket, 2-device limit, who may read) | `msv-vault/supabase/setup.sql`, applied by the same workflow |
| Students | Supabase dashboard → **Authentication → Users** |
| Each student's devices | Supabase dashboard → **Table Editor → `vault_devices`** |
| Supabase address and publishable key | `index.html` (`VAULT`). Both are public by design. |

The secret key and database address are GitHub secrets on `msv-vault` (`SUPABASE_SERVICE_KEY`, `SUPABASE_DB_URL`) and never appear in this repository.

### Students

- **Add a student:** Supabase → **Authentication → Users → Add user → Create new user**. Email: their username followed by `@vault.local` (e.g. `asha@vault.local`), a password, and tick **Auto confirm user**. They sign in with just `asha` and the password.
- **Remove a student:** delete them on the same page. They are locked out at once.
- **Change a password:** open the student and set a new one.
- **Two devices each.** A sign-in from a third device is refused with "You're already signed in on 2 devices". A "device" is really one browser: Chrome and Safari on one phone count as two, and so do a private window or cleared browser data. **To reset:** Table Editor → `vault_devices`, delete that student's rows.
- Only accounts ending in `@vault.local` can read the vault, and **Allow new users to sign up** should stay off (Authentication → Sign In / Providers).

### Editing the guides

Edit or add files in `msv-vault/guides/` (one `.json` per guide, same format as before; pictures and downloads in `guides/files/`, referred to as `content/prep/files/...` inside the guides). Push, and "Publish vault" uploads them within a minute or two. Files deleted from `guides/files/` are removed from the bucket too.

### How it stays locked

- The page signs in with Supabase, records the device (`claim_device`), downloads `index.json` from the bucket, and swaps every picture and download for a **signed link that expires after an hour**.
- The bucket's rule only answers a student signed in on a device recorded for that sign-in, so the 2-device limit can't be skipped from the page.
- What it can't stop: a student downloading a PDF and passing it on.
- **Free plan:** Supabase pauses free projects after about a week with no activity. A weekly workflow in `msv-vault` ("Keep vault awake") prevents it; if the vault still says it can't be opened, restore the project from the Supabase dashboard.

### AI tutor

Signed-in students see an **Ask the tutor** button on every vault page. It opens a chat panel that answers from the vault guides and links to the chapter it used, with a note that answers can be wrong. The answering, who may use it and the daily question cap all live in the private msv-vault repository (`supabase/functions/tutor` and the `tutor_` tables in `supabase/setup.sql`); see "AI tutor" in its README. This site only shows the panel.

## Editor sign-in

`/admin` signs in with a GitHub **fine-grained personal access token**:

- **Repository access:** only `MathewVadasseril/msv-blogs`
- **Permissions:** Contents → **Read and write** (GitHub adds Metadata: Read-only automatically)

When the token expires, create a new one the same way and sign in again.
