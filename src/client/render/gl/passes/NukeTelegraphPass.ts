/**
 * NukeTelegraphPass — renders animated blast-radius circles at the target
 * location of each in-flight nuke.
 *
 * Instanced quads with two concentric circle SDFs (inner filled, outer
 * dashed ring). Similar to SAMRadiusPass but with different aesthetics.
 */

import type { NukeTelegraphData } from "../../types";
import { DynamicInstanceBuffer } from "../DynamicBuffer";
import type { RenderSettings } from "../RenderSettings";
import { ThreeDCameraState } from "../three-d/ThreeDCamera";
import { createProgram } from "../utils/GlUtils";
import {
  clampWorldRadius,
  isFiniteClipGeometry,
} from "../utils/ProjectionSafety";

import classicFragSrc from "../shaders/nuke-telegraph/nuke-telegraph-classic.frag.glsl?raw";
import classicVertSrc from "../shaders/nuke-telegraph/nuke-telegraph-classic.vert.glsl?raw";
import fragSrc from "../shaders/nuke-telegraph/nuke-telegraph.frag.glsl?raw";
import vertSrc from "../shaders/nuke-telegraph/nuke-telegraph.vert.glsl?raw";

// Per-instance: x, y, innerRadius, outerRadius, relation
const FLOATS_PER_INSTANCE = 8;

export class NukeTelegraphPass {
  private gl: WebGL2RenderingContext;
  private settings: RenderSettings;
  private program: WebGLProgram;
  private classicProgram: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private instanceBuf: DynamicInstanceBuffer;

  private uCamera: WebGLUniformLocation;
  private uTime: WebGLUniformLocation;
  private uTelegraphStyle: WebGLUniformLocation;
  private uTelegraphAlpha: WebGLUniformLocation;
  private uColorSelf: WebGLUniformLocation;
  private uColorAlly: WebGLUniformLocation;
  private uColorEnemy: WebGLUniformLocation;
  private uThreeD: WebGLUniformLocation;
  private uThreeDCenter: WebGLUniformLocation;
  private uDistance: WebGLUniformLocation;
  private uTanHalfFov: WebGLUniformLocation;
  private uAspect: WebGLUniformLocation;
  private uTilt: WebGLUniformLocation;
  private uYaw: WebGLUniformLocation;
  private uViewProjection: WebGLUniformLocation;
  private classicCamera: WebGLUniformLocation;
  private classicTime: WebGLUniformLocation;
  private classicTelegraphStyle: WebGLUniformLocation;
  private classicTelegraphAlpha: WebGLUniformLocation;
  private classicColorSelf: WebGLUniformLocation;
  private classicColorAlly: WebGLUniformLocation;
  private classicColorEnemy: WebGLUniformLocation;

  private instanceCount = 0;
  private startTime = performance.now();

  constructor(
    gl: WebGL2RenderingContext,
    settings: RenderSettings,
    private terrain: WebGLTexture,
    private mapW: number,
    private mapH: number,
  ) {
    this.gl = gl;
    this.settings = settings;
    this.program = createProgram(gl, vertSrc, fragSrc);
    // Keep OpenFront's proven 2D warning program independent from the custom
    // 3D terrain-projection program. Sharing the latter made valid in-flight
    // destinations disappear in the classic renderer on real GPUs.
    this.classicProgram = createProgram(gl, classicVertSrc, classicFragSrc);

    this.uCamera = gl.getUniformLocation(this.program, "uCamera")!;
    this.uTime = gl.getUniformLocation(this.program, "uTime")!;
    this.uTelegraphStyle = gl.getUniformLocation(
      this.program,
      "uTelegraphStyle",
    )!;
    this.uTelegraphAlpha = gl.getUniformLocation(
      this.program,
      "uTelegraphAlpha",
    )!;
    this.uColorSelf = gl.getUniformLocation(this.program, "uColorSelf")!;
    this.uColorAlly = gl.getUniformLocation(this.program, "uColorAlly")!;
    this.uColorEnemy = gl.getUniformLocation(this.program, "uColorEnemy")!;
    this.uThreeD = gl.getUniformLocation(this.program, "uThreeD")!;
    this.uThreeDCenter = gl.getUniformLocation(this.program, "uThreeDCenter")!;
    this.uDistance = gl.getUniformLocation(this.program, "uDistance")!;
    this.uTanHalfFov = gl.getUniformLocation(this.program, "uTanHalfFov")!;
    this.uAspect = gl.getUniformLocation(this.program, "uAspect")!;
    this.uTilt = gl.getUniformLocation(this.program, "uTilt")!;
    this.uYaw = gl.getUniformLocation(this.program, "uYaw")!;
    this.uViewProjection = gl.getUniformLocation(
      this.program,
      "uViewProjection",
    )!;
    this.classicCamera = gl.getUniformLocation(this.classicProgram, "uCamera")!;
    this.classicTime = gl.getUniformLocation(this.classicProgram, "uTime")!;
    this.classicTelegraphStyle = gl.getUniformLocation(
      this.classicProgram,
      "uTelegraphStyle",
    )!;
    this.classicTelegraphAlpha = gl.getUniformLocation(
      this.classicProgram,
      "uTelegraphAlpha",
    )!;
    this.classicColorSelf = gl.getUniformLocation(
      this.classicProgram,
      "uColorSelf",
    )!;
    this.classicColorAlly = gl.getUniformLocation(
      this.classicProgram,
      "uColorAlly",
    )!;
    this.classicColorEnemy = gl.getUniformLocation(
      this.classicProgram,
      "uColorEnemy",
    )!;
    gl.useProgram(this.program);
    gl.uniform1i(gl.getUniformLocation(this.program, "uTerrain"), 0);

    // VAO
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);

    // Attribute 0: unit quad [0,1]
    const quadBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Attribute 1: per-instance vec4 (x, y, innerR, outerR)
    // Attribute 2: relation, sourceX, sourceY, aircraft flag
    const glBuf = gl.createBuffer()!;
    this.instanceBuf = new DynamicInstanceBuffer(
      gl,
      glBuf,
      16,
      FLOATS_PER_INSTANCE,
    );
    const stride = FLOATS_PER_INSTANCE * 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, glBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(2, 1);

    gl.bindVertexArray(null);
  }

  update(data: NukeTelegraphData[]): void {
    const safeData = data.filter((d) =>
      isFiniteClipGeometry([
        d.x,
        d.y,
        d.innerRadius,
        d.outerRadius,
        d.sourceX,
        d.sourceY,
        d.routeKind,
      ]),
    );
    const count = safeData.length;
    this.instanceBuf.ensureCapacity(count);

    const buf = this.instanceBuf.float32;
    for (let i = 0; i < count; i++) {
      const d = safeData[i];
      const off = i * FLOATS_PER_INSTANCE;
      buf[off + 0] = d.x;
      buf[off + 1] = d.y;
      buf[off + 2] = clampWorldRadius(d.innerRadius, this.mapW, this.mapH);
      buf[off + 3] = clampWorldRadius(d.outerRadius, this.mapW, this.mapH);
      buf[off + 4] = d.relation;
      buf[off + 5] = d.sourceX;
      buf[off + 6] = d.sourceY;
      buf[off + 7] = d.routeKind;
    }

    this.instanceCount = count;

    if (count > 0) {
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
  }

  draw(cameraMatrix: Float32Array): void {
    if (this.instanceCount === 0) return;

    const gl = this.gl;
    const s = this.settings.nukeTelegraph;
    const time = (performance.now() - this.startTime) / 1000;

    gl.useProgram(this.classicProgram);
    gl.uniformMatrix3fv(this.classicCamera, false, cameraMatrix);
    gl.uniform1f(this.classicTime, time);
    gl.uniform4f(
      this.classicTelegraphStyle,
      s.strokeWidth,
      s.dashLen,
      s.gapLen,
      s.rotationSpeed,
    );
    gl.uniform4f(
      this.classicTelegraphAlpha,
      s.baseAlpha,
      s.pulseAmplitude,
      s.pulseSpeed,
      s.fillAlphaOffset,
    );
    gl.uniform3f(
      this.classicColorSelf,
      s.selfColorR,
      s.selfColorG,
      s.selfColorB,
    );
    gl.uniform3f(
      this.classicColorAlly,
      s.allyColorR,
      s.allyColorG,
      s.allyColorB,
    );
    gl.uniform3f(this.classicColorEnemy, s.colorR, s.colorG, s.colorB);

    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instanceCount);
  }

  drawThreeD(
    centerX: number,
    centerY: number,
    centerHeight: number,
    zoom: number,
    width: number,
    height: number,
    yaw: number,
    pitch: number,
  ): void {
    if (this.instanceCount === 0) return;
    const gl = this.gl;
    const camera = ThreeDCameraState.create({
      viewportWidth: width,
      viewportHeight: height,
      mapWidth: this.mapW,
      mapHeight: this.mapH,
      centerX,
      centerZ: centerY,
      centerHeight,
      zoom,
      yaw,
      pitch,
    });
    gl.useProgram(this.program);
    gl.uniform1i(this.uThreeD, 1);
    gl.uniform2f(this.uThreeDCenter, centerX, centerY);
    gl.uniform2f(
      gl.getUniformLocation(this.program, "uMapSize"),
      this.mapW,
      this.mapH,
    );
    gl.uniform1f(this.uDistance, camera.distance);
    gl.uniform1f(this.uTanHalfFov, camera.tanHalfFov);
    gl.uniform1f(this.uAspect, width / Math.max(1, height));
    gl.uniform1f(this.uTilt, pitch);
    gl.uniform1f(this.uYaw, yaw);
    gl.uniformMatrix4fv(
      this.uViewProjection,
      false,
      new Float32Array(camera.viewProjection),
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.terrain);
    this.drawStyleAndInstances();
  }

  private drawStyleAndInstances(): void {
    const gl = this.gl;
    const s = this.settings.nukeTelegraph;
    gl.uniform1f(this.uTime, (performance.now() - this.startTime) / 1000);
    gl.uniform4f(
      this.uTelegraphStyle,
      s.strokeWidth,
      s.dashLen,
      s.gapLen,
      s.rotationSpeed,
    );
    gl.uniform4f(
      this.uTelegraphAlpha,
      s.baseAlpha,
      s.pulseAmplitude,
      s.pulseSpeed,
      s.fillAlphaOffset,
    );
    gl.uniform3f(this.uColorSelf, s.selfColorR, s.selfColorG, s.selfColorB);
    gl.uniform3f(this.uColorAlly, s.allyColorR, s.allyColorG, s.allyColorB);
    gl.uniform3f(this.uColorEnemy, s.colorR, s.colorG, s.colorB);
    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.instanceCount);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.classicProgram);
    this.instanceBuf.dispose();
    gl.deleteVertexArray(this.vao);
  }
}
