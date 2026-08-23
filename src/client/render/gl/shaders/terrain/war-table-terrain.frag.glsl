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
  // A sine alone runs as endless parallel bands: the same crests in the same
  // places forever. Gate each layer behind a slow noise field drifting along
  // its own heading, so its shine turns up in different parts of the sea as
  // time passes and fades again, rather than sitting where it always was.
  float gate = valueNoise(
    world * 0.005 + travel * time * speed * 0.6 + vec2(phase * 3.7, phase * 1.9)
  );
  return smoothstep(0.16, 0.94, wave) * smoothstep(0.26, 0.74, gate);
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
  // uZoom is device pixels per tile, not "how far in the player has zoomed".
  // A phone showing the whole map sits near 0.22 and a desktop showing the same
  // map sits near 1.7, so thresholds written for a desktop's numbers held the
  // fade permanently on for handsets: land relief and grain measured 0.000 on a
  // phone against 1.000 on a monitor, and the sea kept less than half its
  // shine. The crests are 6 to 77 device pixels wide on a phone, so they are
  // plainly resolvable -- the fade was simply tuned past where phones live.
  float detail = smoothstep(0.10, 0.40, uZoom) * clamp(uQuality, 0.45, 1.0);

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
    // Open water keeps most of its movement when the map is zoomed out, and
    // "zoomed out" has to mean the same thing on a phone as on a monitor. The
    // shared `detail` term fades to zero below ~0.35 zoom, which left whole
    // oceans flat and made the glimmer look like a shore-only effect.
    float seaDetail = mix(0.6, 1.0, smoothstep(0.05, 0.25, uZoom))
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
    color = mix(color, shorelineTint, shine * 0.95 * seaDetail);

    // The pale shoreline ribbon the map already uses is also the open-water
    // glare language. Broken high-frequency fields send that same blue-white
    // light across the sea from independent headings and speeds, rather than
    // replacing it with an unrelated broad tint.
    float shoreBreak = sin(world.x * 0.18 + world.y * 0.13 - uTime * 1.8);
    float coastalBreak = shore
      ? smoothstep(0.58, 0.90, shoreBreak) * 0.55 * seaDetail
      : 0.0;
    float openGlare = max(
      smoothstep(0.992, 0.9998, shineLayer(
        world, vec2(1.0, 0.24), 0.070, 1.05, 0.7, uTime
      )),
      smoothstep(0.992, 0.9998, shineLayer(
        world, vec2(-0.36, 1.0), 0.082, -0.82, 3.2, uTime
      ))
    );
    openGlare = max(
      openGlare,
      smoothstep(0.992, 0.9998, shineLayer(
        world, vec2(0.58, -1.0), 0.095, 1.18, 5.6, uTime
      ))
    );
    openGlare = max(
      openGlare,
      smoothstep(0.992, 0.9998, shineLayer(
        world, vec2(-1.0, -0.41), 0.058, -0.68, 8.1, uTime
      ))
    );
    float boundaryGlare = max(coastalBreak, openGlare * 0.08 * seaDetail);
    color = mix(color, vec3(0.90, 0.97, 1.0), boundaryGlare);
    if (shore) color = mix(color, color + vec3(0.05, 0.08, 0.09), 0.32);
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
