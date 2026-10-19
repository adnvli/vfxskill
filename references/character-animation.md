# Character animation with `animate.mjs` (the original `animation` tool)

> **Ported skill:** tool names in this file (`build_instances`, `capture_moments`, the `animation`, `blender` and `upload_assets` tools, "it does X") come from the original toolkit. Do each step as `tools.md` maps it, with the Studio MCP and this skill's scripts.

Here the `animation` tool's `check` is `node SKILL_DIR/scripts/animate.mjs
<file.json> --sheet <file.png>` (with `--locomotion` or `--grounded`), and its
`build` is the Luau that `--out` writes, sent with `execute_luau`. `publish`,
`wire` and `verify` are done by hand (`tools.md`, "Animations").

Use this to author an R15 animation with the `animation` tool (check, build,
publish, wire, verify), to animate an NPC (see [NPCs](#npcs)), and to animate
a creature or other model on its own rig (see
[Creatures and other models](#creatures-and-other-models)).
Start from the recipe closest to the request and change
it. Run `check` before `build`: it validates the format, runs the motion checks
and returns a contact sheet, without touching Studio (for a model's own rig it
reads the rig from Studio, and changes nothing). Pass `locomotion: true`
for a walk or run, and `grounded: true` for anything else done standing on
the ground, such as an attack or an idle: it fails when a foot sinks into the
floor, which a crouch or lunge easily does.

## Format

```text
{ name, rig: "R15" | "R6", loop?, priority?, easing?, keyframes: [{ time, name?, easing?, joints: { <Joint>: pose }, markers? }] }
```

`rig` may also be a rigged model's path. `waves` (a chain that sways) and
`gait` (legs that walk), with `duration`, can replace or join `keyframes`;
`references/creature-animation.md` has both.

- Joints: `Root`, `Waist`, `Neck`, `LeftShoulder`, `LeftElbow`, `LeftWrist`,
  `RightShoulder`, `RightElbow`, `RightWrist`, `LeftHip`, `LeftKnee`,
  `LeftAnkle`, `RightHip`, `RightKnee`, `RightAnkle`, and the props `Weapon`,
  `OffHand` and `Sheath` (see "Props").
- The first keyframe is at 0. A joint keyed in any keyframe must also be keyed
  in the first. A joint left out of a later keyframe just keeps moving toward
  its next key.
- A loop's last keyframe must repeat its first, so the loop joins up.
- A joint that turns more than 90° between two of its keys gets in-between
  keys added for it, along the short way round; `animation.inBetweens` in the
  result counts them. Write a big swing as its key poses, not its arithmetic.
- The short way round must be the way you mean. A turn of 175° or more is
  refused, and a wide arc, such as an overhead slash that ends low on the
  other side, needs a key partway along it (the arm forward at the middle
  of the swing) so it goes over the top rather than through the body.
- Elastic and Bounce turns over 90° are not split: split them yourself.
- `easing` is `{ style, direction }`. Styles are Linear, Constant, Cubic,
  CubicV2, Elastic and Bounce; directions are In, Out and InOut. It can be set
  on a joint, a keyframe or the whole animation, and the nearest one applies.

## Markers

A keyframe's `markers` puts named events at its time, for scripts to time
gameplay to: the frame a sword hit lands, a footstep, a whoosh.

```text
{ time: 0.32, joints: {}, markers: [{ name: "Hit", value: "light" }] }
```

- A script listens with `track:GetMarkerReachedSignal("Hit")`; its handler
  receives `value` (a string, `""` when left out).
- A keyframe that only carries markers may key no joints: `joints: {}`.
- A keyframe's `name` is not a marker. It only fires the older
  `KeyframeReached` event, so use `markers` for anything a script waits on.

## Poses

Each pose takes one of these:

- `aim: [right, up, forward]` (shoulders and hips): the direction the upper arm
  or thigh points, seen from the character. `[0, -1, 0]` hangs it at rest,
  `[1, 0, 0]` holds the right arm straight out to the side, and `[0, -1, 0.4]`
  swings a leg forward. The vector does not need to be unit length.
- `bendToward: [right, up, forward]`, with `aim`: which way the elbow or knee
  folds. Leave it out to fold as at rest: arms forward, legs back. A raised
  waving arm folds up: `bendToward: [0, 1, 0]`.
- `bend: degrees` (elbows and knees): 0 is straight and 90 a right angle.
- `rotation: [x, y, z]` (any joint): degrees about the parent part's axes,
  applied as `CFrame.Angles` does. Use it for the torso, head, wrists and
  ankles. `Waist` at -X leans forward and at +X leans back. `Neck` at +X tips
  the head back. An ankle at +X lifts the toe.
- `position: [x, y, z]` (`Root` only): studs that offset the whole body.
  Negative y lowers the body, as a stride or crouch needs.

Prefer `aim` and `bend` for arms and legs. Working out a combined Euler rotation
by hand is where poses go wrong.

## Reaching a point: aimAt

`aimAt: [right, up, forward]` (shoulders and hips) puts the limb's end on a
point, in studs from the HumanoidRootPart's centre, however the body is posed
at that moment. Use it wherever a limb must meet something: a foot on the
ground, a hand on a hilt or on the sheath.

- On R15 the end is the wrist or the ankle, and the elbow or knee bends to
  reach it: `aimAt` keys the elbow or knee, so leave them out of that
  keyframe. On a leg it also keys the ankle, laying the foot flat, facing the
  way the body does.
- On R6, whose limbs cannot bend, the block points through the point: its end
  lands on it only when the point is exactly a limb's length away, and passes
  beyond it when nearer. Check R6 feet with `grounded: true`.
- `bendToward` turns the elbow or knee, as with `aim`.
- A point out of reach is refused, saying how far the limb reaches.
- **Planting.** A limb aimed at the same point in one of its keys and the next
  is planted there: the compiler solves it again every thirtieth of a second
  between them, so a foot stays within a few hundredths of a stud of its point
  while the body lunges, drops or turns over it, and keeps its heading. `animation.inBetweens` counts those keys.
- To step, give the foot a different point, and lift it on a key between: a
  foot moved along the ground drags through it.
- **Two-handed holds.** `LeftShoulder: { grip: 0.45 }` puts the left hand
  on the weapon's handle, 0.45 studs from the right hand toward the pommel
  (hands side by side). Between two keys that both grip, the arm follows the
  handle, solved every sixtieth of a second, so the hands stay together
  through the fastest swing. It keys `LeftElbow`: leave it and `LeftWrist`
  out. The handle must be within the left arm's reach: Roblox shoulders are
  wide for their arms, so bring the right hand toward the centre front,
  ideally with `aimAt` (for example `[-0.2, 0.5, 0.8]` for a two-handed
  guard), and turn the torso toward the weapon for low cuts.
- Heights: the ground is 3.19 studs below the HumanoidRootPart's centre on
  R15 and 3 on R6. An R15 ankle stands 0.26 above the ground, so a planted
  R15 ankle is at `up` -2.93; an R6 leg's end is its sole, at -3.

## Recipes

Every recipe below compiles and passes every motion check. A unit test holds
each of them to that. Pass `locomotion: true` for walk and run, which turns on
the ground-contact, foot-sliding and gait-symmetry checks.

### Wave (loop)

```json
{ "name": "Wave", "rig": "R15", "loop": true, "easing": { "style": "CubicV2", "direction": "InOut" }, "keyframes": [
  { "time": 0, "joints": { "RightShoulder": { "aim": [1, 0.3, 0.4], "bendToward": [0, 1, 0] }, "RightElbow": { "bend": 70 } } },
  { "time": 0.3, "joints": { "RightElbow": { "bend": 115 } } },
  { "time": 0.6, "joints": { "RightShoulder": { "aim": [1, 0.3, 0.4], "bendToward": [0, 1, 0] }, "RightElbow": { "bend": 70 } } }
] }
```

The upper arm holds still, out to the side and slightly forward. The forearm
swings between 70° and 115°. For a bigger wave, widen that range.

### Idle (loop)

```json
{ "name": "Idle", "rig": "R15", "loop": true, "easing": { "style": "CubicV2", "direction": "InOut" }, "keyframes": [
  { "time": 0, "joints": { "Waist": { "rotation": [0, 0, 0] }, "Neck": { "rotation": [0, 0, 0] }, "LeftShoulder": { "aim": [-0.08, -1, 0] }, "RightShoulder": { "aim": [0.08, -1, 0] }, "LeftElbow": { "bend": 8 }, "RightElbow": { "bend": 8 } } },
  { "time": 1.5, "joints": { "Waist": { "rotation": [3, 0, 0] }, "Neck": { "rotation": [-3, 0, 0] }, "LeftShoulder": { "aim": [-0.14, -1, 0] }, "RightShoulder": { "aim": [0.14, -1, 0] }, "LeftElbow": { "bend": 14 }, "RightElbow": { "bend": 14 } } },
  { "time": 3, "joints": { "Waist": { "rotation": [0, 0, 0] }, "Neck": { "rotation": [0, 0, 0] }, "LeftShoulder": { "aim": [-0.08, -1, 0] }, "RightShoulder": { "aim": [0.08, -1, 0] }, "LeftElbow": { "bend": 8 }, "RightElbow": { "bend": 8 } } }
] }
```

This is a slow breath. Keep idle motion small and slow: a few degrees over
seconds.

### Walk (loop, `locomotion: true`)

```json
{ "name": "Walk", "rig": "R15", "loop": true, "easing": { "style": "Linear" }, "keyframes": [
  { "time": 0, "joints": { "Root": { "position": [0, -0.09, 0] }, "LeftHip": { "aim": [0, -0.92, 0.38] }, "LeftKnee": { "bend": 11 }, "LeftAnkle": { "rotation": [-11, 0, 0] }, "RightHip": { "aim": [0, -0.98, -0.19] }, "RightKnee": { "bend": 11 }, "RightAnkle": { "rotation": [22, 0, 0] }, "LeftShoulder": { "aim": [0, -1, -0.35] }, "RightShoulder": { "aim": [0, -1, 0.35] }, "LeftElbow": { "bend": 15 }, "RightElbow": { "bend": 15 } } },
  { "time": 0.25, "joints": { "Root": { "position": [0, -0.01, 0] }, "LeftHip": { "aim": [0, -0.99, 0.11] }, "LeftKnee": { "bend": 12 }, "LeftAnkle": { "rotation": [6, 0, 0] }, "RightHip": { "aim": [0, -0.76, 0.65] }, "RightKnee": { "bend": 76 }, "RightAnkle": { "rotation": [36, 0, 0] }, "LeftShoulder": { "aim": [0, -1, 0] }, "RightShoulder": { "aim": [0, -1, 0] }, "LeftElbow": { "bend": 15 }, "RightElbow": { "bend": 15 } } },
  { "time": 0.5, "joints": { "Root": { "position": [0, -0.09, 0] }, "LeftHip": { "aim": [0, -0.98, -0.19] }, "LeftKnee": { "bend": 11 }, "LeftAnkle": { "rotation": [22, 0, 0] }, "RightHip": { "aim": [0, -0.92, 0.38] }, "RightKnee": { "bend": 11 }, "RightAnkle": { "rotation": [-11, 0, 0] }, "LeftShoulder": { "aim": [0, -1, 0.35] }, "RightShoulder": { "aim": [0, -1, -0.35] }, "LeftElbow": { "bend": 15 }, "RightElbow": { "bend": 15 } } },
  { "time": 0.75, "joints": { "Root": { "position": [0, -0.01, 0] }, "LeftHip": { "aim": [0, -0.76, 0.65] }, "LeftKnee": { "bend": 76 }, "LeftAnkle": { "rotation": [36, 0, 0] }, "RightHip": { "aim": [0, -0.99, 0.11] }, "RightKnee": { "bend": 12 }, "RightAnkle": { "rotation": [6, 0, 0] }, "LeftShoulder": { "aim": [0, -1, 0] }, "RightShoulder": { "aim": [0, -1, 0] }, "LeftElbow": { "bend": 15 }, "RightElbow": { "bend": 15 } } },
  { "time": 1, "joints": { "Root": { "position": [0, -0.09, 0] }, "LeftHip": { "aim": [0, -0.92, 0.38] }, "LeftKnee": { "bend": 11 }, "LeftAnkle": { "rotation": [-11, 0, 0] }, "RightHip": { "aim": [0, -0.98, -0.19] }, "RightKnee": { "bend": 11 }, "RightAnkle": { "rotation": [22, 0, 0] }, "LeftShoulder": { "aim": [0, -1, -0.35] }, "RightShoulder": { "aim": [0, -1, 0.35] }, "LeftElbow": { "bend": 15 }, "RightElbow": { "bend": 15 } } }
] }
```

The keys alternate between contact, with both feet down and the body lowered,
and passing, with the swing foot lifted under the body. Each arm swings against
its own side's leg. The ankles keep the planted foot flat. The body is lowered
at contact so that the straighter legs reach the ground without sinking into
it.

- To go faster, scale every time down.
- For a longer stride, raise the hips' forward and back aims together. Then
  lower `Root` a little more at contact, or the feet sink into the ground.

### Run (loop, `locomotion: true`)

```json
{ "name": "Run", "rig": "R15", "loop": true, "easing": { "style": "Linear" }, "keyframes": [
  { "time": 0, "joints": { "Root": { "position": [0, -0.18, 0] }, "Waist": { "rotation": [-10, 0, 0] }, "LeftHip": { "aim": [0, -0.82, 0.57] }, "LeftKnee": { "bend": 25 }, "LeftAnkle": { "rotation": [-10, 0, 0] }, "RightHip": { "aim": [0, -1, 0.05] }, "RightKnee": { "bend": 50 }, "RightAnkle": { "rotation": [48, 0, 0] }, "LeftShoulder": { "aim": [0, -1, -0.6] }, "RightShoulder": { "aim": [0, -1, 0.6] }, "LeftElbow": { "bend": 85 }, "RightElbow": { "bend": 85 } } },
  { "time": 0.17, "joints": { "Root": { "position": [0, -0.08, 0] }, "Waist": { "rotation": [-10, 0, 0] }, "LeftHip": { "aim": [0, -0.95, 0.3] }, "LeftKnee": { "bend": 33 }, "LeftAnkle": { "rotation": [16, 0, 0] }, "RightHip": { "aim": [0, -0.63, 0.77] }, "RightKnee": { "bend": 95 }, "RightAnkle": { "rotation": [45, 0, 0] }, "LeftShoulder": { "aim": [0, -1, 0] }, "RightShoulder": { "aim": [0, -1, 0] }, "LeftElbow": { "bend": 85 }, "RightElbow": { "bend": 85 } } },
  { "time": 0.34, "joints": { "Root": { "position": [0, -0.18, 0] }, "Waist": { "rotation": [-10, 0, 0] }, "LeftHip": { "aim": [0, -1, 0.05] }, "LeftKnee": { "bend": 50 }, "LeftAnkle": { "rotation": [48, 0, 0] }, "RightHip": { "aim": [0, -0.82, 0.57] }, "RightKnee": { "bend": 25 }, "RightAnkle": { "rotation": [-10, 0, 0] }, "LeftShoulder": { "aim": [0, -1, 0.6] }, "RightShoulder": { "aim": [0, -1, -0.6] }, "LeftElbow": { "bend": 85 }, "RightElbow": { "bend": 85 } } },
  { "time": 0.51, "joints": { "Root": { "position": [0, -0.08, 0] }, "Waist": { "rotation": [-10, 0, 0] }, "LeftHip": { "aim": [0, -0.63, 0.77] }, "LeftKnee": { "bend": 95 }, "LeftAnkle": { "rotation": [45, 0, 0] }, "RightHip": { "aim": [0, -0.95, 0.3] }, "RightKnee": { "bend": 33 }, "RightAnkle": { "rotation": [16, 0, 0] }, "LeftShoulder": { "aim": [0, -1, 0] }, "RightShoulder": { "aim": [0, -1, 0] }, "LeftElbow": { "bend": 85 }, "RightElbow": { "bend": 85 } } },
  { "time": 0.68, "joints": { "Root": { "position": [0, -0.18, 0] }, "Waist": { "rotation": [-10, 0, 0] }, "LeftHip": { "aim": [0, -0.82, 0.57] }, "LeftKnee": { "bend": 25 }, "LeftAnkle": { "rotation": [-10, 0, 0] }, "RightHip": { "aim": [0, -1, 0.05] }, "RightKnee": { "bend": 50 }, "RightAnkle": { "rotation": [48, 0, 0] }, "LeftShoulder": { "aim": [0, -1, -0.6] }, "RightShoulder": { "aim": [0, -1, 0.6] }, "LeftElbow": { "bend": 85 }, "RightElbow": { "bend": 85 } } }
] }
```

The run has the same structure as the walk, with these differences:

- a forward lean (`Waist` -10);
- a longer, lower stride;
- a higher knee lift;
- arms bent to 85° and swinging wider.

The knee lift stops at 95° from about 25°: a bigger lift reads as a sprint.

### Jump (one shot)

```json
{ "name": "Jump", "rig": "R15", "loop": false, "priority": "Movement", "easing": { "style": "CubicV2", "direction": "Out" }, "keyframes": [
  { "time": 0, "joints": { "LeftShoulder": { "aim": [0, -1, 0] }, "RightShoulder": { "aim": [0, -1, 0] }, "LeftElbow": { "bend": 0 }, "RightElbow": { "bend": 0 }, "LeftHip": { "aim": [0, -1, 0] }, "RightHip": { "aim": [0, -1, 0] }, "LeftKnee": { "bend": 0 }, "RightKnee": { "bend": 0 }, "LeftAnkle": { "rotation": [0, 0, 0] }, "RightAnkle": { "rotation": [0, 0, 0] } } },
  { "time": 0.12, "joints": { "LeftShoulder": { "aim": [-1, -0.2, 0.25] }, "RightShoulder": { "aim": [1, -0.2, 0.25] } } },
  { "time": 0.3, "joints": { "LeftShoulder": { "aim": [-0.5, 1, 0.2] }, "RightShoulder": { "aim": [0.5, 1, 0.2] }, "LeftElbow": { "bend": 20 }, "RightElbow": { "bend": 20 }, "LeftHip": { "aim": [0, -1, 0.35] }, "RightHip": { "aim": [0, -1, 0.1] }, "LeftKnee": { "bend": 45 }, "RightKnee": { "bend": 25 }, "LeftAnkle": { "rotation": [-15, 0, 0] }, "RightAnkle": { "rotation": [-10, 0, 0] } } }
] }
```

The Humanoid does the jumping. The animation only poses the body in the air:
arms thrown up and knees tucked. The arms pass through the side at 0.12 s,
because going straight from down to overhead would be about half a turn, and
the key at the side says which way round the arms go.

## Props

A sword, a second blade, a shield or a sheath is animated through a prop
joint. Each moves one part, and the prop's other parts are welded to it:

| Joint | Moves | From | C0 (the game sets it) |
| --- | --- | --- | --- |
| `Weapon` | `BodyAttach` | right hand (R6: `Right Arm`) | `CFrame.new(RightGripAttachment.Position) * CFrame.Angles(math.rad(-90), 0, 0)` |
| `OffHand` | `OffHandAttach` | left hand (R6: `Left Arm`) | `CFrame.new(LeftGripAttachment.Position) * CFrame.Angles(math.rad(-90), 0, 0)` |
| `Sheath` | `SheathAttach` | `LowerTorso` (R6: `Torso`) | R15 `CFrame.new(-1, 0, 0) * CFrame.Angles(math.rad(100), 0, 0)`; R6 `CFrame.new(-1, -0.8, 0) * CFrame.Angles(math.rad(100), 0, 0)` |

- A prop joint takes `rotation` only: degrees about its body part's own axes,
  pivoting at the prop's part.
- A hand prop points forward out of the fist at rest, square to the forearm
  (the prop part's +Y). `[-90, 0, 0]` runs it straight out along the forearm,
  as in a thrust; `[90, 0, 0]` folds it back along the arm; `Y` rolls it
  about the forearm.
- The sheath's mouth sits at the left hip, and at rest it runs back and a
  little down (the prop part's +Y). `rotation` about `X` tips its tail up or
  down; about `Y`, swings it forward or back round the hip.
- The preview draws stand-ins, a 4-stud blade for a hand prop and a 3.8-stud
  sheath, and only for props the animation keys.
- A prop joint may turn up to 7200°/s before the velocity check fails, so a
  fast flick needs no waiver.

Roblox's own grip weld cannot be animated, so the game has to rig each prop:

- the prop's part (`BodyAttach`, `OffHandAttach` or `SheathAttach`)
  unanchored, `CanCollide` off and `Massless` on, with every other part of
  the prop welded to it (`WeldConstraint`), and the prop modelled along the
  part's up (+Y) axis: a blade from the grip, a sheath from its mouth;
- for held props, a Tool with `RequiresHandle` off and no part named
  `Handle`, so Roblox adds no weld of its own, and this Script in the Tool,
  which swaps in the motors the animation drives on equip:

```luau
local tool = script.Parent
local GRIPS = { BodyAttach = { "RightHand", "Right Arm", "RightGripAttachment" }, OffHandAttach = { "LeftHand", "Left Arm", "LeftGripAttachment" } }
local motors: { Motor6D } = {}

tool.Equipped:Connect(function()
	local character = tool.Parent
	for partName, grip in GRIPS do
		local part = tool:FindFirstChild(partName)
		local hand = character:FindFirstChild(grip[1]) or character:FindFirstChild(grip[2])
		local attachment = hand and hand:FindFirstChild(grip[3])
		if part and attachment then
			local motor = Instance.new("Motor6D")
			motor.Name = partName
			motor.Part0 = hand
			motor.Part1 = part
			-- The attachment's position, turned the same on every rig: R15's grip
			-- attachments are already turned this way, R6's are not.
			motor.C0 = CFrame.new(attachment.Position) * CFrame.Angles(math.rad(-90), 0, 0)
			motor.Parent = hand
			table.insert(motors, motor)
		end
	end
end)

tool.Unequipped:Connect(function()
	for _, motor in motors do
		motor:Destroy()
	end
	table.clear(motors)
end)
```

- for a worn sheath, a Model named `Sheath` holding `SheathAttach`, kept in
  `ServerStorage`, and this Script in `StarterCharacterScripts`, which gives
  every character one on spawn:

```luau
local character = script.Parent
local humanoid = character:WaitForChild("Humanoid")
local isR6 = humanoid.RigType == Enum.HumanoidRigType.R6
local body = character:WaitForChild(if isR6 then "Torso" else "LowerTorso")
local sheath = game:GetService("ServerStorage"):WaitForChild("Sheath"):Clone()
local mouth = sheath:WaitForChild("SheathAttach")
local offset = if isR6 then CFrame.new(-1, -0.8, 0) else CFrame.new(-1, 0, 0)

local motor = Instance.new("Motor6D")
motor.Name = "SheathAttach"
motor.Part0 = body
motor.Part1 = mouth
motor.C0 = offset * CFrame.Angles(math.rad(100), 0, 0)
motor.Parent = body
sheath.Parent = character
```

- Play an attack from the tool's `Activated` on the character's `Animator`,
  and apply damage from the animation's `Hit` marker, not from a timer (see
  `full.md`, "Priorities and markers").
- To verify a prop animation in a playtest, equip the tool (and give the
  character its sheath) first: without the motor, verify reports that the
  character has nothing for the prop joint to move.
- For a draw from the sheath, key `Sheath` and `Weapon` together so the blade
  leaves along the sheath's line, and put the right hand on the hilt at the
  sheath's mouth with `aimAt`; the left hand can hold the sheath the same
  way.

### Lunge (one shot, with a weapon, `grounded: true`)

```json
{ "name": "Lunge", "rig": "R15", "priority": "Action", "keyframes": [
  { "time": 0, "joints": { "Root": { "position": [0, 0, 0] }, "Waist": { "rotation": [0, 0, 0] }, "LeftHip": { "aimAt": [-0.5, -2.93, 0] }, "RightHip": { "aimAt": [0.5, -2.93, 0] }, "RightShoulder": { "aim": [0.2, -0.8, 0.6] }, "RightElbow": { "bend": 50 }, "Weapon": { "rotation": [0, 0, 0] } } },
  { "time": 0.1, "joints": { "Root": { "position": [0, -0.2, 0.2], "rotation": [0, 12, 0] }, "LeftHip": { "aimAt": [-0.6, -2.6, 0.3] }, "RightHip": { "aimAt": [0.55, -2.6, -0.45] } } },
  { "time": 0.2, "name": "Coil", "joints": { "Root": { "position": [0, -0.5, 0.4], "rotation": [0, 25, 0] }, "Waist": { "rotation": [0, 15, 0] }, "LeftHip": { "aimAt": [-0.7, -2.93, 0.6] }, "RightHip": { "aimAt": [0.6, -2.93, -0.9] }, "RightShoulder": { "aim": [0.6, -0.3, -0.5] }, "RightElbow": { "bend": 90 }, "Weapon": { "rotation": [-90, 0, 0] } } },
  { "time": 0.32, "joints": { "Root": { "position": [0, -0.8, -0.6], "rotation": [-10, -10, 0] }, "Waist": { "rotation": [-10, -10, 0] }, "LeftHip": { "aimAt": [-0.7, -2.93, 0.6] }, "RightHip": { "aimAt": [0.6, -2.93, -0.9] }, "RightShoulder": { "aim": [0.1, 0.05, 1] }, "RightElbow": { "bend": 5 }, "Weapon": { "rotation": [-90, 0, 0] } }, "markers": [{ "name": "Hit" }] },
  { "time": 0.75, "easing": { "style": "CubicV2", "direction": "InOut" }, "joints": { "Root": { "position": [0, -0.35, 0], "rotation": [0, 15, 0] }, "Waist": { "rotation": [0, 0, 0] }, "LeftHip": { "aimAt": [-0.7, -2.93, 0.6] }, "RightHip": { "aimAt": [0.6, -2.93, -0.9] }, "RightShoulder": { "aim": [0.3, -0.6, 0.8] }, "RightElbow": { "bend": 40 }, "Weapon": { "rotation": [-40, 0, 0] } } }
] }
```

A thrust from a low stance. The feet step out to a wide stance, lifted on the
way, and stay planted from `Coil` to the end while the body drops, twists and
drives forward; `Hit` fires with the arm and blade straight out. The recovery
rises to a guard over the same planted feet.

- To lunge deeper, lower `Root` further at `Hit`; if a leg cannot reach its
  point, the error says by how much.
- Mirror it for the left side by swapping the feet's `right` signs.

### Slash (one shot, with a weapon)

```json
{ "name": "Slash", "rig": "R15", "priority": "Action", "keyframes": [
  { "time": 0, "joints": { "Waist": { "rotation": [0, 0, 0] }, "RightShoulder": { "aim": [0.2, -0.8, 0.6] }, "RightElbow": { "bend": 50 }, "Weapon": { "rotation": [0, 0, 0] } } },
  { "time": 0.25, "name": "WindUp", "joints": { "Waist": { "rotation": [0, 30, 0] }, "RightShoulder": { "aim": [0.4, 1, 0.2], "bendToward": [0, 0, -1] }, "RightElbow": { "bend": 70 }, "Weapon": { "rotation": [0, 0, 0] } } },
  { "time": 0.37, "joints": { "Waist": { "rotation": [0, -5, 0] }, "RightShoulder": { "aim": [0.15, 0, 1], "bendToward": [0, 1, 0] }, "RightElbow": { "bend": 10 }, "Weapon": { "rotation": [-95, 0, 0] } }, "markers": [{ "name": "Hit" }] },
  { "time": 0.47, "easing": { "style": "CubicV2", "direction": "Out" }, "joints": { "Waist": { "rotation": [0, -30, 0] }, "RightShoulder": { "aim": [-0.4, -0.6, 0.7], "bendToward": [0, 1, 0.3] }, "RightElbow": { "bend": 15 }, "Weapon": { "rotation": [-70, 0, 0] } } },
  { "time": 0.8, "joints": { "Waist": { "rotation": [0, 0, 0] }, "RightShoulder": { "aim": [0.2, -0.8, 0.6] }, "RightElbow": { "bend": 50 }, "Weapon": { "rotation": [0, 0, 0] } } }
] }
```

An overhead chop. The ready guard holds the blade up in front. The wind-up
lifts the arm with the elbow folding back, so the blade hangs down the back,
and twists the waist right. The swing brings the arm forward over the top
while `Weapon` snaps the blade out along the arm; the `Hit` marker fires when
the blade is level in front of the chest. The follow-through carries it low
with `CubicV2 Out`, and the last key returns to the guard.

- To swing faster, shrink the gap between the wind-up and `Hit`. Below about
  0.08 s the shoulder passes the velocity check's 2500°/s; waive `velocity`
  when that snap is meant. `Weapon` has its own limit of 7200°/s, so a fast
  flick of the blade alone needs no waiver.
- For a thrust, keep the arm aimed forward and move `Weapon` to `[-90, 0, 0]`.

## R6

Many places, combat games especially, give players R6 characters: six blocks
with no elbows, wrists, knees, ankles or waist. An R15 animation does not play
on them, so find which rig the players use before animating:

- In a running playtest, read the character's `Humanoid.RigType` (for example
  with `eval_client_runtime`). A `StarterCharacter` in `StarterPlayer` decides
  it too. If a place lets players choose, make one animation for each rig.
- `verify` refuses when the playtest character's rig is not the animation's.

Set `rig: "R6"`. Its joints are `Root`, `Neck`, `LeftShoulder`,
`RightShoulder`, `LeftHip`, `RightHip` and `Weapon`, and they take poses in the
same terms as on R15: `aim` points an arm or leg the same way, and a
`rotation` turns about the same body axes. There is no `bend`: an R6 arm or
leg swings as one rigid block. The contact sheet draws the R6 blocks. Foot
sliding is reported as not checked for R6: its limit was set on R15 feet.

### Walk (R6, loop, `locomotion: true`)

```json
{ "name": "WalkR6", "rig": "R6", "loop": true, "easing": { "style": "CubicV2", "direction": "InOut" }, "keyframes": [
  { "time": 0, "joints": { "LeftHip": { "aim": [0, -1, 0.4] }, "RightHip": { "aim": [0, -1, -0.4] }, "LeftShoulder": { "aim": [0, -1, -0.4] }, "RightShoulder": { "aim": [0, -1, 0.4] } } },
  { "time": 0.4, "joints": { "LeftHip": { "aim": [0, -1, -0.4] }, "RightHip": { "aim": [0, -1, 0.4] }, "LeftShoulder": { "aim": [0, -1, 0.4] }, "RightShoulder": { "aim": [0, -1, -0.4] } } },
  { "time": 0.8, "joints": { "LeftHip": { "aim": [0, -1, 0.4] }, "RightHip": { "aim": [0, -1, -0.4] }, "LeftShoulder": { "aim": [0, -1, -0.4] }, "RightShoulder": { "aim": [0, -1, 0.4] } } }
] }
```

The legs swing as rigid pendulums, about 22° each way, with each arm against
its own side's leg. To go faster, scale the times down; for a run, widen the
swing and lean with `Root` `rotation`.

### Wave (R6, loop)

```json
{ "name": "WaveR6", "rig": "R6", "loop": true, "easing": { "style": "CubicV2", "direction": "InOut" }, "keyframes": [
  { "time": 0, "joints": { "RightShoulder": { "aim": [1, 0.5, 0.2] } } },
  { "time": 0.35, "joints": { "RightShoulder": { "aim": [1, 1.4, 0.2] } } },
  { "time": 0.7, "joints": { "RightShoulder": { "aim": [1, 0.5, 0.2] } } }
] }
```

With no elbow, the whole arm waves, raised out to the side and rocking up and
down. An R6 arm turns about the top of its inner edge, so one raised past the
shoulder brushes the head's block: keep the hand out to the side, not over
the head.

## NPCs

An NPC is a Model the game moves, not a player's character. Roblox's `Animate`
script is a LocalScript that runs only under a player, so on an NPC it plays
nothing. The `animation` tool puts a loader in the model instead:
`ModelAnimate`, a server Script whose code never changes. It plays the
model's idle while it stands and its walk or run while it moves, reading the
Humanoid's `Running` speed. It cross-fades over 0.2 s, and what it plays
reaches every client. Every copy of the model carries its loader, so a
spawner that clones the NPC needs nothing else.

1. **Make the body.** `rig {model: "game.Workspace.Guard", stock: "R15",
   position: [x, y, z]}` makes Roblox's stock R15 or R6 body with its feet at
   the position, as one undo step. Its loader already holds Roblox's default
   idle, walk and run, listed in the result's `states`, so it animates as soon
   as the game moves it. Make it where the game keeps it, for example
   `game.ServerStorage.Guard` for a spawner to clone.
2. **Give it its own animations.** Adapt the Idle and Walk recipes above (the
   Run recipe for a run). Check a gait with `locomotion: true` and keep the
   `groundSpeed` the check returns: how fast its planted feet travel backward,
   in studs a second. It is 2.21 for the Walk recipe and 4.08 for the Run.
   Build and publish each, then
   `wire {model, slot: "walk", animation_id, ground_speed, expected_id}`,
   where `expected_id` is the default the state holds now, from `rig`'s
   `states`. Wire the idle the same way, without `ground_speed`.
3. **Match its speed to its walk.** The loader plays a gait at the model's
   speed divided by the gait's ground speed, from half to twice as fast, so
   the feet keep pace. Beyond that range they slide. A Humanoid's WalkSpeed
   defaults to 16, which is far beyond the Walk recipe's range of 1.1 to 4.4.
   Either set the NPC's WalkSpeed within the range (the Run recipe suits 2 to
   8.2), or make a faster gait and check it again for its new ground speed:
   halving every keyframe time doubles the ground speed, and a longer stride
   raises it too. Quickened steps alone soon look frantic, so lengthen the
   stride as well, and look at the contact sheet. With a walk and a run
   both wired with their ground speeds, the loader plays the run above the
   speed halfway between them, and the walk below it.
4. **Move it** from a server Script with `Humanoid:MoveTo` or a path; the
   `roblox-npc-ai` skill has patrols, chases and spawners. Do not play the
   idle or walk from that script, since the loader already plays them.
5. **Play a one-shot**, such as an attack or a wave, from the game's script on
   the model's Animator, at `Action` priority so it plays over the walk:

   ```lua
   local animator = npc.Humanoid:WaitForChild("Animator")
   local animation = Instance.new("Animation")
   animation.AnimationId = "rbxassetid://<published id>"
   local attack = animator:LoadAnimation(animation)
   attack.Priority = Enum.AnimationPriority.Action
   attack:GetMarkerReachedSignal("Hit"):Connect(function() --[[ deal damage ]] end)
   attack:Play()
   ```

6. **Verify it in a playtest.** Start one with
   `solo_playtest {action: "start", mode: "play"}`. When the game's own script
   moves the NPC, as a patrol does, `verify {model: "game.Workspace.Guard"}`
   watches it on the server until it has seen it walk and stand for two
   seconds each, or for twenty seconds at most, so a patrol needs a pause at
   each end. For an NPC nothing moves yet,
   `verify {model, position: [x, y, z]}` walks its Humanoid there and watches
   it stand; do not use `position` while a script moves it, since the two
   fight over its Humanoid. Either way it passes when the walk played for most
   of the time the NPC moved, the idle for most of the time it stood, and the
   walk at the pace its speed needs. A failure says what to change, such as
   the WalkSpeed to set. With `animation` it plays that animation on the NPC,
   and compares its joints as `verify` does on a character.

R6 reports no ground speed, since its feet are not checked for sliding, so the
loader plays an R6 gait at its own pace.

## Creatures and other models

A creature or any model that is not a stock body is animated on its own rig:
give the model's path as `rig`. Load `references/creature-animation.md` for
reading a model's rig, rigging loose pieces with `rig`, `waves` for tails,
tentacles, wings and spines, `gait` for walking any number of legs (it works
on R15 and R6 too), and tested creature recipes.

## Posing a joint from code

An effect can hold a pose without an animation asset, such as an arm raised
toward a target for a cast, by setting the joint's `Transform` every frame.
The recipe, for `Motor6D` and `AnimationConstraint` joints, is in
`references/vfx-camera-world.md`, "A cast pose from code".

## Reading the result

- The contact sheet shows five evenly spaced moments, and a column for each
  named keyframe, each marker and the fastest instant, up to eight in all:
  `sheet.shows` names them. Name the keys that matter (`WindUp`, `Hit`) so a
  fast strike is always drawn. The top row is the front
  three-quarter. The bottom row looks straight at the front, where arm and head
  motion reads; for a gait (`locomotion: true`) it looks from the side, where
  strides and foot plants read.
- Check the pose against the request, not only the checks. The checks catch
  broken motion, but a pose can pass them and still not be the gesture that was
  asked for.
- Build the same `name` again to revise an animation. The toolkit shows the versions
  in one card, and `build` replaces the sequence when you pass the revision the
  earlier build returned.
