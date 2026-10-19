"""the original modeling helpers, available to every Blender job as fx.<name>.

Each takes positions in Blender units (studs) and places a part by where it
starts and ends rather than by rotation angles, builds its mesh directly
(no selection or context), and paints it when given a colour.
"""
import bpy, bmesh
from mathutils import Vector

_COLOR_LAYER = "Col"


def _vector(value, name):
    try:
        vector = Vector(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name} must be three numbers, got {value!r}") from None
    if len(vector) != 3:
        raise ValueError(f"{name} must be three numbers, got {value!r}")
    return vector


def _positive(value, name):
    if not isinstance(value, (int, float)) or value <= 0:
        raise ValueError(f"{name} must be a positive number of studs, got {value!r}")
    return float(value)


def paint(obj, rgba):
    """Colour every corner of an object's mesh; the colour travels in the GLB as vertex colour."""
    if len(rgba) == 3:
        rgba = (*rgba, 1.0)
    mesh = obj.data
    layer = mesh.color_attributes.get(_COLOR_LAYER) or mesh.color_attributes.new(_COLOR_LAYER, "BYTE_COLOR", "CORNER")
    for corner in layer.data:
        corner.color = rgba
    mesh.color_attributes.active_color = layer
    return obj


def _object(name, bm, rgba):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if rgba is not None:
        paint(obj, rgba)
    return obj


def _frame(start, end, across):
    """Unit vectors: along start to end, the given width direction made perpendicular, and the third."""
    along = end - start
    if along.length < 1e-6:
        raise ValueError("start and end are the same point")
    along = along.normalized()
    side = across - along * across.dot(along)
    if side.length < 1e-6:
        side = Vector((1, 0, 0)) - along * along.x
        if side.length < 1e-6:
            side = Vector((0, 1, 0)) - along * along.y
    side = side.normalized()
    return along, side, along.cross(side).normalized()


def box(name, size, center, rgba=None):
    """An upright box of the given size (x, y, z), centred on center."""
    size = _vector(size, "size")
    for value, axis in zip(size, "xyz"):
        _positive(value, f"size {axis}")
    half = size / 2
    return box_between(name, _vector(center, "center") - Vector((0, 0, half.z)), _vector(center, "center") + Vector((0, 0, half.z)),
                       width=size.x, thickness=size.y, width_axis=(1, 0, 0), rgba=rgba)


def box_between(name, start, end, width, thickness, width_axis=(1, 0, 0), rgba=None):
    """A box running from start to end, width wide along width_axis and thickness deep across both.

    A leaning seat back runs from its bottom edge to its top edge; a sloping panel from its low
    end to its high end. No rotation angle to get the direction of wrong.
    """
    start, end = _vector(start, "start"), _vector(end, "end")
    width, thickness = _positive(width, "width"), _positive(thickness, "thickness")
    along, side, normal = _frame(start, end, _vector(width_axis, "width_axis"))
    bm = bmesh.new()
    corners = []
    for point in (start, end):
        for s in (-0.5, 0.5):
            for t in (-0.5, 0.5):
                corners.append(bm.verts.new(point + side * (s * width) + normal * (t * thickness)))
    for ids in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        bm.faces.new([corners[i] for i in ids])
    return _object(name, bm, rgba)


def _tube(name, start, end, radii, rgba, vertices):
    """A closed round solid from start to end with the given radius at each end; a radius of 0 is a point."""
    start, end = _vector(start, "start"), _vector(end, "end")
    if not isinstance(vertices, int) or vertices < 3:
        raise ValueError(f"vertices must be a whole number of at least 3, got {vertices!r}")
    along, side, normal = _frame(start, end, Vector((1, 0, 0)) if abs((end - start).normalized().x) < 0.9 else Vector((0, 1, 0)))
    import math
    bm = bmesh.new()
    rings = []
    for point, radius in zip((start, end), radii):
        if radius == 0:
            rings.append([bm.verts.new(point)])
            continue
        rings.append([bm.verts.new(point + (side * math.cos(2 * math.pi * k / vertices) + normal * math.sin(2 * math.pi * k / vertices)) * radius)
                      for k in range(vertices)])
    first, last = rings
    for k in range(vertices):
        n = (k + 1) % vertices
        if len(first) == 1:
            bm.faces.new((first[0], last[n], last[k]))
        elif len(last) == 1:
            bm.faces.new((first[k], first[n], last[0]))
        else:
            bm.faces.new((first[k], first[n], last[n], last[k]))
    if len(first) > 1:
        bm.faces.new(list(reversed(first)))
    if len(last) > 1:
        bm.faces.new(last)
    return _object(name, bm, rgba)


def cylinder_between(name, start, end, radius, rgba=None, vertices=12):
    """A cylinder whose end caps sit at start and end: a bar, a pipe, a column, an axle or a wheel."""
    radius = _positive(radius, "radius")
    return _tube(name, start, end, (radius, radius), rgba, vertices)


def cone_between(name, start, end, start_radius, end_radius=0.0, rgba=None, vertices=12):
    """A cone or taper from start to end: start_radius across at start, end_radius at end, 0 for a point.

    Each radius belongs to the end it is named for, so a boost flame runs from the exhaust
    (its wide end) to its tip (0), a spike from its base to its point, a funnel from its
    mouth to its spout. No rotation angle to get the direction of wrong.
    """
    radii = []
    for value, label in ((start_radius, "start_radius"), (end_radius, "end_radius")):
        if not isinstance(value, (int, float)) or value < 0:
            raise ValueError(f"{label} must be a number of studs, 0 or more, got {value!r}")
        radii.append(float(value))
    if radii == [0.0, 0.0]:
        raise ValueError("start_radius and end_radius cannot both be 0")
    return _tube(name, start, end, radii, rgba, vertices)


def vertex_color_material(name="VertexColour"):
    """One material that shows the vertex colours; without it the glTF export leaves them out."""
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        nodes = material.node_tree.nodes
        colors = nodes.new("ShaderNodeVertexColor")
        colors.layer_name = _COLOR_LAYER
        material.node_tree.links.new(colors.outputs["Color"], nodes["Principled BSDF"].inputs["Base Color"])
    return material


def join(name, objects):
    """Join parts that never move apart into one flat-shaded object with the vertex-colour material.

    Keep anything that must move on its own (a wheel, a lid, a door) out of the list and join it separately.
    """
    objects = [obj for obj in objects if obj is not None]
    if not objects:
        raise ValueError("join needs at least one object")
    first = objects[0]
    if len(objects) > 1:
        with bpy.context.temp_override(active_object=first, selected_editable_objects=objects, selected_objects=objects):
            bpy.ops.object.join()
    first.name = name
    first.data.name = name
    first.data.materials.clear()
    first.data.materials.append(vertex_color_material())
    first.data.polygons.foreach_set("use_smooth", [False] * len(first.data.polygons))
    first.data.update()
    return first


def piece(obj, pivot, parent=None):
    """Make an object a moving piece of a creature or a machine, to be rigged in Studio.

    Its origin moves to pivot, the point it turns about (a leg's hip, a jaw's hinge), without
    moving its shape; its mesh is named after it, as Roblox names the MeshPart; and, given
    parent, it hangs from that piece, staying where it is. Call it after join, once per piece.
    """
    from mathutils import Matrix
    pivot = _vector(pivot, "pivot")
    world = obj.matrix_world.copy()
    local = world.inverted() @ pivot
    obj.data.transform(Matrix.Translation(-local))
    obj.data.update()
    placed = world @ Matrix.Translation(local)
    obj.data.name = obj.name
    if parent is not None:
        if parent is obj:
            raise ValueError(f"{obj.name} cannot hang from itself")
        bpy.context.view_layer.update()
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    obj.matrix_world = placed
    bpy.context.view_layer.update()
    return obj


def _quaternion(q):
    """A Blender rotation as [x, y, z, w] in Roblox's axes: a point at (x, y, z) arrives at (-x, z, y)."""
    return [round(-q.x, 6), round(q.z, 6), round(q.y, 6), round(q.w, 6)]


def _studs(vector):
    return [round(-vector.x, 4), round(vector.z, 4), round(vector.y, 4)]


def _joint_name(piece):
    """The joint rig makes for a piece, as the original inspection names them: a leg's for the leg, its knee and ankle after it."""
    if piece == "Head":
        return "Neck"
    for suffix, joint in (("Upper", ""), ("Lower", "Knee"), ("Foot", "Ankle")):
        if piece.endswith(suffix) and len(piece) > len(suffix):
            return piece[:-len(suffix)] + joint
    return piece


_MAX_SAMPLES = 240
_MAX_SECONDS = 60


def export_animation(name, source, rig, start=None, end=None, loop=True, rest_frame=None, root_joint="Root"):
    """Bake what a creature does between two frames into an animation for Studio's animation tool.

    source is the armature of a skinned creature, or the body piece of a creature of moving
    pieces. rig is the path its model has in Studio, such as "game.Workspace.Wolf". Every frame
    from start to end (the scene's own by default) is sampled with constraints and inverse
    kinematics applied, so animate however Blender makes easy. For a loop, make the last frame
    the same pose as the first. A creature of pieces is at rest at rest_frame (start by default);
    an armature's rest is its own. The result names a file to pass to animation as animation_file.
    """
    import json, math, os
    from mathutils import Matrix, Vector
    if not isinstance(name, str) or not name or any(c in name for c in '/\\:*?"<>|'):
        raise ValueError(f"name must be the animation's name, usable as a file name, got {name!r}")
    if not isinstance(rig, str) or not rig.startswith("game."):
        raise ValueError("rig must be the model's path in Studio, such as game.Workspace.Wolf")
    scene = bpy.context.scene
    start = scene.frame_start if start is None else int(start)
    end = scene.frame_end if end is None else int(end)
    if end <= start:
        raise ValueError(f"end ({end}) must be after start ({start})")
    fps = scene.render.fps / scene.render.fps_base
    if (end - start) / fps > _MAX_SECONDS:
        raise ValueError(f"frames {start} to {end} last {(end - start) / fps:.1f} s; an animation lasts at most {_MAX_SECONDS}")
    step = max(1, math.ceil((end - start) / (_MAX_SAMPLES - 1)))
    frames = list(range(start, end, step)) + [end]

    def sample(frame):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        return bpy.context.evaluated_depsgraph_get()

    joints, baked, ignored = [], [], set()
    if source.type == "ARMATURE":
        world = source.matrix_world.copy()
        bones = list(source.data.bones)
        tops = [bone for bone in bones if bone.parent is None]
        rest_world = {bone.name: (world @ bone.matrix_local).to_quaternion() for bone in bones}
        rest_local = {bone.name: (bone.parent.matrix_local.inverted() @ bone.matrix_local) if bone.parent else bone.matrix_local.copy() for bone in bones}
        for bone in bones:
            entry = {"name": bone.name}
            if bone.parent is not None:
                entry["parent"] = bone.parent.name
                entry["offset"] = _studs(world @ bone.head_local - world @ bone.parent.head_local)
            joints.append(entry)
        for frame in frames:
            posed = source.evaluated_get(sample(frame)).pose.bones
            rotations = {}
            for bone in bones:
                pose = posed[bone.name]
                local = (pose.parent.matrix.inverted() @ pose.matrix) if pose.parent else pose.matrix
                basis = rest_local[bone.name].inverted() @ local
                turn = rest_world[bone.name] @ basis.to_quaternion() @ rest_world[bone.name].inverted()
                rotations[bone.name] = _quaternion(turn)
                if bone.parent is not None and basis.to_translation().length > 1e-3:
                    ignored.add(bone.name)
            entry = {"time": round((frame - start) / fps, 5), "rotations": rotations}
            if len(tops) == 1:
                entry["travel"] = _studs(world @ posed[tops[0].name].matrix.to_translation() - world @ tops[0].matrix_local.to_translation())
            baked.append(entry)
    elif source.type == "MESH":
        pieces = []

        def gather(item, parent):
            piece = item if item.type == "MESH" else None
            if piece is not None:
                pieces.append((piece, parent))
            for child in item.children:
                gather(child, piece or parent)

        gather(source, None)
        rest = {piece.name: piece.evaluated_get(sample(start if rest_frame is None else int(rest_frame))).matrix_world.copy() for piece, _ in pieces}
        centre = sum((Vector(corner) for corner in source.bound_box), Vector()) / 8
        body_at = rest[source.name] @ centre
        named = {piece.name: (root_joint if parent is None else _joint_name(piece.data.name)) for piece, parent in pieces}
        for piece, parent in pieces:
            entry = {"name": named[piece.name]}
            if parent is not None:
                entry["parent"] = named[parent.name]
                entry["offset"] = _studs(rest[piece.name].to_translation() - (body_at if parent is source else rest[parent.name].to_translation()))
            joints.append(entry)
        for frame in frames:
            depsgraph = sample(frame)
            now = {piece.name: piece.evaluated_get(depsgraph).matrix_world.copy() for piece, _ in pieces}
            rotations = {}
            for piece, parent in pieces:
                turned, rested = now[piece.name].to_quaternion(), rest[piece.name].to_quaternion()
                if parent is None:
                    turn = turned @ rested.inverted()
                else:
                    above = rest[parent.name].to_quaternion()
                    turn = above @ now[parent.name].to_quaternion().inverted() @ turned @ rested.inverted()
                    slid = (now[parent.name].inverted() @ now[piece.name]).to_translation() - (rest[parent.name].inverted() @ rest[piece.name]).to_translation()
                    if slid.length > 1e-3:
                        ignored.add(piece.name)
                rotations[named[piece.name]] = _quaternion(turn)
            travel = now[source.name] @ centre - body_at
            baked.append({"time": round((frame - start) / fps, 5), "rotations": rotations, "travel": _studs(travel)})
    else:
        raise ValueError(f"{source.name} is a {source.type.lower()}; export_animation takes an armature, or a creature's body piece")
    scene.frame_set(start)

    path = os.path.join(_OUTPUT_DIR, name + ".bake.json")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump({"name": name, "rig": rig, "loop": bool(loop), "rootJoint": root_joint, "joints": joints, "frames": baked,
                   "ignoredTravel": sorted(ignored)[:16]}, handle)
    return path


_FLIPBOOK_SIDE = 1024
_FLIPBOOK_GRIDS = (2, 4, 8)
# A sheet larger than this is not attached to the result, so a half-size copy is written to look at.
_FLIPBOOK_PREVIEW_BYTES = 1800 * 1024


def _write_png(path, rgba):
    """Write rows of 8-bit RGBA, top row first, as a PNG."""
    import struct, zlib
    height, width = rgba.shape[0], rgba.shape[1]

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    import numpy
    rows = numpy.zeros((height, width * 4 + 1), dtype=numpy.uint8)
    rows[:, 1:] = rgba.reshape(height, width * 4)
    with open(path, "wb") as handle:
        handle.write(b"\x89PNG\r\n\x1a\n")
        handle.write(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)))
        handle.write(chunk(b"IDAT", zlib.compress(rows.tobytes(), 9)))
        handle.write(chunk(b"IEND", b""))


def flipbook(name, grid=4, mode="alpha", start=None, end=None, loop=False, padding=4):
    """Render the scene's animation through its camera into one particle flipbook sheet.

    The sheet is 1024 x 1024, the size seen playing as a flipbook in Roblox. grid is 2, 4 or
    8: 4, 16 or 64 frames. Frames from start to end (the scene's own by default) are sampled
    evenly to fill every cell, because Roblox plays every cell; a shorter animation holds some
    frames for two cells. The scene is rendered as it is, so any material, simulation or
    compositor setup shows in the sheet. mode "alpha" renders on a
    transparent film, for smoke, dust and anything that darkens (LightEmission 0); "additive"
    renders on black, for fire, energy and glows (LightEmission 1). Each frame is rendered
    padding pixels inside its cell, so frames cannot run into each other. loop says the last
    frame leads back into the first, as for a burning fire; leave it False for a burst that plays
    once. The scene's render engine is used: Eevee or Workbench render a 64-frame sheet in
    seconds, Cycles can take minutes. Colour is rendered with the Standard view transform, so
    glows stay bright. Writes <name>.flipbook.png to OUTPUT_DIR, which the toolkit checks.
    """
    import json, os, time, numpy
    if not isinstance(name, str) or not name or any(c in name for c in '/\\:*?"<>|.'):
        raise ValueError(f"name must be the sheet's name, usable as a file name without dots, got {name!r}")
    if grid not in _FLIPBOOK_GRIDS:
        raise ValueError(f"grid must be 2, 4 or 8 (Roblox's Grid2x2, Grid4x4 and Grid8x8), got {grid!r}")
    if mode not in ("alpha", "additive"):
        raise ValueError(f'mode must be "alpha" (transparent film, LightEmission 0) or "additive" (black background, LightEmission 1), got {mode!r}')
    cell = _FLIPBOOK_SIDE // grid
    if not isinstance(padding, int) or padding < 0 or padding > cell // 8:
        raise ValueError(f"padding must be a whole number of pixels from 0 to {cell // 8} for a {grid} x {grid} grid, got {padding!r}")
    scene = bpy.context.scene
    if scene.camera is None:
        raise ValueError("the scene has no camera; add one and set scene.camera, framed so the whole effect stays in view")
    start = scene.frame_start if start is None else int(start)
    end = scene.frame_end if end is None else int(end)
    cells = grid * grid
    span = end - start + (0 if loop else 1)
    if end <= start:
        raise ValueError(f"end ({end}) must be after start ({start})")
    if span < cells:
        print(f"fx.flipbook: frames {start} to {end} give {span} distinct frames for {cells} cells, so some frames are held "
              f"for two cells; a longer animation or a smaller grid avoids the holds", flush=True)
    if loop:
        frames = [start + round((end - start) * i / cells) for i in range(cells)]
    else:
        frames = [start + round((end - start) * i / (cells - 1)) for i in range(cells)]

    render = scene.render
    view = scene.view_settings
    saved = {
        "resolution_x": render.resolution_x, "resolution_y": render.resolution_y,
        "resolution_percentage": render.resolution_percentage, "film_transparent": render.film_transparent,
        "filepath": render.filepath, "file_format": render.image_settings.file_format,
        "color_mode": render.image_settings.color_mode, "view_transform": view.view_transform,
        "look": view.look, "world": scene.world, "frame": scene.frame_current,
    }
    inner = cell - 2 * padding
    frames_dir = os.path.join(os.path.dirname(_OUTPUT_DIR), "flipbook-frames", name)
    os.makedirs(frames_dir, exist_ok=True)
    seconds = []
    sheet = numpy.zeros((_FLIPBOOK_SIDE, _FLIPBOOK_SIDE, 4), dtype=numpy.uint8)
    if mode == "additive":
        sheet[:, :, 3] = 255
    black = None
    try:
        render.resolution_x = render.resolution_y = inner
        render.resolution_percentage = 100
        render.image_settings.file_format = "PNG"
        view.view_transform = "Standard"
        view.look = "None"
        if mode == "alpha":
            render.film_transparent = True
            render.image_settings.color_mode = "RGBA"
        else:
            render.film_transparent = False
            render.image_settings.color_mode = "RGB"
            black = bpy.data.worlds.new("FlipbookBlack")
            black.color = (0.0, 0.0, 0.0)
            if black.node_tree is not None:
                for node in black.node_tree.nodes:
                    if node.type == "BACKGROUND":
                        node.inputs["Color"].default_value = (0.0, 0.0, 0.0, 1.0)
                        node.inputs["Strength"].default_value = 0.0
            scene.world = black
        for index, frame in enumerate(frames):
            scene.frame_set(frame)
            path = os.path.join(frames_dir, f"{index:02d}.png")
            render.filepath = path
            began = time.perf_counter()
            bpy.ops.render.render(write_still=True)
            seconds.append(round(time.perf_counter() - began, 3))
            image = bpy.data.images.load(path, check_existing=False)
            try:
                width, height = image.size
                if (width, height) != (inner, inner):
                    raise RuntimeError(f"frame {frame} rendered at {width} x {height}, not {inner} x {inner}")
                pixels = numpy.empty(width * height * 4, dtype=numpy.float32)
                image.pixels.foreach_get(pixels)
            finally:
                bpy.data.images.remove(image)
            # Blender keeps rows bottom first; the sheet is written top first.
            frame_rgba = numpy.flipud((numpy.clip(pixels, 0.0, 1.0) * 255.0 + 0.5).astype(numpy.uint8).reshape(height, width, 4))
            if mode == "additive":
                frame_rgba[:, :, 3] = 255
            row, column = divmod(index, grid)
            top, left = row * cell + padding, column * cell + padding
            sheet[top:top + inner, left:left + inner] = frame_rgba
    finally:
        render.resolution_x, render.resolution_y = saved["resolution_x"], saved["resolution_y"]
        render.resolution_percentage = saved["resolution_percentage"]
        render.film_transparent = saved["film_transparent"]
        render.filepath = saved["filepath"]
        render.image_settings.file_format = saved["file_format"]
        render.image_settings.color_mode = saved["color_mode"]
        view.view_transform, view.look = saved["view_transform"], saved["look"]
        scene.world = saved["world"]
        if black is not None:
            bpy.data.worlds.remove(black)
        scene.frame_set(saved["frame"])

    fps = render.fps / render.fps_base
    return _write_flipbook(name, sheet, {"name": name, "grid": grid, "mode": mode, "padding": padding, "loop": bool(loop),
                                         "fps": round(cells / ((frames[-1] - frames[0] + (frames[1] - frames[0] if loop else 0)) / fps), 3) if frames[-1] > frames[0] else None,
                                         "frames": frames, "engine": render.engine, "renderSeconds": seconds})


def _check_name(name):
    if not isinstance(name, str) or not name or any(c in name for c in '/\\:*?"<>|.'):
        raise ValueError(f"name must be usable as a file name without dots, got {name!r}")


def _write_flipbook(name, sheet, note):
    """Write a packed sheet and the note the toolkit checks it against, plus a half-size copy when the sheet is too big to attach."""
    import json, os, numpy
    path = os.path.join(_OUTPUT_DIR, name + ".flipbook.png")
    _write_png(path, sheet)
    if os.path.getsize(path) > _FLIPBOOK_PREVIEW_BYTES:
        half = sheet.reshape(_FLIPBOOK_SIDE // 2, 2, _FLIPBOOK_SIDE // 2, 2, 4).mean(axis=(1, 3))
        _write_png(os.path.join(_OUTPUT_DIR, name + ".flipbook-preview.png"), (half + 0.5).astype(numpy.uint8))
    with open(os.path.join(_OUTPUT_DIR, name + ".flipbook.json"), "w", encoding="utf-8") as handle:
        json.dump(note, handle)
    return path


# 2D texture drawing with numpy, for the hard-edged, stylised shapes most Roblox
# VFX textures are: a shape built from coordinates, broken up by noise, cut
# with a hard edge, and eaten away over the frames. Images are float arrays,
# row 0 at the top. tex_coords runs -1..1 with x to the right and y up.

def tex_coords(size=256):
    """Return (x, y): two size x size float arrays running -1..1 across the image, x to the right and y up."""
    import numpy
    size = _texture_size(size)
    steps = (numpy.arange(size, dtype=numpy.float32) + 0.5) / size * 2.0 - 1.0
    return numpy.tile(steps, (size, 1)), numpy.tile(-steps[:, None], (1, size))


def tex_polar(x, y):
    """Return (r, angle) for coordinates x, y: distance from the centre, and the angle in radians from +x, counterclockwise, -pi..pi."""
    import numpy
    return numpy.hypot(x, y), numpy.arctan2(y, x)


def _texture_size(size):
    if not isinstance(size, int) or size < 8 or size > 2048:
        raise ValueError(f"size must be a whole number of pixels from 8 to 2048, got {size!r}")
    return size


def tex_noise(size=256, scale=4, octaves=4, seed=0):
    """Smooth fractal noise in 0..1 that tiles. scale is how many blobs fit across the image at the coarsest octave; each further octave adds detail at twice the frequency and half the strength."""
    import numpy
    size = _texture_size(size)
    if not isinstance(octaves, int) or octaves < 1 or octaves > 8:
        raise ValueError(f"octaves must be a whole number from 1 to 8, got {octaves!r}")
    rng = numpy.random.default_rng(seed)
    total = numpy.zeros((size, size), dtype=numpy.float32)
    weight = 0.0
    for octave in range(octaves):
        frequency = max(1, int(round(scale))) * 2 ** octave
        lattice = rng.random((frequency, frequency), dtype=numpy.float32)
        at = numpy.arange(size, dtype=numpy.float32) * frequency / size
        low = numpy.floor(at).astype(int)
        f = at - low
        f = f * f * (3.0 - 2.0 * f)
        low %= frequency
        high = (low + 1) % frequency
        top = lattice[numpy.ix_(low, low)] * (1 - f)[None, :] + lattice[numpy.ix_(low, high)] * f[None, :]
        bottom = lattice[numpy.ix_(high, low)] * (1 - f)[None, :] + lattice[numpy.ix_(high, high)] * f[None, :]
        amplitude = 0.5 ** octave
        total += (top * (1 - f)[:, None] + bottom * f[:, None]) * amplitude
        weight += amplitude
    return total / weight


def tex_cells(size=256, cells=8, seed=0):
    """Cellular (Voronoi) noise that tiles: cells x cells jittered points. Returns (near, edge): the distance to the nearest point and the gap between the nearest and second-nearest, both in cell widths. edge is 0 on the borders between cells, so tex_edge(edge, 0.05) draws the cracks, and near < radius draws round blobs."""
    import numpy
    size = _texture_size(size)
    if not isinstance(cells, int) or cells < 1 or cells > 64:
        raise ValueError(f"cells must be a whole number from 1 to 64, got {cells!r}")
    rng = numpy.random.default_rng(seed)
    jitter = rng.random((cells, cells, 2), dtype=numpy.float32)
    at = (numpy.arange(size, dtype=numpy.float32) + 0.5) * cells / size
    px, py = numpy.meshgrid(at, at)
    cx, cy = numpy.floor(px).astype(int), numpy.floor(py).astype(int)
    first = numpy.full((size, size), 9.0, dtype=numpy.float32)
    second = numpy.full((size, size), 9.0, dtype=numpy.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            nx, ny = cx + dx, cy + dy
            point = jitter[ny % cells, nx % cells]
            d = numpy.hypot(px - (nx + point[..., 0]), py - (ny + point[..., 1]))
            second = numpy.where(d < first, first, numpy.minimum(second, d))
            first = numpy.minimum(first, d)
    return first, second - first


def tex_sample(image, u, v):
    """Look a 2D image up at u, v (0..1 across and down the image), wrapping and blending between pixels. Scroll, stretch or warp noise per frame with it, as in tex_sample(noise, x * 0.5 + t, y * 0.5)."""
    import numpy
    image = numpy.asarray(image, dtype=numpy.float32)
    height, width = image.shape[:2]
    x = (numpy.asarray(u, dtype=numpy.float32) % 1.0) * width - 0.5
    y = (numpy.asarray(v, dtype=numpy.float32) % 1.0) * height - 0.5
    x0, y0 = numpy.floor(x).astype(int), numpy.floor(y).astype(int)
    fx, fy = x - x0, y - y0
    x0, y0 = x0 % width, y0 % height
    x1, y1 = (x0 + 1) % width, (y0 + 1) % height
    return (image[y0, x0] * (1 - fx) * (1 - fy) + image[y0, x1] * fx * (1 - fy)
            + image[y1, x0] * (1 - fx) * fy + image[y1, x1] * fx * fy)


def tex_edge(value, at=0.0, soft=0.01):
    """0 below at and 1 above it, blended over soft: the hard, cel-shaded edge. Keep soft near 0.01 for a crisp silhouette; raise it for a glow."""
    import numpy
    soft = max(float(soft), 1e-5)
    t = numpy.clip((numpy.asarray(value, dtype=numpy.float32) - (at - soft)) / (2 * soft), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def tex_ease(t, power=3.0):
    """Ease out: fast at first, then slow, as a burst grows. t is clamped to 0..1."""
    import numpy
    return 1.0 - (1.0 - numpy.clip(t, 0.0, 1.0)) ** power


_WARP_NOISE = {}


def tex_curve(points, samples=64, closed=False):
    """A smooth curve through control points (Catmull-Rom), as an (n, 2) array of x, y in tex_coords units. closed=True joins the last point back to the first. Feed it to tex_stroke."""
    import numpy
    p = numpy.asarray(points, dtype=numpy.float32)
    if p.ndim != 2 or p.shape[1] != 2 or len(p) < 2:
        raise ValueError("points must be at least two (x, y) pairs")
    if not isinstance(samples, int) or samples < 4 or samples > 1024:
        raise ValueError(f"samples must be a whole number from 4 to 1024, got {samples!r}")
    if closed:
        p = numpy.concatenate([p[-1:], p, p[:2]])
    else:
        p = numpy.concatenate([p[:1] * 2 - p[1:2], p, p[-1:] * 2 - p[-2:-1]])
    spans = len(p) - 3
    out = []
    for i in range(spans):
        p0, p1, p2, p3 = p[i], p[i + 1], p[i + 2], p[i + 3]
        t = numpy.linspace(0, 1, max(2, samples // spans), endpoint=(i == spans - 1))[:, None]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return numpy.concatenate(out)


def tex_stroke(x, y, path, width=0.08, start=0.0, end=1.0):
    """A stroke along a path, the way a brush draws it: positive inside, about the distance to its edge, so tex_edge cuts it.

    path is an (n, 2) array of points in tex_coords units; tex_curve makes a smooth one. width is
    the full width: a number, a list of widths spread evenly from head to tail, or a function of u
    (0 at the head, 1 at the tail). Tapering it gives the thick-to-thin pen pressure of a drawn
    claw, crescent, wisp or crack. Only the part from start to end (0 to 1 along the path) is drawn:
    raise end over the frames to draw the stroke on, and start to erase it from the head. Combine
    strokes and shapes with numpy.maximum (union) or numpy.minimum (intersection; subtract one with
    numpy.minimum(a, -b)).
    """
    import numpy
    path = numpy.asarray(path, dtype=numpy.float32)
    if path.ndim != 2 or path.shape[1] != 2 or len(path) < 2:
        raise ValueError("path must be at least two (x, y) points, as tex_curve returns")
    if len(path) > 2048:
        raise ValueError(f"path has {len(path)} points; use at most 2048 (fewer tex_curve samples)")
    seg = numpy.linalg.norm(numpy.diff(path, axis=0), axis=1)
    along = numpy.concatenate([[0.0], numpy.cumsum(seg)])
    along = along / max(float(along[-1]), 1e-6)
    if callable(width):
        def profile(u):
            return numpy.asarray(width(u), dtype=numpy.float32)
    elif numpy.ndim(width) == 0:
        def profile(u):
            return numpy.full_like(u, float(width))
    else:
        keys = numpy.asarray(width, dtype=numpy.float32)

        def profile(u):
            return numpy.interp(u, numpy.linspace(0, 1, len(keys)), keys).astype(numpy.float32)
    field = numpy.full(numpy.shape(x), -1.0, dtype=numpy.float32)
    for i in range(len(path) - 1):
        a, b = path[i], path[i + 1]
        d = b - a
        length2 = max(float(d @ d), 1e-12)
        t = numpy.clip(((x - a[0]) * d[0] + (y - a[1]) * d[1]) / length2, 0.0, 1.0)
        u = along[i] + (along[i + 1] - along[i]) * t
        inside = profile(u) * 0.5 - numpy.hypot(x - (a[0] + d[0] * t), y - (a[1] + d[1] * t))
        field = numpy.maximum(field, numpy.where((u >= start) & (u <= end), inside, -1.0))
    return field


def tex_warp(x, y, amount=0.1, scale=3, seed=0, t=0.0):
    """x, y pushed around by smooth noise. Shapes drawn with the warped coordinates come out lopsided and organic instead of geometric; t drifts the noise to animate it."""
    import numpy
    key = (int(scale), int(seed))
    if key not in _WARP_NOISE:
        _WARP_NOISE[key] = (tex_noise(256, scale, 3, seed), tex_noise(256, scale, 3, seed + 101))
    nx, ny = _WARP_NOISE[key]
    u, v = x * 0.5 + 0.5 + t, y * 0.5 + 0.5
    return x + (tex_sample(nx, u, v) - 0.5) * 2 * amount, y + (tex_sample(ny, u, v) - 0.5) * 2 * amount


def tex_blob(x, y, radius=0.5, lumps=6, roughness=0.5, seed=0, centre=(0.0, 0.0)):
    """A lumpy, lopsided blob in one piece: a solid body with round lobes bulging from its edge, bigger on one side. It never splits or has holes, so it reads as one puff, not a cluster of circles. About radius from the centre; roughness runs from 0, a plain disc, to 1, the lumpiest. Positive inside; tex_edge cuts it."""
    import numpy
    rng = numpy.random.default_rng(seed)
    roughness = min(max(float(roughness), 0.0), 1.0)
    lean = rng.uniform(0, 2 * numpy.pi)
    body = radius * (0.95 - 0.35 * roughness)
    bx = centre[0] + numpy.cos(lean) * radius * 0.2 * roughness
    by = centre[1] + numpy.sin(lean) * radius * 0.2 * roughness
    field = body - numpy.hypot(x - bx, y - by)
    for _ in range(max(1, int(lumps))):
        # Each lobe is centred inside the body, so the union stays star-shaped
        # around the body's centre: one piece, no holes.
        angle = rng.uniform(0, 2 * numpy.pi)
        reach = body * rng.uniform(0.8, 1.0)
        r = radius * roughness * rng.uniform(0.4, 0.8) * (1 + 0.4 * roughness * numpy.cos(angle - lean))
        cx, cy = bx + numpy.cos(angle) * reach, by + numpy.sin(angle) * reach
        field = numpy.maximum(field, r - numpy.hypot(x - cx, y - cy))
    return field


def _drawn_rgba(result, size, mode, where):
    """A drawing function's result as size x size x 4 floats: alpha alone, (alpha, value), or RGB / RGBA."""
    import numpy
    if isinstance(result, tuple):
        if len(result) != 2:
            raise ValueError(f"{where} returned a tuple of {len(result)}; return alpha, (alpha, value) or an RGBA array")
        alpha = numpy.asarray(result[0], dtype=numpy.float32)
        value = numpy.broadcast_to(numpy.asarray(result[1], dtype=numpy.float32), (size, size))
        if alpha.shape != (size, size):
            raise ValueError(f"{where} returned alpha shaped {alpha.shape}; it must be {size} x {size}")
        rgba = numpy.stack([value, value, value, alpha], axis=-1)
    else:
        array = numpy.asarray(result, dtype=numpy.float32)
        if array.shape == (size, size):
            rgba = numpy.stack([numpy.ones_like(array)] * 3 + [array], axis=-1)
        elif array.shape == (size, size, 4):
            rgba = array
        elif array.shape == (size, size, 3):
            rgba = numpy.concatenate([array, numpy.ones((size, size, 1), dtype=numpy.float32)], axis=-1)
        else:
            raise ValueError(f"{where} returned an array shaped {array.shape}; it must be {size} x {size} (alpha), or {size} x {size} x 3 or 4")
    rgba = numpy.clip(numpy.nan_to_num(rgba), 0.0, 1.0)
    if mode == "additive":
        rgba = numpy.concatenate([rgba[..., :3] * rgba[..., 3:4], numpy.ones((size, size, 1), dtype=numpy.float32)], axis=-1)
    return (rgba * 255.0 + 0.5).astype(numpy.uint8)


def draw_flipbook(name, frame, grid=4, loop=False, fps=None, mode="alpha", padding=4):
    """Draw a particle flipbook frame by frame with numpy and pack it into a 1024 x 1024 sheet the toolkit checks.

    frame(t, size) draws one frame size pixels square. t runs from 0 at the first frame to 1 at
    the last (to just under 1 for a loop, whose last frame leads back to the first). It returns
    alpha (a size x size array, 0..1) for a white shape, or (alpha, value) where value is the grey
    level (a number or an array), or an RGB or RGBA array. White shapes are usual: the particle's
    Color tints them, and value lets two tones in one shape take one colour. grid is 2, 4 or 8
    (4, 16 or 64 frames); 4 is what most studied artists' sheets use. fps is the speed the frames
    are meant to play at, used to suggest the Lifetime or framerate. mode "alpha" keeps a
    transparent background (LightEmission 0 or below); "additive" bakes alpha onto black for
    LightEmission 1. padding pixels around each frame stay empty. Writes <name>.flipbook.png.
    """
    import numpy
    _check_name(name)
    if not callable(frame):
        raise ValueError("frame must be a function frame(t, size) that returns the frame's alpha, (alpha, value) or an RGBA array")
    if grid not in _FLIPBOOK_GRIDS:
        raise ValueError(f"grid must be 2, 4 or 8 (Roblox's Grid2x2, Grid4x4 and Grid8x8), got {grid!r}")
    if mode not in ("alpha", "additive"):
        raise ValueError(f'mode must be "alpha" or "additive", got {mode!r}')
    cell = _FLIPBOOK_SIDE // grid
    if not isinstance(padding, int) or padding < 0 or padding > cell // 8:
        raise ValueError(f"padding must be a whole number of pixels from 0 to {cell // 8} for a {grid} x {grid} grid, got {padding!r}")
    if fps is not None and (not isinstance(fps, (int, float)) or fps <= 0):
        raise ValueError(f"fps must be a positive number or None, got {fps!r}")
    cells = grid * grid
    inner = cell - 2 * padding
    sheet = numpy.zeros((_FLIPBOOK_SIDE, _FLIPBOOK_SIDE, 4), dtype=numpy.uint8)
    if mode == "additive":
        sheet[:, :, 3] = 255
    for index in range(cells):
        t = index / cells if loop else index / (cells - 1)
        where = f"frame(t={t:.3f}, size={inner})"
        drawn = _drawn_rgba(frame(t, inner), inner, mode, where)
        row, column = divmod(index, grid)
        top, left = row * cell + padding, column * cell + padding
        sheet[top:top + inner, left:left + inner] = drawn
    return _write_flipbook(name, sheet, {"name": name, "grid": grid, "mode": mode, "padding": padding, "loop": bool(loop),
                                         "fps": float(fps) if fps is not None else None, "drawn": True})


def draw_texture(name, image, size=512, mode="alpha"):
    """Draw one texture with numpy and write it as <name>.png. image is an array, or a function image(size) returning one: alpha, (alpha, value) or RGB / RGBA, as for draw_flipbook. mode "alpha" keeps transparency; "additive" bakes it onto black."""
    import os
    _check_name(name)
    size = _texture_size(size)
    if mode not in ("alpha", "additive"):
        raise ValueError(f'mode must be "alpha" or "additive", got {mode!r}')
    drawn = _drawn_rgba(image(size) if callable(image) else image, size, mode, "image")
    path = os.path.join(_OUTPUT_DIR, name + ".png")
    _write_png(path, drawn)
    return path


# VFX shapes. Each is one open sheet of quads with a UV map laid out the same
# way: U runs along the sweep (0 at the start, 1 at the end), V runs across it
# (0 inside or at the bottom, 1 outside or at the top). A texture whose alpha
# fades along U then fades a slash toward its tail, and one that fades across V
# softens a ring's edges. Shapes face Roblox's forward: Blender -Y.
_MAX_VFX_SEGMENTS = 256


def _segments(value, name, low):
    if not isinstance(value, int) or value < low or value > _MAX_VFX_SEGMENTS:
        raise ValueError(f"{name} must be a whole number from {low} to {_MAX_VFX_SEGMENTS}, got {value!r}")
    return value


def vfx_surface(name, point, columns=32, rows=1, rgba=None):
    """Any shape you can describe as a function: a sheet of columns x rows quads, where point(u, v)
    gives the position (three numbers, in studs) of each grid corner for u and v from 0 to 1, and
    the corner's UV is (u, v). Corners that land on the same spot are merged, so closed loops and
    poles need no special care. The named vfx_ shapes are built with it; use it for anything they
    do not cover: a jagged shockwave (vary the radius with u), a forked lightning card, petals, a
    wobbling wave, a spiked burst.
    """
    if not callable(point):
        raise ValueError("point must be a function point(u, v) returning (x, y, z) in studs")
    columns = _segments(columns, "columns", 1)
    rows = _segments(rows, "rows", 1)
    return _strip(name, columns, rows, lambda u, v: _vector(point(u, v), "point(u, v)"), rgba)


def _strip(name, columns, rows, point, rgba):
    """A grid of columns x rows quads at point(u, v), with UVs (u, v); u and v run 0 to 1."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    grid = [[bm.verts.new(point(c / columns, r / rows)) for r in range(rows + 1)] for c in range(columns + 1)]
    for c in range(columns):
        for r in range(rows):
            corners = [(c, r), (c + 1, r), (c + 1, r + 1), (c, r + 1)]
            face = bm.faces.new([grid[i][j] for i, j in corners])
            for loop, (i, j) in zip(face.loops, corners):
                loop[uv].uv = (i / columns, j / rows)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    obj = _object(name, bm, rgba)
    return obj


def _around(angle):
    """Unit direction at angle radians from Blender -Y (Roblox's forward), turning toward +X."""
    import math
    return Vector((math.sin(angle), -math.cos(angle), 0.0))


def vfx_arc(name, radius, width, sweep=160, segments=32, taper=True, rgba=None):
    """A flat crescent card for a slash, lying in the horizontal plane around the origin.

    It sweeps sweep degrees centred on forward (Blender -Y), from radius - width to radius.
    With taper the band is widest in the middle and comes to a point at both ends: a crescent.
    U runs along the sweep from its start (+X side) to its end (-X side), V from the inner edge
    to the outer. Roll or tilt the MeshPart in Studio for a diagonal swing, and set DoubleSided.
    """
    import math
    radius, width = _positive(radius, "radius"), _positive(width, "width")
    if width >= radius:
        raise ValueError(f"width ({width}) must be less than radius ({radius}): the band runs from radius - width to radius")
    if not isinstance(sweep, (int, float)) or not 10 <= sweep <= 350:
        raise ValueError(f"sweep must be 10 to 350 degrees, got {sweep!r}")
    segments = _segments(segments, "segments", 4)
    half = math.radians(sweep) / 2

    def point(u, v):
        across = math.sin(math.pi * u) if taper else 1.0
        inner = radius - width * max(across, 0.02)
        return _around(half - 2 * half * u) * (inner + (radius - inner) * v)

    return _strip(name, segments, 1 if not taper else 2, point, rgba)


def vfx_ring(name, radius, width=0.5, height=0.0, top_radius=None, segments=48, rgba=None):
    """A shockwave ring around the vertical axis.

    With height 0 it is a flat band on the ground from radius - width to radius. With a height
    it is a wall from radius at the bottom to top_radius (radius by default) at the top: flare
    the top outward for a blast wave. U runs once around, V across the band or up the wall.
    """
    import math
    radius = _positive(radius, "radius")
    segments = _segments(segments, "segments", 8)
    if not isinstance(height, (int, float)) or height < 0:
        raise ValueError(f"height must be 0 (a flat band) or a positive number of studs, got {height!r}")
    if height == 0:
        width = _positive(width, "width")
        if width >= radius:
            raise ValueError(f"width ({width}) must be less than radius ({radius})")
        return _strip(name, segments, 1, lambda u, v: _around(2 * math.pi * u) * (radius - width + width * v), rgba)
    top = radius if top_radius is None else _positive(top_radius, "top_radius")
    return _strip(name, segments, 1, lambda u, v: _around(2 * math.pi * u) * (radius + (top - radius) * v) + Vector((0, 0, height * v)), rgba)


def vfx_cone(name, radius, height, tip_radius=0.0, segments=32, rgba=None):
    """An open cone shell from a base of radius at the origin up to tip_radius at height.

    Point it with the MeshPart's orientation in Studio: up the axis for a burst, along the
    LookVector for a muzzle blast. U runs around, V from the base to the tip.
    """
    import math
    radius, height = _positive(radius, "radius"), _positive(height, "height")
    if not isinstance(tip_radius, (int, float)) or tip_radius < 0:
        raise ValueError(f"tip_radius must be 0 (a point) or a positive number of studs, got {tip_radius!r}")
    segments = _segments(segments, "segments", 8)
    return _strip(name, segments, 4,
                  lambda u, v: _around(2 * math.pi * u) * (radius + (max(tip_radius, 0.001) - radius) * v) + Vector((0, 0, height * v)), rgba)


def vfx_swirl(name, radius, height, width, turns=1.5, top_radius=None, segments=96, rgba=None):
    """A ribbon spiralling up around the vertical axis: a tornado, an aura, a charge-up.

    It turns the given number of times while rising from 0 to height, its radius going from radius to
    top_radius (radius by default), and the ribbon is width tall. U runs along the ribbon from
    the bottom end, V across it from its lower edge.
    """
    import math
    radius, height, width = _positive(radius, "radius"), _positive(height, "height"), _positive(width, "width")
    if not isinstance(turns, (int, float)) or not 0.1 <= turns <= 8:
        raise ValueError(f"turns must be 0.1 to 8, got {turns!r}")
    top = radius if top_radius is None else _positive(top_radius, "top_radius")
    segments = _segments(segments, "segments", 8)

    def point(u, v):
        return _around(2 * math.pi * turns * u) * (radius + (top - radius) * u) + Vector((0, 0, height * u + width * (v - 0.5)))

    return _strip(name, segments, 1, point, rgba)


def vfx_shell(name, radius, segments=32, rings=16, dome=False, rgba=None):
    """A sphere, or with dome a half sphere standing on the ground, as one shell: a barrier,
    a blast bubble, a shield. U runs around, V from the bottom (the equator for a dome) to the top.
    """
    import math
    radius = _positive(radius, "radius")
    segments = _segments(segments, "segments", 8)
    rings = _segments(rings, "rings", 2)

    def point(u, v):
        polar = (math.pi / 2) * (1 - v) if dome else math.pi * (1 - v)
        return _around(2 * math.pi * u) * (radius * math.sin(polar)) + Vector((0, 0, radius * math.cos(polar)))

    return _strip(name, segments, rings, point, rgba)


_MAX_INFLUENCES = 4
# The share of a chain's first bone, either side of its head, over which a part's weight passes to the bone above.
_ROOT_BLEND = 0.25


def bind(obj, bones):
    """Say which bones a part follows, before it is joined and skinned.

    bones is one bone's name, for a part that moves rigidly with it (a paw with its foot bone),
    or a list of names, for a part that bends between them (a tail along its tail bones).
    fx.skin weights each of its vertices among those bones only. A part that is not bound
    is weighted among every bone, by which lie nearest.
    """
    names = [bones] if isinstance(bones, str) else list(bones)
    if not names or not all(isinstance(name, str) and name for name in names):
        raise ValueError(f"bones must be a bone's name or a list of names, got {bones!r}")
    indices = [vertex.index for vertex in obj.data.vertices]
    for name in names:
        group = obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name)
        group.add(indices, 1.0, "REPLACE")
    return obj


def _segment_distance(point, head, tail):
    along = tail - head
    length = along.length_squared
    share = 0.0 if length < 1e-12 else max(0.0, min(1.0, (point - head).dot(along) / length))
    return (point - (head + along * share)).length


def skin(obj, bones, name="Armature"):
    """Skin one mesh to an armature, so it bends at its bones when animated in Studio.

    bones lists (name, head, tail) or (name, head, tail, parent): each bone runs from head to
    tail in studs, a parent before its children. obj is the whole creature as one object, joined
    with fx.join. Every vertex is weighted to the bones nearest it, blending where two meet,
    at most four a vertex and summing to 1; a part bound with fx.bind keeps to its own bones.
    Returns the armature. Export both: the upload keeps the bones and the weights.
    """
    if obj.type != "MESH":
        raise ValueError(f"{obj.name} is a {obj.type.lower()}, not a mesh")
    entries = []
    seen = set()
    for entry in bones:
        if len(entry) not in (3, 4):
            raise ValueError(f"a bone is (name, head, tail) or (name, head, tail, parent), got {entry!r}")
        bone_name, head, tail = entry[0], _vector(entry[1], "head"), _vector(entry[2], "tail")
        parent = entry[3] if len(entry) == 4 else None
        if not isinstance(bone_name, str) or not bone_name or bone_name in seen:
            raise ValueError(f"each bone needs a name of its own, got {bone_name!r}")
        if (tail - head).length < 1e-4:
            raise ValueError(f"{bone_name}'s head and tail are the same point")
        if parent is not None and parent not in seen:
            raise ValueError(f"{bone_name}'s parent {parent!r} must come before it in the list")
        seen.add(bone_name)
        entries.append((bone_name, head, tail, parent))
    if not entries:
        raise ValueError("skin needs at least one bone")
    unknown = sorted(group.name for group in obj.vertex_groups if group.name not in seen)
    if unknown:
        raise ValueError(f"parts are bound to bones that are not in the list: {', '.join(unknown)}")

    data = bpy.data.armatures.new(name)
    armature = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(armature)
    bpy.context.view_layer.objects.active = armature
    with bpy.context.temp_override(active_object=armature, object=armature, selected_objects=[armature], selected_editable_objects=[armature]):
        bpy.ops.object.mode_set(mode="EDIT")
        made = {}
        for bone_name, head, tail, parent in entries:
            bone = data.edit_bones.new(bone_name)
            bone.head, bone.tail = head, tail
            if parent is not None:
                bone.parent = made[parent]
            made[bone_name] = bone
        bpy.ops.object.mode_set(mode="OBJECT")

    # Which bones each vertex may follow: those its part was bound to, or all of them.
    bound = {}
    for vertex in obj.data.vertices:
        names = [obj.vertex_groups[item.group].name for item in vertex.groups if item.weight > 0]
        if names:
            bound[vertex.index] = set(names)
    for group in list(obj.vertex_groups):
        obj.vertex_groups.remove(group)
    groups = {bone_name: obj.vertex_groups.new(name=bone_name) for bone_name, _, _, _ in entries}
    world = obj.matrix_world
    for vertex in obj.data.vertices:
        point = world @ vertex.co
        allowed = bound.get(vertex.index)
        near = sorted(
            (_segment_distance(point, head, tail), bone_name)
            for bone_name, head, tail, _ in entries if allowed is None or bone_name in allowed
        )[:_MAX_INFLUENCES]
        # Nearness to the fourth power: a vertex midway between two bones is shared, one
        # beside a bone is almost wholly its own.
        raw = [(1.0 / max(distance, 1e-4) ** 4, bone_name) for distance, bone_name in near]
        most = max(weight for weight, _ in raw)
        kept = [(weight, bone_name) for weight, bone_name in raw if weight >= most * 0.05]
        total = sum(weight for weight, _ in kept)
        shares = {bone_name: weight / total for weight, bone_name in kept}
        # Where a part that bends along several bones runs up into what it hangs from, as a
        # thigh into the rump or a tail's root into the back, it stays with that: around the
        # first bone's head its weight passes to that bone's parent, so the top of a leg does
        # not swing out of the body as the leg turns. A part bound to one bone stays rigid.
        if allowed is not None and len(allowed) > 1:
            for bone_name, head, tail, parent in entries:
                if bone_name not in shares or parent is None or parent in allowed:
                    continue
                along = (tail - head).normalized()
                margin = _ROOT_BLEND * (tail - head).length
                up = max(0.0, min(1.0, 0.5 - (point - head).dot(along) / (2 * margin)))
                if up > 0:
                    shares[parent] = shares.get(parent, 0.0) + shares[bone_name] * up
                    shares[bone_name] *= 1 - up
            ranked = sorted(((weight, bone_name) for bone_name, weight in shares.items() if weight > 1e-4), reverse=True)[:_MAX_INFLUENCES]
            total = sum(weight for weight, _ in ranked)
            shares = {bone_name: weight / total for weight, bone_name in ranked}
        for bone_name, weight in shares.items():
            if weight > 0:
                groups[bone_name].add([vertex.index], weight, "REPLACE")

    for modifier in list(obj.modifiers):
        if modifier.type == "ARMATURE":
            obj.modifiers.remove(modifier)
    obj.modifiers.new(name, "ARMATURE").object = armature
    obj.parent = armature
    obj.matrix_parent_inverse = armature.matrix_world.inverted()
    obj.data.name = obj.name
    bpy.context.view_layer.update()
    return armature
