import { UnitType } from "../../../../core/game/Game";
import type { GhostPreviewData, UnitState } from "../../types";
import { createProgram } from "../utils/GlUtils";
import { loadThreeDAsset } from "./ThreeDAssetLoader";
import { THREE_D_ASSET_MANIFEST, threeDAsset } from "./ThreeDAssetManifest";
import { ThreeDCameraState } from "./ThreeDCamera";
import { THREE_D_MODELS, type ThreeDAnimation } from "./ThreeDModelRegistry";

const STRIDE = 16;
const MATERIAL = {
  owner: 0,
  dark: 1,
  metal: 2,
  glass: 3,
  emissive: 4,
  ground: 5,
  shadow: 6,
  ghostValid: 7,
  ghostInvalid: 8,
} as const;
const ANIMATION: Record<ThreeDAnimation, number> = {
  none: 0,
  rotate: 1,
  bank: 2,
  pulse: 3,
  wheel: 4,
  hover: 5,
};
const SURFACE = {
  ground: 0,
  water: 1,
} as const;

export function* collectThreeDRenderableUnits(
  mobileUnits: ReadonlyMap<number, UnitState>,
  structures: ReadonlyMap<number, UnitState>,
): Generator<UnitState> {
  yield* mobileUnits.values();
  yield* structures.values();
}

export function isThreeDSpecialModel(unit: UnitState): boolean {
  const type = unit.unitType as UnitType;
  if (
    type === UnitType.TransportShip ||
    type === UnitType.TradeShip ||
    type === UnitType.Warship ||
    type === UnitType.AtomBomb ||
    type === UnitType.HydrogenBomb ||
    type === UnitType.MIRV ||
    type === UnitType.MIRVWarhead
  ) {
    return true;
  }
  return type === UnitType.Tank && (unit.launchPhase ?? 0) >= 20;
}

export function threeDGhostPresentation(data: GhostPreviewData): {
  unitType: UnitType;
  x: number;
  z: number;
  valid: boolean;
} {
  return {
    unitType: data.ghostType as UnitType,
    x: data.tileX,
    z: data.tileY,
    valid: data.canBuild || data.canUpgrade,
  };
}

export function rotateThreeDModelOffset(
  x: number,
  z: number,
  heading: number,
): readonly [number, number] {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  return [x * c + z * s, -x * s + z * c];
}

export function threeDModelBatchKey(type: UnitType): string {
  return `asset:${type}`;
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
layout(location=6) in vec2 iAnchor;
uniform usampler2D uTerrain;
uniform vec2 uMapSize;
uniform mat4 uViewProjection;
uniform float uTime;
out vec3 vNormal;
out vec3 vMeta;

float heightFor(uint b){bool land=(b&128u)!=0u;float m=float(b&31u);if(land&&m>30.5)return 57.0;if(land)return (0.15+pow(m/30.0,2.0)*31.0)*1.5;return -min(m,10.0)*0.02;}
float sampledHeight(ivec2 p){
  p=clamp(p,ivec2(0),ivec2(uMapSize)-1);
  return heightFor(texelFetch(uTerrain,p,0).r);
}
float smoothHeight(vec2 world){
  vec2 samplePos=world-vec2(0.5);
  ivec2 p=ivec2(floor(samplePos));
  vec2 f=smoothstep(vec2(0.0),vec2(1.0),fract(samplePos));
  float center=mix(
    mix(sampledHeight(p),sampledHeight(p+ivec2(1,0)),f.x),
    mix(sampledHeight(p+ivec2(0,1)),sampledHeight(p+ivec2(1,1)),f.x),
    f.y
  );
  float r=1.5;
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
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1,0,0,0,c,s,0,-s,c);}
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0,-s,0,1,0,s,0,c);}
mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0,-s,c,0,0,0,1);}
void main(){
  int packedAnimation=int(iMeta.w+0.5);
  int surface=packedAnimation/10;
  int animation=packedAnimation-surface*10;
  float phase=uTime+iWorld.x*.17+iWorld.z*.11;
  mat3 local=rz(iAngles.w)*ry(iAngles.z)*rx(iAngles.y);
  if(animation==1)local=ry(phase*.72)*local;
  else if(animation==2)local=rz(sin(phase*1.65)*.16)*local;
  else if(animation==4)local=rx(phase*4.2)*local;
  mat3 heading=ry(-iAngles.x);
  float pulse=animation==3?1.0+sin(phase*5.0)*.09:1.0;
  vec3 model=heading*(local*(aPos*iScale*pulse));
  // Every primitive in a composite model samples the same unit-center ground
  // anchor. Sloped terrain can no longer lift chimneys, turrets, or wings away
  // from the body simply because their local centers land on adjacent tiles.
  float ground=surface==1?-0.08:smoothHeight(iAnchor);
  float flightBob=step(1.5,iWorld.y)*sin(uTime*3.2+iWorld.x*.7+iWorld.z*.4)*.14;
  float hover=animation==5?sin(phase*2.1)*.11:0.0;
  vec3 world=vec3(iWorld.x,ground+iWorld.y+flightBob+hover,iWorld.z)+model;
  gl_Position=uViewProjection*vec4(world,1.0);
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
  else if(material==7)base=vec3(0.96,0.99,1.0);
  else if(material==8)base=vec3(0.34,0.37,0.41);
  vec3 light=normalize(vec3(-0.55,0.88,-0.42));
  float diffuse=0.54+max(0.0,dot(normalize(vNormal),light))*0.58;
  if(material==4)diffuse=1.35;
  if(material==6){outColor=vec4(base,0.30*vMeta.z);return;}
  outColor=vec4(base*diffuse,vMeta.z);
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
  private meshes = new Map<string, Mesh>();
  private batches = new Map<string, number[]>();
  private uniforms: Record<string, WebGLUniformLocation | null>;
  private ghostPreview: GhostPreviewData | null = null;
  private disposed = false;
  private readonly loadedModelTypes = new Set<UnitType>();

  constructor(
    private gl: WebGL2RenderingContext,
    private terrain: WebGLTexture,
    private palette: WebGLTexture,
    private mapWidth: number,
    private mapHeight: number,
  ) {
    this.program = createProgram(gl, vert, frag);
    this.uniforms = Object.fromEntries(
      ["uTerrain", "uPalette", "uMapSize", "uViewProjection", "uTime"].map(
        (name) => [name, gl.getUniformLocation(this.program, name)],
      ),
    );
    // The only generated geometry retained is the soft terrain shadow. Unit
    // bodies are loaded from the verified local GLB catalog below. The sphere
    // and cylinder are reserved for the tank's terminal turret/projectile FX.
    this.meshes.set("cylinder", this.createMesh(this.radialGeometry(false)));
    this.meshes.set("sphere", this.createMesh(this.sphereGeometry()));
    for (const kind of this.meshes.keys()) this.batches.set(kind, []);
    gl.useProgram(this.program);
    gl.uniform1i(this.uniforms.uTerrain, 0);
    gl.uniform1i(this.uniforms.uPalette, 1);
    void this.loadModelCatalog();
  }

  private async loadModelCatalog(): Promise<void> {
    await Promise.all(
      Object.values(UnitType).map(async (type) => {
        const key = threeDModelBatchKey(type);
        try {
          const mesh = await loadThreeDAsset(threeDAsset(type));
          if (this.disposed) return;
          this.meshes.set(key, this.createMesh(mesh));
          this.batches.set(key, []);
          this.loadedModelTypes.add(type);
        } catch (error) {
          // The classic sprite remains visible when a real model cannot load;
          // never replace a failed asset with the old generated cubes.
          console.error(`Unable to load real 3D model for ${type}`, error);
        }
      }),
    );
  }

  readyModelTypes(): ReadonlySet<UnitType> {
    return this.loadedModelTypes;
  }

  update(
    units: ReadonlyMap<number, UnitState>,
    view?: {
      centerX: number;
      centerY: number;
      zoom: number;
      width: number;
      height: number;
    },
    structures: ReadonlyMap<number, UnitState> = new Map(),
  ): void {
    for (const batch of this.batches.values()) batch.length = 0;
    const halfHeight = view
      ? view.height / Math.max(0.01, view.zoom * 2)
      : Number.POSITIVE_INFINITY;
    const halfWidth = view
      ? halfHeight * (view.width / Math.max(1, view.height))
      : Number.POSITIVE_INFINITY;
    const ghost = this.ghostPreview
      ? threeDGhostPresentation(this.ghostPreview)
      : null;
    const ghostUnit = ghost
      ? ({
          id: -1,
          unitType: ghost.unitType,
          pos: ghost.z * this.mapWidth + ghost.x,
          lastPos: ghost.z * this.mapWidth + ghost.x,
          ownerID: this.ghostPreview!.ownerID,
          isActive: true,
          visibleToLocal: true,
          underConstruction: false,
        } as UnitState)
      : null;
    const renderables = [
      ...collectThreeDRenderableUnits(units, structures),
    ].filter(isThreeDSpecialModel);
    const allUnits = ghostUnit
      ? (function* (): Generator<UnitState> {
          yield* renderables;
          yield ghostUnit;
        })()
      : renderables;
    for (const unit of allUnits) {
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
      const isGhost = unit === ghostUnit;
      const ghostValid = ghost?.valid ?? false;
      const alpha = isGhost ? 0.72 : unit.underConstruction ? 0.72 : 1;
      const surface = SURFACE[model.surface ?? "ground"];
      if (unit.unitType === UnitType.Tank && (unit.launchPhase ?? 0) >= 20) {
        const sequence = Math.max(
          0,
          Math.min(1, ((unit.launchPhase ?? 20) - 20) / 30),
        );
        const raised =
          Math.min(1, sequence / 0.12) *
          (1 - Math.max(0, (sequence - 0.12) / 0.88));
        this.batches
          .get("cylinder")!
          .push(
            x,
            0.24 + raised * 0.58,
            z,
            0.22,
            0.72,
            0.22,
            heading,
            0,
            0,
            0,
            unit.ownerID,
            MATERIAL.owner,
            alpha,
            ANIMATION.none + surface * 10,
            x,
            z,
          );
        if (sequence >= 0.1 && sequence < 0.995) {
          const flight = Math.max(0, Math.min(1, (sequence - 0.1) / 0.88));
          const distance = flight * 1.75;
          const projectileX = x + Math.cos(heading) * distance;
          const projectileZ = z + Math.sin(heading) * distance;
          this.batches
            .get("sphere")!
            .push(
              projectileX,
              1.15 + Math.sin(flight * Math.PI) * 40,
              projectileZ,
              0.38,
              0.38,
              0.38,
              heading,
              0,
              0,
              0,
              unit.ownerID,
              MATERIAL.emissive,
              alpha,
              ANIMATION.pulse + surface * 10,
              x,
              z,
            );
        }
        continue;
      }
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
          isGhost
            ? ghostValid
              ? MATERIAL.ghostValid
              : MATERIAL.ghostInvalid
            : MATERIAL.shadow,
          isGhost ? 0.22 : alpha,
          ANIMATION.none + surface * 10,
          x,
          z,
        );
      const key = threeDModelBatchKey(unit.unitType as UnitType);
      const batch = this.batches.get(key);
      if (!batch) continue;
      const definition = THREE_D_ASSET_MANIFEST[unit.unitType as UnitType];
      const rotation = definition.rotation;
      batch.push(
        x,
        model.altitude ?? 0,
        z,
        definition.scale,
        definition.scale,
        definition.scale,
        heading,
        rotation[0],
        rotation[1] + (model.forwardYaw ?? 0),
        rotation[2],
        unit.ownerID,
        isGhost
          ? ghostValid
            ? MATERIAL.ghostValid
            : MATERIAL.ghostInvalid
          : MATERIAL.owner,
        alpha,
        ANIMATION[
          unit.underConstruction ? "pulse" : (model.animation ?? "none")
        ] +
          surface * 10,
        x,
        z,
      );
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

  updateGhostPreview(data: GhostPreviewData | null): void {
    this.ghostPreview = data;
  }

  setQuality(_distantDetail: number): void {
    // GLB assets are already normalized, compact low-poly meshes. Keep this
    // compatibility hook for the shared quality controller; texture/particle
    // budgets are still adjusted by their owning passes.
  }

  draw(
    centerX: number,
    centerY: number,
    centerHeight: number,
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
    gl.uniform2f(this.uniforms.uMapSize, this.mapWidth, this.mapHeight);
    gl.uniformMatrix4fv(
      this.uniforms.uViewProjection,
      false,
      new Float32Array(camera.viewProjection),
    );
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
      [6, 2, 14],
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
    const longitudes = 18;
    for (let latitude = 0; latitude <= latitudes; latitude++) {
      const v = latitude / latitudes;
      const phi = v * Math.PI;
      for (let longitude = 0; longitude <= longitudes; longitude++) {
        const u = longitude / longitudes;
        const theta = u * Math.PI * 2;
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        vertices.push(x * 0.5, y * 0.5, z * 0.5, x, y, z);
      }
    }
    for (let latitude = 0; latitude < latitudes; latitude++) {
      for (let longitude = 0; longitude < longitudes; longitude++) {
        const a = latitude * (longitudes + 1) + longitude;
        const b = a + longitudes + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return { vertices, indices };
  }

  dispose(): void {
    this.disposed = true;
    this.gl.deleteProgram(this.program);
    for (const mesh of this.meshes.values()) {
      this.gl.deleteVertexArray(mesh.vao);
      this.gl.deleteBuffer(mesh.vertexBuffer);
      this.gl.deleteBuffer(mesh.indexBuffer);
      this.gl.deleteBuffer(mesh.instanceBuffer);
    }
  }
}
