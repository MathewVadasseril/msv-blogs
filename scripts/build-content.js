#!/usr/bin/env node
// Collects every booklet and post written in the CMS into one file the site loads:
// content/booklets/*.json + content/posts/*.json + content/cases/*.json  ->  content/library.json
// Runs on every Netlify deploy (see netlify.toml). No dependencies needed.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = name => path.join(root, 'content', name);

function readFolder(name) {
  if (!fs.existsSync(dir(name))) return [];
  return fs.readdirSync(dir(name))
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const file = path.join(dir(name), f);
      try {
        return { slug: f.replace(/\.json$/, ''), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
      } catch (err) {
        throw new Error(`Could not read ${path.relative(root, file)}: ${err.message}`);
      }
    });
}

const booklets = readFolder('booklets')
  .filter(b => !b.draft)
  .map(({ slug, ...b }) => ({ id: slug, topics: [], ...b }))
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.title.localeCompare(b.title));

const posts = readFolder('posts')
  .filter(p => !p.draft)
  .map(p => ({ topics: [], summary: '', ...p }))
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));

// Mathew's own projects and case competitions ("My Case Studies" in the editor).
const cases = readFolder('cases')
  .filter(c => !c.draft)
  .map(({ slug, ...c }) => ({ id: slug, topics: [], ...c }))
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(b.year ?? '').localeCompare(String(a.year ?? '')) || a.title.localeCompare(b.title));

// Home page, header and footer text edited under "Site Settings" in the editor.
const siteFile = path.join(dir('site.json'));
const site = fs.existsSync(siteFile) ? JSON.parse(fs.readFileSync(siteFile, 'utf8')) : {};

fs.writeFileSync(dir('library.json'), JSON.stringify({ generated: new Date().toISOString(), site, booklets, posts, cases }));
console.log(`content/library.json: ${booklets.length} booklets, ${posts.length} posts, ${cases.length} case studies`);

// Share pages for LinkedIn and other link previews.
// The site routes with #hashes, which link-preview crawlers ignore, so every shared
// link would show the same home-page card. For each item we write a tiny page at
// share/<slug>/ with its own title, summary and image, which sends readers on to
// the real page. Share https://mathewvadasseril.github.io/msv-blogs/share/<slug>/
const SITE_URL = (process.env.SITE_URL || 'https://mathewvadasseril.github.io/msv-blogs/').replace(/\/?$/, '/');
const shareDir = path.join(root, 'share');
fs.rmSync(shareDir, { recursive: true, force: true });
const attr = s => String(s ?? '').replace(/[*_`#>]/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim()
  .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
// First photo in the item (LinkedIn cannot show SVG), else the site card.
const firstImage = item => (JSON.stringify(item).match(/images\/uploads\/[^"\\]+\.(?:jpe?g|png|webp)/i) || ['images/og-default.png'])[0];
function writeSharePage(slug, hash, item) {
  const title = attr(item.title);
  const desc = clip(attr(item.summary || item.subtitle || item.description || ''), 200);
  const url = `${SITE_URL}share/${slug}/`;
  const target = `${SITE_URL}#${hash}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} · ${attr(site.siteName || 'Mathew - Blogs')}</title>
<meta name="description" content="${desc}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="${attr(site.siteName || 'Mathew - Blogs')}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE_URL}${firstImage(item)}" />
<meta name="twitter:card" content="summary_large_image" />
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body style="font-family:system-ui,sans-serif;padding:2rem">
<p><a href="${target}">${title}</a></p>
</body>
</html>
`;
  fs.mkdirSync(path.join(shareDir, slug), { recursive: true });
  fs.writeFileSync(path.join(shareDir, slug, 'index.html'), html);
}
cases.forEach(c => writeSharePage(c.id, `case-${c.id}`, c));
booklets.forEach(b => writeSharePage(b.id, b.id, b));
posts.forEach(p => writeSharePage(p.slug, `post-${p.slug}`, p));
console.log(`share/: ${cases.length + booklets.length + posts.length} link-preview pages`);

// The /admin editor saves to the branch named in admin/config.yml (main).
// Netlify sets BRANCH during a build, so on a site that deploys another
// branch (e.g. the private develop test site) the editor saves there instead.
const branch = process.env.BRANCH;
if (branch && branch !== 'main') {
  const configPath = path.join(root, 'admin', 'config.yml');
  const config = fs.readFileSync(configPath, 'utf8');
  if (!/^  branch: main$/m.test(config)) throw new Error('admin/config.yml: expected "  branch: main" under backend');
  fs.writeFileSync(configPath, config.replace(/^  branch: main$/m, `  branch: ${branch}`));
  console.log(`admin/config.yml: editor will save to the "${branch}" branch`);
}
