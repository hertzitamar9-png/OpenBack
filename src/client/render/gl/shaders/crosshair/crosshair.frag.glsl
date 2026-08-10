#version 300 es
precision highp float;

in vec2 vLocal; // [-1, +1]

uniform vec3 uColor;
uniform int uShape; // 0 = crosshair, 1 = compact nuke landing target

out vec4 fragColor;

const float LINE_HALF_W = 0.10; // line half-width (normalized to quad)
const float AA = 0.02;          // anti-alias width

void main() {
  float ax = abs(vLocal.x);
  float ay = abs(vLocal.y);

  if (uShape == 1) {
    float radius = length(vLocal);
    float ring = smoothstep(0.72, 0.66, radius)
               * (1.0 - smoothstep(0.86, 0.92, radius));
    float dot = 1.0 - smoothstep(0.08, 0.16, radius);
    float notchH = smoothstep(0.10, 0.04, ay)
                 * smoothstep(0.34, 0.42, ax)
                 * (1.0 - smoothstep(0.92, 0.98, ax));
    float notchV = smoothstep(0.10, 0.04, ax)
                 * smoothstep(0.34, 0.42, ay)
                 * (1.0 - smoothstep(0.92, 0.98, ay));
    float targetMask = max(max(ring, dot), max(notchH, notchV));
    if (targetMask < 0.01) discard;
    fragColor = vec4(uColor, targetMask);
    return;
  }

  // Two continuous perpendicular aiming lines.
  float hMask = smoothstep(LINE_HALF_W + AA, LINE_HALF_W - AA, ay)
              * (1.0 - smoothstep(1.0 - AA, 1.0, ax));

  // Vertical arm: |x| < lineWidth, |y| > gap
  float vMask = smoothstep(LINE_HALF_W + AA, LINE_HALF_W - AA, ax)
              * (1.0 - smoothstep(1.0 - AA, 1.0, ay));

  float mask = max(hMask, vMask);
  if (mask < 0.01) discard;

  fragColor = vec4(uColor, mask);
}
