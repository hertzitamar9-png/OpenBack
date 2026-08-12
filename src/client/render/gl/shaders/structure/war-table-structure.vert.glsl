#version 300 es
precision highp float;

layout(location = 0) in vec2 aPos;
layout(location = 1) in vec4 aInst0;
layout(location = 2) in vec2 aInst1;

uniform mat3 uCamera;
uniform float uZoom;
uniform float uIconSize;
uniform float uDotsThreshold;
uniform float uDotScale;
uniform float uScaleFactor;
uniform float uIconGrowZoom;
uniform float uShapeScales[STRUCTURE_TYPES_COUNT];
uniform float uIconFills[STRUCTURE_TYPES_COUNT];

out vec2 vAtlasUV;
out vec2 vLocalPos;
flat out float vOwnerID;
flat out float vUnderConstruction;
flat out float vMarkedForDeletion;
flat out float vAtlasIdx;
flat out float vZoom;

void main() {
  int shapeIdx = int(aInst1.x);
  float iconScale = uZoom <= uDotsThreshold
    ? uDotScale
    : (uZoom >= uIconGrowZoom
      ? uZoom / uIconGrowZoom
      : min(1.0, uZoom / uScaleFactor));
  float shapeScale = uShapeScales[shapeIdx];
  float halfSize = uIconSize * iconScale * shapeScale * 0.5 / uZoom;
  float assembly = clamp(aInst0.w, 0.08, 1.0);
  vec2 assembledPos = vec2(aPos.x, 1.0 - (1.0 - aPos.y) * assembly);
  vec2 center = vec2(aInst0.x + 0.5, aInst0.y + 0.5);
  vec2 worldPos = center + (assembledPos - 0.5) * halfSize * 2.0;
  vec3 clip = uCamera * vec3(worldPos, 1.0);
  gl_Position = clip.z <= 0.0001
    ? vec4(2.0, 2.0, 0.0, 1.0)
    : vec4(clip.xy / clip.z, 0.0, 1.0);

  float uvExpand = shapeScale / max(uIconFills[shapeIdx], 0.01);
  vec2 atlasLocal = vec2(
    0.5 + (aPos.x - 0.5) * uvExpand,
    0.5 + (aPos.y - 0.5) * uvExpand
  );
  vAtlasUV = vec2((aInst1.x + atlasLocal.x) / float(ATLAS_COLS), atlasLocal.y);
  vLocalPos = aPos - 0.5;
  vOwnerID = aInst0.z;
  vUnderConstruction = aInst0.w;
  vMarkedForDeletion = aInst1.y;
  vAtlasIdx = aInst1.x;
  vZoom = uZoom;
}
