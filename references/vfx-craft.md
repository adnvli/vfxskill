# VFX craft

> **Ported skill:** tool names in this file (`build_instances`, `capture_moments`, the `animation`, `blender` and `upload_assets` tools, "it does X") come from the original toolkit. Do each step as `tools.md` maps it, with the Studio MCP and this skill's scripts.

Load this before building any visual effect: a hit, a slash, an explosion, a
spell, an aura or a pickup. It covers:
- where effects live and how they play;
- the engine properties that matter;
- layer skeletons;
- how to check an effect.

It does not replace looking: screenshot every effect you build.

This reference is a toolbox and a list of traps, not a style. The design is
yours: depart from any of it when the effect calls for it.

**Load `references/vfx-design.md` with it.** That reference covers what
experienced Roblox VFX artists do and why, measured from their published
effects:
- what the effect is for;
- palette, value and brightness;
- layers and the intensity curve of timing.

Load the topics the effect needs with them, as the skill's `SKILL.md` lists
them: textures, motion, mesh shapes, camera and world, rendered flipbooks.

Numbers here carry the same marks: *(measured)* from those studies,
*(verified)* checked in Studio, *(starting point)* common practice to tune by
looking.

## 1. Where effects live and how they play

- **Templates** go in `ReplicatedStorage.VFX`, one Model per effect.
  - Each Model has an invisible root part (`Transparency = 1`, anchored, no
    collision), with Attachments holding the emitters.
  - Name the Model after the effect (`Slam`, `SlashHit`). Name each emitter
    after its layer. The studied artists split a long effect into one Model or
    Folder per beat (`Dash`, `Up`, `Down`).
- **The player module** is the template `templates/vfx/emit.lua` in this
  skill. Install it once per place as `ReplicatedStorage.VFX.Emit`, with the
  `Build` and `Capture` modules beside it, as `tools.md` ("Installing the
  player, builder and capture modules") shows. Don't type it out; read the
  file and send it.

  If `ReplicatedStorage.VFX.Emit` already exists, read it before deciding
  whether to replace it. Don't read other effects' modules for ideas;
  this skill's references are the better source.

  It is a starting point, not a cage. Extend it, or write your own player,
  when an effect needs something it does not do: camera shake, Bezier paths,
  colour over time, chained effects. Keep the attribute names so VFX editors
  can still read the effect, and keep `time`, `finished`, `root`,
  `setTimeScale` and `stop` on your handle so `Capture` can hold it.
- **Playing an effect:**
  - `VFX.play(template, cframe)` clones the template, places it, plays it and
    removes it once the last particle is gone.
  - `VFX.emit(instance)` plays emitters that already sit on a weapon or
    character, and restores them afterwards.
  - The handle returned has `freeze(seconds)` for hitstop and
    `setTimeScale(scale)` for slow motion. One clock drives particles, meshes,
    lights and trail lifetimes, so they stay in step. The handle's scale
    multiplies each emitter's own `TimeScale`, so a slowed smoke layer stays
    slower than the core.
  - The handle also has `time` (effect seconds so far), `finished` (true once
    it has ended), `root` (what is being played) and `stop()` (end it now).
    Both functions end with an optional `options` table: `timeScale` and
    `onDone` for either, and `parent` (default `workspace`) for `play`.
- **The attributes it reads**, the convention VFX Editor, VFX Forge and other
  editors share:

| On | Attribute | Meaning |
| --- | --- | --- |
| ParticleEmitter | `EmitCount` | Burst this many particles (bounded to 500) |
| ParticleEmitter | `EmitDuration` | Emit at `Rate` for this many seconds |
| ParticleEmitter, Beam, Trail, lights | `EmitDelay` | Seconds after the effect starts |
| Beam, Trail | `EmitDuration` | Enabled for this long |
| PointLight, SpotLight, SurfaceLight | `EmitDuration` | On, then `Brightness` fades to 0 over this long |
| Model or Folder with `Start` and `End` parts | `Duration`, `Easing`, `EasingDirection`, `Spin`, `EmitDelay` | `Start` moves to `End`'s CFrame, Size, Transparency and Color; `Spin` is degrees about `Start`'s own up axis (its `UpVector`), so spin a ring mesh, not a cylinder laid on its side |
| The effect's root | `EffectDuration` | When the effect ends, if nothing above sets it |

- **Delays are absolute.** `EmitDelay` counts from the effect's start. Editors
  that set a delay on a group write it onto every descendant, so a delay is
  never added to its parent's.
- **`EmitDuration` means two things in the wild.** Some community emit
  scripts re-burst `EmitCount` every 0.1 s for that long. This module turns
  the emitter on at its `Rate` for that long. Set `Rate` for the stream you
  want.
- **Attributes it does not drive.** VFX Forge's `TimeScale_*`, `Size_*` and
  `Part_*` attributes are inputs to that plugin's own editor; the module does
  not read them.

The module only controls what carries these attributes. An emitter with none
(an always-on aura) keeps running at full speed through `setTimeScale` and
`freeze`. Give it `EmitDuration` if it should slow down and stop with the
effect.

- **Replication.** Effects are presentation, so play them on clients.
  - The server decides that something happened and fires an
    `UnreliableRemoteEvent` with the effect's name and a CFrame. Each client
    calls `VFX.play`.
  - Unreliable events drop payloads over 1000 bytes, so send names and
    numbers, never instances. Load the `roblox-networking` skill for the
    remote itself.
  - Never let damage or rewards wait on an effect.
- **Timing to an animation.** Put a marker on the keyframe where the hit lands
  (`markers: [{ "name": "Impact" }]` with the `animation` tool). Play the
  effect from `GetMarkerReachedSignal("Impact")`; see `references/full.md` §2.
- **A cast pose from code** (the caster's arm or hand raised toward a target
  while the effect plays, with no animation asset) is in
  `vfx-camera-world.md`. Load it first: newer avatars' shoulders are
  `AnimationConstraint`s, which code written for `Motor6D` skips without an
  error.

## 2. Textures without drawing

To draw the effect's own textures, which most effects should, load
`vfx-textures.md`.

**Built-in textures, no upload.** These ship with Roblox for the legacy Fire,
Smoke, Sparkles and Explosion effects. They are fine as stand-ins while
blocking an effect out, and every Roblox player has seen them.

| Texture | Looks like |
| --- | --- |
| `rbxasset://textures/particles/explosion01_implosion_main.dds` | Soft white round glow |
| `rbxasset://textures/particles/explosion01_shockwave_main.dds` | Soft ring |
| `rbxasset://textures/particles/explosion01_core_main.dds` | Orange fiery puff |
| `rbxasset://textures/particles/smoke_main.dds` | Grey cloudy puff |
| `rbxasset://textures/particles/sparkles_main.dds` | Four-point star |
| `rbxasset://textures/particles/fire_main.dds` | Wispy flames |
| `rbxasset://textures/particles/forcefield_vortex_main.dds` | Thin ring with dots |

The Creator Store (`search_assets` with `assetType: "VFX"` or `"Particle"`,
then `preview_asset`) is worth a look when a texture there matches the style.

## 3. Particle properties worth knowing

- **Slowing down:** `Drag` is the half-life of speed in seconds.
- **Shapes:**
  - `Shape` (Box, Sphere, Cylinder, Disc) emits from the parent part's volume
    or surface (`ShapeStyle`). The emitter must sit directly under a part
    sized for the shape; under an Attachment it emits from a point.
  - `ShapeInOut = "Inward"` on a sphere gathers particles toward the centre,
    which suits anticipation.
  - `ShapePartial` on a Disc hollows it into a ring.
- **Layer order:** `ZOffset` moves a layer toward the camera without changing
  its size. Scale it with the effect: about ±1 for a 10-stud orb, 0-3 for an
  impact, and tens of studs for a huge explosion *(measured)*.
- **Following a moving source:** `LockedToPart = true` makes particles follow
  the emitter (an aura, a held torch, a spinning model). Leave it off for
  anything thrown off.
- **Lighting:** `LightInfluence = 0` keeps a glowing layer at its own colour.
  Smoke reads better lit by the scene (`LightInfluence` 0.35-1).

## 4. Layer skeletons

Skeletons from the studied effects, with their numbers *(measured)*. Fill
each role with your own texture and colour, and add or drop roles as the
effect's idea needs. They are a floor, not a target: a finished effect should
look made for its game. R is the effect's radius in studs.

**Impact** (a hit, an explosion; every layer fires by `EmitCount` and
`EmitDelay`; times are from the hit):

| Time | Role | Make |
| --- | --- | --- |
| -0.15 s | Anticipation | A glow that shrinks from 1.5R to 0 over 0.1-0.15 s, spinning fast |
| 0 | Flash | A soft ball or four-point flare, 0 to 2.5R, Lifetime 0.06-0.1, Brightness 10, `ZOffset` in front |
| +0.03 s | Impact stars | A spiky 4 x 4 sheet, Lifetime 0.075-0.15, EmitCount 2-6, as a colour layer (`ZOffset` z), its black twin (the same size, life and count, z to z + 0.25) and a white copy (z + 1) |
| +0.03 s | Black backing | A soft black blob behind, 2-4R |
| +0.05 s | Streaks | `VelocityParallel` with `Squash`, Speed 60-200, Drag 8-12, with a few black twins |
| +0.05 s | Ring | A flat `VelocityPerpendicular` ring (Speed 0.001) growing to 2-3R over 0.2-0.4 s |
| +0.05 s | Smoke | Constant-size puffs (4 x 4 OneShot), cel for a toon look or mottled for a heavy one (`vfx-textures.md`), Speed 50-120, Drag 8, Lifetime 1-1.5, Transparency to above 1, `TimeScale` 0.7, a warm and a grey layer; beside fire, carrying the fire's colour where it is lit |
| +0.05 s | Embers | Dots at `LightEmission` 1, Speed 10-120, Drag 10, Lifetime 0.75-2 |
| 0 | Light | A PointLight at Brightness 7-16, Range 7-15, fading over 0.5 s |

**Wind and smoke:**
- **Wind:** 3-6 nearly transparent grey arcs and rings.
  - Crescent and radial-streak textures, flat (`VelocityPerpendicular`,
    Speed 0.001).
  - Growing to 25-35 studs by 60% of life, Transparency from 0.45-0.85 to
    above 1.
  - `LightEmission` 1, `RotSpeed` ±15-20, `ZOffset` 0.5, over the smoke.
- **Smoke:** puffs in warm and grey pairs, lit by the scene.
- **A ground skirt:** a flat copy of the smoke, squashed.
- **Black grit:** a few dark dust particles.

**Examples** of the property shapes as JSON build steps (run them with
`Build.run`, `tools.md`). Add
`parent` (an Attachment for most particles), and replace each stand-in
texture with one drawn for the effect. Colours are 0-1. Sequences are
keypoints from time 0 to 1. On their own they emit nothing: fire them with
`VFX.play` or `VFX.emit`.

Anticipation, a glow that shrinks into the hit:

```json
{
  "op": "create", "className": "ParticleEmitter", "name": "Anticipation",
  "properties": {
    "Texture": "rbxasset://textures/particles/explosion01_implosion_main.dds",
    "Rate": 0, "Enabled": false, "Lifetime": 0.14, "Speed": 0.001, "LockedToPart": true,
    "LightEmission": 1, "LightInfluence": 0, "Brightness": 2, "ZOffset": 1,
    "Rotation": [0, 360], "RotSpeed": [-700, -500], "Color": [1, 0.6, 0.25],
    "Size": [{ "time": 0, "value": 9 }, { "time": 1, "value": 0 }],
    "Transparency": [{ "time": 0, "value": 0.4 }, { "time": 0.3, "value": 0 }, { "time": 1, "value": 0 }]
  },
  "attributes": { "EmitCount": 1 }
}
```

Flash, in front of everything, for a frame or two:

```json
{
  "op": "create", "className": "ParticleEmitter", "name": "Flash",
  "properties": {
    "Texture": "rbxasset://textures/particles/sparkles_main.dds",
    "Rate": 0, "Enabled": false, "Lifetime": [0.06, 0.1], "Speed": 0.001, "LockedToPart": true,
    "LightEmission": 1, "LightInfluence": 0, "Brightness": 10, "ZOffset": 3,
    "Rotation": [0, 360], "Color": [1, 0.95, 0.85],
    "Size": [{ "time": 0, "value": 4 }, { "time": 0.3, "value": 16 }, { "time": 1, "value": 18 }],
    "Transparency": [{ "time": 0, "value": 0 }, { "time": 1, "value": 1 }]
  },
  "attributes": { "EmitCount": 1, "EmitDelay": 0.14 }
}
```

The impact's three-value stack: colour; its black twin just in front, the
same emitter with only the colour and blending changed; and a small white
core in front of both:

```json
[
  { "op": "create", "className": "ParticleEmitter", "name": "ImpactColour",
    "properties": {
      "Texture": "rbxasset://textures/particles/explosion01_core_main.dds",
      "Rate": 0, "Enabled": false, "Lifetime": [0.1, 0.15], "Speed": 0.001, "LockedToPart": true,
      "LightEmission": -1, "LightInfluence": 0, "Brightness": 5, "ZOffset": 1,
      "Rotation": [0, 360], "Color": [1, 0.35, 0.08],
      "Size": [{ "time": 0, "value": 6 }, { "time": 0.25, "value": 11 }, { "time": 1, "value": 12 }],
      "Transparency": 0 },
    "attributes": { "EmitCount": 2, "EmitDelay": 0.16 } },
  { "op": "create", "className": "ParticleEmitter", "name": "ImpactBlack",
    "properties": {
      "Texture": "rbxasset://textures/particles/explosion01_core_main.dds",
      "Rate": 0, "Enabled": false, "Lifetime": [0.1, 0.15], "Speed": 0.001, "LockedToPart": true,
      "LightEmission": 0, "LightInfluence": 0, "Brightness": 1, "ZOffset": 1.25,
      "Rotation": [0, 360], "Color": [0, 0, 0],
      "Size": [{ "time": 0, "value": 6 }, { "time": 0.25, "value": 11 }, { "time": 1, "value": 12 }],
      "Transparency": 0 },
    "attributes": { "EmitCount": 2, "EmitDelay": 0.16 } },
  { "op": "create", "className": "ParticleEmitter", "name": "ImpactWhite",
    "properties": {
      "Texture": "rbxasset://textures/particles/explosion01_core_main.dds",
      "Rate": 0, "Enabled": false, "Lifetime": [0.06, 0.1], "Speed": 0.001, "LockedToPart": true,
      "LightEmission": 0, "LightInfluence": 0, "Brightness": 60, "ZOffset": 2,
      "Rotation": [0, 360], "Color": [1, 1, 1],
      "Size": [{ "time": 0, "value": 3 }, { "time": 1, "value": 5 }],
      "Transparency": 0 },
    "attributes": { "EmitCount": 1, "EmitDelay": 0.16 } }
]
```

Black backing behind the impact:

```json
{
  "op": "create", "className": "ParticleEmitter", "name": "Backing",
  "properties": {
    "Texture": "rbxasset://textures/particles/explosion01_implosion_main.dds",
    "Rate": 0, "Enabled": false, "Lifetime": 0.3, "Speed": 0.001, "LockedToPart": true,
    "LightEmission": 0, "LightInfluence": 0, "Brightness": 1, "ZOffset": -1,
    "Color": [0, 0, 0],
    "Size": [{ "time": 0, "value": 14 }, { "time": 1, "value": 20 }],
    "Transparency": [{ "time": 0, "value": 0.35 }, { "time": 1, "value": 1 }]
  },
  "attributes": { "EmitCount": 1, "EmitDelay": 0.16 }
}
```

Streaks that shoot out and stop:

```json
{
  "op": "create", "className": "ParticleEmitter", "name": "Streaks",
  "properties": {
    "Texture": "rbxasset://textures/particles/explosion01_implosion_main.dds",
    "Rate": 0, "Enabled": false, "Lifetime": [0.2, 0.35], "Speed": [60, 160],
    "SpreadAngle": [180, 180], "Drag": 10, "Orientation": "VelocityParallel",
    "LightEmission": 0, "LightInfluence": 0, "Brightness": 8, "ZOffset": 2,
    "Color": [{ "time": 0, "value": [1, 0.9, 0.6] }, { "time": 1, "value": [1, 0.3, 0.05] }],
    "Size": [{ "time": 0, "value": 1.2 }, { "time": 1, "value": 0 }],
    "Squash": [{ "time": 0, "value": 3 }, { "time": 1, "value": 1 }],
    "Transparency": 0
  },
  "attributes": { "EmitCount": 12, "EmitDelay": 0.18 }
}
```

A flat ring. `VelocityPerpendicular` needs its tiny Speed to show; level the
Attachment with the ground:

```json
{
  "op": "create", "className": "ParticleEmitter", "name": "Ring",
  "properties": {
    "Texture": "rbxasset://textures/particles/explosion01_shockwave_main.dds",
    "Rate": 0, "Enabled": false, "Lifetime": 0.35, "Speed": 0.001,
    "EmissionDirection": "Top", "SpreadAngle": [0, 0], "Orientation": "VelocityPerpendicular",
    "LightEmission": 0, "LightInfluence": 0, "Brightness": 3, "ZOffset": 0.5,
    "Color": [1, 0.85, 0.6],
    "Size": [{ "time": 0, "value": 2 }, { "time": 0.4, "value": 16 }, { "time": 1, "value": 20 }],
    "Transparency": [{ "time": 0, "value": 0 }, { "time": 1, "value": 1.3 }]
  },
  "attributes": { "EmitCount": 1, "EmitDelay": 0.18 }
}
```

Smoke that bursts out, hangs, runs slower than the core and is lit by the
scene:

```json
{
  "op": "create", "className": "ParticleEmitter", "name": "Smoke",
  "properties": {
    "Texture": "rbxasset://textures/particles/smoke_main.dds",
    "Rate": 0, "Enabled": false, "Lifetime": [1, 1.5], "Speed": [50, 90],
    "SpreadAngle": [180, 180], "Drag": 8, "Acceleration": [0, 3, 0], "TimeScale": 0.7,
    "Rotation": [0, 360], "RotSpeed": [-30, 30],
    "LightEmission": 0, "LightInfluence": 1, "Brightness": 1,
    "Color": [0.32, 0.28, 0.26],
    "Size": 6,
    "Transparency": [{ "time": 0, "value": 0.2 }, { "time": 1, "value": 1.6 }]
  },
  "attributes": { "EmitCount": 5, "EmitDelay": 0.2 }
}
```

Light flash:

```json
{
  "op": "create", "className": "PointLight", "name": "FlashLight",
  "properties": { "Brightness": 10, "Range": 14, "Color": [1, 0.7, 0.4], "Shadows": false },
  "attributes": { "EmitDelay": 0.14, "EmitDuration": 0.5 }
}
```

## 5. Budgets

- **Particle count:** a few hundred particles per effect is fine
  *(starting point)*; the studied hits stay there by emitting one or a few
  sprites per layer. The engine guide caps emission near 400 a second (100
  on mobile). Cost grows with how much of the screen particles cover, so large
  overlapping transparent layers (overdraw) cost more than many small ones.
- **Emitters:** particles, decals and textures do not batch, so every emitter
  is a draw call. The studied hits use 40-60 emitters for a moment that lasts
  a second. Keep always-on effects much leaner. Don't change emitter
  properties every frame.
- **Parts:** effect parts are anchored, with no collision, query, touch or
  shadows (the emit module sets this on copies it owns). Physics debris is a
  common real cause of lag; keep debris few and short-lived.
- **Pooling:** pool effects that fire constantly (muzzle flashes, footsteps).
  `VFX.play` clones each time, which is right for occasional effects.
- **Quality:** a LocalScript can read
  `UserSettings():GetService("UserGameSettings").SavedQualityLevel` and play a
  lighter variant at low settings. Automatic quality does not expose its level.

## 6. Checking an effect

Effects play in the edit viewport, so no playtest is needed to look at one.
Tune there, on a stand-in character if the effect needs one: every edit to a
module needs a playtest restarted to show, and restarts are slow and can
fail. Use a playtest at the end, once the look is settled, to see it on the
real character from the player's camera. A screenshot takes most of a
second, longer than a whole burst, so the effect is held still for each
capture instead of caught in passing.

1. Build the template and install the module (section 1).

   In edit mode, `require` keeps a ModuleScript's first result for the whole
   Studio session. After changing the emit module, or any module an effect
   uses, remove that ModuleScript and create it again before checking.
   Otherwise the old code runs, and a fix looks as if it did nothing. A new
   playtest always loads fresh code.
2. Frame the spot two ways, and capture each moment from both:
   - **Close**, to judge shapes: build (`Build.run`) a transparent, anchored
     marker part about the effect's size where it will play, under its own
     root (`path` `game.Workspace.SlamPreview`, and no `parent` on the step:
     it goes in the root), and aim at it from a side and a little above with
     `Capture.aim(marker, from, angleY)` (step 3).
   - **From where the player sees it.** This view decides whether the
     effect works. In a playtest, the client's own camera behind the
     character is that view: capture it as it is. In edit mode, build a
     marker that spans from the caster's spot to the effect, and `view` it
     from the caster's side at `angleY` 5-15; the camera then sits about
     where the player's would. A projectile's impact is seen from its whole
     range away. The close view hides an impact that is a speck at range; the
     far view shows it.
3. See it with the VFXCapture flow in `tools.md`: one `execute_luau` that
   aims the camera (`Capture.aim(workspace.SlamPreview, 30, 20)`), plays the
   effect and passes its handle to `Capture.start`; then for each effect time
   (`0.03, 0.1, 0.25, 0.45, 0.9`, rising) an `execute_luau` with
   `Capture.step(t)` followed by `screen_capture`; then `Capture.stop()`.
   The effect plays at normal speed, slows down for the last stretch before
   each time, and holds there for the screenshot. `Capture.start` holds it at
   its start while its textures load (a texture shown for the first time, such
   as one just uploaded or previewed, takes a moment); if it says "loading",
   early frames may miss layers.
   Pick the 4-6 moments that matter: anticipation, the flash, the peak, the
   body at about 0.3 s, the smoke, and a time just past the effect's end, to
   see that nothing is left behind. Every call re-reads the whole
   conversation, so don't capture moments you won't judge.
   - **Detail and the final look:** frame closer with `Capture.aim` when small
     detail matters (a texture's edges, a thin trail, missiles in flight), and
     for the final look capture from the player's camera
     (`Capture.aimFromPlayer`).
   - **Trails:** a held trail loses its segments, so use
     `Capture.step(t, 0.04, false)`. The effect keeps playing at 0.04x through
     each capture, and the emit module stretches trail lifetimes to match. A
     module of your own that moves a projectile must do the same
     (`trail.Lifetime = authored / scale`), or its trails come out 25 times too
     short.
   - **Your own module's handle** works too, if it has a `time` field in effect
     seconds and `setTimeScale(scale)`.
4. Repeat the flow from the other view (step 2) with the same times.
5. Ask of each capture:
   - From the player's view, does the payoff fill its share of the screen
     (vfx-design.md section 1)? Does it grow taller for a moment, or stay a
     flat splash on the floor? At 0.3 s, is a body (crescents, tongues,
     puffs) still carrying the mass, or only shards and sparks?
   - Is every layer meant to glow above the place's bloom threshold? A
     Brightness of 1-3 reads as flat paint at Threshold 2.
   - Does the flash frame read as one sharp, overexposed shape, bigger than
     what follows it, and is it gone by 0.15 s, so the frames after it show
     the body? A 30-stud flash that held for 0.2 s without fading whited out
     the caster for a dozen frames from the player's camera *(seen in a
     run)*.
   - Is there something dark, so the bright parts read?
   - Do the drawn shapes have hard silhouettes, or do they look like soft
     smudges? (Flares and glows are soft.)
   - Is the centre a white blob? Bring the stacked bright layers down until
     the coloured shapes show through. A pale effect on a light floor needs
     its darks most (cobalt, navy, black accents).
   - Does any drawn texture look like clip art or an icon: radially
     symmetric, evenly spaced, or drawn with even outlines? Does a flare
     have bent or unequal arms or a lumpy core?
   - Does everything that moves carry its speed (streaks, wind rings, a
     smear), or does it float?
   - Is a large half-transparent shell covering the view?
   - From the player's camera, does a flat ground ring grow wider than its
     distance from the camera? It then passes under the camera, and its far
     edge is a thin line across the view.
   - Does a light tint the whole floor?
   - Does the smoke beside the fire take its colour, or is it one flat tone?
   - Does every layer show? Thin sparks and faint smoke vanish at a normal
     camera distance.
   - Does one layer bury another?
   - Does anything stay constant that should change?
   - Does it end cleanly, with nothing left behind?
6. Remove the marker (`Build.run(root, {{op = "remove", target = "game.Workspace.SlamPreview"}})`,
   one undo step). Check `get_console_output` for `VFXEmit` warnings: a bad
   attribute, an emitter with nothing to play, a bounded count. Before calling
   the effect done, check that no `rbxasset://textures/vfx-preview/` address
   is left: players would see nothing there.
7. On a character, the character can hide an effect played in front of it;
   frame it from a side as well.

Effects are judged by eye. Tell the user what you checked and ask them to look
at it at full speed.
