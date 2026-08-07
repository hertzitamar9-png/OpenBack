import type { WorldEventKind } from "../../../../core/game/GameUpdates";
import type { WorldEventFx } from "../../types";
import { createProgram } from "../utils/GlUtils";
import { THREE_D_FOV_DEGREES } from "./ThreeDWorldMath";

/**
 * Exhaustive data contract between deterministic simulation events and their
 * 3D animation family. Adding a new world event now produces a compile error
 * until its 3D presentation is intentionally selected.
 */
export const THREE_D_WORLD_EVENT_STYLE: Readonly<
  Record<WorldEventKind, number>
> = {
  earthquake: 0,
  tsunami: 1,
  tornado: 2,
  wildfire: 3,
  meteor: 4,
  drought: 5,
  blizzard: 6,
  flood: 7,
  volcano: 8,
  lightning: 9,
  sandstorm: 10,
  avalanche: 11,
  sinkhole: 12,
  radiation_storm: 13,
  winter_freeze: 14,
  spring_thaw: 15,
  nuclear_saturation: 16,
  disaster_warning: 17,
  objective_spawn: 18,
  objective_control: 19,
  objective_reward: 20,
};

const vert = `#version 300 es
precision highp float;
precision highp usampler2D;
uniform usampler2D uTerrain;
uniform vec2 uMapSize,uCenter,uEventCenter;
uniform float uDistance,uTanHalfFov,uAspect,uTilt,uYaw,uRadius,uProgress,uAngle;
uniform int uKind;
out float vLife;
out float vKind;

float hash(float n){return fract(sin(n*91.3458)*47453.5453);}
float heightFor(uint b){bool land=(b&128u)!=0u;float m=float(b&31u);if(land&&m>30.5)return 24.0;if(land)return 1.8+pow(m/30.0,1.5)*10.5;return -1.1-min(m,10.0)*0.07;}
void main(){
  float id=float(gl_VertexID);
  float h1=hash(id+uEventCenter.x*0.13),h2=hash(id+uEventCenter.y*0.17),h3=hash(id*3.71);
  float a=id*2.399963+uProgress*12.0;
  vec3 o=vec3((h1-0.5)*uRadius*1.6,h3*uRadius*0.65,(h2-0.5)*uRadius*1.6);
  if(uKind==2){float level=fract(h3+uProgress*2.0);float rr=uRadius*(0.06+level*0.34);o=vec3(cos(a)*rr,level*uRadius*1.15,sin(a)*rr);}
  else if(uKind==1||uKind==7){float line=(h1-0.5)*uRadius*1.8;float wave=sin(h2*3.14159);o=vec3(-sin(uAngle)*line,wave*uRadius*0.48,cos(uAngle)*line);}
  else if(uKind==3||uKind==8){float level=fract(h3+uProgress*1.3);float rr=uRadius*(0.08+level*0.32);o=vec3(cos(a)*rr,level*uRadius*1.35,sin(a)*rr);}
  else if(uKind==9){o=vec3((h1-0.5)*uRadius*.25,(1.0-h3)*uRadius*1.8,(h2-0.5)*uRadius*.25);}
  else if(uKind==17){float rr=uRadius*(0.82+0.05*sin(uProgress*25.0));o=vec3(cos(a)*rr,h3*uRadius*1.4,sin(a)*rr);}
  else if(uKind>=18&&uKind<=20){
    float ring=floor(h3*4.0);
    float rr=uRadius*(.18+ring*.18);
    float spin=a+ring*.9;
    o=vec3(cos(spin)*rr,fract(h2+uProgress*.7)*uRadius*1.8,sin(spin)*rr);
  }
  else if(uKind==14||uKind==15){o.y=h3*uRadius*.8;}
  vec2 horizontal=uEventCenter+o.xz;
  ivec2 tc=ivec2(clamp(floor(horizontal),vec2(0.0),uMapSize-1.0));
  float ground=heightFor(texelFetch(uTerrain,tc,0).r);
  vec3 world=vec3(horizontal.x,ground+o.y,horizontal.y);
  vec2 d=world.xz-uCenter;
  float cy=cos(uYaw),sy=sin(uYaw);
  d=vec2(d.x*cy-d.y*sy,d.x*sy+d.y*cy);
  float ct=cos(uTilt),st=sin(uTilt),viewY=-d.y*ct+world.y*st;
  float viewZ=uDistance-d.y*st-world.y*ct;
  if(viewZ<=0.5){gl_Position=vec4(2.0);gl_PointSize=0.0;vLife=0.0;vKind=float(uKind);return;}
  float nearPlane=0.5,farPlane=max(nearPlane+1.0,uDistance*8.0+50.0);
  float clipZ=((farPlane+nearPlane)/(farPlane-nearPlane))*viewZ-(2.0*farPlane*nearPlane)/(farPlane-nearPlane);
  gl_Position=vec4(d.x/(uTanHalfFov*uAspect),viewY/uTanHalfFov,clipZ,viewZ);
  gl_PointSize=clamp((3.0+uRadius*.12)*(uDistance/max(viewZ,.5)),2.0,18.0);
  vLife=1.0-h3*.35;vKind=float(uKind);
}`;

const frag = `#version 300 es
precision highp float;
in float vLife,vKind;
out vec4 outColor;
void main(){
  vec2 p=gl_PointCoord*2.0-1.0;float d=dot(p,p);if(d>1.0)discard;
  int k=int(vKind+.5);vec3 c=vec3(.72,.78,.82);float a=(1.0-d)*.72*vLife;
  if(k==1||k==7)c=vec3(.22,.72,1.0);
  else if(k==2)c=vec3(.74,.78,.77);
  else if(k==3)c=mix(vec3(.18,.17,.16),vec3(1.0,.20,.02),vLife);
  else if(k==4)c=vec3(1.0,.54,.08);
  else if(k==5||k==10)c=vec3(.86,.61,.25);
  else if(k==6||k==11||k==14||k==15)c=vec3(.88,.97,1.0);
  else if(k==8)c=mix(vec3(.16,.14,.13),vec3(1.0,.22,.015),vLife);
  else if(k==9)c=vec3(.72,.88,1.0);
  else if(k==12)c=vec3(.24,.13,.06);
  else if(k==13||k==16)c=vec3(.43,1.0,.08);
  else if(k==17){c=mix(vec3(1.0,.08,.02),vec3(1.0,.88,.16),vLife);a*=.88;}
  else if(k==18)c=vec3(1.0,.78,.12);
  else if(k==19)c=vec3(.24,1.0,.50);
  else if(k==20)c=vec3(.30,.78,1.0);
  outColor=vec4(c,a);
}`;

interface Active extends WorldEventFx {
  start: number;
}

export class ThreeDWorldEventPass {
  private program: WebGLProgram;
  private events: Active[] = [];
  private vao: WebGLVertexArrayObject;
  private uniforms: Record<string, WebGLUniformLocation | null>;

  constructor(
    private gl: WebGL2RenderingContext,
    private terrain: WebGLTexture,
    private mapWidth: number,
    private mapHeight: number,
    private msPerTick: number,
  ) {
    this.program = createProgram(gl, vert, frag);
    this.uniforms = Object.fromEntries(
      [
        "uTerrain",
        "uMapSize",
        "uCenter",
        "uDistance",
        "uTanHalfFov",
        "uAspect",
        "uTilt",
        "uYaw",
        "uEventCenter",
        "uRadius",
        "uProgress",
        "uAngle",
        "uKind",
      ].map((name) => [name, gl.getUniformLocation(this.program, name)]),
    );
    this.vao = gl.createVertexArray()!;
    gl.useProgram(this.program);
    gl.uniform1i(this.uniforms.uTerrain, 0);
  }

  add(events: WorldEventFx[]): void {
    const now = performance.now();
    for (const event of events) this.events.push({ ...event, start: now });
    if (this.events.length > 24) this.events.splice(0, this.events.length - 24);
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
    const now = performance.now();
    this.events = this.events.filter(
      (e) => now - e.start < e.durationTicks * this.msPerTick,
    );
    if (this.events.length === 0) return;
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.program);
    const tanHalfFov = Math.tan((THREE_D_FOV_DEGREES * Math.PI) / 360);
    gl.uniform2f(this.uniforms.uMapSize, this.mapWidth, this.mapHeight);
    gl.uniform2f(this.uniforms.uCenter, centerX, centerY);
    gl.uniform1f(
      this.uniforms.uDistance,
      height / Math.max(0.01, zoom * 2) / tanHalfFov,
    );
    gl.uniform1f(this.uniforms.uTanHalfFov, tanHalfFov);
    gl.uniform1f(this.uniforms.uAspect, width / Math.max(1, height));
    gl.uniform1f(this.uniforms.uTilt, pitch);
    gl.uniform1f(this.uniforms.uYaw, yaw);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.terrain);
    gl.bindVertexArray(this.vao);
    for (const e of this.events) {
      const sx = e.tile % this.mapWidth,
        sy = (e.tile - sx) / this.mapWidth;
      let x = sx,
        y = sy,
        angle = 0;
      const progress = (now - e.start) / (e.durationTicks * this.msPerTick);
      if (e.pathEnd !== undefined) {
        const ex = e.pathEnd % this.mapWidth,
          ey = (e.pathEnd - ex) / this.mapWidth;
        angle = Math.atan2(ey - sy, ex - sx);
        if ([1, 2, 3, 7, 10, 11].includes(THREE_D_WORLD_EVENT_STYLE[e.kind])) {
          x += (ex - sx) * progress;
          y += (ey - sy) * progress;
        }
      }
      gl.uniform2f(this.uniforms.uEventCenter, x, y);
      gl.uniform1f(this.uniforms.uRadius, e.radius);
      gl.uniform1f(this.uniforms.uProgress, progress);
      gl.uniform1f(this.uniforms.uAngle, angle);
      gl.uniform1i(this.uniforms.uKind, THREE_D_WORLD_EVENT_STYLE[e.kind]);
      const projectedRadius = e.radius * zoom;
      const particles =
        projectedRadius > 180 ? 128 : projectedRadius > 70 ? 96 : 64;
      gl.drawArrays(gl.POINTS, 0, particles);
    }
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
  }
}
