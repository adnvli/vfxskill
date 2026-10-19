--!strict
-- VFXBuild: builds instances from JSON steps, the format every example in this
-- skill's references uses. Ported from the original build_instances
-- for any Studio MCP with execute_luau.
--
-- Install as a ModuleScript at ReplicatedStorage.VFX.Build. Then, in one execute_luau:
--   local Build = require(game.ReplicatedStorage.VFX.Build)
--   return Build.run("game.ReplicatedStorage.VFX", [==[ [ ...steps as JSON... ] ]==])
--
-- Steps (a JSON array, or a Luau table of the same shape):
--   { "op": "create", "className": "Model", "name": "Slam", "id": "slam" }
--   { "op": "create", "className": "Part", "name": "Root", "parent": "$slam", "id": "root",
--     "position": [0, 0, 0], "rotation": [0, 0, 0],
--     "properties": { "Anchored": true, "Transparency": 1, "CanCollide": false, "Size": [1, 1, 1] } }
--   { "op": "create", "className": "Attachment", "name": "Center", "parent": "$root", "id": "c" }
--   { "op": "create", "className": "ParticleEmitter", "name": "Flash", "parent": "$c",
--     "properties": { ... }, "attributes": { "EmitCount": 1, "EmitDelay": 0.14 } }
--   { "op": "set", "target": "$c", "properties": { ... }, "attributes": { ... } }
--   { "op": "link", "target": "$trail", "attachment0": "$a", "attachment1": "$b" }   -- Beams/Trails
--   { "op": "remove", "target": "game.Workspace.SlamPreview" }
--
-- `parent` and `target` are a full path (game.ReplicatedStorage.VFX.Slam) or "$id" of an
-- earlier step. A step with no parent goes in the root. A missing root is created as a
-- Model (a Folder under a service if you prefer: create it yourself first).
-- One ChangeHistoryService recording: the whole build is one undo step.
--
-- Value shapes (as the original): Color3 [r,g,b] 0-1; ColorSequence [r,g,b] or
-- [{time, value:[r,g,b]}, ...]; NumberSequence a number or [{time, value, envelope?}, ...];
-- NumberRange a number or [min, max]; Vector3 [x,y,z]; Vector2 [x,y]; UDim2 [xs,xo,ys,yo];
-- CFrame 12 numbers or {position, rotation(deg)}; enums by item name ("VelocityPerpendicular").

local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")

local Build = {}

local function resolvePath(path: string): Instance?
	local node: Instance? = game
	for segment in string.gmatch(path, "[^%.]+") do
		if segment ~= "game" then
			if node == game then
				local ok, service = pcall(function()
					return game:GetService(segment)
				end)
				node = if ok and service then service else game:FindFirstChild(segment)
			else
				node = node and node:FindFirstChild(segment)
			end
		end
	end
	return node
end

local function isNumberList(v: any, n: number): boolean
	if type(v) ~= "table" or #v ~= n then
		return false
	end
	for i = 1, n do
		if type(v[i]) ~= "number" then
			return false
		end
	end
	return true
end

local function color3(v: any): Color3?
	if isNumberList(v, 3) then
		return Color3.new(v[1], v[2], v[3])
	end
	if type(v) == "table" and (v.R or v.G or v.B) then
		return Color3.new(v.R or 0, v.G or 0, v.B or 0)
	end
	return nil
end

local function keypoints(v: any): { any }?
	if type(v) ~= "table" or #v == 0 then
		return nil
	end
	for _, k in v do
		if type(k) ~= "table" or type(k.time) ~= "number" then
			return nil
		end
	end
	return v
end

local function cframe(v: any): CFrame
	if isNumberList(v, 12) then
		return CFrame.new(table.unpack(v))
	end
	if type(v) == "table" and isNumberList(v.position, 3) then
		local r = v.rotation or { 0, 0, 0 }
		return CFrame.new(v.position[1], v.position[2], v.position[3])
			* CFrame.fromOrientation(math.rad(r[1]), math.rad(r[2]), math.rad(r[3]))
	end
	error("CFrame is 12 numbers or {position, rotation}", 0)
end

local CONVERT: { [string]: (any) -> any } = {
	CFrame = cframe,
	ColorSequence = function(v)
		local c = color3(v)
		if c then
			return ColorSequence.new(c)
		end
		local kps = keypoints(v)
		assert(kps, "ColorSequence is [r,g,b] or [{time, value:[r,g,b]}, ...]")
		local out = {}
		for _, k in kps do
			table.insert(out, ColorSequenceKeypoint.new(k.time, assert(color3(k.value), "keypoint value is [r,g,b]")))
		end
		return ColorSequence.new(out)
	end,
	NumberSequence = function(v)
		if type(v) == "number" then
			return NumberSequence.new(v)
		end
		local kps = keypoints(v)
		assert(kps, "NumberSequence is a number or [{time, value, envelope?}, ...]")
		local out = {}
		for _, k in kps do
			table.insert(out, NumberSequenceKeypoint.new(k.time, k.value, k.envelope or 0))
		end
		return NumberSequence.new(out)
	end,
	NumberRange = function(v)
		if type(v) == "number" then
			return NumberRange.new(v)
		end
		assert(isNumberList(v, 2), "NumberRange is a number or [min, max]")
		return NumberRange.new(v[1], v[2])
	end,
	Color3 = function(v)
		return assert(color3(v), "Color3 is [r,g,b] from 0 to 1")
	end,
	Vector3 = function(v)
		if type(v) == "table" and v.X then
			return Vector3.new(v.X or 0, v.Y or 0, v.Z or 0)
		end
		assert(isNumberList(v, 3), "Vector3 is [x,y,z]")
		return Vector3.new(v[1], v[2], v[3])
	end,
	Vector2 = function(v)
		assert(isNumberList(v, 2), "Vector2 is [x,y]")
		return Vector2.new(v[1], v[2])
	end,
	UDim2 = function(v)
		assert(isNumberList(v, 4), "UDim2 is [xScale, xOffset, yScale, yOffset]")
		return UDim2.new(v[1], v[2], v[3], v[4])
	end,
}

local function convert(instance: Instance, prop: string, value: any): any
	local ok, current = pcall(function()
		return (instance :: any)[prop]
	end)
	if not ok then
		error(string.format("%s has no property %s", instance.ClassName, prop), 0)
	end
	local kind = typeof(current)
	if kind == "EnumItem" and type(value) == "string" then
		local enumType = (current :: EnumItem).EnumType
		local item = (enumType :: any)[value]
		return item
	end
	if kind == "Content" and type(value) == "string" then
		return Content.fromUri(value)
	end
	local f = CONVERT[kind]
	if f and (type(value) == "table" or type(value) == "number") then
		return f(value)
	end
	return value
end

local function setAll(instance: Instance, step: any)
	for prop, value in step.properties or {} do
		if prop == "Parent" then
			error("set the parent with the step's parent field", 0)
		end
		local converted = convert(instance, prop, value)
		local ok, err = pcall(function()
			(instance :: any)[prop] = converted
		end)
		if not ok then
			-- Some Content-typed properties still take a string.
			local ok2 = pcall(function()
				(instance :: any)[prop] = value
			end)
			if not ok2 then
				error(string.format("%s.%s: %s", instance.Name, prop, tostring(err)), 0)
			end
		end
	end
	for name, value in step.attributes or {} do
		instance:SetAttribute(name, value)
	end
end

-- Runs the steps under `rootPath`. Returns a summary string; errors name the step.
function Build.run(rootPath: string, steps: any): string
	if type(steps) == "string" then
		steps = HttpService:JSONDecode(steps)
	end
	if type(steps) == "table" and steps.op then
		steps = { steps }
	end
	local recording = ChangeHistoryService:TryBeginRecording("VFXBuild " .. rootPath)
	local ids: { [string]: Instance } = {}
	local made, changed, removed = 0, 0, 0

	local root = resolvePath(rootPath)
	if not root then
		local parentPath, name = string.match(rootPath, "^(.*)%.([^%.]+)$")
		local parent = parentPath and resolvePath(parentPath)
		assert(parent and name, "the root's parent does not exist: " .. tostring(parentPath))
		local model = Instance.new("Model")
		model.Name = name :: string
		model.Parent = parent
		root = model
		made += 1
	end

	local function ref(text: any, field: string, index: number): Instance
		assert(type(text) == "string" and text ~= "", string.format("step %d: %s must be a path or $id", index, field))
		if string.sub(text, 1, 1) == "$" then
			return assert(ids[string.sub(text, 2)], string.format("step %d: %s %s names no earlier step", index, field, text))
		end
		return assert(resolvePath(text), string.format("step %d: %s not found: %s", index, field, text))
	end

	local ok, err = pcall(function()
		for index, step in steps do
			local op = step.op or "create"
			if op == "create" then
				local instance = Instance.new(step.className)
				instance.Name = step.name or step.className
				setAll(instance, step)
				if (step.position or step.rotation) and instance:IsA("PVInstance") then
					local p = step.position or { 0, 0, 0 }
					local r = step.rotation or { 0, 0, 0 }
					(instance :: PVInstance):PivotTo(CFrame.new(p[1], p[2], p[3])
						* CFrame.fromOrientation(math.rad(r[1]), math.rad(r[2]), math.rad(r[3])))
				end
				instance.Parent = if step.parent then ref(step.parent, "parent", index) else root
				if step.id then
					ids[step.id] = instance
				end
				made += 1
			elseif op == "set" then
				local target = ref(step.target, "target", index)
				setAll(target, step)
				if step.id then
					ids[step.id] = target
				end
				changed += 1
			elseif op == "link" then
				local target: any = ref(step.target, "target", index)
				target.Attachment0 = ref(step.attachment0, "attachment0", index)
				target.Attachment1 = ref(step.attachment1, "attachment1", index)
				changed += 1
			elseif op == "remove" then
				ref(step.target, "target", index):Destroy()
				removed += 1
			else
				error(string.format("step %d: unknown op %s", index, tostring(op)), 0)
			end
		end
	end)
	if recording then
		ChangeHistoryService:FinishRecording(recording, if ok then Enum.FinishRecordingOperation.Commit else Enum.FinishRecordingOperation.Cancel)
	end
	if not ok then
		return "build failed (nothing kept): " .. tostring(err)
	end
	return string.format("built under %s: %d created, %d changed, %d removed", root:GetFullName(), made, changed, removed)
end

return Build
