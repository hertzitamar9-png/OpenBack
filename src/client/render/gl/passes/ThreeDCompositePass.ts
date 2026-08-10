/**
 * Height-mapped 3D world compositor.
 *
 * A purpose-built tabletop renderer: terrain bytes create relief, tile state
 * supplies territory ownership, and the player palette supplies board-piece
 * colors. No flat screenshot is bent over the mesh.
 */
import { ThreeDCameraState } from "../three-d/ThreeDCamera";
import { THREE_D_WATER_HEIGHT } from "../three-d/ThreeDSurfaceSampler";
import { ThreeDTerrainChunks } from "../three-d/ThreeDTerrainChunks";
import {
  buildCompleteMapSurface,
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
out vec4 outColor;
void main(){
  // Match the classic battlefield's unobtrusive dark surround. The terrain is
  // the board; a painted horizon must never look like a second detached map.
  float vignette=1.0-0.16*smoothstep(0.28,0.82,length(vUV-vec2(0.5)));
  vec3 sky=vec3(0.012,0.017,0.026);
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
uniform float uSampleRadius;
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
  float r=max(1.5,uSampleRadius);
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
void main(){outColor=vec4(0.018,0.028,0.042,1.0);}`;

const waterVert = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uViewProjection;
out vec2 vWorld;
void main(){vWorld=aPos.xz;gl_Position=uViewProjection*vec4(aPos,1.0);}`;

const waterFrag = `#version 300 es
precision highp float;
in vec2 vWorld;
uniform float uTime;
out vec4 outColor;
float worldWave(vec2 p,float time){
  float broad=sin(dot(p,vec2(0.031,0.017))+time*0.55);
  float cross=sin(dot(p,vec2(-0.021,0.039))-time*0.42);
  return broad*0.55+cross*0.45;
}
void main(){
  float wave=worldWave(vWorld,uTime);
  float fine=sin((vWorld.x-vWorld.y)*0.11+uTime*0.75)*0.5+0.5;
  vec3 deep=vec3(0.025,0.20,0.34);
  vec3 highlight=vec3(0.075,0.48,0.68);
  float shimmer=clamp(0.28+wave*0.10+fine*0.055,0.12,0.48);
  outColor=vec4(mix(deep,highlight,shimmer),1.0);
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
uniform vec2 uMapSize;
uniform float uTime;
uniform float uDistance;
uniform float uSampleRadius;
uniform int uFlashOwner;
uniform float uFlashAmount;
out vec4 outColor;

float heightFor(uint b){
  bool land=(b&128u)!=0u; float m=float(b&31u);
  if(land&&m>30.5)return 57.0;
  if(land)return (0.15+pow(m/30.0,2.0)*31.0)*1.5;
  return -min(m,10.0)*0.02;
}
void main(){
  bool inside=all(greaterThanEqual(vMapUV,vec2(0.0)))&&all(lessThanEqual(vMapUV,vec2(1.0)));
  ivec2 size=textureSize(uTerrain,0);
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
    ivec2 ownerLeft=ivec2(max(0,p.x-1),p.y),ownerRight=ivec2(min(size.x-1,p.x+1),p.y);
    ivec2 ownerUp=ivec2(p.x,max(0,p.y-1)),ownerDown=ivec2(p.x,min(size.y-1,p.y+1));
    vec2 f=fract(vMapUV*uMapSize);
    bool edge=(f.x<0.10&&(texelFetch(uTileState,ownerLeft,0).r&4095u)!=owner)||
              (f.x>0.90&&(texelFetch(uTileState,ownerRight,0).r&4095u)!=owner)||
              (f.y<0.10&&(texelFetch(uTileState,ownerUp,0).r&4095u)!=owner)||
              (f.y>0.90&&(texelFetch(uTileState,ownerDown,0).r&4095u)!=owner);
    if(edge){
      color*=0.36;
      if(int(owner)==uFlashOwner) color=mix(color,vec3(0.30,0.84,1.0),uFlashAmount);
    }
  }
  uint trailRaw=inside?texelFetch(uTrailState,p,0).r:0u;
  uint trailOwner=trailRaw&4095u;
  if(trailOwner>0u){
    vec3 trailColor=texture(uPalette,vec2((float(trailOwner)+0.5)/4096.0,0.25)).rgb;
    color=mix(color,trailColor,0.88);
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
  private waterProgram: WebGLProgram;
  private skyVao: WebGLVertexArrayObject;
  private baseVao: WebGLVertexArrayObject;
  private baseVertexBuffer: WebGLBuffer;
  private baseIndexBuffer: WebGLBuffer;
  private baseIndexCount: number;
  private baseViewProjection: WebGLUniformLocation | null;
  private waterVao: WebGLVertexArrayObject;
  private waterVertexBuffer: WebGLBuffer;
  private waterIndexBuffer: WebGLBuffer;
  private waterIndexCount: number;
  private waterViewProjection: WebGLUniformLocation | null;
  private waterTime: WebGLUniformLocation | null;
  private meshes: TerrainMesh[];
  private chunks: ThreeDTerrainChunks;
  private lodBias = 0;
  private skyTime: WebGLUniformLocation | null;
  private skyTilt: WebGLUniformLocation | null;
  private uniforms: Record<string, WebGLUniformLocation | null>;

  constructor(
    private gl: WebGL2RenderingContext,
    private terrain: WebGLTexture,
    private tileState: WebGLTexture,
    private trailState: WebGLTexture,
    private palette: WebGLTexture,
    private mapWidth: number,
    private mapHeight: number,
  ) {
    this.skyProgram = createProgram(gl, skyVert, skyFrag);
    this.terrainProgram = createProgram(gl, terrainVert, terrainFrag);
    this.baseProgram = createProgram(gl, baseVert, baseFrag);
    this.waterProgram = createProgram(gl, waterVert, waterFrag);
    this.skyTime = gl.getUniformLocation(this.skyProgram, "uTime");
    this.skyTilt = gl.getUniformLocation(this.skyProgram, "uTilt");
    this.uniforms = Object.fromEntries(
      [
        "uTerrain",
        "uTileState",
        "uTrailState",
        "uPalette",
        "uMapSize",
        "uViewProjection",
        "uTime",
        "uGroundOrigin",
        "uGroundSpan",
        "uSampleRadius",
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
    gl.bindVertexArray(null);
    gl.useProgram(this.terrainProgram);
    gl.uniform1i(this.uniforms.uTerrain, 0);
    gl.uniform1i(this.uniforms.uTileState, 1);
    gl.uniform1i(this.uniforms.uTrailState, 2);
    gl.uniform1i(this.uniforms.uPalette, 3);
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
  ): void {
    const gl = this.gl;
    gl.disable(gl.BLEND);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.skyProgram);
    gl.uniform1f(this.skyTime, performance.now() / 1000);
    gl.uniform1f(this.skyTilt, pitch);
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

    gl.useProgram(this.waterProgram);
    gl.uniformMatrix4fv(this.waterViewProjection, false, viewProjection);
    gl.uniform1f(this.waterTime, performance.now() / 1000);
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
    for (const chunk of this.chunks.visible(camera)) {
      const mesh = this.meshes[Math.min(3, chunk.lod + this.lodBias)];
      gl.uniform2f(this.uniforms.uGroundOrigin, chunk.x, chunk.y);
      gl.uniform2f(this.uniforms.uGroundSpan, chunk.width, chunk.height);
      gl.uniform1f(this.uniforms.uSampleRadius, 1);
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
    this.gl.deleteProgram(this.waterProgram);
    this.gl.deleteVertexArray(this.skyVao);
    this.gl.deleteVertexArray(this.baseVao);
    this.gl.deleteBuffer(this.baseVertexBuffer);
    this.gl.deleteBuffer(this.baseIndexBuffer);
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
