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

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = hash21(cell);
  float b = hash21(cell + vec2(1.0, 0.0));
  float c = hash21(cell + vec2(0.0, 1.0));
  float d = hash21(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float shineLayer(
  vec2 world,
  vec2 direction,
  float frequency,
  float speed,
  float phase,
  float time
) {
  vec2 travel = normalize(direction);
  vec2 across = vec2(-travel.y, travel.x);
  float bend = sin(
    dot(world, across) * frequency * 0.41 + time * speed * 0.19 + phase
  ) * 0.72;
  float wave = sin(
    dot(world, travel) * frequency + time * speed + phase + bend
  ) * 0.5 + 0.5;
  return smoothstep(0.16, 0.94, wave);
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
    // Open water keeps most of its movement when the map is zoomed out. The
    // shared `detail` term fades to zero below ~0.35 zoom, which left whole
    // oceans flat and made the glimmer look like a shore-only effect.
    float seaDetail = mix(0.6, 1.0, smoothstep(0.12, 1.0, uZoom))
      * clamp(uQuality, 0.45, 1.0);

    vec3 oceanBase = color;
    vec3 shorelineTint = mix(oceanBase, vec3(1.0), 0.30);
    float broad = sin(dot(world, vec2(0.031, 0.017)) + uTime * 0.55);
    float cross = sin(dot(world, vec2(-0.021, 0.039)) - uTime * 0.42);
    float swell = sin(dot(world, vec2(0.010, -0.018)) + uTime * 0.24);
    float wave = broad * 0.55 + cross * 0.35 + swell * 0.10;
    float fine = sin((world.x - world.y) * 0.11 + uTime * 0.75) * 0.5 + 0.5;
    float shimmer = clamp(0.30 + wave * 0.10 + fine * 0.045, 0.14, 0.62);
    vec3 deep = color * 0.90;
    vec3 highlight = color + vec3(0.025, 0.075, 0.095);
    color = mix(deep, highlight, shimmer * seaDetail);

    // Carry the exact colour relationship that makes shoreline water glow
    // through the open sea. Independent, gently bent fields keep their own
    // headings and speeds instead of collapsing into one directional sheet.
    float shine = 1.0;
    shine *= 1.0 - shineLayer(
      world, vec2(1.00, 0.18), 0.018, 0.19, 0.3, uTime
    ) * 0.34;
    shine *= 1.0 - shineLayer(
      world, vec2(-0.42, 1.00), 0.027, -0.31, 2.1, uTime
    ) * 0.25;
    shine *= 1.0 - shineLayer(
      world, vec2(0.66, -1.00), 0.035, 0.43, 4.7, uTime
    ) * 0.18;
    shine *= 1.0 - shineLayer(
      world, vec2(-1.00, -0.37), 0.013, -0.12, 7.4, uTime
    ) * 0.13;
    shine = 1.0 - shine;
    color = mix(color, shorelineTint, shine * 0.82 * seaDetail);

    // White break still belongs only at the shoreline.
    float shoreBreak = sin(world.x * 0.18 + world.y * 0.13 - uTime * 1.8);
    float coastalBreak = shore
      ? smoothstep(0.58, 0.90, shoreBreak) * 0.55 * seaDetail
      : 0.0;
    color = mix(color, vec3(0.90, 0.97, 1.0), coastalBreak);
    if (shore) color = mix(color, color + vec3(0.05, 0.08, 0.09), 0.32);
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
