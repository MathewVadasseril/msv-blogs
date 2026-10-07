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

fs.writeFileSync(dir('library.json'), JSON.stringify({ generated: new Date().toISOString(), booklets, posts }));
console.log(`content/library.json: ${booklets.length} booklets, ${posts.length} posts`);
