#version 300 es
precision highp float;

// Unit quad [0,1]
layout(location = 0) in vec2 aPos;
// Per-instance: x, y, innerRadius, outerRadius
layout(location = 1) in vec4 aInstance;
// Per-instance: 0 = self, 1 = ally, 2 = enemy
layout(location = 2) in vec4 aMeta; // relation, sourceX, sourceY, aircraft

uniform mat3 uCamera;
uniform mat4 uViewProjection;
uniform int uThreeD;
uniform highp usampler2D uTerrain;
uniform vec2 uMapSize;
uniform vec2 uThreeDCenter;
uniform float uDistance;
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uTilt;
uniform float uYaw;

float heightFor(uint b) {
  bool land = (b & 128u) != 0u;
  float m = float(b & 31u);
  if (land && m > 30.5) return 104.0;
  if (land) return 0.3 + pow(m / 30.0, 2.0) * 86.0;
  return -min(m, 10.0) * 0.02;
}

out vec2 vLocal;              // [-1, +1] local coords
flat out float vInnerRadius;
flat out float vOuterRadius;
flat out float vRelation;
flat out vec2 vTarget;
flat out vec2 vSource;
flat out float vRouteKind;
out vec2 vWorld;

void main() {
  vLocal = aPos * 2.0 - 1.0;
  vInnerRadius = aInstance.z;
  vOuterRadius = aInstance.w;
  vRelation = aMeta.x;
  vTarget = aInstance.xy + 0.5;
  vSource = aMeta.yz + 0.5;
  vRouteKind = aMeta.w;

  // Expand quad to cover outer circle bbox + padding
  float r = aInstance.w + 2.0;
  vec2 circleMin = vTarget - vec2(r);
  vec2 circleMax = vTarget + vec2(r);
  float hasRoute = step(0.5, vRouteKind);
  vec2 boxMin = mix(circleMin, min(circleMin, vSource - vec2(2.0)), hasRoute);
  vec2 boxMax = mix(circleMax, max(circleMax, vSource + vec2(2.0)), hasRoute);
  vec2 worldPos = mix(boxMin, boxMax, aPos);
  vWorld = worldPos;

  if (uThreeD == 1) {
    ivec2 cell = ivec2(clamp(floor(worldPos), vec2(0.0), uMapSize - 1.0));
    float h = heightFor(texelFetch(uTerrain, cell, 0).r) + 0.45;
    gl_Position = uViewProjection * vec4(worldPos.x, h, worldPos.y, 1.0);
  } else {
    vec3 clip = uCamera * vec3(worldPos, 1.0);
    gl_Position = vec4(clip.xy, 0.0, 1.0);
  }
}
