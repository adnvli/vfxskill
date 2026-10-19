#!/usr/bin/env node
// Upload textures, meshes or animations to Roblox through Open Cloud.
// Based on the original Open Cloud client.
//
// Needs: Node 18+, an Open Cloud API key with the "Assets" API (read + write) for
// the creator, in ROBLOX_API_KEY, and the creator in ROBLOX_USER_ID or ROBLOX_GROUP_ID.
// An animation only plays in a live game for the place's owner, so upload under the
// same user or group that owns the place.
//
//   node upload.mjs <Decal|Model|Animation|Audio|Video> <file> [displayName] [description]
//   node upload.mjs status <operationId>
//
// Textures:   Decal  (.png/.jpg/.tga/.bmp). Use the printed imageId, never the decalId.
// Meshes:     Model  (.glb/.fbx/.gltf) -> then insert_asset with the assetId.
// Animations: Animation (.rbxm) -> right-click the KeyframeSequence in Studio > Save to File.
// Every upload is moderated and permanent: upload only settled files.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://apis.roblox.com';
const KEY = process.env.ROBLOX_API_KEY || process.env.ROBLOX_OPEN_CLOUD_API_KEY;
const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', bmp: 'image/bmp', tga: 'image/tga',
  mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac',
  fbx: 'model/fbx', gltf: 'model/gltf+json', glb: 'model/gltf-binary', rbxm: 'model/x-rbxm', rbxmx: 'model/x-rbxm',
  mp4: 'video/mp4', mov: 'video/mov',
};
const TYPES = ['Decal', 'Model', 'Animation', 'Audio', 'Video'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const die = (msg, code = 1) => { console.error(msg); process.exit(code); };

if (!KEY) die('Set ROBLOX_API_KEY to an Open Cloud API key with Assets read/write (create.roblox.com > Open Cloud > API Keys).');

async function call(endpoint, init = {}) {
  const res = await fetch(`${BASE}${endpoint}`, { ...init, headers: { 'x-api-key': KEY, ...(init.headers || {}) } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) die(`${res.status} from ${endpoint}: ${typeof body === 'string' ? body.slice(0, 400) : JSON.stringify(body).slice(0, 400)}`);
  return body;
}

async function poll(opPath) {
  const id = String(opPath).replace(/^operations\//, '');
  for (let i = 0; i < 30; i++) {
    const op = await call(`/assets/v1/operations/${encodeURIComponent(id)}`);
    if (op.done) return op;
    await sleep(Math.min(1000 * (i + 1), 4000));
  }
  return { path: `operations/${id}`, done: false };
}

async function imageIdOf(decalId) {
  for (let i = 0; i < 10; i++) {
    try {
      const d = await fetch(`${BASE}/toolbox-service/v2/assets/${decalId}`, { headers: { 'x-api-key': KEY } }).then((r) => r.json());
      const t = d?.asset?.textureId;
      if (typeof t === 'number' && t > 0) return String(t);
    } catch {}
    await sleep(1500);
  }
  return null;
}

function report(op, assetType) {
  if (op.error) die(`Upload failed: ${op.error.message ?? JSON.stringify(op.error)}`);
  if (!op.done) {
    console.log(JSON.stringify({ status: 'processing', operationId: op.path }, null, 1));
    console.log(`Still processing. Check later: node upload.mjs status ${op.path}`);
    return null;
  }
  const r = op.response ?? {};
  return { assetId: r.assetId, assetType: r.assetType ?? assetType, moderation: r.moderationResult?.moderationState };
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'status') {
  if (!args[0]) die('usage: node upload.mjs status <operationId>', 2);
  const op = await poll(args[0]);
  const out = report(op);
  if (out) {
    if (out.assetType === 'Decal' || out.assetType === 'Image') out.imageId = await imageIdOf(out.assetId);
    console.log(JSON.stringify(out, null, 1));
  }
} else if (TYPES.includes(cmd)) {
  const file = args[0];
  if (!file) die('usage: node upload.mjs <Decal|Model|Animation|Audio|Video> <file> [displayName] [description]', 2);
  const ext = path.extname(file).slice(1).toLowerCase();
  if (!MIME[ext]) die(`Unsupported file type .${ext}. Supported: ${Object.keys(MIME).join(', ')}`);
  if (cmd === 'Animation' && ext !== 'rbxm' && ext !== 'rbxmx') die('An Animation uploads as .rbxm: right-click the KeyframeSequence in Studio and choose Save to File.');
  const creator = process.env.ROBLOX_GROUP_ID ? { groupId: String(process.env.ROBLOX_GROUP_ID) }
    : process.env.ROBLOX_USER_ID ? { userId: String(process.env.ROBLOX_USER_ID) } : die('Set ROBLOX_USER_ID (or ROBLOX_GROUP_ID) to the place owner.');
  const displayName = (args[1] || path.basename(file).replace(/\.(flipbook\.)?[^.]+$/, '')).slice(0, 50);
  const request = { assetType: cmd, displayName, description: args[2] || displayName, creationContext: { creator } };
  const form = new FormData();
  form.append('request', JSON.stringify(request));
  form.append('fileContent', new Blob([readFileSync(file)], { type: MIME[ext] }), path.basename(file));
  const first = await call('/assets/v1/assets', { method: 'POST', body: form });
  const op = first.done ? first : await poll(first.path);
  const out = report(op, cmd);
  if (out) {
    if (cmd === 'Decal') {
      out.decalId = out.assetId;
      out.imageId = await imageIdOf(out.assetId);
      out.use = out.imageId ? `rbxassetid://${out.imageId}` : 'imageId not resolved yet: in Studio run InsertService:LoadAsset(decalId) and read the Decal.Texture id';
    } else if (cmd === 'Animation') {
      out.use = `Animation.AnimationId = "rbxassetid://${out.assetId}"`;
    } else if (cmd === 'Model') {
      out.use = `insert_asset ${out.assetId}`;
    }
    console.log(JSON.stringify(out, null, 1));
  }
} else {
  die('usage:\n  node upload.mjs <Decal|Model|Animation|Audio|Video> <file> [displayName] [description]\n  node upload.mjs status <operationId>', 2);
}
