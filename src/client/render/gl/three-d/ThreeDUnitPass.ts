import { UnitType } from "../../../../core/game/Game";
import type { UnitState } from "../../types";
import { createProgram } from "../utils/GlUtils";
import {
  THREE_D_MODELS,
  type ThreeDAnimation,
  type ThreeDPrimitiveKind,
} from "./ThreeDModelRegistry";
import { THREE_D_FOV_DEGREES } from "./ThreeDWorldMath";

const STRIDE = 14;
const MATERIAL = {
  owner: 0,
  dark: 1,
  metal: 2,
  glass: 3,
  emissive: 4,
  ground: 5,
  shadow: 6,
} as const;
const ANIMATION: Record<ThreeDAnimation, number> = {
  none: 0,
  rotate: 1,
  bank: 2,
  pulse: 3,
  wheel: 4,
  hover: 5,
};

export function rotateThreeDModelOffset(
  x: number,
  z: number,
  heading: number,
): readonly [number, number] {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  return [x * c + z * s, -x * s + z * c];
}

const vert = `#version 300 es
precision highp float;
precision highp usampler2D;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 iWorld;
layout(location=3) in vec3 iScale;
layout(location=4) in vec4 iAngles;
layout(location=5) in vec4 iMeta;
uniform usampler2D uTerrain;
uniform vec2 uMapSize,uCenter;
uniform float uDistance,uTanHalfFov,uAspect,uTilt,uYaw,uTime;
out vec3 vNormal;
out vec3 vMeta;

float heightFor(uint b){bool land=(b&128u)!=0u;float m=float(b&31u);if(land&&m>30.5)return 24.0;if(land)return 1.8+pow(m/30.0,1.5)*10.5;return -1.1-min(m,10.0)*0.07;}
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0,-s,c,0,0,0,1);}
void main(){
  int animation=int(iMeta.w+0.5);
  float phase=uTime+iWorld.x*.17+iWorld.z*.11;
  mat3 local=rz(iAngles.w)*ry(iAngles.z)*rx(iAngles.y);
  if(animation==1)local=ry(phase*.72)*local;
  else if(animation==2)local=rz(sin(phase*1.65)*.16)*local;
  else if(animation==4)local=rx(phase*4.2)*local;
  mat3 heading=ry(-iAngles.x);
  float pulse=animation==3?1.0+sin(phase*5.0)*.09:1.0;
  vec3 model=heading*(local*(aPos*iScale*pulse));
  ivec2 tc=ivec2(clamp(floor(iWorld.xz),vec2(0.0),uMapSize-1.0));
  float ground=heightFor(texelFetch(uTerrain,tc,0).r);
  float flightBob=step(1.5,iWorld.y)*sin(uTime*3.2+iWorld.x*.7+iWorld.z*.4)*.14;
  float hover=animation==5?sin(phase*2.1)*.11:0.0;
  vec3 world=vec3(iWorld.x,ground+iWorld.y+flightBob+hover,iWorld.z)+model;
  vec2 d=world.xz-uCenter;
  float cy=cos(uYaw),sy=sin(uYaw);
  d=vec2(d.x*cy-d.y*sy,d.x*sy+d.y*cy);
  float ct=cos(uTilt),st=sin(uTilt);
  float viewY=-d.y*ct+world.y*st;
  float viewZ=uDistance-d.y*st-world.y*ct;
  float nearPlane=0.5,farPlane=max(nearPlane+1.0,uDistance*8.0+50.0);
  float clipZ=((farPlane+nearPlane)/(farPlane-nearPlane))*viewZ-(2.0*farPlane*nearPlane)/(farPlane-nearPlane);
  gl_Position=vec4(d.x/(uTanHalfFov*uAspect),viewY/uTanHalfFov,clipZ,viewZ);
  vNormal=normalize(heading*local*aNormal);
  vMeta=iMeta.xyz;
}`;

const frag = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vMeta;
uniform sampler2D uPalette;
out vec4 outColor;
void main(){
  float u=(vMeta.x+0.5)/4096.0;
  vec3 owner=texture(uPalette,vec2(u,0.25)).rgb;
  vec3 border=texture(uPalette,vec2(u,0.75)).rgb;
  int material=int(vMeta.y+0.5);
  vec3 base=owner;
  if(material==1)base=border*0.58;
  else if(material==2)base=mix(vec3(0.32,0.37,0.42),owner,0.22);
  else if(material==3)base=mix(vec3(0.08,0.30,0.48),owner,0.16);
  else if(material==4)base=vec3(1.0,0.46,0.08);
  else if(material==5)base=mix(vec3(0.09,0.11,0.14),owner,0.18);
  else if(material==6)base=vec3(0.015,0.02,0.028);
  vec3 light=normalize(vec3(-0.55,0.88,-0.42));
  float diffuse=0.40+max(0.0,dot(normalize(vNormal),light))*0.72;
  float spec=pow(max(0.0,dot(reflect(-light,normalize(vNormal)),normalize(vec3(0.2,0.8,0.5)))),18.0);
  if(material==4)diffuse=1.35;
  if(material==6){outColor=vec4(base,0.30*vMeta.z);return;}
  outColor=vec4(base*diffuse+spec*0.24,vMeta.z);
}`;

interface Mesh {
  vao: WebGLVertexArrayObject;
  vertexBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
  indexCount: number;
  instanceBuffer: WebGLBuffer;
  instanceCount: number;
  upload: Float32Array;
}

export class ThreeDUnitPass {
  private program: WebGLProgram;
  private meshes = new Map<ThreeDPrimitiveKind, Mesh>();
  private batches = new Map<ThreeDPrimitiveKind, number[]>();
  private uniforms: Record<string, WebGLUniformLocation | null>;

  constructor(
    private gl: WebGL2RenderingContext,
    private terrain: WebGLTexture,
    private palette: WebGLTexture,
    private mapWidth: number,
    private mapHeight: number,
  ) {
    this.program = createProgram(gl, vert, frag);
    this.uniforms = Object.fromEntries(
      [
        "uTerrain",
        "uPalette",
        "uMapSize",
        "uCenter",
        "uDistance",
        "uTanHalfFov",
        "uAspect",
        "uTilt",
        "uYaw",
        "uTime",
      ].map((name) => [name, gl.getUniformLocation(this.program, name)]),
    );
    this.meshes.set("box", this.createMesh(this.boxGeometry()));
    this.meshes.set("wing", this.createMesh(this.wingGeometry()));
    this.meshes.set("cylinder", this.createMesh(this.radialGeometry(false)));
    this.meshes.set("cone", this.createMesh(this.radialGeometry(true)));
    this.meshes.set("sphere", this.createMesh(this.sphereGeometry()));
    for (const kind of this.meshes.keys()) this.batches.set(kind, []);
    gl.useProgram(this.program);
    gl.uniform1i(this.uniforms.uTerrain, 0);
    gl.uniform1i(this.uniforms.uPalette, 1);
  }

  update(
    units: Map<number, UnitState>,
    view?: {
      centerX: number;
      centerY: number;
      zoom: number;
      width: number;
      height: number;
    },
  ): void {
    for (const batch of this.batches.values()) batch.length = 0;
    const halfHeight = view
      ? view.height / Math.max(0.01, view.zoom * 2)
      : Number.POSITIVE_INFINITY;
    const halfWidth = view
      ? halfHeight * (view.width / Math.max(1, view.height))
      : Number.POSITIVE_INFINITY;
    for (const unit of units.values()) {
      if (!unit.isActive || unit.visibleToLocal === false) continue;
      const model = THREE_D_MODELS[unit.unitType as UnitType];
      if (!model) continue;
      const x = unit.pos % this.mapWidth;
      const z = (unit.pos - x) / this.mapWidth;
      // Perspective expands toward the far edge, so use a generous margin.
      // This removes off-screen geometry on giant maps without visible pop-in.
      if (
        view &&
        (Math.abs(x - view.centerX) > halfWidth * 1.75 + 16 ||
          Math.abs(z - view.centerY) > halfHeight * 2.25 + 24)
      ) {
        continue;
      }
      let heading = unit.trajectoryAngle ?? 0;
      if (unit.trajectoryAngle === undefined && unit.pos !== unit.lastPos) {
        const lx = unit.lastPos % this.mapWidth;
        const lz = (unit.lastPos - lx) / this.mapWidth;
        heading = Math.atan2(z - lz, x - lx);
      }
      const alpha = unit.underConstruction ? 0.58 : 1;
      // A shared flattened cylinder anchors every model to the terrain and
      // makes altitude/motion immediately readable without custom shadow data
      // in each registry entry.
      this.batches
        .get("cylinder")!
        .push(
          x,
          0.06,
          z,
          model.footprint * 0.38,
          0.035,
          model.footprint * 0.29,
          heading,
          0,
          0,
          0,
          unit.ownerID,
          MATERIAL.shadow,
          alpha,
          ANIMATION.none,
        );
      for (const primitive of model.primitives) {
        const batch = this.batches.get(primitive.kind)!;
        const rotation = primitive.rotation ?? [0, 0, 0];
        // Keep every primitive in one rigid model. The old path rotated each
        // part's geometry but left its center offset in world axes, so a plane
        // nose or tank barrel could detach from its body while turning.
        const [offsetX, offsetZ] = rotateThreeDModelOffset(
          primitive.position[0],
          primitive.position[2],
          heading,
        );
        batch.push(
          x + offsetX,
          (model.altitude ?? 0) + primitive.position[1],
          z + offsetZ,
          primitive.scale[0] * model.footprint * 0.34,
          primitive.scale[1] * model.footprint * 0.34,
          primitive.scale[2] * model.footprint * 0.34,
          heading,
          rotation[0],
          rotation[1],
          rotation[2],
          unit.ownerID,
          MATERIAL[primitive.material],
          alpha,
          ANIMATION[primitive.animation ?? model.animation ?? "none"],
        );
      }
    }
    const gl = this.gl;
    for (const [kind, values] of this.batches) {
      const mesh = this.meshes.get(kind)!;
      mesh.instanceCount = values.length / STRIDE;
      if (mesh.upload.length < values.length) {
        let capacity = Math.max(STRIDE * 32, mesh.upload.length);
        while (capacity < values.length) capacity *= 2;
        mesh.upload = new Float32Array(capacity);
      }
      for (let i = 0; i < values.length; i++) mesh.upload[i] = values[i];
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.instanceBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        mesh.upload.subarray(0, values.length),
        gl.DYNAMIC_DRAW,
      );
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
    gl.uniform1f(this.uniforms.uTime, performance.now() / 1000);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.terrain);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.palette);
    for (const mesh of this.meshes.values()) {
      if (mesh.instanceCount === 0) continue;
      gl.bindVertexArray(mesh.vao);
      gl.drawElementsInstanced(
        gl.TRIANGLES,
        mesh.indexCount,
        gl.UNSIGNED_SHORT,
        0,
        mesh.instanceCount,
      );
    }
    gl.bindVertexArray(null);
    gl.disable(gl.DEPTH_TEST);
  }

  private createMesh(data: { vertices: number[]; indices: number[] }): Mesh {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(data.vertices),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(data.indices),
      gl.STATIC_DRAW,
    );
    const instanceBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 0, gl.DYNAMIC_DRAW);
    const bytes = STRIDE * 4;
    for (const [location, size, offset] of [
      [2, 3, 0],
      [3, 3, 3],
      [4, 4, 6],
      [5, 4, 10],
    ] as const) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        size,
        gl.FLOAT,
        false,
        bytes,
        offset * 4,
      );
      gl.vertexAttribDivisor(location, 1);
    }
    gl.bindVertexArray(null);
    return {
      vao,
      vertexBuffer: vb,
      indexBuffer: ib,
      indexCount: data.indices.length,
      instanceBuffer,
      instanceCount: 0,
      upload: new Float32Array(STRIDE * 32),
    };
  }

  private boxGeometry() {
    const vertices: number[] = [];
    const indices: number[] = [];
    const faces = [
      [
        [1, 0, 0],
        [
          [0.5, -0.5, -0.5],
          [0.5, -0.5, 0.5],
          [0.5, 0.5, 0.5],
          [0.5, 0.5, -0.5],
        ],
      ],
      [
        [-1, 0, 0],
        [
          [-0.5, -0.5, 0.5],
          [-0.5, -0.5, -0.5],
          [-0.5, 0.5, -0.5],
          [-0.5, 0.5, 0.5],
        ],
      ],
      [
        [0, 1, 0],
        [
          [-0.5, 0.5, -0.5],
          [0.5, 0.5, -0.5],
          [0.5, 0.5, 0.5],
          [-0.5, 0.5, 0.5],
        ],
      ],
      [
        [0, -1, 0],
        [
          [-0.5, -0.5, 0.5],
          [0.5, -0.5, 0.5],
          [0.5, -0.5, -0.5],
          [-0.5, -0.5, -0.5],
        ],
      ],
      [
        [0, 0, 1],
        [
          [0.5, -0.5, 0.5],
          [-0.5, -0.5, 0.5],
          [-0.5, 0.5, 0.5],
          [0.5, 0.5, 0.5],
        ],
      ],
      [
        [0, 0, -1],
        [
          [-0.5, -0.5, -0.5],
          [0.5, -0.5, -0.5],
          [0.5, 0.5, -0.5],
          [-0.5, 0.5, -0.5],
        ],
      ],
    ] as const;
    for (const [normal, corners] of faces) {
      const base = vertices.length / 6;
      for (const c of corners) vertices.push(...c, ...normal);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return { vertices, indices };
  }

  private wingGeometry() {
    const vertices: number[] = [];
    const indices: number[] = [];
    const corners = [
      [-0.5, -0.5],
      [0.5, -0.12],
      [0.5, 0.12],
      [-0.5, 0.5],
    ] as const;
    for (const [x, z] of corners) vertices.push(x, 0.08, z, 0, 1, 0);
    for (const [x, z] of corners) vertices.push(x, -0.08, z, 0, -1, 0);
    indices.push(0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6);
    for (let i = 0; i < corners.length; i++) {
      const j = (i + 1) % corners.length;
      const [x0, z0] = corners[i];
      const [x1, z1] = corners[j];
      const dx = x1 - x0;
      const dz = z1 - z0;
      const length = Math.hypot(dx, dz) || 1;
      const nx = dz / length;
      const nz = -dx / length;
      const base = vertices.length / 6;
      vertices.push(
        x0,
        -0.08,
        z0,
        nx,
        0,
        nz,
        x1,
        -0.08,
        z1,
        nx,
        0,
        nz,
        x1,
        0.08,
        z1,
        nx,
        0,
        nz,
        x0,
        0.08,
        z0,
        nx,
        0,
        nz,
      );
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return { vertices, indices };
  }

  private radialGeometry(cone: boolean) {
    const vertices: number[] = [];
    const indices: number[] = [];
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n,
        c = Math.cos(a),
        s = Math.sin(a);
      vertices.push(c * 0.5, -0.5, s * 0.5, c, cone ? 0.45 : 0, s);
      vertices.push(
        cone ? 0 : c * 0.5,
        0.5,
        cone ? 0 : s * 0.5,
        c,
        cone ? 0.45 : 0,
        s,
      );
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      indices.push(i * 2, j * 2, i * 2 + 1, j * 2, j * 2 + 1, i * 2 + 1);
    }
    const bottomCenter = vertices.length / 6;
    vertices.push(0, -0.5, 0, 0, -1, 0);
    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n;
      vertices.push(Math.cos(a) * 0.5, -0.5, Math.sin(a) * 0.5, 0, -1, 0);
    }
    for (let i = 0; i < n; i++) {
      indices.push(
        bottomCenter,
        bottomCenter + 1 + ((i + 1) % n),
        bottomCenter + 1 + i,
      );
    }
    if (!cone) {
      const topCenter = vertices.length / 6;
      vertices.push(0, 0.5, 0, 0, 1, 0);
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n;
        vertices.push(Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.5, 0, 1, 0);
      }
      for (let i = 0; i < n; i++) {
        indices.push(
          topCenter,
          topCenter + 1 + i,
          topCenter + 1 + ((i + 1) % n),
        );
      }
    }
    return { vertices, indices };
  }

  private sphereGeometry() {
    const vertices: number[] = [];
    const indices: number[] = [];
    const latitudes = 12;
    const longitudes = 20;
    for (let y = 0; y <= latitudes; y++) {
      const phi = (y * Math.PI) / latitudes;
      const ny = Math.cos(phi);
      const ring = Math.sin(phi);
      for (let x = 0; x <= longitudes; x++) {
        const theta = (x * Math.PI * 2) / longitudes;
        const nx = Math.cos(theta) * ring;
        const nz = Math.sin(theta) * ring;
        vertices.push(nx, ny, nz, nx, ny, nz);
      }
    }
    for (let y = 0; y < latitudes; y++) {
      for (let x = 0; x < longitudes; x++) {
        const a = y * (longitudes + 1) + x;
        const b = a + longitudes + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    return { vertices, indices };
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    for (const mesh of this.meshes.values()) {
      this.gl.deleteVertexArray(mesh.vao);
      this.gl.deleteBuffer(mesh.vertexBuffer);
      this.gl.deleteBuffer(mesh.indexBuffer);
      this.gl.deleteBuffer(mesh.instanceBuffer);
    }
  }
}
