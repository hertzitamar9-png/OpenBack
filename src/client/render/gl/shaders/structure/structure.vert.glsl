#version 300 es
precision highp float;
precision highp usampler2D;

layout(location = 0) in vec2 aPos;

// Per-instance: x, y, ownerID, underConstruction, atlasIdx, markedForDeletion
layout(location = 1) in vec4 aInst0; // x, y, ownerID, underConstruction
layout(location = 2) in vec2 aInst1; // atlasIdx, markedForDeletion

uniform mat3  uCamera;
uniform bool uThreeD;
uniform mat4 uThreeDViewProjection;
uniform usampler2D uThreeDTerrain;
uniform vec2 uThreeDMapSize;
uniform vec2 uThreeDScreenScale;
uniform float uZoom;

uniform float uIconSize;
uniform float uDotsThreshold;
uniform float uDotScale;
uniform float uScaleFactor;
uniform float uIconGrowZoom;
uniform float uShapeScales[STRUCTURE_TYPES_COUNT];
uniform float uIconFills[STRUCTURE_TYPES_COUNT];

out vec2  vLocalPos;
out vec2  vAtlasUV;
flat out float vOwnerID;
flat out float vUnderConstruction;
flat out float vMarkedForDeletion;
flat out float vZoom;
flat out float vAtlasIdx;
flat out float vShapeScale;

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
  float worldX = aInst0.x;
  float worldY = aInst0.y;
  vOwnerID = aInst0.z;
  vUnderConstruction = aInst0.w;
  vMarkedForDeletion = aInst1.y;
  vZoom = uZoom;
  vAtlasIdx = aInst1.x;

  float iconScale;
  if (uZoom <= uDotsThreshold) {
    iconScale = uDotScale;
  } else if (uZoom >= uIconGrowZoom) {
    // World-anchored: grow proportionally to zoom so the structure covers a
    // fixed area of the map. Past this zoom, structures should feel like
    // they're "on" the canvas rather than overlaid at constant pixel size.
    iconScale = uZoom / uIconGrowZoom;
  } else {
    iconScale = min(1.0, uZoom / uScaleFactor);
  }

  int shapeIdx = int(aInst1.x);
  float shapeScale = uShapeScales[shapeIdx];
  vShapeScale = shapeScale;

  float halfSize = uIconSize * iconScale * 0.5 / uZoom * shapeScale;

  vec2 center = vec2(worldX + 0.5, worldY + 0.5);
  vec2 worldPos = center + (aPos - 0.5) * halfSize * 2.0;

  if (uThreeD) {
    float terrainHeight = smoothTerrainHeight(center);
    vec4 anchor=uThreeDViewProjection*vec4(center.x,terrainHeight+0.14,center.y,1.0);
    if(anchor.w<=0.0001){gl_Position=vec4(2.0,2.0,0.0,1.0);return;}
    vec2 ndc=anchor.xy/anchor.w+(aPos-0.5)*halfSize*2.0*uThreeDScreenScale;
    gl_Position=vec4(ndc,0.0,1.0);
  } else {
    vec3 clip = uCamera * vec3(worldPos, 1.0);
    if (clip.z <= 0.0001) {
      gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
      return;
    }
    gl_Position = vec4(clip.xy / clip.z, 0.0, 1.0);
  }

  vLocalPos = aPos - 0.5;

  // Atlas UV: icons stay the same world size regardless of shape scaling,
  // and are further shrunk by per-shape iconFill (0-1) to add padding inside the frame.
  float uvExpand = shapeScale / uIconFills[shapeIdx];
  float scaledX = 0.5 + (aPos.x - 0.5) * uvExpand;
  float scaledY = 0.5 + (aPos.y - 0.5) * uvExpand;
  float colU = (aInst1.x + scaledX) / float(ATLAS_COLS);
  vAtlasUV = vec2(colU, scaledY);
}
