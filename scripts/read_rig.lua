-- Reads a rigged model's joints for scripts/animate.mjs --rig-json.
-- Port of the original readModelRig.
--
-- Run with execute_luau after setting MODEL_PATH below. It returns JSON: save the
-- returned text verbatim to a file (e.g. dog-rig.json) and pass that file to
--   node scripts/animate.mjs DogWalk.json --rig-json dog-rig.json --locomotion ...
-- The animation's "rig" must equal the returned "path" (animate.mjs fixes it if not).
-- Read-only: changes nothing in the place.

local MODEL_PATH = "game.Workspace.Dog" -- << set this

local HttpService = game:GetService("HttpService")
local HIDDEN_TRANSPARENCY = 0.95
local BONE_SIZE = { 0.1, 0.1, 0.1 }

local function resolve(path: string): Instance?
	local node: Instance? = game
	for name in string.gmatch(path, "[^%.]+") do
		if name ~= "game" then
			node = node and node:FindFirstChild(name)
		end
	end
	return node
end

local function r(v: number): number
	return math.round(v * 1e6) / 1e6
end
local function components(cf: CFrame): { number }
	local out = { cf:GetComponents() }
	for i, v in out do
		out[i] = r(v)
	end
	return out
end
local function sizeOf(part: BasePart): { number }
	return { r(part.Size.X), r(part.Size.Y), r(part.Size.Z) }
end
local function shapeOf(part: BasePart): string
	if part:IsA("WedgePart") then
		return "Wedge"
	end
	if part:IsA("Part") then
		if part.Shape == Enum.PartType.Ball then return "Ball" end
		if part.Shape == Enum.PartType.Cylinder then return "Cylinder" end
		if part.Shape == Enum.PartType.Wedge then return "Wedge" end
	end
	return "Block"
end

local model = resolve(MODEL_PATH)
if not model or not model:IsA("Model") then
	return HttpService:JSONEncode({ error = MODEL_PATH .. " is not a Model" })
end
local controller = model:FindFirstChildWhichIsA("Humanoid") or model:FindFirstChildWhichIsA("AnimationController")
if not controller then
	return HttpService:JSONEncode({ error = MODEL_PATH .. " has no Humanoid or AnimationController; add an AnimationController (with an Animator) first" })
end

local joints = {}
for _, d in model:GetDescendants() do
	if d:IsA("Motor6D") then
		local p0, p1 = d.Part0, d.Part1
		if p0 and p1 and p0:IsDescendantOf(model) and p1:IsDescendantOf(model) then
			table.insert(joints, { name = d.Name, part0 = p0, part1 = p1, c0 = d.C0, c1 = d.C1 })
		end
	elseif d:IsA("AnimationConstraint") then
		local a0, a1 = d.Attachment0, d.Attachment1
		local p0, p1 = a0 and a0.Parent, a1 and a1.Parent
		if p0 and p1 and p0:IsA("BasePart") and p1:IsA("BasePart") and p0:IsDescendantOf(model) and p1:IsDescendantOf(model) then
			table.insert(joints, { name = d.Name, part0 = p0, part1 = p1, c0 = a0.CFrame, c1 = a1.CFrame })
		end
	elseif d:IsA("Bone") then
		local parent = d.Parent
		if parent and (parent:IsA("Bone") or parent:IsA("BasePart")) then
			table.insert(joints, { name = d.Name, part0 = parent, part1 = d, c0 = d.CFrame, c1 = CFrame.new() })
		end
	end
end
if #joints == 0 then
	return HttpService:JSONEncode({ error = MODEL_PATH .. " has no Motor6D, AnimationConstraint or Bone joints to animate" })
end

local root: BasePart?
if controller:IsA("Humanoid") then
	root = controller.RootPart
else
	local moved = {}
	for _, j in joints do moved[j.part1] = true end
	local roots = {}
	for _, j in joints do
		if j.part0:IsA("BasePart") and not moved[j.part0] and not table.find(roots, j.part0) then
			table.insert(roots, j.part0)
		end
	end
	if model.PrimaryPart and table.find(roots, model.PrimaryPart) then
		root = model.PrimaryPart
	elseif #roots == 1 then
		root = roots[1]
	else
		local names = {}
		for _, p in roots do table.insert(names, p.Name) end
		return HttpService:JSONEncode({ error = "joints hang from " .. #roots .. " unmoved parts (" .. table.concat(names, ", ") .. "); set the model's PrimaryPart to the one the rig hangs from" })
	end
end
if not root then
	return HttpService:JSONEncode({ error = "the Humanoid has no RootPart; give the model a HumanoidRootPart" })
end

local nodes = { [root] = true }
for _, j in joints do
	nodes[j.part0] = true
	nodes[j.part1] = true
end
local parts, seen = {}, {}
for node in nodes do
	if seen[node.Name] then
		return HttpService:JSONEncode({ error = "two rig parts are both named " .. node.Name .. "; every jointed part needs a unique name" })
	end
	seen[node.Name] = true
	if node:IsA("Bone") then
		table.insert(parts, { name = node.Name, size = BONE_SIZE, shape = "Block", bone = true })
	else
		local entry: any = { name = node.Name, size = sizeOf(node), shape = shapeOf(node) }
		if node:IsA("MeshPart") and node.MeshId ~= "" then entry.mesh = node.MeshId end
		if node.Transparency >= HIDDEN_TRANSPARENCY then entry.hidden = true end
		table.insert(parts, entry)
	end
end
table.sort(parts, function(a, b) return a.name < b.name end)

local jointList = {}
for _, j in joints do
	table.insert(jointList, { name = j.name, part0 = j.part0.Name, part1 = j.part1.Name, c0 = components(j.c0), c1 = components(j.c1) })
end

local reading: any = {
	path = MODEL_PATH,
	revision = "read-" .. tostring(os.time()),
	rootPart = root.Name,
	controller = if controller:IsA("Humanoid") then "Humanoid" else "AnimationController",
	parts = parts,
	joints = jointList,
}
if controller:IsA("Humanoid") then reading.hipHeight = r(controller.HipHeight) end
local declared = model:GetAttribute("AnimRig")
if typeof(declared) == "string" then reading.declarations = declared end
return HttpService:JSONEncode(reading)
