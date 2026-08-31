#version 300 es
precision highp float;
precision highp usampler2D;

layout(location = 0) in vec2 aPos;

// Per-instance: worldX, worldY, cursorX, charCode
layout(location = 1) in vec4 aInst;
layout(location = 2) in float aAtlasIdx;

uniform sampler2D uGlyphMetrics;  // CHAR_RANGE x 2, RGBA32F

uniform mat3  uCamera;
uniform int uScreenFacing;
uniform vec2 uScreenFacingScale;
uniform int uThreeD;
uniform mat4 uThreeDViewProjection;
uniform usampler2D uThreeDTerrain;
uniform vec2 uThreeDMapSize;
uniform float uZoom;

// Structure icon sizing (mirrors structure.vert.glsl)
uniform float uIconSize;
uniform float uDotsThreshold;
uniform float uScaleFactor;
uniform float uIconGrowZoom;

// Text sizing
uniform float uFontSize;
uniform float uAtlasScaleH;
uniform float uBase;
uniform float uLevelScale;
uniform float uLevelOffsetY;  // extra height above icon, in halfIconSize units
const float MAX_SCREEN_SIZE = 0.045;

out vec2 vUV;
flat out float vAlive;
flat out float vAtlasIdx;

float terrainHeightAt(ivec2 p) {
  p = clamp(p, ivec2(0), ivec2(uThreeDMapSize) - 1);
  uint terrainByte = texelFetch(uThreeDTerrain, p, 0).r;
  bool land = (terrainByte & 128u) != 0u;
  float magnitude = float(terrainByte & 31u);
  if (land && magnitude > 30.5) return 57.0;
  if (land) return (0.15 + pow(magnitude / 30.0, 2.0) * 31.0) * 1.5;
  return -min(magnitude, 10.0) * 0.02;
}

float smoothTerrainHeight(vec2 world) {
  vec2 samplePos = world - vec2(0.5);
  ivec2 p = ivec2(floor(samplePos));
  vec2 f = smoothstep(vec2(0.0), vec2(1.0), fract(samplePos));
  float center = mix(
    mix(terrainHeightAt(p), terrainHeightAt(p + ivec2(1, 0)), f.x),
    mix(terrainHeightAt(p + ivec2(0, 1)), terrainHeightAt(p + ivec2(1, 1)), f.x),
    f.y
  );
  float r = 1.5;
  float cardinals =
    terrainHeightAt(ivec2(floor(samplePos + vec2(r, 0.0)))) +
    terrainHeightAt(ivec2(floor(samplePos - vec2(r, 0.0)))) +
    terrainHeightAt(ivec2(floor(samplePos + vec2(0.0, r)))) +
    terrainHeightAt(ivec2(floor(samplePos - vec2(0.0, r))));
  float diagonals =
    terrainHeightAt(ivec2(floor(samplePos + vec2(r, r)))) +
    terrainHeightAt(ivec2(floor(samplePos + vec2(r, -r)))) +
    terrainHeightAt(ivec2(floor(samplePos + vec2(-r, r)))) +
    terrainHeightAt(ivec2(floor(samplePos - vec2(r, r))));
  return (center * 8.0 + cardinals * 2.0 + diagonals) / 20.0;
}

void main() {
  float worldX  = aInst.x;
  float worldY  = aInst.y;
  float cursorX = aInst.z;
  int charCode  = int(aInst.w);

  // Same icon scale logic as structure.vert.glsl
  float iconScale;
  if (uZoom <= uDotsThreshold) {
    iconScale = 0.0;  // hidden in dots mode
  } else if (uZoom >= uIconGrowZoom) {
    // World-anchored: grow with the map past this zoom, matching the icons.
    iconScale = uZoom / uIconGrowZoom;
  } else {
    iconScale = min(1.0, uZoom / uScaleFactor);
  }

  // Cull when invisible
  if (iconScale <= 0.0 || charCode == 0) {
    gl_Position = vec4(0.0);
    vUV = vec2(0.0);
    vAlive = 0.0;
    return;
  }
  vAlive = 1.0;
  vAtlasIdx = aAtlasIdx;

  float halfIconSize = uIconSize * iconScale * 0.5 / uZoom;
  if (uScreenFacing == 1) {
    float halfIconScreenSize = halfIconSize * abs(uScreenFacingScale.x);
    if (halfIconScreenSize > MAX_SCREEN_SIZE) {
      float scaleCorrection = MAX_SCREEN_SIZE / halfIconScreenSize;
      halfIconSize *= scaleCorrection;
    }
  }

  // Level text scale: proportional to icon size
  float levelScale = halfIconSize * uLevelScale / uFontSize;

  // Glyph metrics from data texture
  vec4 m0 = texelFetch(uGlyphMetrics, ivec2(charCode, 0), 0); // xadvance, xoffset, yoffset, width
  vec4 m1 = texelFetch(uGlyphMetrics, ivec2(charCode, 1), 0); // height, u0, v0, u1

  float glyphW = m0.w;
  float glyphH = m1.x;
  float u0 = m1.y;
  float v0 = m1.z;
  float u1 = m1.w;
  float v1 = v0 + glyphH / uAtlasScaleH;

  // Skip degenerate glyphs
  if (glyphW <= 0.0 || glyphH <= 0.0) {
    gl_Position = vec4(0.0);
    vUV = vec2(0.0);
    vAlive = 0.0;
    return;
  }

  // Position above icon center
  vec2 center = vec2(worldX + 0.5, worldY + 0.5);
  float baselineY = -uBase * 0.5;
  // above icon top edge; uLevelOffsetY raises (or lowers) it proportionally
  float yOff =
    -halfIconSize * (1.0 + uLevelOffsetY) - levelScale * uBase * 0.6;

  vec2 glyphOrigin = vec2(
    cursorX + m0.y,  // + xoffset
    baselineY + m0.z // + yoffset
  ) * levelScale;

  vec2 glyphSize = vec2(glyphW, glyphH) * levelScale;

  vec2 worldPos = center + vec2(0.0, yOff) + glyphOrigin + aPos * glyphSize;

  vec3 clip;
  if (uScreenFacing == 1) {
    vec2 anchor;
    if (uThreeD == 1) {
      float terrainHeight = smoothTerrainHeight(center);
      vec4 anchorH = uThreeDViewProjection * vec4(
        center.x,
        terrainHeight + 0.14,
        center.y,
        1.0
      );
      if (anchorH.w <= 0.0001) {
        gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
        return;
      }
      anchor = anchorH.xy / anchorH.w;
    } else {
      vec3 anchorH = uCamera * vec3(center, 1.0);
      anchor = anchorH.xy / max(0.0001, anchorH.z);
    }
    clip = vec3(anchor + (worldPos - center) * uScreenFacingScale, 1.0);
  } else {
    clip = uCamera * vec3(worldPos, 1.0);
  }
  gl_Position = vec4(clip.xy, 0.0, 1.0);

  vUV = vec2(mix(u0, u1, aPos.x), mix(v0, v1, aPos.y));
}
