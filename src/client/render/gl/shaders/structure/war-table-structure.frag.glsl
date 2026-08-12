#version 300 es
precision highp float;

uniform sampler2D uPalette;
uniform sampler2D uAtlas;
uniform sampler2D uAffiliation;
uniform sampler2D uEffect;
uniform float uGhostAlpha;
uniform vec3 uOutlineColor;
uniform int uAltView;
uniform int uHighlightMask;
uniform float uHighlightDimAlpha;
uniform float uIconAlpha;
uniform float uLocalPlayerID;

in vec2 vAtlasUV;
in vec2 vLocalPos;
flat in float vOwnerID;
flat in float vUnderConstruction;
flat in float vMarkedForDeletion;
flat in float vAtlasIdx;
flat in float vZoom;
out vec4 fragColor;

void main() {
  float colStart = vAtlasIdx / float(ATLAS_COLS);
  float colEnd = (vAtlasIdx + 1.0) / float(ATLAS_COLS);
  float inBounds = step(colStart, vAtlasUV.x) * step(vAtlasUV.x, colEnd)
    * step(0.0, vAtlasUV.y) * step(vAtlasUV.y, 1.0);
  vec4 source = texture(uAtlas, vec2(clamp(vAtlasUV.x, colStart, colEnd), clamp(vAtlasUV.y, 0.0, 1.0)));
  if (source.a * inBounds < 0.02) discard;

  vec3 ownerSample = vec3(180.0, 130.0, 70.0) / 255.0;
  float ownerMask = 1.0 - smoothstep(0.08, 0.22, distance(source.rgb, ownerSample));
  float paletteU = (vOwnerID + 0.5) / float(PALETTE_SIZE);
  vec3 ownerColor = texture(uPalette, vec2(paletteU, 0.25)).rgb;
  if (uAltView != 0) ownerColor = texelFetch(uAffiliation, ivec2(int(vOwnerID), 1), 0).rgb;
  vec3 color = mix(source.rgb, ownerColor, ownerMask);
  if (vUnderConstruction < 0.999) {
    color = mix(vec3(0.46), color, 0.35 + vUnderConstruction * 0.65);
  }

  if (vMarkedForDeletion > 0.5) {
    float line = min(abs(vLocalPos.x - vLocalPos.y), abs(vLocalPos.x + vLocalPos.y));
    color = mix(color, vec3(1.0, 0.12, 0.08), 1.0 - smoothstep(0.025, 0.055, line));
  }
  float tintActive = step(0.01, dot(uOutlineColor, uOutlineColor));
  color = mix(color, uOutlineColor, tintActive * 0.42);
  float alpha = source.a * inBounds * uGhostAlpha * uIconAlpha;
  if (uHighlightMask != 0) {
    int bit = 1 << int(vAtlasIdx + 0.5);
    if ((uHighlightMask & bit) == 0) alpha *= uHighlightDimAlpha;
    else color = mix(color, vec3(1.0), 0.22);
  }
  fragColor = vec4(color, alpha);
}
