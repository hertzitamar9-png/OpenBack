/**
 * Height-mapped 3D world compositor.
 *
 * A purpose-built tabletop renderer: terrain bytes create relief, tile state
 * supplies territory ownership, and the player palette supplies board-piece
 * colors. No flat screenshot is bent over the mesh.
 */
import {
  THREE_D_WAVE_HEIGHT_SCALE,
  threeDWorldCycle,
} from "../../../../core/world/ThreeDWorldCycle";
import { ThreeDCameraState } from "../three-d/ThreeDCamera";
import { THREE_D_WATER_HEIGHT } from "../three-d/ThreeDSurfaceSampler";
import { ThreeDTerrainChunks } from "../three-d/ThreeDTerrainChunks";
import {
  buildCompleteMapSurface,
  buildMapEdgeSkirt,
  buildSouthernLandClosure,
  buildTerrainGrid,
} from "../three-d/ThreeDTerrainMesh";
import { createFullscreenQuad, createProgram } from "../utils/GlUtils";

const skyVert = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main(){vUV=aPos;gl_Position=vec4(aPos*2.0-1.0,0.999,1.0);}`;

const skyFrag = `#version 300 es
precision highp float;
in vec2 vUV;
uniform float uTime;
uniform float uTilt;
uniform float uDaylight;
// Position along the day/night cycle, 0..1. Drives where the sun and moon sit.
uniform float uCyclePhase;
// Player setting: hides the sun, moon, stars and clouds without touching the
// daylight tint, the waves or the tide.
uniform float uShowSky;
// Win celebration: 0 = normal, rises toward 1 as the sun swells and detonates.
uniform float uSunBlast;
out vec4 outColor;

float hash21(vec2 p){
  p=fract(p*vec2(123.34,456.21));
  p+=dot(p,p+45.32);
  return fract(p.x*p.y);
}

float noise2(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  float a=hash21(i),b=hash21(i+vec2(1.0,0.0));
  float c=hash21(i+vec2(0.0,1.0)),d=hash21(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}

// Celestial bodies travel a shallow arc inside the visible sky band.
//
// Sweeping x across the full 0..1 put the sun hard against the screen edge for
// much of the cycle, and dipping to y=0.44 dropped it into the horizon wash
// where belowHorizon fades everything into the ocean floor colour. Both axes
// are inset so the sun and moon stay on screen and above the horizon.
vec2 arcPosition(float phase){
  float t=fract(phase);
  float x=0.14+t*0.72;
  return vec2(x,0.88-sin(t*3.14159265)*0.16);
}

void main(){
  // Match the classic battlefield's unobtrusive dark surround. The terrain is
  // the board; a painted horizon must never look like a second detached map.
  float vignette=1.0-0.16*smoothstep(0.28,0.82,length(vUV-vec2(0.5)));
  vec3 nightSky=vec3(0.006,0.012,0.035);
  vec3 daySky=vec3(0.055,0.22,0.42);
  vec3 sky=mix(nightSky,daySky,uDaylight);

  float night=1.0-smoothstep(0.20,0.55,uDaylight);
  float day=smoothstep(0.30,0.70,uDaylight);
  float aboveHorizon=smoothstep(0.18,0.34,vUV.y);

  // Stars: fixed points that fade in with the dark, twinkling slowly.
  vec2 starCell=floor(vUV*vec2(220.0,150.0));
  float starSeed=hash21(starCell);
  float star=step(0.9955,starSeed);
  float twinkle=0.65+0.35*sin(uTime*1.7+starSeed*40.0);
  sky+=vec3(0.85,0.90,1.0)*star*twinkle*night*aboveHorizon*uShowSky;

  // Daytime clouds: slow drifting bands, never over the lower horizon strip.
  vec2 cloudUV=vUV*vec2(3.4,1.9)+vec2(uTime*0.010,0.0);
  float clouds=smoothstep(0.56,0.86,noise2(cloudUV)*0.65+noise2(cloudUV*2.3)*0.35);
  sky=mix(sky,vec3(0.86,0.90,0.95),clouds*0.30*day*aboveHorizon*uShowSky);

  // The sun leads the cycle; the moon trails it by half a turn.
  vec2 sunPos=arcPosition(uCyclePhase);
  vec2 moonPos=arcPosition(uCyclePhase+0.5);
  vec2 aspect=vec2(1.0,0.62);

  float sunSwell=1.0+uSunBlast*7.0;
  float sunDist=length((vUV-sunPos)*aspect);
  float sunDisc=smoothstep(0.052*sunSwell,0.030*sunSwell,sunDist);
  float sunGlow=smoothstep(0.34*sunSwell,0.0,sunDist);
  // Sun rays: a soft star burst, brightest along a few spokes.
  float angle=atan(vUV.y-sunPos.y,(vUV.x-sunPos.x)*aspect.x/aspect.y);
  float rays=pow(max(0.0,0.5+0.5*sin(angle*8.0+uTime*0.25)),3.0);
  float rayFall=smoothstep(0.42*sunSwell,0.04,sunDist);

  float sunVisible=max(day,uSunBlast)*uShowSky;
  sky+=vec3(1.0,0.86,0.55)*sunGlow*0.30*sunVisible;
  sky+=vec3(1.0,0.90,0.62)*rays*rayFall*0.16*sunVisible;
  sky=mix(sky,vec3(1.0,0.97,0.86),sunDisc*sunVisible);
  // The detonation blanches the whole sky as it peaks.
  sky=mix(sky,vec3(1.0,0.95,0.80),uSunBlast*uSunBlast*0.75*uShowSky);

  float moonDist=length((vUV-moonPos)*aspect);
  float moonDisc=smoothstep(0.036,0.022,moonDist);
  float moonGlow=smoothstep(0.20,0.0,moonDist);
  float moonVisible=night*uShowSky;
  sky+=vec3(0.62,0.70,0.86)*moonGlow*0.16*moonVisible;
  sky=mix(sky,vec3(0.92,0.94,1.0),moonDisc*moonVisible);

  vec3 oceanFloor=vec3(0.018,0.085,0.15);
  float belowHorizon=1.0-smoothstep(0.22,0.62,vUV.y);
  outColor=vec4(mix(sky,oceanFloor,belowHorizon)*vignette,1.0);
}`;

const terrainVert = `#version 300 es
precision highp float;
precision highp usampler2D;
layout(location=0) in vec2 aUV;
uniform usampler2D uTerrain;
uniform vec2 uMapSize;
uniform mat4 uViewProjection;
uniform vec2 uGroundOrigin;
uniform vec2 uGroundSpan;
uniform int uFlashOwner;
uniform float uFlashAmount;
out vec2 vMapUV;
out float vHeight;
out float vViewDepth;
out vec2 vWorld;
out vec3 vTerrainNormal;

float heightFor(uint b){
  bool land=(b&128u)!=0u;
  float m=float(b&31u);
  if(land&&m>30.5)return 57.0;
  if(land)return (0.15+pow(m/30.0,2.0)*31.0)*1.5;
  return -min(m,10.0)*0.02;
}
float sampledHeight(ivec2 p){
  p=clamp(p,ivec2(0),ivec2(uMapSize)-1);
  return heightFor(texelFetch(uTerrain,p,0).r);
}
float smoothHeight(vec2 world){
  vec2 samplePos=world-vec2(0.5);
  ivec2 p=ivec2(floor(samplePos));
  vec2 f=smoothstep(vec2(0.0),vec2(1.0),fract(samplePos));
  float h00=sampledHeight(p);
  float h10=sampledHeight(p+ivec2(1,0));
  float h01=sampledHeight(p+ivec2(0,1));
  float h11=sampledHeight(p+ivec2(1,1));
  float center=mix(mix(h00,h10,f.x),mix(h01,h11,f.x),f.y);
  float r=1.5;
  // Stable nine-tap relief keeps real mountain structure while removing the
  // isolated triangular needles that made models and coastlines look torn.
  float cardinals=
    sampledHeight(ivec2(floor(samplePos+vec2(r,0.0))))+
    sampledHeight(ivec2(floor(samplePos-vec2(r,0.0))))+
    sampledHeight(ivec2(floor(samplePos+vec2(0.0,r))))+
    sampledHeight(ivec2(floor(samplePos-vec2(0.0,r))));
  float diagonals=
    sampledHeight(ivec2(floor(samplePos+vec2(r,r))))+
    sampledHeight(ivec2(floor(samplePos+vec2(r,-r))))+
    sampledHeight(ivec2(floor(samplePos+vec2(-r,r))))+
    sampledHeight(ivec2(floor(samplePos-vec2(r,r))));
  return (center*8.0+cardinals*2.0+diagonals)/20.0;
}
void main(){
  // Tessellate around the camera instead of stretching a fixed mesh over the
  // whole world. Zoomed-in ground therefore gains real local geometry.
  vec2 world=uGroundOrigin+aUV*uGroundSpan;
  vec2 mapUV=world/uMapSize;
  bool inside=all(greaterThanEqual(mapUV,vec2(0.0)))&&all(lessThanEqual(mapUV,vec2(1.0)));
  ivec2 tc=ivec2(clamp(floor(world),vec2(0.0),uMapSize-1.0));
  uint terrainByte=inside?texelFetch(uTerrain,tc,0).r:10u;
  float h=inside?smoothHeight(world):heightFor(terrainByte);
  float hx0=smoothHeight(world-vec2(1.0,0.0));
  float hx1=smoothHeight(world+vec2(1.0,0.0));
  float hz0=smoothHeight(world-vec2(0.0,1.0));
  float hz1=smoothHeight(world+vec2(0.0,1.0));
  gl_Position=uViewProjection*vec4(world.x,h,world.y,1.0);
  vMapUV=mapUV;
  vHeight=h;
  vViewDepth=gl_Position.w;
  vWorld=world;
  vTerrainNormal=normalize(vec3(hx0-hx1,2.0,hz0-hz1));
}`;

const baseVert = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uViewProjection;
void main(){gl_Position=uViewProjection*vec4(aPos,1.0);}`;

const baseFrag = `#version 300 es
precision highp float;
out vec4 outColor;
void main(){
  // The closed board is exposed at shallow camera angles. Use an opaque rock
  // material so partial southern edges read as solid terrain, never a void.
  outColor=vec4(0.16,0.145,0.125,1.0);
}`;

const skirtVert = `#version 300 es
precision highp float;
precision highp usampler2D;
layout(location=0) in vec3 aPos;
uniform usampler2D uTerrain;
uniform vec2 uMapSize;
uniform mat4 uViewProjection;
uniform float uSkirtBottom;
out float vHeight;
float heightFor(uint b){
  bool land=(b&128u)!=0u; float m=float(b&31u);
  if(land&&m>30.5)return 57.0;
  if(land)return (0.15+pow(m/30.0,2.0)*31.0)*1.5;
  return -min(m,10.0)*0.02;
}
void main(){
  ivec2 p=ivec2(clamp(floor(aPos.xz),vec2(0.0),uMapSize-1.0));
  float terrainHeight=heightFor(texelFetch(uTerrain,p,0).r);
  float height=mix(uSkirtBottom,terrainHeight,aPos.y);
  vHeight=height;
  gl_Position=uViewProjection*vec4(aPos.x,height,aPos.z,1.0);
}`;

const skirtFrag = `#version 300 es
precision highp float;
in float vHeight;
out vec4 outColor;
void main(){
  float snow=smoothstep(28.0,48.0,vHeight);
  vec3 rock=vec3(0.25,0.23,0.20);
  outColor=vec4(mix(rock,vec3(0.78,0.81,0.82),snow),1.0);
}`;

const waterVert = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uViewProjection;
uniform float uTime;
uniform float uGameTick;
uniform float uTideHeight;
uniform float uWaveStrength;
out vec2 vWorld;
out float vWave;
// Surface normal of the wave field, built the same way the terrain builds its
// own: finite differences of height around the vertex. Without this the water
// is lit uniformly and reads as a flat sheet however far the geometry moves.
out vec3 vWaveNormal;
// Slow, large-scale variation so the sea is not one uniform swell: some
// stretches run high and some stay comparatively calm, and the pattern drifts.
float swellRegion(vec2 p,float phase){
  float a=sin(dot(p,vec2(0.0032,0.0021))+phase*0.011);
  float b=sin(dot(p,vec2(-0.0018,0.0027))-phase*0.007);
  // 0.45 calm .. 1.55 heavy
  return 1.0+0.55*(a*0.6+b*0.4);
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
void main(){
  vWorld=aPos.xz;
  // Interpolate the authoritative tick for smooth geometry without changing
  // any simulation state.
  float phase=uGameTick+fract(uTime*10.0);
  vWave=gerstnerWave(vWorld,phase);

  // Sample the wave a short distance either side to get the slope. The
  // spacing is in world units, so the 2.0*e term keeps the normal correctly
  // proportioned exactly as the terrain shader does with unit spacing.
  // Must stay well inside one wavelength, or the difference averages the crest
  // away and reports a flatter surface than the water actually has.
  const float e=1.5;
  float scale=${THREE_D_WAVE_HEIGHT_SCALE.toFixed(1)};
  float hx0=gerstnerWave(vWorld-vec2(e,0.0),phase)*scale;
  float hx1=gerstnerWave(vWorld+vec2(e,0.0),phase)*scale;
  float hz0=gerstnerWave(vWorld-vec2(0.0,e),phase)*scale;
  float hz1=gerstnerWave(vWorld+vec2(0.0,e),phase)*scale;
  vWaveNormal=normalize(vec3(hx0-hx1,2.0*e,hz0-hz1));

  vec3 displaced=aPos;
  // Real vertical water: high crests rise, collapse at shore, and retreat with
  // the authoritative tide. Land remains a separate solid surface.
  displaced.y+=uTideHeight+vWave*${THREE_D_WAVE_HEIGHT_SCALE.toFixed(1)};
  gl_Position=uViewProjection*vec4(displaced,1.0);
}`;

const waterFrag = `#version 300 es
precision highp float;
precision highp usampler2D;
in vec2 vWorld;
in float vWave;
in vec3 vWaveNormal;
uniform usampler2D uTerrain;
uniform vec2 uMapSize;
uniform float uTime;
uniform float uDaylight;
uniform float uTideHeight;
out vec4 outColor;
float worldWave(vec2 p,float time){
  float broad=sin(dot(p,vec2(0.031,0.017))+time*0.55);
  float cross=sin(dot(p,vec2(-0.021,0.039))-time*0.42);
  return broad*0.55+cross*0.45;
}
void main(){
  ivec2 p=ivec2(clamp(floor(vWorld),vec2(0.0),uMapSize-1.0));
  uint terrainByte=texelFetch(uTerrain,p,0).r;
  bool land=(terrainByte&128u)!=0u;
  if(land)discard;
  bool shoreline=(terrainByte&64u)!=0u;
  float wave=worldWave(vWorld,uTime);
  float fine=sin((vWorld.x-vWorld.y)*0.11+uTime*0.75)*0.5+0.5;
  vec3 deep=vec3(0.025,0.20,0.34);
  vec3 highlight=vec3(0.075,0.48,0.68);
  float shoreBreak=sin(vWorld.x*0.18+vWorld.y*0.13-uTime*1.8)*0.5+0.5;
  // Foam follows how steeply the surface is tilted, so it appears on the faces
  // of real crests. Thresholding the wave value instead produced soft round
  // patches, because a sum of sines peaks in blobs rather than in lines.
  vec3 waveNormal=normalize(vWaveNormal);
  vec2 waveSlope=vec2(-waveNormal.x,-waveNormal.z)/max(0.18,waveNormal.y);
  float steepness=clamp(length(waveSlope),0.0,1.5);
  float openCrest=smoothstep(0.22,0.42,steepness)*0.20;
  float coastalBreak=shoreline?smoothstep(0.58,0.90,shoreBreak)*0.72:0.0;
  float foamCrest=max(openCrest,coastalBreak);
  float crest=foamCrest;
  float shimmer=clamp(0.28+wave*0.10+fine*0.055+crest*0.24,0.12,0.68);
  vec3 water=mix(deep,highlight,shimmer);
  water=mix(water,vec3(0.92,0.98,1.0),foamCrest*0.78);
  // Same directional lighting the terrain uses, so crests catch the light and
  // troughs fall into shade: this is what makes the height readable.
  float directional=clamp(0.5+dot(waveSlope,vec2(-0.68,-0.42))*0.9,0.0,1.0);
  float lightLevel=clamp(0.62+directional*0.62,0.55,1.30);
  water*=lightLevel;
  water*=mix(0.42,1.0,uDaylight);
  outColor=vec4(water,1.0);
}`;

const terrainFrag = `#version 300 es
precision highp float;
precision highp usampler2D;
in vec2 vMapUV;
in float vHeight;
in float vViewDepth;
in vec2 vWorld;
in vec3 vTerrainNormal;
uniform usampler2D uTerrain;
uniform usampler2D uTileState;
uniform usampler2D uTrailState;
uniform sampler2D uPalette;
uniform sampler2D uBorderTex;
uniform usampler2D uRailroadState;
uniform vec2 uMapSize;
uniform float uTime;
uniform float uDistance;
uniform int uFlashOwner;
uniform float uFlashAmount;
out vec4 outColor;

float heightFor(uint b){
  bool land=(b&128u)!=0u; float m=float(b&31u);
  if(land&&m>30.5)return 57.0;
  if(land)return (0.15+pow(m/30.0,2.0)*31.0)*1.5;
  return -min(m,10.0)*0.02;
}
float railSegmentDistance(vec2 p,vec2 a,vec2 b){
  vec2 ab=b-a;
  float t=clamp(dot(p-a,ab)/max(dot(ab,ab),0.0001),0.0,1.0);
  return length(p-a-ab*t);
}
float railSurfaceCoverage(uint railType,vec2 p){
  if(railType==0u||railType>6u)return 0.0;
  vec2 c=vec2(0.5);
  float d;
  if(railType==1u){
    d=railSegmentDistance(p,vec2(0.5,0.0),vec2(0.5,1.0));
  }else if(railType==2u){
    d=railSegmentDistance(p,vec2(0.0,0.5),vec2(1.0,0.5));
  }else{
    vec2 vertical=vec2(0.5,(railType==3u||railType==4u)?0.0:1.0);
    vec2 horizontal=vec2((railType==3u||railType==5u)?0.0:1.0,0.5);
    d=min(railSegmentDistance(p,c,vertical),railSegmentDistance(p,c,horizontal));
  }
  float rail=1.0-smoothstep(0.095,0.145,d);
  float along=(railType==1u)?p.y:(railType==2u)?p.x:length(p-c);
  float ties=(1.0-smoothstep(0.035,0.075,abs(fract(along*4.0)-0.5)))
    *(1.0-smoothstep(0.13,0.20,d));
  return max(rail,ties*0.72);
}
void main(){
  bool inside=all(greaterThanEqual(vMapUV,vec2(0.0)))&&all(lessThanEqual(vMapUV,vec2(1.0)));
  ivec2 p=ivec2(clamp(floor(vMapUV*uMapSize),vec2(0.0),uMapSize-1.0));
  uint centerByte=inside?texelFetch(uTerrain,p,0).r:10u;
  if((centerByte&128u)==0u)discard;
  vec3 continuousNormal=normalize(vTerrainNormal);
  vec2 stableSlope=vec2(-continuousNormal.x,-continuousNormal.z)/max(0.18,continuousNormal.y);
  float relief=clamp(length(stableSlope)*0.28,0.0,1.0);
  float directional=clamp(0.5+dot(stableSlope,vec2(-0.68,-0.42))*0.16,0.0,1.0);
  float lightLevel=clamp(0.70+directional*0.38-relief*0.08,0.62,1.14);
  float altitude=clamp(vHeight/57.0,0.0,1.0);
  vec3 lowGround=vec3(0.25,0.44,0.18);
  vec3 exposedRock=vec3(0.42,0.39,0.34);
  vec3 snow=vec3(0.91,0.94,0.96);
  float rockMask=max(smoothstep(0.25,0.58,altitude),smoothstep(0.16,0.62,relief));
  float snowMask=smoothstep(0.66,0.88,altitude)*(1.0-smoothstep(0.72,1.0,relief)*0.22);
  vec3 terrainMaterial=mix(lowGround,exposedRock,rockMask);
  terrainMaterial=mix(terrainMaterial,snow,snowMask);
  uint tileState=inside?texelFetch(uTileState,p,0).r:0u;
  uint owner=tileState&4095u;
  bool fallout=(tileState&(1u<<13u))!=0u;
  vec3 ownerColor=texture(uPalette,vec2((float(owner)+0.5)/4096.0,0.25)).rgb;
  // Ownership stays unmistakable, while the underlying rock and snow remain
  // visible instead of every claimed mountain becoming one flat green slab.
  vec3 boardMaterial=owner>0u?mix(terrainMaterial,ownerColor,0.68):terrainMaterial;
  if(owner>0u){
    boardMaterial=mix(boardMaterial,exposedRock,mix(0.0,0.34,rockMask));
    boardMaterial=mix(boardMaterial,snow,mix(0.0,0.72,snowMask));
  }
  if(fallout){
    vec3 falloutGround=vec3(0.055,0.19,0.075);
    boardMaterial=mix(falloutGround,exposedRock,rockMask*0.18);
  }
  vec3 color=boardMaterial*lightLevel;
  // Even the unlit side of a ridge remains a solid board material; dark
  // mountain facets must never read as holes in the map.
  color=max(color,max(boardMaterial*0.68,vec3(0.12,0.15,0.09)));
  if((centerByte&128u)!=0u&&owner>0u){
    // Use the exact GPU border field shared with the classic renderer. This
    // keeps 3D focus, defense borders, and the authoritative 2D outline on the
    // same pixels instead of approximating the edge a second time.
    float borderType=texelFetch(uBorderTex,p,0).r;
    if(borderType>0.25){
      color*=0.36;
    }
    if(int(owner)==uFlashOwner&&uFlashAmount>0.0){
      vec3 glow=vec3(0.42,0.92,1.0);
      color+=glow*(0.035+uFlashAmount*0.055);
      if(borderType>0.25){
        color=mix(color,glow,0.72+uFlashAmount*0.22);
        color+=glow*(0.16+uFlashAmount*0.24);
      }
    }
  }
  uint trailRaw=inside?texelFetch(uTrailState,p,0).r:0u;
  uint trailOwner=trailRaw&4095u;
  if(trailOwner>0u){
    vec3 trailColor=texture(uPalette,vec2((float(trailOwner)+0.5)/4096.0,0.25)).rgb;
    color=mix(color,trailColor,0.88);
  }
  // Exact rail orientation data, shaded directly into the raised surface.
  // This conforms to relief without reviving the old floating polygon webs.
  uint railType=inside?texelFetch(uRailroadState,p,0).r:0u;
  float railCoverage=railSurfaceCoverage(railType,fract(vWorld));
  if(railCoverage>0.0){
    vec3 railColor=owner>0u
      ?texture(uPalette,vec2((float(owner)+0.5)/4096.0,0.75)).rgb
      :vec3(0.16,0.17,0.18);
    color=mix(color,railColor,railCoverage*0.96);
  }
  outColor=vec4(color,1.0);
}`;

interface TerrainMesh {
  vao: WebGLVertexArrayObject;
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  indexCount: number;
  segmentsX: number;
  segmentsY: number;
}

export class ThreeDCompositePass {
  private skyProgram: WebGLProgram;
  private terrainProgram: WebGLProgram;
  private baseProgram: WebGLProgram;
  private skirtProgram: WebGLProgram;
  private waterProgram: WebGLProgram;
  private skyVao: WebGLVertexArrayObject;
  private baseVao: WebGLVertexArrayObject;
  private baseVertexBuffer: WebGLBuffer;
  private baseIndexBuffer: WebGLBuffer;
  private baseIndexCount: number;
  private baseViewProjection: WebGLUniformLocation | null;
  private skirtVao: WebGLVertexArrayObject;
  private skirtVertexBuffer: WebGLBuffer;
  private skirtIndexBuffer: WebGLBuffer;
  private skirtIndexCount: number;
  private skirtViewProjection: WebGLUniformLocation | null;
  private skirtMapSize: WebGLUniformLocation | null;
  private skirtBottom: WebGLUniformLocation | null;
  private southernVao: WebGLVertexArrayObject;
  private southernVertexBuffer: WebGLBuffer;
  private southernIndexBuffer: WebGLBuffer;
  private southernIndexCount: number;
  private waterVao: WebGLVertexArrayObject;
  private waterVertexBuffer: WebGLBuffer;
  private waterIndexBuffer: WebGLBuffer;
  private waterIndexCount: number;
  private waterViewProjection: WebGLUniformLocation | null;
  private waterTime: WebGLUniformLocation | null;
  private waterGameTick: WebGLUniformLocation | null;
  private waterTideHeight: WebGLUniformLocation | null;
  private waterWaveStrength: WebGLUniformLocation | null;
  private waterDaylight: WebGLUniformLocation | null;
  private waterMapSize: WebGLUniformLocation | null;
  private meshes: TerrainMesh[];
  private chunks: ThreeDTerrainChunks;
  private lodBias = 0;
  private skyTime: WebGLUniformLocation | null;
  private skyTilt: WebGLUniformLocation | null;
  private skyDaylight: WebGLUniformLocation | null;
  private skyCyclePhase: WebGLUniformLocation | null;
  private skyShowSky: WebGLUniformLocation | null;
  private skySunBlast: WebGLUniformLocation | null;
  /** Player setting: draw the sun, moon, stars and clouds. */
  private showSky = true;
  /** 0 normally; drives the win-time sun detonation. */
  private sunBlast = 0;
  private uniforms: Record<string, WebGLUniformLocation | null>;
  private borderState: WebGLTexture | null = null;
  private railroadState: WebGLTexture | null = null;

  constructor(
    private gl: WebGL2RenderingContext,
    private terrain: WebGLTexture,
    private tileState: WebGLTexture,
    private trailState: WebGLTexture,
    private palette: WebGLTexture,
    terrainBytes: Uint8Array,
    private mapWidth: number,
    private mapHeight: number,
  ) {
    this.skyProgram = createProgram(gl, skyVert, skyFrag);
    this.terrainProgram = createProgram(gl, terrainVert, terrainFrag);
    this.baseProgram = createProgram(gl, baseVert, baseFrag);
    this.skirtProgram = createProgram(gl, skirtVert, skirtFrag);
    this.waterProgram = createProgram(gl, waterVert, waterFrag);
    this.skyTime = gl.getUniformLocation(this.skyProgram, "uTime");
    this.skyTilt = gl.getUniformLocation(this.skyProgram, "uTilt");
    this.skyDaylight = gl.getUniformLocation(this.skyProgram, "uDaylight");
    this.skyCyclePhase = gl.getUniformLocation(this.skyProgram, "uCyclePhase");
    this.skyShowSky = gl.getUniformLocation(this.skyProgram, "uShowSky");
    this.skySunBlast = gl.getUniformLocation(this.skyProgram, "uSunBlast");
    this.uniforms = Object.fromEntries(
      [
        "uTerrain",
        "uTileState",
        "uTrailState",
        "uPalette",
        "uBorderTex",
        "uRailroadState",
        "uMapSize",
        "uViewProjection",
        "uTime",
        "uGroundOrigin",
        "uGroundSpan",
        "uFlashOwner",
        "uFlashAmount",
      ].map((name) => [name, gl.getUniformLocation(this.terrainProgram, name)]),
    );
    this.skyVao = createFullscreenQuad(gl);
    this.meshes = [128, 64, 32, 16].map((detail) => this.createMesh(detail));
    this.chunks = new ThreeDTerrainChunks(mapWidth, mapHeight);
    const surface = buildCompleteMapSurface(
      mapWidth,
      mapHeight,
      THREE_D_WATER_HEIGHT,
    );
    const base = surface.base;
    this.baseVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.baseVao);
    this.baseVertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.baseVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, base.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.baseIndexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.baseIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, base.indices, gl.STATIC_DRAW);
    this.baseIndexCount = base.indices.length;
    this.baseViewProjection = gl.getUniformLocation(
      this.baseProgram,
      "uViewProjection",
    );
    const skirt = buildMapEdgeSkirt(mapWidth, mapHeight);
    this.skirtVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.skirtVao);
    this.skirtVertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.skirtVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, skirt.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.skirtIndexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.skirtIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, skirt.indices, gl.STATIC_DRAW);
    this.skirtIndexCount = skirt.indices.length;
    this.skirtViewProjection = gl.getUniformLocation(
      this.skirtProgram,
      "uViewProjection",
    );
    this.skirtMapSize = gl.getUniformLocation(this.skirtProgram, "uMapSize");
    this.skirtBottom = gl.getUniformLocation(this.skirtProgram, "uSkirtBottom");
    gl.useProgram(this.skirtProgram);
    gl.uniform1i(gl.getUniformLocation(this.skirtProgram, "uTerrain"), 0);
    const southern = buildSouthernLandClosure(
      terrainBytes,
      mapWidth,
      mapHeight,
    );
    this.southernVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.southernVao);
    this.southernVertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.southernVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, southern.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.southernIndexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.southernIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, southern.indices, gl.STATIC_DRAW);
    this.southernIndexCount = southern.indices.length;
    this.waterVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.waterVao);
    this.waterVertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.waterVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, surface.water.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.waterIndexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.waterIndexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      surface.water.indices,
      gl.STATIC_DRAW,
    );
    this.waterIndexCount = surface.water.indices.length;
    this.waterViewProjection = gl.getUniformLocation(
      this.waterProgram,
      "uViewProjection",
    );
    this.waterTime = gl.getUniformLocation(this.waterProgram, "uTime");
    this.waterGameTick = gl.getUniformLocation(this.waterProgram, "uGameTick");
    this.waterTideHeight = gl.getUniformLocation(
      this.waterProgram,
      "uTideHeight",
    );
    this.waterWaveStrength = gl.getUniformLocation(
      this.waterProgram,
      "uWaveStrength",
    );
    this.waterDaylight = gl.getUniformLocation(this.waterProgram, "uDaylight");
    this.waterMapSize = gl.getUniformLocation(this.waterProgram, "uMapSize");
    gl.useProgram(this.waterProgram);
    gl.uniform1i(gl.getUniformLocation(this.waterProgram, "uTerrain"), 0);
    gl.bindVertexArray(null);
    gl.useProgram(this.terrainProgram);
    gl.uniform1i(this.uniforms.uTerrain, 0);
    gl.uniform1i(this.uniforms.uTileState, 1);
    gl.uniform1i(this.uniforms.uTrailState, 2);
    gl.uniform1i(this.uniforms.uPalette, 3);
    gl.uniform1i(this.uniforms.uBorderTex, 4);
    gl.uniform1i(this.uniforms.uRailroadState, 5);
  }

  setBorderTexture(borderState: WebGLTexture): void {
    this.borderState = borderState;
  }

  setRailroadTexture(railroadState: WebGLTexture): void {
    this.railroadState = railroadState;
  }

  private createMesh(maxSegments: number): TerrainMesh {
    const gl = this.gl;
    const sx = maxSegments;
    const sy = maxSegments;
    const { positions: vertices, indices } = buildTerrainGrid(sx, sy);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return {
      vao,
      vertexBuffer: vb,
      indexBuffer: ib,
      indexCount: indices.length,
      segmentsX: sx,
      segmentsY: sy,
    };
  }

  /**
   * Show or hide the sun, moon, stars and clouds.
   *
   * Deliberately visual only: daylight tint, waves and the tide keep running so
   * hiding the sky never changes how the game plays.
   */
  setShowSky(show: boolean): void {
    this.showSky = show;
  }

  /** Drive the win-time sun detonation, 0..1. */
  setSunBlast(amount: number): void {
    this.sunBlast = Math.max(0, Math.min(1, amount));
  }

  draw(
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    centerHeight: number,
    zoom: number,
    yaw: number,
    pitch: number,
    flashOwner = 0,
    flashAmount = 0,
    gameTick = 0,
  ): void {
    const gl = this.gl;
    gl.disable(gl.BLEND);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.skyProgram);
    gl.uniform1f(this.skyTime, performance.now() / 1000);
    gl.uniform1f(this.skyTilt, pitch);
    const worldCycle = threeDWorldCycle(gameTick);
    gl.uniform1f(this.skyDaylight, worldCycle.daylight);
    gl.uniform1f(this.skyCyclePhase, worldCycle.phase);
    gl.uniform1f(this.skyShowSky, this.showSky ? 1 : 0);
    gl.uniform1f(this.skySunBlast, this.sunBlast);
    gl.bindVertexArray(this.skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    const camera = ThreeDCameraState.create({
      viewportWidth: width,
      viewportHeight: height,
      mapWidth: this.mapWidth,
      mapHeight: this.mapHeight,
      centerX,
      centerZ: centerY,
      centerHeight,
      zoom,
      yaw,
      pitch,
    });
    const viewProjection = new Float32Array(camera.viewProjection);
    gl.useProgram(this.baseProgram);
    gl.uniformMatrix4fv(this.baseViewProjection, false, viewProjection);
    gl.bindVertexArray(this.baseVao);
    gl.drawElements(gl.TRIANGLES, this.baseIndexCount, gl.UNSIGNED_INT, 0);

    gl.useProgram(this.skirtProgram);
    gl.uniformMatrix4fv(this.skirtViewProjection, false, viewProjection);
    gl.uniform2f(this.skirtMapSize, this.mapWidth, this.mapHeight);
    gl.uniform1f(this.skirtBottom, THREE_D_WATER_HEIGHT - 0.92);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.terrain);
    gl.bindVertexArray(this.skirtVao);
    gl.drawElements(gl.TRIANGLES, this.skirtIndexCount, gl.UNSIGNED_INT, 0);
    if (this.southernIndexCount > 0) {
      gl.bindVertexArray(this.southernVao);
      gl.drawElements(
        gl.TRIANGLES,
        this.southernIndexCount,
        gl.UNSIGNED_INT,
        0,
      );
    }

    gl.useProgram(this.waterProgram);
    gl.uniformMatrix4fv(this.waterViewProjection, false, viewProjection);
    gl.uniform1f(this.waterTime, performance.now() / 1000);
    gl.uniform1f(this.waterGameTick, gameTick);
    gl.uniform1f(this.waterTideHeight, worldCycle.tideHeight);
    gl.uniform1f(this.waterWaveStrength, worldCycle.waveStrength);
    gl.uniform1f(this.waterDaylight, worldCycle.daylight);
    gl.uniform2f(this.waterMapSize, this.mapWidth, this.mapHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.terrain);
    gl.bindVertexArray(this.waterVao);
    gl.drawElements(gl.TRIANGLES, this.waterIndexCount, gl.UNSIGNED_INT, 0);

    gl.useProgram(this.terrainProgram);
    gl.uniform2f(this.uniforms.uMapSize, this.mapWidth, this.mapHeight);
    gl.uniformMatrix4fv(this.uniforms.uViewProjection, false, viewProjection);
    gl.uniform1f(this.uniforms.uTime, performance.now() / 1000);
    gl.uniform1i(this.uniforms.uFlashOwner, flashOwner);
    gl.uniform1f(this.uniforms.uFlashAmount, flashAmount);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.terrain);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tileState);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.trailState);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.palette);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.borderState);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, this.railroadState);
    for (const chunk of this.chunks.visible(camera)) {
      const mesh = this.meshes[Math.min(3, chunk.lod + this.lodBias)];
      gl.uniform2f(this.uniforms.uGroundOrigin, chunk.x, chunk.y);
      gl.uniform2f(this.uniforms.uGroundSpan, chunk.width, chunk.height);
      gl.bindVertexArray(mesh.vao);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_INT, 0);
    }
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
  }

  setQuality(lodBias: number): void {
    this.lodBias = Math.max(0, Math.min(2, Math.floor(lodBias)));
  }

  dispose(): void {
    this.gl.deleteProgram(this.skyProgram);
    this.gl.deleteProgram(this.terrainProgram);
    this.gl.deleteProgram(this.baseProgram);
    this.gl.deleteProgram(this.skirtProgram);
    this.gl.deleteProgram(this.waterProgram);
    this.gl.deleteVertexArray(this.skyVao);
    this.gl.deleteVertexArray(this.baseVao);
    this.gl.deleteBuffer(this.baseVertexBuffer);
    this.gl.deleteBuffer(this.baseIndexBuffer);
    this.gl.deleteVertexArray(this.skirtVao);
    this.gl.deleteBuffer(this.skirtVertexBuffer);
    this.gl.deleteBuffer(this.skirtIndexBuffer);
    this.gl.deleteVertexArray(this.southernVao);
    this.gl.deleteBuffer(this.southernVertexBuffer);
    this.gl.deleteBuffer(this.southernIndexBuffer);
    this.gl.deleteVertexArray(this.waterVao);
    this.gl.deleteBuffer(this.waterVertexBuffer);
    this.gl.deleteBuffer(this.waterIndexBuffer);
    for (const mesh of this.meshes) {
      this.gl.deleteVertexArray(mesh.vao);
      this.gl.deleteBuffer(mesh.vertexBuffer);
      this.gl.deleteBuffer(mesh.indexBuffer);
    }
  }
}
