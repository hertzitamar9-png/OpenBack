#version 300 es
precision highp float;

layout(location = 0) in vec2 aPos;

// Per-instance attributes
layout(location = 1) in vec3 aInstPos;   // x, y, ownerID
layout(location = 2) in vec3 aInstFlags; // atlasIdx, flags, flickerHash (uint8→float)
layout(location = 3) in float aAngle;    // sprite heading (radians, screen space)

uniform mat3  uCamera;

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
  vGlow = isHBomb;
  float scale = mix(1.0, uHBombGlowScale, isHBomb);
  // Aircraft need a readable silhouette at normal map zoom.
  scale = mix(scale, 1.12, isPlane);
  scale = mix(scale, 1.55, isTank);

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

  vec3 clip = uCamera * vec3(worldPos, 1.0);
  gl_Position = vec4(clip.xy, 0.0, 1.0);

  vQuadPos = aPos;
  vAngle = aAngle;

  // Map the enlarged quad back to sprite cell space: the central 1/scale
  // portion is the sprite, anything outside [0,1] is glow-only margin.
  vCellUV = (isPlane > 0.5 || isTank > 0.5) ? aPos : (aPos - 0.5) * scale + 0.5;
}
