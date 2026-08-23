#version 300 es
precision highp float;

in vec2 vLocal; // [-1, +1]

uniform vec3 uColor;
uniform float uIsDiagonal;
uniform float uReticleStyle;
uniform float uAlpha;

uniform sampler2D uStatusAtlas;
uniform float uHasAtlas;

out vec4 fragColor;

const float LINE_HALF_W = 0.10; // line half-width (normalized to quad)
const float NORMAL_OUTLINE_HALF_W = 0.14;
const float AA = 0.02;          // anti-alias width

const vec3 OUTLINE_BLACK = vec3(0.0);
const vec3 ALLIANCE_GREEN = vec3(0.0, 0.9, 0.2); // Official Alliance Green

// 8 unit directions for the outline dilation sample ring (matching status-icon.frag.glsl)
const vec2 kRing[8] = vec2[8](
  vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0),
  vec2(0.707, 0.707), vec2(-0.707, 0.707),
  vec2(0.707, -0.707), vec2(-0.707, -0.707)
);

void main() {
  if (uIsDiagonal > 0.5) {
    // 1. Calculate Diagonal X with black outline
    float d1 = abs(vLocal.x - vLocal.y) * 0.7071;
    float d2 = abs(vLocal.x + vLocal.y) * 0.7071;
    float minD = min(d1, d2);
    float circleMask = 1.0 - smoothstep(0.85, 0.98, length(vLocal));
    float lineAlpha = (1.0 - smoothstep(0.08, 0.16, minD)) * circleMask;
    float outlineAlpha = (1.0 - smoothstep(0.20, 0.30, minD)) * circleMask;
    float blend = outlineAlpha > 0.01 ? lineAlpha / outlineAlpha : 1.0;
    vec3 xCol = mix(OUTLINE_BLACK, uColor, blend);
    float xAlpha = outlineAlpha;

    // 2. Alliance Handshake Icon with 8-ring dark outline (matching status-icon.frag.glsl)
    vec4 iconTexel = vec4(0.0);
    if (uHasAtlas > 0.5) {
      // Map vLocal [-1.10, +1.10] to icon UV [0, 1] (Y flipped for WebGL)
      vec2 iconUV = vec2(
        (vLocal.x / 1.50) + 0.5,
        1.0 - ((vLocal.y / 1.50) + 0.5)
      );

      if (iconUV.x >= 0.0 && iconUV.x <= 1.0 && iconUV.y >= 0.0 && iconUV.y <= 1.0) {
        // Handshake Icon UV in status-atlas.png (col 0, row 1, cell 256x256, 16px pad)
        // mix(16/768, 240/768, iconUV.x) and mix(272/1024, 496/1024, iconUV.y)
        vec2 atlasUV = vec2(
          mix(0.0208333, 0.3125, iconUV.x),
          mix(0.265625, 0.484375, iconUV.y)
        );
        iconTexel = texture(uStatusAtlas, atlasUV);

        // 8-ring dark outline dilation (matching status-icon.frag.glsl)
        float uStatusOutlinePx = 4.0; // 4px outline radius
        vec2 uStatusTexel = vec2(1.0 / 768.0, 1.0 / 1024.0);
        vec2 sampleStep = uStatusTexel * uStatusOutlinePx;
        float ring = 0.0;
        for (int i = 0; i < 8; i++) {
          ring = max(ring, texture(uStatusAtlas, atlasUV + kRing[i] * sampleStep).a);
        }
        float outlineA = ring * (1.0 - iconTexel.a);
        iconTexel = vec4(mix(OUTLINE_BLACK, iconTexel.rgb, iconTexel.a), max(iconTexel.a, outlineA));
      }
    }

    // 3. Composite Alliance Handshake OVER the Red X reticle
    vec3 finalCol = mix(xCol, iconTexel.rgb, iconTexel.a);
    float finalAlpha = max(xAlpha, iconTexel.a);

    if (finalAlpha < 0.01) discard;
    fragColor = vec4(finalCol, finalAlpha * uAlpha);
  } else {
    vec2 p = vLocal;
    float ax = abs(p.x);
    float ay = abs(p.y);
    float r = length(p);
    float mask = 0.0;
    float outlineMask = 0.0;

    if (uReticleStyle < 0.5) {
      // Warship: restrained classic cross.
      float hMask = smoothstep(LINE_HALF_W + AA, LINE_HALF_W - AA, ay)
                  * (1.0 - smoothstep(1.0 - AA, 1.0, ax));
      float vMask = smoothstep(LINE_HALF_W + AA, LINE_HALF_W - AA, ax)
                  * (1.0 - smoothstep(1.0 - AA, 1.0, ay));
      mask = max(hMask, vMask);
      float hOutline = smoothstep(
        NORMAL_OUTLINE_HALF_W + AA,
        NORMAL_OUTLINE_HALF_W - AA,
        ay
      ) * (1.0 - smoothstep(1.0 - AA, 1.0, ax));
      float vOutline = smoothstep(
        NORMAL_OUTLINE_HALF_W + AA,
        NORMAL_OUTLINE_HALF_W - AA,
        ax
      ) * (1.0 - smoothstep(1.0 - AA, 1.0, ay));
      outlineMask = max(hOutline, vOutline);
    } else if (uReticleStyle < 1.5) {
      // Aircraft: four light corner brackets and a precise center point.
      float cornerH = (1.0 - smoothstep(0.055, 0.085, abs(ay - 0.62)))
                    * smoothstep(0.30, 0.36, ax)
                    * (1.0 - smoothstep(0.62, 0.66, ax));
      float cornerV = (1.0 - smoothstep(0.055, 0.085, abs(ax - 0.62)))
                    * smoothstep(0.30, 0.36, ay)
                    * (1.0 - smoothstep(0.62, 0.66, ay));
      float center = 1.0 - smoothstep(0.07, 0.11, r);
      mask = max(max(cornerH, cornerV), center);

      float cornerHO = (1.0 - smoothstep(0.11, 0.15, abs(ay - 0.62)))
                     * smoothstep(0.25, 0.31, ax)
                     * (1.0 - smoothstep(0.67, 0.72, ax));
      float cornerVO = (1.0 - smoothstep(0.11, 0.15, abs(ax - 0.62)))
                     * smoothstep(0.25, 0.31, ay)
                     * (1.0 - smoothstep(0.67, 0.72, ay));
      float centerO = 1.0 - smoothstep(0.13, 0.17, r);
      outlineMask = max(max(cornerHO, cornerVO), centerO);
    } else if (uReticleStyle < 2.5) {
      // Tank: compact circular ground lock with four cardinal range ticks.
      float ring = 1.0 - smoothstep(0.045, 0.075, abs(r - 0.52));
      float ticksH = smoothstep(0.66, 0.70, ax)
                   * (1.0 - smoothstep(0.88, 0.92, ax))
                   * (1.0 - smoothstep(0.045, 0.075, ay));
      float ticksV = smoothstep(0.66, 0.70, ay)
                   * (1.0 - smoothstep(0.88, 0.92, ay))
                   * (1.0 - smoothstep(0.045, 0.075, ax));
      float center = 1.0 - smoothstep(0.065, 0.105, r);
      mask = max(max(ring, max(ticksH, ticksV)), center);

      float ringO = 1.0 - smoothstep(0.105, 0.14, abs(r - 0.52));
      float ticksHO = smoothstep(0.61, 0.66, ax)
                    * (1.0 - smoothstep(0.92, 0.97, ax))
                    * (1.0 - smoothstep(0.10, 0.14, ay));
      float ticksVO = smoothstep(0.61, 0.66, ay)
                    * (1.0 - smoothstep(0.92, 0.97, ay))
                    * (1.0 - smoothstep(0.10, 0.14, ax));
      float centerO = 1.0 - smoothstep(0.125, 0.17, r);
      outlineMask = max(max(ringO, max(ticksHO, ticksVO)), centerO);
    } else {
      // MIRV: unmistakable segmented strike lock, separate from vehicle UI.
      const float PI = 3.14159265359;
      float segment = step(0.24, fract((atan(p.y, p.x) + PI) / (PI * 0.25)));
      float outer = (1.0 - smoothstep(0.04, 0.07, abs(r - 0.72))) * segment;
      float inner = 1.0 - smoothstep(0.04, 0.07, abs(r - 0.30));
      float center = 1.0 - smoothstep(0.055, 0.09, r);
      mask = max(max(outer, inner), center);

      float outerO = (1.0 - smoothstep(0.095, 0.13, abs(r - 0.72)))
                   * segment;
      float innerO = 1.0 - smoothstep(0.095, 0.13, abs(r - 0.30));
      float centerO = 1.0 - smoothstep(0.115, 0.155, r);
      outlineMask = max(max(outerO, innerO), centerO);
    }

    if (outlineMask < 0.01) discard;
    float innerBlend = outlineMask > 0.01 ? mask / outlineMask : 1.0;
    fragColor = vec4(
      mix(OUTLINE_BLACK, uColor, clamp(innerBlend, 0.0, 1.0)),
      outlineMask * uAlpha
    );
  }
}
