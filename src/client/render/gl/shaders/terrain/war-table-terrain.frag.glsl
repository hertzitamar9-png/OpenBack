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

// One population of shiny streaks: long, thin highlights lying across the
// water and sliding along their own heading.
//
// `dir` is the direction of travel, so a population can run left-to-right,
// right-to-left, up, down or any diagonal, and each carries its own speed.
// The band itself is a narrow power of a sine, which is what gives the hard
// glint rather than a soft blob.
//
// Left at that, every streak would be an unbroken stripe from edge to edge.
// The segment gate breaks each one along its own length, keyed to which
// wave-crest it belongs to, so streaks start and end at unrelated places and
// the pattern never resolves into stripes.
float streakLayer(
  vec2 world,
  vec2 dir,
  float freq,
  float speed,
  float seed,
  float t
) {
  vec2 d = normalize(dir);
  vec2 perp = vec2(-d.y, d.x);
  float phase = dot(world, d) * freq - t * speed + seed;
  float band = pow(max(0.0, sin(phase)), 26.0);
  float segment = valueNoise(
    vec2(dot(world, perp) * 0.045 + seed, floor(phase / 6.2831853))
  );
  return band * smoothstep(0.40, 0.80, segment);
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

    float broad = sin(dot(world, vec2(0.031, 0.017)) + uTime * 0.55);
    float cross = sin(dot(world, vec2(-0.021, 0.039)) - uTime * 0.42);
    float swell = sin(dot(world, vec2(0.010, -0.018)) + uTime * 0.24);
    float wave = broad * 0.55 + cross * 0.35 + swell * 0.10;
    float fine = sin((world.x - world.y) * 0.11 + uTime * 0.75) * 0.5 + 0.5;
    float shimmer = clamp(0.30 + wave * 0.10 + fine * 0.045, 0.14, 0.62);
    vec3 deep = color * 0.90;
    vec3 highlight = color + vec3(0.025, 0.075, 0.095);
    color = mix(deep, highlight, shimmer * seaDetail);

    // Shiny streaks across the open sea. The frequency rises with zoom so a
    // streak keeps roughly the same width on screen at every scale; fixed in
    // tile space it would thin below a pixel when zoomed out and alias into a
    // crawl instead of reading as light.
    float streakFreq = mix(0.055, 0.140, smoothstep(0.15, 1.20, uZoom));
    // Four populations, each with its own heading and speed, so no single
    // direction or rhythm dominates: right-and-down, left-and-up, straight
    // up the map, and a slow left-and-down drift.
    float streaks = streakLayer(
      world, vec2(1.00, 0.42), streakFreq, 1.15, 0.0, uTime
    );
    streaks = max(streaks, streakLayer(
      world, vec2(-0.85, -0.55), streakFreq * 1.35, 0.70, 11.7, uTime
    ));
    streaks = max(streaks, streakLayer(
      world, vec2(0.15, -1.00), streakFreq * 0.80, 1.60, 23.3, uTime
    ));
    streaks = max(streaks, streakLayer(
      world, vec2(-0.60, 0.90), streakFreq * 1.10, 0.45, 37.9, uTime
    ));
    float openStreak = streaks * seaDetail;
    color = mix(color, vec3(0.86, 0.95, 1.0), openStreak * 0.55);

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
