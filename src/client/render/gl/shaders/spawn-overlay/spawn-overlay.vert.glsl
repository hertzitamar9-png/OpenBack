#version 300 es
precision highp float;

// Unit quad [0,1]
layout(location = 0) in vec2 aPos;
// Per-instance: centerX, centerY, quadRadius, kind
//   kind: 0 = enemy tile highlight, 1 = self ring, 2 = teammate ring
layout(location = 1) in vec4 aInstance;
// Per-instance: r, g, b (base color)
layout(location = 2) in vec3 aColor;

uniform mat3 uCamera;
uniform int uThreeD;
uniform vec2 uThreeDCenter;
uniform vec2 uViewport;
uniform float uDistance;
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uTilt;
uniform float uYaw;
uniform float uZoom;

out vec2 vWorldPos;     // tile-space position of this fragment
flat out vec2 vCenter;  // spawn center (tile coords)
flat out float vKind;
flat out vec3 vColor;

void main() {
  vec2 local = aPos * 2.0 - 1.0; // [-1, +1]
  vec2 center = aInstance.xy;
  float r = aInstance.z;
  vKind = aInstance.w;
  vColor = aColor;
  vCenter = center;

  vec2 worldPos = center + local * r;
  vWorldPos = worldPos;

  if (uThreeD == 1) {
    vec2 d = center - uThreeDCenter;
    float cy = cos(uYaw), sy = sin(uYaw);
    d = vec2(d.x * cy - d.y * sy, d.x * sy + d.y * cy);
    float ct = cos(uTilt), st = sin(uTilt);
    float groundHeight = 1.8;
    float viewY = -d.y * ct + groundHeight * st;
    float viewZ = uDistance - d.y * st - groundHeight * ct;
    if (viewZ <= 0.5) {
      gl_Position = vec4(2.0);
      return;
    }
    vec2 centerClip = vec2(
      d.x / (viewZ * uTanHalfFov * uAspect),
      viewY / (viewZ * uTanHalfFov)
    );
    // Marker geometry is screen-facing UI: its center follows the 3D ground,
    // while its local X/Y radius stays circular and selectable.
    vec2 clipOffset = local * r * uZoom * vec2(2.0) / uViewport;
    gl_Position = vec4(centerClip + clipOffset, 0.0, 1.0);
  } else {
    vec3 clip = uCamera * vec3(worldPos, 1.0);
    gl_Position = vec4(clip.xy, 0.0, 1.0);
  }
}
