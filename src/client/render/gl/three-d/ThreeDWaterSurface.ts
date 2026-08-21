import { THREE_D_WAVE_HEIGHT_SCALE } from "../../../../core/world/ThreeDWorldCycle";

/**
 * The sea surface, as GLSL, shared verbatim by everything that needs it.
 *
 * The water mesh builds its geometry from this, and anything floating on the
 * sea reads its height from the same functions. Keeping one definition is the
 * whole point: ships used to be pinned to a constant -0.08, slightly *below*
 * still water, while the sea itself rose with the tide and stood up in crests
 * several units tall. The water simply climbed over them, which is why they
 * read as drowning rather than floating.
 *
 * Requires the including shader to declare:
 *   uniform float uWaveStrength;
 */
export const THREE_D_WATER_SURFACE_GLSL = `
// Slow, large-scale variation so the sea is not one uniform swell: some
// stretches run high and some stay comparatively calm, and the pattern drifts.
float swellRegion(vec2 p,float phase){
  float a=sin(dot(p,vec2(0.0032,0.0021))+phase*0.011);
  float b=sin(dot(p,vec2(-0.0018,0.0027))-phase*0.007);
  // 0.30 calm .. 1.70 heavy: a wide spread so some stretches are near glassy
  // while others run genuinely rough.
  return 1.0+0.70*(a*0.6+b*0.4);
}
float gerstnerWave(vec2 p,float phase){
  // Wavelengths around 35 world units. At the previous ~70 a two-unit crest
  // spanned a 1:35 slope, so the surface was geometrically almost flat and
  // nothing lit it; the mesh still carries about 6.7 vertices per wave here.
  float broad=sin(dot(p,vec2(0.180,0.068))+phase*0.075);
  float cross=sin(dot(p,vec2(-0.104,0.224))-phase*0.052);
  float swell=sin(dot(p,vec2(0.040,-0.072))+phase*0.031);
  // A short chop rides on the long swell so crests are not all the same size.
  float chop=sin(dot(p,vec2(0.420,0.340))+phase*0.140)*0.16;
  float body=broad*0.46+cross*0.29+swell*0.25+chop;
  return body*uWaveStrength*swellRegion(p,phase);
}
// Wall-clock phase, continuous and monotonic. Adding a sawtooth to the integer
// tick looked like interpolation but the two were never in step: fract()
// snapped back to zero ten times a second while the tick stepped on its own
// schedule, so the phase lurched forward and back and the crests juddered in
// place instead of travelling. The water is presentation only, so it can
// follow the clock without touching simulation state.
float waterPhase(float time){return time*10.0;}
// Height of the sea at a world position: the authoritative tide plus the wave
// field. Anything that floats sits on this.
float waterSurfaceHeight(vec2 p,float phase,float tide){
  return tide+gerstnerWave(p,phase)*${THREE_D_WAVE_HEIGHT_SCALE.toFixed(1)};
}
`;

/**
 * How deep a hull sits into the surface it rides, in world units.
 *
 * Sitting exactly on the surface makes a vessel look stuck to the water like a
 * decal; a little draft reads as displacement without letting crests close
 * over the deck.
 */
export const THREE_D_HULL_DRAFT = 0.35;
