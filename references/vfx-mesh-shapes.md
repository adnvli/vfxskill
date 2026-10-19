# VFX mesh shapes

> **Ported skill:** tool names in this file (`build_instances`, `capture_moments`, the `animation`, `blender` and `upload_assets` tools, "it does X") come from the original toolkit. Do each step as `tools.md` maps it, with the Studio MCP and this skill's scripts.

Load this with `vfx-design.md` and `vfx-craft.md` for mesh effects, shapes that
grow, spin and fade (a crescent slash, a shockwave ring, a swirl, a dome, a
ground wave), and for making those shapes in a Blender job.

## A Blender job

One Blender job runs one Python script with the `fx` helpers loaded
(`tools.md`: `blender_job.py`, with `--export` to write each mesh as a
`.glb`). A script that raises prints Blender's traceback; fix it and run
again. After two failed attempts at the same shape, stop and report what is
failing instead of escalating.

## Mesh effects in Studio

- **Mesh effects** are tweened shapes: a crescent slash, a shockwave ring, a
  twisting swirl, a sphere shell. Strong battleground-style games are built
  on them.
  - Build one as a Model with `Start` and `End` parts. The emit module moves
    `Start` to `End`.
  - **How the studied artists tween them** *(measured)*:
    - ease out (cubic) over 0.2-1 s;
    - a shockwave flattens (height x0.1-0.3) while it widens (x2-7) and spins
      120-170°;
    - a swirl stretches upward as it narrows.
  - **How they surface them** *(measured)*:
    - Faint `Neon` that fades out: starting `Transparency` 0.9-0.96 for white
      wind swirls, or 0 for a coloured one.
    - Black `Neon` swirls as dark accents.
    - A `SpecialMesh` (FileMesh) on an invisible part, with a Decal whose
      `Color3` is above 1 so it blooms, fading the Decal. `build_instances`
      takes colour components from 0 to 1 only, so build the Decal there and
      set `Color3.new(4, 6, 8)` and the like with `execute_luau` afterwards.
  - Use `Material = "Neon"` for a glowing shape, or `"ForceField"` with a
    texture for a shimmering, edge-lit shell. ForceField's animation speed
    cannot be controlled, so it suits a shield or aura, not a timed wipe.
  - A one-sided card mesh (a slash) needs `DoubleSided = true` to show from
    behind.
  - Under vertex colours, keep the part's `Color` white, because `Color`
    multiplies them.
  - A MeshPart's texture cannot scroll (`TextureID` has no offset) and
    ignores alpha (checked in Studio: nothing shows through). Animate the
    mesh's size, rotation and `Transparency` instead, or put a scrolling Beam
    alongside.
  - Set `RenderFidelity = Precise` on thin curved shapes. Automatic level of
    detail turns a crescent into a straight-sided wedge at distance.
  - For a texture that fades, put a `Decal` on the card's face and set the
    part's `Transparency` to 1. The emit module fades each Decal on `Start`
    toward the same-named Decal on `End`.
    - On a MeshPart, a Decal is projected across the part's box face and
      ignores UVs, so draw its texture for that projection.
    - On a part with a FileMesh `SpecialMesh`, the studied artists' Decals
      follow the mesh's surface. *(measured; not checked here)*
  - **Verified crescent slash:** two crescents from `fx.vfx_arc`.
    - A white `Neon` core goes from `Transparency` 0.05 to 1 over 0.2 s.
    - A larger blue `Neon` glow goes from 0.55 to 1 over 0.32 s.
    - Each grows from about 0.8 to 1.2 times its size with `Spin` 50 and
      `Quart` `Out`, and sparks come off the edge.
  - Make the shapes in a Blender job with `fx.vfx_arc` (crescent),
    `vfx_ring` (shockwave or blast wall), `vfx_cone`, `vfx_swirl` (tornado,
    aura), `vfx_shell` (barrier, dome) or `vfx_surface` (anything else). See
    "Shapes for mesh effects" below. Each has UVs laid out along its sweep.
  - Upload all of an effect's shapes as one model. Without Blender, a flat
    Neon cylinder part works as a ground wave.
- **Shells, domes and columns:** a large mesh that is half transparent across
  its whole surface reads as tinted plastic and covers the screen. That holds
  for a blast dome, a shockwave sphere or a light column; below a
  `Transparency` of about 0.75 it looks solid against a bright sky.
  - Keep a big shell faint (0.85-0.96, as the studied wind swirls start).
  - Or give it a texture (a Decal on a FileMesh) that puts shape on its
    surface: streaks, a broken edge.
  - Let particles and a flash carry the brightness.

## Example: a ground wave

Ground wave, a mesh effect from a flat neon cylinder, timed to the hit (replace
both parts with a Blender ring mesh for a real shockwave, which can also take
`Spin`):

```json
[
  { "op": "create", "id": "wave", "className": "Model", "name": "GroundWave",
    "attributes": { "Duration": 0.35, "Easing": "Cubic", "EasingDirection": "Out", "EmitDelay": 0.16 } },
  { "op": "create", "className": "Part", "name": "Start", "parent": "$wave",
    "properties": { "Shape": "Cylinder", "Size": [0.1, 2, 2], "Material": "Neon",
      "Color": [1, 0.75, 0.4], "Transparency": 0.55, "Anchored": true, "CanCollide": false },
    "rotation": [0, 0, 90] },
  { "op": "create", "className": "Part", "name": "End", "parent": "$wave",
    "properties": { "Shape": "Cylinder", "Size": [0.05, 20, 20], "Material": "Neon",
      "Color": [1, 0.45, 0.15], "Transparency": 1, "Anchored": true, "CanCollide": false },
    "rotation": [0, 0, 90] }
]
```

## Shapes for mesh effects

Mesh effects are shapes that grow, spin and fade in Studio: a crescent slash,
a shockwave ring, a twisting tornado, a barrier dome.
- **The named helpers** cover the common shapes.
- **`fx.vfx_surface`** builds any other shape you can describe as a
  function: a jagged shockwave, a forked lightning card, petals, a spiked
  burst, a wobbling wave.
- **Raw `bpy`** remains available for anything else: modifiers, geometry
  nodes, sculpted or boolean shapes. `--export` measures every mesh the same way (`scene.json`).

**What every shape has in common:**
- It is one open sheet, so set `DoubleSided` on the MeshPart in Studio.
- Its UVs run the same way: U along the sweep (0 at the start, 1 at the end),
  V across it (0 inside or at the bottom, 1 outside or at the top). They are
  for maps that follow the surface. In Roblox, `TextureID` ignores alpha (see
  below), so the shape itself, the part's `Transparency` and a Neon colour do
  most of the work.
- It is built around the origin, horizontal or upright, facing Roblox's
  forward (Blender -Y).
- Sizes are in studs.

**The shapes:**
- **`fx.vfx_arc(name, radius, width, sweep=160, segments=32, taper=True)`**: a
  flat crescent for a slash. It sweeps `sweep` degrees centred on forward,
  from radius - width out to radius. With `taper`, it is widest in the middle
  and pointed at both ends; U runs from the +X end to the -X end. Roll the
  MeshPart for a diagonal swing.
- **`fx.vfx_ring(name, radius, width=0.5, height=0, top_radius=None, segments=48)`**:
  - with `height` 0, a flat band on the ground: a shockwave;
  - with a height, a wall from `radius` at the bottom to `top_radius` at the
    top. A flared top makes a blast wave.
- **`fx.vfx_cone(name, radius, height, tip_radius=0, segments=32)`**: an
  open cone from its base at the origin up to its tip. Point it with the
  MeshPart's orientation, for example along the LookVector for a muzzle
  blast.
- **`fx.vfx_swirl(name, radius, height, width, turns=1.5, top_radius=None, segments=96)`**:
  a ribbon `width` tall, spiralling up `turns` times to `height`, widening
  to `top_radius`. Use it for a tornado, an aura or a charge-up.
- **`fx.vfx_shell(name, radius, segments=32, rings=16, dome=False)`**: a
  sphere, or a dome standing on the ground. Use it for a barrier or a blast
  bubble.
- **`fx.vfx_surface(name, point, columns=32, rows=1)`**: anything else.
  - `point(u, v)` returns the position of each grid corner for u and v from
    0 to 1, and that corner's UV is (u, v).
  - Corners that meet are merged, so closed loops and poles need no special
    care.
  - Vary the radius with `u` for a jagged or wobbling ring. Offset a strip
    sideways with noise for lightning. Shape a petal by tapering it with
    `v`.

```python
import bpy, math, os, random
from mathutils import Vector

random.seed(4)
spikes = [1.0 + random.uniform(-0.25, 0.45) for _ in range(24)]

def jagged(u, v):
    # A shockwave ring whose outer edge is torn into spikes.
    angle = 2 * math.pi * u
    i = u * len(spikes)
    spike = spikes[int(i) % len(spikes)] * (1 - (i % 1)) + spikes[int(i + 1) % len(spikes)] * (i % 1)
    radius = 4.0 + v * 1.5 * spike
    return Vector((math.sin(angle) * radius, -math.cos(angle) * radius, 0.0))

fx.vfx_surface("TornWave", jagged, columns=96, rows=2)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUTPUT_DIR, "torn-wave.glb"), export_format="GLB", export_apply=True, use_visible=True)
```

Put several shapes in one job and export one GLB. Each arrives as its own
MeshPart named after it. `scene.json` lists their size, UVs and triangles. Upload each `.glb` as a Model and `insert_asset` it (`tools.md`).

In Studio:
1. Set `Material` (`Neon` to glow, `ForceField` to shimmer), `Color`,
   `DoubleSided`, `RenderFidelity = Precise` and `Anchored`.
2. Turn off `CanCollide`, `CanQuery`, `CanTouch` and `CastShadow`.
3. Animate the parts with the emit module's `Start`/`End` parts (see
   `vfx-craft.md`, section 1).

What arrives, and what works on it, was checked in Studio:
- A shape arrives as a MeshPart inside a Model, under a child named after the
  node (`Crescent_Node`). A flat shape is 0.001 studs thick. Its pivot is the
  centre of its box, not the origin it was built around, so a crescent spins
  about its middle.
- Set `RenderFidelity = Precise`. With Automatic, Roblox simplifies a thin
  curved card at distance until a crescent reads as a straight-sided wedge.
- `TextureID` ignores alpha on a MeshPart: the texture's colour covers the
  whole surface, and nothing shows through. Do not put a fading texture
  there.
- What does fade:
  - **The part's own `Transparency`.** A `Neon` card fading from about 0 to 1
    is the reliable mesh effect.
  - **A `Decal` on the card's face** (`Top`, plus `Bottom` to show from
    below), on a part with `Transparency = 1`. It fades cleanly and takes
    `Color3` and `Transparency`, but it is projected across the part's box
    face and ignores the UVs. Its texture must be drawn for that flat
    projection, not along the sweep.
  - A `SurfaceAppearance` with `AlphaMode = Transparency` follows the UVs,
    but rendered dithered in Studio, and scripts cannot change its maps at
    runtime.

```python
import bpy, os

slash = fx.vfx_arc("Slash", radius=6, width=1.5, sweep=150)
wave = fx.vfx_ring("Shockwave", radius=5, width=0.8)
wave.location = (0, 0, -3)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUTPUT_DIR, "slash-effect.glb"), export_format="GLB", export_apply=True, use_visible=True)
```
