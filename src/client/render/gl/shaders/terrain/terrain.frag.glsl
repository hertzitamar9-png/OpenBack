#version 300 es
precision highp float;
precision highp usampler2D;

uniform usampler2D uTerrain;
uniform sampler2D uTerrainPalette;

in vec2 vUV;
out vec4 fragColor;

void main() {
  uint terrainByte = texture(uTerrain, vUV).r;
  fragColor = texelFetch(uTerrainPalette, ivec2(int(terrainByte), 0), 0);
}
