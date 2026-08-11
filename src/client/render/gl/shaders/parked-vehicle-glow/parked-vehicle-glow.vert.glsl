#version 300 es
precision highp float;

layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec2 aCenter;
layout(location = 2) in vec3 aOwnerColor;

uniform mat3 uCamera;
uniform float uRadius;

out vec2 vLocal;
out vec3 vOwnerColor;

void main() {
  vLocal = aCorner * 2.0 - 1.0;
  vOwnerColor = aOwnerColor;

  vec2 world = aCenter + vec2(0.5) + vLocal * uRadius;
  vec3 clip = uCamera * vec3(world, 1.0);
  if (clip.z <= 0.0001) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  gl_Position = vec4(clip.xy / clip.z, 0.0, 1.0);
}
