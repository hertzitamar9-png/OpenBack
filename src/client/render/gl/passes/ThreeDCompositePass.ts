/**
 * Height-mapped 3D world compositor.
 *
 * A purpose-built tabletop renderer: terrain bytes create relief, tile state
 * supplies territory ownership, and the player palette supplies board-piece
 * colors. No flat screenshot is bent over the mesh.
 */
import { THREE_D_FOV_DEGREES } from "../three-d/ThreeDWorldMath";
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
uniform vec2 uCenter;
uniform float uDistance;
uniform float uTanHalfFov;
uniform float uAspect;
uniform float uTilt;
uniform float uYaw;
uniform vec2 uGroundHalfSize;
uniform float uSampleRadius;
out vec2 vMapUV;
out float vHeight;
out float vViewDepth;

float heightFor(uint b){
  bool land=(b&128u)!=0u;
  float m=float(b&31u);
  if(land&&m>30.5)return 26.0;
  if(land)return 0.15+pow(m/30.0,1.18)*22.0;
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
  // A small cross-filter bridges the land/water step over several geometry
  // vertices. Coasts remain crisp in the fragment material, while the solid
  // floor no longer forms a row of hanging triangular teeth.
  return (center*4.0+
    sampledHeight(ivec2(floor(samplePos+vec2(r,0.0))))+
    sampledHeight(ivec2(floor(samplePos-vec2(r,0.0))))+
    sampledHeight(ivec2(floor(samplePos+vec2(0.0,r))))+
    sampledHeight(ivec2(floor(samplePos-vec2(0.0,r))))) / 8.0;
}
void main(){
  // Tessellate around the camera instead of stretching a fixed mesh over the
  // whole world. Zoomed-in ground therefore gains real local geometry.
  vec2 world=uCenter+(aUV*2.0-1.0)*uGroundHalfSize;
  vec2 mapUV=world/uMapSize;
  bool inside=all(greaterThanEqual(mapUV,vec2(0.0)))&&all(lessThanEqual(mapUV,vec2(1.0)));
  ivec2 tc=ivec2(clamp(floor(world),vec2(0.0),uMapSize-1.0));
  uint terrainByte=inside?texelFetch(uTerrain,tc,0).r:10u;
  float h=inside?smoothHeight(world):heightFor(terrainByte);
  vec2 d=world-uCenter;
  float cy=cos(uYaw),sy=sin(uYaw);
  d=vec2(d.x*cy-d.y*sy,d.x*sy+d.y*cy);
  float ct=cos(uTilt),st=sin(uTilt);
  // A real camera above the XZ floor: positive terrain height moves toward
  // the camera and upward on screen; distant ground converges upward toward
  // the horizon rather than hanging below it like an inverted map.
  float viewY=-d.y*ct+h*st;
  float viewZ=uDistance-d.y*st-h*ct;
  float nearPlane=0.5,farPlane=max(nearPlane+1.0,uDistance*8.0+50.0);
  float clipZ=((farPlane+nearPlane)/(farPlane-nearPlane))*viewZ
    -(2.0*farPlane*nearPlane)/(farPlane-nearPlane);
  // Preserve viewZ as clip-space W. WebGL now performs real perspective
  // interpolation and clips geometry at the near plane, preventing terrain
  // and player models from stretching into giant screen-sized triangles.
  gl_Position=vec4(
    d.x/(uTanHalfFov*uAspect),
    viewY/uTanHalfFov,
    clipZ,
    viewZ
  );
  vMapUV=mapUV;
  vHeight=h;
  vViewDepth=viewZ;
}`;

const terrainFrag = `#version 300 es
precision highp float;
precision highp usampler2D;
in vec2 vMapUV;
in float vHeight;
in float vViewDepth;
uniform usampler2D uTerrain;
uniform usampler2D uTileState;
uniform usampler2D uTrailState;
uniform sampler2D uPalette;
uniform vec2 uMapSize;
uniform float uTime;
uniform float uDistance;
uniform float uSampleRadius;
out vec4 outColor;

float heightFor(uint b){
  bool land=(b&128u)!=0u; float m=float(b&31u);
  if(land&&m>30.5)return 26.0;
  if(land)return 0.15+pow(m/30.0,1.18)*22.0;
  return -min(m,10.0)*0.02;
}
void main(){
  bool inside=all(greaterThanEqual(vMapUV,vec2(0.0)))&&all(lessThanEqual(vMapUV,vec2(1.0)));
  ivec2 size=textureSize(uTerrain,0);
  ivec2 p=ivec2(clamp(floor(vMapUV*uMapSize),vec2(0.0),uMapSize-1.0));
  uint centerByte=inside?texelFetch(uTerrain,p,0).r:10u;
  vec2 slope=vec2(dFdx(vHeight),dFdy(vHeight));
  float relief=clamp(length(slope)*0.13,0.0,1.0);
  float directional=clamp(0.5+(-slope.x-slope.y)*0.055,0.0,1.0);
  float lightLevel=clamp(0.76+directional*0.25-relief*0.10,0.68,1.10);
  float altitude=clamp(vHeight/22.0,0.0,1.0);
  vec3 lowGround=vec3(0.27,0.43,0.19);
  vec3 highGround=vec3(0.43,0.35,0.23);
  vec3 terrainMaterial=mix(lowGround,highGround,smoothstep(0.18,0.66,altitude));
  terrainMaterial=mix(terrainMaterial,vec3(0.82,0.84,0.83),smoothstep(0.70,0.96,altitude));
  uint tileState=inside?texelFetch(uTileState,p,0).r:0u;
  uint owner=tileState&4095u;
  vec3 ownerColor=texture(uPalette,vec2((float(owner)+0.5)/4096.0,0.25)).rgb;
  vec3 boardMaterial=owner>0u?ownerColor:terrainMaterial;
  vec3 color=boardMaterial*lightLevel;
  if((centerByte&128u)==0u){
    float depth=clamp(float(centerByte&31u)/10.0,0.0,1.0);
    vec3 water=mix(vec3(0.055,0.29,0.44),vec3(0.012,0.10,0.22),depth);
    color=water;
  }else{
    // Even the unlit side of a ridge remains a solid board material; dark
    // mountain facets must never read as holes in the map.
    color=max(color,max(boardMaterial*0.68,vec3(0.12,0.15,0.09)));
  }
  if((centerByte&128u)!=0u&&owner>0u){
    ivec2 left=ivec2(max(0,p.x-1),p.y),right=ivec2(min(size.x-1,p.x+1),p.y);
    ivec2 up=ivec2(p.x,max(0,p.y-1)),down=ivec2(p.x,min(size.y-1,p.y+1));
    vec2 f=fract(vMapUV*uMapSize);
    bool edge=(f.x<0.10&&(texelFetch(uTileState,left,0).r&4095u)!=owner)||
              (f.x>0.90&&(texelFetch(uTileState,right,0).r&4095u)!=owner)||
              (f.y<0.10&&(texelFetch(uTileState,up,0).r&4095u)!=owner)||
              (f.y>0.90&&(texelFetch(uTileState,down,0).r&4095u)!=owner);
    if(edge)color*=0.36;
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
  segmentsY: number;
}

export class ThreeDCompositePass {
  private skyProgram: WebGLProgram;
  private terrainProgram: WebGLProgram;
  private skyVao: WebGLVertexArrayObject;
  private meshes: TerrainMesh[];
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
    this.skyTime = gl.getUniformLocation(this.skyProgram, "uTime");
    this.skyTilt = gl.getUniformLocation(this.skyProgram, "uTilt");
    this.uniforms = Object.fromEntries(
      [
        "uTerrain",
        "uTileState",
        "uTrailState",
        "uPalette",
        "uMapSize",
        "uCenter",
        "uDistance",
        "uTanHalfFov",
        "uAspect",
        "uTilt",
        "uYaw",
        "uTime",
        "uGroundHalfSize",
        "uSampleRadius",
      ].map((name) => [name, gl.getUniformLocation(this.terrainProgram, name)]),
    );
    this.skyVao = createFullscreenQuad(gl);
    // One stable topology avoids visible LOD popping while orbiting or
    // scrolling. Perspective already supplies more local detail when zoomed.
    this.meshes = [384].map((detail) => this.createMesh(detail));
    gl.useProgram(this.terrainProgram);
    gl.uniform1i(this.uniforms.uTerrain, 0);
    gl.uniform1i(this.uniforms.uTileState, 1);
    gl.uniform1i(this.uniforms.uTrailState, 2);
    gl.uniform1i(this.uniforms.uPalette, 3);
  }

  private createMesh(maxSegments: number): TerrainMesh {
    const gl = this.gl;
    const aspect = this.mapWidth / this.mapHeight;
    const sx = Math.max(8, Math.round(maxSegments * Math.min(1, aspect)));
    const sy = Math.max(8, Math.round(maxSegments / Math.max(1, aspect)));
    const vertices = new Float32Array((sx + 1) * (sy + 1) * 2);
    let vi = 0;
    for (let y = 0; y <= sy; y++) {
      for (let x = 0; x <= sx; x++) {
        vertices[vi++] = x / sx;
        vertices[vi++] = y / sy;
      }
    }
    const indices = new Uint32Array(sx * sy * 6);
    let ii = 0;
    for (let y = 0; y < sy; y++) {
      for (let x = 0; x < sx; x++) {
        const a = y * (sx + 1) + x;
        const b = a + 1;
        const c = a + sx + 1;
        const d = c + 1;
        indices[ii++] = a;
        indices[ii++] = c;
        indices[ii++] = b;
        indices[ii++] = b;
        indices[ii++] = c;
        indices[ii++] = d;
      }
    }
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
      segmentsY: sy,
    };
  }

  draw(
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    zoom: number,
    yaw: number,
    pitch: number,
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
    gl.useProgram(this.terrainProgram);
    const halfVisibleHeight = height / Math.max(0.01, zoom * 2);
    const tanHalfFov = Math.tan((THREE_D_FOV_DEGREES * Math.PI) / 360);
    gl.uniform2f(this.uniforms.uMapSize, this.mapWidth, this.mapHeight);
    gl.uniform2f(this.uniforms.uCenter, centerX, centerY);
    gl.uniform1f(this.uniforms.uDistance, halfVisibleHeight / tanHalfFov);
    gl.uniform1f(this.uniforms.uTanHalfFov, tanHalfFov);
    gl.uniform1f(this.uniforms.uAspect, width / Math.max(1, height));
    gl.uniform1f(this.uniforms.uTilt, pitch);
    gl.uniform1f(this.uniforms.uYaw, yaw);
    gl.uniform1f(this.uniforms.uTime, performance.now() / 1000);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.terrain);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tileState);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.trailState);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.palette);
    const mesh = this.meshes[0];
    const groundHalfY = halfVisibleHeight * 2.75;
    const groundHalfX = groundHalfY * (width / Math.max(1, height));
    const sampleRadius = Math.max(
      2,
      (groundHalfY * 2 * 0.5) / Math.max(1, mesh.segmentsY),
    );
    gl.uniform2f(this.uniforms.uGroundHalfSize, groundHalfX, groundHalfY);
    gl.uniform1f(this.uniforms.uSampleRadius, sampleRadius);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
  }

  dispose(): void {
    this.gl.deleteProgram(this.skyProgram);
    this.gl.deleteProgram(this.terrainProgram);
    this.gl.deleteVertexArray(this.skyVao);
    for (const mesh of this.meshes) {
      this.gl.deleteVertexArray(mesh.vao);
      this.gl.deleteBuffer(mesh.vertexBuffer);
      this.gl.deleteBuffer(mesh.indexBuffer);
    }
  }
}
