#version 300 es
precision highp float;

// TerrainPass uploads a complete RGBA8 color texture. Sampling it as an
// integer terrain-byte texture (the newer upstream palette path) leaves the
// framebuffer blank because those two resource contracts are incompatible.
uniform sampler2D uTerrain;

in vec2 vUV;
out vec4 fragColor;

void main() {
  fragColor = texture(uTerrain, vUV);
}
