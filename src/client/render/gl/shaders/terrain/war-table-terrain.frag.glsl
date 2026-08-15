#version 300 es
precision highp float;
precision highp usampler2D;

uniform sampler2D uTerrain;
uniform usampler2D uTerrainBytes;
uniform vec2 uMapSize;
uniform float uZoom;
uniform float uTime;
uniform float uQuality;

in vec2 vUV;
out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

uint terrainAt(ivec2 p) {
  p = clamp(p, ivec2(0), ivec2(uMapSize) - 1);
  return texelFetch(uTerrainBytes, p, 0).r;
}

float heightAt(ivec2 p) {
  uint terrain = terrainAt(p);
  bool land = (terrain & 128u) != 0u;
  return land ? float(terrain & 31u) / 31.0 : 0.0;
}

void main() {
  vec2 world = vUV * uMapSize;
  ivec2 tile = ivec2(floor(world));
  uint terrain = terrainAt(tile);
  bool land = (terrain & 128u) != 0u;
  bool shore = (terrain & 64u) != 0u;
  vec3 color = texture(uTerrain, vUV).rgb;
  float detail = smoothstep(0.35, 1.15, uZoom) * clamp(uQuality, 0.45, 1.0);

  if (land) {
    float west = heightAt(tile + ivec2(-1, 0));
    float east = heightAt(tile + ivec2(1, 0));
    float north = heightAt(tile + ivec2(0, -1));
    float south = heightAt(tile + ivec2(0, 1));
    vec2 slope = vec2(east - west, south - north);
    float slopeLength = length(slope);
    float relief = slopeLength > 0.00001
      ? clamp(dot(normalize(vec2(-0.72, -0.69)), slope), -1.0, 1.0)
      : 0.0;
    float grain = (hash21(floor(world * 0.5)) - 0.5) * 0.045 * detail;
    color *= 1.0 + relief * 0.12 * detail + grain;
    if (shore) color *= 1.035;
  } else {
    float waveA = sin(world.x * 0.11 + world.y * 0.07 + uTime * 0.55);
    float waveB = sin(world.x * -0.045 + world.y * 0.13 - uTime * 0.38);
    float waves = (waveA + waveB) * 0.5;
    color *= 1.0 + waves * 0.035 * detail;
    // Thin travelling crests bring the readable foam rhythm from the 3D sea
    // to classic mode without obscuring borders, ships, or territory.
    float oceanCrest = smoothstep(0.82, 0.97, waves) * detail;
    float shorePulse = sin(world.x * 0.19 + world.y * 0.14 - uTime * 1.65);
    float shoreFoam = shore ? smoothstep(0.38, 0.92, shorePulse) * detail : 0.0;
    float foam = max(oceanCrest * 0.22, shoreFoam * 0.52);
    color = mix(color, vec3(0.78, 0.94, 1.0), foam);
    if (shore) color = mix(color, color + vec3(0.07, 0.10, 0.11), 0.30);
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
