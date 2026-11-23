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

// Prep Materials (study guides, handbooks and workbooks for students).
// Kept out of library.json on purpose: everything for this section lives under
// content/prep/ (entries, the bundle below, and downloads in content/prep/files/),
// so the whole folder can later be put behind a sign-in. See "Prep Materials" in WORKFLOW.md.
const prep = readFolder('prep')
  .filter(m => m.slug !== 'index' && !m.draft)
  .map(({ slug, ...m }) => ({ id: slug, topics: [], downloads: [], ...m }))
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.title.localeCompare(b.title));
fs.writeFileSync(path.join(dir('prep'), 'index.json'), JSON.stringify({ generated: new Date().toISOString(), prep }));
console.log(`content/prep/index.json: ${prep.length} prep materials`);

// Student logins for Prep Materials. The PREP_LOGINS secret (GitHub: Settings > Secrets and
// variables > Actions) holds one "username: password" per line. We store only a salted
// PBKDF2 hash of each password in content/prep/access.json; the page checks sign-ins
// against it. With no secret, no access file is written and the section stays open.
const crypto = require('crypto');
const PREP_HASH_ITERATIONS = 150000;
const accessFile = path.join(dir('prep'), 'access.json');
const prepLogins = String(process.env.PREP_LOGINS || '')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'))
  .map(line => {
    const at = line.indexOf(':');
    if (at < 1) throw new Error('PREP_LOGINS: every line must look like "username: password"');
    return [line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim()];
  });
const seenUsers = new Set();
prepLogins.forEach(([user, password]) => {
  if (!user || !password) throw new Error(`PREP_LOGINS: "${user}" needs both a username and a password`);
  if (seenUsers.has(user)) throw new Error(`PREP_LOGINS: the username "${user}" appears twice`);
  seenUsers.add(user);
});
if (prepLogins.length) {
  const logins = prepLogins.map(([user, password]) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, `${salt}:${user}`, PREP_HASH_ITERATIONS, 32, 'sha256').toString('hex');
    return { user, salt, hash };
  });
  fs.writeFileSync(accessFile, JSON.stringify({ iterations: PREP_HASH_ITERATIONS, logins }));
  console.log(`content/prep/access.json: ${logins.length} student logins (Scholar's Vault needs a sign-in)`);
} else {
  fs.rmSync(accessFile, { force: true });
  console.log('content/prep/access.json: no PREP_LOGINS secret, so Scholar’s Vault is open to everyone');
}
