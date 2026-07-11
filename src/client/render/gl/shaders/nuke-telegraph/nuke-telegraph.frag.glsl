#version 300 es
precision highp float;

in vec2 vLocal;
flat in float vInnerRadius;
flat in float vOuterRadius;
flat in float vRelation;        // 0 = self, 1 = ally, 2 = enemy
flat in vec2 vTarget;
flat in vec2 vSource;
flat in float vAircraft;
in vec2 vWorld;

uniform float uTime;            // seconds
uniform vec4 uTelegraphStyle;   // (strokeWidth, dashLen, gapLen, rotationSpeed)
uniform vec4 uTelegraphAlpha;   // (baseAlpha, pulseAmplitude, pulseSpeed, fillAlphaOffset)
uniform vec3 uColorSelf;
uniform vec3 uColorAlly;
uniform vec3 uColorEnemy;

out vec4 fragColor;

void main() {
  float strokeWidth = uTelegraphStyle.x;
  float dashLen = uTelegraphStyle.y;
  float gapLen = uTelegraphStyle.z;
  float rotationSpeed = uTelegraphStyle.w;
  float baseAlphaVal = uTelegraphAlpha.x;
  float pulseAmp = uTelegraphAlpha.y;
  float pulseSpd = uTelegraphAlpha.z;
  float fillAlphaOff = uTelegraphAlpha.w;

  float dist = length(vWorld - vTarget);

  // Base alpha with gentle pulsation
  float baseAlpha = baseAlphaVal + pulseAmp * sin(uTime * pulseSpd);

  // Inner circle: filled disc + stroke
  float innerFill = 1.0 - smoothstep(vInnerRadius - 0.5, vInnerRadius, dist);
  float innerStroke = smoothstep(vInnerRadius - strokeWidth - 0.5, vInnerRadius - strokeWidth, dist)
                    * (1.0 - smoothstep(vInnerRadius + strokeWidth, vInnerRadius + strokeWidth + 0.5, dist));

  // Outer circle: dashed ring
  float outerRing = smoothstep(vOuterRadius - strokeWidth - 0.5, vOuterRadius - strokeWidth, dist)
                  * (1.0 - smoothstep(vOuterRadius + strokeWidth, vOuterRadius + strokeWidth + 0.5, dist));

  // Dash pattern on outer ring
  float angle = atan(vLocal.y, vLocal.x);
  float arcPos = angle * vOuterRadius;
  float period = dashLen + gapLen;
  float dashPhase = mod(arcPos + uTime * rotationSpeed, period);
  float dashAlpha = 1.0 - smoothstep(dashLen - 0.5, dashLen + 0.5, dashPhase);

  // Combine
  float fillAlpha = innerFill * max(0.0, baseAlpha - fillAlphaOff);
  float strokeAlpha = innerStroke * baseAlpha;
  float outerAlpha = outerRing * dashAlpha * baseAlpha;

  // Every client sees the aircraft's strategic route as a red dashed line.
  vec2 ab = vTarget - vSource;
  float ab2 = max(dot(ab, ab), 0.001);
  float t = clamp(dot(vWorld - vSource, ab) / ab2, 0.0, 1.0);
  float lineDist = length(vWorld - (vSource + ab * t));
  float lineDash = step(fract((t * sqrt(ab2) + uTime * 2.5) / 5.0), 0.62);
  float routeAlpha = vAircraft * (1.0 - smoothstep(0.25, 0.65, lineDist)) * lineDash * 0.9;

  float alpha = max(max(max(fillAlpha, strokeAlpha), outerAlpha), routeAlpha);
  if (alpha < 0.01) discard;

  vec3 color = routeAlpha >= max(max(fillAlpha, strokeAlpha), outerAlpha)
             ? vec3(1.0, 0.08, 0.04)
             : vRelation < 0.5 ? uColorSelf
             : vRelation < 1.5 ? uColorAlly
             : uColorEnemy;
  fragColor = vec4(color, alpha);
}
