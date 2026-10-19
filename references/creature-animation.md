# Creature animation with the `animation` tool

> **Ported skill:** tool names in this file (`build_instances`, `capture_moments`, the `animation`, `blender` and `upload_assets` tools, "it does X") come from the original toolkit. Do each step as `tools.md` maps it, with the Studio MCP and this skill's scripts.

Use this to animate a creature or any model that is not a stock R15 or R6
body: on its own rig, rigged by hand or by `rig`, with waves for chains that
sway and a gait for legs that walk. The pose format, the checks and the
publish, wire and verify flow are in `references/character-animation.md`;
load that first.

## A model's own rig

A creature or other model rigged by hand, with `Motor6D`s or
`AnimationConstraint`s between its own parts under a `Humanoid` or an
`AnimationController`, is animated on its own rig: give the model's path as
`rig`, for example `rig: "game.Workspace.Dog"`.

- **Read the rig first.** `check` reads it from Studio and returns `rig`:
  `joints`, the names a pose may key, parents first; `position`, the one joint
  that takes a `position` (false when no one joint moves the whole body);
  what its declarations name (`feet`, `limbs`, `hinges`, and `ranged` for the
  joints with a declared range); `scale`; and `notes`, such as joints renamed
  after the parts they move because several shared a name. A pose keying a
  joint the rig lacks is refused with the rig's joints listed, so a first
  check keying one joint you expect, such as `Neck`, tells you what to key
  either way.
- **Pose with rotation.** `rotation: [x, y, z]` turns a joint by degrees about
  the body's own axes at rest, right (+X), up (+Y) and back (+Z), whichever
  way the model's joint frames point. A head nods with X (+X lifts the nose),
  turns with Y; a tail wags with Y. `position` moves the whole body on the
  joint `rig.position` names. `aim`, `aimAt` and `bend` need declarations
  (below); without them use `rotation`.
- **Checks say what they cannot judge.** A check the rig gives nothing to
  judge by is `skipped`, its detail beginning `not checked:` and saying what
  it lacks: the joint-range check for joints with no declared range, the
  ground, foot and gait checks for a body with no declared feet. A skipped
  check never counts as passed and needs no
  waiver. Distance limits are R15's scaled to the body's size, and a result
  measured against them says so.
- **Build plays it on a copy.** `build` plays the animation on a copy of the
  model in a temporary folder, compares it with the checked motion on the
  model's own joints, and writes it only if they match. It is refused when
  the rig changed since the check (check again), or when a copy would not be
  faithful: a part, joint or weld that cannot be archived, or a joint or weld
  holding a part outside the model. The error names it; move that weld or
  make the part archivable.
- **The preview is the model.** The contact sheet draws its parts as Roblox
  shapes them (blocks, wedges, cylinders, balls), welded parts with the part
  they move with, and MeshParts with their own meshes. `sheet.boxes` names
  any MeshPart drawn as its box instead, and why. A long body gets wider
  frames. Pass `locomotion: true` for a gait to see it from the side.
- `wire {model, slot, ...}` and `verify {model, animation}` work as for an NPC,
  and `verify` compares the model's joints on its own rig.
- A rig has at most 64 joints and 128 parts.

### Declarations: AnimRig

The model's `AnimRig` attribute, a string of JSON, says what its joints
cannot: which parts stand on the ground, which joints are limbs and hinges,
and how far each may turn. Set it as a string attribute on the model, for
example with a `build_instances` set step's `attributes`. Only version 1 is
read, and a declaration with any error refuses the whole rig, saying what is
wrong. `rig` writes it for you, from a body plan or from `declarations`
(next section). A dog whose legs bend at the knee, the front knees folding back and
the hind forward:

```text
{
  "version": 1,
  "feet": ["FrontLeftLower", "FrontRightLower", "HindLeftLower", "HindRightLower"],
  "hinges": {
    "FrontLeftKnee": { "axis": "X", "flex": -1 }, "FrontRightKnee": { "axis": "X", "flex": -1 },
    "HindLeftKnee": { "axis": "X", "flex": 1 }, "HindRightKnee": { "axis": "X", "flex": 1 }
  },
  "limbs": {
    "FrontLeft": { "hinge": "FrontLeftKnee" }, "FrontRight": { "hinge": "FrontRightKnee" },
    "HindLeft": { "hinge": "HindLeftKnee" }, "HindRight": { "hinge": "HindRightKnee" }
  },
  "limits": {
    "FrontLeft": { "turn": 120 }, "FrontLeftKnee": { "min": -150, "max": 10 },
    "HindLeft": { "turn": 120 }, "HindLeftKnee": { "min": -10, "max": 150 },
    "Tail": "free"
  }
}
```

- `feet`: the parts that stand on the ground, or a map from each to the 1 to
  8 points in its own frame (studs) where it meets the ground. Listed without
  points, a foot meets the ground at its box's corners, or, when it is the
  last piece of a leg with no ankle, at the leg's end.
- `hips`: a biped's two hip joints, left then right, whose swing the gait
  symmetry check compares.
- `hinges`: a joint that bends about one body axis at rest, `"X"`, `"Y"` or
  `"Z"`, with `flex` the sign of the turn that folds it: R15's elbows are +1
  about X and its knees -1.
- `limbs`, by the joint at the limb's root (a hip or shoulder): `hinge` names
  the hinge that bends it. `end`, in studs in the last part's frame, is the
  point that reaches; it defaults to the far end of that part from its joint,
  such as the middle of a leg's sole. `axis`, the way the limb runs at rest,
  and `fold`, the way its lower half swings as it bends, are worked out when
  left out. `foot` names a joint below the hinge that `aimAt` lays flat.
- `limits`: `{ turn: degrees }` for any joint, `{ min, max, offAxis? }` for a
  hinge (degrees signed about its axis, `offAxis` defaulting to 35), or
  `"free"`.

With limbs declared, `aim: [right, up, forward]` points a limb, `bendToward`
chooses where its hinge folds, `bend: degrees` folds it, and
`aimAt: [right, up, forward]` puts its end on a point in studs from the root
part's centre, as on R15.

## Rigging a creature: action rig

A creature made of loose pieces, such as Parts you built or an uploaded
model, is joined into a rig by `rig` rather than by Luau. The pieces stay
where they are. Each joint names the piece it moves, the piece it hangs
from, and the pivot: the point in the world, in studs, where the piece turns.

```text
{
  "action": "rig", "model": "game.Workspace.Dog",
  "controller": "Humanoid", "plan": "quadruped",
  "joints": [
    { "part": "Head", "parent": "Body", "pivot": [0, 3.1, -1.6], "name": "Neck", "with": ["EarLeft", "EarRight"] },
    { "part": "FrontLeftUpper", "parent": "Body", "pivot": [-0.6, 2.4, -1.2], "name": "FrontLeft" },
    { "part": "FrontLeftLower", "parent": "FrontLeftUpper", "pivot": [-0.6, 1.6, -1.2], "name": "FrontLeftKnee" },
    { "part": "Tail", "parent": "Body", "pivot": [0, 2.9, 1.9] }
  ]
}
```

- **Name the pieces before rigging.** Part names must be unique in the model,
  and the `quadruped` plan reads them. A leg is one piece named `FrontLeft`,
  `FrontRight`, `HindLeft` or `HindRight`, or pieces named with `Upper`,
  `Lower` and optionally `Foot` after that, such as `FrontLeftUpper`. `Head`,
  `Jaw` and `Tail`, `Tail2` and so on get ranges. The plan declares the feet,
  limbs, knees (front folding back, hind forward) and ranges, so `aim`, `bend`
  and `aimAt` work on the legs. Give `declarations` to add to or override it
  per joint. `plan: "custom"` declares only what `declarations` gives.
- **Put each pivot where the piece meets its parent**: a hip at the top of
  the leg, a knee between the two leg pieces, a neck at the back of the head.
  A pivot at a piece's centre makes it spin in place. A pivot outside both
  pieces is refused, naming the joint.
- **Every part needs a place.** A piece is moved by exactly one joint. A part
  that only rides along (an ear, an eye) goes in its piece's `with`, or is
  already welded to it. A part left loose, a weld holding two jointed pieces
  together, or joints that do not form one tree refuse the call, listing
  every problem; nothing is changed.
- **Controller.** `Humanoid` for a creature that walks or is moved with
  `MoveTo`: its root is left free and its hip height is set from the rest
  pose. `AnimationController` for one that flies, swims or stays put: its root
  is anchored, and a script moves it by its root's CFrame.
- **The root.** The piece every other hangs from (`Body` above) is jointed to
  an invisible `HumanoidRootPart` that `rig` makes, by a joint named `Root`,
  which is the joint that takes `position`. Do not name a joint `Root`.
- **An uploaded or generated model** may arrive with a rig of its own: every
  piece hung from a `RootPart` at the piece's centre. `rig` refuses with
  `importer_rig`; pass `replace: "importer"` to take that rig out and build
  yours. An upload may also arrive with no rig, each piece loose in a Model
  named `<piece>_Node`; `replace: "importer"` is harmless there, so pass it
  for any upload. See "From Blender" and "A generated body" below.
- **Look at the range sheet.** The result carries `rangeSheet`, an image and a
  3D preview with every joint turned 30° each way. A piece that swings away
  from the body, or opens a gap at its joint, has its pivot in the wrong
  place: fix the pivot and rig again.
- **Rigging again** needs `expected_revision`, the `revision` the last `rig`
  returned. A rig that `rig` did not build, or that was edited since, is left
  alone (`rig_not_built_here`, `rig_edited_since_build`).
- **A model already rigged**, by hand or from the Creator Store: leave
  `joints` out. `rig {model, plan}` or `rig {model, declarations}` writes only
  the `AnimRig` attribute and changes no joint; `rig {model}` alone reads the
  rig and draws its range sheet.

Then animate it with the model's path as the animation's `rig`, as above.

### From Blender

A creature modelled in Blender as moving pieces (the building skill's
`references/blender.md`, "A creature of moving pieces") is one upload and one
`rig` call:

1. The Blender job's result ends its **moving pieces** line with `joints`:
   each piece, the piece it hangs from, its pivot, and for a leg the joint
   names the recipes key. Fix anything that line flags before uploading.
2. `upload_asset` the GLB as a Model, and `insert_asset` it where the
   creature belongs, with a `position`. It arrives as one Model: a MeshPart
   for each piece, named after it, where it was modelled. The pieces come
   either hung flat from a `RootPart` or loose in nested `<piece>_Node`
   Models with no rig; the call below is the same for both, so there is no
   need to look first.
3. Rig it with those joints as they are, before moving a piece or changing
   the model's pivot:

```text
{
  "action": "rig", "model": "game.Workspace.Wolf",
  "replace": "importer", "pivot_space": "import",
  "controller": "Humanoid", "plan": "quadruped",
  "joints": <the joints from the Blender job's result>
}
```

`pivot_space: "import"` says the pivots are measured from the model's own
origin, as Blender gave them, so they are right wherever the model was
inserted and whichever way it faces. That origin is the `RootPart`, or the
model's pivot when it arrived without a rig. Rig it before scaling it. A
later `rig` call on the same model, to fix a pivot, takes them the same way.
Without it pivots are points in the world. A refusal that a pivot "lies
outside" its pieces on every joint means the origin was not where expected:
read `Body`'s position and give the pivots in the world instead.

### A skinned creature

A creature that bends along its length is one mesh skinned to bones (the
building skill's `references/blender.md`, "A creature that bends"). The
upload keeps its bones and weights: it arrives as one Model holding one
MeshPart, with the armature's bones inside it as `Bone`s. A bone is a joint
named after itself, so there are no joints to give:

```text
{
  "action": "rig", "model": "game.Workspace.Snake",
  "controller": "AnimationController", "replace": "importer",
  "plan": "custom",
  "declarations": { "limits": { "Spine2": { "turn": 60 }, "Spine3": { "turn": 60 } } }
}
```

- `rig` makes the hidden root and its `Root` joint around the mesh, the
  controller, and the declarations, and takes out the `AnimationController`
  and `InitialPoses` the upload came with. It never changes a bone.
- **Animate the bones by name**, exactly as joints: `rotation` in the body's
  axes whichever way a bone lies, `waves` down a chain of them, and on a
  four-legged body `gait`, `aim` and `aimAt` on the legs. `Root` takes
  `position` and moves the whole creature.
- **`plan: "quadruped"`** reads the bones' names as it reads pieces':
  `FrontLeftUpper`, `FrontLeftLower` and `FrontLeftFoot` make a leg whose
  knee is the lower bone's joint and whose foot is the foot bone, standing
  where that bone begins. Its joints are named after the bones, so a recipe's
  `FrontLeft` is `FrontLeftUpper` here and its `FrontLeftKnee` is
  `FrontLeftLower`.
- **A limb on bones ends where the next bone begins.** Declaring a limb whose
  last bone has no bone below it needs `end`, a point in that bone's frame:
  `[0, length, 0]`, since a bone's +Y runs along it.
- **Declare a range for every bone you move**, under `limits`, or
  `jointLimits` reports them as not judged.
- At most 64 joints, the root's among them.
- The result's sheet has `skin`: "bent by its bones" means the image shows
  the mesh as Studio will skin it. "drawn rigid" means the mesh's skin could
  not be read, and only the checks and Studio show the motion.
- Without a `controller`, `rig {model, plan, declarations}` only declares,
  and leaves the mesh loose and unanchored: use the call above.

### An animation made in Blender

Motion that Blender's tools make more easily than keys do (inverse
kinematics, a constraint, a path) is animated there and baked: the building
skill's `references/blender.md`, "Animating a creature in Blender". The job's
result names a file; pass it as animation_file in place of `animation`:

```text
{ "action": "build", "animation_file": "<path from the job's result>", "parent": "game.ServerStorage.Animations" }
```

It is a pose description like any other, so `check`, `build`, `verify` and
the options (`locomotion`, `grounded`, `waive`) work as usual. It carries the
skeleton it was made on, and is refused if the model in Studio is not that
one: animate the scene the upload was exported from.

Once it is published and wired, check both in one call in a running
playtest: the published asset is played on the model and its joints compared
with the file, and the state is read from its loader.

```text
{ "action": "verify", "model": "<model path>", "animation_file": "<same path>", "animation_id": "rbxassetid://N", "slot": "idle" }
```

`slot` and animation_id alone check only what the loader holds, not how it
plays.

### A generated body

Without Blender, `generate_model` can make the body: pass the pieces as
`schema_groups` (`Body`, `Head`, `Tail`, `FrontLeft`, `FrontRight`,
`HindLeft`, `HindRight`), and each comes back as its own MeshPart named
`<group>_geom`, hung flat from a root as an upload is. What comes back is
rougher than a modelled body, so check it before rigging:

- **Facing.** A generated body has come back facing +Z, backward. Turn the
  model half a turn about Y if its head is toward +Z of its pivot.
- **Size.** It has come back well under the size asked for. Scale the model
  (`ScaleTo`) to the size it should be, then read each part's position and
  size back.
- **Pivots come from the pieces' boxes**, in the world: a leg's hip at the
  top centre of its box, the neck where the head's box meets the body's, the
  tail's root at the end of its box nearest the body. A generated leg is one
  piece, so it has no knee: its gait swings from the hip, and
  `footSliding` may need waiving.
- **Names.** The `quadruped` plan reads part names, so rename `FrontLeft_geom`
  to `FrontLeft` and so on before rigging, or give `declarations` yourself.
- **Read the range sheet** before animating: a piece the generator split
  badly, such as one leg half the height of the others, shows there. Generate
  again rather than animate a body like that.

Rig it with `replace: "importer"` and pivots in the world (no `pivot_space`).

## Waves: tails, tentacles, wings, spines

A chain that sways is written as a wave, not as keys. The animation's
`waves` send a sine down a list of joints, each joint trailing the one before
it, and `duration` gives the length in seconds. With waves, `keyframes` may
be left out; the tool writes twelve keys a cycle.

```text
{
  "name": "TailSway", "rig": "game.Workspace.Cat", "loop": true, "duration": 2,
  "waves": [{ "joints": ["Tail", "Tail2", "Tail3"], "axis": "Y", "amplitude": [10, 25], "lag": 0.15 }]
}
```

- `joints`: the chain's joint names, from where the wave starts (the base).
  The list need not be one limb: both wings with `lag: 0` flap together.
- `axis`: `"X"`, `"Y"` or `"Z"`, the body axis at rest the joints turn about,
  as `rotation` uses. Y swings a tail side to side; X lifts and lowers it.
- `amplitude`: degrees each way. `[first, last]` grows or fades it evenly
  along the chain; a tip that swings wider than its base reads as loose.
- `cycles`: how many times it repeats over the animation, 1 by default. In a
  loop it must be a whole number, and then the loop always joins up.
- `lag`: the share of a cycle each joint trails the one before, 0 by default.
  0.1 to 0.2 makes a travelling wave; 0 moves the chain as one.
- `offset`: degrees each joint is turned throughout, such as a curl;
  `[first, last]` as for amplitude.
- `phase`: the share of a cycle already run at time 0. Give each limb its own
  so they do not move in step.
- Two waves may drive the same joint only about different axes; together
  they move a tip in a circle or an ellipse, which is what makes an arm look
  alive. A joint a wave drives cannot also be keyed by hand in `keyframes`;
  other joints can, and the last keyframe's time may stand in for `duration`.
- A wave's turn counts toward the joint's range, so `amplitude` plus `offset`
  must fit the declared limits.

An octopus whose arms are `Arm1`…`Arm8`, each with joints `ArmN`, `ArmNB`,
`ArmNC`, `ArmND` from the body to the tip. Idle: every arm sways two ways,
each arm out of step with the next (arm 3 shown; repeat for each arm with
`phase` of arm / 8, and that plus 0.25):

```text
{
  "name": "Idle", "rig": "game.Workspace.Octopus", "loop": true, "priority": "Idle", "duration": 4,
  "waves": [
    { "joints": ["Arm3", "Arm3B", "Arm3C", "Arm3D"], "axis": "X", "amplitude": [4, 14], "lag": 0.12, "phase": 0.375 },
    { "joints": ["Arm3", "Arm3B", "Arm3C", "Arm3D"], "axis": "Z", "amplitude": [3, 10], "lag": 0.12, "phase": 0.625 }
  ]
}
```

Swim: every arm opens outward and closes together, tips trailing, so all
arms share one phase. An arm opens away from the body's middle: one at the
front or back turns about X, one at a side about Z, and one between about
both, in proportion, with the sign that swings it outward. Check the contact
sheet: if an arm swings inward, flip its amplitudes' sign.

```text
{
  "name": "Swim", "rig": "game.Workspace.Octopus", "loop": true, "priority": "Movement", "duration": 1.6,
  "waves": [
    { "joints": ["Arm1", "Arm1B", "Arm1C", "Arm1D"], "axis": "X", "amplitude": [18, 30], "lag": 0.1 },
    { "joints": ["Arm3", "Arm3B", "Arm3C", "Arm3D"], "axis": "Z", "amplitude": [18, 30], "lag": 0.1 }
  ]
}
```

A swimmer is rigged under an `AnimationController`: the animation moves its
arms, and a script moves its anchored root through the water.

## Gaits: walking any number of legs

A walk, trot or run is written as a `gait`, not as keys. One cycle fills
`duration`. Each leg's foot is placed every 1/30 s: while it is down it
travels straight back along the ground, and while it is up it swings forward
along an arc. The body rides just low enough for the legs to reach the
stride. Pass `locomotion: true` with it.

```text
{ "name": "Walk", "rig": "game.Workspace.Dog", "loop": true, "priority": "Movement", "duration": 1,
  "gait": { "pattern": "walk", "stride": 1.2 } }
```

- The legs are the rig's limbs that end in one of its declared feet, so the
  rig needs `limbs` and `feet` (the `quadruped` plan declares them; otherwise
  give `declarations`). Legs with a knee keep their feet on the ground. A leg
  of one piece only swings from its hip, so its foot skims and
  `footSliding` may fail: give the legs knees, or waive it.
- `pattern`, by where each leg stands at rest (its side, and its place from
  front to back): `walk` brings one foot down after another, each side's from
  back to front; `trot` moves diagonal feet together, and on six or eight
  legs alternates them in two sets; `pace` moves each side's feet together;
  `bound` lands the hind feet, then the front; `gallop` is a bound with the
  right feet just after the left. On two legs walk, trot and pace all
  alternate the legs. R15 and R6 take a gait too.
- `stride`: studs a foot travels on the ground each cycle. Start near half
  the leg's length for a walk and up to its length for a run. Too long is
  refused with the longest it can reach. Negative walks backward.
- **Legs need slack to stride.** A leg that is straight at rest cannot reach
  forward or back, so the body is lowered until it can, and the creature
  walks crouched with every knee bent, more the longer the stride. A leg
  that is bent at rest strides by straightening and the body stays level. So
  build legs bent: each knee off the line from hip to foot by about 15% of
  the leg's height, a front knee forward and a hind knee back. On a body
  already built straight, keep the stride short, or rebuild its legs. Look
  at the sheet's side view: a body lower than it stands is this.
- `duty`: the share of the cycle a foot is down. Defaults: walk 0.65, trot
  and pace 0.5, bound 0.4, gallop 0.35. Below 0.5 the body is airborne
  between steps.
- `lift`: studs a foot rises mid-swing. `bob`: studs the body dips, twice a
  cycle. `crouch`: studs lower the body rides throughout, for a stalk.
- `phases`: `{ <limb joint>: share of the cycle its foot comes down at }`,
  to set an order no pattern gives. `limbs`: the limb joints that step, when
  not all of them.
- The gait sets the root joint and every leg joint; none of them can be keyed
  by hand or driven by a wave. Everything else can: a head in `keyframes`, a
  tail in `waves`.
- The speed is `stride / (duty * duration)` studs a second. The check
  reports it as `groundSpeed`; pass that to `wire` as `ground_speed`, and
  keep it near how fast the creature moves (a Humanoid's `WalkSpeed`).
- On a body with no pair of hips, the `gaitSymmetry` check looks at the feet:
  every foot must step each cycle and share the ground evenly, and it reports
  the order the feet land in.

Recipes for a dog rigged with the `quadruped` plan (joints `FrontLeft`,
`FrontLeftKnee` and so on, `Neck`, `Tail`). Idle, with `grounded: true`:

```json creature
{
  "name": "DogIdle", "rig": "game.Workspace.Dog", "loop": true, "priority": "Idle", "duration": 3,
  "waves": [
    { "joints": ["Tail"], "axis": "Y", "amplitude": 14, "cycles": 2 },
    { "joints": ["Neck"], "axis": "X", "amplitude": 3 }
  ]
}
```

Walk, trot and run, each with `locomotion: true`:

```json creature
{
  "name": "DogWalk", "rig": "game.Workspace.Dog", "loop": true, "priority": "Movement", "duration": 1,
  "gait": { "pattern": "walk", "stride": 1.2 },
  "waves": [
    { "joints": ["Tail"], "axis": "Y", "amplitude": 10, "cycles": 2 },
    { "joints": ["Neck"], "axis": "X", "amplitude": 3, "cycles": 2 }
  ]
}
```

```json creature
{
  "name": "DogTrot", "rig": "game.Workspace.Dog", "loop": true, "priority": "Movement", "duration": 0.6,
  "gait": { "pattern": "trot", "stride": 1.4 }
}
```

```json creature
{
  "name": "DogRun", "rig": "game.Workspace.Dog", "loop": true, "priority": "Movement", "duration": 0.45,
  "gait": { "pattern": "gallop", "stride": 1.8, "duty": 0.4 }
}
```

A six-legged walk is a trot: three feet down while the other three swing.

```json creature
{
  "name": "BeetleWalk", "rig": "game.Workspace.Beetle", "loop": true, "priority": "Movement", "duration": 0.5,
  "gait": { "pattern": "trot", "stride": 0.7 }
}
```

A slither is one wave from the head to the tail about Y, growing toward the
tail:

```json creature
{
  "name": "Slither", "rig": "game.Workspace.Snake", "loop": true, "priority": "Movement", "duration": 1.5,
  "waves": [{ "joints": ["Neck", "Spine1", "Spine2", "Spine3", "Spine4", "Spine5", "Spine6", "Spine7"], "axis": "Y", "amplitude": [12, 22], "lag": 0.14 }]
}
```

A wing flap is a wave about Z on each wing, the left's amplitude the
negative of the right's so both rise together, the tips trailing:

```json creature
{
  "name": "WingFlap", "rig": "game.Workspace.Bird", "loop": true, "priority": "Movement", "duration": 0.5,
  "waves": [
    { "joints": ["WingRight", "WingRightTip"], "axis": "Z", "amplitude": [35, 25], "lag": 0.15 },
    { "joints": ["WingLeft", "WingLeftTip"], "axis": "Z", "amplitude": [-35, -25], "lag": 0.15 },
    { "joints": ["Tail"], "axis": "X", "amplitude": 6, "phase": 0.5 }
  ]
}
```
