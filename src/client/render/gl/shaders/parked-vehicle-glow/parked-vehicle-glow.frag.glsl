#version 300 es
precision highp float;

in vec2 vLocal;
in vec3 vOwnerColor;

uniform float uTick;

out vec4 fragColor;

void main() {
  float distanceFromCenter = length(vLocal);
  float falloff = 1.0 - smoothstep(0.18, 1.0, distanceFromCenter);
  if (falloff <= 0.001) discard;

  float pulse = 0.78 + 0.16 * sin(uTick * 0.12);
  vec3 color = mix(vOwnerColor, vec3(1.0), 0.18);
  fragColor = vec4(color, falloff * 0.52 * pulse);
}
