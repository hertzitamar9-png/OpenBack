#version 300 es
precision mediump float;

in float vAge;
uniform vec4 uColor;
out vec4 outColor;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float alpha = smoothstep(0.5, 0.08, length(p)) * (1.0 - vAge);
  outColor = vec4(uColor.rgb, uColor.a * alpha);
}
