--!strict
-- VFXCapture: see a playing effect at chosen moments, one screenshot each.
--
-- Port of the original capture_moments for any
-- Studio MCP that has execute_luau and screen_capture. A screenshot takes most of a
-- second, longer than a whole burst, so the effect is held still at each moment
-- instead of caught in passing.
--
-- Install as a ModuleScript at ReplicatedStorage.VFX.Capture (beside Emit). State is
-- kept on a Configuration in Workspace (_VFXCapture) and in a thread started by
-- `start`, so it works even when each execute_luau call runs in a fresh environment.
--
-- Flow, one execute_luau call each, screen_capture between the steps:
--   1. local VFX = require(game.ReplicatedStorage.VFX.Emit)
--      local Capture = require(game.ReplicatedStorage.VFX.Capture)
--      Capture.aim(workspace.SlamPreview, 30, 20)        -- or a CFrame/Vector3
--      return Capture.start(VFX.play(game.ReplicatedStorage.VFX.Slam, CFrame.new(0, 3, 0)))
--   2. return require(game.ReplicatedStorage.VFX.Capture).step(0.03)   -> screen_capture
--   3. return require(game.ReplicatedStorage.VFX.Capture).step(0.1)    -> screen_capture
--      ... (rising times only)
--   4. return require(game.ReplicatedStorage.VFX.Capture).stop()
--
-- step(time, slow?, hold?): plays at normal speed until shortly before `time`, at
-- `slow` (default 0.04x) for the last stretch, then holds there (hold defaults to
-- true). For trails pass hold = false: the effect keeps creeping at `slow`, and
-- the emit module stretches trail lifetimes to match, so the trail stays drawn.

local ContentProvider = game:GetService("ContentProvider")

local Capture = {}

local FOLDER = "_VFXCapture"
local MAX_WAIT = 20 -- real seconds one step may wait
local STALLED = 1.5 -- real seconds with the clock still before the effect counts as ended
local SLOW_APPROACH = 1.5 -- real seconds of approach at the slow speed
local TRAIL_APPROACH = 0.9 -- effect seconds of slow approach when not holding

local function control(): Configuration
	local found = workspace:FindFirstChild(FOLDER)
	if found and found:IsA("Configuration") then
		return found
	end
	local made = Instance.new("Configuration")
	made.Name = FOLDER
	made.Archivable = false
	made.Parent = workspace
	return made
end

local function boxOf(target: any): (CFrame, Vector3)
	if typeof(target) == "Instance" then
		if target:IsA("Model") then
			local cf, size = target:GetBoundingBox()
			return cf, size
		elseif target:IsA("BasePart") then
			return target.CFrame, target.Size
		end
	elseif typeof(target) == "CFrame" then
		return target, Vector3.new(8, 8, 8)
	elseif typeof(target) == "Vector3" then
		return CFrame.new(target), Vector3.new(8, 8, 8)
	end
	error("aim takes a Model, a BasePart, a CFrame or a Vector3")
end

-- Points the edit camera at `target` from `distance` studs away, `angleY` degrees
-- above level, from `yaw` degrees round (0 = from the target's front, 90 = its right).
function Capture.aim(target: any, distance: number?, angleY: number?, yaw: number?)
	local cf, size = boxOf(target)
	local d = distance or math.max(size.X, size.Y, size.Z) * 1.8 + 6
	local pitch = math.rad(angleY or 20)
	local turn = math.rad(yaw or 30)
	local centre = cf.Position
	local look = cf.LookVector * Vector3.new(1, 0, 1)
	if look.Magnitude < 1e-3 then
		look = Vector3.new(0, 0, -1)
	end
	local forward = CFrame.lookAt(Vector3.zero, look.Unit)
	local dir = (forward * CFrame.Angles(0, turn, 0) * CFrame.Angles(-pitch, 0, 0)).LookVector
	local camera = workspace.CurrentCamera
	camera.CameraType = Enum.CameraType.Scriptable
	camera.CFrame = CFrame.lookAt(centre + dir * d, centre)
	camera.Focus = CFrame.new(centre)
	return string.format("camera %.0f studs from %s", d, tostring(centre))
end

-- Puts the camera where a player's would be: behind `from` (the caster's spot),
-- looking at `to` (where the effect plays), about head height.
function Capture.aimFromPlayer(from: Vector3, to: Vector3, height: number?, back: number?)
	local flat = (to - from) * Vector3.new(1, 0, 1)
	local dir = if flat.Magnitude > 1e-3 then flat.Unit else Vector3.new(0, 0, -1)
	local eye = from - dir * (back or 12) + Vector3.new(0, height or 6, 0)
	local camera = workspace.CurrentCamera
	camera.CameraType = Enum.CameraType.Scriptable
	camera.CFrame = CFrame.lookAt(eye, to)
	return string.format("player camera at %s", tostring(eye))
end

-- Starts watching a handle from Emit's VFX.play or VFX.emit. Call it in the same
-- execute_luau call that started the effect. Holds the effect at its start while
-- its textures load; returns "loaded" or "loading".
function Capture.start(handle: any, preloadSeconds: number?): string
	assert(type(handle) == "table" and type(handle.setTimeScale) == "function",
		"Capture.start needs the handle VFX.play or VFX.emit returned")
	local c = control()
	local gen = (c:GetAttribute("Gen") or 0) + 1
	c:SetAttribute("Gen", gen)
	c:SetAttribute("Request", 0)
	c:SetAttribute("Answered", 0)
	c:SetAttribute("Stop", false)
	c:SetAttribute("Time", 0)
	c:SetAttribute("Status", "ready")

	local function clock(): number
		return tonumber(handle.time) or 0
	end
	local function scale(speed: number)
		if handle.finished ~= true then
			handle:setTimeScale(speed)
		end
	end
	scale(0)

	local loaded = true
	if typeof(handle.root) == "Instance" then
		loaded = false
		task.spawn(function()
			pcall(function()
				ContentProvider:PreloadAsync({ handle.root })
			end)
			loaded = true
		end)
		local t0 = os.clock()
		while not loaded and os.clock() - t0 < (preloadSeconds or 3) do
			task.wait()
		end
	end

	task.spawn(function()
		local handled = 0
		while c.Parent and c:GetAttribute("Gen") == gen do
			if c:GetAttribute("Stop") == true then
				pcall(function()
					handle:stop()
				end)
				c:SetAttribute("Status", "stopped")
				return
			end
			local request = c:GetAttribute("Request") or 0
			if request > handled then
				handled = request
				local target = c:GetAttribute("Target") or 0
				local slow = c:GetAttribute("Slow") or 0.04
				local hold = c:GetAttribute("Hold") ~= false
				local trail = math.min(TRAIL_APPROACH, slow * MAX_WAIT)
				local approach = math.max(slow * SLOW_APPROACH, if hold then 0 else trail)
				local started, last, moved = os.clock(), clock(), os.clock()
				local function playTo(stop: number, speed: number)
					scale(speed)
					while clock() < stop and handle.finished ~= true
						and os.clock() - started < MAX_WAIT and os.clock() - moved < STALLED do
						task.wait()
						local now = clock()
						if now ~= last then
							last, moved = now, os.clock()
						end
					end
				end
				if clock() < target - approach then
					playTo(target - approach, 1)
				end
				playTo(target, slow)
				if hold then
					scale(0)
				end
				local status = if clock() >= target then "done"
					elseif handle.finished == true or os.clock() - moved >= STALLED then "stalled"
					else "capped"
				c:SetAttribute("Time", clock())
				c:SetAttribute("Status", status)
				c:SetAttribute("Answered", request)
			end
			task.wait()
		end
	end)

	return if loaded then "loaded" else "loading (textures still loading; early frames may miss layers)"
end

-- Plays on to effect time `time` and holds. Returns "<reached time>|<status>":
-- done, stalled (the effect has ended), or capped (this call ran out of time).
-- Take the screenshot right after this returns.
function Capture.step(time: number, slow: number?, hold: boolean?): string
	local c = workspace:FindFirstChild(FOLDER)
	if not c then
		return "no capture running: call Capture.start(handle) first"
	end
	local request = (c:GetAttribute("Request") or 0) + 1
	c:SetAttribute("Target", time)
	c:SetAttribute("Slow", slow or 0.04)
	c:SetAttribute("Hold", hold ~= false)
	c:SetAttribute("Request", request)
	local t0 = os.clock()
	while (c:GetAttribute("Answered") or 0) < request and os.clock() - t0 < MAX_WAIT + 4 do
		task.wait()
	end
	if (c:GetAttribute("Answered") or 0) < request then
		return "no answer: the capture thread is gone; start the effect again"
	end
	return string.format("%.3f|%s", c:GetAttribute("Time") or 0, tostring(c:GetAttribute("Status")))
end

-- Ends the effect and removes the control folder; puts the camera back to Custom.
function Capture.stop(): string
	local c = workspace:FindFirstChild(FOLDER)
	if c then
		c:SetAttribute("Stop", true)
		task.wait(0.1)
		c:Destroy()
	end
	workspace.CurrentCamera.CameraType = Enum.CameraType.Custom
	return "stopped"
end

return Capture
