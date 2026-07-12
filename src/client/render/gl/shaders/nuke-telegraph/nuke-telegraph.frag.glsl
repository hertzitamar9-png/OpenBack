#version 300 es
precision highp float;

in vec2 vLocal;
flat in float vInnerRadius;
flat in float vOuterRadius;
flat in float vRelation;        // 0 = self, 1 = ally, 2 = enemy
flat in vec2 vTarget;
flat in vec2 vSource;
flat in float vRouteKind;
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

  float isTank = step(1.5, vRouteKind);

  // Aircraft/nukes use the rotating airborne warning. Tanks use a quieter
  // ground reticle below so the two destinations never read as the same unit.
  float innerFill = 1.0 - smoothstep(vInnerRadius - 0.5, vInnerRadius, dist);
  float innerStroke = smoothstep(vInnerRadius - strokeWidth - 0.5, vInnerRadius - strokeWidth, dist)
                    * (1.0 - smoothstep(vInnerRadius + strokeWidth, vInnerRadius + strokeWidth + 0.5, dist));

  // Outer circle: dashed ring
  float outerRing = smoothstep(vOuterRadius - strokeWidth - 0.5, vOuterRadius - strokeWidth, dist)
                  * (1.0 - smoothstep(vOuterRadius + strokeWidth, vOuterRadius + strokeWidth + 0.5, dist));

  // Dash pattern on outer ring
  // Use world-space direction. vLocal belongs to a route-expanded rectangle,
  // so using it here stretched tank dashes into the asymmetric shape seen in
  // game whenever source and target were far apart.
  vec2 radial = vWorld - vTarget;
  float angle = atan(radial.y, radial.x);
  float arcPos = angle * vOuterRadius;
  float period = dashLen + gapLen;
  float dashPhase = mod(arcPos + uTime * rotationSpeed, period);
  float dashAlpha = 1.0 - smoothstep(dashLen - 0.5, dashLen + 0.5, dashPhase);

  // Combine
  float fillAlpha = innerFill * max(0.0, baseAlpha - fillAlphaOff) * (1.0 - isTank);
  float strokeAlpha = innerStroke * baseAlpha * (1.0 - isTank);
  float outerAlpha = outerRing * dashAlpha * baseAlpha * (1.0 - isTank);

  // Tank destination: steady green segmented ring, crosshair brackets and a
  // slow inward scan ripple instead of the aircraft's flashing filled circle.
  float tankRing = outerRing * step(fract((angle + 3.14159) * 5.0), 0.62);
  float axis = min(abs(vWorld.x - vTarget.x), abs(vWorld.y - vTarget.y));
  float bracketBand = step(vInnerRadius * 0.55, dist)
                    * (1.0 - step(vInnerRadius * 0.95, dist));
  float tankCrosshair = (1.0 - smoothstep(0.18, 0.42, axis)) * bracketBand;
  float rippleRadius = vOuterRadius * (0.25 + 0.65 * fract(uTime * 0.22));
  float tankRipple = 1.0 - smoothstep(0.35, 0.8, abs(dist - rippleRadius));
  float tankReticle = isTank * max(tankRing * 0.8,
      max(tankCrosshair * 0.72, tankRipple * 0.32));

  // Every client sees the aircraft's strategic route as a red dashed line.
  vec2 ab = vTarget - vSource;
  float ab2 = max(dot(ab, ab), 0.001);
  float t = clamp(dot(vWorld - vSource, ab) / ab2, 0.0, 1.0);
  float lineDist = length(vWorld - (vSource + ab * t));
  float lineDash = step(fract((t * sqrt(ab2) + uTime * 2.5) / 5.0), 0.62);
  float hasRoute = step(0.5, vRouteKind);
  float routeAlpha = hasRoute * (1.0 - smoothstep(0.25, 0.65, lineDist)) * lineDash * 0.9;

  float alpha = max(max(max(max(fillAlpha, strokeAlpha), outerAlpha), routeAlpha), tankReticle);
  if (alpha < 0.01) discard;

  vec3 routeColor = vRouteKind > 1.5 ? vec3(0.2, 1.0, 0.32) : vec3(1.0, 0.08, 0.04);
  vec3 color = tankReticle >= max(max(max(fillAlpha, strokeAlpha), outerAlpha), routeAlpha)
             ? vec3(0.18, 1.0, 0.3)
             : routeAlpha >= max(max(fillAlpha, strokeAlpha), outerAlpha)
             ? routeColor
             : vRelation < 0.5 ? uColorSelf
             : vRelation < 1.5 ? uColorAlly
             : uColorEnemy;
  fragColor = vec4(color, alpha);
}
