-- VFX_EMIT 2026-10-03
-- Plays effects authored as instances with attributes, the convention the
-- popular VFX editors share, so an artist can open and tune what the agent
-- builds. Require it from client code; effects are presentation.
--
--   local VFX = require(game.ReplicatedStorage.VFX.Emit)
--   local handle = VFX.play(game.ReplicatedStorage.VFX.Slam, hitCFrame)
--   handle:freeze(0.06)          -- hitstop
--   VFX.emit(sword.Blade)        -- an effect already in place (a weapon, an aura)
--
-- Attributes it reads:
--   ParticleEmitter  EmitDelay, EmitCount (a burst), EmitDuration (emit at Rate for that long)
--   Beam, Trail      EmitDelay, EmitDuration (enabled for that long)
--   PointLight, SpotLight, SurfaceLight
--                    EmitDelay, EmitDuration (on, then Brightness fades to 0 over it)
--   Mesh motion      a Model or Folder holding BaseParts named Start and End.
--                    Start is shown and moves to End's CFrame, Size, Transparency
--                    and Color (and a SpecialMesh's Scale) over Duration seconds;
--                    Decals on Start fade to the Transparency of End's same-named Decal.
--                    Container attributes: EmitDelay, Duration (0.4), Easing ("Quad"),
--                    EasingDirection ("Out"), Spin (degrees about Start's up axis).
--   The effect root  EffectDuration overrides when the effect ends, for an
--                    effect whose emitters run on their own without attributes.
--
-- EmitDelay is absolute, counted from the effect's start; editors that set a
-- delay on a group write it onto every descendant, so delays are not summed.
--
-- One clock drives everything, scaled by the handle's time scale, which also
-- multiplies every emitter's own TimeScale and stretches every trail's Lifetime:
-- setTimeScale(0.1) is slow motion and freeze(seconds) is hitstop for
-- particles, trails and meshes alike.

local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local VFX = {}

local MAX_EMIT_COUNT = 500
local MAX_EFFECT_SECONDS = 30
local DEFAULT_MESH_SECONDS = 0.4

local function numberAttribute(instance, name, default)
	local value = instance:GetAttribute(name)
	if typeof(value) == "number" and value == value then
		return value
	end
	if value ~= nil then
		warn(`VFXEmit: {instance:GetFullName()}.{name} should be a number, got {typeof(value)}`)
	end
	return default
end

local function enumAttribute(instance, name, enumType, default)
	local value = instance:GetAttribute(name)
	if value == nil then
		return default
	end
	local ok, item = pcall(function()
		return (enumType :: any)[value]
	end)
	if ok and item then
		return item
	end
	warn(`VFXEmit: {instance:GetFullName()}.{name} is not a valid {tostring(enumType)} name: {tostring(value)}`)
	return default
end

local function isLight(instance)
	return instance:IsA("PointLight") or instance:IsA("SpotLight") or instance:IsA("SurfaceLight")
end

local Handle = {}
Handle.__index = Handle

-- Schedules `run` at effect time `at`.
function Handle:_at(at, run)
	table.insert(self._events, { at = at, run = run })
	self._ending = math.max(self._ending, at)
end

-- Runs `step(alpha)` every frame from `from` for `seconds` of effect time.
function Handle:_over(from, seconds, step)
	table.insert(self._tracks, { from = from, seconds = math.max(seconds, 1e-3), step = step })
	self._ending = math.max(self._ending, from + seconds)
end

function Handle:_emitter(emitter)
	local delay = numberAttribute(emitter, "EmitDelay", 0)
	local count = numberAttribute(emitter, "EmitCount", nil)
	local duration = numberAttribute(emitter, "EmitDuration", nil)
	if count == nil and duration == nil then
		return
	end
	table.insert(self._emitters, emitter)
	-- An emitter's own TimeScale (lingering smoke at 0.7, say) is part of the
	-- design; the handle's time scale multiplies it rather than replacing it.
	local authored = emitter.TimeScale
	self._timeScales[emitter] = authored
	self._restore[emitter] = { Enabled = emitter.Enabled, TimeScale = authored }
	emitter.Enabled = false
	local lifetime = emitter.Lifetime.Max / math.max(authored, 0.05)
	if count ~= nil then
		local bounded = math.clamp(math.floor(count), 0, MAX_EMIT_COUNT)
		if bounded ~= count then
			warn(`VFXEmit: {emitter:GetFullName()} EmitCount {count} was bounded to {bounded}`)
		end
		self:_at(delay, function()
			emitter:Emit(bounded)
		end)
		self._ending = math.max(self._ending, delay + lifetime)
	end
	if duration ~= nil then
		self:_at(delay, function()
			emitter.Enabled = true
		end)
		self:_at(delay + duration, function()
			emitter.Enabled = false
		end)
		self._ending = math.max(self._ending, delay + duration + lifetime)
	end
end

function Handle:_ribbon(ribbon)
	local delay = numberAttribute(ribbon, "EmitDelay", 0)
	local duration = numberAttribute(ribbon, "EmitDuration", nil)
	if duration == nil then
		return
	end
	self._restore[ribbon] = { Enabled = ribbon.Enabled }
	ribbon.Enabled = false
	self:_at(delay, function()
		ribbon.Enabled = true
	end)
	self:_at(delay + duration, function()
		ribbon.Enabled = false
	end)
	if ribbon:IsA("Trail") then
		-- A trail fades in real time; its lifetime follows the time scale instead.
		self._restore[ribbon].Lifetime = ribbon.Lifetime
		table.insert(self._trails, { trail = ribbon, lifetime = ribbon.Lifetime })
		self._ending = math.max(self._ending, delay + duration + ribbon.Lifetime)
	end
end

function Handle:_light(light)
	local delay = numberAttribute(light, "EmitDelay", 0)
	local duration = numberAttribute(light, "EmitDuration", nil)
	if duration == nil then
		return
	end
	local brightness = light.Brightness
	self._restore[light] = { Enabled = light.Enabled, Brightness = brightness }
	light.Enabled = false
	self:_at(delay, function()
		light.Enabled = true
	end)
	self:_over(delay, duration, function(alpha)
		light.Brightness = brightness * (1 - TweenService:GetValue(alpha, Enum.EasingStyle.Quad, Enum.EasingDirection.Out))
	end)
	self:_at(delay + duration, function()
		light.Enabled = false
	end)
end

local function meshScale(part)
	local mesh = part:FindFirstChildOfClass("SpecialMesh")
	return mesh, mesh and mesh.Scale
end

function Handle:_mesh(container, start, finish)
	local delay = numberAttribute(container, "EmitDelay", 0)
	local duration = numberAttribute(container, "Duration", DEFAULT_MESH_SECONDS)
	local style = enumAttribute(container, "Easing", Enum.EasingStyle, Enum.EasingStyle.Quad)
	local direction = enumAttribute(container, "EasingDirection", Enum.EasingDirection, Enum.EasingDirection.Out)
	local spin = math.rad(numberAttribute(container, "Spin", 0))

	local from = { CFrame = start.CFrame, Size = start.Size, Transparency = start.Transparency, Color = start.Color }
	local to = { CFrame = finish.CFrame, Size = finish.Size, Transparency = finish.Transparency, Color = finish.Color }
	local startMesh, startScale = meshScale(start)
	local _, finishScale = meshScale(finish)
	-- Decals on Start fade to the Transparency of End's decal of the same name.
	-- A Decal is how a mesh shows a texture that fades: TextureID ignores alpha.
	local decals = {}
	for _, child in start:GetChildren() do
		if child:IsA("Decal") then
			local target = finish:FindFirstChild(child.Name)
			local to = target and target:IsA("Decal") and target.Transparency or child.Transparency
			table.insert(decals, { decal = child, from = child.Transparency, to = to })
			self._restore[child] = { Transparency = child.Transparency }
			child.Transparency = 1
		end
	end
	-- End only carries the target values; it is never shown.
	if self._owned then
		finish:Destroy()
	else
		self._restore[finish] = { Transparency = finish.Transparency }
		finish.Transparency = 1
	end
	self._restore[start] = from
	start.Transparency = 1

	self:_over(delay, duration, function(alpha)
		local eased = TweenService:GetValue(alpha, style, direction)
		start.CFrame = from.CFrame:Lerp(to.CFrame, eased) * CFrame.Angles(0, spin * eased, 0)
		start.Size = from.Size:Lerp(to.Size, eased)
		start.Transparency = from.Transparency + (to.Transparency - from.Transparency) * eased
		start.Color = from.Color:Lerp(to.Color, eased)
		if startMesh and startScale and finishScale then
			startMesh.Scale = startScale:Lerp(finishScale, eased)
		end
		for _, entry in decals do
			entry.decal.Transparency = entry.from + (entry.to - entry.from) * eased
		end
	end)
	self:_at(delay + duration, function()
		start.Transparency = 1
		for _, entry in decals do
			entry.decal.Transparency = 1
		end
	end)
end

function Handle:_collect(root)
	local meshes = {}
	local everything = root:GetDescendants()
	table.insert(everything, root)
	for _, instance in everything do
		if instance:IsA("BasePart") and self._owned then
			-- Effect parts never collide, cast shadows or answer raycasts.
			instance.Anchored = true
			instance.CanCollide = false
			instance.CanQuery = false
			instance.CanTouch = false
			instance.CastShadow = false
		end
		if instance:IsA("ParticleEmitter") then
			self:_emitter(instance)
		elseif instance:IsA("Beam") or instance:IsA("Trail") then
			self:_ribbon(instance)
		elseif isLight(instance) then
			self:_light(instance)
		elseif instance:IsA("Model") or instance:IsA("Folder") then
			local start = instance:FindFirstChild("Start")
			local finish = instance:FindFirstChild("End")
			if start and finish and start:IsA("BasePart") and finish:IsA("BasePart") then
				table.insert(meshes, { instance, start, finish })
			end
		end
	end
	-- Meshes last, so End is read before anything else could change it.
	for _, mesh in meshes do
		self:_mesh(mesh[1], mesh[2], mesh[3])
	end
end

function Handle:setTimeScale(scale)
	-- A finished effect has put back what it changed; scaling it again would undo that.
	if self.finished then
		return
	end
	self._scale = math.clamp(scale, 0, 1)
	for _, emitter in self._emitters do
		emitter.TimeScale = self._timeScales[emitter] * self._scale
	end
	for _, entry in self._trails do
		-- Trail.Lifetime stops at 20 s, which is as near to frozen as a trail gets.
		entry.trail.Lifetime = math.min(entry.lifetime / math.max(self._scale, entry.lifetime / 20), 20)
	end
end

-- Hitstop: holds particles and meshes for `seconds` of real time.
function Handle:freeze(seconds)
	local resume = self._scale
	self:setTimeScale(0)
	task.delay(seconds, function()
		if not self.finished then
			self:setTimeScale(resume)
		end
	end)
end

function Handle:_step(dt)
	self.time += dt * self._scale
	local now = self.time
	local pending = {}
	for _, event in self._events do
		if event.at <= now then
			event.run()
		else
			table.insert(pending, event)
		end
	end
	self._events = pending
	local running = {}
	for _, track in self._tracks do
		if now >= track.from then
			local alpha = math.min((now - track.from) / track.seconds, 1)
			track.step(alpha)
			if alpha < 1 then
				table.insert(running, track)
			end
		else
			table.insert(running, track)
		end
	end
	self._tracks = running
	if now >= self._ending and #self._events == 0 and #self._tracks == 0 then
		self:stop()
	end
end

-- Ends the effect now. An owned copy is destroyed; an effect played in place
-- gets back the state it had before.
function Handle:stop()
	if self.finished then
		return
	end
	self.finished = true
	if self._connection then
		self._connection:Disconnect()
	end
	if self._owned then
		self.root:Destroy()
	else
		for instance, properties in self._restore do
			local target: any = instance
			for name, value in properties do
				target[name] = value
			end
		end
	end
	if self._onDone then
		task.spawn(self._onDone)
	end
end

local function start(root, owned, options)
	options = options or {}
	local self = setmetatable({
		root = root,
		time = 0,
		finished = false,
		_owned = owned,
		_scale = 1,
		_events = {},
		_tracks = {},
		_emitters = {},
		_timeScales = {},
		_trails = {},
		_restore = {},
		_ending = 0,
		_onDone = options.onDone,
	}, Handle)
	self:_collect(root)
	local override = numberAttribute(root, "EffectDuration", nil)
	if override ~= nil then
		self._ending = override
	elseif #self._events == 0 and #self._tracks == 0 then
		warn(`VFXEmit: nothing under {root:GetFullName()} has EmitCount, EmitDuration or Start/End to play`)
	end
	self._ending = math.min(self._ending, MAX_EFFECT_SECONDS)
	self:setTimeScale(options.timeScale or 1)
	self._connection = RunService.Heartbeat:Connect(function(dt)
		self:_step(dt)
	end)
	self:_step(0)
	return self
end

-- Clones `template` (a Model or a BasePart), places it at `cframe`, plays it
-- and destroys the copy when the last particle is gone.
-- options: { parent: Instance?, timeScale: number?, onDone: (() -> ())? }
function VFX.play(template, cframe, options)
	options = options or {}
	local copy = template:Clone()
	if copy:IsA("Model") then
		copy:PivotTo(cframe)
	elseif copy:IsA("BasePart") then
		copy.CFrame = cframe
	else
		copy:Destroy()
		error(`VFXEmit.play: {template:GetFullName()} must be a Model or a BasePart`)
	end
	copy.Parent = options.parent or workspace
	return start(copy, true, options)
end

-- Plays the effects under `root` where they already are, and restores them
-- afterwards. For an effect that lives on a weapon or a character.
function VFX.emit(root, options)
	return start(root, false, options)
end

return VFX
