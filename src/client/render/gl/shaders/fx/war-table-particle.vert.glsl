#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec4 aEffect;

uniform mat3 uCamera;

out float vAge;

void main() {
  vec2 center = aEffect.xy;
  float radius = clamp(aEffect.z, 0.15, 12.0);
  vAge = clamp(aEffect.w, 0.0, 1.0);
  vec2 world = center + (aPosition - 0.5) * radius * 2.0;
  vec3 clip = uCamera * vec3(world, 1.0);
  gl_Position = vec4(clip.xy, 0.0, clip.z);
}
