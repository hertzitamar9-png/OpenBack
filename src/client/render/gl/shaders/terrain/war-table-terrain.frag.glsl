#version 300 es
precision highp float;
precision highp usampler2D;

uniform sampler2D uTerrain;
uniform usampler2D uTerrainBytes;
uniform vec2 uMapSize;
uniform float uZoom;
uniform float uTime;

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

/**
 * The actual coastal-flow expression, released into local patches of open
 * water. It deliberately uses the shore's sine and 0.58..0.90 threshold,
 * rather than the broad shine fields that looked like a different effect.
 *
 * Each path has one curved centerline and finite length. Its position,
 * heading, speed, curve, and lifespan arrive as CPU-computed uniforms, so it
 * can fade away and respawn elsewhere without per-pixel random fields.
 */
float coastFlowLayer(
  vec2 world,
  vec2 center,
  vec2 direction,
  float life,
  float curve,
  float phase,
  float halfLength,
  float width
) {
  vec2 travel = normalize(direction);
  vec2 across = vec2(-travel.y, travel.x);
  vec2 relative = world - center;
  float along = dot(relative, travel);
  float side = dot(relative, across);
  float curvedCenter = sin(along * 0.025 + phase) * curve * width * 1.4;
  float normalizedSide = clamp(abs(side - curvedCenter) / width, 0.0, 1.0);
  float ribbon = cos(normalizedSide * 3.14159265);
  float ribbonTerm = smoothstep(0.58, 0.90, ribbon);
  float endFade = 1.0 - smoothstep(halfLength * 0.62, halfLength, abs(along));
  return ribbonTerm * endFade * life;
}

float flowRandom(vec2 cell, float generation, float salt) {
  return hash21(
    cell + vec2(
      generation * 13.17 + salt * 7.31,
      generation * 5.91 - salt * 11.70
    )
  );
}

/**
 * One tiny shimmer per broad map cell. Because every ocean region owns its
 * own lifecycle, open water everywhere receives the effect instead of four
 * global paths happening to land near a coast. Centers stay safely inside
 * their cells, so a path never gets clipped at a cell boundary.
 */
float oceanShimmer(vec2 world, vec2 mapSize, float time, float zoom) {
  float cellSize = clamp(min(mapSize.x, mapSize.y) / 6.0, 64.0, 260.0);
  vec2 cell = floor(world / cellSize);
  vec2 cellOrigin = cell * cellSize;
  float seed = hash21(cell + vec2(17.3, 41.9));
  float duration = mix(17.0, 31.0, hash21(cell + vec2(63.1, 9.7)));
  float cycle = time / duration + seed;
  float generation = floor(cycle);
  float age = fract(cycle);
  float angle = flowRandom(cell, generation, 2.0) * 6.2831853;
  vec2 direction = vec2(cos(angle), sin(angle));
  float speed = mix(0.30, 1.0, flowRandom(cell, generation, 3.0));
  float travel = (age - 0.5) * min(18.0, cellSize * 0.08) * speed;
  vec2 center = cellOrigin + cellSize * vec2(
    mix(0.28, 0.72, flowRandom(cell, generation, 0.0)),
    mix(0.28, 0.72, flowRandom(cell, generation, 1.0))
  ) + direction * travel;
  float life = smoothstep(0.0, 0.20, age)
    * (1.0 - smoothstep(0.72, 1.0, age));
  float curve = mix(0.35, 1.0, flowRandom(cell, generation, 4.0));
  float safeZoom = max(0.05, zoom);
  float halfLength = clamp(4.0 / safeZoom, 0.4, min(28.0, cellSize * 0.10));
  float width = clamp(0.65 / safeZoom, 0.15, 2.5);
  return coastFlowLayer(
    world, center, direction, life, curve, seed * 6.2831853,
    halfLength, width
  );
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
  // uZoom is device pixels per tile. Relief and grain are tile-scale features,
  // so on a phone showing a whole map one tile covers 0.22 of a pixel and a
  // grain cell 0.44 -- far under the two pixels per feature that sampling once
  // per pixel needs. Drawing them there yields speckle rather than texture, so
  // this fade is real antialiasing and has to stay. It is not a device
  // downgrade: a desktop at 1.73 pixels per tile is unaffected by it.
  float detail = smoothstep(0.35, 1.15, uZoom);

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
    // The sea is the same on every device. Its crests measure 6 to 77 device
    // pixels even on a phone, so unlike the tile-scale land detail above there
    // is nothing here a small screen cannot resolve, and no honest reason to
    // draw a handset a fainter ocean. Scaling this by a quality tier bought
    // nothing either: nothing in this shader branches on quality, so every
    // wave, sine and noise lookup below is evaluated whatever it is set to --
    // a lower tier paid the same GPU cost for a worse picture.
    float seaDetail = 1.0;

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

    // Keep the exact original coastal glow on shoreline water.
    float shoreBreak = sin(world.x * 0.18 + world.y * 0.13 - uTime * 1.8);
    float coastalBreak =
      shore ? smoothstep(0.58, 0.90, shoreBreak) * 0.55 * seaDetail : 0.0;

    // Every broad region of Classic 2D water owns a tiny independent shimmer.
    float waterFlow = oceanShimmer(world, uMapSize, uTime, uZoom);
    // Open-water fragments are intentionally much smaller and subtler than
    // the full shoreline rim: the reference is a tiny pale-blue pixel glint,
    // not a white route drawn across the sea.
    float boundaryGlare = max(coastalBreak, waterFlow * 0.16 * seaDetail);
    color = mix(color, vec3(0.90, 0.97, 1.0), boundaryGlare);
    if (shore) color = mix(color, color + vec3(0.05, 0.08, 0.09), 0.32);
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
