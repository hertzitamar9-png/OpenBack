#version 300 es
precision highp float;

uniform sampler2D uPalette;
uniform sampler2D uAtlas;
uniform sampler2D uAffiliation;   // 256×2 RGBA8 — row 1 = unit affiliation
uniform float uTick;
uniform float uFlickerSpeed;
uniform vec3  uAngryColor;
uniform int   uAltView;
uniform vec3  uHBombGlowColor;
uniform float uHBombGlowStrength;
uniform float uHBombGlowInner;
uniform float uUntargetableAlpha;

in vec2  vQuadPos;
in vec2  vCellUV;
flat in float vAtlasCol;
flat in float vOwnerID;
flat in float vFlags;
flat in float vHash;
flat in float vGlow;
in float vAngle;

out vec4 fragColor;

// Flag constants — must match CPU-side FLAG_* values
const float FLAG_FLICKER        = 1.0;
const float FLAG_ANGRY          = 2.0;
const float FLAG_TRADE_FRIENDLY = 3.0;
const float FLAG_RETREATING     = 4.0;
const float FLAG_FLICKER_UNTARGETABLE = 5.0; // nuke out of SAM range — dimmed
const float FLAG_LAUNCH_SMOKE = 6.0;
const float FLAG_LAUNCH_FIRE = 7.0;
// Ally color for trade-friendly override (yellow — matches affiliation.ts ALLY)
const vec3 ALLY_COLOR = vec3(1.0, 1.0, 0.0);

// Flicker hot colors: red → orange → yellow → white
const vec3 FLICKER_COLORS[4] = vec3[4](
  vec3(1.0, 0.0, 0.0),   // red
  vec3(1.0, 0.5, 0.0),   // orange
  vec3(1.0, 1.0, 0.0),   // yellow
  vec3(1.0, 1.0, 1.0)    // white
);

void main() {
  // Untargetable nukes render translucent so players know SAMs can't hit them
  float alphaMul = abs(vFlags - FLAG_FLICKER_UNTARGETABLE) < 0.1
    ? uUntargetableAlpha
    : 1.0;

  // The sprite lives in the central cell-space region [0,1]; for the enlarged
  // hydrogen-bomb quad, anything outside that range is glow-only margin.
  vec4 texel = vec4(0.0);
  float blackOutline = 0.0;
  float tankMuzzleFlash = 0.0;
  float fuelTrainMask = 0.0;
  float fuelCamo = 0.0;
  float fuelCamoBlack = 0.0;
  bool inSprite = vCellUV.x >= 0.0 && vCellUV.x <= 1.0 &&
                  vCellUV.y >= 0.0 && vCellUV.y <= 1.0;
  if (inSprite) {
    if (abs(vFlags - 8.0) < 0.1 && vAtlasCol > 8.5 && vAtlasCol < 11.5) {
      vec2 p = vCellUV - 0.5;
      float engine = 1.0 - step(9.5, vAtlasCol);
      float carriage = 1.0 - engine;
      float body = (1.0 - step(0.18, abs(p.x)))
                 * (1.0 - step(0.22, abs(p.y)));
      // Missile-head nose: a sharp armored wedge at the front of each engine.
      float noseWidth = clamp((p.y + 0.36) * 1.15, 0.0, 0.19);
      float nose = engine * step(-0.36, p.y) * (1.0 - step(-0.18, p.y))
                 * (1.0 - step(noseWidth, abs(p.x)));
      float fuelTank = carriage * (1.0 - step(0.19,
          length(vec2(p.x * 0.78, p.y))));
      fuelTrainMask = max(body, max(nose, fuelTank));
      float outer = max(
        (1.0 - step(0.215, abs(p.x)))
          * (1.0 - step(0.255, abs(p.y))),
        engine * step(-0.40, p.y) * (1.0 - step(-0.15, p.y))
          * (1.0 - step(noseWidth + 0.045, abs(p.x)))
      );
      blackOutline = step(0.01, outer - fuelTrainMask);
      fuelCamo = step(0.52, fract(
          sin(dot(floor((p + 0.8) * 13.0), vec2(12.9898, 78.233)))
          * 43758.5453));
      fuelCamoBlack = step(0.78, fract(
          sin(dot(floor((p + 1.3) * 9.0), vec2(39.346, 11.135)))
          * 24634.6345));
      texel = vec4(vec3(0.72), step(0.01, max(outer, fuelTrainMask)));
    } else if (abs(vAtlasCol - float(PLANE_COL)) < 0.5) {
      // The vertex shader rotates the complete aircraft quad. Keeping the
      // model in local coordinates makes its nose visibly face the target.
      vec2 p = vCellUV - 0.5;
      float aa = 0.009;

      // Tapered fuselage: pointed nose/tail, fuller mid-body.
      float t = clamp((p.y + 0.44) / 0.88, 0.0, 1.0);
      float halfW = 0.095 * sin(t * 3.14159);
      float body = smoothstep(halfW + aa, halfW - aa, abs(p.x));

      // Swept main wings (nose points toward -y).
      float wLead = -0.06 + 0.38 * abs(p.x);
      float wings = smoothstep(0.42 + aa, 0.42 - aa, abs(p.x))
                  * smoothstep(wLead - aa, wLead + aa, p.y)
                  * smoothstep(0.16 + aa, 0.16 - aa, p.y);

      // Swept tailplane near the rear.
      float tLead = 0.24 + 0.30 * abs(p.x);
      float tail = smoothstep(0.17 + aa, 0.17 - aa, abs(p.x))
                 * smoothstep(tLead - aa, tLead + aa, p.y)
                 * smoothstep(0.40 + aa, 0.40 - aa, p.y);

      // Twin engine pods make this read as an aircraft instead of a dart.
      float engines = smoothstep(0.075 + aa, 0.075 - aa,
          min(length(p - vec2(-0.17, 0.02)), length(p - vec2(0.17, 0.02))));
      float cockpit = smoothstep(0.055 + aa, 0.055 - aa,
          length((p - vec2(0.0, -0.25)) * vec2(1.0, 1.8)));
      float planeMask = smoothstep(0.08, 0.42,
          clamp(max(max(body, wings), max(tail, engines)), 0.0, 1.0));
      float bodyOuter = smoothstep(halfW + aa * 2.8, halfW - aa * 2.8, abs(p.x));
      float wingsOuter = smoothstep(0.45, 0.39, abs(p.x))
                       * smoothstep(wLead - aa * 2.8, wLead + aa * 2.8, p.y)
                       * smoothstep(0.19, 0.13, p.y);
      float tailOuter = smoothstep(0.20, 0.14, abs(p.x))
                      * smoothstep(tLead - aa * 2.8, tLead + aa * 2.8, p.y)
                      * smoothstep(0.43, 0.37, p.y);
      float enginesOuter = smoothstep(0.11, 0.07,
          min(length(p - vec2(-0.17, 0.02)), length(p - vec2(0.17, 0.02))));
      float planeOuter = clamp(max(max(bodyOuter, wingsOuter),
          max(tailOuter, enginesOuter)), 0.0, 1.0);
      float cockpitOuter = smoothstep(0.085, 0.055,
          length((p - vec2(0.0, -0.25)) * vec2(1.0, 1.8)));
      float planeSeams = max(
        max(bodyOuter - body, wingsOuter - wings),
        max(max(tailOuter - tail, enginesOuter - engines),
            cockpitOuter - cockpit)
      );
      blackOutline = smoothstep(0.025, 0.16, planeSeams);
      // One uniform light band makes every aircraft panel use the owner's
      // spawn color; blackOutline supplies separation around every component.
      float planeAlpha = step(0.035, max(planeOuter, cockpitOuter));
      texel = vec4(vec3(0.72), planeAlpha);
    } else if (abs(vAtlasCol - float(TANK_COL)) < 0.5) {
      vec2 p = vCellUV - 0.5;
      float aa = 0.012;
      float selfDestruct = step(19.5, vFlags);
      float sequence = clamp((vFlags - 20.0) / 30.0, 0.0, 1.0);
      // Raise before ignition, then lower continuously from the firing moment
      // until impact. At sequence=1 the turret is fully seated.
      float turretLift = -0.30
        * smoothstep(0.0, 0.12, sequence)
        * (1.0 - smoothstep(0.12, 1.0, sequence));
      vec2 turretP = p - vec2(0.0, turretLift);
      float hull = smoothstep(0.34 + aa, 0.34 - aa, abs(p.x))
                 * smoothstep(0.27 + aa, 0.27 - aa, abs(p.y));
      float tracks = smoothstep(0.44 + aa, 0.44 - aa, abs(p.x))
                   * smoothstep(0.34 + aa, 0.34 - aa, abs(p.y));
      float turret = smoothstep(0.16 + aa, 0.16 - aa, length(turretP));
      float barrel = smoothstep(0.045 + aa, 0.045 - aa, abs(turretP.x))
                   * smoothstep(-0.05, 0.39, -turretP.y);
      // Brief cinematic muzzle blast at the fully raised barrel tip: hot core,
      // irregular star rays and sparks before the projectile begins climbing.
      vec2 muzzle = vec2(0.0, turretLift - 0.38);
      vec2 muzzleDelta = p - muzzle;
      float muzzleWindow = selfDestruct * smoothstep(0.09, 0.12, sequence)
                         * (1.0 - smoothstep(0.18, 0.23, sequence));
      float muzzleAngle = atan(muzzleDelta.y, muzzleDelta.x);
      // Larger, hotter muzzle blast so the turret fireball reads clearly bigger.
      float rays = 0.28 + 0.14 * sin(muzzleAngle * 7.0 + uTick * 0.9);
      float flashStar = 1.0 - smoothstep(rays * 0.4, rays * 1.5,
          length(muzzleDelta));
      float sparks = (1.0 - smoothstep(0.02, 0.05,
          abs(sin(muzzleAngle * 11.0)) * length(muzzleDelta)))
          * (1.0 - smoothstep(0.20, 0.60, length(muzzleDelta)));
      tankMuzzleFlash = muzzleWindow * max(flashStar, sparks * 0.9);
      float mask = smoothstep(0.08, 0.42,
          max(tracks, max(hull, max(turret,
              max(barrel, tankMuzzleFlash)))));
      float hullOuter = smoothstep(0.38, 0.34, abs(p.x))
                      * smoothstep(0.31, 0.27, abs(p.y));
      float tracksOuter = smoothstep(0.48, 0.44, abs(p.x))
                        * smoothstep(0.38, 0.34, abs(p.y));
      float turretOuter = smoothstep(0.20, 0.16, length(turretP));
      float barrelOuter = smoothstep(0.075, 0.045, abs(turretP.x))
                        * smoothstep(-0.08, 0.42, -turretP.y);
      float outerMask = max(tracksOuter,
          max(hullOuter, max(turretOuter,
              max(barrelOuter, tankMuzzleFlash))));
      float tankSeams = max(
        max(tracksOuter - tracks, hullOuter - hull),
        max(turretOuter - turret, barrelOuter - barrel)
      );
      blackOutline = smoothstep(0.025, 0.14, tankSeams);
      // Tracks stay dark; the turret/barrel use the spawn-color band so the
      // former white highlight follows the owner (green in the example).
      float shade = tracks > hull ? 0.25 : 0.72;
      if (turret > 0.5 || barrel > 0.5) shade = 0.51;
      float tankAlpha = step(0.035, outerMask);
      texel = vec4(vec3(shade), tankAlpha);
    } else {
      vec2 atlasUV = vec2((vAtlasCol + vCellUV.x) / float(ATLAS_COLS), vCellUV.y);
      texel = texture(uAtlas, atlasUV);
    }
  }

  // Front locomotive smokestack (ארובה) for fuel trains: a standout stack at
  // the front of the train with a rising plume. Replaces the old trailing
  // diesel exhaust.
  if (abs(vFlags - 8.0) < 0.1 && vAtlasCol < 9.5 && texel.a < 0.01) {
    vec2 p = vCellUV - 0.5;
    // Stack body at the front (right) of the train, rising above the roofline.
    float stack = step(0.18, p.x) * step(p.x, 0.27)
                * step(0.10, p.y) * step(p.y, 0.32);
    // Bright capped rim so the stack stands out against the camo body.
    float rim = step(0.16, p.x) * step(p.x, 0.29)
              * step(0.30, p.y) * step(p.y, 0.37);
    // Plume rising from the top of the stack.
    float smoke = 0.0;
    float t = uTick * 0.05;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float phase = fract(t + fi * 0.25);
      vec2 center = vec2(0.225 + sin(uTick * 0.4 + fi * 2.1) * 0.05 * phase,
                         0.37 + phase * 0.85);
      float radius = 0.05 + phase * 0.14;
      smoke = max(smoke,
        (1.0 - smoothstep(radius * 0.5, radius, length(p - center)))
          * (1.0 - phase * 0.55));
    }
    vec3 stackColor = mix(vec3(0.12, 0.12, 0.14), vec3(0.85, 0.78, 0.45), rim);
    vec3 smokeColor = vec3(0.50, 0.50, 0.52);
    float stackA = max(stack, rim) * 0.96;
    float a = max(stackA, smoke * 0.5);
    if (a > 0.01) {
      vec3 col = smoke * 0.5 > stackA ? smokeColor : stackColor;
      fragColor = vec4(col, a);
      return;
    }
  }

  // Dense animated startup cloud while loading/counting down. Several offset
  // puffs fill the enlarged quad instead of drawing a single thin exhaust.
  if (abs(vAtlasCol - float(PLANE_COL)) < 0.5 &&
      (abs(vFlags - FLAG_LAUNCH_SMOKE) < 0.1 ||
       abs(vFlags - FLAG_LAUNCH_FIRE) < 0.1) && texel.a < 0.01) {
    vec2 p = vCellUV - 0.5;
    float time = uTick * 0.075;
    float smoke = 0.0;
    float brightness = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float rise = fract(time + fi * 0.137);
      vec2 center = vec2(
        sin(fi * 8.31 + time * 1.7) * (0.06 + rise * 0.10),
        0.20 - rise * 0.52
      );
      float radius = 0.065 + rise * 0.10;
      float cloud = 1.0 - smoothstep(radius * 0.55, radius, length(p - center));
      smoke = max(smoke, cloud * (1.0 - rise * 0.62) * 0.52);
      brightness += cloud * (0.22 + 0.55 * rise);
    }
    // Hot, turbulent exhaust at the engines beneath the broad gray cloud.
    float firePhase = step(abs(vFlags - FLAG_LAUNCH_FIRE), 0.1);
    float exhaust = firePhase * smoothstep(0.15, 0.01,
        abs(p.x) + 0.045 * sin(uTick * 0.35 + p.y * 34.0))
        * smoothstep(0.08, 0.18, p.y)
        * smoothstep(0.58, 0.22, p.y);
    float flameY = smoothstep(0.10, 0.22, p.y) * smoothstep(1.12, 0.56, p.y);
    float flameWidth = 0.075 + max(0.0, p.y - 0.18) * 0.19;
    float flameWave = sin(p.y * 31.0 - uTick * 1.45) * 0.035
                    + sin(p.y * 57.0 + uTick * 2.1) * 0.018;
    float leftFlame = smoothstep(flameWidth, flameWidth * 0.18,
        abs(p.x + 0.17 + flameWave));
    float rightFlame = smoothstep(flameWidth, flameWidth * 0.18,
        abs(p.x - 0.17 - flameWave));
    float breakup = 0.72 + 0.28 * sin(p.y * 46.0 - uTick * 2.8);
    float twinFlame = firePhase * flameY * max(leftFlame, rightFlame)
                    * smoothstep(0.18, 0.78, breakup);
    float coreWidth = flameWidth * 0.34;
    float flameCore = firePhase * flameY * max(
      smoothstep(coreWidth, coreWidth * 0.15, abs(p.x + 0.17 + flameWave * 0.4)),
      smoothstep(coreWidth, coreWidth * 0.15, abs(p.x - 0.17 - flameWave * 0.4))
    );
    float fire = max(exhaust, twinFlame);
    smoke = max(smoke, fire);
    if (smoke > 0.01) {
      vec3 smokeColor = mix(vec3(0.16), vec3(0.78), clamp(brightness, 0.0, 1.0));
      smokeColor = mix(smokeColor, vec3(1.0, 0.06, 0.0), fire);
      smokeColor = mix(smokeColor, vec3(1.0, 0.58, 0.02), twinFlame);
      smokeColor = mix(smokeColor, vec3(1.0, 0.98, 0.72), flameCore);
      fragColor = vec4(smokeColor, max(smoke * 0.86, fire * 0.98));
      return;
    }
  }

  // Outside the sprite: render the steady soft glow under the hydrogen bomb,
  // otherwise discard. Glow is suppressed in alt (affiliation) view.
  if (texel.a < 0.01) {
    if (vGlow > 0.5 && uAltView == 0) {
      float d = length(vQuadPos - 0.5) * 2.0; // 0 at center → ~1 at quad edge
      float g = (1.0 - smoothstep(uHBombGlowInner, 1.0, d)) * uHBombGlowStrength;
      if (g > 0.001) {
        fragColor = vec4(uHBombGlowColor, g * alphaMul);
        return;
      }
    }
    discard;
  }

  float gray = texel.r;

  // Alt-view: solid affiliation color, no gray-replacement bands
  if (uAltView != 0) {
    // Enemy trade ships heading to a self/allied port render as yellow (ally)
    vec3 ac = abs(vFlags - FLAG_TRADE_FRIENDLY) < 0.1
      ? ALLY_COLOR
      : texelFetch(uAffiliation, ivec2(int(vOwnerID), 1), 0).rgb;
    ac = mix(ac, vec3(0.01), clamp(blackOutline * 2.0, 0.0, 1.0));
    fragColor = vec4(ac, texel.a * alphaMul);
    return;
  }

  // Player color lookup from palette
  float u = (vOwnerID + 0.5) / float(PALETTE_SIZE);
  vec3 territoryColor = texture(uPalette, vec2(u, 0.25)).rgb;
  vec3 borderColor    = texture(uPalette, vec2(u, 0.75)).rgb;

  // Flag states (uint8 passed as float via vertex attribute):
  //   0 = normal
  //   1 = flicker (nukes/warheads — cycling hot colors)
  //   2 = angry (warships attacking — outer ring (180 band) solid red)
  //   4 = retreating (warships fleeing to port — blinking black center)
  float retreatBlink = 0.0;
  if (abs(vFlags - FLAG_ANGRY) < 0.1) {
    // Angry: the outer ring (180) and center (100) go red via territoryColor
    territoryColor = uAngryColor;
  } else if (abs(vFlags - FLAG_RETREATING) < 0.1) {
    // Retreating: slowly blink the center (100 band) black so the ship reads as fleeing
    retreatBlink = step(0.5, fract(uTick * 0.07));
  } else if (abs(vFlags - FLAG_FLICKER) < 0.1 ||
             abs(vFlags - FLAG_FLICKER_UNTARGETABLE) < 0.1) {
    // Flicker: cycle through hot colors, offset by position hash
    float phase = fract(uTick * uFlickerSpeed + vHash);
    int idx = int(phase * 4.0) % 4;
    territoryColor = FLICKER_COLORS[idx];
    borderColor = FLICKER_COLORS[(idx + 2) % 4];
  }

  // Four-band gray replacement:
  //   180/255 ~ 0.706 -> territory color (light band)
  //   130/255 ~ 0.510 -> spawn/mid color (interpolated; used by missiles)
  //   100/255 ~ 0.392 -> center accent (warship center — tracks ring, blinks black)
  //   70/255  ~ 0.275 -> border color (dark band)
  vec3 spawnColor = mix(territoryColor, borderColor, 0.5);
  vec3 centerColor = mix(territoryColor, vec3(0.0), retreatBlink);

  vec3 color;
  if (gray > 0.6) {
    // Light band (180) -> territory color
    color = territoryColor;
  } else if (gray > 0.45) {
    // Mid band (130) -> spawn color
    color = spawnColor;
  } else if (gray > 0.34) {
    // Center accent band (100) -> center color
    color = centerColor;
  } else {
    // Dark band (70) -> border color
    color = borderColor;
  }

  color = mix(color, vec3(0.01), clamp(blackOutline * 2.0, 0.0, 1.0));
  if (fuelTrainMask > 0.0) {
    vec3 camoA = vec3(0.055, 0.16, 0.035);
    vec3 camoB = vec3(0.20, 0.38, 0.075);
    color = mix(camoA, camoB, fuelCamo);
    color = mix(color, vec3(0.008, 0.012, 0.006), fuelCamoBlack);
    color = mix(color, vec3(0.025), clamp(blackOutline * 2.0, 0.0, 1.0));
  }

  // The tank's projectile is a real hot fireball, while its dashed parabola
  // makes the upward-and-back-down self-destruct path readable at map scale.
  vec3 fireball = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.62, 0.12), tankMuzzleFlash);
  fireball = mix(fireball, vec3(1.0, 0.96, 0.72), smoothstep(0.55, 1.0, tankMuzzleFlash));
  color = mix(color, fireball, tankMuzzleFlash);

  fragColor = vec4(color, texel.a * alphaMul);
}
