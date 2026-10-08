#!/usr/bin/env node
// Collects every booklet and post written in the CMS into one file the site loads:
// content/booklets/*.json + content/posts/*.json  ->  content/library.json
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

// Home page, header and footer text edited under "Site Settings" in the editor.
const siteFile = path.join(dir('site.json'));
const site = fs.existsSync(siteFile) ? JSON.parse(fs.readFileSync(siteFile, 'utf8')) : {};

fs.writeFileSync(dir('library.json'), JSON.stringify({ generated: new Date().toISOString(), site, booklets, posts }));
console.log(`content/library.json: ${booklets.length} booklets, ${posts.length} posts`);

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
