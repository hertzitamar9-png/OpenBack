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
uniform mat4 uViewProjection;
uniform int uThreeD;
uniform vec2 uThreeDCenter;
uniform vec2 uViewport;
uniform float uDistance;
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uTilt;
uniform float uYaw;
uniform float uZoom;
uniform highp usampler2D uTerrain;
uniform vec2 uMapSize;

float heightFor(uint b) {
  bool land = (b & 128u) != 0u;
  float m = float(b & 31u);
  if (land && m > 30.5) return 52.0;
  if (land) return 0.15 + pow(m / 30.0, 2.0) * 43.0;
  return -min(m, 10.0) * 0.02;
}

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
    ivec2 terrainCell = ivec2(clamp(floor(center), vec2(0.0), uMapSize - 1.0));
    float groundHeight = heightFor(texelFetch(uTerrain, terrainCell, 0).r) + 0.35;
    vec4 centerClip4 = uViewProjection * vec4(center.x, groundHeight, center.y, 1.0);
    if (centerClip4.w <= 0.0) {
      gl_Position = vec4(2.0);
      return;
    }
    vec2 centerClip = centerClip4.xy / centerClip4.w;
    // Marker geometry is screen-facing UI: its center follows the 3D ground,
    // while its local X/Y radius stays circular and selectable.
    vec2 clipOffset = local * r * uZoom * vec2(2.0) / uViewport;
    gl_Position = vec4(centerClip + clipOffset, 0.0, 1.0);
  } else {
    vec3 clip = uCamera * vec3(worldPos, 1.0);
    gl_Position = vec4(clip.xy, 0.0, 1.0);
  }
}
