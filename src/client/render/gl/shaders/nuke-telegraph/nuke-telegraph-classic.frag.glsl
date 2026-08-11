#version 300 es
precision highp float;

in vec2 vLocal;
flat in float vInnerRadius;
flat in float vOuterRadius;
flat in float vRelation;

uniform float uTime;
uniform vec4 uTelegraphStyle;
uniform vec4 uTelegraphAlpha;
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

  float paddedR = vOuterRadius + 2.0;
  float dist = length(vLocal) * paddedR;
  float baseAlpha = baseAlphaVal + pulseAmp * sin(uTime * pulseSpd);

  float innerFill = 1.0 - smoothstep(vInnerRadius - 0.5, vInnerRadius, dist);
  float innerStroke =
    smoothstep(vInnerRadius - strokeWidth - 0.5, vInnerRadius - strokeWidth, dist) *
    (1.0 - smoothstep(vInnerRadius + strokeWidth, vInnerRadius + strokeWidth + 0.5, dist));

  float outerRing =
    smoothstep(vOuterRadius - strokeWidth - 0.5, vOuterRadius - strokeWidth, dist) *
    (1.0 - smoothstep(vOuterRadius + strokeWidth, vOuterRadius + strokeWidth + 0.5, dist));
  float angle = atan(vLocal.y, vLocal.x);
  float arcPos = angle * vOuterRadius;
  float period = dashLen + gapLen;
  float dashPhase = mod(arcPos + uTime * rotationSpeed, period);
  float dashAlpha = 1.0 - smoothstep(dashLen - 0.5, dashLen + 0.5, dashPhase);

  float fillAlpha = innerFill * max(0.0, baseAlpha - fillAlphaOff);
  float strokeAlpha = innerStroke * baseAlpha;
  float outerAlpha = outerRing * dashAlpha * baseAlpha;
  float alpha = max(max(fillAlpha, strokeAlpha), outerAlpha);
  if (alpha < 0.01) discard;

  vec3 color = vRelation < 0.5
    ? uColorSelf
    : vRelation < 1.5
      ? uColorAlly
      : uColorEnemy;
  fragColor = vec4(color, alpha);
}
