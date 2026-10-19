"""Run one VFX Blender job headless, with the `fx` helpers loaded.

Adapted from the original Blender runner.

Usage (from a shell, Blender on PATH or given by full path):

    blender -b --factory-startup --python <skill>/scripts/blender_job.py -- <job.py> <output_dir> [--export]

Inside <job.py> these names are defined, as in the original toolkit:
    bpy, numpy, OUTPUT_DIR, fx   (fx.draw_flipbook, fx.tex_blob, fx.vfx_arc, ...)

Every file a job writes goes in OUTPUT_DIR. With --export, every mesh object left in
the scene is also written as <OUTPUT_DIR>/<object name>.glb (one MeshPart each), and
scene.json lists what the scene holds (sizes in studs, triangle counts).

To run the same helpers inside an open Blender through a Blender MCP instead, see
references/tools.md ("Blender through an MCP").
"""
import bpy, json, numpy, os, sys, traceback, types

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(args) < 2:
    print("usage: blender -b --factory-startup --python blender_job.py -- <job.py> <output_dir> [--export]")
    sys.exit(2)
script_path = os.path.abspath(args[0])
OUTPUT_DIR = os.path.abspath(args[1])
export = "--export" in args[2:]
os.makedirs(OUTPUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

helpers = {"__name__": "fx", "_OUTPUT_DIR": OUTPUT_DIR}
with open(os.path.join(HERE, "vfx_blender.py"), "r", encoding="utf-8") as handle:
    exec(compile(handle.read(), "vfx_blender.py", "exec"), helpers)
fx = types.SimpleNamespace(**{name: value for name, value in helpers.items()
                                 if callable(value) and not name.startswith("_") and getattr(value, "__module__", None) == "fx"})

with open(script_path, "r", encoding="utf-8") as handle:
    source = handle.read()
namespace = {"__name__": "__main__", "__file__": script_path, "OUTPUT_DIR": OUTPUT_DIR,
             "bpy": bpy, "numpy": numpy, "fx": fx}
try:
    exec(compile(source, script_path, "exec"), namespace)
except BaseException:
    traceback.print_exc()
    print("JOB FAILED", flush=True)
    sys.exit(1)


def measured(values):
    return [round(float(v), 3) for v in values]


def scene_contents():
    depsgraph = bpy.context.evaluated_depsgraph_get()
    entries, triangles = [], 0
    for item in bpy.context.scene.objects:
        if item.type != "MESH":
            continue
        entry = {"name": item.name}
        evaluated = item.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        points = numpy.empty(len(mesh.vertices) * 3, dtype=numpy.float64)
        mesh.vertices.foreach_get("co", points)
        points = points.reshape(-1, 3)
        if len(points):
            world = numpy.array(evaluated.matrix_world)
            points = points @ world[:3, :3].T + world[:3, 3]
            low, high = points.min(axis=0), points.max(axis=0)
            entry["size"] = measured(high - low)
            entry["center"] = measured((low + high) / 2)
        mesh.calc_loop_triangles()
        entry["triangles"] = len(mesh.loop_triangles)
        entry["uv"] = len(item.data.uv_layers) > 0
        triangles += entry["triangles"]
        evaluated.to_mesh_clear()
        entries.append(entry)
    return {"objects": entries, "count": len(entries), "triangles": triangles}


contents = scene_contents()
if export:
    for entry in contents["objects"]:
        obj = bpy.data.objects[entry["name"]]
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        path = os.path.join(OUTPUT_DIR, entry["name"] + ".glb")
        try:
            bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format="GLB",
                                      export_yup=True, export_apply=True)
            entry["file"] = path
        except BaseException as error:
            entry["exportError"] = str(error)[:300]
with open(os.path.join(OUTPUT_DIR, "scene.json"), "w", encoding="utf-8") as handle:
    json.dump(contents, handle, indent=1)

written = sorted(f for f in os.listdir(OUTPUT_DIR) if not f.endswith(".json") or f.endswith(".flipbook.json"))
print(json.dumps({"ok": True, "output": OUTPUT_DIR, "files": written, "scene": contents}, indent=1), flush=True)
