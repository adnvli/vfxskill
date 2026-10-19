# VFX textures

> **Ported skill:** tool names in this file (`build_instances`, `capture_moments`, the `animation`, `blender` and `upload_assets` tools, "it does X") come from the original toolkit. Do each step as `tools.md` maps it, with the Studio MCP and this skill's scripts.

Load this with `vfx-design.md` and `vfx-craft.md` when an effect draws its own
textures, which most effects should: what the studied textures look like,
drawing textures and flipbooks in a Blender job, previewing them in Studio, and
uploading the settled set.

## A Blender job

One job runs one Python script in Blender, in the background:
`blender -b --factory-startup --python SKILL_DIR/scripts/blender_job.py -- job.py OUT_DIR`
(`tools.md` has the details, and the loader for a Blender MCP). `bpy`,
`numpy`, `OUTPUT_DIR` and the `fx` helpers below are defined. A script that
raises prints Blender's traceback. Fix the cause and run the corrected
script; after two failed attempts at the same texture, stop and report what is
failing instead of escalating.

## What textures look like

- **They are custom.** In the first study 915 distinct textures appear, and
  only 8 emitters used a Roblox built-in *(measured)*.
- **White, with the shape in alpha.** The particle's `Color` tints them.
- **Two families, and the blend tells them apart** *(measured: the 1,215
  textures behind 4,950 studied particle emitters)*:
  - **Drawn matter:** slashes and claws, puffs, cel bursts, splashes, debris,
    flame tongues. Edges are crisp: alpha is binary with a 1-2 px anti-aliased
    rim, or posterised to about 16 steps (the 49-sheet hand-drawn set is all
    drawn matter). Most of it sits at `LightEmission` 0, where 57% of
    emitters use a crisp or nearly crisp texture. Most flipbooks are drawn
    matter: 65% of flipbook emitters use a crisp or nearly crisp sheet.
  - **Light:** flares and glints, glows, halos, lens streaks, soft shock
    rings, ray bursts and dots. Brightness falls off smoothly from a hot core
    or line, and the shape keeps the symmetry of light (below). Of the
    `LightEmission` 1 emitters, 83% use a texture that falls off softly; so
    do 77% of emitters that use a single image rather than a sheet.
- **Smoke is where the styles part.** Of the 1,108-texture community kit's
  113 smoke, fog and cloud textures, 73 are soft-edged billows with light and
  dark mottling inside, 29 put a crisp silhouette around a soft, mottled
  inside, and 11 are flat cel puffs *(measured)*. Cel puffs are the clean
  toon look. A brief that asks for weight or grit, or says "not cartoonish",
  wants the mottled kind (the examples below have both). A ground slam asked to
  be "heavy and brutal, not cartoonish" got two-tone cel dust that read as
  cotton balls *(seen in a run)*. Soft is not the failure; no silhouette and
  no contrast inside is.
- **Detail from negative space, not shading.** Holes, notches, overhangs and
  scribbled interior strokes. Stroke width tapers as with pen pressure.
  Drawn silhouettes are asymmetric. When there is shading, it is one or two
  flat tones (a lit and a shadow side).
  - Holes belong where a shape breaks apart (a puff thinning out, a burst's
    last frames) or where the cut-out is the design (a ring, a crescent).
  - **A flash's centre is solid, glowing, or a deliberate ring.** In a
    1,108-texture community kit, flashes have a solid or bright centre, or
    are a ring of rays around a fully empty middle (8 of its 92 shines). Only
    one, a shatter burst, has scattered holes in its core. A few small holes
    punched into a solid core read as beads, eyes or a face, not as detail.
- **Common shapes:** crescents and claws, lumpy puffs, wobbly rings, wisps,
  flame tongues, zig-zags, spiky stars, splinters, shaded rocks and dots.
- **Frames change by growing and then breaking apart.** A shape grows with
  an ease-out to a peak around frame 4-6, then is eaten into 2-6 fragments.
  The last few cells may be blank, so a one-shot particle vanishes early.
  Most sheets are 4 x 4. Across 463 one-shot sheets in the study, 57% break
  apart, 15% shrink and fade, and 6% erode in one piece; the drawing is
  largest at a median 27% of the way through, and half end in blank cells.
  4 x 4 is on 81% of flipbook emitters *(measured)*.
- **Size within the cell varies.**
  - Many sheets fill most of the cell at their largest frame.
  - The hand-drawn set keeps shapes small: half span less than 27% of the
    cell, and the particle's `Size` does the scaling.

  Either works; what matters is the edge and the motion.
- **What made a generic texture look generic:**
  - the original first attempt: soft, grey, rendered smoke with no silhouette, low
    contrast, and frames that barely changed.
  - A later attempt: a perfectly radial impact star with even, thin outlines,
    a snowflake-symmetric frost patch, and a ring with gear-like notches. They
    read as clip art and icons, not drawings.
- **Drawn matter is not symmetric, not even.** Hand-drawn shapes are
  lopsided, with uneven counts, lengths and spacing, and strokes that taper.
  Draw them as tapered strokes, lumpy blobs and warped coordinates
  (`tex_stroke`, `tex_blob`, `tex_warp`), not as rays and rings around a
  centre.
- **Light keeps the symmetry of light.**
  - **Four-point flares and glints** *(measured: 19 in the study, on 124
    emitters)*: in 16 of the 19, four straight arms of the same length
    (within 4%). Each arm thins and fades toward its tip from one smooth hot
    core, often with a faint halo. 16 fall off softly; 2 are a crisp star
    with smooth concave sides. None has bent arms or a lumpy core. Of the
    other three, one is a tiny glint, one a horizontal lens streak, and one
    has a longer lower arm.
  - **The texture stays symmetric; the emitter stretches it.** 41% of those
    emitters squash the flare, twice the rate of other soft textures, and
    most rotate it as they do any layer. They live about 0.35 s, shorter
    than the 0.5 s of most layers, at `LightEmission` 1 and Brightness 5-12
    for the most part.
  - **Glows and dots** are round. **Lens streaks** are a thin horizontal line
    through a hot centre. **Soft shock rings** are even. **Ray bursts** are
    straight rays of uneven length from one hot centre.
  - Made lopsided, lumpy or hard-cut, light reads as a broken drawing: a
    flare drawn as four bent strokes around a lumpy blob, with a glow pasted
    underneath, looked wrong to the user *(seen in a run)*.
- **Symbols are precise too.** The kit's 93 symbols
  (sigils, runes, zodiac and alchemy signs) have clean geometry and even
  line weight, all but a brush-drawn glyph and a few blurred icons, though a
  single sign may be lopsided, as Scorpio is. The eight magic circles
  studied, from its symbols and rings, are symmetric too. Their richness
  comes from density:
  - ornament inside the circle, such as leaves, a filigree, an inscribed
    triangle or a compass star;
  - a rune band of many small glyphs packed into a thin ring, which reads
    as script. A dozen large glyphs read as letters instead.
  Make the effect around a sigil lopsided, not the sigil.

Draw them with `fx.draw_flipbook` (below).

## Drawing, previewing and uploading

**Draw your own.** In a Blender job, `fx.draw_flipbook` and
`fx.draw_texture` draw textures with numpy (below):
- describe a shape from coordinates;
- break it up with noise;
- cut it with a hard edge;
- eat it away over the frames.

Check each sheet with `texture-tool.mjs check` and look at it. One job can make
every texture an effect needs. `fx.flipbook` renders a 3D scene into a
sheet instead, for a lit volume or simulation (`vfx-rendered-flipbooks.md`).

- **Preview first.** `node SKILL_DIR/scripts/texture-tool.mjs preview OUT_DIR`
  returns an `rbxasset://textures/vfx-preview/...` address for each
  texture (Windows Studio installs). That address plays on a particle in
  Studio as an upload would, so iterate on textures inside the effect for
  free.
  - A redraw gets new addresses: preview it again.
  - The addresses work on this computer only; players see nothing there.
- **Upload:** upload only the settled set (`tools.md`, "Uploading"), each
  file as a `Decal`, and use each result's `imageId` as
  `rbxassetid://<imageId>`.
  - Every upload is irreversible and moderated, so upload only the settled
    set, and say how many uploads a request will use before uploading.
  - Then replace every preview address left in the place (see "To use a
    sheet" below).
  - Reuse one texture across layers by changing `Color`, `Size`, `Rotation`
    and `Squash`.
- **Size:** keep a single texture square, 512 px or less, and 256 px for
  small ones; memory scales with pixels. A flipbook sheet is 1024 x 1024.
- **White on transparency** suits almost everything: the particle's `Color`
  tints it, and `LightEmission` picks the blending (`vfx-design.md`, section 4). Bake onto black
  (`mode="additive"`) only for a layer that will only ever be additive.
- Roblox has no multiply or premultiplied mode. For darkening, use a black
  layer at `LightEmission` 0, or negative `LightEmission`.

**Flipbook rules:**

- `FlipbookLayout` is `Grid2x2`, `Grid4x4` or `Grid8x8` (4, 16 or 64 frames).
  4 x 4 is the usual choice. `Custom` with `FlipbookSizeX/Y` was in client
  beta from October 2025; do not rely on it until confirmed.
- Make the sheet 1024×1024, the size uploaded and seen playing frame by frame.
  That is 512 px a frame at 2×2, 256 at 4×4 and 128 at 8×8.
- Do not judge a sheet by `FlipbookIncompatible`. Studio shows "Particle
  texture must be 1024 by 1024 to use flipbooks." there even for a 1024 sheet
  that plays, and for a texture with no flipbook layout at all. Every studied
  emitter carries the message.
- To check a sheet, hold one particle at a few ages (`TimeScale = 0`) and
  screenshot it. Each capture should show one frame, not the whole grid.
- Leave a few pixels of empty space inside each cell. A frame that touches its
  cell edge bleeds into its neighbour.
- `FlipbookMode`:
  - `OneShot` plays once across the particle's lifetime. It is almost always
    the choice for a burst *(measured)*.
  - `Loop` repeats at `FlipbookFramerate` (at most 30 fps);
  - `PingPong` plays forward and back;
  - `Random` shows one random frame.
  - Use `Loop` with `FlipbookStartRandom = true` for a burning fire.
- Some low-memory devices switch flipbooks off, so the first frame should
  still read on its own.


## Particle textures and flipbooks

A particle texture decides most of how an effect looks. Most textures by
experienced Roblox VFX artists are 2D images, not renders, white on
transparency so the particle's `Color` tints them. They come in two families
(see "What textures look like" above): drawn matter, a hard-edged silhouette
cel-shaded in two or three flat tones, and light, a soft falloff from a hot
core.

- **Shapes:** flame tongues, spiky impact stars, crisp smoke puffs with a lit
  and a shadow side, crescents and claws, wobbly rings, wisps, zig-zags,
  splinters and shaded rocks are drawn matter. Four-point flares, glows,
  halos, lens streaks, soft shock rings and dots are light.
- **Edges:** drawn matter is crisp: alpha is binary with a 1-2 px
  anti-aliased rim, or posterised to about 16 steps. Light falls off softly
  and is not cut.
- **Detail:** from negative space (holes, notches, overhangs, scribbled
  interior strokes) and tapering stroke widths, not from shading. Silhouettes
  are asymmetric. Three exceptions:
  - a flash keeps a solid centre;
  - light keeps its symmetry: a four-point flare mirrors on both axes with
    equal arms, and a glow is round;
  - a symbol (a sigil, magic circle or rune band) is precise and symmetric.
- **Trails and beams** take a texture too, drawn as a vertical strip: the
  image's top is a Trail's head and its left edge `Attachment0` (see
  `vfx-motion.md`).
- **Frames:** 4 x 4 sheets are the most common. The shape grows to a peak
  around frame 4-6, then breaks into 2-6 pieces; the last cells may be blank.
- **Size in the cell varies.** Many sheets fill most of the cell. The
  hand-drawn set keeps shapes small (half span less than 27% of the cell) and
  lets the particle's `Size` scale them.
- **Glows:** soft round glows are one layer among many, not the effect.

A soft, grey, rendered smoke ball with no silhouette, whose frames barely
change, is the look to avoid. It reads as a smudge at game distance.

There are two ways to make one: drawing with numpy (below), or rendering a 3D
scene (`vfx-rendered-flipbooks.md`). Both write a sheet that `texture-tool.mjs check`
checks the same way.

### Drawing with numpy

`fx.draw_flipbook(name, frame, grid=4, loop=False, fps=None, mode="alpha", padding=4)`
calls `frame(t, size)` once per cell and packs the results into
`<name>.flipbook.png`. `t` runs from 0 at the first frame to 1 at the last.
`frame` returns one of:
- the alpha (a `size` x `size` array, 0..1) of a white shape;
- `(alpha, value)`, where `value` is a grey level (a number or an array), so
  one shape can carry a lit and a shadow tone under one `Color`;
- an RGB or RGBA array, when the colour must be baked in.

`fx.draw_texture(name, image, size=512)` writes one texture as
`<name>.png`, from an array or a function of `size`.

Look at every texture a job draws (read the PNGs as images; a dark ground
behind the transparency helps). The ground is only for looking: in the game
a texture is tinted by `Color` and shows over the scene. Draw only the
textures themselves, with no review copies.

The building blocks:

| Helper | Gives |
| --- | --- |
| `tex_coords(size)` | `x, y` arrays from -1 to 1, x right and y up |
| `tex_polar(x, y)` | `r, angle`: distance from the centre and the angle |
| `tex_noise(size, scale, octaves, seed)` | Smooth noise in 0..1 that tiles |
| `tex_cells(size, cells, seed)` | Voronoi `near, edge`: detail inside a shape. Even cells drawn as the whole shape read as floor tiles or a turtle shell |
| `tex_sample(image, u, v)` | `image` looked up at 0..1 with wrapping, to scroll or warp noise per frame |
| `tex_curve(points, samples, closed)` | A smooth path through control points |
| `tex_stroke(x, y, path, width, start, end)` | A brush stroke along a path, with width tapering from head to tail, drawn on or erased by `start` and `end` |
| `tex_blob(x, y, radius, lumps, roughness, seed)` | A lumpy, lopsided blob in one solid piece, about `radius` from the centre, for a puff or a body. `roughness` runs from 0 (a disc) to 1 |
| `tex_warp(x, y, amount, scale, seed, t)` | Coordinates pushed around by noise, so whatever is drawn with them is organic |
| `tex_edge(value, at, soft)` | The hard edge of drawn matter: 0 below `at`, 1 above it, blended over `soft` |
| `tex_ease(t, power)` | Ease out, for a burst that grows fast then slows |

`tex_stroke`, `tex_blob` and the shapes below are fields: positive inside,
negative outside. Combine them with `numpy.maximum` (union) and
`numpy.minimum` (intersection), and subtract one with `numpy.minimum(a, -b)`.

The helpers are shortcuts, not the whole vocabulary: a texture is any numpy
array. Drawn matter is easiest with them; light is easiest written directly
as a falloff (see "Light" below).

The pattern behind drawn matter:
1. **Draw the shape the way an artist would:**
   - brush strokes that taper (`tex_stroke` along a `tex_curve`) for claws,
     crescents, wisps, cracks and splinters;
   - lumpy blobs (`tex_blob`) for puffs;
   - a disc minus an offset disc for a crescent.
2. **Make it lopsided.** Draw with `tex_warp` coordinates and uneven
   random counts, lengths and widths. Even spacing, mirror symmetry and
   uniform line width read as clip art.
3. **Cut it** with `tex_edge` (soft about 0.006-0.01) for a crisp silhouette.
4. **Animate it:**
   - grow it with `tex_ease(t)`, or draw a stroke on by raising `end`;
   - break it apart with a rising threshold on noise, such as
     `tex_edge(noise - t * 1.1)`, or erase a stroke from its head by raising
     `start`.

Five examples, each run in Blender 5.2:
- a claw slash that sweeps on and breaks off;
- a lopsided cel-shaded puff;
- heavy dust, mottled rather than cel, for a brief that asks for weight or
  grit;
- a splinter burst;
- branching ground cracks.

Change the shapes, counts and curves freely; they show the pattern, not a
house style.

```python
import numpy

NOISE = fx.tex_noise(256, scale=6, seed=1)

# Claw slash: a fat crescent stroke with a sharp tail that sweeps on, then thins and breaks off from the head.
CLAW = fx.tex_curve([(-0.55, -0.45), (-0.6, 0.2), (-0.1, 0.62), (0.5, 0.45), (0.7, -0.05)])

def claw(t, size):
    x, y = fx.tex_coords(size)
    wx, wy = fx.tex_warp(x, y, amount=0.06, scale=3, seed=2)
    def width(u):                                           # fat near the head, tapering to a point
        return 0.62 * (1 - u) ** 0.8 * numpy.sin(numpy.clip(u * 5, 0, 1) * numpy.pi / 2) * (1 - t * 0.7)
    shape = fx.tex_stroke(wx, wy, CLAW, width,
                             start=numpy.clip((t - 0.45) * 1.6, 0, 1), end=0.15 + 0.85 * fx.tex_ease(t * 3))
    return fx.tex_edge(shape, soft=0.006)

# Cel-shaded puff: a lumpy blob with a lit side and a shadow side, holes that grow until it splits.
def puff(t, size):
    x, y = fx.tex_coords(size)
    wx, wy = fx.tex_warp(x, y, amount=0.08, scale=4, seed=5, t=t * 0.3)
    radius = 0.22 + 0.38 * fx.tex_ease(t * 2.2)
    body = fx.tex_blob(wx, wy, radius=radius, lumps=9, roughness=0.75, seed=4)
    lit = fx.tex_blob(wx + 0.1, wy - 0.1, radius=radius, lumps=9, roughness=0.75, seed=4)   # the same blob, offset toward the light
    holes = fx.tex_sample(NOISE, x * 0.45 + 0.3, y * 0.45 + t * 0.2) - t * 1.25 + 0.62
    alpha = fx.tex_edge(body, soft=0.006) * fx.tex_edge(holes + body * 0.4, soft=0.01)
    return alpha, 0.5 + 0.5 * fx.tex_edge(lit, 0.03, soft=0.006)   # two tones: shadow 0.5, lit 1

# Heavy dust, not cel: a rim broken by small billows, a mottled inside of light and dark, torn apart by ragged holes.
BILLOWS = fx.tex_noise(256, scale=5, octaves=5, seed=7)
GRIT = fx.tex_noise(256, scale=16, octaves=3, seed=9)

def dust(t, size):
    x, y = fx.tex_coords(size)
    wx, wy = fx.tex_warp(x, y, amount=0.1, scale=5, seed=3, t=t * 0.4)
    radius = 0.2 + 0.26 * fx.tex_ease(t * 2) + 0.06 * t                     # keeps swelling after the burst
    body = fx.tex_blob(wx, wy, radius=radius, lumps=11, roughness=0.8, seed=6)
    churn = fx.tex_sample(BILLOWS, x * 0.7 + t * 0.3, y * 0.7 - t * 0.5)     # billows that roll as it grows
    edge = body + (fx.tex_sample(GRIT, x + t * 0.2, y) - 0.5) * 0.28          # small billows and wisps break the rim
    holes = fx.tex_sample(NOISE, x * 0.5 + 0.2, y * 0.5 + t * 0.3) - t * 1.4 + 0.55
    alpha = fx.tex_edge(edge, soft=0.01) * fx.tex_edge(holes + body * 0.3, soft=0.05)
    shade = 0.5 + (churn - 0.5) * 1.9 + 0.15 * numpy.clip(y / radius, -1, 1)      # strong light and dark, lighter on top
    return alpha, numpy.clip(shade, 0.12, 0.95)

# Splinter burst: uneven tapered strokes flung out at irregular angles and lengths, then erased from the centre.
RNG = numpy.random.default_rng(11)
SPLINTERS = [(RNG.uniform(0, 2 * numpy.pi), RNG.uniform(0.25, 0.85), RNG.uniform(0, 0.25), RNG.uniform(-0.15, 0.15), RNG.uniform(0.07, 0.16)) for _ in range(9)]

def splinters(t, size):
    x, y = fx.tex_coords(size)
    field = numpy.full_like(x, -1.0)
    reach = fx.tex_ease(t * 2.5)
    for angle, length, inner, bend, width in SPLINTERS:
        a = (numpy.cos(angle) * inner * reach, numpy.sin(angle) * inner * reach)
        b = (numpy.cos(angle) * length * reach, numpy.sin(angle) * length * reach)
        middle = ((a[0] + b[0]) / 2 - numpy.sin(angle) * bend, (a[1] + b[1]) / 2 + numpy.cos(angle) * bend)
        w = width * (1 - t)
        path = fx.tex_curve([a, middle, b], 16)
        field = numpy.maximum(field, fx.tex_stroke(x, y, path, [w * 0.4, w, 0.0], start=numpy.clip(t * 1.4 - 0.3, 0, 1)))
    return fx.tex_edge(field, soft=0.005)

fx.draw_flipbook("ClawSlash", claw, grid=4, fps=30)
fx.draw_flipbook("SmokePuff", puff, grid=4, fps=16)
fx.draw_flipbook("HeavyDust", dust, grid=4, fps=16)
fx.draw_flipbook("Splinters", splinters, grid=4, fps=30)

# Ground cracks: a few jagged strokes from the centre, each forking once, thick at the root and tapering out.
def cracks(size):
    x, y = fx.tex_coords(size)
    rng = numpy.random.default_rng(4)
    field = numpy.full_like(x, -1.0)
    for i in range(6):
        angle = i / 6 * 2 * numpy.pi + rng.uniform(-0.4, 0.4)
        steps = numpy.linspace(0.04, rng.uniform(0.55, 0.92), 7)
        wander = numpy.cumsum(rng.uniform(-0.35, 0.35, 7)) * 0.25        # the crack drifts off its line
        points = numpy.stack([numpy.cos(angle + wander) * steps, numpy.sin(angle + wander) * steps], 1)
        root = rng.uniform(0.05, 0.08)
        field = numpy.maximum(field, fx.tex_stroke(x, y, points, [root, root * 0.6, 0.0]))
        fork = points[rng.integers(2, 4)]                                 # one branch splits off part way
        turn = angle + rng.choice([-1, 1]) * rng.uniform(0.5, 0.9)
        tip = fork + numpy.array([numpy.cos(turn), numpy.sin(turn)]) * rng.uniform(0.15, 0.3)
        kink = (fork + tip) / 2 + rng.uniform(-0.04, 0.04, 2)
        field = numpy.maximum(field, fx.tex_stroke(x, y, numpy.stack([fork, kink, tip]), [root * 0.5, 0.0]))
    return fx.tex_edge(field, soft=0.004)

fx.draw_texture("GroundCracks", cracks, size=512)
```

It runs in seconds. Draw at the final size: a sheet is 1024 x 1024, so a 4 x 4
frame is 256 px.

**Light** is a falloff, not a cut shape. Build it from smooth functions of the
distance to a centre or a line (`numpy.exp`), keep its symmetry, and leave
variety to the emitter's `Rotation`, `Squash`, `Size` and `Brightness`. Two
four-point flares, both run in Blender 5.2, that match the studied ones:

```python
import numpy

# Four-point glint: four equal straight arms, mirrored on both axes, that thin and fade toward
# their tips from one smooth hot core, with a faint halo.
def glint(size):
    x, y = fx.tex_coords(size)
    r = numpy.hypot(x, y)
    def arm(along, across, length, width):
        fade = numpy.clip(1 - numpy.abs(along) / length, 0, 1)
        return numpy.exp(-(across / (width * fade + 1e-4)) ** 2) * fade ** 1.5
    rays = numpy.maximum(arm(y, x, 0.95, 0.035), arm(x, y, 0.95, 0.035))
    core = numpy.exp(-(r / 0.07) ** 2)
    halo = 0.3 * numpy.exp(-(r / 0.3) ** 2)
    return numpy.clip(rays + core + halo, 0, 1)

# Crisp four-point star: the same symmetry as a solid shape with smooth concave sides
# (|x|^p + |y|^p below 1; a lower p gives thinner points), cut with a hard edge.
def star(size):
    x, y = fx.tex_coords(size)
    p = 0.4
    return fx.tex_edge(0.9 - (numpy.abs(x) ** p + numpy.abs(y) ** p) ** (1 / p), soft=0.006)

fx.draw_texture("Glint", glint, size=512)
fx.draw_texture("CrispStar", star, size=512)
```

A round glow is `numpy.exp(-(r / radius) ** 2)`. A lens streak is the
glint's horizontal arm alone, long and thin.

Look at the attached sheet and ask whether it looks drawn, or, for light,
whether it looks like light:
- **Symmetry:** is anything radially or mirror symmetric, evenly spaced, or
  of uniform line width? Break it up, unless it is a symbol (a sigil, magic
  circle or rune band is drawn precise and symmetric) or light.
- **Light:** is a flare one smooth hot core with straight arms of equal
  length that fade toward their tips, and a glow round? Bent or unequal arms,
  a lumpy core, or a hard cut with a glow underneath read as a broken
  drawing.
- **Holes:** is there a small hole or dot inside a shape that should be
  solid, such as a flash's centre? It reads as an eye or damage; fill it.
- **Silhouette:** does the shape read as a silhouette at a glance, with a
  thick-to-thin taper, lobes, notches and holes? Or is it an outline, an icon
  or a gear?
- **Edges:** is drawn matter crisp? Soft is for light, and for the inside of
  smoke drawn mottled on purpose.
- **Change:** does the shape change across the frames (grow, then break into
  pieces), or does it only scale or fade?
- **Distance:** would it survive at game distance, or is it too thin?
- **Ground marks:** does it spread from the point of impact (cracks forking
  out, frost creeping from the centre), or is it an even pattern of cells
  that reads as tiles?

### Checking a sheet, and using it

A sheet you pack yourself (frames from several jobs, a hand-ordered
sequence) works too. Save it as a 1024 x 1024 PNG named `<name>.flipbook.png`,
with a `<name>.flipbook.json` beside it giving `grid`, `loop` and `fps` so the
settings can be reported.

What `node SKILL_DIR/scripts/texture-tool.mjs check OUT_DIR` reports for
each sheet is read from its pixels:
- the grid the gutters between frames agree with;
- the coverage of every cell in play order, which should grow and shrink as
  the effect does;
- **problems:** empty cells and drawing cut off at a cell's edge;
- **notes:** frames that hold;
- the `FlipbookLayout`, `FlipbookMode` and `LightEmission` to use, with the
  `Lifetime` for a one-shot sheet or the `FlipbookFramerate` for a loop.

Fix every problem before uploading, and weigh every note. Look at the sheet
itself too.

**Preview before uploading** with `texture-tool.mjs preview` (`tools.md`).
Set a `ParticleEmitter.Texture` to the address it prints, and Studio plays the
sheet as players would see it, with no upload (Windows).
- **A redraw needs a new preview.** Studio keeps a file's first image for the
  session; each preview run gets new addresses. Point the emitters at the
  new ones.
- **The addresses work on this computer only.** Players see nothing there.

To use a sheet:

1. **While it changes:** iterate on previews (above). Judge each version in
   the effect, at game distance, before drawing the next.
2. **Once it is settled:** upload it with every other settled texture in one
   batch (`tools.md`, "Uploading"), and set
   `ParticleEmitter.Texture` to `rbxassetid://<imageId>`.
   - Replace every `rbxasset://textures/vfx-preview/` address left in the
     place before calling the work done.
   - To find any that remain, scan with `execute_luau`: walk
     `game:GetDescendants()` and report each ParticleEmitter, Beam, Trail,
     Decal or Texture whose `Texture` starts with that prefix.
3. **Apply the settings the check listed.**
4. **Confirm it plays:** hold one particle at a few ages (`TimeScale = 0`) and
   take screenshots. Each should show one frame, not the whole grid. Do not go
   by `FlipbookIncompatible`: Studio shows its size message even for a sheet
   that plays.

Every upload is irreversible and moderated, so upload only settled sheets.
Put several textures an effect needs into one job, and reuse one sheet across
layers by changing `Color`, `Size`, `Rotation` and `Squash`. For layering,
timing and the rest of the effect, see `vfx-craft.md`.
