/** Pulsing owner-colored ground glows for vehicles waiting at their base. */

import type { UnitState } from "../../types";
import { UT_PLANE, UT_TANK } from "../../types";
import { DynamicInstanceBuffer } from "../DynamicBuffer";
import { createProgram } from "../utils/GlUtils";

import fragSrc from "../shaders/parked-vehicle-glow/parked-vehicle-glow.frag.glsl?raw";
import vertSrc from "../shaders/parked-vehicle-glow/parked-vehicle-glow.vert.glsl?raw";

const FLOATS_PER_INSTANCE = 5;
const BYTES_PER_INSTANCE = FLOATS_PER_INSTANCE * 4;
const GLOW_RADIUS_TILES = 6;

export function isParkedVehicleGlow(unit: UnitState): boolean {
  if (!unit.isActive) return false;
  if (unit.unitType === UT_TANK) return unit.loaded === true;
  if (unit.unitType === UT_PLANE) {
    return unit.loaded === true || unit.underConstruction;
  }
  return false;
}

export class ParkedVehicleGlowPass {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private quadBuf: WebGLBuffer;
  private instanceBuf: DynamicInstanceBuffer;
  private instanceCount = 0;
  private uCamera: WebGLUniformLocation;
  private uRadius: WebGLUniformLocation;
  private uTick: WebGLUniformLocation;

  constructor(
    private gl: WebGL2RenderingContext,
    private mapW: number,
    private paletteData: Float32Array,
  ) {
    this.program = createProgram(gl, vertSrc, fragSrc);
    this.uCamera = gl.getUniformLocation(this.program, "uCamera")!;
    this.uRadius = gl.getUniformLocation(this.program, "uRadius")!;
    this.uTick = gl.getUniformLocation(this.program, "uTick")!;

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    this.quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const instanceGlBuf = gl.createBuffer()!;
    this.instanceBuf = new DynamicInstanceBuffer(
      gl,
      instanceGlBuf,
      16,
      FLOATS_PER_INSTANCE,
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceGlBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, BYTES_PER_INSTANCE, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, BYTES_PER_INSTANCE, 8);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
  }

  update(units: ReadonlyMap<number, UnitState>): void {
    let count = 0;
    for (const unit of units.values()) {
      if (!isParkedVehicleGlow(unit)) continue;
      this.instanceBuf.ensureCapacity(count + 1);
      const off = count * FLOATS_PER_INSTANCE;
      const x = unit.pos % this.mapW;
      const paletteOff = unit.ownerID * 4;
      this.instanceBuf.float32[off] = x;
      this.instanceBuf.float32[off + 1] = (unit.pos - x) / this.mapW;
      this.instanceBuf.float32[off + 2] = this.paletteData[paletteOff];
      this.instanceBuf.float32[off + 3] = this.paletteData[paletteOff + 1];
      this.instanceBuf.float32[off + 4] = this.paletteData[paletteOff + 2];
      count++;
    }
    this.instanceCount = count;
    if (count === 0) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      0,
      this.instanceBuf.float32,
      0,
      count * FLOATS_PER_INSTANCE,
    );
  }

  draw(cameraMatrix: Float32Array, frameTick: number): void {
    if (this.instanceCount === 0) return;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.uniformMatrix3fv(this.uCamera, false, cameraMatrix);
    gl.uniform1f(this.uRadius, GLOW_RADIUS_TILES);
    gl.uniform1f(this.uTick, frameTick);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instanceCount);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.quadBuf);
    this.instanceBuf.dispose();
  }
}
