# Matching a reference clip

> **Ported skill:** tool names in this file (`build_instances`, `capture_moments`, the `animation`, `blender` and `upload_assets` tools, "it does X") come from the original toolkit. Do each step as `tools.md` maps it, with the Studio MCP and this skill's scripts.

Load this with `vfx-design.md` and `vfx-craft.md` when the user attached a
video or animated picture of an effect to match. Its attachment says
"reference clip" and gives the clip's id.

## What arrives

- **Sheets of frames.** An overview spread over where the clip changes, and,
  when that skips frames, a close-up of its start. Each frame is labelled
  with its number and its time, cropped to where the clip changes.
- **Times are effect seconds** from the start of the part the user chose. A
  clip the user marked as slowed is already converted to real speed. Build
  to these times.
- **Measurements**, labelled approximate: timing, brightness, size and
  colours by phase. Compression, bloom and the background shift them, so
  check each against the frames.

## Read it before building

Name the layers the frames show, in the order they appear:
- the anticipation;
- the flash or core;
- the main body;
- secondaries (sparks, ring, debris);
- smoke and the fade.

Give each layer the times its labels show. Then plan it as `vfx-design.md`
describes, with the clip's timing and palette instead of your own.

**From the measurements to properties:**
- **Timing.** "Starts" is when the first layer emits. "Peaks" is when the
  flash or core is at its brightest. "Falls to half by" places the main
  layer's fade. "Gone by" is the latest any layer may still show (its
  delay plus its lifetime).
- **Brightness.** A peak near white across the frame is a flash core: short
  life, `LightEmission` 1, bright `Brightness`. A small rise is a glow, not
  a flash.
- **Size.** The share of the frame, and how much it grows from start to
  largest, is a ratio for a `Size` sequence, not studs. The clip's camera
  is not Studio's.
- **Colours by phase.** These are `ColorSequence` keypoints in order:
  build-up first, peak, then fade. Fading pixels are mixed with the
  background, so take the hue and lift its brightness rather than copying
  a muddy value.
- **A moving camera.** When the measurements say the camera moves, read
  the timing from the labels instead.

## Look closer

Call `reference_clip` with the clip id and a span (`from`, `to`, `count` up
to 16) to see a fast stretch at the rate the toolkit stored. Typical spans:
- the first 0.2 s of an impact;
- how a ring grows;
- when sparks leave the core.

Ask for one span at a time, not the whole clip again. Pass `crop: "full"`
to see what is around the effect, such as the ground or the caster.

## Compare

Pass `reference: {"clip": id, "times": [...]}` to `capture_moments`. Each
moment then comes back beside the clip's frame at the matching time: the
clip's (R) and then Studio's (S).

- Use 4-6 moments at the clip's own key times: start, peak, half, gone.
- Aim the view the way the clip frames the effect: from the side, the
  front or above.
- Compare each pair for when it starts, peaks and fades, its size against
  the frame, its colours and its shape. Compare proportions, not position.
- **Compare at most twice.** Each round is a rebuild plus a capture, and
  the reference cannot be copied exactly. After the second round, fix
  what the pairs show most clearly, then report what still differs.

## Say what you approximated

Roblox has no custom shaders. These can only be approximated:
- distortion and heat haze;
- refraction;
- an engine's bloom strength;
- a texture you cannot see in the frames.

Exact particle counts cannot be read from frames either. Say which parts
are approximations and how the result compares. Do not claim it matches.

If the result looks clearly faster or slower than the clip, and the user
did not say how fast the clip plays, ask.
