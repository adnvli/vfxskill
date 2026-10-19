// tex.ts
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import path2 from "path";
import { randomBytes } from "crypto";

// upstream/apps/desktop/runtime/flipbook-sheet.ts
import { inflateSync } from "node:zlib";
var FLIPBOOK_SIDE = 1024;
var FLIPBOOK_GRIDS = [2, 4, 8];
var MAX_FLIPBOOK_FRAMERATE = 30;
var CONTENT_THRESHOLD = 8;
var MAX_PIXELS = 2048 * 2048;
var MAX_INPUT_BYTES = 24 * 1024 * 1024;
var PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
var CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };
function decodePng(bytes) {
  if (bytes.length > MAX_INPUT_BYTES) throw new Error(`The PNG is ${bytes.length} bytes; a flipbook sheet is far smaller.`);
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Not a PNG file.");
  let offset = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = -1;
  const data = [];
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    const start = offset + 8;
    if (start + length + 4 > bytes.length) throw new Error("The PNG is truncated.");
    const chunk = bytes.subarray(start, start + length);
    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      depth = chunk[8];
      colorType = chunk[9];
      if (chunk[12] !== 0) throw new Error("The PNG is interlaced; save it without interlacing.");
      if (colorType === 3) throw new Error("The PNG uses a colour palette; save it as RGBA.");
      if (CHANNELS[colorType] === void 0 || depth !== 8 && depth !== 16) {
        throw new Error(`The PNG has colour type ${colorType} at ${depth} bits; save it as 8-bit RGBA.`);
      }
      if (width < 1 || height < 1 || width * height > MAX_PIXELS) throw new Error(`The PNG is ${width} x ${height}; a flipbook sheet is 1024 x 1024.`);
    } else if (type === "IDAT") {
      data.push(chunk);
    } else if (type === "IEND") {
      break;
    }
    offset = start + length + 4;
  }
  if (colorType < 0) throw new Error("The PNG has no header.");
  const channels = CHANNELS[colorType];
  const bytesPerPixel = channels * (depth / 8);
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(data), { maxOutputLength: (stride + 1) * height + 1 });
  if (raw.length < (stride + 1) * height) throw new Error("The PNG's image data is shorter than its size says.");
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const above = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : void 0;
    for (let x = 0; x < stride; x++) {
      const left = x >= bytesPerPixel ? out[x - bytesPerPixel] : 0;
      const up = above ? above[x] : 0;
      const corner = above && x >= bytesPerPixel ? above[x - bytesPerPixel] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += left + up >> 1;
      else if (filter === 4) {
        const p = left + up - corner;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - corner);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
      } else if (filter !== 0) throw new Error(`The PNG uses an unknown filter (${filter}).`);
      out[x] = value & 255;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  const step = depth / 8;
  for (let i = 0; i < width * height; i++) {
    const at = (channel) => pixels[i * bytesPerPixel + channel * step];
    const grey = channels <= 2;
    rgba[i * 4] = at(0);
    rgba[i * 4 + 1] = grey ? at(0) : at(1);
    rgba[i * 4 + 2] = grey ? at(0) : at(2);
    rgba[i * 4 + 3] = channels === 2 ? at(1) : channels === 4 ? at(3) : 255;
  }
  return { width, height, rgba, hasAlpha: channels === 2 || channels === 4 };
}
function contentMask(image) {
  const { width, height, rgba } = image;
  const corners = [0, width - 1, (height - 1) * width, height * width - 1];
  const transparent = image.hasAlpha && corners.every((i) => rgba[i * 4 + 3] <= CONTENT_THRESHOLD);
  const black = corners.every((i) => Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]) <= CONTENT_THRESHOLD);
  const background = transparent ? "transparent" : black ? "black" : "other";
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const alpha = rgba[i * 4 + 3];
    const bright = Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    mask[i] = background === "transparent" ? alpha > CONTENT_THRESHOLD ? 1 : 0 : alpha > CONTENT_THRESHOLD && bright > CONTENT_THRESHOLD ? 1 : 0;
  }
  return { mask, background };
}
function gutterClear(mask, side, grid) {
  const cell = side / grid;
  for (let k = 1; k < grid; k++) {
    for (const line of [k * cell - 1, k * cell]) {
      for (let t = 0; t < side; t++) {
        if (mask[line * side + t] || mask[t * side + line]) return false;
      }
    }
  }
  return true;
}
function analyzeFlipbook(png, claim = {}) {
  const image = decodePng(png);
  const problems = [];
  const { mask, background } = contentMask(image);
  const base = { width: image.width, height: image.height, background, coverage: [], emptyCells: [], edgeCells: [], repeatedCells: [] };
  if (image.width !== FLIPBOOK_SIDE || image.height !== FLIPBOOK_SIDE) {
    return { ...base, ok: false, problems: [`The sheet is ${image.width} x ${image.height}; make it 1024 x 1024, the size seen playing as a flipbook in Roblox.`] };
  }
  const side = FLIPBOOK_SIDE;
  const detectedGrid = [...FLIPBOOK_GRIDS].reverse().find((grid2) => gutterClear(mask, side, grid2));
  const claimed = FLIPBOOK_GRIDS.find((grid2) => grid2 === claim.grid);
  if (claim.grid !== void 0 && claimed === void 0) problems.push(`The script claims a ${claim.grid} x ${claim.grid} grid; Roblox's layouts are 2 x 2, 4 x 4 and 8 x 8.`);
  if (claimed !== void 0 && !gutterClear(mask, side, claimed)) {
    problems.push(`Drawing crosses the cell boundaries of the claimed ${claimed} x ${claimed} grid, so frames run into each other or the sheet is not laid out on that grid.`);
  }
  if (background === "other") problems.push("The sheet's corners are neither transparent nor black, so it has no clear background: use a transparent film for alpha blending, or a black world for additive.");
  const grid = claimed ?? detectedGrid;
  if (grid === void 0) {
    problems.push("No 2 x 2, 4 x 4 or 8 x 8 grid fits: drawing crosses the boundaries of every one.");
    return { ...base, ok: false, problems };
  }
  const cell = side / grid;
  const padding = Math.max(0, Math.min(cell / 4, Math.floor(claim.padding ?? 0)));
  const band = padding + 2;
  const coverage = [];
  const emptyCells = [];
  const edgeCells = [];
  const repeatedCells = [];
  let previous;
  for (let row = 0; row < grid; row++) {
    for (let column = 0; column < grid; column++) {
      const index = row * grid + column;
      let drawn = 0;
      let touches = false;
      const bytes = Buffer.alloc(cell * cell * 4);
      for (let y = 0; y < cell; y++) {
        const sheetRow = row * cell + y;
        image.rgba.copy(bytes, y * cell * 4, (sheetRow * side + column * cell) * 4, (sheetRow * side + column * cell + cell) * 4);
        for (let x = 0; x < cell; x++) {
          if (!mask[sheetRow * side + column * cell + x]) continue;
          drawn++;
          if (x < band || y < band || x >= cell - band || y >= cell - band) touches = true;
        }
      }
      coverage.push(Math.round(drawn / (cell * cell) * 1e3) / 10);
      if (drawn === 0) emptyCells.push(index);
      if (touches) edgeCells.push(index);
      if (previous !== void 0 && previous.equals(bytes)) repeatedCells.push(index);
      previous = bytes;
    }
  }
  const cells = grid * grid;
  let fadedTail = 0;
  if (claim.loop === false) {
    while (fadedTail < emptyCells.length && emptyCells[emptyCells.length - 1 - fadedTail] === cells - 1 - fadedTail) fadedTail++;
  }
  const blinking = emptyCells.slice(0, emptyCells.length - fadedTail);
  if (emptyCells.length === cells) problems.push("Every cell is empty: nothing was rendered, or the subject is outside the camera's view.");
  else if (blinking.length > 0) {
    problems.push(`${blinking.length} of ${cells} cells are empty (${listCells(blinking)}); Roblox plays every cell, so a particle blinks out on each.`);
  }
  if (edgeCells.length > 0) problems.push(`Drawing reaches the edge of ${edgeCells.length} cell${edgeCells.length === 1 ? "" : "s"} (${listCells(edgeCells)}): it is cut off there. Draw it smaller, or frame it smaller with the camera further back.`);
  const notes = [];
  if (repeatedCells.length > 0) notes.push(`${repeatedCells.length} cell${repeatedCells.length === 1 ? " repeats" : "s repeat"} the one before (${listCells(repeatedCells)}): the animation holds there. Fine for a pause; otherwise animate more frames or use a smaller grid.`);
  const fps = claim.fps !== void 0 && claim.fps > 0 ? claim.fps : void 0;
  const lifetime = claim.loop === false && fps !== void 0 ? Math.round(cells / fps * 100) / 100 : void 0;
  const framerate = claim.loop !== false && fps !== void 0 ? Math.min(MAX_FLIPBOOK_FRAMERATE, Math.round(fps)) : void 0;
  const settings = {
    FlipbookLayout: `Grid${grid}x${grid}`,
    FlipbookMode: claim.loop === false ? "OneShot" : "Loop",
    LightEmission: background === "black" ? 1 : 0,
    ...lifetime === void 0 ? {} : { lifetime },
    ...framerate === void 0 ? {} : { framerate }
  };
  return { ...base, ok: problems.length === 0, detectedGrid, grid, coverage, emptyCells, edgeCells, repeatedCells, problems, notes, settings };
}
function listCells(cells) {
  const shown = cells.slice(0, 8).map((cell) => `#${cell + 1}`).join(", ");
  return cells.length > 8 ? `${shown} and ${cells.length - 8} more` : shown;
}
function describeFlipbook(name, report) {
  const lines = [`- ${name}: ${report.width} x ${report.height}, ${report.background} background${report.grid === void 0 ? "" : `, ${report.grid} x ${report.grid} grid${report.detectedGrid === report.grid ? " (its gutters agree)" : ""}`}.`];
  if (report.coverage.length > 0) {
    lines.push(`  Coverage per cell, in play order (% drawn): ${report.coverage.map((value) => value.toFixed(0)).join(" ")}`);
  }
  for (const problem of report.problems) lines.push(`  Problem: ${problem}`);
  for (const note of report.notes ?? []) lines.push(`  Note: ${note}`);
  if (report.settings !== void 0) {
    const { FlipbookLayout, FlipbookMode, LightEmission, lifetime, framerate } = report.settings;
    lines.push(`  On a ParticleEmitter: FlipbookLayout = ${FlipbookLayout}, FlipbookMode = ${FlipbookMode}, LightEmission = ${LightEmission}${lifetime === void 0 ? "" : `, Lifetime = ${lifetime} (OneShot plays the sheet once per lifetime)`}${framerate === void 0 ? "" : `, FlipbookFramerate = ${framerate} (the speed it was animated at${framerate === MAX_FLIPBOOK_FRAMERATE ? ", or Roblox's limit of 30" : ""})`}.`);
  }
  return lines;
}

// upstream/apps/desktop/runtime/studio-preview.ts
import fs from "node:fs/promises";
import path from "node:path";

// upstream/apps/desktop/shared/model-preview.ts
var MAX_MODEL_PREVIEW_BYTES = 24 * 1024 * 1024;

// upstream/apps/desktop/runtime/model-preview.ts
var JOB_RETENTION_MS = 7 * 24 * 60 * 60 * 1e3;

// upstream/apps/desktop/runtime/studio-preview.ts
var PREVIEW_FOLDER = "vfx-preview";
var PREVIEW_URI_PREFIX = `rbxasset://textures/${PREVIEW_FOLDER}/`;
var PREVIEW_RETENTION_MS = JOB_RETENTION_MS;
var MAX_KEPT_PREVIEWS = 200;
var PREVIEW_NAME = /^[0-9a-f]{8}-[A-Za-z0-9_-]{1,80}\.png$/;
var STUDIO_EXECUTABLE = "RobloxStudioBeta.exe";
async function findStudioContentDirectories(env = process.env, platform = process.platform) {
  if (platform !== "win32" || typeof env.LOCALAPPDATA !== "string" || env.LOCALAPPDATA === "") return [];
  const versions = path.join(env.LOCALAPPDATA, "Roblox", "Versions");
  const entries = await fs.readdir(versions, { withFileTypes: true }).catch(() => []);
  const found = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith("version-")) continue;
    const install = path.join(versions, entry.name);
    const studio = await fs.stat(path.join(install, STUDIO_EXECUTABLE)).catch(() => void 0);
    const content = await fs.stat(path.join(install, "content")).catch(() => void 0);
    if (studio?.isFile() && content?.isDirectory()) found.push(path.join(install, "content"));
  }
  return found.sort();
}
function previewStem(fileName) {
  const stem = path.basename(fileName).replace(/\.png$/i, "").replace(/\.flipbook$/i, "");
  const safe = stem.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 80);
  return safe === "" ? "texture" : safe;
}
async function stageStudioPreviews(files, jobId, contentDirectories, now = Date.now()) {
  if (!/^[0-9a-f]{8}$/.test(jobId)) throw new Error(`not a job id: ${jobId}`);
  if (contentDirectories.length === 0 || files.length === 0) return [];
  const previews = [];
  const used = /* @__PURE__ */ new Set();
  for (const file of files) {
    let stem = previewStem(file.name);
    for (let n = 2; used.has(stem); n++) stem = `${previewStem(file.name)}_${n}`;
    used.add(stem);
    previews.push({ name: file.name, uri: `${PREVIEW_URI_PREFIX}${jobId}-${stem}.png` });
  }
  for (const content of contentDirectories) {
    const folder = path.join(content, "textures", PREVIEW_FOLDER);
    await fs.mkdir(folder, { recursive: true });
    await prunePreviews(folder, now);
    for (const [index, file] of files.entries()) {
      const target = path.join(folder, previews[index].uri.slice(PREVIEW_URI_PREFIX.length));
      await fs.copyFile(file.path, target);
      await fs.utimes(target, now / 1e3, now / 1e3);
    }
  }
  return previews;
}
async function prunePreviews(folder, now = Date.now()) {
  const names = (await fs.readdir(folder).catch(() => [])).filter((name) => PREVIEW_NAME.test(name));
  const dated = [];
  for (const name of names) {
    const stat = await fs.stat(path.join(folder, name)).catch(() => void 0);
    if (stat?.isFile()) dated.push({ name, time: stat.mtimeMs });
  }
  dated.sort((a, b) => b.time - a.time);
  for (const [index, entry] of dated.entries()) {
    if (index >= MAX_KEPT_PREVIEWS || now - entry.time > PREVIEW_RETENTION_MS) {
      await fs.rm(path.join(folder, entry.name), { force: true }).catch(() => void 0);
    }
  }
}

// tex.ts
var [cmd, ...rest] = process.argv.slice(2);
function pngs(list) {
  const out = [];
  for (const p of list) {
    if (existsSync(p) && statSync(p).isDirectory()) for (const f of readdirSync(p).sort()) {
      if (f.toLowerCase().endsWith(".png") && !f.includes("-preview")) out.push(path2.join(p, f));
    }
    else out.push(p);
  }
  return out;
}
if (cmd === "check") {
  const files = pngs(rest).filter((f) => f.endsWith(".flipbook.png"));
  if (files.length === 0) {
    console.log("No <name>.flipbook.png sheets found.");
    process.exit(1);
  }
  let bad = 0;
  for (const file of files) {
    const meta = file.replace(/\.png$/, ".json");
    const claim = existsSync(meta) ? JSON.parse(readFileSync(meta, "utf8")) : {};
    const report = analyzeFlipbook(readFileSync(file), claim);
    if (!report.ok || report.problems.length) bad++;
    console.log(describeFlipbook(path2.basename(file), report).join("\n"));
  }
  process.exit(bad ? 3 : 0);
} else if (cmd === "preview") {
  const files = pngs(rest);
  const dirs = await findStudioContentDirectories();
  if (dirs.length === 0) {
    console.log("No Roblox Studio install found (this works on Windows only, where Studio lives in %LOCALAPPDATA%\\Roblox\\Versions). Upload the textures instead.");
    process.exit(1);
  }
  const job = randomBytes(4).toString("hex");
  const previews = await stageStudioPreviews(files.map((f) => ({ name: path2.basename(f), path: f })), job, dirs);
  console.log(JSON.stringify({ job, installs: dirs.length, previews }, null, 1));
  console.log(`These ${PREVIEW_URI_PREFIX}... addresses work in Studio on this computer only. Upload settled textures and replace every one before shipping.`);
} else {
  console.log(`usage:
  node texture-tool.mjs check <dir|sheet.flipbook.png ...>   check flipbook sheets: grid, per-cell coverage, empty or cut-off cells, ParticleEmitter settings
  node texture-tool.mjs preview <dir|file.png ...>           copy PNGs into Roblox Studio's content folder (Windows) and print rbxasset:// addresses to preview them on particles without uploading`);
  process.exit(2);
}
