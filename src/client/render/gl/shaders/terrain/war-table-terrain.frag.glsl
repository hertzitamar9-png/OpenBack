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

// One population of sun glints. Each has its own heading and speed, and its
// own slower gate field that makes sparkles fade up and out in different
// places over time, so the population is never just a fixed pattern sliding
// rigidly across the map.
float glintLayer(vec2 world, float scale, vec2 velocity, float phase, float t) {
  vec2 p = (world + velocity * t) * scale + phase;
  // Warping the sample by a second lookup keeps the field from repeating on
  // the lattice the noise is built from.
  float sparkle = valueNoise(p + valueNoise(p * 2.3 + phase) * 0.6);
  float gate = valueNoise((world - velocity * t * 0.35) * scale * 0.22 + phase * 1.7);
  return smoothstep(0.66, 0.95, sparkle) * smoothstep(0.30, 0.72, gate);
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

    // Sun glints, everywhere on the water rather than only where it meets land.
    // Two earlier attempts failed here for the same underlying reason: both a
    // thresholded wave and a directional band carry a grain, and once the whole
    // map is on screen that grain reads as pale ovals or diagonal stripes. Noise
    // has no grain to line up, so it stays as scattered points of light.
    //
    // The sample frequency rises with zoom so a glint keeps roughly the same
    // size on screen at every scale. Fixing it in tile space would shrink the
    // sparkle below a pixel when zoomed out, where it would alias into a
    // crawling fizz instead of reading as light on water.
    float glintScale = mix(0.035, 0.115, smoothstep(0.15, 1.20, uZoom));
    // Three populations crossing each other: one running right, one running
    // left faster and finer, one drifting up the map slowly and coarsely.
    // Velocity is applied in world units, so these are true tiles-per-second
    // regardless of zoom, and no single direction dominates the surface.
    float glints = glintLayer(world, glintScale, vec2(1.10, -0.55), 0.0, uTime);
    glints = max(
      glints,
      glintLayer(world, glintScale * 1.6, vec2(-1.80, 0.40), 7.3, uTime)
    );
    glints = max(
      glints,
      glintLayer(world, glintScale * 0.7, vec2(-0.45, -1.25), 3.1, uTime)
    );
    // Only the top of the combined field lights up, so the sea stays mostly
    // dark with points of light on it rather than uniformly brightened.
    float openGlint = pow(glints, 1.6) * seaDetail;
    color = mix(color, vec3(0.82, 0.93, 1.0), openGlint * 0.42);

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
