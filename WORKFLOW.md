# Workflow

How changes reach **Mathew - Blogs**. Read this before changing the site.

## Environments

| | Live site | Test site |
|---|---|---|
| Address | https://msvblogs.netlify.app | https://msvblogs-dev.netlify.app |
| Netlify project | `msvblogs` | `msvblogs-dev` |
| Deploys from branch | `main` | `develop` |
| Who can see it | Everyone | Only the owner (Private) |
| Editor (`/admin`) saves to | `main` | `develop` |

Both sites rebuild automatically, about a minute after a push to their branch.

## Which path to use

### Blog posts and small changes → straight to `main`

- **Posts and booklets:** write them at https://msvblogs.netlify.app/admin. Saving publishes to the live site. Turn on **Draft** to keep a post hidden until it's ready.
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
- Posts live in `content/posts/*.json` and booklets in `content/booklets/*.json`. The editor at `/admin` ([Sveltia CMS](https://github.com/sveltia/sveltia-cms), configured in `admin/config.yml`) creates and edits these files as commits.
- On every deploy, Netlify runs `node scripts/build-content.js` (set in `netlify.toml`). It bundles the content into `content/library.json`. On builds of any branch other than `main`, it also points the editor at that branch.
- Uploaded images go to `images/uploads/`.

### Preview locally

```sh
node scripts/build-content.js
npx serve .        # then open the address it prints
```

Opening `index.html` directly from disk won't work, because the browser blocks it from loading `content/library.json`.

## Editor sign-in

`/admin` signs in with a GitHub **fine-grained personal access token**:

- **Repository access:** only `MathewVadasseril/web-app-msv-blog`
- **Permissions:** Contents → **Read and write** (GitHub adds Metadata: Read-only automatically)

When the token expires, create a new one the same way and sign in again.
