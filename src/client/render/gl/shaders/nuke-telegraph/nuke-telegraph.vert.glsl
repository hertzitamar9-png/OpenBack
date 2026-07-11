#version 300 es
precision highp float;

// Unit quad [0,1]
layout(location = 0) in vec2 aPos;
// Per-instance: x, y, innerRadius, outerRadius
layout(location = 1) in vec4 aInstance;
// Per-instance: 0 = self, 1 = ally, 2 = enemy
layout(location = 2) in vec4 aMeta; // relation, sourceX, sourceY, aircraft

uniform mat3 uCamera;

out vec2 vLocal;              // [-1, +1] local coords
flat out float vInnerRadius;
flat out float vOuterRadius;
flat out float vRelation;
flat out vec2 vTarget;
flat out vec2 vSource;
flat out float vAircraft;
out vec2 vWorld;

void main() {
  vLocal = aPos * 2.0 - 1.0;
  vInnerRadius = aInstance.z;
  vOuterRadius = aInstance.w;
  vRelation = aMeta.x;
  vTarget = aInstance.xy + 0.5;
  vSource = aMeta.yz + 0.5;
  vAircraft = aMeta.w;

  // Expand quad to cover outer circle bbox + padding
  float r = aInstance.w + 2.0;
  vec2 circleMin = vTarget - vec2(r);
  vec2 circleMax = vTarget + vec2(r);
  vec2 boxMin = mix(circleMin, min(circleMin, vSource - vec2(2.0)), vAircraft);
  vec2 boxMax = mix(circleMax, max(circleMax, vSource + vec2(2.0)), vAircraft);
  vec2 worldPos = mix(boxMin, boxMax, aPos);
  vWorld = worldPos;

  vec3 clip = uCamera * vec3(worldPos, 1.0);
  gl_Position = vec4(clip.xy, 0.0, 1.0);
}
