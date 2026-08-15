#version 300 es
precision highp float;
precision highp usampler2D;

layout(location = 0) in vec2 aPos;

// Per-instance attributes
layout(location = 1) in vec3 aInstPos;   // x, y, ownerID
layout(location = 2) in vec3 aInstFlags; // atlasIdx, flags, flickerHash (uint8→float)
layout(location = 3) in float aAngle;    // sprite heading (radians, screen space)

uniform mat3  uCamera;
uniform bool uThreeD;
uniform mat4 uThreeDViewProjection;
uniform usampler2D uThreeDTerrain;
uniform vec2 uThreeDMapSize;
uniform vec2 uThreeDScreenScale;
uniform int uThreeDModelMask;

uniform float uUnitSize;
uniform float uHBombGlowScale; // quad enlargement for the hydrogen bomb glow halo

out vec2  vQuadPos;     // quad coords [0,1] — drives the radial glow falloff
out vec2  vCellUV;      // sprite cell coords; the central 1/scale region is the sprite
flat out float vAtlasCol;
flat out float vOwnerID;
flat out float vFlags;  // 0.0 = normal, 1.0 = flicker, 2.0 = angry
flat out float vHash;   // per-instance hash for flicker phase offset
flat out float vGlow;   // 1.0 if this instance is a hydrogen bomb (draw glow), else 0.0
out float vAngle;      // sprite heading (radians) for plane rotation

float terrainHeightAt(ivec2 p) {
  p = clamp(p, ivec2(0), ivec2(uThreeDMapSize) - 1);
  uint terrainByte = texelFetch(uThreeDTerrain, p, 0).r;
  bool land = (terrainByte & 128u) != 0u;
  float magnitude = float(terrainByte & 31u);
  if (land && magnitude > 30.5) return 57.0;
  if (land) return (0.15 + pow(magnitude / 30.0, 2.0) * 31.0) * 1.5;
  return -min(magnitude, 10.0) * 0.02;
}

float smoothTerrainHeight(vec2 world) {
  vec2 samplePos = world - vec2(0.5);
  ivec2 p = ivec2(floor(samplePos));
  vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(samplePos));
  float center = mix(
    mix(terrainHeightAt(p), terrainHeightAt(p + ivec2(1, 0)), f.x),
    mix(terrainHeightAt(p + ivec2(0, 1)), terrainHeightAt(p + ivec2(1, 1)), f.x),
    f.y
  );
  float r = 1.5;
  float cardinals =
    terrainHeightAt(ivec2(floor(samplePos + vec2(r, 0.0)))) +
    terrainHeightAt(ivec2(floor(samplePos - vec2(r, 0.0)))) +
    terrainHeightAt(ivec2(floor(samplePos + vec2(0.0, r)))) +
    terrainHeightAt(ivec2(floor(samplePos - vec2(0.0, r))));
  float diagonals =
    terrainHeightAt(ivec2(floor(samplePos + vec2(r, r)))) +
    terrainHeightAt(ivec2(floor(samplePos + vec2(r, -r)))) +
    terrainHeightAt(ivec2(floor(samplePos + vec2(-r, r)))) +
    terrainHeightAt(ivec2(floor(samplePos - vec2(r, r))));
  return (center * 8.0 + cardinals * 2.0 + diagonals) / 20.0;
}

void main() {
  float worldX = aInstPos.x;
  float worldY = aInstPos.y;
  vOwnerID = aInstPos.z;

  float atlasCol = aInstFlags.x;
  vFlags = aInstFlags.y;
  vAtlasCol = atlasCol;

  // Per-instance hash so each unit flickers independently. Computed CPU-side
  // from the tick position — hashing worldX/Y here would re-roll the phase
  // every frame for nukes whose position is smoothed per frame.
  vHash = aInstFlags.z * (1.0 / 255.0);

  // Hydrogen bombs render an enlarged quad so there's room for a glow halo
  // around the sprite. All other units keep scale 1 (no behavior change).
  float isHBomb = step(abs(atlasCol - float(HYDROGEN_BOMB_COL)), 0.5);
  float isPlane = step(abs(atlasCol - float(PLANE_COL)), 0.5);
  float isTank = step(abs(atlasCol - float(TANK_COL)), 0.5);
  float tankSelfDestruct = isTank * step(19.5, vFlags);
  float fuelTrain = step(abs(vFlags - 8.0), 0.1);
  float tankFireball = step(abs(vFlags - 9.0), 0.1);
  // Ships and nuclear projectiles have dedicated terrain-anchored 3D models.
  // The ordinary tank and its terminal body remain the classic sprite. The
  // dedicated 3D pass adds only the raised turret/projectile presentation.
  int modelBit = 1 << int(atlasCol + 0.5);
  bool dedicatedThreeD = (uThreeDModelMask & modelBit) != 0;
  if (uThreeD && dedicatedThreeD) {
    gl_Position=vec4(2.0,2.0,0.0,1.0);
    return;
  }
  vGlow = isHBomb;
  float scale = mix(1.0, uHBombGlowScale, isHBomb);
  // Aircraft need a readable silhouette at normal map zoom.
  // Give loading smoke room around the parked plane. The tank stays compact
  // enough to fit comfortably within one territory tile.
  float launchSmoke = isPlane * max(
    step(abs(vFlags - 6.0), 0.1),
    step(abs(vFlags - 7.0), 0.1)
  );
  scale = mix(scale, mix(1.30, 2.65, launchSmoke), isPlane);
  // Tank is kept smaller than the military-base model (configured ~1.2 scale).
  // The full vertical launch reaches well above the tank; reserve enough quad
  // space that the fireball never clips at the apex or on its descent.
  scale = mix(scale, mix(0.6, 1.8, tankSelfDestruct), isTank);
  // Fuel trains use an enlarged effect quad for smoke/sparks, but vCellUV
  // maps their actual model back to normal city/factory-train dimensions.
  scale = mix(scale, 1.7, fuelTrain);
  scale = mix(scale, 1.55, tankFireball);

  // UNIT_SIZE is in world-space tiles — no zoom division needed.
  // Units scale with the map like territory tiles do.
  float halfSize = uUnitSize * 0.5 * scale;

  // Rotate the quad about its center by the sprite heading so the plane's
  // nose tracks its travel direction. Screen space is y-down, so a positive
  // angle rotates clockwise (which is the convention the angle is supplied in).
  float c = cos(aAngle);
  float s = sin(aAngle);
  vec2 local = (aPos - 0.5) * halfSize * 2.0;
  vec2 rotated = vec2(
    local.x * c - local.y * s,
    local.x * s + local.y * c
  );
  vec2 center = vec2(worldX + 0.5, worldY + 0.5);
  vec2 worldPos = center + rotated;

  if (uThreeD) {
    float terrainHeight = smoothTerrainHeight(center);
    vec4 anchor=uThreeDViewProjection*vec4(center.x,terrainHeight+0.18,center.y,1.0);
    if(anchor.w<=0.0001){gl_Position=vec4(2.0,2.0,0.0,1.0);return;}
    vec2 ndc=anchor.xy/anchor.w+rotated*uThreeDScreenScale;
    gl_Position=vec4(ndc,0.0,1.0);
  } else {
    vec3 clip = uCamera * vec3(worldPos, 1.0);
    if (clip.z <= 0.0001) {
      gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
      return;
    }
    gl_Position = vec4(clip.xy / clip.z, 0.0, 1.0);
  }

  vQuadPos = aPos;
  vAngle = aAngle;

  // Map the enlarged quad back to sprite cell space: the central 1/scale
  // portion is the sprite, anything outside [0,1] is glow-only margin.
  float drawScale = scale;
  if (fuelTrain > 0.5) {
    // Shrink the visible train within its enlarged quad (kept for the front
    // smokestack plume) so the camo train reads smaller.
    drawScale = scale * 1.3;
  }
  vCellUV = (isPlane > 0.5 && launchSmoke < 0.5) ||
            (isTank > 0.5 && tankSelfDestruct < 0.5)
    ? aPos
    : (aPos - 0.5) * drawScale + 0.5;
}
