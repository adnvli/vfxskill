---
name: roblox-vfx-animation
description: Use for any Roblox visual effect or animation work through a Roblox Studio MCP - particles, beams, trails, slashes, hits, explosions, spells, auras, abilities, combat effects, camera shake, VFX textures and flipbooks, and R15/R6/creature animations (attacks, idles, walks, runs). Load before building or tuning any effect or animation, even a small one.
---

# Roblox animation and VFX

Works with a stock Roblox Studio MCP plus a shell. Its references record what experienced Roblox
VFX artists actually do, measured from about 5,000 particle emitters in their
published effects. Follow them: the difference between slop and a good effect
is almost entirely in those numbers (palette, dark layers, brightness against
bloom, layer timing, custom textures) and in looking at the effect frame by
frame.

**Read `references/tools.md` first, every time.** The references were written
for the original toolkit (`build_instances`, `capture_moments`, the `animation`
and `blender` tools, `upload_assets`). `tools.md` says what to use instead with
your Studio MCP and this skill's scripts. Wherever a reference names an original
tool, do what `tools.md` maps it to.

This folder (where this file is) is `SKILL_DIR` in `tools.md`.

## What's here

| Path | What it is |
| --- | --- |
| `references/tools.md` | How to do every step with the Studio MCP, the shell and Blender. |
| `references/vfx-design.md` | What the effect is for, palette, value, brightness, layers, timing. |
| `references/vfx-craft.md` | Where effects live, the emit module, layer skeletons, budgets, how to check an effect. |
| `references/vfx-textures.md` | Drawing the effect's own textures and flipbooks (Blender + numpy). |
| `references/vfx-motion.md` | Projectiles, volleys, trails, beams, slashes, dashes, orbs, auras. |
| `references/vfx-mesh-shapes.md` | Crescent and ring meshes, swirls, domes, ground waves, made in Blender. |
| `references/vfx-camera-world.md` | Camera shake, FOV, impact frames, lights, craters, cast poses. |
| `references/vfx-rendered-flipbooks.md` | Flipbooks rendered from a 3D scene. |
| `references/vfx-reference.md` | Matching a reference clip (partly: see `tools.md`). |
| `references/character-animation.md` | The pose format and tested R15/R6 recipes. |
| `references/creature-animation.md` | Rigs, `waves`, `gait`, and creature recipes. |
| `references/full.md` | Animation playback: tracks, priorities, blending, markers. |
| `templates/vfx/emit.lua` | The player module (`VFX.play`, `VFX.emit`, handles with slow-mo and hitstop). |
| `templates/vfx/build.lua` | Builds instances from the references' JSON steps. |
| `templates/vfx/capture.lua` | Holds a playing effect at chosen moments for screenshots. |
| `scripts/animate.mjs` | Pose compiler + motion checks + contact sheet + Luau output (Node 18+). |
| `scripts/read_rig.lua` | Reads a creature's rig for `animate.mjs --rig-json`. |
| `scripts/blender_job.py`, `scripts/vfx_blender.py` | Runs a Blender job with the `fx.*` texture and mesh helpers. |
| `scripts/texture-tool.mjs` | Checks flipbook sheets; previews textures in Studio without uploading. |
| `scripts/upload.mjs` | Open Cloud uploads (textures, meshes, animations). |

## Quick reference

- **Any visual effect** (a hit, slash, explosion, spell, aura or pickup): load
  `references/tools.md`, `references/vfx-design.md` and
  `references/vfx-craft.md`, plus the topics it needs:
  - `vfx-textures.md` to draw the effect's own textures (most effects should;
    built-in `rbxasset://textures/particles/*` are stand-ins only);
  - `vfx-motion.md` for anything that travels, sweeps or is held;
  - `vfx-mesh-shapes.md` for crescent, ring, swirl and dome meshes;
  - `vfx-camera-world.md` for camera, screen and ground reactions, and a cast
    pose from code;
  - `vfx-rendered-flipbooks.md` for a sheet rendered from a 3D scene;
  - `vfx-reference.md` when the user gives a reference clip.
- **The loop that makes effects good:** design (name the move, pick ~5
  colours, plan dark layers and the intensity curve) > build in
  `ReplicatedStorage.VFX` with the emit attributes > **capture it frozen at
  4-6 moments from close up and from the player's camera** > fix what the
  frames show > repeat. Never call an effect done from one screenshot or from
  the code alone.
- **A character animation:** load `references/character-animation.md` and
  `references/tools.md`; write the pose JSON from the closest recipe; run
  `scripts/animate.mjs` with `--sheet` and look at the sheet; fix until every
  check passes; send the Luau it writes with `execute_luau`; preview on a
  dummy. Check which rig (R15 or R6) the place's players use first.
- **A creature or any non-stock model:** also load
  `references/creature-animation.md`, read its rig with `scripts/read_rig.lua`
  and pass `--rig-json`.
- Load tracks through an `Animator` on a `Humanoid` or `AnimationController`;
  set `AnimationTrack.Priority` deliberately.
- Use `GetMarkerReachedSignal()` for gameplay cues (a hit landing), from a
  keyframe's `markers`; a keyframe's `name` is not a marker. Play an attack's
  effect from its marker, not a timer.
- A burst `ParticleEmitter` usually has `Rate = 0` and fires from
  `EmitCount`/`EmitDelay` through the emit module.
- Effects are presentation: the server fires an `UnreliableRemoteEvent` with
  the effect's name and a CFrame, each client calls `VFX.play`. Never let
  damage wait on an effect.
- Upload only settled textures, meshes and animations: every upload is
  permanent and moderated. Say how many you will upload first.

Effects are judged by eye. When done, tell the user what you checked and ask
them to look at it at full speed in a playtest.
