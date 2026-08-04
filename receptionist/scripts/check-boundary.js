#!/usr/bin/env node
/**
 * Boundary check for the Healthcare AI Layer.
 *
 * The architecture claims `core/` is channel-agnostic — that adding WhatsApp or
 * voice later is a new adapter and nothing else. That claim is worth exactly as
 * much as the check that enforces it, so this is the check.
 *
 *   node receptionist/scripts/check-boundary.js
 *
 * Exits non-zero on violation. No dependencies, no network.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CORE_DIR = path.join(REPO_ROOT, 'website', 'apps', 'api', 'src', 'modules', 'receptionist', 'core');
const CHANNELS_DIR = path.join(REPO_ROOT, 'website', 'apps', 'api', 'src', 'modules', 'receptionist', 'channels');

/**
 * A channel has leaked into the core when core *depends on* a channel — imports
 * its module, branches on its enum member, or names its classes. Not when the
 * word merely appears.
 *
 * That distinction was learned the hard way: an earlier version banned the bare
 * word `whatsapp`, and promptly failed on `contact: { whatsapp?: string }` — a
 * hospital's WhatsApp number, which is a fact to tell patients and has nothing
 * to do with transport. A check that cries wolf gets switched off, so the rules
 * below target code constructs, and a lowercase data property is left alone.
 */
const CHANNELS = 'MESSENGER|WHATSAPP|INSTAGRAM|VOICE';
const CHANNEL_NAMES = 'Messenger|WhatsApp|Instagram|Voice';

const FORBIDDEN_IN_CORE = [
  { pattern: new RegExp(`\\.\\s*(${CHANNELS})\\b`), why: 'branches on a specific channel — use SurfaceTraits' },
  { pattern: new RegExp(`from\\s+['"][^'"]*(${CHANNEL_NAMES}|messenger|whatsapp)[^'"]*['"]`, 'i'), why: 'imports a channel module' },
  {
    pattern: new RegExp(`\\b(${CHANNEL_NAMES})(Adapter|Service|Controller|Client|Gateway|Webhook|Module)\\b`),
    why: 'names a channel class',
  },
  { pattern: /\bpsid\b/i, why: 'Messenger page-scoped id' },
  { pattern: /\bpage_id\b/i, why: 'Facebook page id' },
  { pattern: /\bpageId\b/, why: 'Facebook page id' },
  { pattern: /\bwebhook\b/i, why: 'transport concern' },
  { pattern: /@nestjs\/common['"].*\b(Controller|Req|Res|Headers)\b/, why: 'HTTP concern' },
  { pattern: /\bexpress\b/i, why: 'HTTP concern' },
  { pattern: /\bRequest\b(?!ed)/, why: 'HTTP concern' },
];

/** Core may import these and nothing else from sibling modules. */
const ALLOWED_CROSS_MODULE_IMPORTS = [/\.\.\/\.\.\/prisma\//, /\.\.\/\.\.\/\.\.\/common\//];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.isFile() && e.name.endsWith('.ts') ? [full] : [];
  });
}

const violations = [];

for (const file of walk(CORE_DIR)) {
  const rel = path.relative(REPO_ROOT, file);
  // Strip CR as well as splitting on LF. Without this, every line on a Windows
  // checkout ends in `\r`, and `\r` is a line terminator that `.` does not
  // match — so the comment-stripping regexes below silently stop matching and
  // the check starts reporting every doc comment that names a channel. It
  // passed on the machine that wrote the files (LF) and failed the moment git
  // handed them back as CRLF.
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

  lines.forEach((line, i) => {
    // Comments are allowed to name channels — the ban is on code depending on
    // them, and the docs in these files explain precisely why the ban exists.
    const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
    if (!code.trim()) return;

    for (const { pattern, why } of FORBIDDEN_IN_CORE) {
      if (pattern.test(code)) {
        violations.push(`${rel}:${i + 1}  ${why}  →  ${line.trim().slice(0, 90)}`);
      }
    }

    const imp = code.match(/from\s+['"](\.\.[^'"]+)['"]/);
    if (imp) {
      const spec = imp[1];
      const escapesModule = spec.includes('../../');
      const allowed = ALLOWED_CROSS_MODULE_IMPORTS.some((p) => p.test(spec));
      if (escapesModule && !allowed) {
        violations.push(
          `${rel}:${i + 1}  core imports outside the module  →  ${spec}\n` +
            `        Only prisma/ and common/ are allowed. Anything else makes the\n` +
            `        module impossible to extract to packages/ later.`,
        );
      }
    }
  });
}

const coreFiles = walk(CORE_DIR).length;
const channelFiles = walk(CHANNELS_DIR).length;

if (violations.length) {
  console.error(`\n✗ boundary violated — ${violations.length} finding(s)\n`);
  violations.forEach((v) => console.error('  ' + v));
  console.error(
    '\n  core/ must not know which channel it is serving. Move the concern into\n' +
      '  channels/<name>/ and pass a normalised InboundMessage across.\n',
  );
  process.exit(1);
}

console.log(`✓ boundary clean — ${coreFiles} core file(s), ${channelFiles} channel file(s)`);
