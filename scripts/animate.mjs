import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// cli.ts
import { readFileSync, writeFileSync } from "fs";

// upstream/packages/core/src/animation/easing.ts
var POSE_EASING_STYLES = ["Linear", "Constant", "Elastic", "Cubic", "Bounce", "CubicV2"];
var POSE_EASING_DIRECTIONS = ["In", "Out", "InOut"];
function easeIn(style, t) {
  switch (style) {
    case "Linear":
      return t;
    case "Cubic":
    case "CubicV2":
      return t * t * t;
    case "Bounce":
      return 1 - bounceOut(1 - t);
    case "Elastic":
      return elasticIn(t, 0.3);
    case "Constant":
      return t < 1 ? 0 : 1;
  }
}
function elasticIn(t, period) {
  if (t === 0 || t === 1) return t;
  return -(2 ** (10 * (t - 1))) * Math.sin((t - 1 - period / 4) * 2 * Math.PI / period);
}
function bounceOut(t) {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}
function easeAlpha(style, direction, t) {
  if (style === "Constant") {
    if (direction === "In") return t > 0 ? 1 : 0;
    if (direction === "InOut") return t >= 0.5 ? 1 : 0;
    return 0;
  }
  const effective = style === "Cubic" && direction !== "InOut" ? direction === "In" ? "Out" : "In" : direction;
  if (effective === "In") return easeIn(style, t);
  if (effective === "Out") return 1 - easeIn(style, 1 - t);
  if (style === "Bounce") {
    return t < 0.5 ? easeIn(style, t * 2) / 2 : 0.5 + easeIn(style, t * 2 - 1) / 2;
  }
  const shape = style === "Elastic" ? (u) => elasticIn(u, 0.45) : (u) => easeIn(style, u);
  return t < 0.5 ? shape(t * 2) / 2 : 1 - shape((1 - t) * 2) / 2;
}

// upstream/packages/core/src/animation/rig.ts
var IDENTITY_ROTATION = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function jointAxes(joint) {
  return joint.restRotation ?? joint.parentRotation;
}

// upstream/packages/core/src/animation/r15-rig.ts
var GRIP_ROTATION = [1, 0, 0, 0, 0, 1, 0, -1, 0];
var SHEATH_ROTATION = [1, 0, 0, 0, -0.173648, -0.984808, 0, 0.984808, -0.173648];
var WEAPON_PART = "BodyAttach";
var WEAPON_STAND_IN_SIZE = [0.15, 4, 0.35];
var WEAPON_STAND_IN_OFFSET = [0, 1.6, 0];
var OFF_HAND_PART = "OffHandAttach";
var SHEATH_PART = "SheathAttach";
var SHEATH_STAND_IN_SIZE = [0.25, 3.8, 0.4];
var SHEATH_STAND_IN_OFFSET = [0, 1.9, 0];
var PROP_DRAW_OFFSETS = {
  [WEAPON_PART]: WEAPON_STAND_IN_OFFSET,
  [OFF_HAND_PART]: WEAPON_STAND_IN_OFFSET,
  [SHEATH_PART]: SHEATH_STAND_IN_OFFSET
};
var HANGING = [0, -1, 0];
var ARM_FOLD = [0, 0, -1];
var LEG_FOLD = [0, 0, 1];
var CHARACTER_WORDS = { limbs: "shoulders and hips", hinges: "elbows and knees" };
var R15_JOINT_LIMITS = {
  Root: "free",
  Waist: { turn: 90 },
  Neck: { turn: 90 },
  LeftShoulder: { turn: 180 },
  RightShoulder: { turn: 180 },
  LeftElbow: { min: -15, max: 160, offAxis: 35 },
  RightElbow: { min: -15, max: 160, offAxis: 35 },
  LeftWrist: { turn: 100 },
  RightWrist: { turn: 100 },
  LeftHip: { turn: 150 },
  RightHip: { turn: 150 },
  LeftKnee: { min: -160, max: 10, offAxis: 35 },
  RightKnee: { min: -160, max: 10, offAxis: 35 },
  LeftAnkle: { turn: 80 },
  RightAnkle: { turn: 80 },
  Weapon: "free",
  OffHand: "free",
  Sheath: "free"
};
var R15_LIMBS = {
  // An arm's hand: the hand's centre with the wrist straight, which grip holds on the weapon.
  LeftShoulder: { hinge: "LeftElbow", end: [0, -0.532, 0], hand: [0, -0.664, 0], axis: HANGING, fold: ARM_FOLD },
  RightShoulder: { hinge: "RightElbow", end: [0, -0.532, 0], axis: HANGING, fold: ARM_FOLD },
  // A leg's aimAt also keys its ankle, to lay the foot flat.
  LeftHip: { hinge: "LeftKnee", end: [0, -0.596, 0], foot: "LeftAnkle", axis: HANGING, fold: LEG_FOLD },
  RightHip: { hinge: "RightKnee", end: [0, -0.596, 0], foot: "RightAnkle", axis: HANGING, fold: LEG_FOLD }
};
var R15_RIG = {
  name: "R15",
  rootPart: "HumanoidRootPart",
  rootJoint: "Root",
  hipHeight: 2.19,
  ground: -(2.19 + 2 / 2),
  feet: ["LeftFoot", "RightFoot"],
  hips: ["LeftHip", "RightHip"],
  body: "LowerTorso",
  limbs: R15_LIMBS,
  hinges: {
    LeftElbow: { axis: "X", flex: 1 },
    RightElbow: { axis: "X", flex: 1 },
    LeftKnee: { axis: "X", flex: -1 },
    RightKnee: { axis: "X", flex: -1 }
  },
  limits: R15_JOINT_LIMITS,
  words: CHARACTER_WORDS,
  drawOffsets: PROP_DRAW_OFFSETS,
  parts: {
    HumanoidRootPart: [2, 2, 1],
    LowerTorso: [1.99, 0.4, 1],
    UpperTorso: [1.94, 1.7, 1],
    Head: [1.16, 1.18, 1.16],
    LeftUpperArm: [1, 1.24, 1],
    LeftLowerArm: [1, 1.12, 1],
    LeftHand: [0.98, 0.32, 1.03],
    RightUpperArm: [1, 1.24, 1],
    RightLowerArm: [1, 1.12, 1],
    RightHand: [0.98, 0.32, 1.03],
    LeftUpperLeg: [0.99, 1.36, 0.97],
    LeftLowerLeg: [0.99, 1.3, 0.97],
    LeftFoot: [1.01, 0.31, 1],
    RightUpperLeg: [0.99, 1.36, 0.97],
    RightLowerLeg: [0.99, 1.3, 0.97],
    RightFoot: [1.01, 0.31, 1],
    [WEAPON_PART]: WEAPON_STAND_IN_SIZE,
    [OFF_HAND_PART]: WEAPON_STAND_IN_SIZE,
    [SHEATH_PART]: SHEATH_STAND_IN_SIZE
  },
  joints: [
    { name: "Root", parentPart: "HumanoidRootPart", childPart: "LowerTorso", parentOffset: [0, -1, 0], childOffset: [0, -0.2, 0] },
    { name: "Waist", parentPart: "LowerTorso", childPart: "UpperTorso", parentOffset: [0, 0.2, 0], childOffset: [0, -0.849, 0] },
    { name: "Neck", parentPart: "UpperTorso", childPart: "Head", parentOffset: [0, 0.849, 0], childOffset: [0, -0.576, 0] },
    { name: "LeftShoulder", parentPart: "UpperTorso", childPart: "LeftUpperArm", parentOffset: [-0.972, 0.598, 0], childOffset: [0.501, 0.419, 0] },
    { name: "LeftElbow", parentPart: "LeftUpperArm", childPart: "LeftLowerArm", parentOffset: [0, -0.355, 0], childOffset: [0, 0.275, 0] },
    { name: "LeftWrist", parentPart: "LeftLowerArm", childPart: "LeftHand", parentOffset: [0, -0.532, 0], childOffset: [0, 0.132, 0] },
    { name: "RightShoulder", parentPart: "UpperTorso", childPart: "RightUpperArm", parentOffset: [0.972, 0.598, 0], childOffset: [-0.501, 0.419, 0] },
    { name: "RightElbow", parentPart: "RightUpperArm", childPart: "RightLowerArm", parentOffset: [0, -0.355, 0], childOffset: [0, 0.275, 0] },
    { name: "RightWrist", parentPart: "RightLowerArm", childPart: "RightHand", parentOffset: [0, -0.532, 0], childOffset: [0, 0.132, 0] },
    { name: "LeftHip", parentPart: "LowerTorso", childPart: "LeftUpperLeg", parentOffset: [-0.5, -0.2, 0], childOffset: [0, 0.471, 0] },
    { name: "LeftKnee", parentPart: "LeftUpperLeg", childPart: "LeftLowerLeg", parentOffset: [0, -0.449, 0], childOffset: [0, 0.413, 0] },
    { name: "LeftAnkle", parentPart: "LeftLowerLeg", childPart: "LeftFoot", parentOffset: [0, -0.596, 0], childOffset: [0, 0.106, 0] },
    { name: "RightHip", parentPart: "LowerTorso", childPart: "RightUpperLeg", parentOffset: [0.5, -0.2, 0], childOffset: [0, 0.471, 0] },
    { name: "RightKnee", parentPart: "RightUpperLeg", childPart: "RightLowerLeg", parentOffset: [0, -0.449, 0], childOffset: [0, 0.413, 0] },
    { name: "RightAnkle", parentPart: "RightLowerLeg", childPart: "RightFoot", parentOffset: [0, -0.596, 0], childOffset: [0, 0.106, 0] },
    // The grips' position as tests/animation-tool.mjs measured it on the
    // default dummy (0, -0.158, 0). Only the preview's drawing depends on it:
    // the game takes the attachment's, and playback is compared joint by joint.
    { name: "Weapon", parentPart: "RightHand", childPart: WEAPON_PART, parentOffset: [0, -0.158, 0], childOffset: [0, 0, 0], parentRotation: GRIP_ROTATION, optional: true, attachment: "RightGripAttachment" },
    { name: "OffHand", parentPart: "LeftHand", childPart: OFF_HAND_PART, parentOffset: [0, -0.158, 0], childOffset: [0, 0, 0], parentRotation: GRIP_ROTATION, optional: true, attachment: "LeftGripAttachment" },
    { name: "Sheath", parentPart: "LowerTorso", childPart: SHEATH_PART, parentOffset: [-1, 0, 0], childOffset: [0, 0, 0], parentRotation: SHEATH_ROTATION, optional: true }
  ]
};

// upstream/packages/core/src/animation/motion.ts
var IDENTITY_FRAME = { p: [0, 0, 0], r: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
function frameFromComponents(c) {
  return { p: [c[0], c[1], c[2]], r: [c[3], c[4], c[5], c[6], c[7], c[8], c[9], c[10], c[11]] };
}
function translation(v) {
  return { p: [v[0], v[1], v[2]], r: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
}
function multiply(a, b) {
  const r = a.r, s = b.r;
  return {
    p: [
      a.p[0] + r[0] * b.p[0] + r[1] * b.p[1] + r[2] * b.p[2],
      a.p[1] + r[3] * b.p[0] + r[4] * b.p[1] + r[5] * b.p[2],
      a.p[2] + r[6] * b.p[0] + r[7] * b.p[1] + r[8] * b.p[2]
    ],
    r: [
      r[0] * s[0] + r[1] * s[3] + r[2] * s[6],
      r[0] * s[1] + r[1] * s[4] + r[2] * s[7],
      r[0] * s[2] + r[1] * s[5] + r[2] * s[8],
      r[3] * s[0] + r[4] * s[3] + r[5] * s[6],
      r[3] * s[1] + r[4] * s[4] + r[5] * s[7],
      r[3] * s[2] + r[4] * s[5] + r[5] * s[8],
      r[6] * s[0] + r[7] * s[3] + r[8] * s[6],
      r[6] * s[1] + r[7] * s[4] + r[8] * s[7],
      r[6] * s[2] + r[7] * s[5] + r[8] * s[8]
    ]
  };
}
function rotationFrame(r) {
  return { p: [0, 0, 0], r: [...r] };
}
function transpose(r) {
  return [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
}
function jointParentFrame(joint) {
  return { p: [...joint.parentOffset], r: [...joint.parentRotation ?? IDENTITY_ROTATION] };
}
function jointChildFrameInverse(joint) {
  const inverse = transpose(joint.childRotation ?? IDENTITY_ROTATION);
  return multiply(rotationFrame(inverse), translation([-joint.childOffset[0], -joint.childOffset[1], -joint.childOffset[2]]));
}
function transformInBody(joint, transform) {
  const turn = jointAxes(joint);
  if (!turn) return transform;
  const frame = rotationFrame(turn);
  return multiply(multiply(frame, transform), rotationFrame(transpose(turn)));
}
function transformFromBody(joint, inBody) {
  const turn = jointAxes(joint);
  if (!turn) return inBody;
  return multiply(multiply(rotationFrame(transpose(turn)), inBody), rotationFrame(turn));
}
function pointToWorld(frame, v) {
  return multiply(frame, translation(v)).p;
}
function rotationDegrees(r) {
  const cos = Math.min(1, Math.max(-1, (r[0] + r[4] + r[8] - 1) / 2));
  return Math.acos(cos) * 180 / Math.PI;
}
function degreesBetween(a, b) {
  const trace = a[0] * b[0] + a[3] * b[3] + a[6] * b[6] + a[1] * b[1] + a[4] * b[4] + a[7] * b[7] + a[2] * b[2] + a[5] * b[5] + a[8] * b[8];
  const cos = Math.min(1, Math.max(-1, (trace - 1) / 2));
  return Math.acos(cos) * 180 / Math.PI;
}
function quatFromMatrix(r) {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = r;
  const trace = m00 + m11 + m22;
  let q;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    q = [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4];
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    q = [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s];
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    q = [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s];
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    q = [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s];
  }
  const length2 = Math.hypot(...q);
  return q.map((value) => value / length2);
}
function matrixFromQuat([x, y, z, w]) {
  return [
    1 - 2 * (y * y + z * z),
    2 * (x * y - z * w),
    2 * (x * z + y * w),
    2 * (x * y + z * w),
    1 - 2 * (x * x + z * z),
    2 * (y * z - x * w),
    2 * (x * z - y * w),
    2 * (y * z + x * w),
    1 - 2 * (x * x + y * y)
  ];
}
function nlerp(a, b, t) {
  const dot4 = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const end = dot4 < 0 ? b.map((value) => -value) : b;
  const mixed = a.map((value, index) => value + (end[index] - value) * t);
  const length2 = Math.hypot(...mixed);
  return mixed.map((value) => value / length2);
}
function slerp(a, b, t) {
  let dot4 = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let end = b;
  if (dot4 < 0) {
    dot4 = -dot4;
    end = [-b[0], -b[1], -b[2], -b[3]];
  }
  if (dot4 > 0.9995) return nlerp(a, end, t);
  const theta = Math.acos(dot4);
  const sin = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sin;
  const wb = Math.sin(t * theta) / sin;
  return a.map((value, index) => value * wa + end[index] * wb);
}
function slerpRotation(a, b, t) {
  return matrixFromQuat(slerp(quatFromMatrix(a), quatFromMatrix(b), t));
}
function buildTracks(sequence2) {
  const tracks = /* @__PURE__ */ new Map();
  const visit = (pose, time) => {
    if (pose.weight > 0) {
      if (!POSE_EASING_STYLES.includes(pose.easingStyle) || !POSE_EASING_DIRECTIONS.includes(pose.easingDirection)) {
        throw new Error(`${pose.part} at ${time} s has an unknown easing: ${pose.easingStyle} ${pose.easingDirection}`);
      }
      if (pose.cframe.length !== 12 || !pose.cframe.every(Number.isFinite)) {
        throw new Error(`${pose.part} at ${time} s has a malformed CFrame`);
      }
      const frame = frameFromComponents(pose.cframe);
      const keys = tracks.get(pose.part) ?? [];
      keys.push({
        time,
        q: quatFromMatrix(frame.r),
        p: frame.p,
        style: pose.easingStyle,
        direction: pose.easingDirection
      });
      tracks.set(pose.part, keys);
    }
    for (const child of pose.children) visit(child, time);
  };
  for (const keyframe of sequence2.keyframes) visit(keyframe.root, keyframe.time);
  for (const keys of tracks.values()) keys.sort((a, b) => a.time - b.time);
  return tracks;
}
function sampleTrack(keys, t) {
  if (!keys || keys.length === 0) return IDENTITY_FRAME;
  let index = keys.length - 1;
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i].time > t) {
      index = i - 1;
      break;
    }
  }
  if (index < 0) return { p: [...keys[0].p], r: matrixFromQuat(keys[0].q) };
  const from = keys[index];
  const to = keys[index + 1];
  if (!to) return { p: [...from.p], r: matrixFromQuat(from.q) };
  const alpha = easeAlpha(from.style, from.direction, (t - from.time) / (to.time - from.time));
  return {
    p: [0, 1, 2].map((axis) => from.p[axis] + (to.p[axis] - from.p[axis]) * alpha),
    r: matrixFromQuat(slerp(from.q, to.q, alpha))
  };
}
function poseRig(tracks, t, rig2 = R15_RIG) {
  const transforms = /* @__PURE__ */ new Map();
  const parts = /* @__PURE__ */ new Map([[rig2.rootPart, IDENTITY_FRAME]]);
  for (const joint of rig2.joints) {
    const transform = sampleTrack(tracks.get(joint.childPart), t);
    transforms.set(joint.name, transform);
    const parent = parts.get(joint.parentPart) ?? IDENTITY_FRAME;
    parts.set(
      joint.childPart,
      multiply(multiply(multiply(parent, jointParentFrame(joint)), transform), jointChildFrameInverse(joint))
    );
  }
  return { transforms, parts };
}
var restPoses = /* @__PURE__ */ new WeakMap();
function restPose(rig2) {
  let parts = restPoses.get(rig2);
  if (!parts) {
    parts = poseRig(/* @__PURE__ */ new Map(), 0, rig2).parts;
    restPoses.set(rig2, parts);
  }
  return parts;
}
function restTurn(rig2, part) {
  const r = restPose(rig2).get(part)?.r;
  return r && !r.every((value, index) => value === IDENTITY_ROTATION[index]) ? r : void 0;
}
function sequenceDuration(sequence2) {
  return sequence2.keyframes.reduce((latest, keyframe) => Math.max(latest, keyframe.time), 0);
}

// upstream/packages/core/src/animation/r6-rig.ts
var TORSO_FRAME = [-1, 0, 0, 0, 0, 1, 0, 1, 0];
var RIGHT_FRAME = [0, 0, 1, 0, 1, 0, -1, 0, 0];
var LEFT_FRAME = [0, 0, -1, 0, 1, 0, 1, 0, 0];
var R6_RIG = {
  name: "R6",
  rootPart: "HumanoidRootPart",
  rootJoint: "Root",
  hipHeight: 0,
  // The legs hang 2 studs below a torso centred on the HumanoidRootPart.
  ground: -3,
  feet: ["Left Leg", "Right Leg"],
  hips: ["LeftHip", "RightHip"],
  body: "Torso",
  // The far end of each block: the hand's end of an arm, the sole of a leg.
  limbs: {
    LeftShoulder: { end: [0, -1, 0], axis: HANGING, fold: ARM_FOLD },
    RightShoulder: { end: [0, -1, 0], axis: HANGING, fold: ARM_FOLD },
    LeftHip: { end: [0, -1, 0], axis: HANGING, fold: LEG_FOLD },
    RightHip: { end: [0, -1, 0], axis: HANGING, fold: LEG_FOLD }
  },
  hinges: {},
  // R15's limits for the joints R6 shares with it.
  limits: Object.fromEntries(["Root", "Neck", "LeftShoulder", "RightShoulder", "LeftHip", "RightHip", "Weapon", "OffHand", "Sheath"].map((joint) => [joint, R15_JOINT_LIMITS[joint]])),
  words: CHARACTER_WORDS,
  drawOffsets: PROP_DRAW_OFFSETS,
  // Rigid legs cannot roll a foot flat, and the foot-sliding limit was
  // calibrated on Roblox's R15 animations only.
  uncheckedChecks: {
    footSliding: "R6 legs are single blocks, and the foot-sliding limit is calibrated for R15 only"
  },
  parts: {
    HumanoidRootPart: [2, 2, 1],
    Torso: [2, 2, 1],
    Head: [2, 1, 1],
    "Left Arm": [1, 2, 1],
    "Right Arm": [1, 2, 1],
    "Left Leg": [1, 2, 1],
    "Right Leg": [1, 2, 1],
    [WEAPON_PART]: WEAPON_STAND_IN_SIZE,
    [OFF_HAND_PART]: WEAPON_STAND_IN_SIZE,
    [SHEATH_PART]: SHEATH_STAND_IN_SIZE
  },
  joints: [
    { name: "Root", parentPart: "HumanoidRootPart", childPart: "Torso", parentOffset: [0, 0, 0], childOffset: [0, 0, 0], parentRotation: TORSO_FRAME, childRotation: TORSO_FRAME },
    { name: "Neck", parentPart: "Torso", childPart: "Head", parentOffset: [0, 1, 0], childOffset: [0, -0.5, 0], parentRotation: TORSO_FRAME, childRotation: TORSO_FRAME },
    { name: "LeftShoulder", parentPart: "Torso", childPart: "Left Arm", parentOffset: [-1, 0.5, 0], childOffset: [0.5, 0.5, 0], parentRotation: LEFT_FRAME, childRotation: LEFT_FRAME },
    { name: "RightShoulder", parentPart: "Torso", childPart: "Right Arm", parentOffset: [1, 0.5, 0], childOffset: [-0.5, 0.5, 0], parentRotation: RIGHT_FRAME, childRotation: RIGHT_FRAME },
    { name: "LeftHip", parentPart: "Torso", childPart: "Left Leg", parentOffset: [-1, -1, 0], childOffset: [-0.5, 1, 0], parentRotation: LEFT_FRAME, childRotation: LEFT_FRAME },
    { name: "RightHip", parentPart: "Torso", childPart: "Right Leg", parentOffset: [1, -1, 0], childOffset: [0.5, 1, 0], parentRotation: RIGHT_FRAME, childRotation: RIGHT_FRAME },
    { name: "Weapon", parentPart: "Right Arm", childPart: WEAPON_PART, parentOffset: [0, -1, 0], childOffset: [0, 0, 0], parentRotation: GRIP_ROTATION, optional: true, attachment: "RightGripAttachment" },
    { name: "OffHand", parentPart: "Left Arm", childPart: OFF_HAND_PART, parentOffset: [0, -1, 0], childOffset: [0, 0, 0], parentRotation: GRIP_ROTATION, optional: true, attachment: "LeftGripAttachment" },
    // At the belt: the torso's bottom edge on its left side.
    { name: "Sheath", parentPart: "Torso", childPart: SHEATH_PART, parentOffset: [-1, -0.8, 0], childOffset: [0, 0, 0], parentRotation: SHEATH_ROTATION, optional: true }
  ]
};

// upstream/packages/core/src/animation/rigs.ts
var RIGS = /* @__PURE__ */ new Map([["R15", R15_RIG], ["R6", R6_RIG]]);
function rigFor(name) {
  const rig2 = RIGS.get(name);
  if (!rig2) throw new Error(`unknown rig ${name}`);
  return rig2;
}

// upstream/packages/core/src/animation/limb-reach.ts
var MAX_EXTENSION = 120;
var MIN_SLACK = 2e-3;
var length3 = (a) => Math.hypot(a[0], a[1], a[2]);
function hingeTurn(axis, degrees) {
  const radians = degrees * Math.PI / 180;
  const c = Math.cos(radians), s = Math.sin(radians);
  if (axis === "Y") return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  if (axis === "Z") return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
  return [[1, 0, 0], [0, c, -s], [0, s, c]];
}
function applyRows(rows, v) {
  return [0, 1, 2].map((row) => rows[row][0] * v[0] + rows[row][1] * v[1] + rows[row][2] * v[2]);
}
function turned(rest, v) {
  return rest ? applyRows([[rest[0], rest[1], rest[2]], [rest[3], rest[4], rest[5]], [rest[6], rest[7], rest[8]]], v) : v;
}
function limbEndAt(rig2, joint, end) {
  const limb = rig2.limbs[joint.name];
  const hinge = limb.hinge ? rig2.joints.find((candidate) => candidate.name === limb.hinge) : void 0;
  const bending = limb.hinge ? rig2.hinges[limb.hinge] : void 0;
  const pivotInLimb = joint.childOffset;
  const upperRest = restTurn(rig2, joint.childPart);
  if (!hinge || !bending) {
    const whole = turned(upperRest, [0, 1, 2].map((axis) => end[axis] - pivotInLimb[axis]));
    return () => whole;
  }
  const upper = turned(upperRest, [0, 1, 2].map((axis) => hinge.parentOffset[axis] - pivotInLimb[axis]));
  const lower = turned(restTurn(rig2, hinge.childPart), [0, 1, 2].map((axis) => end[axis] - hinge.childOffset[axis]));
  return (bend) => {
    const swung = applyRows(hingeTurn(bending.axis, bending.flex * bend), lower);
    return [upper[0] + swung[0], upper[1] + swung[1], upper[2] + swung[2]];
  };
}
function straightest(rig2, endAt) {
  const rest = length3(endAt(0));
  if (RIGS.get(rig2.name) === rig2) return { bend: 0, length: rest };
  let best = { bend: 0, length: rest };
  for (let bend2 = -1; bend2 >= -MAX_EXTENSION; bend2 -= 1) {
    const length4 = length3(endAt(bend2));
    if (length4 > best.length) best = { bend: bend2, length: length4 };
  }
  let [low, high] = [Math.max(best.bend - 1, -MAX_EXTENSION), Math.min(best.bend + 1, 0)];
  for (let step = 0; step < 40; step += 1) {
    const [a, b] = [low + (high - low) / 3, high - (high - low) / 3];
    if (length3(endAt(a)) < length3(endAt(b))) low = a;
    else high = b;
  }
  const bend = (low + high) / 2;
  const length2 = length3(endAt(bend));
  return length2 > rest * (1 + MIN_SLACK) ? { bend, length: length2 } : { bend: 0, length: rest };
}
function limbReach(rig2, jointName) {
  const joint = rig2.joints.find((candidate) => candidate.name === jointName);
  return straightest(rig2, limbEndAt(rig2, joint, rig2.limbs[jointName].end));
}

// upstream/packages/core/src/animation/gait.ts
var GAIT_PATTERNS = ["walk", "trot", "pace", "bound", "gallop"];
var GAIT_LIMITS = {
  /** How often every leg is placed again, in seconds. */
  stepSeconds: 1 / 30,
  maxStrideStuds: 20,
  /** The share of a straight leg's length it may be asked to reach. */
  reach: 0.985,
  /** The share of its legs' height the body may sink to reach a stride. */
  maxDrop: 0.5,
  /** The share of the cycle a foot is down, by pattern, unless `duty` says. */
  duty: { walk: 0.65, trot: 0.5, pace: 0.5, bound: 0.4, gallop: 0.35 },
  /** A foot's lift and the body's bob, as shares of the legs' height, unless given. */
  lift: 0.18,
  bob: 0.03
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var round = (value, places = 4) => {
  const scale2 = 10 ** places;
  const rounded = Math.round(value * scale2) / scale2;
  return rounded === 0 ? 0 : rounded;
};
function patternPhases(pattern, legs) {
  const side = legs.map((leg) => leg.end[0] > 1e-3 ? 1 : 0);
  const rank = legs.map((leg, index) => legs.filter((other, at) => side[at] === side[index] && other.end[2] < leg.end[2] - 1e-3).length);
  const pairs = Math.max(...rank) + 1;
  return legs.map((_leg, index) => {
    const fromBack = pairs - 1 - rank[index];
    const bound = pairs > 1 ? 0.5 * fromBack / (pairs - 1) : 0;
    switch (pattern) {
      case "walk":
        return side[index] * 0.5 + fromBack / (2 * pairs);
      case "trot":
        return (rank[index] + side[index]) % 2 * 0.5;
      case "pace":
        return side[index] * 0.5;
      case "bound":
        return bound;
      default:
        return bound + side[index] * 0.1;
    }
  });
}
function parseGait(value, rig2, fail) {
  const fields = ["pattern", "stride", "lift", "duty", "bob", "crouch", "phases", "limbs"];
  if (!isRecord(value)) {
    fail("gait", `must be { ${fields.map((field, index) => index < 2 ? field : `${field}?`).join(", ")} }`);
    return void 0;
  }
  let ok = true;
  const add = (path, message) => {
    ok = false;
    fail(path, message);
  };
  for (const key of Object.keys(value)) {
    if (!fields.includes(key)) add("gait", `unknown field "${key}"; expected ${fields.join(", ")}`);
  }
  const pattern = GAIT_PATTERNS.includes(value.pattern) ? value.pattern : void 0;
  if (!pattern) add("gait.pattern", `must be one of ${GAIT_PATTERNS.join(", ")}`);
  const number = (key, low, high, what) => {
    const given = value[key];
    if (given === void 0) return void 0;
    if (typeof given !== "number" || !Number.isFinite(given) || given < low || given > high) {
      add(`gait.${key}`, `must be ${what}, ${low} to ${high}`);
      return void 0;
    }
    return given;
  };
  const stride = value.stride === void 0 ? void 0 : number("stride", -GAIT_LIMITS.maxStrideStuds, GAIT_LIMITS.maxStrideStuds, "studs");
  if (value.stride === void 0 || stride === 0) add("gait.stride", "must be the studs a foot travels on the ground each cycle, and not 0");
  const lift = number("lift", 0, 10, "studs");
  const duty = number("duty", 0.1, 0.9, "the share of the cycle a foot is down");
  const bob = number("bob", 0, 5, "studs");
  const crouch = number("crouch", 0, 10, "studs") ?? 0;
  const root = rig2.joints.find((joint) => joint.name === rig2.rootJoint);
  if (!root) add("gait", `needs one joint that moves the whole body, to set how high it rides; this rig's ${rig2.rootPart} holds several parts`);
  const jointNamed = (name) => rig2.joints.find((joint) => joint.name === name);
  const endPart = (name) => jointNamed(rig2.limbs[name].hinge)?.childPart ?? jointNamed(name).childPart;
  let names = Object.keys(rig2.limbs).filter((name) => {
    const foot = jointNamed(rig2.limbs[name].foot)?.childPart;
    return rig2.feet.includes(endPart(name)) || foot !== void 0 && rig2.feet.includes(foot);
  });
  if (value.limbs !== void 0) {
    if (!Array.isArray(value.limbs) || value.limbs.length === 0) {
      add("gait.limbs", "must list the limb joints that step");
    } else {
      const given = [];
      value.limbs.forEach((name, index) => {
        if (typeof name !== "string" || !rig2.limbs[name]) add(`gait.limbs[${index}]`, `is not a limb; the rig's limbs are ${Object.keys(rig2.limbs).join(", ") || "none"}`);
        else if (given.includes(name)) add(`gait.limbs[${index}]`, `"${name}" is listed twice`);
        else given.push(name);
      });
      names = given;
    }
  } else if (names.length === 0) {
    add("gait", Object.keys(rig2.limbs).length === 0 ? "needs legs, and this rig declares no limbs; declare them, or key the joints by hand" : "needs legs: limbs that end in one of the rig's feet; name them in gait.limbs, or declare the feet");
  }
  if (!ok || !pattern || stride === void 0 || !root) return void 0;
  const rest = restPose(rig2);
  const measured = rig2.joints.filter((joint) => names.includes(joint.name)).map((joint) => {
    const limb = rig2.limbs[joint.name];
    const end = pointToWorld(rest.get(endPart(joint.name)), limb.end);
    const pivot = pointToWorld(rest.get(joint.parentPart), joint.parentOffset);
    return { joint: joint.name, hinged: limb.hinge !== void 0, end, pivot, length: limbReach(rig2, joint.name).length };
  });
  const phases = patternPhases(pattern, measured);
  if (value.phases !== void 0) {
    if (!isRecord(value.phases)) {
      add("gait.phases", "must be an object of limb joint to the share of the cycle its foot comes down at");
    } else {
      for (const [name, phase] of Object.entries(value.phases)) {
        const index = measured.findIndex((leg) => leg.joint === name);
        if (index < 0) add(`gait.phases.${name}`, `is not one of the gait's legs: ${measured.map((leg) => leg.joint).join(", ")}`);
        else if (typeof phase !== "number" || !Number.isFinite(phase) || Math.abs(phase) > 100) add(`gait.phases.${name}`, "must be a share of the cycle");
        else phases[index] = phase;
      }
    }
  }
  const legs = measured.map((leg, index) => ({ ...leg, phase: phases[index] }));
  const half = Math.abs(stride) / 2;
  const height = Math.min(...legs.map((leg) => leg.pivot[1] - leg.end[1]));
  if (height <= 0) add("gait", "needs legs that hang below their hips at rest");
  let drop = 0;
  const limit = GAIT_LIMITS.maxDrop * height;
  let longest = Infinity;
  for (const leg of legs.filter((candidate) => candidate.hinged)) {
    const reach = GAIT_LIMITS.reach * leg.length;
    const sideways = leg.end[0] - leg.pivot[0];
    const ahead = Math.abs(leg.end[2] - leg.pivot[2]);
    const flat = reach ** 2 - sideways ** 2 - (ahead + half) ** 2;
    const tall = leg.pivot[1] - leg.end[1];
    drop = Math.max(drop, flat > 0 ? tall - Math.sqrt(flat) : Infinity);
    longest = Math.min(longest, 2 * (Math.sqrt(Math.max(0, reach ** 2 - (tall - limit) ** 2 - sideways ** 2)) - ahead));
  }
  if (ok && drop > limit) add("gait.stride", `${Math.abs(stride)} studs is further than its legs reach, even with the body riding low; at most ${Math.floor(Math.max(0, longest) * 100) / 100}`);
  if (!ok) return void 0;
  const share = duty ?? GAIT_LIMITS.duty[pattern];
  const rise = lift ?? round(GAIT_LIMITS.lift * height, 3);
  const dip = bob ?? (legs.some((leg) => leg.hinged) ? round(GAIT_LIMITS.bob * height, 3) : 0);
  const ride = (time, duration) => -(drop + crouch + dip * (1 - Math.cos(4 * Math.PI * (time / duration))) / 2);
  const owners = /* @__PURE__ */ new Map([[root.name, "the gait sets how high the body rides on this joint; do not key it by hand"]]);
  for (const leg of legs) {
    const limb = rig2.limbs[leg.joint];
    owners.set(leg.joint, "the gait steps this leg; do not key it by hand, or leave it out of gait.limbs");
    for (const name of [limb.hinge, limb.foot]) {
      if (name) owners.set(name, `the gait sets this joint to place ${leg.joint}'s foot; do not key it by hand`);
    }
  }
  return {
    name: "gait",
    joints: [root.name, ...legs.map((leg) => leg.joint)],
    owners,
    steps: (duration) => Math.max(2, Math.ceil(duration / GAIT_LIMITS.stepSeconds - 1e-9)),
    tooMany: "use a shorter duration",
    pose: (name, time, duration) => {
      const easing = { style: "Linear" };
      if (name === root.name) return { position: [0, round(ride(time, duration)), 0], easing };
      const leg = legs.find((candidate) => candidate.joint === name);
      const cycle = time / duration - leg.phase;
      const at = cycle - Math.floor(cycle);
      let forward;
      let up = 0;
      if (at < share) {
        forward = stride / 2 - stride * at / share;
      } else {
        const swing = (at - share) / (1 - share);
        forward = -stride / 2 + stride * (1 - Math.cos(Math.PI * swing)) / 2;
        up = rise * Math.sin(Math.PI * swing);
      }
      const target = [leg.end[0], leg.end[1] + up, -leg.end[2] + forward];
      if (leg.hinged) return { aimAt: target.map((value2) => round(value2)), easing };
      const hip = [leg.pivot[0], leg.pivot[1] + ride(time, duration), -leg.pivot[2]];
      return { aim: target.map((value2, axis) => round(value2 - hip[axis])), easing };
    }
  };
}

// upstream/packages/core/src/animation/wave.ts
var WAVE_LIMITS = {
  maxWaves: 16,
  /** Keys written for each cycle of the fastest wave; between them Studio turns the joint evenly. */
  samplesPerCycle: 12,
  maxAmplitudeDegrees: 180,
  maxCycles: 20
};
var AXES = ["X", "Y", "Z"];
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var finite = (value) => typeof value === "number" && Number.isFinite(value);
function parseSpan(value, limit, path, what, add) {
  const pair = finite(value) ? [value, value] : Array.isArray(value) && value.length === 2 && value.every(finite) ? value : void 0;
  if (!pair || pair.some((entry) => Math.abs(entry) > limit)) {
    add(path, `must be ${what} within \xB1${limit}, or [first, last] along the chain`);
    return void 0;
  }
  return [pair[0], pair[1]];
}
function parseWave(value, rig2, loop, path, add) {
  if (!isRecord2(value)) {
    add(path, "must be { joints, axis, amplitude, cycles?, lag?, offset?, phase? }");
    return void 0;
  }
  let ok = true;
  const fail = (at, message) => {
    ok = false;
    add(at, message);
  };
  const allowed = ["joints", "axis", "amplitude", "cycles", "lag", "offset", "phase"];
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(path, `unknown field "${key}"; expected ${allowed.join(", ")}`);
  }
  const joints = [];
  if (!Array.isArray(value.joints) || value.joints.length === 0) {
    fail(`${path}.joints`, "must list the chain's joints, from where the wave starts");
  } else {
    value.joints.forEach((name, index) => {
      if (typeof name !== "string" || !rig2.joints.some((joint) => joint.name === name)) {
        const byPart = rig2.joints.find((joint) => joint.childPart === name);
        fail(`${path}.joints[${index}]`, byPart ? `"${String(name)}" is a part; name the joint that moves it, "${byPart.name}"` : `unknown joint; the rig's joints are ${rig2.joints.map((joint) => joint.name).join(", ")}`);
      } else if (joints.includes(name)) {
        fail(`${path}.joints[${index}]`, `"${name}" is in the chain twice`);
      } else {
        joints.push(name);
      }
    });
  }
  const axis = AXES.indexOf(value.axis);
  if (axis < 0) fail(`${path}.axis`, "must be X, Y or Z: the body axis at rest the joints turn about");
  const amplitude = parseSpan(value.amplitude, WAVE_LIMITS.maxAmplitudeDegrees, `${path}.amplitude`, "degrees", add);
  const offset = value.offset === void 0 ? [0, 0] : parseSpan(value.offset, WAVE_LIMITS.maxAmplitudeDegrees, `${path}.offset`, "degrees", add);
  if (!amplitude || !offset) ok = false;
  let cycles = 1;
  if (value.cycles !== void 0) {
    if (!finite(value.cycles) || value.cycles <= 0 || value.cycles > WAVE_LIMITS.maxCycles) {
      fail(`${path}.cycles`, `must be more than 0 and at most ${WAVE_LIMITS.maxCycles}`);
    } else if (loop && !Number.isInteger(value.cycles)) {
      fail(`${path}.cycles`, "must be a whole number in a loop, so the wave meets itself at the seam");
    } else {
      cycles = value.cycles;
    }
  }
  const fraction = (key, limit) => {
    const given = value[key];
    if (given === void 0) return 0;
    if (!finite(given) || Math.abs(given) > limit) {
      fail(`${path}.${key}`, `must be cycles within \xB1${limit}`);
      return 0;
    }
    return given;
  };
  const lag = fraction("lag", 1);
  const phase = fraction("phase", 100);
  return ok && amplitude && offset ? { joints, axis, amplitude, cycles, lag, offset, phase } : void 0;
}
var round2 = (value, places) => {
  const scale2 = 10 ** places;
  const rounded = Math.round(value * scale2) / scale2;
  return rounded === 0 ? 0 : rounded;
};
function parseWaves(value, rig2, loop, fail) {
  const waves = [];
  let ok = true;
  const add = (path, message) => {
    ok = false;
    fail(path, message);
  };
  if (!Array.isArray(value) || value.length === 0 || value.length > WAVE_LIMITS.maxWaves) {
    add("waves", `must list 1 to ${WAVE_LIMITS.maxWaves} waves: { joints, axis, amplitude, cycles?, lag?, offset?, phase? }`);
    return void 0;
  }
  value.forEach((entry, index) => {
    const wave = parseWave(entry, rig2, loop, `waves[${index}]`, add);
    if (!wave) return;
    for (const name of wave.joints) {
      const other = waves.findIndex((earlier) => earlier.axis === wave.axis && earlier.joints.includes(name));
      if (other >= 0) add(`waves[${index}].joints`, `"${name}" already turns about ${AXES[wave.axis]} in waves[${other}]; two waves share a joint only about different axes`);
    }
    waves.push(wave);
  });
  if (!ok) return void 0;
  const owners = /* @__PURE__ */ new Map();
  waves.forEach((wave, index) => wave.joints.forEach((name) => {
    if (!owners.has(name)) owners.set(name, `waves[${index}] drives this joint; take it out of the wave or do not key it by hand`);
  }));
  return {
    name: "waves",
    joints: [...owners.keys()],
    owners,
    steps: () => Math.ceil(WAVE_LIMITS.samplesPerCycle * Math.max(...waves.map((wave) => wave.cycles))),
    tooMany: "use fewer cycles",
    pose: (name, time, duration) => {
      const rotation = [0, 0, 0];
      for (const wave of waves) {
        const index = wave.joints.indexOf(name);
        if (index < 0) continue;
        const along = wave.joints.length > 1 ? index / (wave.joints.length - 1) : 0;
        const amplitude = wave.amplitude[0] + (wave.amplitude[1] - wave.amplitude[0]) * along;
        const offset = wave.offset[0] + (wave.offset[1] - wave.offset[0]) * along;
        rotation[wave.axis] += offset + amplitude * Math.sin(2 * Math.PI * (wave.cycles * time / duration - wave.lag * index + wave.phase));
      }
      return { rotation: rotation.map((degrees) => round2(degrees, 3)), easing: { style: "Linear" } };
    }
  };
}

// upstream/packages/core/src/animation/generators.ts
var GENERATOR_SNAP_SECONDS = 1 / 240;
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var finite2 = (value) => typeof value === "number" && Number.isFinite(value);
function expandGenerators(input2, rig2, maxKeyframes, maxDurationSeconds, add) {
  let failed = false;
  const fail = (path, message) => {
    failed = true;
    add(path, message);
  };
  const given = input2.keyframes;
  if (input2.waves === void 0 && input2.gait === void 0) {
    fail("duration", "goes with waves or gait; without them the last keyframe's time is the animation's length");
    return { keyframes: given, failed };
  }
  const generators = [];
  if (input2.gait !== void 0) {
    const gait = parseGait(input2.gait, rig2, fail);
    if (gait) generators.push(gait);
  }
  if (input2.waves !== void 0) {
    const waves = parseWaves(input2.waves, rig2, input2.loop === true, fail);
    if (waves) {
      for (const name of waves.joints) {
        if (generators[0]?.owners.has(name)) fail("waves", `"${name}" is the gait's: ${generators[0].owners.get(name)}`);
      }
      generators.push(waves);
    }
  }
  if (given !== void 0 && !Array.isArray(given)) return { keyframes: given, failed };
  const hand = given ?? [];
  let lastTime = 0;
  hand.forEach((keyframe, index) => {
    if (!isRecord3(keyframe)) return;
    if (finite2(keyframe.time)) lastTime = Math.max(lastTime, keyframe.time);
    if (!isRecord3(keyframe.joints)) return;
    for (const name of Object.keys(keyframe.joints)) {
      const why = generators.map((generator) => generator.owners.get(name)).find((owner) => owner !== void 0);
      if (why !== void 0) fail(`keyframes[${index}].joints.${name}`, why);
    }
  });
  const what = [input2.waves !== void 0 ? "waves" : void 0, input2.gait !== void 0 ? "a gait" : void 0].filter(Boolean).join(" and ");
  let duration = lastTime;
  if (input2.duration !== void 0) {
    if (!finite2(input2.duration) || input2.duration <= 0 || input2.duration > maxDurationSeconds) {
      fail("duration", `must be seconds, more than 0 and at most ${maxDurationSeconds}`);
    } else if (input2.duration < lastTime) {
      fail("duration", `must not be before the last keyframe (${lastTime})`);
    } else {
      duration = input2.duration;
    }
  } else if (lastTime <= 0) {
    fail("duration", `${what} ${what === "a gait" ? "needs" : "need"} the animation's length: give duration in seconds, or a last keyframe`);
  }
  if (failed) return { keyframes: given, failed };
  const keyframes = hand.map((keyframe) => isRecord3(keyframe) ? { ...keyframe, joints: isRecord3(keyframe.joints) ? { ...keyframe.joints } : keyframe.joints } : keyframe);
  const round5 = (value) => Math.round(value * 1e6) / 1e6;
  const written = [];
  for (const generator of generators) {
    const steps = generator.steps(duration);
    const sampled = [];
    for (let step = 0; step <= steps; step += 1) {
      const time = step === steps ? duration : round5(duration * step / steps);
      let keyframe = keyframes.find((candidate) => isRecord3(candidate) && finite2(candidate.time) && Math.abs(candidate.time - time) <= GENERATOR_SNAP_SECONDS);
      if (!keyframe) {
        keyframe = { time, joints: {} };
        keyframes.push(keyframe);
      }
      if (!sampled.includes(keyframe)) sampled.push(keyframe);
    }
    if (keyframes.length > maxKeyframes) {
      fail(generator.name, `${generator.name === "gait" ? "its" : "their"} keys make ${keyframes.length} keyframes, over the ${maxKeyframes} an animation may have; ${generator.tooMany}`);
      return { keyframes: given, failed };
    }
    written.push({ generator, keyframes: sampled });
  }
  for (const { generator, keyframes: sampled } of written) {
    for (const keyframe of sampled) {
      if (!isRecord3(keyframe.joints)) continue;
      const time = input2.loop === true && keyframe.time === duration ? 0 : keyframe.time;
      for (const name of generator.joints) keyframe.joints[name] = generator.pose(name, time, duration);
    }
  }
  keyframes.sort((a, b) => isRecord3(a) && isRecord3(b) && finite2(a.time) && finite2(b.time) ? a.time - b.time : 0);
  return { keyframes, failed };
}

// upstream/packages/core/src/animation/pose-compiler.ts
var ANIMATION_PRIORITIES = ["Core", "Idle", "Movement", "Action", "Action2", "Action3", "Action4"];
var POSE_LIMITS = {
  maxKeyframes: 240,
  maxDurationSeconds: 60,
  maxNameLength: 100,
  maxRotationDegrees: 360,
  maxRootOffsetStuds: 20,
  /** How far from the root part an aimAt target may be, in studs. */
  maxAimAtStuds: 20,
  /** How far past a limb's reach an aimAt target may lie and still be reached. */
  aimAtToleranceStuds: 0.02,
  /** How far along the handle grip may hold, in studs either way. */
  maxGripStuds: 3,
  /** The widest bend aimAt gives an elbow or knee, in degrees. */
  maxAimAtBend: 150,
  /** How often a planted limb is solved again between its keys, in seconds. */
  plantedStepSeconds: 1 / 30,
  /** How often a grip is solved again between its keys: a swung handle moves fast. */
  gripStepSeconds: 1 / 60,
  maxMarkersPerKeyframe: 16,
  maxMarkerValueLength: 200,
  /** How far a joint's pivot may stand from where an animation's `skeleton` has it: studs, or a share of its offset. */
  skeletonToleranceStuds: 0.05,
  skeletonToleranceShare: 0.03,
  /**
   * Degrees a joint may turn between consecutive keys, unless the earlier key
   * snaps (Constant). Past 90° Studio's playback of Linear keys drifts from a
   * slerp, so a longer turn is split into in-between keys (see splitTurns).
   */
  maxTurnPerSegment: 90,
  /**
   * A turn this large or larger is never split: near half a turn the short
   * way round is as likely to be wrong as right, so the caller must say which
   * way with a key along it.
   */
  maxSplitTurn: 175,
  /** Degrees each in-between of an eased turn covers, so the easing's shape survives. */
  easedSplitDegrees: 30,
  maxErrors: 20
};
var IDENTITY_MATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1];
function eulerMatrix(degrees) {
  const [x, y, z] = degrees.map((value) => value * Math.PI / 180);
  const cx = Math.cos(x), sx = Math.sin(x);
  const cy = Math.cos(y), sy = Math.sin(y);
  const cz = Math.cos(z), sz = Math.sin(z);
  return [
    cy * cz,
    -cy * sz,
    sy,
    sx * sy * cz + cx * sz,
    -sx * sy * sz + cx * cz,
    -sx * cy,
    -cx * sy * cz + sx * sz,
    cx * sy * sz + sx * cz,
    cx * cy
  ];
}
var dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
var length32 = (a) => Math.hypot(a[0], a[1], a[2]);
function robloxDirection(value) {
  return [value[0], value[1], -value[2]];
}
function limbWords(rig2) {
  if (rig2.words) return rig2.words.limbs;
  const names = Object.keys(rig2.limbs);
  return names.length > 0 ? `the limbs this rig declares, ${names.join(", ")}` : "declared limbs, and this rig declares none";
}
function hingeWords(rig2) {
  if (rig2.words) return rig2.words.hinges;
  const names = Object.keys(rig2.hinges);
  return names.length > 0 ? `the hinges this rig declares, ${names.join(", ")}` : "declared hinges, and this rig declares none";
}
function hingeMatrix(hinge, degrees) {
  const turn = hinge.flex * degrees;
  return eulerMatrix(hinge.axis === "X" ? [turn, 0, 0] : hinge.axis === "Y" ? [0, turn, 0] : [0, 0, turn]);
}
function aimRotation(limb, aim, bendToward) {
  const d = scale3(robloxDirection(aim), 1 / length32(robloxDirection(aim)));
  const candidates = [
    ...bendToward ? [robloxDirection(bendToward)] : [],
    [...limb.fold],
    [0, 1, 0],
    [0, 0, 1]
  ];
  let fold = [0, 0, 0];
  for (const candidate of candidates) {
    const square = [0, 1, 2].map((axis) => candidate[axis] - dot3(candidate, d) * d[axis]);
    if (length32(square) > 1e-3 * Math.max(1, length32(candidate))) {
      fold = scale3(square, 1 / length32(square));
      break;
    }
  }
  const long = [...limb.axis];
  const folds = [...limb.fold];
  const local = [long, folds, cross3(long, folds)];
  const target = [d, fold, cross3(d, fold)];
  const matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 3; k += 1) {
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) matrix[i * 3 + j] += target[k][i] * local[k][j];
    }
  }
  return matrix;
}
var Issues = class {
  list = [];
  dropped = 0;
  add(path, message) {
    if (this.list.length < POSE_LIMITS.maxErrors) this.list.push(`${path}: ${message}`);
    else this.dropped += 1;
  }
  get count() {
    return this.list.length + this.dropped;
  }
  report() {
    return this.dropped > 0 ? [...this.list, `...and ${this.dropped} more`] : [...this.list];
  }
};
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function checkKeys(value, allowed, path, issues) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) issues.add(path, `unknown field "${key}"; expected ${allowed.join(", ")}`);
  }
}
function parseName(value, path, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    issues.add(path, "must be a non-empty string");
    return void 0;
  }
  if (value.length > POSE_LIMITS.maxNameLength) {
    issues.add(path, `must be at most ${POSE_LIMITS.maxNameLength} characters`);
    return void 0;
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    issues.add(path, "must not contain control characters");
    return void 0;
  }
  return value;
}
function parseEnum(value, allowed, path, issues) {
  if (typeof value === "string" && allowed.includes(value)) return value;
  issues.add(path, `must be one of ${allowed.join(", ")}`);
  return void 0;
}
function parseEasing(value, path, issues) {
  if (value === void 0) return {};
  if (!isRecord4(value)) {
    issues.add(path, "must be an object with style and/or direction");
    return {};
  }
  checkKeys(value, ["style", "direction"], path, issues);
  return {
    style: value.style === void 0 ? void 0 : parseEnum(value.style, POSE_EASING_STYLES, `${path}.style`, issues),
    direction: value.direction === void 0 ? void 0 : parseEnum(value.direction, POSE_EASING_DIRECTIONS, `${path}.direction`, issues)
  };
}
function parseVector(value, limit, unit, path, issues) {
  if (!Array.isArray(value) || value.length !== 3) {
    issues.add(path, `must be [x, y, z] in ${unit}`);
    return [0, 0, 0];
  }
  value.forEach((component, index) => {
    if (typeof component !== "number" || !Number.isFinite(component)) {
      issues.add(`${path}[${index}]`, "must be a finite number");
    } else if (Math.abs(component) > limit) {
      issues.add(`${path}[${index}]`, `must be within \xB1${limit} ${unit}`);
    }
  });
  return value.every((component) => typeof component === "number" && Number.isFinite(component)) ? [value[0], value[1], value[2]] : [0, 0, 0];
}
function parseMarkers(value, path, issues) {
  if (value === void 0) return [];
  if (!Array.isArray(value)) {
    issues.add(path, "must be an array of { name, value? }");
    return [];
  }
  if (value.length > POSE_LIMITS.maxMarkersPerKeyframe) {
    issues.add(path, `must hold at most ${POSE_LIMITS.maxMarkersPerKeyframe} markers`);
    return [];
  }
  const markers = [];
  value.forEach((entry, index) => {
    const markerPath = `${path}[${index}]`;
    if (!isRecord4(entry)) {
      issues.add(markerPath, "must be an object with name and optional value");
      return;
    }
    checkKeys(entry, ["name", "value"], markerPath, issues);
    const name = parseName(entry.name, `${markerPath}.name`, issues);
    let text = "";
    if (entry.value !== void 0) {
      if (typeof entry.value !== "string") {
        issues.add(`${markerPath}.value`, "must be a string");
      } else if (entry.value.length > POSE_LIMITS.maxMarkerValueLength) {
        issues.add(`${markerPath}.value`, `must be at most ${POSE_LIMITS.maxMarkerValueLength} characters`);
      } else {
        text = entry.value;
      }
    }
    if (name !== void 0) markers.push({ name, value: text });
  });
  return markers;
}
function parseJoints(value, rig2, path, issues, allowEmpty) {
  const joints = /* @__PURE__ */ new Map();
  if (!isRecord4(value)) {
    issues.add(path, "must be an object of joint name to pose");
    return joints;
  }
  const names = Object.keys(value);
  if (names.length === 0 && !allowEmpty) issues.add(path, "must key at least one joint, or carry markers");
  for (const name of names) {
    const jointPath = `${path}.${name}`;
    const joint = rig2.joints.find((candidate) => candidate.name === name);
    if (!joint) {
      const byPart = rig2.joints.find((candidate) => candidate.childPart === name);
      issues.add(jointPath, byPart ? `"${name}" is a part; key the joint that moves it, "${byPart.name}"` : rig2.name === "R6" && R15_RIG.joints.some((candidate) => candidate.name === name) ? `R6 has no ${name}: its arms and legs are single blocks, and it has no waist; its joints are ${rig2.joints.map((candidate) => candidate.name).join(", ")}` : `unknown joint; the rig's joints are ${rig2.joints.map((candidate) => candidate.name).join(", ")}`);
      continue;
    }
    const pose = value[name];
    if (!isRecord4(pose)) {
      issues.add(jointPath, "must be an object with rotation, aim, bend, position and/or easing");
      continue;
    }
    checkKeys(pose, ["rotation", "aim", "aimAt", "grip", "bendToward", "bend", "position", "easing"], jointPath, issues);
    const forms = ["rotation", "aim", "aimAt", "grip", "bend"].filter((key) => pose[key] !== void 0);
    if (forms.length > 1) issues.add(jointPath, `give one of rotation, aim, aimAt, grip or bend, not ${forms.join(" and ")}`);
    let aimAt;
    let grip;
    let rotation = IDENTITY_MATRIX;
    if (pose.rotation !== void 0) {
      rotation = eulerMatrix(parseVector(pose.rotation, POSE_LIMITS.maxRotationDegrees, "degrees", `${jointPath}.rotation`, issues));
    }
    if (pose.grip !== void 0) {
      const toward = pose.bendToward === void 0 ? void 0 : parseVector(pose.bendToward, 1e6, "units", `${jointPath}.bendToward`, issues);
      if (joint.name !== "LeftShoulder" || !rig2.joints.some((candidate) => candidate.name === "Weapon")) {
        issues.add(jointPath, "grip works on LeftShoulder, holding the weapon two-handed; use aimAt or rotation here");
      } else if (typeof pose.grip !== "number" || !Number.isFinite(pose.grip) || Math.abs(pose.grip) > POSE_LIMITS.maxGripStuds) {
        issues.add(`${jointPath}.grip`, `must be studs along the handle from the right hand, within \xB1${POSE_LIMITS.maxGripStuds}`);
      } else if (toward !== void 0 && length32(toward) < 1e-6) {
        issues.add(`${jointPath}.bendToward`, "must point somewhere: [right, up, forward], not all zero");
      } else {
        grip = { along: pose.grip, ...toward ? { toward: robloxDirection(toward) } : {}, path: `${jointPath}.grip` };
      }
    } else if (pose.aimAt !== void 0) {
      if (!rig2.limbs[joint.name]) {
        issues.add(jointPath, `aimAt works on ${limbWords(rig2)}; use rotation here`);
      } else {
        const target = parseVector(pose.aimAt, POSE_LIMITS.maxAimAtStuds, "studs", `${jointPath}.aimAt`, issues);
        const toward = pose.bendToward === void 0 ? void 0 : parseVector(pose.bendToward, 1e6, "units", `${jointPath}.bendToward`, issues);
        if (toward !== void 0 && length32(toward) < 1e-6) issues.add(`${jointPath}.bendToward`, "must point somewhere: [right, up, forward], not all zero");
        else aimAt = { target: robloxDirection(target), ...toward ? { toward: robloxDirection(toward) } : {}, path: `${jointPath}.aimAt` };
      }
    } else if (pose.aim !== void 0 || pose.bendToward !== void 0) {
      const limb = rig2.limbs[joint.name];
      if (!limb) {
        issues.add(jointPath, `aim and bendToward work on ${limbWords(rig2)}; use rotation here`);
      } else if (pose.aim === void 0) {
        issues.add(`${jointPath}.bendToward`, "goes with aim, aimAt or grip");
      } else {
        const aim = parseVector(pose.aim, 1e6, "units", `${jointPath}.aim`, issues);
        const toward = pose.bendToward === void 0 ? void 0 : parseVector(pose.bendToward, 1e6, "units", `${jointPath}.bendToward`, issues);
        if (length32(aim) < 1e-6) issues.add(`${jointPath}.aim`, "must point somewhere: [right, up, forward], not all zero");
        else if (toward !== void 0 && length32(toward) < 1e-6) issues.add(`${jointPath}.bendToward`, "must point somewhere: [right, up, forward], not all zero");
        else rotation = aimRotation(limb, aim, toward);
      }
    }
    if (pose.bend !== void 0) {
      const hinge = rig2.hinges[joint.name];
      if (!hinge) {
        issues.add(`${jointPath}.bend`, `works on ${hingeWords(rig2)}; use rotation here`);
      } else if (typeof pose.bend !== "number" || !Number.isFinite(pose.bend) || Math.abs(pose.bend) > POSE_LIMITS.maxRotationDegrees) {
        issues.add(`${jointPath}.bend`, `must be degrees within \xB1${POSE_LIMITS.maxRotationDegrees}; 0 is straight`);
      } else {
        rotation = hingeMatrix(hinge, pose.bend);
      }
    }
    let position = [0, 0, 0];
    if (pose.position !== void 0) {
      if (joint.name === rig2.rootJoint) {
        position = parseVector(pose.position, POSE_LIMITS.maxRootOffsetStuds, "studs", `${jointPath}.position`, issues);
      } else {
        issues.add(`${jointPath}.position`, rig2.rootJoint ? `only ${rig2.rootJoint} takes a position; other joints only rotate` : `no one joint moves this rig's whole body (its ${rig2.rootPart} holds several), so none takes a position; joints only rotate`);
      }
    }
    const transform = transformFromBody(joint, { p: [...position], r: [...rotation] });
    joints.set(joint.childPart, {
      joint,
      rotation: transform.r,
      position: transform.p,
      easing: parseEasing(pose.easing, `${jointPath}.easing`, issues),
      ...aimAt ? { aimAt } : {},
      ...grip ? { grip } : {}
    });
  }
  return joints;
}
function parseKeyframes(value, rig2, issues) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.add("keyframes", "must be a non-empty array");
    return [];
  }
  if (value.length > POSE_LIMITS.maxKeyframes) {
    issues.add("keyframes", `must have at most ${POSE_LIMITS.maxKeyframes} keyframes`);
    return [];
  }
  const keyframes = [];
  let previousTime;
  value.forEach((entry, index) => {
    const path = `keyframes[${index}]`;
    if (!isRecord4(entry)) {
      issues.add(path, "must be an object with time and joints");
      return;
    }
    checkKeys(entry, ["time", "name", "easing", "joints", "markers"], path, issues);
    const time = entry.time;
    if (typeof time !== "number" || !Number.isFinite(time) || time < 0) {
      issues.add(`${path}.time`, "must be a finite number of seconds, 0 or more");
    } else {
      if (index === 0 && time !== 0) issues.add(`${path}.time`, "the first keyframe must be at time 0");
      if (previousTime !== void 0 && time <= previousTime) {
        issues.add(`${path}.time`, `must be later than the previous keyframe (${previousTime})`);
      }
      if (time > POSE_LIMITS.maxDurationSeconds) {
        issues.add(`${path}.time`, `must be at most ${POSE_LIMITS.maxDurationSeconds} seconds`);
      }
      previousTime = time;
    }
    const markers = parseMarkers(entry.markers, `${path}.markers`, issues);
    keyframes.push({
      time: typeof time === "number" ? time : 0,
      name: entry.name === void 0 ? void 0 : parseName(entry.name, `${path}.name`, issues),
      markers,
      easing: parseEasing(entry.easing, `${path}.easing`, issues),
      joints: parseJoints(entry.joints, rig2, `${path}.joints`, issues, markers.length > 0)
    });
  });
  return keyframes;
}
function checkFirstKeys(keyframes, complete, rig2, issues, solvedBy) {
  const first = complete ? keyframes[0] : void 0;
  if (!first) return;
  const late = rig2.joints.filter((joint) => !first.joints.has(joint.childPart) && keyframes.some((keyframe) => keyframe.joints.has(joint.childPart)));
  const failed = issues.count > 0;
  for (const joint of late) {
    const by = solvedBy.get(joint.name);
    if (by && failed) continue;
    issues.add("keyframes[0].joints", by ? `"${joint.name}" is set later by ${by}'s aimAt or grip, so key it, or use aimAt or grip on ${by}, in the first keyframe too` : `"${joint.name}" is keyed later, so it must be keyed in the first keyframe too`);
  }
}
function heading(posed, rig2) {
  const rest = restTurn(rig2, rig2.body);
  const posedBody = posed.parts.get(rig2.body).r;
  const r = rest ? multiplyRotation(posedBody, transposeRotation(rest)) : posedBody;
  const forward = [-r[2], 0, -r[8]];
  return length32(forward) > 1e-6 ? scale3(forward, 1 / length32(forward)) : [0, 0, -1];
}
function flatFacing(forward) {
  const z = scale3(forward, -1);
  const x = cross3([0, 1, 0], z);
  return [x[0], 0, z[0], x[1], 1, z[1], x[2], 0, z[2]];
}
function multiplyRotation(a, b) {
  const out = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      for (let k = 0; k < 3; k += 1) out[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
    }
  }
  return out;
}
function transposeRotation(a) {
  return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]];
}
function childTurn(parent, joint, transform) {
  const framed = joint.parentRotation ? multiplyRotation(parent, joint.parentRotation) : parent;
  const moved = multiplyRotation(framed, transform);
  return joint.childRotation ? multiplyRotation(moved, transposeRotation(joint.childRotation)) : moved;
}
function solveLimb(joint, rig2, posed, target, toward, time, footForward, hand = false) {
  const limb = rig2.limbs[joint.name];
  const end = (hand ? limb.hand : void 0) ?? limb.end;
  const hinge = limb.hinge ? rig2.joints.find((candidate) => candidate.name === limb.hinge) : void 0;
  const bending = limb.hinge ? rig2.hinges[limb.hinge] : void 0;
  const parent = posed.parts.get(joint.parentPart);
  const pivot = pointToWorld(parent, joint.parentOffset);
  const away = [0, 1, 2].map((axis) => target[axis] - pivot[axis]);
  const r = parent.r;
  const reach = turned(restTurn(rig2, joint.parentPart), [
    r[0] * away[0] + r[3] * away[1] + r[6] * away[2],
    r[1] * away[0] + r[4] * away[1] + r[7] * away[2],
    r[2] * away[0] + r[5] * away[1] + r[8] * away[2]
  ]);
  const distance = length32(reach);
  const endAt = limbEndAt(rig2, joint, end);
  const straight = straightest(rig2, endAt);
  const longest = straight.length;
  const shortest = hinge && bending ? length32(endAt(POSE_LIMITS.maxAimAtBend)) : 0;
  const what = !rig2.words ? "limb" : joint.name.endsWith("Hip") ? "leg" : "arm";
  const studs = (value) => Math.round(value * 100) / 100;
  if (distance > longest + POSE_LIMITS.aimAtToleranceStuds) {
    return `is ${studs(distance)} studs from ${joint.name}; the ${what} reaches ${studs(longest)} at most at ${studs(time)} s`;
  }
  if (distance < Math.max(shortest - POSE_LIMITS.aimAtToleranceStuds, 1e-3)) {
    return `is ${studs(distance)} studs from ${joint.name}; the ${what} cannot fold nearer than ${studs(shortest)} at ${studs(time)} s`;
  }
  let bend = straight.bend;
  if (hinge && bending && distance < longest) {
    let low = straight.bend;
    let high = POSE_LIMITS.maxAimAtBend;
    for (let step = 0; step < 60; step += 1) {
      const middle = (low + high) / 2;
      if (length32(endAt(middle)) > distance) low = middle;
      else high = middle;
    }
    bend = (low + high) / 2;
    if (Math.abs(length32(endAt(bend)) - distance) > POSE_LIMITS.aimAtToleranceStuds) {
      return `is ${studs(distance)} studs from ${joint.name}; the ${what} cannot bend to reach that far at ${studs(time)} s`;
    }
  }
  const local = endAt(bend);
  const a = scale3(local, 1 / length32(local));
  const d = scale3(reach, 1 / distance);
  const fold = [...limb.fold];
  const square = (candidate, axis) => {
    const v = [0, 1, 2].map((index) => candidate[index] - dot3(candidate, axis) * axis[index]);
    return length32(v) > 1e-3 ? scale3(v, 1 / length32(v)) : void 0;
  };
  const p = square(fold, a) ?? square([0, 1, 0], a) ?? square([0, 0, 1], a);
  const f = [toward, [...limb.fold], [0, 1, 0], [0, 0, 1]].filter((candidate) => candidate !== void 0).map((candidate) => square(candidate, d)).find((candidate) => candidate !== void 0);
  const localAxes = [a, p, cross3(a, p)];
  const targetAxes = [d, f, cross3(d, f)];
  const turn = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 3; k += 1) {
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) turn[i * 3 + j] += targetAxes[k][i] * localAxes[k][j];
    }
  }
  const rotation = transformFromBody(joint, { p: [0, 0, 0], r: turn }).r;
  const hingeRotation = hinge && bending ? transformFromBody(hinge, { p: [0, 0, 0], r: [...hingeMatrix(bending, bend)] }).r : void 0;
  let foot;
  if (limb.foot && hinge && hingeRotation) {
    const ankle = rig2.joints.find((candidate) => candidate.name === limb.foot);
    const shin = childTurn(childTurn(parent.r, joint, rotation), hinge, hingeRotation);
    const footRest = restTurn(rig2, ankle.childPart);
    const flat = footRest ? multiplyRotation(flatFacing(footForward), footRest) : flatFacing(footForward);
    const inShin = multiplyRotation(transposeRotation(shin), flat);
    const framed = ankle.parentRotation ? multiplyRotation(transposeRotation(ankle.parentRotation), inShin) : inShin;
    foot = { joint: ankle, rotation: ankle.childRotation ? multiplyRotation(framed, ankle.childRotation) : framed };
  }
  return {
    rotation,
    fold: f,
    ...hinge && hingeRotation ? { hinge: { joint: hinge, rotation: hingeRotation } } : {},
    ...foot ? { foot } : {}
  };
}
function resolveGrips(keyframes, animationEasing, rig2, issues, solvedBy) {
  const joint = rig2.joints.find((candidate) => candidate.name === "LeftShoulder");
  const weapon = rig2.joints.find((candidate) => candidate.name === "Weapon");
  if (!joint || !weapon || issues.count > 0) return 0;
  const grips = keyframes.filter((keyframe) => keyframe.joints.get(joint.childPart)?.grip).map((keyframe) => ({ keyframe, grip: keyframe.joints.get(joint.childPart).grip }));
  if (grips.length === 0) return 0;
  const limb = rig2.limbs[joint.name];
  const hinge = limb.hinge ? rig2.joints.find((candidate) => candidate.name === limb.hinge) : void 0;
  const tracks = buildTracks({ loop: false, keyframes: keyframes.map((keyframe) => compileKeyframe(keyframe, animationEasing, rig2).keyframe) });
  const LINEAR = { style: "Linear", direction: "In" };
  const solveAt = (time, grip, previousFold) => {
    const posed = poseRig(tracks, time, rig2);
    const handle = pointToWorld(posed.parts.get(weapon.childPart), [0, -grip.along, 0]);
    return solveLimb(joint, rig2, posed, handle, grip.toward ?? previousFold, time, [0, 0, -1], true);
  };
  const place = (keyframe, solved, easing) => {
    keyframe.joints.set(joint.childPart, { joint, rotation: solved.rotation, position: [0, 0, 0], easing });
    if (solved.hinge) {
      keyframe.joints.set(solved.hinge.joint.childPart, { joint: solved.hinge.joint, rotation: solved.hinge.rotation, position: [0, 0, 0], easing });
      solvedBy.set(solved.hinge.joint.name, joint.name);
    }
  };
  for (const { keyframe, grip } of grips) {
    if (hinge && keyframe.joints.has(hinge.childPart)) issues.add(grip.path, `sets ${hinge.name} too; leave ${hinge.name} out of this keyframe`);
  }
  if (issues.count > 0) return 0;
  const keyed = keyframes.filter((keyframe) => keyframe.joints.has(joint.childPart));
  const extra = [];
  let added = 0;
  let fold;
  for (let index = 0; index < grips.length; index += 1) {
    const { keyframe, grip } = grips[index];
    const before = grips[index - 1];
    if (before && keyed[keyed.indexOf(before.keyframe) + 1] === keyframe) {
      const span = keyframe.time - before.keyframe.time;
      const steps = Math.ceil(span / POSE_LIMITS.gripStepSeconds - 1e-9);
      for (let step = 1; step < steps; step += 1) {
        const time = round3(before.keyframe.time + span * step / steps);
        const along = before.grip.along + (grip.along - before.grip.along) * step / steps;
        const solved2 = solveAt(time, { ...grip, along }, fold);
        if (typeof solved2 === "string") {
          issues.add(grip.path, `holds the handle from ${before.keyframe.time} s, but the handle then ${solved2}`);
          return 0;
        }
        const target = keyframes.find((candidate) => Math.abs(candidate.time - time) < 1e-9) ?? extra.find((candidate) => Math.abs(candidate.time - time) < 1e-9) ?? (() => {
          const created = { time, markers: [], easing: {}, joints: /* @__PURE__ */ new Map() };
          extra.push(created);
          return created;
        })();
        place(target, solved2, LINEAR);
        fold = solved2.fold;
        added += 1;
      }
      for (const part of [joint.childPart, hinge?.childPart]) {
        const start = part ? before.keyframe.joints.get(part) : void 0;
        if (part && start) before.keyframe.joints.set(part, { ...start, easing: LINEAR });
      }
    }
    const solved = solveAt(keyframe.time, grip, fold);
    if (typeof solved === "string") {
      issues.add(grip.path, `cannot hold the handle: it ${solved}`);
      return 0;
    }
    place(keyframe, solved, keyframe.joints.get(joint.childPart).easing);
    fold = solved.fold;
  }
  keyframes.push(...extra);
  keyframes.sort((a, b) => a.time - b.time);
  return added;
}
function resolveAimAt(keyframes, animationEasing, rig2, issues) {
  const solvedBy = /* @__PURE__ */ new Map();
  const pending = keyframes.some((keyframe) => [...keyframe.joints.values()].some((pose) => pose.aimAt));
  if (!pending) return { keyframes, solvedBy, planted: 0 };
  const tracks = buildTracks({ loop: false, keyframes: keyframes.map((keyframe) => compileKeyframe(keyframe, animationEasing, rig2).keyframe) });
  const poses = /* @__PURE__ */ new Map();
  const posedAt = (time) => {
    let posed = poses.get(time);
    if (!posed) {
      posed = poseRig(tracks, time, rig2);
      poses.set(time, posed);
    }
    return posed;
  };
  const LINEAR = { style: "Linear", direction: "In" };
  const aims = /* @__PURE__ */ new Map();
  for (const keyframe of keyframes) {
    for (const joint of rig2.joints) {
      const aim = keyframe.joints.get(joint.childPart)?.aimAt;
      if (aim) aims.set(joint.name, [...aims.get(joint.name) ?? [], { keyframe, ...aim }]);
    }
  }
  const place = (keyframe, joint, solved, easing) => {
    const pose = keyframe.joints.get(joint.childPart);
    keyframe.joints.set(joint.childPart, { joint, rotation: solved.rotation, position: [0, 0, 0], easing: pose?.easing ?? easing });
    for (const extra2 of [solved.hinge, solved.foot]) {
      if (!extra2) continue;
      keyframe.joints.set(extra2.joint.childPart, { joint: extra2.joint, rotation: extra2.rotation, position: [0, 0, 0], easing: pose?.easing ?? easing });
      solvedBy.set(extra2.joint.name, joint.name);
    }
  };
  const headings = /* @__PURE__ */ new Map();
  for (const joint of rig2.joints) {
    const list = aims.get(joint.name);
    if (!list) continue;
    const keyed = keyframes.filter((keyframe) => keyframe.joints.has(joint.childPart));
    list.forEach((aim, index) => {
      const before = list[index - 1];
      const planted2 = before && keyed[keyed.indexOf(before.keyframe) + 1] === aim.keyframe && [0, 1, 2].every((axis) => Math.abs(before.target[axis] - aim.target[axis]) < 1e-6);
      headings.set(aim, planted2 ? headings.get(before) : heading(posedAt(aim.keyframe.time), rig2));
    });
  }
  for (const joint of rig2.joints) {
    const list = aims.get(joint.name);
    if (!list) continue;
    const limb = rig2.limbs[joint.name];
    for (const aim of list) {
      const taken = [limb.hinge, limb.foot].find((name) => {
        const other = name ? rig2.joints.find((candidate) => candidate.name === name) : void 0;
        return other !== void 0 && aim.keyframe.joints.has(other.childPart);
      });
      if (taken) {
        issues.add(aim.path, `sets ${taken} too; leave ${taken} out of this keyframe`);
        continue;
      }
      const solved = solveLimb(joint, rig2, posedAt(aim.keyframe.time), aim.target, aim.toward, aim.keyframe.time, headings.get(aim));
      if (typeof solved === "string") {
        issues.add(aim.path, solved);
        continue;
      }
      place(aim.keyframe, joint, solved, {});
    }
  }
  if (issues.count > 0) return { keyframes, solvedBy, planted: 0 };
  const extra = [];
  const at = (time) => {
    const found = keyframes.find((keyframe) => Math.abs(keyframe.time - time) < 1e-9) ?? extra.find((keyframe) => Math.abs(keyframe.time - time) < 1e-9);
    if (found) return found;
    const created = { time, markers: [], easing: {}, joints: /* @__PURE__ */ new Map() };
    extra.push(created);
    return created;
  };
  let planted = 0;
  for (const joint of rig2.joints) {
    const list = aims.get(joint.name);
    if (!list) continue;
    const limb = rig2.limbs[joint.name];
    const keyed = keyframes.filter((keyframe) => keyframe.joints.has(joint.childPart));
    for (let index = 1; index < list.length; index += 1) {
      const from = list[index - 1];
      const to = list[index];
      const sameKeyNext = keyed[keyed.indexOf(from.keyframe) + 1] === to.keyframe;
      const same = [0, 1, 2].every((axis) => Math.abs(from.target[axis] - to.target[axis]) < 1e-6);
      if (!sameKeyNext || !same) continue;
      const span = to.keyframe.time - from.keyframe.time;
      const steps = Math.ceil(span / POSE_LIMITS.plantedStepSeconds - 1e-9);
      for (let step = 1; step < steps; step += 1) {
        const time = round3(from.keyframe.time + span * step / steps);
        const solved = solveLimb(joint, rig2, posedAt(time), to.target, to.toward, time, headings.get(to));
        if (typeof solved === "string") {
          issues.add(to.path, `holds its point from ${from.keyframe.time} s, but ${solved}`);
          break;
        }
        place(at(time), joint, solved, LINEAR);
        planted += 1;
      }
      for (const name of [joint.name, limb.hinge, limb.foot]) {
        const part = rig2.joints.find((candidate) => candidate.name === name)?.childPart;
        const start = part ? from.keyframe.joints.get(part) : void 0;
        if (part && start) from.keyframe.joints.set(part, { ...start, easing: LINEAR });
      }
    }
  }
  return { keyframes: [...keyframes, ...extra].sort((a, b) => a.time - b.time), solvedBy, planted };
}
function turnDegrees(a, b) {
  let trace = 0;
  for (let index = 3; index < 12; index += 1) trace += a[index] * b[index];
  return Math.acos(Math.min(1, Math.max(-1, (trace - 1) / 2))) * 180 / Math.PI;
}
function easedTime(style, direction, progress) {
  let low = 0;
  let high = 1;
  for (let step = 0; step < 50; step += 1) {
    const middle = (low + high) / 2;
    if (easeAlpha(style, direction, middle) < progress) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
function splitTurns(keyframes, animationEasing, rig2, issues) {
  const extra = [];
  let added = 0;
  const at = (time) => {
    const found = keyframes.find((keyframe) => Math.abs(keyframe.time - time) < 1e-9) ?? extra.find((keyframe) => Math.abs(keyframe.time - time) < 1e-9);
    if (found) return found;
    const created = { time, markers: [], easing: {}, joints: /* @__PURE__ */ new Map() };
    extra.push(created);
    return created;
  };
  const LINEAR = { style: "Linear", direction: "In" };
  for (const joint of rig2.joints) {
    const keyed = keyframes.map((keyframe, index) => ({ keyframe, index })).filter(({ keyframe }) => keyframe.joints.has(joint.childPart));
    for (let i = 1; i < keyed.length; i += 1) {
      const from = keyed[i - 1];
      const to = keyed[i];
      const start = from.keyframe.joints.get(joint.childPart);
      const end = to.keyframe.joints.get(joint.childPart);
      const style = start.easing.style ?? from.keyframe.easing.style ?? animationEasing.style ?? "Linear";
      const direction = start.easing.direction ?? from.keyframe.easing.direction ?? animationEasing.direction ?? "In";
      if (style === "Constant") continue;
      const turn = turnDegrees(matrixCFrame(start.rotation), matrixCFrame(end.rotation));
      if (turn <= POSE_LIMITS.maxTurnPerSegment + 1e-6) continue;
      const path = `keyframes[${to.index}].joints.${joint.name}`;
      if (turn >= POSE_LIMITS.maxSplitTurn) {
        const limb = rig2.limbs[joint.name];
        const along = (rotation) => {
          const body = transformInBody(joint, { p: [0, 0, 0], r: [...rotation] }).r;
          return applyRows([[body[0], body[1], body[2]], [body[3], body[4], body[5]], [body[6], body[7], body[8]]], [...limb.axis]);
        };
        const swing = limb ? Math.acos(Math.min(1, Math.max(-1, dot3(along(start.rotation), along(end.rotation))))) * 180 / Math.PI : void 0;
        issues.add(path, swing !== void 0 && swing < POSE_LIMITS.maxSplitTurn - 10 ? `turns ${Math.round(turn)}\xB0 from its key at ${from.keyframe.time} s: the limb swings ${Math.round(swing)}\xB0 but also twists about itself, too near half a turn to tell which way round; give bendToward so the elbow or knee keeps folding the same side (a raised arm: [0, 0, -1]), or add a keyframe partway` : `turns ${Math.round(turn)}\xB0 from its key at ${from.keyframe.time} s, too near half a turn to tell which way round it goes; add a keyframe partway along the way it should turn`);
        continue;
      }
      if (style === "Elastic" || style === "Bounce") {
        issues.add(path, `turns ${Math.round(turn)}\xB0 from its key at ${from.keyframe.time} s with ${style} easing, whose overshoot in-betweens cannot keep; split turns over ${POSE_LIMITS.maxTurnPerSegment}\xB0 across more keyframes`);
        continue;
      }
      const pieces = Math.max(
        Math.ceil(turn / POSE_LIMITS.maxTurnPerSegment),
        style === "Linear" ? 1 : Math.ceil(turn / POSE_LIMITS.easedSplitDegrees)
      );
      const span = to.keyframe.time - from.keyframe.time;
      for (let piece = 1; piece < pieces; piece += 1) {
        const fraction = piece / pieces;
        const exact = from.keyframe.time + span * (style === "Linear" ? fraction : easedTime(style, direction, fraction));
        const rounded = round3(exact);
        const time = rounded > from.keyframe.time && rounded < to.keyframe.time ? rounded : exact;
        at(time).joints.set(joint.childPart, {
          joint,
          rotation: slerpRotation(start.rotation, end.rotation, fraction),
          position: [0, 1, 2].map((axis) => start.position[axis] + (end.position[axis] - start.position[axis]) * fraction),
          easing: LINEAR
        });
        added += 1;
      }
      from.keyframe.joints.set(joint.childPart, { ...start, easing: LINEAR });
    }
  }
  const merged2 = [...keyframes, ...extra].sort((a, b) => a.time - b.time);
  if (merged2.length > POSE_LIMITS.maxKeyframes) {
    issues.add("keyframes", `with the in-betweens its turns over ${POSE_LIMITS.maxTurnPerSegment}\xB0 need, it would have ${merged2.length} keyframes; at most ${POSE_LIMITS.maxKeyframes}`);
  }
  return { keyframes: merged2, added };
}
function checkTurns(keyframes, animationEasing, rig2, issues) {
  for (const joint of rig2.joints) {
    let previous;
    keyframes.forEach((keyframe, index) => {
      const pose = keyframe.joints.get(joint.childPart);
      if (!pose) return;
      const cframe = matrixCFrame(pose.rotation);
      if (previous && previous.style !== "Constant") {
        const turn = turnDegrees(previous.cframe, cframe);
        if (turn > POSE_LIMITS.maxTurnPerSegment + 1e-6) {
          issues.add(
            `keyframes[${index}].joints.${joint.name}`,
            `turns ${Math.round(turn)}\xB0 from its key at ${previous.time} s; split turns over ${POSE_LIMITS.maxTurnPerSegment}\xB0 across more keyframes`
          );
        }
      }
      previous = { cframe, time: keyframe.time, style: pose.easing.style ?? keyframe.easing.style ?? animationEasing.style ?? "Linear" };
    });
  }
}
function round3(value) {
  const rounded = Math.round(value * 1e6) / 1e6;
  return rounded === 0 ? 0 : rounded;
}
function poseCFrame(rotationDegrees2, position = [0, 0, 0]) {
  return matrixCFrame(eulerMatrix(rotationDegrees2), position);
}
function matrixCFrame(rotation, position = [0, 0, 0]) {
  return [position[0], position[1], position[2], ...rotation].map(round3);
}
var IDENTITY = poseCFrame([0, 0, 0]);
function compileKeyframe(keyframe, animationEasing, rig2) {
  const needed = /* @__PURE__ */ new Set();
  for (const part of keyframe.joints.keys()) {
    let current = part;
    while (current && current !== rig2.rootPart && !needed.has(current)) {
      needed.add(current);
      current = rig2.joints.find((joint) => joint.childPart === current)?.parentPart;
    }
  }
  let poses = 0;
  const build = (part, joint) => {
    poses += 1;
    const keyed = keyframe.joints.get(part);
    const children = rig2.joints.filter((child) => child.parentPart === part && needed.has(child.childPart)).map((child) => build(child.childPart, child));
    if (!keyed) {
      return {
        part,
        ...joint ? { joint: joint.name } : {},
        weight: 0,
        cframe: IDENTITY,
        easingStyle: "Linear",
        easingDirection: "In",
        children
      };
    }
    return {
      part,
      joint: keyed.joint.name,
      weight: 1,
      cframe: matrixCFrame(keyed.rotation, keyed.position),
      easingStyle: keyed.easing.style ?? keyframe.easing.style ?? animationEasing.style ?? "Linear",
      easingDirection: keyed.easing.direction ?? keyframe.easing.direction ?? animationEasing.direction ?? "In",
      children
    };
  };
  return {
    keyframe: {
      time: keyframe.time,
      ...keyframe.name !== void 0 ? { name: keyframe.name } : {},
      ...keyframe.markers.length > 0 ? { markers: keyframe.markers } : {},
      root: build(rig2.rootPart)
    },
    poses
  };
}
var MAX_SKELETON_ISSUES = 5;
function checkSkeleton(value, rig2, issues) {
  if (!isRecord4(value)) {
    issues.add("skeleton", "must be an object of joint name to { parent?, offset: [x, y, z] }");
    return;
  }
  const rest = restPose(rig2);
  const joints = new Map(rig2.joints.map((joint) => [joint.name, joint]));
  const pivot = (joint) => pointToWorld(rest.get(joint.parentPart), joint.parentOffset);
  const mover = new Map(rig2.joints.map((joint) => [joint.childPart, joint]));
  const problems = [];
  for (const [name, entry] of Object.entries(value)) {
    const joint = joints.get(name);
    if (!joint) {
      problems.push(`${name} is not a joint of ${rig2.name}`);
      continue;
    }
    if (!isRecord4(entry) || entry.parent !== void 0 && typeof entry.parent !== "string") {
      issues.add(`skeleton.${name}`, "must be { parent?, offset: [x, y, z] }");
      continue;
    }
    if (entry.parent === void 0) continue;
    const offset = entry.offset;
    if (!Array.isArray(offset) || offset.length !== 3 || !offset.every((part) => typeof part === "number" && Number.isFinite(part))) {
      issues.add(`skeleton.${name}.offset`, "must be [x, y, z] in studs, from its parent joint's pivot at rest");
      continue;
    }
    const above = mover.get(joint.parentPart);
    if (!above || above.name !== entry.parent) {
      problems.push(`${name} hangs from ${entry.parent} there and from ${above?.name ?? `the root part, ${joint.parentPart},`} here`);
      continue;
    }
    const [here, parent] = [pivot(joint), pivot(above)];
    const actual = [here[0] - parent[0], here[1] - parent[1], here[2] - parent[2]];
    const off = Math.hypot(actual[0] - offset[0], actual[1] - offset[1], actual[2] - offset[2]);
    const allowed = Math.max(POSE_LIMITS.skeletonToleranceStuds, POSE_LIMITS.skeletonToleranceShare * Math.hypot(actual[0], actual[1], actual[2]));
    if (off > allowed) {
      const studs = (v) => `[${v.map((part) => Math.round(part * 100) / 100).join(", ")}]`;
      problems.push(`${name} stands ${studs(offset)} from ${entry.parent} there and ${studs(actual)} here`);
    }
  }
  if (problems.length > 0) {
    const shown = problems.slice(0, MAX_SKELETON_ISSUES).join("; ");
    issues.add("skeleton", `the animation was made on a rig that is not this one: ${shown}${problems.length > MAX_SKELETON_ISSUES ? `; and ${problems.length - MAX_SKELETON_ISSUES} more` : ""}. Animate the model that was uploaded, or upload and rig this one again`);
  }
}
function compilePoseAnimation(input2, model2) {
  const issues = new Issues();
  if (!isRecord4(input2)) return { ok: false, errors: ["animation: must be an object"] };
  checkKeys(input2, ["name", "rig", "loop", "priority", "easing", "keyframes", "duration", "waves", "gait", "skeleton"], "animation", issues);
  const name = parseName(input2.name, "name", issues);
  const rig2 = typeof input2.rig !== "string" ? void 0 : model2?.name === input2.rig ? model2 : RIGS.get(input2.rig);
  if (!rig2) issues.add("rig", `must be ${[...RIGS.keys()].join(" or ")}, or the path of a rigged Model in Studio`);
  if (rig2 && input2.skeleton !== void 0) checkSkeleton(input2.skeleton, rig2, issues);
  if (input2.loop !== void 0 && typeof input2.loop !== "boolean") issues.add("loop", "must be true or false");
  const priority = input2.priority === void 0 ? "Action" : parseEnum(input2.priority, ANIMATION_PRIORITIES, "priority", issues);
  const easing = parseEasing(input2.easing, "easing", issues);
  let described = input2.keyframes;
  let unread = false;
  if (rig2 && (input2.waves !== void 0 || input2.gait !== void 0 || input2.duration !== void 0)) {
    const expanded = expandGenerators(input2, rig2, POSE_LIMITS.maxKeyframes, POSE_LIMITS.maxDurationSeconds, (path, message) => issues.add(path, message));
    described = expanded.keyframes;
    unread = expanded.failed && input2.keyframes === void 0;
  }
  let keyframes = rig2 && !unread ? parseKeyframes(described, rig2, issues) : [];
  const complete = Array.isArray(described) && keyframes.length === described.length;
  let solvedBy = /* @__PURE__ */ new Map();
  let inBetweenCount = 0;
  if (rig2 && issues.count === 0) {
    const resolved = resolveAimAt(keyframes, easing, rig2, issues);
    keyframes = resolved.keyframes;
    solvedBy = resolved.solvedBy;
    inBetweenCount += resolved.planted;
    inBetweenCount += resolveGrips(keyframes, easing, rig2, issues, solvedBy);
  }
  if (rig2) checkFirstKeys(keyframes, complete, rig2, issues, solvedBy);
  if (rig2 && issues.count === 0) {
    const split = splitTurns(keyframes, easing, rig2, issues);
    keyframes = split.keyframes;
    inBetweenCount += split.added;
    if (issues.count === 0) checkTurns(keyframes, easing, rig2, issues);
  }
  if (issues.count > 0 || !rig2 || name === void 0 || priority === void 0) {
    return { ok: false, errors: issues.report() };
  }
  let poseCount = 0;
  let keyedPoseCount = 0;
  const compiled = keyframes.map((keyframe) => {
    const result3 = compileKeyframe(keyframe, easing, rig2);
    poseCount += result3.poses;
    keyedPoseCount += keyframe.joints.size;
    return result3.keyframe;
  });
  const moved = new Set(keyframes.flatMap((keyframe) => [...keyframe.joints.values()].map((pose) => pose.joint.name)));
  return {
    ok: true,
    sequence: {
      name,
      rig: rig2.name,
      loop: input2.loop === true,
      priority,
      duration: keyframes[keyframes.length - 1].time,
      joints: rig2.joints.filter((joint) => moved.has(joint.name)).map((joint) => joint.name),
      keyframes: compiled,
      poseCount,
      keyedPoseCount,
      markerCount: keyframes.reduce((total, keyframe) => total + keyframe.markers.length, 0),
      inBetweenCount
    }
  };
}

// upstream/packages/core/src/animation/motion-checks.ts
var MOTION_LIMITS = {
  /** Degrees per second, any body joint. Roblox's worst: 2098 (jump, knee). */
  angularSpeed: 2500,
  /**
   * Degrees per second for a held prop's joint, such as the weapon grip. A
   * sword flicked through a quarter turn in two frames is meant; this only
   * catches a prop flipping round in a frame by mistake. Not calibrated: no
   * Roblox animation holds a prop through this joint.
   */
  propAngularSpeed: 7200,
  /** Studs the body may move sideways from the HumanoidRootPart while playing. Roblox's worst: 0.81 (climb). */
  rootExcursion: 2,
  /** Studs between where the body starts and where it ends. Roblox's worst: 0.04. */
  rootReturn: 0.5,
  /**
   * At a loop's seam a joint may jump seamDegrees, or seamRatio times its own
   * motion over one sample either side of the seam, whichever is larger. A
   * stroke that carries on through the seam is not a jump. Roblox's worst:
   * 4.4 times (swim, wrist; its shoulders jump 19° against 5° either side).
   */
  seamDegrees: 3,
  seamRatio: 6,
  /** Studs the body may jump at a loop's seam. */
  seamStuds: 0.1,
  /** Studs a foot may sink below the ground. Roblox's worst: 0.03 (walk). */
  groundPenetration: 0.1,
  /** Studs above the ground that count as touching it. */
  contactTolerance: 0.05,
  /** Share of a gait with at least one foot on the ground. Roblox's worst: 0.64 (run). */
  groundedShare: 0.5,
  /**
   * A foot corner is planted while it stays on the ground this many seconds
   * or more; a foot skimming the ground mid-swing is not planted.
   */
  plantedSeconds: 0.1,
  /** Studs a planted corner may wander forward or sideways. Roblox's worst: 0.13 (walk, sideways). */
  footSlide: 0.25,
  /**
   * Degrees the larger hip swing must reach; the smaller swing over the
   * larger; and the legs' phase offset in cycles. Roblox's worst: 0.73 and
   * 0.45 (walk).
   */
  gaitMinSwing: 5,
  gaitAmplitudeRatio: 0.6,
  gaitPhase: { min: 0.4, max: 0.6 },
  /** Degrees a joint with no declared range may turn and still count as still, so it needs no range. */
  stillDegrees: 0.1
};
function round4(value, places = 2) {
  const factor = 10 ** places;
  const rounded = Math.round(value * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}
function seconds(time) {
  return `${round4(time)} s`;
}
function bendDegrees(r, axis = "X") {
  if (axis === "Y") return Math.atan2(r[2], r[0]) * 180 / Math.PI;
  if (axis === "Z") return Math.atan2(r[3], r[0]) * 180 / Math.PI;
  return Math.atan2(r[7], r[8]) * 180 / Math.PI;
}
function offAxisDegrees(r, axis = "X") {
  const along = axis === "Y" ? r[4] : axis === "Z" ? r[8] : r[0];
  return Math.acos(Math.min(1, Math.max(-1, along))) * 180 / Math.PI;
}
function listed(names) {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
function scaled(rig2, limit) {
  return rig2.scale ? limit * rig2.scale.factor : limit;
}
function scaledText(rig2, limit) {
  return rig2.scale ? `${round4(limit * rig2.scale.factor)}` : `${limit}`;
}
function scaledNote(rig2) {
  return rig2.scale ? `; its limits are R15's scaled by ${round4(rig2.scale.factor)} for ${rig2.scale.basis}` : "";
}
function sample(sequence2, rate, rig2) {
  const duration = sequenceDuration(sequence2);
  const count = Math.max(1, Math.round(duration * rate));
  const tracks = buildTracks(sequence2);
  const times = duration === 0 ? [0] : Array.from({ length: count + 1 }, (_unused, index) => duration * index / count);
  return { times, poses: times.map((time) => poseRig(tracks, time, rig2)) };
}
function result(id, failed, detail, measured) {
  return { id, status: failed ? "fail" : "pass", detail, measured };
}
function skipped(id, detail) {
  return { id, status: "skipped", detail, measured: {} };
}
function checkJointLimits(data, rig2) {
  const measured = {};
  const failures = [];
  const unranged = [];
  let ranged = 0;
  for (const joint of rig2.joints) {
    const limit = rig2.limits[joint.name];
    if (limit === "free") continue;
    const hinge = limit !== void 0 && "min" in limit ? limit : void 0;
    const turn = limit !== void 0 && "turn" in limit ? limit.turn : void 0;
    const bendAxis = rig2.hinges[joint.name]?.axis ?? "X";
    let low = { value: Infinity, time: 0 };
    let high = { value: -Infinity, time: 0 };
    let off = { value: 0, time: 0 };
    let most = { value: 0, time: 0 };
    data.poses.forEach((pose, index) => {
      const r = transformInBody(joint, pose.transforms.get(joint.name)).r;
      const time = data.times[index];
      if (hinge) {
        const bend = bendDegrees(r, bendAxis);
        if (bend < low.value) low = { value: bend, time };
        if (bend > high.value) high = { value: bend, time };
        const axis = offAxisDegrees(r, bendAxis);
        if (axis > off.value) off = { value: axis, time };
      } else {
        const angle = rotationDegrees(r);
        if (angle > most.value) most = { value: angle, time };
      }
    });
    if (turn === void 0 && !hinge) {
      if (most.value > MOTION_LIMITS.stillDegrees) {
        measured[joint.name] = round4(most.value, 1);
        unranged.push(joint.name);
      }
      continue;
    }
    ranged += 1;
    if (hinge) {
      measured[`${joint.name}.bendMin`] = round4(low.value, 1);
      measured[`${joint.name}.bendMax`] = round4(high.value, 1);
      measured[`${joint.name}.offAxis`] = round4(off.value, 1);
      if (low.value < hinge.min) {
        failures.push({ excess: hinge.min - low.value, text: `${joint.name} bends to ${round4(low.value, 1)}\xB0 at ${seconds(low.time)}; limit ${hinge.min}\xB0` });
      }
      if (high.value > hinge.max) {
        failures.push({ excess: high.value - hinge.max, text: `${joint.name} bends to ${round4(high.value, 1)}\xB0 at ${seconds(high.time)}; limit ${hinge.max}\xB0` });
      }
      if (off.value > hinge.offAxis) {
        failures.push({ excess: off.value - hinge.offAxis, text: `${joint.name} twists its hinge ${round4(off.value, 1)}\xB0 off axis at ${seconds(off.time)}; limit ${hinge.offAxis}\xB0` });
      }
    } else if (turn !== void 0) {
      measured[joint.name] = round4(most.value, 1);
      if (most.value > turn) {
        failures.push({ excess: most.value - turn, text: `${joint.name} turns ${round4(most.value, 1)}\xB0 at ${seconds(most.time)}; limit ${turn}\xB0` });
      }
    }
  }
  failures.sort((a, b) => b.excess - a.excess);
  const unchecked = unranged.length === 0 ? "" : `${listed(unranged)} ${unranged.length === 1 ? "turns" : "turn"} with no declared range`;
  if (failures.length > 0) {
    const worst = failures.length === 1 ? failures[0].text : `${failures[0].text}, and ${failures.length - 1} more`;
    return result("jointLimits", true, unchecked ? `${worst}; not checked: ${unchecked}` : worst, measured);
  }
  if (unchecked) {
    return { id: "jointLimits", status: "skipped", detail: `not checked: ${unchecked}${ranged > 0 ? "; every other joint stays within its range" : ""}`, measured };
  }
  return result("jointLimits", false, "every joint stays within its range", measured);
}
function checkVelocity(data, rig2) {
  const measured = {};
  let worst = { joint: "", speed: 0, time: 0, limit: MOTION_LIMITS.angularSpeed };
  for (const joint of rig2.joints) {
    const limit = joint.optional ? MOTION_LIMITS.propAngularSpeed : MOTION_LIMITS.angularSpeed;
    let peak = 0;
    for (let index = 1; index < data.poses.length; index += 1) {
      const step = degreesBetween(
        data.poses[index - 1].transforms.get(joint.name).r,
        data.poses[index].transforms.get(joint.name).r
      );
      const speed = step / (data.times[index] - data.times[index - 1]);
      if (speed > peak) peak = speed;
      if (speed / limit > worst.speed / worst.limit) worst = { joint: joint.name, speed, time: data.times[index], limit };
    }
    measured[joint.name] = round4(peak, 0);
  }
  return result(
    "velocity",
    worst.speed > worst.limit,
    worst.joint ? `fastest for its limit: ${worst.joint} at ${round4(worst.speed, 0)}\xB0/s around ${seconds(worst.time)}; limit ${worst.limit}\xB0/s` : "nothing moves",
    measured
  );
}
function rootBody(rig2) {
  return rig2.joints.find((joint) => joint.name === rig2.rootJoint)?.childPart;
}
function checkRootDrift(data, rig2) {
  const body = rootBody(rig2);
  if (!body) return skipped("rootDrift", `not checked: no one joint moves the whole body; its ${rig2.rootPart} holds each piece by its own joint`);
  const rest = restPose(rig2).get(body).p;
  let excursion = { value: 0, time: 0 };
  data.poses.forEach((pose, index) => {
    const p = pose.parts.get(body).p;
    const away = Math.hypot(p[0] - rest[0], p[2] - rest[2]);
    if (away > excursion.value) excursion = { value: away, time: data.times[index] };
  });
  const start = data.poses[0].parts.get(body).p;
  const end = data.poses[data.poses.length - 1].parts.get(body).p;
  const gap = Math.hypot(end[0] - start[0], end[2] - start[2]);
  const measured = { excursion: round4(excursion.value), returnGap: round4(gap) };
  if (excursion.value > scaled(rig2, MOTION_LIMITS.rootExcursion)) {
    return result("rootDrift", true, `the body moves ${round4(excursion.value)} studs from the ${rig2.rootPart} at ${seconds(excursion.time)}; limit ${scaledText(rig2, MOTION_LIMITS.rootExcursion)}${scaledNote(rig2)}`, measured);
  }
  if (gap > scaled(rig2, MOTION_LIMITS.rootReturn)) {
    return result("rootDrift", true, `the body ends ${round4(gap)} studs from where it started, so it snaps back when the animation stops; limit ${scaledText(rig2, MOTION_LIMITS.rootReturn)}${scaledNote(rig2)}`, measured);
  }
  return result("rootDrift", false, `the body stays within ${round4(excursion.value)} studs of the ${rig2.rootPart} and returns within ${round4(gap)}${scaledNote(rig2)}`, measured);
}
function checkLoopContinuity(sequence2, data, rig2) {
  if (!sequence2.loop) return skipped("loopContinuity", "the animation does not loop");
  if (data.poses.length < 2) return skipped("loopContinuity", "the animation has no length");
  const count = data.poses.length;
  const first = data.poses[0];
  const last = data.poses[count - 1];
  let worst = { joint: "", degrees: 0, local: 0, allowed: MOTION_LIMITS.seamDegrees };
  for (const joint of rig2.joints) {
    const at = (index) => data.poses[index].transforms.get(joint.name).r;
    const jump2 = degreesBetween(first.transforms.get(joint.name).r, last.transforms.get(joint.name).r);
    const local = count > 2 ? Math.max(degreesBetween(at(count - 2), at(count - 1)), degreesBetween(at(0), at(1))) : 0;
    const allowed = Math.max(MOTION_LIMITS.seamDegrees, MOTION_LIMITS.seamRatio * local);
    if (jump2 / allowed > worst.degrees / worst.allowed) worst = { joint: joint.name, degrees: jump2, local, allowed };
  }
  const body = rootBody(rig2);
  const a = body ? first.parts.get(body).p : [0, 0, 0];
  const b = body ? last.parts.get(body).p : [0, 0, 0];
  const jump = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const measured = { jointDegrees: round4(worst.degrees, 1), jointLocalDegrees: round4(worst.local, 1), rootStuds: round4(jump) };
  if (worst.degrees > worst.allowed) {
    return result(
      "loopContinuity",
      true,
      `${worst.joint} jumps ${round4(worst.degrees, 1)}\xB0 where the loop restarts, against ${round4(worst.local, 1)}\xB0 per sample either side; limit ${round4(worst.allowed, 1)}\xB0`,
      measured
    );
  }
  if (jump > scaled(rig2, MOTION_LIMITS.seamStuds)) {
    return result("loopContinuity", true, `the body jumps ${round4(jump)} studs where the loop restarts; limit ${scaledText(rig2, MOTION_LIMITS.seamStuds)}${scaledNote(rig2)}`, measured);
  }
  return result("loopContinuity", false, `the last pose meets the first${body ? scaledNote(rig2) : ""}`, measured);
}
function footCorners(rig2, foot) {
  const declared = rig2.footPoints?.[foot];
  if (declared) return declared;
  if (rig2.bones?.includes(foot)) return [[0, 0, 0]];
  const [x, y, z] = rig2.parts[foot].map((size) => size / 2);
  const corners = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) corners.push([sx * x, sy * y, sz * z]);
  return corners;
}
function footPoints(data, rig2) {
  const ground = rig2.ground;
  const points = /* @__PURE__ */ new Map();
  for (const foot of rig2.feet) {
    const corners = footCorners(rig2, foot);
    points.set(foot, data.poses.map((pose) => corners.map((corner) => {
      const p = pointToWorld(pose.parts.get(foot), corner);
      return [p[0], p[1] - ground, p[2]];
    })));
  }
  return points;
}
function checkGroundContact(data, rig2, gait) {
  if (rig2.feet.length === 0) return skipped("groundContact", "not checked: the rig declares no feet");
  const points = footPoints(data, rig2);
  const contact = scaled(rig2, MOTION_LIMITS.contactTolerance);
  let deepest = { value: 0, time: 0, foot: "" };
  let grounded = 0;
  data.times.forEach((time, index) => {
    let lowest = Infinity;
    for (const foot of rig2.feet) {
      const low = Math.min(...points.get(foot)[index].map((p) => p[1]));
      lowest = Math.min(lowest, low);
      if (-low > deepest.value) deepest = { value: -low, time, foot };
    }
    if (lowest <= contact) grounded += 1;
  });
  const share = grounded / data.times.length;
  const measured = { penetration: round4(deepest.value), groundedShare: round4(share) };
  const note = scaledNote(rig2);
  if (deepest.value > scaled(rig2, MOTION_LIMITS.groundPenetration)) {
    return result("groundContact", true, `${deepest.foot} sinks ${round4(deepest.value)} studs into the ground at ${seconds(deepest.time)}; limit ${scaledText(rig2, MOTION_LIMITS.groundPenetration)}${note}`, measured);
  }
  if (!gait) {
    return result("groundContact", false, `no foot sinks more than ${round4(deepest.value)} studs into the ground; a foot is down for ${Math.round(share * 100)}% of it${note}`, measured);
  }
  if (share < MOTION_LIMITS.groundedShare) {
    return result("groundContact", true, `a foot touches the ground for only ${Math.round(share * 100)}% of the gait; needs ${Math.round(MOTION_LIMITS.groundedShare * 100)}%${note}`, measured);
  }
  return result("groundContact", false, `a foot is on the ground for ${Math.round(share * 100)}% of the gait${note}`, measured);
}
function checkFootSliding(data, rate, rig2) {
  if (rig2.feet.length === 0) return skipped("footSliding", "not checked: the rig declares no feet");
  const points = footPoints(data, rig2);
  const minimum = Math.ceil(MOTION_LIMITS.plantedSeconds * rate);
  const contact = scaled(rig2, MOTION_LIMITS.contactTolerance);
  let worst = { studs: 0, time: 0, foot: "" };
  let planted = 0;
  for (const foot of rig2.feet) {
    const series = points.get(foot);
    for (let corner = 0; corner < series[0].length; corner += 1) {
      let start = -1;
      for (let index = 0; index <= series.length; index += 1) {
        const down = index < series.length && series[index][corner][1] <= contact;
        if (down && start < 0) start = index;
        if (down || start < 0) continue;
        if (index - start >= minimum) {
          planted += 1;
          const x0 = series[start][corner][0];
          let furthestBack = -Infinity;
          for (let k = start; k < index; k += 1) {
            const [x, , z] = series[k][corner];
            furthestBack = Math.max(furthestBack, z);
            const studs = Math.hypot(x - x0, furthestBack - z);
            if (studs > worst.studs) worst = { studs, time: data.times[k], foot };
          }
        }
        start = -1;
      }
    }
  }
  const measured = { slide: round4(worst.studs), plantedStretches: planted };
  if (worst.studs > scaled(rig2, MOTION_LIMITS.footSlide)) {
    return result("footSliding", true, `${worst.foot} slides ${round4(worst.studs)} studs while planted, by ${seconds(worst.time)}; limit ${scaledText(rig2, MOTION_LIMITS.footSlide)}${scaledNote(rig2)}`, measured);
  }
  return result("footSliding", false, `${planted ? `planted feet wander at most ${round4(worst.studs)} studs` : "no foot stays planted"}${scaledNote(rig2)}`, measured);
}
function measureGroundSpeed(data, rate, rig2) {
  const points = footPoints(data, rig2);
  const minimum = Math.ceil(MOTION_LIMITS.plantedSeconds * rate);
  const contact = scaled(rig2, MOTION_LIMITS.contactTolerance);
  const speeds = [];
  for (const foot of rig2.feet) {
    const series = points.get(foot);
    for (let corner = 0; corner < series[0].length; corner += 1) {
      let start = -1;
      for (let index = 0; index <= series.length; index += 1) {
        const down = index < series.length && series[index][corner][1] <= contact;
        if (down && start < 0) start = index;
        if (down || start < 0) continue;
        if (index - start >= minimum) {
          for (let k = start + 1; k < index - 1; k += 1) {
            speeds.push((series[k + 1][corner][2] - series[k - 1][corner][2]) / (data.times[k + 1] - data.times[k - 1]));
          }
        }
        start = -1;
      }
    }
  }
  if (speeds.length === 0) return void 0;
  speeds.sort((a, b) => a - b);
  const middle = Math.floor(speeds.length / 2);
  return speeds.length % 2 === 1 ? speeds[middle] : (speeds[middle - 1] + speeds[middle]) / 2;
}
function checkGaitPattern(sequence2, data, rig2) {
  if (!sequence2.loop) return skipped("gaitSymmetry", "a gait loops; this animation does not");
  const count = data.poses.length - 1;
  if (count < 4) return skipped("gaitSymmetry", "the animation is too short to compare the feet");
  const points = footPoints(data, rig2);
  const contact = scaled(rig2, MOTION_LIMITS.contactTolerance);
  const measured = {};
  const feet = rig2.feet.map((foot) => {
    const down2 = points.get(foot).slice(0, count).map((corners) => Math.min(...corners.map((p) => p[1])) <= contact);
    const share = down2.filter(Boolean).length / count;
    const landing = down2.findIndex((on, index) => on && !down2[(index + count - 1) % count]);
    measured[`${foot}.down`] = round4(share);
    const at = landing / count;
    if (landing >= 0) measured[`${foot}.lands`] = round4(at > 0.95 ? 0 : at);
    return { foot, share, landing: landing < 0 ? void 0 : at > 0.95 ? at - 1 : at };
  });
  const held = feet.filter((entry) => entry.share === 1).map((entry) => entry.foot);
  if (held.length > 0) {
    return result("gaitSymmetry", true, `${listed(held)} never ${held.length === 1 ? "leaves" : "leave"} the ground; in a gait every foot steps`, measured);
  }
  const lifted = feet.filter((entry) => entry.share === 0).map((entry) => entry.foot);
  if (lifted.length > 0) {
    return result("gaitSymmetry", true, `${listed(lifted)} never ${lifted.length === 1 ? "touches" : "touch"} the ground; in a gait every foot steps`, measured);
  }
  const least = feet.reduce((a, b) => b.share < a.share ? b : a);
  const most = feet.reduce((a, b) => b.share > a.share ? b : a);
  const percent = (share) => `${Math.round(share * 100)}%`;
  if (least.share / most.share < MOTION_LIMITS.gaitAmplitudeRatio) {
    return result("gaitSymmetry", true, `the feet share the ground unevenly: ${least.foot} is down ${percent(least.share)} of the cycle and ${most.foot} ${percent(most.share)}; the least must be at least ${Math.round(MOTION_LIMITS.gaitAmplitudeRatio * 100)}% of the most`, measured);
  }
  const order = [...feet].sort((a, b) => a.landing - b.landing);
  const groups = [];
  let last = -Infinity;
  for (const entry of order) {
    if (entry.landing - last <= 0.05) groups[groups.length - 1].push(entry.foot);
    else groups.push([entry.foot]);
    last = entry.landing;
  }
  const down = least.share === most.share ? percent(most.share) : `${percent(least.share)} to ${percent(most.share)}`;
  return result("gaitSymmetry", false, `${feet.length} feet step, each down ${down} of the cycle, landing ${groups.map((group) => group.join(" with ")).join(", then ")}`, measured);
}
function checkGaitSymmetry(sequence2, data, rig2) {
  const hips = rig2.hips;
  if (!hips && rig2.feet.length >= 2) return checkGaitPattern(sequence2, data, rig2);
  if (!hips) return skipped("gaitSymmetry", "not checked: the rig declares no pair of hips to compare");
  if (!sequence2.loop) return skipped("gaitSymmetry", "a gait loops; this animation does not");
  const count = data.poses.length - 1;
  if (count < 4) return skipped("gaitSymmetry", "the animation is too short to compare the legs");
  const [left, right] = hips.map((name) => {
    const hip = rig2.joints.find((joint) => joint.name === name);
    return data.poses.slice(0, count).map((pose) => bendDegrees(transformInBody(hip, pose.transforms.get(name)).r));
  });
  const amplitude = (series) => (Math.max(...series) - Math.min(...series)) / 2;
  const ampLeft = amplitude(left);
  const ampRight = amplitude(right);
  const ratio = Math.max(ampLeft, ampRight) === 0 ? 0 : Math.min(ampLeft, ampRight) / Math.max(ampLeft, ampRight);
  const centre = (series) => {
    const mean = series.reduce((sum, value) => sum + value, 0) / series.length;
    return series.map((value) => value - mean);
  };
  const a = centre(left);
  const b = centre(right);
  let best = { lag: 0, score: -Infinity };
  for (let lag = 0; lag < count; lag += 1) {
    let score = 0;
    for (let index = 0; index < count; index += 1) score += a[index] * b[(index + lag) % count];
    if (score > best.score) best = { lag, score };
  }
  const phase = best.lag / count;
  const measured = { amplitudeLeft: round4(ampLeft, 1), amplitudeRight: round4(ampRight, 1), amplitudeRatio: round4(ratio), phase: round4(phase) };
  if (Math.max(ampLeft, ampRight) < MOTION_LIMITS.gaitMinSwing) {
    return result("gaitSymmetry", true, `the hips barely swing (${round4(Math.max(ampLeft, ampRight), 1)}\xB0); a gait needs at least ${MOTION_LIMITS.gaitMinSwing}\xB0`, measured);
  }
  if (ratio < MOTION_LIMITS.gaitAmplitudeRatio) {
    return result("gaitSymmetry", true, `the hips swing unevenly: ${round4(ampLeft, 1)}\xB0 left and ${round4(ampRight, 1)}\xB0 right; the smaller must be at least ${Math.round(MOTION_LIMITS.gaitAmplitudeRatio * 100)}% of the larger`, measured);
  }
  const { min, max } = MOTION_LIMITS.gaitPhase;
  if (phase < min || phase > max) {
    return result("gaitSymmetry", true, `the legs are ${round4(phase)} of a cycle apart; a gait needs ${min} to ${max}`, measured);
  }
  return result("gaitSymmetry", false, `the legs swing evenly, ${round4(phase)} of a cycle apart`, measured);
}
function checkMotion(sequence2, options = {}, rig2 = R15_RIG) {
  const rate = options.sampleRate ?? 60;
  const data = sample(sequence2, rate, rig2);
  const checks = [
    checkJointLimits(data, rig2),
    checkVelocity(data, rig2),
    checkRootDrift(data, rig2),
    checkLoopContinuity(sequence2, data, rig2)
  ];
  if (options.locomotion) {
    checks.push(checkGroundContact(data, rig2, true), checkFootSliding(data, rate, rig2), checkGaitSymmetry(sequence2, data, rig2));
  } else {
    checks.push(options.grounded ? checkGroundContact(data, rig2, false) : skipped("groundContact", "only for locomotion or grounded"));
    for (const id of ["footSliding", "gaitSymmetry"]) {
      checks.push(skipped(id, "only for locomotion"));
    }
  }
  const unchecked = rig2.uncheckedChecks ?? {};
  for (const [index, check] of checks.entries()) {
    const why = unchecked[check.id];
    if (why !== void 0 && check.status !== "skipped") checks[index] = skipped(check.id, `not checked: ${why}`);
  }
  const groundSpeed = options.locomotion && unchecked.footSliding === void 0 ? measureGroundSpeed(data, rate, rig2) : void 0;
  return {
    passed: checks.every((check) => check.status !== "fail"),
    duration: sequenceDuration(sequence2),
    sampleRate: rate,
    checks,
    ...groundSpeed === void 0 ? {} : { groundSpeed: round4(groundSpeed) }
  };
}

// upstream/packages/core/src/animation/animation-tool.ts
var MOTION_CHECK_IDS = [
  "jointLimits",
  "velocity",
  "rootDrift",
  "loopContinuity",
  "groundContact",
  "footSliding",
  "gaitSymmetry"
];
function prepareAnimation(animation2, options, model2) {
  const errors = [];
  if (options.locomotion !== void 0 && typeof options.locomotion !== "boolean") {
    errors.push("locomotion: must be true or false");
  }
  if (options.grounded !== void 0 && typeof options.grounded !== "boolean") {
    errors.push("grounded: must be true or false");
  }
  let waive = [];
  if (options.waive !== void 0) {
    if (!Array.isArray(options.waive)) {
      errors.push(`waive: must be an array of check ids: ${MOTION_CHECK_IDS.join(", ")}`);
    } else {
      for (const id of options.waive) {
        if (!MOTION_CHECK_IDS.includes(id)) errors.push(`waive: unknown check "${String(id)}"; checks are ${MOTION_CHECK_IDS.join(", ")}`);
      }
      waive = options.waive.filter((id) => MOTION_CHECK_IDS.includes(id));
    }
  }
  const compiled = compilePoseAnimation(animation2, model2);
  if (!compiled.ok) errors.push(...compiled.errors);
  if (errors.length > 0 || !compiled.ok) return { ok: false, errors };
  const report2 = checkMotion(
    compiled.sequence,
    { locomotion: options.locomotion === true, grounded: options.grounded === true },
    model2 ?? rigFor(compiled.sequence.rig)
  );
  const failed = report2.checks.filter((check) => check.status === "fail").map((check) => check.id);
  return {
    ok: true,
    value: {
      sequence: compiled.sequence,
      report: report2,
      failing: failed.filter((id) => !waive.includes(id)),
      waived: failed.filter((id) => waive.includes(id))
    }
  };
}
function compactChecks(report2) {
  return report2.checks.map((check) => ({
    id: check.id,
    status: check.status,
    detail: check.detail,
    ...check.status === "fail" ? { measured: check.measured } : {}
  }));
}

// upstream/packages/core/src/png-encoder.ts
import { deflateSync } from "zlib";
var PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
var CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let crc = 4294967295;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 255] ^ crc >>> 8;
  return (crc ^ 4294967295) >>> 0;
}
function writeChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length2 = Buffer.alloc(4);
  length2.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length2, typeBytes, data, checksum]);
}
function rgbaToPng(rgba, width, height) {
  if (width <= 0 || height <= 0) throw new Error(`Invalid PNG dimensions: ${width}x${height}`);
  const expected = width * height * 4;
  if (rgba.length < expected) throw new Error(`Buffer too small: got ${rgba.length}, need ${expected}`);
  const stride = width * 4;
  const filtered = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    filtered[y * (1 + stride)] = 0;
    rgba.copy(filtered, y * (1 + stride) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    PNG_SIGNATURE,
    writeChunk("IHDR", ihdr),
    writeChunk("IDAT", deflateSync(filtered)),
    writeChunk("IEND", Buffer.alloc(0))
  ]);
}

// upstream/packages/core/src/animation/model-meshes.ts
function fittedMesh(mesh, size) {
  const middle = [0, 1, 2].map((axis) => (mesh.min[axis] + mesh.max[axis]) / 2);
  const stretch = [0, 1, 2].map((axis) => {
    const extent = mesh.max[axis] - mesh.min[axis];
    return extent > 1e-6 ? size[axis] / extent : 1;
  });
  const positions = mesh.positions.map((value, index) => (value - middle[index % 3]) * stretch[index % 3]);
  const normals = [];
  for (let index = 0; index < mesh.normals.length; index += 3) {
    const n = [0, 1, 2].map((axis) => mesh.normals[index + axis] / stretch[axis]);
    const length2 = Math.hypot(n[0], n[1], n[2]);
    normals.push(...length2 > 1e-9 ? n.map((value) => value / length2) : [0, 1, 0]);
  }
  return { positions, normals, indices: mesh.indices, ...mesh.skin ? { skin: mesh.skin } : {} };
}

// upstream/packages/core/src/animation/box-rig.ts
var RIG_COLOR = [214, 217, 222];
function drawnParts(rig2 = R15_RIG) {
  const held = new Set(heldParts(rig2));
  const hidden = new Set(rig2.hidden ?? [rig2.rootPart]);
  return Object.keys(rig2.parts).filter((part) => !hidden.has(part) && !held.has(part));
}
function meshParts(rig2 = R15_RIG) {
  const held = new Set(heldParts(rig2));
  const hidden = new Set(rig2.hidden ?? [rig2.rootPart]);
  return Object.keys(rig2.parts).filter((part) => !held.has(part) && (!hidden.has(part) || (rig2.attached?.[part]?.length ?? 0) > 0));
}
function heldParts(rig2 = R15_RIG) {
  return rig2.joints.filter((joint) => joint.optional).map((joint) => joint.childPart);
}
var SKIN_SLOTS = 4;
function edgeRadius(part, size) {
  const wanted = part === "Head" ? 0.3 : part.endsWith("Torso") ? 0.14 : 0.11;
  return Math.min(wanted, Math.min(...size) * 0.45);
}
var FACES = [
  { normal: 0, sign: 1, u: 1, v: 2 },
  { normal: 0, sign: -1, u: 2, v: 1 },
  { normal: 1, sign: 1, u: 2, v: 0 },
  { normal: 1, sign: -1, u: 0, v: 2 },
  { normal: 2, sign: 1, u: 0, v: 1 },
  { normal: 2, sign: -1, u: 1, v: 0 }
];
function roundedBox(size, radius, steps = 3) {
  const half = size.map((value) => value / 2);
  const inner = half.map((value) => Math.max(value - radius, 0));
  const coordinates = half.map((_value, axis) => {
    const edge = Array.from({ length: steps + 1 }, (_unused, index) => inner[axis] + radius * Math.tan(index * Math.PI / 4 / steps));
    return [...edge.slice().reverse().map((value) => -value), ...edge];
  });
  const positions = [];
  const normals = [];
  const indices = [];
  for (const face of FACES) {
    const us = coordinates[face.u];
    const vs = coordinates[face.v];
    const base = positions.length / 3;
    for (const v of vs) {
      for (const u of us) {
        const point = [0, 0, 0];
        point[face.normal] = face.sign * half[face.normal];
        point[face.u] = u;
        point[face.v] = v;
        const core = point.map((value, axis) => Math.max(-inner[axis], Math.min(inner[axis], value)));
        const offset = point.map((value, axis) => value - core[axis]);
        const length2 = Math.hypot(offset[0], offset[1], offset[2]);
        const normal = length2 > 1e-9 ? offset.map((value) => value / length2) : [0, 0, 0].map((_v, axis) => axis === face.normal ? face.sign : 0);
        positions.push(...core.map((value, axis) => value + normal[axis] * radius));
        normals.push(...normal);
      }
    }
    const row = us.length;
    for (let j = 0; j + 1 < vs.length; j += 1) {
      for (let i = 0; i + 1 < us.length; i += 1) {
        const a = base + j * row + i;
        indices.push(a, a + 1, a + row + 1, a, a + row + 1, a + row);
      }
    }
  }
  return { positions, normals, indices };
}
function ball(size, rings = 10, segments = 16) {
  const half = size.map((value) => value / 2);
  const positions = [];
  const normals = [];
  const indices = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const down = ring * Math.PI / rings;
    for (let segment = 0; segment <= segments; segment += 1) {
      const round5 = segment * 2 * Math.PI / segments;
      const unit = [Math.sin(down) * Math.cos(round5), Math.cos(down), Math.sin(down) * Math.sin(round5)];
      positions.push(...unit.map((value, axis) => value * half[axis]));
      const gradient = unit.map((value, axis) => value / half[axis]);
      const length2 = Math.hypot(gradient[0], gradient[1], gradient[2]);
      normals.push(...gradient.map((value) => value / length2));
    }
  }
  const row = segments + 1;
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * row + segment;
      if (ring > 0) indices.push(a, a + 1, a + row);
      if (ring < rings - 1) indices.push(a + 1, a + row + 1, a + row);
    }
  }
  return { positions, normals, indices };
}
function cylinder(size, segments = 20) {
  const length2 = size[0] / 2;
  const radius = Math.min(size[1], size[2]) / 2;
  const positions = [];
  const normals = [];
  const indices = [];
  const angle = (step) => step * 2 * Math.PI / segments;
  for (let step = 0; step <= segments; step += 1) {
    const [c, s] = [Math.cos(angle(step)), Math.sin(angle(step))];
    positions.push(-length2, radius * c, radius * s, length2, radius * c, radius * s);
    normals.push(0, c, s, 0, c, s);
  }
  for (let step = 0; step < segments; step += 1) {
    const a = step * 2;
    indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
  }
  for (const side of [-1, 1]) {
    const centre = positions.length / 3;
    positions.push(side * length2, 0, 0);
    normals.push(side, 0, 0);
    for (let step = 0; step <= segments; step += 1) {
      positions.push(side * length2, radius * Math.cos(angle(step)), radius * Math.sin(angle(step)));
      normals.push(side, 0, 0);
    }
    for (let step = 0; step < segments; step += 1) {
      const a = centre + 1 + step;
      indices.push(...side > 0 ? [centre, a, a + 1] : [centre, a + 1, a]);
    }
  }
  return { positions, normals, indices };
}
function wedge(size) {
  const [w, h, d] = size.map((value) => value / 2);
  const faces = [
    [[-w, -h, -d], [w, -h, -d], [w, -h, d], [-w, -h, d]],
    [[-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d]],
    [[-w, -h, -d], [w, -h, -d], [w, h, d], [-w, h, d]],
    [[-w, -h, -d], [-w, -h, d], [-w, h, d]],
    [[w, -h, -d], [w, -h, d], [w, h, d]]
  ];
  const inside = [0, -h / 3, d / 3];
  const positions = [];
  const normals = [];
  const indices = [];
  for (const face of faces) {
    const [a, b, c] = face;
    const u = b.map((value, axis) => value - a[axis]);
    const v = c.map((value, axis) => value - a[axis]);
    let normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const middle = [0, 1, 2].map((axis) => face.reduce((sum, point) => sum + point[axis], 0) / face.length);
    const outward = normal.reduce((sum, value, axis) => sum + value * (middle[axis] - inside[axis]), 0) > 0;
    const corners = outward ? face : [...face].reverse();
    if (!outward) normal = normal.map((value) => -value);
    const length2 = Math.hypot(normal[0], normal[1], normal[2]);
    const base = positions.length / 3;
    for (const corner of corners) {
      positions.push(...corner);
      normals.push(...normal.map((value) => value / length2));
    }
    for (let index = 1; index + 1 < corners.length; index += 1) indices.push(base, base + index, base + index + 1);
  }
  return { positions, normals, indices };
}
function shapeMesh(shape, size, radius) {
  if (shape === "Ball") return ball(size);
  if (shape === "Cylinder") return cylinder(size);
  if (shape === "Wedge") return wedge(size);
  return roundedBox(size, radius);
}
function modelEdgeRadius(size) {
  return Math.min(0.06, Math.min(...size) * 0.2);
}
function placed(mesh, offset) {
  const turn = (v) => [0, 1, 2].map((row) => offset[3 + row * 3] * v[0] + offset[4 + row * 3] * v[1] + offset[5 + row * 3] * v[2]);
  const positions = [];
  const normals = [];
  for (let index = 0; index < mesh.positions.length; index += 3) {
    positions.push(...turn(mesh.positions.slice(index, index + 3)).map((value, axis) => value + offset[axis]));
    normals.push(...turn(mesh.normals.slice(index, index + 3)));
  }
  return { positions, normals, indices: mesh.indices };
}
function merged(meshes) {
  const skinned = meshes.find((mesh) => mesh.skin);
  let base = 0;
  const offsetIndices = meshes.map((mesh) => {
    const shifted = mesh.indices.map((index) => index + base);
    base += mesh.positions.length / 3;
    return shifted;
  });
  const result3 = {
    positions: meshes.flatMap((mesh) => mesh.positions),
    normals: meshes.flatMap((mesh) => mesh.normals),
    indices: offsetIndices.flat()
  };
  if (!skinned?.skin) return result3;
  const slots = (mesh) => mesh.positions.length / 3 * SKIN_SLOTS;
  const skin = {
    bones: skinned.skin.bones,
    joints: meshes.flatMap((mesh) => mesh === skinned ? skinned.skin.joints : new Array(slots(mesh)).fill(0)),
    weights: meshes.flatMap((mesh) => mesh === skinned ? skinned.skin.weights : new Array(slots(mesh)).fill(0))
  };
  return { ...result3, skin };
}
function partMesh(part, rig2 = R15_RIG, library) {
  const size = rig2.parts[part];
  const shape = rig2.shapes?.[part];
  const id = rig2.meshIds?.[part];
  const read = id === void 0 ? void 0 : library?.get(id);
  const own = read ? fittedMesh(read, size) : shape === void 0 ? roundedBox(size, edgeRadius(part, size)) : shapeMesh(shape, size, modelEdgeRadius(size));
  if (own.skin && !own.skin.bones.some((bone) => rig2.bones?.includes(bone))) delete own.skin;
  const offset = rig2.drawOffsets?.[part];
  if (offset) own.positions = own.positions.map((value, index) => value + offset[index % 3]);
  const attached = rig2.attached?.[part] ?? [];
  if (attached.length === 0) return own;
  const hidden = !drawnParts(rig2).includes(part) && !heldParts(rig2).includes(part);
  return merged([
    ...hidden ? [] : [own],
    ...attached.map((piece) => {
      const mesh = piece.mesh === void 0 ? void 0 : library?.get(piece.mesh);
      return placed(mesh ? fittedMesh(mesh, piece.size) : shapeMesh(piece.shape, piece.size, modelEdgeRadius(piece.size)), piece.offset);
    })
  ]);
}

// upstream/packages/core/src/animation/rig-meshes.ts
var generated = /* @__PURE__ */ new Map();
function generatedRigMeshes(rig2 = R15_RIG, library) {
  const builtIn = RIGS.get(rig2.name) === rig2;
  let meshes = builtIn ? generated.get(rig2.name) : void 0;
  if (!meshes) {
    const parts = [...meshParts(rig2), ...heldParts(rig2)];
    meshes = { source: "generated", parts: new Map(parts.map((part) => [part, partMesh(part, rig2, library)])) };
    if (builtIn) generated.set(rig2.name, meshes);
  }
  return meshes;
}

// upstream/packages/core/src/animation/skin.ts
function invertFrame(frame) {
  const r = frame.r;
  const t = [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
  return {
    p: [
      -(t[0] * frame.p[0] + t[1] * frame.p[1] + t[2] * frame.p[2]),
      -(t[3] * frame.p[0] + t[4] * frame.p[1] + t[5] * frame.p[2]),
      -(t[6] * frame.p[0] + t[7] * frame.p[1] + t[8] * frame.p[2])
    ],
    r: t
  };
}
function skinFrames(skin, part, rest, posed) {
  const partRest = rest.get(part);
  return skin.bones.map((bone) => {
    const [from, to] = [rest.get(bone), posed.get(bone)];
    return partRest && from && to ? multiply(multiply(to, invertFrame(from)), partRest) : void 0;
  });
}
var apply = (frame, v, at, point) => {
  const r = frame.r;
  const [x, y, z] = [v[at], v[at + 1], v[at + 2]];
  return [
    r[0] * x + r[1] * y + r[2] * z + (point ? frame.p[0] : 0),
    r[3] * x + r[4] * y + r[5] * z + (point ? frame.p[1] : 0),
    r[6] * x + r[7] * y + r[8] * z + (point ? frame.p[2] : 0)
  ];
};
function skinnedVertices(mesh, frames, partFrame) {
  const skin = mesh.skin;
  const positions = [];
  const normals = [];
  for (let vertex = 0; vertex < mesh.positions.length / 3; vertex += 1) {
    const at = vertex * 3;
    const p = [0, 0, 0];
    const n = [0, 0, 0];
    let held = 0;
    for (let slot = 0; slot < SKIN_SLOTS; slot += 1) {
      const weight = skin.weights[vertex * SKIN_SLOTS + slot];
      const frame = weight > 0 ? frames[skin.joints[vertex * SKIN_SLOTS + slot]] : void 0;
      if (!frame) continue;
      held += weight;
      const [point, normal] = [apply(frame, mesh.positions, at, true), apply(frame, mesh.normals, at, false)];
      for (let axis = 0; axis < 3; axis += 1) {
        p[axis] += weight * point[axis];
        n[axis] += weight * normal[axis];
      }
    }
    const rigid = Math.max(0, 1 - held);
    if (rigid > 1e-6) {
      const [point, normal] = [apply(partFrame, mesh.positions, at, true), apply(partFrame, mesh.normals, at, false)];
      for (let axis = 0; axis < 3; axis += 1) {
        p[axis] += rigid * point[axis];
        n[axis] += rigid * normal[axis];
      }
    }
    const length2 = Math.hypot(n[0], n[1], n[2]);
    positions.push(p[0], p[1], p[2]);
    normals.push(...length2 > 1e-9 ? [n[0] / length2, n[1] / length2, n[2] / length2] : [0, 1, 0]);
  }
  return { positions, normals };
}

// upstream/packages/core/src/animation/contact-sheet.ts
var CELL_WIDTH = 172;
var CELL_HEIGHT = 236;
var LABEL_HEIGHT = 18;
var VIEW_HEIGHT_STUDS = 7.4;
var GROUND_MARGIN = 22;
var HEAD_ROOM = 40;
var MAX_CELL_WIDTH = CELL_WIDTH * 2;
var SIDE_ROOM = 1.4;
var COLUMNS = 5;
var MAX_COLUMNS = 8;
var TOP = [30, 33, 40];
var BOTTOM = [18, 20, 25];
var DIVIDER = [42, 46, 54];
var TEXT = [142, 149, 161];
var KEY_LIGHT = normalize([0.45, 0.75, -0.5]);
var FILL_LIGHT = normalize([-0.6, 0.25, -0.35]);
function normalize(v) {
  const length2 = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / length2, v[1] / length2, v[2] / length2];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function view(toward) {
  const t = normalize(toward);
  const right = normalize(cross([0, 1, 0], t));
  return { right, up: cross(t, right), toward: t };
}
var YAW = Math.PI * 35 / 180;
var PITCH = Math.PI * 14 / 180;
var THREE_QUARTER = view([Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), -Math.cos(YAW) * Math.cos(PITCH)]);
var SIDE = view([1, 0.06, 0]);
var FRONT = view([0, 0.06, -1]);
var GLYPHS = {
  "0": [7, 5, 5, 5, 7],
  "1": [2, 6, 2, 2, 7],
  "2": [7, 1, 7, 4, 7],
  "3": [7, 1, 7, 1, 7],
  "4": [5, 5, 7, 1, 1],
  "5": [7, 4, 7, 1, 7],
  "6": [7, 4, 7, 5, 7],
  "7": [7, 1, 2, 2, 2],
  "8": [7, 5, 7, 5, 7],
  "9": [7, 5, 7, 1, 7],
  ".": [0, 0, 0, 0, 2],
  s: [0, 3, 6, 3, 6]
};
var Canvas = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.rgba = Buffer.alloc(width * height * 4);
    this.depth = new Float32Array(width * height).fill(-Infinity);
  }
  rgba;
  depth;
  put(x, y, color) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = (y * this.width + x) * 4;
    this.rgba[index] = color[0];
    this.rgba[index + 1] = color[1];
    this.rgba[index + 2] = color[2];
    this.rgba[index + 3] = 255;
  }
  /** Darken what is there by a share, for the shadow. */
  darken(x, y, share) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const index = (y * this.width + x) * 4;
    for (let channel = 0; channel < 3; channel += 1) this.rgba[index + channel] = Math.round(this.rgba[index + channel] * (1 - share));
  }
  /** A triangle with its colour blended from its corners, depth-tested, clipped to a cell. */
  triangle(a, b, c, clip) {
    const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(area) < 1e-9) return;
    const minX = Math.max(clip.x0, Math.floor(Math.min(a.x, b.x, c.x)));
    const maxX = Math.min(clip.x1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const minY = Math.max(clip.y0, Math.floor(Math.min(a.y, b.y, c.y)));
    const maxY = Math.min(clip.y1, Math.ceil(Math.max(a.y, b.y, c.y)));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((b.x - px) * (c.y - py) - (b.y - py) * (c.x - px)) / area;
        const w1 = ((c.x - px) * (a.y - py) - (c.y - py) * (a.x - px)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const z = w0 * a.z + w1 * b.z + w2 * c.z;
        const index = y * this.width + x;
        if (z <= this.depth[index]) continue;
        this.depth[index] = z;
        this.put(x, y, [
          Math.round(w0 * a.r + w1 * b.r + w2 * c.r),
          Math.round(w0 * a.g + w1 * b.g + w2 * c.g),
          Math.round(w0 * a.b + w1 * b.b + w2 * c.b)
        ]);
      }
    }
  }
  text(value, x, y, scale2, color) {
    let cursor = x;
    for (const character of value) {
      const glyph = GLYPHS[character];
      if (glyph) {
        glyph.forEach((row, rowIndex) => {
          for (let bit = 0; bit < 3; bit += 1) {
            if (row & 4 >> bit) {
              for (let dy = 0; dy < scale2; dy += 1) {
                for (let dx = 0; dx < scale2; dx += 1) this.put(cursor + bit * scale2 + dx, y + rowIndex * scale2 + dy, color);
              }
            }
          }
        });
      }
      cursor += 4 * scale2;
    }
  }
};
function rotate(frame, v) {
  const r = frame.r;
  return [r[0] * v[0] + r[1] * v[1] + r[2] * v[2], r[3] * v[0] + r[4] * v[1] + r[5] * v[2], r[6] * v[0] + r[7] * v[1] + r[8] * v[2]];
}
function lighting(normal, camera) {
  const key = Math.max(0, dot(normal, KEY_LIGHT));
  const fill = Math.max(0, dot(normal, FILL_LIGHT));
  const rim = (1 - Math.max(0, dot(normal, camera.toward))) ** 3;
  return 0.3 + 0.62 * key + 0.18 * fill + 0.12 * rim;
}
function drawBackground(canvas, left, top, height, width) {
  for (let y = 0; y < height; y += 1) {
    const share = y / height;
    const color = TOP.map((value, channel) => Math.round(value + (BOTTOM[channel] - value) * share));
    for (let x = 0; x < width; x += 1) canvas.put(left + x, top + y, color);
  }
}
var BUILT_IN_FRAMING = { cellWidth: CELL_WIDTH, scale: CELL_HEIGHT / VIEW_HEIGHT_STUDS, placements: /* @__PURE__ */ new Map() };
var BUILT_IN_PLACEMENT = { middle: 0, ground: CELL_HEIGHT - GROUND_MARGIN };
function frameFigure(figure, cameras) {
  const { rig: rig2, meshes, hidden } = figure;
  if (RIGS.get(rig2.name) === rig2) return BUILT_IN_FRAMING;
  const rest = restPose(rig2);
  const points = [];
  for (const [part, mesh] of meshes.parts) {
    const frame = rest.get(part);
    if (!frame || hidden.has(part)) continue;
    for (let index = 0; index < mesh.positions.length; index += 3) {
      points.push(pointToWorld(frame, [mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]]));
    }
  }
  const body = rest.get(rig2.body);
  if (points.length === 0 || !body) return BUILT_IN_FRAMING;
  const spans = cameras.map((camera) => {
    let [low, high, below, above] = [Infinity, -Infinity, 0, 0];
    for (const point of points) {
      const across = dot(point, camera.right);
      const up = dot(point, camera.up) - rig2.ground * camera.up[1];
      [low, high] = [Math.min(low, across), Math.max(high, across)];
      [below, above] = [Math.min(below, up), Math.max(above, up)];
    }
    return { camera, low, high, below, above };
  });
  const tallest = Math.max(...spans.map((span) => span.above - span.below));
  const widest = Math.max(...spans.map((span) => span.high - span.low));
  let scale2 = (CELL_HEIGHT - GROUND_MARGIN - HEAD_ROOM) / Math.max(tallest, 0.01);
  let cellWidth = Math.max(CELL_WIDTH, Math.ceil(widest * scale2 * SIDE_ROOM));
  if (cellWidth > MAX_CELL_WIDTH) {
    cellWidth = MAX_CELL_WIDTH;
    scale2 = MAX_CELL_WIDTH / (widest * SIDE_ROOM);
  }
  const placements = new Map(spans.map((span) => [
    span.camera,
    { middle: (span.low + span.high) / 2, ground: CELL_HEIGHT - GROUND_MARGIN + span.below * scale2 }
  ]));
  let [minX, maxX, minZ, maxZ] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const point of points) {
    [minX, maxX] = [Math.min(minX, point[0]), Math.max(maxX, point[0])];
    [minZ, maxZ] = [Math.min(minZ, point[2]), Math.max(maxZ, point[2])];
  }
  const footprint = {
    offset: [(minX + maxX) / 2 - body.p[0], (minZ + maxZ) / 2 - body.p[2]],
    half: [(maxX - minX) / 2, (maxZ - minZ) / 2],
    rest: body.r
  };
  return { cellWidth, scale: scale2, placements, footprint, rest };
}
function shade(canvas, centre, radiusX, radiusY, left, width) {
  for (let y = Math.floor(centre.y - radiusY); y <= Math.ceil(centre.y + radiusY); y += 1) {
    for (let x = Math.floor(centre.x - radiusX); x <= Math.ceil(centre.x + radiusX); x += 1) {
      if (x < left || x >= left + width) continue;
      const d = ((x - centre.x) / radiusX) ** 2 + ((y - centre.y) / radiusY) ** 2;
      if (d < 1) canvas.darken(x, y, 0.55 * (1 - d) ** 1.5);
    }
  }
}
function drawCell(canvas, figure, framing, parts, camera, left, top) {
  const { meshes, rig: rig2, hidden } = figure;
  const { cellWidth, scale: scale2, footprint } = framing;
  const placement = framing.placements.get(camera) ?? BUILT_IN_PLACEMENT;
  const ground = rig2.ground;
  const originX = left + cellWidth / 2 - placement.middle * scale2;
  const groundY = top + placement.ground;
  const project = (p) => ({
    x: originX + dot(p, camera.right) * scale2,
    y: groundY - (dot(p, camera.up) - ground * camera.up[1]) * scale2,
    z: dot(p, camera.toward)
  });
  const body = parts.get(rig2.body);
  if (body && !footprint) {
    const centre = project([body.p[0], ground, body.p[2]]);
    const radiusX = 1.35 * scale2;
    const radiusY = Math.max(3, 1.35 * scale2 * Math.abs(camera.up[2] * camera.toward[2] + camera.up[0] * camera.toward[0]) + 3);
    shade(canvas, centre, radiusX, radiusY, left, cellWidth);
  } else if (body && footprint) {
    const { offset, half, rest } = footprint;
    const flat = (v) => {
      const turned2 = rotate(body, v);
      const length2 = Math.hypot(turned2[0], turned2[2]);
      return length2 > 0.2 ? [turned2[0] / length2, 0, turned2[2] / length2] : void 0;
    };
    const sideways = flat([rest[0], rest[1], rest[2]]);
    const back = flat([rest[6], rest[7], rest[8]]);
    const ex = sideways ?? (back ? [back[2], 0, -back[0]] : [1, 0, 0]);
    const ez = [-ex[2], 0, ex[0]];
    const middle = [body.p[0] + ex[0] * offset[0] + ez[0] * offset[1], ground, body.p[2] + ex[2] * offset[0] + ez[2] * offset[1]];
    const reach = Math.max(half[0], half[1]) * 0.3;
    const [a, b] = [Math.max(half[0] * 0.72, reach), Math.max(half[1] * 0.72, reach)];
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([i, j]) => project([
      middle[0] + ex[0] * a * i + ez[0] * b * j,
      ground,
      middle[2] + ex[2] * a * i + ez[2] * b * j
    ]));
    const xs = corners.map((corner) => corner.x);
    const ys = corners.map((corner) => corner.y);
    const radiusX = Math.max(3, (Math.max(...xs) - Math.min(...xs)) / 2);
    const radiusY = Math.max(3, (Math.max(...ys) - Math.min(...ys)) / 2 + 3);
    shade(canvas, project(middle), radiusX, radiusY, left, cellWidth);
  }
  const clip = { x0: left, y0: top, x1: left + cellWidth - 1, y1: top + CELL_HEIGHT - 1 };
  for (const [part, mesh] of meshes.parts) {
    const frame = parts.get(part);
    if (!frame || hidden.has(part)) continue;
    const color = RIG_COLOR;
    const vertices = [];
    const world = [];
    const bent = mesh.skin ? skinnedVertices(mesh, skinFrames(mesh.skin, part, framing.rest ?? restPose(rig2), parts), frame) : void 0;
    for (let index = 0; index < mesh.positions.length; index += 3) {
      let point;
      let normal;
      if (bent) {
        point = [bent.positions[index], bent.positions[index + 1], bent.positions[index + 2]];
        normal = [bent.normals[index], bent.normals[index + 1], bent.normals[index + 2]];
      } else {
        const rotated = rotate(frame, [mesh.positions[index], mesh.positions[index + 1], mesh.positions[index + 2]]);
        point = [rotated[0] + frame.p[0], rotated[1] + frame.p[1], rotated[2] + frame.p[2]];
        normal = rotate(frame, [mesh.normals[index], mesh.normals[index + 1], mesh.normals[index + 2]]);
      }
      world.push(point);
      const light = lighting(normal, camera);
      const projected = project(point);
      vertices.push({
        ...projected,
        r: Math.min(255, color[0] * light),
        g: Math.min(255, color[1] * light),
        b: Math.min(255, color[2] * light)
      });
    }
    for (let index = 0; index < mesh.indices.length; index += 3) {
      const [ia, ib, ic] = [mesh.indices[index], mesh.indices[index + 1], mesh.indices[index + 2]];
      const [a, b, c] = [world[ia], world[ib], world[ic]];
      const facing = cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
      if (dot(facing, camera.toward) <= 0) continue;
      canvas.triangle(vertices[ia], vertices[ib], vertices[ic], clip);
    }
  }
}
function fastestMoment(sequence2) {
  const duration = sequenceDuration(sequence2);
  if (duration === 0) return void 0;
  const tracks = buildTracks(sequence2);
  const step = 1 / 60;
  let best;
  let previous = new Map([...tracks.keys()].map((part) => [part, sampleTrack(tracks.get(part), 0).r]));
  for (let time = step; time <= duration + 1e-9; time += step) {
    const now = new Map([...tracks.keys()].map((part) => [part, sampleTrack(tracks.get(part), time).r]));
    let turned2 = 0;
    for (const [part, r] of now) turned2 += degreesBetween(previous.get(part), r);
    if (!best || turned2 / step > best.speed) best = { time: time - step / 2, speed: turned2 / step };
    previous = now;
  }
  return best;
}
function sheetMoments(sequence2) {
  const duration = sequenceDuration(sequence2);
  const moments = sheetTimes(sequence2).map((time) => ({ time, label: "" }));
  if (duration === 0) return moments;
  const keys = [];
  for (const keyframe of sequence2.keyframes) {
    for (const marker of keyframe.markers ?? []) keys.push({ time: keyframe.time, label: marker.name, rank: 0 });
    if (keyframe.name) keys.push({ time: keyframe.time, label: keyframe.name, rank: 1 });
  }
  const fastest = fastestMoment(sequence2);
  if (fastest && fastest.speed > 90) keys.push({ time: Math.round(fastest.time * 1e3) / 1e3, label: "fastest", rank: 2 });
  const shown = keys.filter((key) => !(sequence2.loop && key.time >= duration - 1e-9)).sort((a, b) => a.rank - b.rank);
  const snap = Math.min(0.04, duration / 20);
  for (const key of shown) {
    const near = moments.find((moment) => Math.abs(moment.time - key.time) <= snap);
    const ends = [moments[0], ...sequence2.loop ? [] : [moments[moments.length - 1]]];
    if (near && ends.includes(near) && Math.abs(near.time - key.time) > 1e-6) continue;
    if (near) {
      if (near.label === "") near.time = key.time;
      if (!near.label.split(", ").includes(key.label)) near.label = near.label ? `${near.label}, ${key.label}` : key.label;
    } else if (moments.length < MAX_COLUMNS) {
      moments.push({ time: key.time, label: key.label });
    }
  }
  return moments.sort((a, b) => a.time - b.time);
}
function sheetTimes(sequence2, columns = COLUMNS) {
  const duration = sequenceDuration(sequence2);
  if (duration === 0) return [0];
  const spans = sequence2.loop ? columns : columns - 1;
  return Array.from({ length: columns }, (_unused, index) => duration * index / spans);
}
function renderContactSheet(sequence2, meshes, options = {}) {
  const rig2 = options.rig ?? R15_RIG;
  const moments = sheetMoments(sequence2);
  const times = moments.map((moment) => moment.time);
  const tracks = buildTracks(sequence2);
  const figure = {
    rig: rig2,
    meshes: meshes ?? generatedRigMeshes(rig2),
    hidden: new Set(heldParts(rig2).filter((part) => !tracks.has(part)))
  };
  const cameras = [THREE_QUARTER, options.locomotion ? SIDE : FRONT];
  const framing = frameFigure(figure, cameras);
  const width = framing.cellWidth * times.length;
  const rowHeight = CELL_HEIGHT + LABEL_HEIGHT;
  const height = rowHeight * 2;
  const canvas = new Canvas(width, height);
  times.forEach((time, column) => {
    const parts = poseRig(tracks, time, rig2).parts;
    const left = column * framing.cellWidth;
    cameras.forEach((camera, row) => {
      const top = row * rowHeight;
      drawBackground(canvas, left, top, rowHeight, framing.cellWidth);
      drawCell(canvas, figure, framing, parts, camera, left, top);
      canvas.text(`${time.toFixed(2)}s`, left + 10, top + CELL_HEIGHT + 2, 2, TEXT);
    });
    if (column > 0) for (let y = 0; y < height; y += 1) canvas.put(left, y, DIVIDER);
  });
  for (let x = 0; x < width; x += 1) canvas.put(x, rowHeight, DIVIDER);
  return { png: rgbaToPng(canvas.rgba, width, height), width, height, times, labels: moments.map((moment) => moment.label) };
}

// upstream/packages/core/src/animation/rig-declarations.ts
var RIG_ATTRIBUTE = "AnimRig";
var RIG_DECLARATION_VERSION = 1;
var MAX_FOOT_POINTS = 8;
var POINT_SLACK = 0.5;
var DEFAULT_OFF_AXIS = 35;
var isRecord5 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var length = (v) => Math.hypot(v[0], v[1], v[2]);
var dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var cross2 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var scale = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
var minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var AXES2 = { X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] };
function vector(value) {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === "number" && Number.isFinite(entry)) ? [value[0], value[1], value[2]] : void 0;
}
function squareTo(v, axis) {
  const square = minus(v, scale(axis, dot2(v, axis)));
  const size = length(square);
  return size > 1e-3 ? scale(square, 1 / size) : void 0;
}
function farEnd(size, pivot) {
  const away = scale(pivot, -1);
  if (length(away) < 1e-6) return [0, -size[1] / 2, 0];
  let reach = Infinity;
  for (let axis = 0; axis < 3; axis += 1) {
    if (Math.abs(away[axis]) > 1e-9) reach = Math.min(reach, size[axis] / 2 / Math.abs(away[axis]));
  }
  return scale(away, reach).map((value) => value + 0);
}
function declareRig(rig2, text) {
  const errors = [];
  const at = (path, message) => errors.push(`${RIG_ATTRIBUTE}${path}: ${message}`);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: [`${RIG_ATTRIBUTE}: must be JSON`] };
  }
  if (!isRecord5(parsed)) return { ok: false, errors: [`${RIG_ATTRIBUTE}: must be a JSON object`] };
  if (parsed.version !== RIG_DECLARATION_VERSION) {
    return { ok: false, errors: [`${RIG_ATTRIBUTE}.version: must be ${RIG_DECLARATION_VERSION}; this tool reads version ${RIG_DECLARATION_VERSION} only`] };
  }
  for (const key of Object.keys(parsed)) {
    if (!["version", "feet", "hips", "limbs", "hinges", "limits"].includes(key)) at(`.${key}`, "is not a version 1 declaration; expected feet, hips, limbs, hinges or limits");
  }
  const joints = new Map(rig2.joints.map((joint) => [joint.name, joint]));
  const moved = new Set(rig2.joints.map((joint) => joint.childPart));
  const bones = new Set(rig2.bones ?? []);
  const jointNamed = (name, path) => {
    if (!joints.has(name)) at(path, `names no joint of the rig; its joints are ${rig2.joints.map((joint) => joint.name).join(", ")}`);
    return joints.get(name);
  };
  const rest = restPose(rig2);
  const restFrame = (part) => rest.get(part);
  const hinges = {};
  if (parsed.hinges !== void 0) {
    if (!isRecord5(parsed.hinges)) at(".hinges", "must be an object of joint name to { axis, flex }");
    else {
      for (const [name, value] of Object.entries(parsed.hinges)) {
        const path = `.hinges.${name}`;
        if (!jointNamed(name, path)) continue;
        if (!isRecord5(value) || !["X", "Y", "Z"].includes(value.axis) || value.flex !== 1 && value.flex !== -1) {
          at(path, 'must be { axis: "X", "Y" or "Z" (the body axis it bends about), flex: 1 or -1 (the sign of the turn that flexes it) }');
          continue;
        }
        hinges[name] = { axis: value.axis, flex: value.flex };
      }
    }
  }
  const limbs = {};
  if (parsed.limbs !== void 0) {
    if (!isRecord5(parsed.limbs)) at(".limbs", "must be an object of the joint at each limb's root to its declaration");
    else {
      for (const [name, value] of Object.entries(parsed.limbs)) {
        const path = `.limbs.${name}`;
        const root = jointNamed(name, path);
        if (!root) continue;
        if (!isRecord5(value)) {
          at(path, "must be an object: { hinge?, end?, foot?, axis?, fold? }");
          continue;
        }
        for (const key of Object.keys(value)) {
          if (!["hinge", "end", "foot", "axis", "fold"].includes(key)) at(`${path}.${key}`, "is not a limb declaration; expected hinge, end, foot, axis or fold");
        }
        let last = root.childPart;
        let hinge;
        let hingeName;
        if (value.hinge !== void 0) {
          const joint = typeof value.hinge === "string" ? jointNamed(value.hinge, `${path}.hinge`) : void 0;
          if (typeof value.hinge !== "string") at(`${path}.hinge`, "must name a joint");
          else if (joint && joint.parentPart !== root.childPart) at(`${path}.hinge`, `${value.hinge} does not hang from ${root.childPart}, the part ${name} moves`);
          else if (joint && !hinges[joint.name]) at(`${path}.hinge`, `${value.hinge} must be declared in hinges, with the axis it bends about`);
          else if (joint) {
            hinge = hinges[joint.name];
            hingeName = joint.name;
            last = joint.childPart;
          }
        }
        let footName;
        let footPivot;
        if (value.foot !== void 0) {
          const joint = typeof value.foot === "string" ? jointNamed(value.foot, `${path}.foot`) : void 0;
          if (typeof value.foot !== "string") at(`${path}.foot`, "must name a joint");
          else if (!hingeName) at(`${path}.foot`, "goes with a hinge: a foot is laid flat below a bent knee");
          else if (joint && joint.parentPart !== last) at(`${path}.foot`, `${value.foot} does not hang from ${last}, the part ${hingeName} moves`);
          else if (joint) {
            footName = joint.name;
            footPivot = joint.parentOffset;
          }
        }
        const ownJoint = hingeName ? joints.get(hingeName) : root;
        let end;
        if (value.end !== void 0) {
          const point = vector(value.end);
          const size = rig2.parts[last];
          if (!point) {
            at(`${path}.end`, "must be [x, y, z] in studs, in the frame of the limb's last part");
            continue;
          }
          if (!bones.has(last) && point.some((component, axis2) => Math.abs(component) > size[axis2] / 2 + POINT_SLACK)) {
            at(`${path}.end`, `lies outside ${last}, whose size is [${size.join(", ")}]; give it in ${last}'s own frame`);
            continue;
          }
          end = point;
        } else if (footPivot) {
          end = [...footPivot];
        } else if (bones.has(last)) {
          const below = rig2.joints.filter((joint) => joint.parentPart === last);
          if (below.length !== 1) {
            at(`${path}.end`, `${last} is a bone with ${below.length === 0 ? "no bone" : `${below.length} bones`} below it, so where it ends cannot be read; give end, the point in ${last}'s frame the limb reaches with`);
            continue;
          }
          end = [...below[0].parentOffset];
        } else {
          end = farEnd(rig2.parts[last], ownJoint.childOffset);
        }
        const pivot = pointToWorld(restFrame(root.parentPart), root.parentOffset);
        const tip = pointToWorld(restFrame(last), end);
        const reach = minus(tip, pivot);
        let axis;
        if (value.axis !== void 0) {
          const given = vector(value.axis);
          if (!given || length(given) < 1e-6) {
            at(`${path}.axis`, "must be a direction [x, y, z], not all zero");
            continue;
          }
          axis = scale(given, 1 / length(given));
        } else if (length(reach) < 1e-3) {
          at(path, `its end is at its root's pivot, so it points nowhere; give end or axis`);
          continue;
        } else {
          axis = scale(reach, 1 / length(reach));
        }
        let fold;
        if (value.fold !== void 0) {
          const given = vector(value.fold);
          fold = given ? squareTo(given, axis) : void 0;
          if (!fold) {
            at(`${path}.fold`, "must be a direction [x, y, z] that does not run along the limb's axis");
            continue;
          }
        } else if (hinge && hingeName) {
          const hingePivot = pointToWorld(restFrame(joints.get(hingeName).parentPart), joints.get(hingeName).parentOffset);
          const swing = scale(cross2(AXES2[hinge.axis], minus(tip, hingePivot)), hinge.flex);
          fold = squareTo(swing, axis);
          if (!fold) {
            at(`${path}.fold`, `${hingeName} bends about ${hinge.axis}, along the limb, so it cannot fold it; give fold, or declare the hinge's axis square to the limb`);
            continue;
          }
        } else {
          fold = squareTo([0, 0, 1], axis) ?? squareTo([0, 1, 0], axis);
        }
        limbs[name] = {
          ...hingeName ? { hinge: hingeName } : {},
          end,
          ...footName ? { foot: footName } : {},
          axis,
          fold
        };
      }
    }
  }
  const limits = { ...rig2.limits };
  if (parsed.limits !== void 0) {
    if (!isRecord5(parsed.limits)) at(".limits", 'must be an object of joint name to "free", { turn } or { min, max, offAxis? }');
    else {
      for (const [name, value] of Object.entries(parsed.limits)) {
        const path = `.limits.${name}`;
        if (!jointNamed(name, path)) continue;
        if (value === "free") {
          limits[name] = "free";
        } else if (isRecord5(value) && Object.keys(value).length === 1 && typeof value.turn === "number") {
          if (!(value.turn > 0 && value.turn <= 360)) at(`${path}.turn`, "must be degrees above 0, at most 360");
          else limits[name] = { turn: value.turn };
        } else if (isRecord5(value) && typeof value.min === "number" && typeof value.max === "number") {
          const offAxis = value.offAxis ?? DEFAULT_OFF_AXIS;
          if (!hinges[name]) at(path, `a range goes on a hinge; declare ${name} in hinges, or give { turn }`);
          else if (!(value.min < value.max) || Math.abs(value.min) > 360 || Math.abs(value.max) > 360) at(path, "min must be below max, both degrees within \xB1360, signed about the hinge's axis");
          else if (typeof offAxis !== "number" || !(offAxis > 0 && offAxis <= 180)) at(`${path}.offAxis`, "must be degrees above 0, at most 180");
          else if (Object.keys(value).some((key) => !["min", "max", "offAxis"].includes(key))) at(path, "a range is { min, max, offAxis? }");
          else limits[name] = { min: value.min, max: value.max, offAxis };
        } else {
          at(path, 'must be "free", { turn } or, on a hinge, { min, max, offAxis? }');
        }
      }
    }
  }
  const feet = [];
  const footPoints2 = {};
  if (parsed.feet !== void 0) {
    const entries = Array.isArray(parsed.feet) ? parsed.feet.map((part) => [part, void 0]) : isRecord5(parsed.feet) ? Object.entries(parsed.feet) : void 0;
    if (!entries) at(".feet", "must list the parts that stand on the ground, or map each to the points that do");
    for (const [part, points] of entries ?? []) {
      const path = `.feet.${part}`;
      if (typeof part !== "string" || !moved.has(part)) {
        at(path, "must be a part a joint moves");
        continue;
      }
      if (feet.includes(part)) {
        at(path, "is listed twice");
        continue;
      }
      if (points !== void 0) {
        const list = Array.isArray(points) ? points.map(vector) : [];
        const size = rig2.parts[part];
        if (list.length === 0 || list.length > MAX_FOOT_POINTS || list.some((point) => !point)) {
          at(path, `must be 1 to ${MAX_FOOT_POINTS} points [x, y, z] in the part's frame`);
          continue;
        }
        if (!bones.has(part) && list.some((point) => point.some((component, axis) => Math.abs(component) > size[axis] / 2 + POINT_SLACK))) {
          at(path, `has a point outside ${part}, whose size is [${size.join(", ")}]`);
          continue;
        }
        footPoints2[part] = list;
      }
      feet.push(part);
    }
  }
  for (const [name, limb] of Object.entries(limbs)) {
    const last = joints.get(limb.hinge ?? name)?.childPart;
    if (!limb.foot && last !== void 0 && feet.includes(last) && !footPoints2[last]) footPoints2[last] = [limb.end];
  }
  let hips;
  if (parsed.hips !== void 0) {
    const pair = parsed.hips;
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || typeof pair[1] !== "string" || pair[0] === pair[1]) {
      at(".hips", "must be two joints, left then right, whose swing a biped's gait compares");
    } else if (jointNamed(pair[0], ".hips[0]") && jointNamed(pair[1], ".hips[1]")) {
      hips = [pair[0], pair[1]];
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    rig: {
      ...rig2,
      feet,
      ...Object.keys(footPoints2).length > 0 ? { footPoints: footPoints2 } : {},
      ...hips ? { hips } : {},
      limbs,
      hinges,
      limits
    }
  };
}

// upstream/packages/core/src/animation/model-rig.ts
var MAX_RIG_JOINTS = 64;
var MAX_RIG_PARTS = 128;
var MAX_WELDED_PARTS = 256;
var SHAPES = ["Block", "Wedge", "Cylinder", "Ball"];
var isRecord6 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isName = (value) => typeof value === "string" && value.trim() !== "" && value.length <= 100;
var isMeshId = (value) => value === void 0 || typeof value === "string" && value !== "" && value.length <= 200;
function numbers(value, count) {
  return Array.isArray(value) && value.length === count && value.every((entry) => typeof entry === "number" && Number.isFinite(entry)) ? value : void 0;
}
function orthonormal(r) {
  const column = (index) => [r[index], r[index + 3], r[index + 6]];
  const dot4 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const [x, y, z] = [column(0), column(1), column(2)];
  return [dot4(x, x), dot4(y, y), dot4(z, z)].every((length2) => Math.abs(length2 - 1) < 1e-3) && [dot4(x, y), dot4(y, z), dot4(z, x)].every((cross4) => Math.abs(cross4) < 1e-3);
}
function isIdentity(r) {
  return r.every((value, index) => Math.abs(value - (index % 4 === 0 ? 1 : 0)) < 1e-9);
}
function restBounds(rig2, parts) {
  const posed = poseRig(/* @__PURE__ */ new Map(), 0, rig2).parts;
  const boxes = [];
  const drawn = new Set(parts);
  for (const [part, frame] of posed) {
    if (drawn.has(part)) boxes.push({ frame, size: rig2.parts[part] });
    for (const piece of rig2.attached?.[part] ?? []) boxes.push({ frame: multiply(frame, frameFromComponents(piece.offset)), size: piece.size });
  }
  let low = Infinity;
  let high = -Infinity;
  for (const { frame, size } of boxes) {
    const [x, y, z] = size.map((value) => value / 2);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const point = pointToWorld(frame, [sx * x, sy * y, sz * z]);
      low = Math.min(low, point[1]);
      high = Math.max(high, point[1]);
    }
  }
  return { low, high };
}
var R15_REST_HEIGHT = (() => {
  const { high } = restBounds(R15_RIG, drawnParts(R15_RIG));
  return high - R15_RIG.ground;
})();
function rigFromModel(input2) {
  const errors = [];
  if (!isRecord6(input2)) return { ok: false, errors: ["the rig reading must be an object"] };
  const reading = input2;
  if (!isName(reading.path)) errors.push("path: must name the model");
  if (typeof reading.revision !== "string" || reading.revision === "") errors.push("revision: must be the reading's revision");
  if (reading.controller !== "Humanoid" && reading.controller !== "AnimationController") {
    errors.push("controller: the model needs a Humanoid or an AnimationController to play animations");
  }
  if (reading.hipHeight !== void 0 && (typeof reading.hipHeight !== "number" || !Number.isFinite(reading.hipHeight))) {
    errors.push("hipHeight: must be a number");
  }
  if (reading.declarations !== void 0 && typeof reading.declarations !== "string") {
    errors.push("declarations: must be the AnimRig attribute's text");
  }
  const sizes = /* @__PURE__ */ new Map();
  const shapes = /* @__PURE__ */ new Map();
  const meshIds = /* @__PURE__ */ new Map();
  const hidden = [];
  const bones = [];
  const partList = Array.isArray(reading.parts) ? reading.parts : [];
  if (!Array.isArray(reading.parts)) errors.push("parts: must be a list");
  if (partList.length > MAX_RIG_PARTS) errors.push(`parts: a rig may have at most ${MAX_RIG_PARTS} parts; this one has ${partList.length}`);
  const repeatedParts = /* @__PURE__ */ new Set();
  for (const part of partList.slice(0, MAX_RIG_PARTS)) {
    const size = isRecord6(part) ? numbers(part.size, 3) : void 0;
    if (!isRecord6(part) || !isName(part.name) || !size || size.some((value) => value <= 0)) {
      errors.push(`parts: ${isRecord6(part) && isName(part.name) ? part.name : "an entry"} must have a name and a positive size`);
      continue;
    }
    if (part.shape !== void 0 && !SHAPES.includes(part.shape)) {
      errors.push(`parts: ${part.name}'s shape must be one of ${SHAPES.join(", ")}`);
    }
    if (!isMeshId(part.mesh)) errors.push(`parts: ${part.name}'s mesh must be its MeshId`);
    else if (part.mesh !== void 0) meshIds.set(part.name, part.mesh);
    if (sizes.has(part.name)) repeatedParts.add(part.name);
    sizes.set(part.name, [size[0], size[1], size[2]]);
    shapes.set(part.name, SHAPES.includes(part.shape) ? part.shape : "Block");
    if (part.hidden === true || part.bone === true) hidden.push(part.name);
    if (part.bone === true) bones.push(part.name);
  }
  if (repeatedParts.size > 0) {
    errors.push(`parts: a keyframe's poses find their parts by name, so each must be named once; these repeat: ${[...repeatedParts].join(", ")}`);
  }
  const root = reading.rootPart;
  if (!isName(root) || !sizes.has(root)) errors.push("rootPart: must be one of the parts");
  const jointList = Array.isArray(reading.joints) ? reading.joints : [];
  if (!Array.isArray(reading.joints) || jointList.length === 0) {
    errors.push("joints: the model has no Motor6D or AnimationConstraint joints, and no Bones, to animate");
  }
  if (jointList.length > MAX_RIG_JOINTS) errors.push(`joints: a rig may have at most ${MAX_RIG_JOINTS} joints; this one has ${jointList.length}`);
  const joints = [];
  const mover = /* @__PURE__ */ new Map();
  for (const entry of jointList.slice(0, MAX_RIG_JOINTS)) {
    if (!isRecord6(entry) || !isName(entry.name) || !isName(entry.part0) || !isName(entry.part1)) {
      errors.push("joints: each must name itself and the two parts it joins");
      continue;
    }
    const where = `joint ${entry.name} (${entry.part0} to ${entry.part1})`;
    const c0 = numbers(entry.c0, 12);
    const c1 = numbers(entry.c1, 12);
    if (!c0 || !c1) {
      errors.push(`${where}: C0 and C1 must be 12 finite numbers each`);
      continue;
    }
    if (!orthonormal(c0.slice(3)) || !orthonormal(c1.slice(3))) {
      errors.push(`${where}: C0 and C1 must be rotations without scale`);
      continue;
    }
    for (const part of [entry.part0, entry.part1]) {
      if (!sizes.has(part)) errors.push(`${where}: ${part} is not one of the rig's parts`);
    }
    if (entry.part1 === root) errors.push(`${where}: nothing may move the root part, ${root}; it is where the rig hangs from`);
    if (entry.part0 === entry.part1) errors.push(`${where}: joins a part to itself`);
    const other = mover.get(entry.part1);
    if (other !== void 0) errors.push(`${where}: ${entry.part1} is already moved by ${other}; a part may have one joint`);
    mover.set(entry.part1, entry.name);
    joints.push({
      name: entry.name,
      parentPart: entry.part0,
      childPart: entry.part1,
      parentOffset: [c0[0], c0[1], c0[2]],
      childOffset: [c1[0], c1[1], c1[2]],
      ...isIdentity(c0.slice(3)) ? {} : { parentRotation: c0.slice(3) },
      ...isIdentity(c1.slice(3)) ? {} : { childRotation: c1.slice(3) }
    });
  }
  const attached = weldedParts(reading, sizes, errors);
  if (errors.length > 0 || !isName(root)) return { ok: false, errors };
  const notes = [];
  const count = /* @__PURE__ */ new Map();
  for (const joint of joints) count.set(joint.name, (count.get(joint.name) ?? 0) + 1);
  const renamed = joints.map((joint) => count.get(joint.name) > 1 ? { ...joint, name: joint.childPart } : joint);
  const shared = [...count].filter(([, times]) => times > 1).map(([name]) => name);
  if (shared.length > 0) notes.push(`joints named ${shared.join(", ")} more than once are named after the part each moves`);
  const names = /* @__PURE__ */ new Map();
  for (const joint of renamed) names.set(joint.name, (names.get(joint.name) ?? 0) + 1);
  const clashes = [...names].filter(([, times]) => times > 1).map(([name]) => name);
  if (clashes.length > 0) {
    return { ok: false, errors: [`joints: a pose names its joint, so each must be named once; these repeat: ${clashes.join(", ")}. Rename them after the parts they move`] };
  }
  const ordered = [];
  const reached = /* @__PURE__ */ new Set([root]);
  const visit = (part) => {
    for (const joint of renamed) {
      if (joint.parentPart !== part || reached.has(joint.childPart)) continue;
      reached.add(joint.childPart);
      ordered.push(joint);
      visit(joint.childPart);
    }
  };
  visit(root);
  const stray = renamed.filter((joint) => !ordered.includes(joint));
  if (stray.length > 0) {
    return {
      ok: false,
      errors: [`joints: ${stray.map((joint) => joint.name).join(", ")} ${stray.length === 1 ? "does" : "do"} not hang from ${root}, directly or through other joints; a rig is one tree of joints from its root part`]
    };
  }
  const unjointed = [...sizes.keys()].filter((part) => !reached.has(part));
  if (unjointed.length > 0) notes.push(`${unjointed.join(", ")} ${unjointed.length === 1 ? "is" : "are"} not moved by any joint and not drawn`);
  const loose = [...attached.keys()].filter((part) => !reached.has(part));
  if (loose.length > 0) {
    return { ok: false, errors: [`welded: parts are welded to ${loose.join(", ")}, which no joint moves; a welded part must move with a part of the rig`] };
  }
  const leftOut = typeof reading.weldedLeftOut === "number" && reading.weldedLeftOut > 0 ? Math.floor(reading.weldedLeftOut) : 0;
  if (leftOut > 0) notes.push(`${leftOut} more welded part${leftOut === 1 ? " is" : "s are"} not drawn: a preview draws the ${MAX_WELDED_PARTS} largest`);
  const fromRoot = ordered.filter((joint) => joint.parentPart === root);
  const rootJoint = fromRoot.length === 1 ? fromRoot[0].name : void 0;
  const parts = Object.fromEntries([...sizes].filter(([part]) => reached.has(part)));
  const limits = rootJoint ? { [rootJoint]: "free" } : {};
  const draft = {
    name: reading.path,
    revision: reading.revision,
    rootPart: root,
    ...rootJoint ? { rootJoint } : {},
    hipHeight: reading.hipHeight ?? 0,
    ground: 0,
    feet: [],
    body: rootJoint ? fromRoot[0].childPart : root,
    limbs: {},
    hinges: {},
    limits,
    hidden: hidden.filter((part) => reached.has(part)),
    ...bones.some((part) => reached.has(part)) ? { bones: bones.filter((part) => reached.has(part)) } : {},
    shapes: Object.fromEntries(Object.keys(parts).map((part) => [part, shapes.get(part)])),
    ...[...meshIds.keys()].some((part) => reached.has(part)) ? { meshIds: Object.fromEntries([...meshIds].filter(([part]) => reached.has(part))) } : {},
    ...attached.size > 0 ? { attached: Object.fromEntries(attached) } : {},
    parts,
    joints: ordered
  };
  const rest = poseRig(/* @__PURE__ */ new Map(), 0, draft).parts;
  const withAxes = ordered.map((joint) => {
    const parent = rest.get(joint.parentPart);
    if (isIdentity(parent.r)) return joint;
    const frame = multiply(parent, { p: [0, 0, 0], r: [...joint.parentRotation ?? [1, 0, 0, 0, 1, 0, 0, 0, 1]] });
    return { ...joint, restRotation: frame.r };
  });
  let rig2 = { ...draft, joints: withAxes };
  if (reading.declarations !== void 0) {
    const declared = declareRig(rig2, reading.declarations);
    if (!declared.ok) return declared;
    rig2 = declared.rig;
  }
  const drawn = drawnParts(rig2);
  const { low, high } = restBounds(rig2, drawn.length > 0 ? drawn : Object.keys(parts));
  rig2 = { ...rig2, ground: low };
  return { ok: true, rig: { ...rig2, scale: bodyScale(rig2, high - low) }, notes };
}
function weldedParts(reading, sizes, errors) {
  const attached = /* @__PURE__ */ new Map();
  if (reading.welded === void 0) return attached;
  if (!Array.isArray(reading.welded)) {
    errors.push("welded: must be a list");
    return attached;
  }
  if (reading.welded.length > MAX_WELDED_PARTS) {
    errors.push(`welded: a reading lists at most ${MAX_WELDED_PARTS} welded parts; this one lists ${reading.welded.length}`);
    return attached;
  }
  for (const entry of reading.welded) {
    const name = isRecord6(entry) && isName(entry.name) ? entry.name : "an entry";
    const offset = isRecord6(entry) ? numbers(entry.offset, 12) : void 0;
    const size = isRecord6(entry) ? numbers(entry.size, 3) : void 0;
    if (!isRecord6(entry) || !isName(entry.name) || !isName(entry.to) || !offset || !orthonormal(offset.slice(3)) || !size || size.some((value) => value <= 0)) {
      errors.push(`welded: ${name} must name itself and the part it moves with, with its offset as a CFrame's 12 components and a positive size`);
      continue;
    }
    if (entry.shape !== void 0 && !SHAPES.includes(entry.shape)) {
      errors.push(`welded: ${name}'s shape must be one of ${SHAPES.join(", ")}`);
      continue;
    }
    if (!isMeshId(entry.mesh)) {
      errors.push(`welded: ${name}'s mesh must be its MeshId`);
      continue;
    }
    if (!sizes.has(entry.to)) {
      errors.push(`welded: ${name} is welded to ${entry.to}, which is not one of the rig's parts`);
      continue;
    }
    const pieces = attached.get(entry.to) ?? [];
    pieces.push({
      part: entry.name,
      offset,
      size: [size[0], size[1], size[2]],
      shape: entry.shape ?? "Block",
      ...entry.mesh === void 0 ? {} : { mesh: entry.mesh }
    });
    attached.set(entry.to, pieces);
  }
  return attached;
}
function bodyScale(rig2, height) {
  const feet = new Set(rig2.feet);
  const rest = poseRig(/* @__PURE__ */ new Map(), 0, rig2).parts;
  const hips = Object.entries(rig2.limbs).filter(([name, limb]) => {
    const root = rig2.joints.find((joint) => joint.name === name);
    const last = limb.hinge ? rig2.joints.find((joint) => joint.name === limb.hinge).childPart : root.childPart;
    const foot = limb.foot ? rig2.joints.find((joint) => joint.name === limb.foot).childPart : void 0;
    return feet.has(last) || foot !== void 0 && feet.has(foot);
  }).map(([name]) => {
    const root = rig2.joints.find((joint) => joint.name === name);
    return pointToWorld(rest.get(root.parentPart), root.parentOffset)[1] - rig2.ground;
  }).filter((above) => above > 0);
  if (hips.length > 0) {
    const mean = hips.reduce((sum, above) => sum + above, 0) / hips.length;
    return { factor: mean / R15_RIG.hipHeight, basis: "its hips' height at rest" };
  }
  return { factor: height / R15_REST_HEIGHT, basis: "its height at rest" };
}

// cli.ts
function usage() {
  console.error(`usage: node animate.mjs <animation.json> [--out <file.lua>] [--sheet <file.png>] [--locomotion] [--grounded] [--waive id,id] [--parent <path>] [--rig-json <reading.json>]
Compiles a pose-format animation (see references/character-animation.md) for the stock R15 or R6 rig,
runs the motion checks, optionally renders a contact sheet PNG, and writes Luau that builds the
KeyframeSequence in Studio and registers a temporary preview id. Run that Luau with execute_luau.`);
  process.exit(2);
}
var args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith("-")) usage();
var input = args[0];
var opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : void 0;
};
var flag = (name) => args.includes(name);
var animation;
try {
  animation = JSON.parse(readFileSync(input, "utf8"));
} catch (e) {
  console.error(`Could not read ${input} as JSON: ${e.message}`);
  process.exit(1);
}
var model = void 0;
var rigJson = opt("--rig-json");
if (rigJson) {
  let reading;
  try {
    reading = JSON.parse(readFileSync(rigJson, "utf8"));
  } catch (e) {
    console.error(`Could not read ${rigJson}: ${e.message}`);
    process.exit(1);
  }
  const r = rigFromModel(reading);
  if (!r.ok) {
    console.log(JSON.stringify({ ok: false, errors: r.errors }, null, 2));
    process.exit(1);
  }
  model = r.rig;
  if (r.notes.length) console.error("rig notes:\n- " + r.notes.join("\n- "));
  if (animation && typeof animation === "object" && animation.rig !== reading.path) {
    console.error(`note: animation.rig set to the rig reading's path ${reading.path}`);
    animation.rig = reading.path;
  }
}
var result2 = prepareAnimation(animation, {
  locomotion: flag("--locomotion"),
  grounded: flag("--grounded"),
  waive: opt("--waive") ? opt("--waive").split(",") : void 0
}, model);
if (!result2.ok) {
  console.log(JSON.stringify({ ok: false, errors: result2.errors }, null, 2));
  process.exit(1);
}
var { sequence, report, failing, waived } = result2.value;
var rig = model ?? rigFor(sequence.rig);
var summary = {
  ok: failing.length === 0,
  name: sequence.name,
  rig: sequence.rig,
  loop: sequence.loop,
  priority: sequence.priority,
  duration: sequence.duration,
  keyframes: sequence.keyframes.length,
  poses: sequence.keyedPoseCount,
  markers: sequence.markerCount,
  inBetweens: sequence.inBetweenCount,
  failing,
  waived,
  checks: compactChecks(report)
};
var sheetPath = opt("--sheet");
if (sheetPath) {
  const sheet = renderContactSheet(sequence, void 0, { locomotion: flag("--locomotion"), rig });
  writeFileSync(sheetPath, sheet.png);
  summary.sheet = { path: sheetPath, times: sheet.times, labels: sheet.labels };
}
var outPath = opt("--out");
if (outPath) {
  const parent = opt("--parent") ?? "game.ServerStorage";
  writeFileSync(outPath, toLuau(sequence, parent));
  summary.luau = outPath;
}
console.log(JSON.stringify(summary, null, 2));
process.exit(failing.length === 0 ? 0 : 3);
function luaString(s) {
  return JSON.stringify(s);
}
function num(n) {
  return Number.isFinite(n) ? String(Math.round(n * 1e6) / 1e6) : "0";
}
function toLuau(seq, parent) {
  const L = [];
  L.push("-- Generated by roblox-vfx-animation/scripts/animate.mjs. Run with execute_luau.");
  L.push("local function P(name, w, c, es, ed, kids)");
  L.push('	local p = Instance.new("Pose")');
  L.push("	p.Name = name; p.Weight = w");
  L.push("	p.CFrame = CFrame.new(c[1],c[2],c[3],c[4],c[5],c[6],c[7],c[8],c[9],c[10],c[11],c[12])");
  L.push("	p.EasingStyle = Enum.PoseEasingStyle[es]; p.EasingDirection = Enum.PoseEasingDirection[ed]");
  L.push("	for _, k in kids do k.Parent = p end");
  L.push("	return p");
  L.push("end");
  L.push('local seq = Instance.new("KeyframeSequence")');
  L.push(`seq.Name = ${luaString(seq.name)}`);
  L.push(`seq.Loop = ${seq.loop ? "true" : "false"}`);
  L.push(`seq.Priority = Enum.AnimationPriority.${seq.priority}`);
  const pose = (p) => `P(${luaString(p.part)},${p.weight},{${p.cframe.map(num).join(",")}},${luaString(p.easingStyle)},${luaString(p.easingDirection)},{${p.children.map(pose).join(",")}})`;
  for (const k of seq.keyframes) {
    L.push("do");
    L.push('	local k = Instance.new("Keyframe")');
    L.push(`	k.Time = ${num(k.time)}`);
    if (k.name) L.push(`	k.Name = ${luaString(k.name)}`);
    L.push(`	${pose(k.root)}.Parent = k`);
    for (const m of k.markers ?? []) {
      L.push(`	do local m = Instance.new("KeyframeMarker"); m.Name = ${luaString(m.name)}; m.Value = ${luaString(m.value)}; m.Parent = k end`);
    }
    L.push("	k.Parent = seq");
    L.push("end");
  }
  L.push(`local folder = ${parent}:FindFirstChild("Animations") or Instance.new("Folder")`);
  L.push(`folder.Name = "Animations"; folder.Parent = ${parent}`);
  L.push("local old = folder:FindFirstChild(seq.Name)");
  L.push("if old then old:Destroy() end");
  L.push("seq.Parent = folder");
  L.push('local ok, id = pcall(function() return game:GetService("AnimationClipProvider"):RegisterAnimationClip(seq) end)');
  L.push("local previewId = ok and tostring(id) or nil");
  L.push('seq:SetAttribute("PreviewId", previewId)');
  L.push('return string.format("built %s (%d keyframes); preview id: %s", seq:GetFullName(), #seq:GetKeyframes(), tostring(previewId))');
  return L.join("\n") + "\n";
}
