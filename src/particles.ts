import {
  Scene,
  ParticleSystem,
  Vector3,
  Color4,
  DynamicTexture
} from "@babylonjs/core";

export class StackParticleController {
  private scene: Scene;
  private sparkleTexture: DynamicTexture;

  constructor(scene: Scene) {
    this.scene = scene;
    this.sparkleTexture = this.createSparkleTexture();
  }

  private createSparkleTexture(): DynamicTexture {
    const size = 64;
    const dt = new DynamicTexture("sparkleTex", { width: size, height: size }, this.scene, false);
    const ctx = dt.getContext();

    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.3, "rgba(255, 255, 255, 0.9)");
    grad.addColorStop(0.7, "rgba(255, 230, 150, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    dt.update();
    return dt;
  }

  // Perfekt-Aura entlang der Kanten des neuen Blocks
  public emitPerfectSparkles(center: Vector3, sizeX: number, sizeZ: number, colorRgb: { r: number; g: number; b: number }) {
    const ps = new ParticleSystem("perfectSparkles", 45, this.scene);
    ps.particleTexture = this.sparkleTexture;
    ps.emitter = center;

    ps.minEmitBox = new Vector3(-sizeX / 2, 0, -sizeZ / 2);
    ps.maxEmitBox = new Vector3(sizeX / 2, 0.1, sizeZ / 2);

    const { r, g, b } = colorRgb;
    ps.color1 = new Color4(1, 1, 1, 1.0);
    ps.color2 = new Color4(r * 1.2, g * 1.2, b * 1.2, 0.8);
    ps.colorDead = new Color4(r * 0.5, g * 0.5, b * 0.5, 0.0);

    ps.minSize = 0.12;
    ps.maxSize = 0.28;
    ps.minLifeTime = 0.3;
    ps.maxLifeTime = 0.6;
    ps.emitRate = 250;

    ps.direction1 = new Vector3(-1, 2, -1);
    ps.direction2 = new Vector3(1, 3, 1);
    ps.minEmitPower = 0.8;
    ps.maxEmitPower = 2.0;
    ps.gravity = new Vector3(0, -4, 0);

    ps.targetStopDuration = 0.12;
    ps.disposeOnStop = true;
    ps.start();
  }
}
