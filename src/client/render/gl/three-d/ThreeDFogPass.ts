import { createProgram, shaderSrc } from "../utils/GlUtils";
import { TILE_DEFINES } from "../utils/TileCodec";
import { THREE_D_FOV_DEGREES, threeDCameraDistance } from "./ThreeDWorldMath";

const vert = `#version 300 es
precision highp float;
precision highp usampler2D;
uniform usampler2D uTileTex;
uniform vec2 uMapSize,uCenter;
uniform float uDistance,uTanHalfFov,uAspect,uTilt,uYaw,uTime;
uniform uint uLocalOwner;
uniform int uRadarCount;
uniform vec3 uRadar[8];
out float vDensity;
float hash(float n){return fract(sin(n*78.233)*43758.5453);}
void main(){
  float id=float(gl_VertexID),viewH=uDistance*uTanHalfFov;
  float rx=hash(id*3.17+11.0),rz=hash(id*7.91+29.0),layer=hash(id*13.7+5.0);
  vec2 world=uCenter+vec2((rx-.5)*viewH*uAspect*2.8,(rz-.5)*viewH*2.8);
  ivec2 tc=ivec2(clamp(floor(world),vec2(0.0),uMapSize-1.0));
  uint owner=texelFetch(uTileTex,tc,0).r&uint(OWNER_MASK);
  float reveal=owner==uLocalOwner?1.0:0.0;
  for(int i=0;i<8;i++)if(i<uRadarCount){float d=distance(world,uRadar[i].xy);reveal=max(reveal,1.0-smoothstep(uRadar[i].z-5.0,uRadar[i].z+7.0,d));}
  if(uLocalOwner==0u||reveal>.5){gl_Position=vec4(2.0);gl_PointSize=0.0;vDensity=0.0;return;}
  float drift=sin(uTime*.14+id*.31)*viewH*.08;
  world+=vec2(drift,-drift*.36);
  float height=2.0+layer*15.0+sin(uTime*.22+id)*1.4;
  vec2 d=world-uCenter;
  float cy=cos(uYaw),sy=sin(uYaw);
  d=vec2(d.x*cy-d.y*sy,d.x*sy+d.y*cy);
  float ct=cos(uTilt),st=sin(uTilt),viewY=-d.y*ct+height*st;
  float viewZ=uDistance-d.y*st-height*ct;
  if(viewZ<=0.5){gl_Position=vec4(2.0);gl_PointSize=0.0;vDensity=0.0;return;}
  float nearPlane=0.5,farPlane=max(nearPlane+1.0,uDistance*8.0+50.0);
  float clipZ=((farPlane+nearPlane)/(farPlane-nearPlane))*viewZ-(2.0*farPlane*nearPlane)/(farPlane-nearPlane);
  gl_Position=vec4(d.x/(uTanHalfFov*uAspect),viewY/uTanHalfFov,clipZ,viewZ);
  gl_PointSize=clamp((18.0+layer*28.0)*(uDistance/max(viewZ,.5)),12.0,58.0);
  vDensity=.18+.16*hash(id+uTime*.01);
}`;

const frag = `#version 300 es
precision highp float;
in float vDensity;
out vec4 outColor;
void main(){
  vec2 p=gl_PointCoord*2.0-1.0;
  // Several overlapping soft lobes make each point read as a drifting cloud
  // bank instead of a snowflake or circular blob.
  float a=max(0.0,1.0-dot(p*vec2(.72,1.05),p*vec2(.72,1.05)));
  float b=max(0.0,1.0-dot((p-vec2(.42,.10))*vec2(1.35,1.75),(p-vec2(.42,.10))*vec2(1.35,1.75)));
  float c=max(0.0,1.0-dot((p+vec2(.38,-.08))*vec2(1.25,1.65),(p+vec2(.38,-.08))*vec2(1.25,1.65)));
  float soft=pow(max(a,max(b*.72,c*.68)),2.4);
  if(soft<.006)discard;
  vec3 mist=mix(vec3(.12,.18,.24),vec3(.64,.72,.77),soft);
  outColor=vec4(mist,soft*vDensity*.18);
}`;

export class ThreeDFogPass {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private uniforms: Record<string, WebGLUniformLocation | null>;
  private localOwner = 0;
  private radarData = new Float32Array(24);
  private radarCount = 0;

  constructor(
    private gl: WebGL2RenderingContext,
    private tileTex: WebGLTexture,
    private mapWidth: number,
    private mapHeight: number,
  ) {
    this.program = createProgram(gl, shaderSrc(vert, TILE_DEFINES), frag);
    this.vao = gl.createVertexArray()!;
    this.uniforms = Object.fromEntries(
      [
        "uTileTex",
        "uMapSize",
        "uCenter",
        "uDistance",
        "uTanHalfFov",
        "uAspect",
        "uTilt",
        "uYaw",
        "uTime",
        "uLocalOwner",
        "uRadarCount",
        "uRadar[0]",
      ].map((name) => [name, gl.getUniformLocation(this.program, name)]),
    );
    gl.useProgram(this.program);
    gl.uniform1i(this.uniforms.uTileTex, 0);
  }

  setLocalOwner(owner: number): void {
    this.localOwner = owner;
  }

  setRadarReveals(
    reveals: Array<{ x: number; y: number; radius: number }>,
  ): void {
    this.radarCount = Math.min(8, reveals.length);
    for (let i = 0; i < this.radarCount; i++) {
      this.radarData[i * 3] = reveals[i].x;
      this.radarData[i * 3 + 1] = reveals[i].y;
      this.radarData[i * 3 + 2] = reveals[i].radius;
    }
  }

  draw(
    centerX: number,
    centerY: number,
    zoom: number,
    width: number,
    height: number,
    yaw: number,
    pitch: number,
  ): void {
    if (this.localOwner === 0) return;
    const gl = this.gl;
    const tanHalfFov = Math.tan((THREE_D_FOV_DEGREES * Math.PI) / 360);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.uMapSize, this.mapWidth, this.mapHeight);
    gl.uniform2f(this.uniforms.uCenter, centerX, centerY);
    gl.uniform1f(
      this.uniforms.uDistance,
      threeDCameraDistance(height, zoom, pitch),
    );
    gl.uniform1f(this.uniforms.uTanHalfFov, tanHalfFov);
    gl.uniform1f(this.uniforms.uAspect, width / Math.max(1, height));
    gl.uniform1f(this.uniforms.uTilt, pitch);
    gl.uniform1f(this.uniforms.uYaw, yaw);
    gl.uniform1f(this.uniforms.uTime, performance.now() / 1000);
    gl.uniform1ui(this.uniforms.uLocalOwner, this.localOwner);
    gl.uniform1i(this.uniforms.uRadarCount, this.radarCount);
    gl.uniform3fv(this.uniforms["uRadar[0]"], this.radarData);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tileTex);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.POINTS, 0, Math.min(width, height) < 700 ? 180 : 320);
    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
  }
}
