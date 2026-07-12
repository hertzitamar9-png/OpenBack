#version 300 es
precision highp float;

uniform sampler2D uAtlas;

in vec2  vAtlasUV;
flat in float vAlpha;
in vec2 vLocal;
flat in float vFxType;
flat in float vFrame;

out vec4 fragColor;

void main() {
  if (abs(vFxType - 12.0) < 0.1) {
    vec2 p = vLocal;
    // Four disconnected aircraft pieces thrown around the impact point.
    float scatter = smoothstep(0.0, 12.0, vFrame);
    vec2 bodyP = p - vec2(0.02, -0.10) * scatter;
    float body = (1.0 - smoothstep(0.055, 0.085, abs(bodyP.x + 0.05)))
               * (1.0 - smoothstep(0.24, 0.37, abs(bodyP.y + 0.03)));
    vec2 leftWingP = p - vec2(-0.34 - 0.14 * scatter, -0.05 - 0.06 * scatter);
    float leftWing = (1.0 - smoothstep(0.035, 0.075,
        abs(leftWingP.y + leftWingP.x * 0.35)))
        * (1.0 - smoothstep(0.08, 0.31, abs(leftWingP.x)));
    vec2 rightWingP = p - vec2(0.32 + 0.15 * scatter, 0.13 + 0.04 * scatter);
    float rightWing = (1.0 - smoothstep(0.035, 0.075,
        abs(rightWingP.y - rightWingP.x * 0.42)))
        * (1.0 - smoothstep(0.08, 0.30, abs(rightWingP.x)));
    vec2 tailP = p - vec2(0.12 + 0.04 * scatter, 0.38 + 0.13 * scatter);
    float tail = (1.0 - smoothstep(0.045, 0.09, abs(tailP.x + tailP.y * 0.22)))
               * (1.0 - smoothstep(0.05, 0.20, abs(tailP.y)));
    float metal = max(max(body, leftWing), max(rightWing, tail));

    // Flames cling to each wreck section and flicker while smoke/metal fade
    // over the full five-second lifetime supplied by the CPU.
    float time = vFrame * 0.31;
    float flameNoise = 0.55 + 0.45 * sin(
        p.x * 43.0 + p.y * 31.0 + time * 5.0);
    float fire = metal * smoothstep(0.42, 0.88, flameNoise);
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
