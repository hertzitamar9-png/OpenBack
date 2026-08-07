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
  outColor=vec4(vec3(0.012,0.017,0.026)*vignette,1.0);
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
  if(land&&m>30.5)return 24.0;
  if(land)return 1.8+pow(m/30.0,1.5)*10.5;
  return -1.1-min(m,10.0)*0.07;
}
float smoothHeight(vec2 world,uint centerByte){
  bool centerLand=(centerByte&128u)!=0u;
  ivec2 base=ivec2(floor(world));
  float total=heightFor(centerByte)*2.0;
  float weight=2.0;
  for(int y=-1;y<=1;y++){
    for(int x=-1;x<=1;x++){
      if(x==0&&y==0)continue;
      ivec2 delta=ivec2(round(vec2(float(x),float(y))*uSampleRadius));
      ivec2 p=clamp(base+delta,ivec2(0),ivec2(uMapSize)-1);
      uint b=texelFetch(uTerrain,p,0).r;
      if(((b&128u)!=0u)==centerLand){total+=heightFor(b);weight+=1.0;}
    }
  }
  if(centerLand&&(centerByte&31u)==31u){
    float wallNeighbors=0.0;
    for(int y=-1;y<=1;y++){
      for(int x=-1;x<=1;x++){
        ivec2 p=clamp(base+ivec2(x,y),ivec2(0),ivec2(uMapSize)-1);
        uint b=texelFetch(uTerrain,p,0).r;
        wallNeighbors+=((b&128u)!=0u&&(b&31u)==31u)?1.0:0.0;
      }
    }
    // Contiguous impassable terrain becomes a high defensive wall. Isolated
    // noisy pixels stay blended into the surrounding ridge instead of making
    // the needle-shaped triangles seen in the old renderer.
    if(wallNeighbors>=3.0)return 24.0;
  }
  return total/weight;
}
void main(){
  // Tessellate around the camera instead of stretching a fixed mesh over the
  // whole world. Zoomed-in ground therefore gains real local geometry.
  vec2 world=uCenter+(aUV*2.0-1.0)*uGroundHalfSize;
  vec2 mapUV=world/uMapSize;
  bool inside=all(greaterThanEqual(mapUV,vec2(0.0)))&&all(lessThanEqual(mapUV,vec2(1.0)));
  ivec2 tc=ivec2(clamp(floor(world),vec2(0.0),uMapSize-1.0));
  uint terrainByte=inside?texelFetch(uTerrain,tc,0).r:10u;
  float h=inside?smoothHeight(world,terrainByte):heightFor(terrainByte);
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
uniform sampler2D uPalette;
uniform vec2 uMapSize;
uniform float uTime;
uniform float uDistance;
uniform float uSampleRadius;
out vec4 outColor;

float heightFor(uint b){
  bool land=(b&128u)!=0u; float m=float(b&31u);
  if(land&&m>30.5)return 24.0;
  if(land)return 1.8+pow(m/30.0,1.5)*10.5;
  return -1.1-min(m,10.0)*0.07;
}
float sameSurfaceHeight(uint centerByte,ivec2 samplePoint){
  uint sampleByte=texelFetch(uTerrain,samplePoint,0).r;
  bool sameLand=((sampleByte&128u)!=0u)==((centerByte&128u)!=0u);
  return sameLand?heightFor(sampleByte):heightFor(centerByte);
}
void main(){
  bool inside=all(greaterThanEqual(vMapUV,vec2(0.0)))&&all(lessThanEqual(vMapUV,vec2(1.0)));
  ivec2 size=textureSize(uTerrain,0);
  ivec2 p=ivec2(clamp(floor(vMapUV*uMapSize),vec2(0.0),uMapSize-1.0));
  int radius=max(1,int(round(uSampleRadius)));
  int x0=max(0,p.x-radius),x1=min(size.x-1,p.x+radius);
  int y0=max(0,p.y-radius),y1=min(size.y-1,p.y+radius);
  uint centerByte=inside?texelFetch(uTerrain,p,0).r:10u;
  float hl=sameSurfaceHeight(centerByte,ivec2(x0,p.y));
  float hr=sameSurfaceHeight(centerByte,ivec2(x1,p.y));
  float hu=sameSurfaceHeight(centerByte,ivec2(p.x,y0));
  float hd=sameSurfaceHeight(centerByte,ivec2(p.x,y1));
  vec3 n=normalize(vec3(hl-hr,5.0,hu-hd));
  vec3 light=normalize(vec3(-0.62,0.74,-0.55));
  float diffuse=clamp(dot(n,light),0.0,1.0);
  float backLight=clamp(dot(n,-light),0.0,1.0);
  float rim=pow(1.0-clamp(n.y,0.0,1.0),1.45);
  float altitude=clamp(vHeight/10.0,0.0,1.0);
  float contour=1.0-smoothstep(0.02,0.08,abs(fract(vHeight/4.5)-0.5));
  float localOcclusion=clamp((hl+hr+hu+hd-vHeight*4.0)*0.025+0.9,0.70,1.0);
  vec3 lowGround=vec3(0.20,0.34,0.16);
  vec3 highGround=vec3(0.43,0.35,0.23);
  vec3 terrainMaterial=mix(lowGround,highGround,smoothstep(0.08,0.62,altitude));
  terrainMaterial=mix(terrainMaterial,vec3(0.76,0.78,0.75),smoothstep(0.68,0.94,altitude));
  uint tileState=inside?texelFetch(uTileState,p,0).r:0u;
  uint owner=tileState&4095u;
  vec3 ownerColor=texture(uPalette,vec2((float(owner)+0.5)/4096.0,0.25)).rgb;
  vec3 boardMaterial=owner>0u?mix(terrainMaterial,ownerColor,0.72):terrainMaterial;
  vec3 color=boardMaterial*(0.55+diffuse*0.62)*localOcclusion;
  color+=backLight*vec3(0.035,0.055,0.08)+rim*vec3(0.09,0.13,0.19);
  color=mix(color,color+vec3(0.12,0.13,0.14),altitude*0.38);
  color*=1.0-contour*altitude*0.04;
  if((centerByte&128u)==0u){
    float depth=clamp(float(centerByte&31u)/10.0,0.0,1.0);
    vec3 water=mix(vec3(0.055,0.29,0.44),vec3(0.012,0.10,0.22),depth);
    color=water;
  }else{
    // Even the unlit side of a ridge remains a solid board material; dark
    // mountain facets must never read as holes in the map.
    color=max(color,max(boardMaterial*0.62,vec3(0.11,0.14,0.08)));
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
  float distanceHaze=smoothstep(1.08,1.72,vViewDepth/max(1.0,uDistance));
  color=mix(color,vec3(0.17,0.31,0.43),distanceHaze*0.23);
  // Preserve the source renderer's readable territory colors even when fog
  // and mountain relief are both active.
  color*=1.10;
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
    this.meshes = [192, 320, 512, 704].map((detail) => this.createMesh(detail));
    gl.useProgram(this.terrainProgram);
    gl.uniform1i(this.uniforms.uTerrain, 0);
    gl.uniform1i(this.uniforms.uTileState, 1);
    gl.uniform1i(this.uniforms.uPalette, 2);
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
    gl.bindTexture(gl.TEXTURE_2D, this.palette);
    const ultraDetailAllowed = Math.min(width, height) >= 1000;
    const highDetailAllowed = Math.min(width, height) >= 760;
    const mediumDetailAllowed = Math.min(width, height) >= 520;
    const mesh =
      zoom > 3.6 && ultraDetailAllowed
        ? this.meshes[3]
        : zoom > 2.0 && highDetailAllowed
          ? this.meshes[2]
          : zoom > 0.8 && mediumDetailAllowed
            ? this.meshes[1]
            : this.meshes[0];
    const groundHalfY = halfVisibleHeight * 2.55;
    const groundHalfX = groundHalfY * (width / Math.max(1, height));
    const sampleRadius = Math.max(
      3,
      (groundHalfY * 2 * 0.58) / Math.max(1, mesh.segmentsY),
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
