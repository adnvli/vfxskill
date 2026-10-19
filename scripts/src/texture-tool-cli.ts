import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { analyzeFlipbook, describeFlipbook } from '<upstream checkout>/apps/desktop/runtime/flipbook-sheet.ts';
import { findStudioContentDirectories, stageStudioPreviews, PREVIEW_URI_PREFIX } from '<upstream checkout>/apps/desktop/runtime/studio-preview.ts';

const [cmd, ...rest] = process.argv.slice(2);
function pngs(list: string[]): string[] {
  const out: string[] = [];
  for (const p of list) {
    if (existsSync(p) && statSync(p).isDirectory()) for (const f of readdirSync(p).sort()) { if (f.toLowerCase().endsWith('.png') && !f.includes('-preview')) out.push(path.join(p, f)); }
    else out.push(p);
  }
  return out;
}
if (cmd === 'check') {
  const files = pngs(rest).filter((f) => f.endsWith('.flipbook.png'));
  if (files.length === 0) { console.log('No <name>.flipbook.png sheets found.'); process.exit(1); }
  let bad = 0;
  for (const file of files) {
    const meta = file.replace(/\.png$/, '.json');
    const claim = existsSync(meta) ? JSON.parse(readFileSync(meta, 'utf8')) : {};
    const report = analyzeFlipbook(readFileSync(file), claim);
    if (!report.ok || report.problems.length) bad++;
    console.log(describeFlipbook(path.basename(file), report).join('\n'));
  }
  process.exit(bad ? 3 : 0);
} else if (cmd === 'preview') {
  const files = pngs(rest);
  const dirs = await findStudioContentDirectories();
  if (dirs.length === 0) {
    console.log('No Roblox Studio install found (this works on Windows only, where Studio lives in %LOCALAPPDATA%\\Roblox\\Versions). Upload the textures instead.');
    process.exit(1);
  }
  const job = randomBytes(4).toString('hex');
  const previews = await stageStudioPreviews(files.map((f) => ({ name: path.basename(f), path: f })), job, dirs);
  console.log(JSON.stringify({ job, installs: dirs.length, previews }, null, 1));
  console.log(`These ${PREVIEW_URI_PREFIX}... addresses work in Studio on this computer only. Upload settled textures and replace every one before shipping.`);
} else {
  console.log(`usage:
  node texture-tool.mjs check <dir|sheet.flipbook.png ...>   check flipbook sheets: grid, per-cell coverage, empty or cut-off cells, ParticleEmitter settings
  node texture-tool.mjs preview <dir|file.png ...>           copy PNGs into Roblox Studio's content folder (Windows) and print rbxasset:// addresses to preview them on particles without uploading`);
  process.exit(2);
}
