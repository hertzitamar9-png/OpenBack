#version 300 es
precision highp float;

uniform sampler2D uAtlas;

in vec2  vAtlasUV;
flat in float vAlpha;
in vec2 vLocal;
flat in float vFxType;
flat in float vFrame;

out vec4 fragColor;

float wreckBox(vec2 p, vec2 halfSize) {
  vec2 d = abs(p) - halfSize;
  return 1.0 - smoothstep(0.0, 0.035,
      length(max(d, 0.0)) + min(max(d.x, d.y), 0.0));
}

void main() {
  if (abs(vFxType - 12.0) < 0.1) {
    vec2 p = vLocal;
    // Four disconnected aircraft pieces thrown around the impact point.
    float scatter = smoothstep(0.0, 12.0, vFrame);
    vec2 bodyP = p - vec2(0.02, -0.10) * scatter;
    float body = wreckBox(bodyP - vec2(-0.05, -0.03), vec2(0.10, 0.36));
    vec2 leftWingP = p - vec2(-0.34 - 0.14 * scatter, -0.05 - 0.06 * scatter);
    float lc = cos(-0.28), ls = sin(-0.28);
    leftWingP = vec2(leftWingP.x * lc - leftWingP.y * ls,
                     leftWingP.x * ls + leftWingP.y * lc);
    float leftWing = wreckBox(leftWingP, vec2(0.31, 0.11));
    vec2 rightWingP = p - vec2(0.32 + 0.15 * scatter, 0.13 + 0.04 * scatter);
    float rc = cos(0.36), rs = sin(0.36);
    rightWingP = vec2(rightWingP.x * rc - rightWingP.y * rs,
                      rightWingP.x * rs + rightWingP.y * rc);
    float rightWing = wreckBox(rightWingP, vec2(0.30, 0.105));
    vec2 tailP = p - vec2(0.12 + 0.04 * scatter, 0.38 + 0.13 * scatter);
    float tc = cos(-0.18), ts = sin(-0.18);
    tailP = vec2(tailP.x * tc - tailP.y * ts,
                 tailP.x * ts + tailP.y * tc);
    float tail = wreckBox(tailP, vec2(0.18, 0.13));
    float metal = max(max(body, leftWing), max(rightWing, tail));

    // Flames cling to each wreck section and flicker while smoke/metal fade
    // over the full five-second lifetime supplied by the CPU.
    float time = vFrame * 0.31;
    float flameNoise = 0.55 + 0.45 * sin(
        p.x * 43.0 + p.y * 31.0 + time * 5.0);
    float firePockets = max(
      1.0 - smoothstep(0.10, 0.23, length(p - vec2(-0.12, -0.08))),
      max(1.0 - smoothstep(0.08, 0.19, length(p - vec2(0.38, 0.13))),
          1.0 - smoothstep(0.07, 0.17, length(p - vec2(-0.40, -0.04))))
    );
    float fire = metal * firePockets * smoothstep(0.42, 0.88, flameNoise);
    float ember = metal * smoothstep(0.72, 0.98,
        0.5 + 0.5 * sin(p.x * 71.0 - p.y * 53.0 + time * 8.0));
    if (metal < 0.01) discard;
    vec3 charred = vec3(0.055, 0.045, 0.04);
    vec3 color = mix(charred, vec3(1.0, 0.12, 0.01), fire);
    color = mix(color, vec3(1.0, 0.72, 0.05), ember);
    fragColor = vec4(color, metal * vAlpha);
    return;
  }
  vec4 texel = texture(uAtlas, vAtlasUV);
  if (texel.a < 0.01) discard;
  fragColor = vec4(texel.rgb, texel.a * vAlpha);
}
