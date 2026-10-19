# VFX camera, screen and world

Load this with `vfx-design.md` and `vfx-craft.md` when an effect moves the
camera, flashes the screen, lights or marks the world, or poses the caster.

## Camera, screen and world

The studied scripts do these around the particles *(measured)*. The emit
module does not; write them alongside it when the effect needs them.

**Field of view:**
- Widen it by 10-20° over 0.6-1.5 s while charging.
- Snap it back past the default (by up to 20°) in 0.15-0.25 s at release.
- For a hit, punch it in by 5-7° over 4 frames and recover on Back Out.

**Blur and tint:**
- Blur 6-15 at release: 0.01 s in, 0.1-0.65 s out.
- A 0.25 s screen tint toward the effect's hue.

**Impact frames** (`ColorCorrectionEffect`), 1-3 frames each:
- black: Contrast 2 to 3, Saturation -1;
- white: Brightness 1, Saturation -1;
- the two can overlap about 0.15 s apart.

A tinted full-screen flash fading over 0.4 s is a lighter alternative.

**Camera shake:** rotation only, gated by distance (150-350 studs). Stop
every sustained shake. Take each frame's offset back off: the player's
camera works out its next frame from where it is now, so a shake written as
`camera.CFrame *= offset` every frame builds up and tips the view toward the
floor or the sky. Undo last frame's offset in a `BindToRenderStep` step just
before the camera scripts (`Enum.RenderPriority.Camera.Value - 1`) and apply
the new one just after them (`+ 1`). Two missile runs drifted the camera this
way and fixed it like this.

| Use | Magnitude | Roughness | Fade out |
| --- | --- | --- | --- |
| Light hit | 0.3-0.55 | 3-23 | 0.15-0.3 s |
| Heavy hit | 2.5-5 | 6-10 | 0.9-1.5 s |
| Held beam | 1.4-2 | 8-50 | 6-6.5 s |

**Lights:**
- Flash a light, then fade it, ideally with its Range growing as Brightness
  falls: from Brightness 3-9 and Range 0-8 to 0 and 35-40 over 0.3-1 s.
- Clone a fresh light per shot.
- Keep a light's Range short enough that it marks the spot rather than
  tinting the whole floor.

**The world reacts:**
- **Craters:** 6-36 rocks at radius 3-54, tilted 8-55°, copying the hit
  surface's Material, Color and Textures from a raycast. They grow over 0.4 s,
  hold 1.5-5 s, then sink or shrink over 1.5-3 s.
- **A held beam** throws 1-2 rocks every 0.1 s.
- **A scorch decal** stays 5-6 s.

**Clean up everything.** One studied showcase leaves its explosion dome, a
ring loop and a sustained shake running until the next cast. That is the
failure to avoid.

## A cast pose from code

- **A cast pose from code**, such as the caster's arm raised toward the
  target, needs no animation asset:
  - The shoulder is `RightUpperArm.RightShoulder` on R15 and
    `Torso["Right Shoulder"]` on R6. It is a `Motor6D`, or an
    `AnimationConstraint` on newer avatars, where `C0` cannot be set and
    turning its attachments does not move the limb.
  - Every frame in `RunService.PreSimulation`, which runs after the Animator
    has posed the frame, set the joint's `Transform`. Disconnect when the
    pose ends; the playing animations take over again.
  - `CFrame.Angles(math.rad(95), 0, 0)` on `RightShoulder` brings the right
    hand up to shoulder height and forward *(verified on
    `AnimationConstraint` shoulders, in two missile runs' playtests)*.
  - To point the arm at a target, turn its hanging direction onto the
    direction to the target, both in the joint's own frame *(verified on
    `AnimationConstraint` shoulders in a missile run's playtest)*:

    ```lua
    -- part0, c0, c1: a Motor6D's Part0, C0 and C1, or an AnimationConstraint's
    -- Attachment0.Parent, Attachment0.CFrame and Attachment1.CFrame.
    local function rotationBetween(a: Vector3, b: Vector3): CFrame
    	local axis = a:Cross(b)
    	local dot = math.clamp(a:Dot(b), -1, 1)
    	if axis.Magnitude < 1e-4 then
    		return if dot > 0 then CFrame.identity else CFrame.fromAxisAngle(Vector3.xAxis, math.pi)
    	end
    	return CFrame.fromAxisAngle(axis.Unit, math.acos(dot))
    end

    RunService.PreSimulation:Connect(function()
    	local joint = part0.CFrame * c0
    	local hanging = c1:Inverse():VectorToWorldSpace(Vector3.new(0, -1, 0))
    	local wanted = joint:VectorToObjectSpace((target - joint.Position).Unit)
    	-- weight eases from 0 to 1 as the arm rises, and back as it lowers
    	shoulder.Transform = shoulder.Transform:Lerp(rotationBetween(hanging, wanted), weight)
    end)
    ```
