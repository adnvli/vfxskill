# roblox-vfx-animation

A Claude Code skill that makes Claude build high-quality Roblox VFX and animations through the stock Roblox Studio MCP: particles, beams, trails, slashes, hits, explosions, spells, auras, camera shake, custom textures and flipbooks, and R15/R6/creature animations.

Its references record what experienced Roblox VFX artists actually do, measured from about 5,000 particle emitters in published effects, and the workflow makes Claude look at the effect frame by frame before calling it done.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- A Roblox Studio MCP (needs `execute_luau` and `screen_capture`)
- Node.js 18+
- Blender (optional, for custom textures and mesh shapes)

## Install

macOS / Linux:

```bash
git clone https://github.com/adnvli/roblox-vfx-animation ~/.claude/skills/roblox-vfx-animation
```

Windows (PowerShell):

```powershell
git clone https://github.com/adnvli/roblox-vfx-animation "$env:USERPROFILE\.claude\skills\roblox-vfx-animation"
```

Restart Claude Code and check `/skills`. Claude uses it automatically for VFX and animation work.

## Layout

```
SKILL.md          entry point Claude reads
references/       VFX design, craft, textures, motion, meshes, camera, animation
scripts/          animate.mjs, texture-tool.mjs, upload.mjs, Blender helpers
templates/vfx/    emit, build and capture modules for Studio
```

## License

MIT, see `LICENSE`. Credits in `CREDITS.md`.
