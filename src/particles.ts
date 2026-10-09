import {
  Scene,
  ParticleSystem,
  Vector3,
  Color4,
  DynamicTexture,
  MeshBuilder,
  StandardMaterial,
  Color3
} from "@babylonjs/core";

export class StackParticleController {
  private scene: Scene;
  private sparkleTexture: DynamicTexture;
  private ambientDustSystem: ParticleSystem | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.sparkleTexture = this.createSparkleTexture();
    this.initAmbientDust();
  }

  private createSparkleTexture(): DynamicTexture {
    const size = 64;
    const dt = new DynamicTexture("sparkleTex", { width: size, height: size }, this.scene, false);
    const ctx = dt.getContext();

    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.3, "rgba(255, 255, 255, 0.95)");
    grad.addColorStop(0.65, "rgba(255, 240, 180, 0.5)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    dt.update();
    return dt;
  }

  // 1. Schwebende Bokeh / Ambient Dust Motes im 3D-Hintergrund für Raumtiefe
  private initAmbientDust() {
    this.ambientDustSystem = new ParticleSystem("ambientDust", 80, this.scene);
    this.ambientDustSystem.particleTexture = this.sparkleTexture;
    this.ambientDustSystem.emitter = new Vector3(0, 5, 0);

    this.ambientDustSystem.minEmitBox = new Vector3(-8, -4, -8);
    this.ambientDustSystem.maxEmitBox = new Vector3(8, 25, 8);

    this.ambientDustSystem.color1 = new Color4(0.8, 0.95, 1.0, 0.25);
    this.ambientDustSystem.color2 = new Color4(1.0, 0.9, 0.6, 0.2);
    this.ambientDustSystem.colorDead = new Color4(0.2, 0.2, 0.4, 0.0);

    this.ambientDustSystem.minSize = 0.15;
    this.ambientDustSystem.maxSize = 0.45;
    this.ambientDustSystem.minLifeTime = 4.0;
    this.ambientDustSystem.maxLifeTime = 8.0;
    this.ambientDustSystem.emitRate = 12;

    this.ambientDustSystem.direction1 = new Vector3(-0.2, 0.1, -0.2);
    this.ambientDustSystem.direction2 = new Vector3(0.2, 0.4, 0.2);
    this.ambientDustSystem.minEmitPower = 0.1;
    this.ambientDustSystem.maxEmitPower = 0.3;

    this.ambientDustSystem.start();
  }

  public updateDustPosition(cameraY: number) {
    if (this.ambientDustSystem) {
      this.ambientDustSystem.emitter = new Vector3(0, cameraY, 0);
    }
  }

  // 2. Horizontale Schockwellen-Scheibe (Expanding Shockwave Ring)
  public emitShockwaveRing(center: Vector3, radius: number, colorRgb: { r: number; g: number; b: number }) {
    const ring = MeshBuilder.CreateTorus(
      "shockwaveRing",
      {
        diameter: radius * 1.5,
        thickness: 0.08,
        tessellation: 36
      },
      this.scene
    );
    ring.position = center.clone();
    ring.position.y += 0.02; // Knapper Versatz über der Oberfläche

    const mat = new StandardMaterial("shockwaveMat", this.scene);
    const { r, g, b } = colorRgb;
    mat.diffuseColor = new Color3(r, g, b);
    mat.emissiveColor = new Color3(r * 1.2, g * 1.2, b * 1.2);
    mat.alpha = 0.9;
    ring.material = mat;

    let scale = 1.0;
    let alpha = 0.9;
    const observer = this.scene.onBeforeRenderObservable.add(() => {
      scale += 0.18;
      alpha -= 0.055;
      ring.scaling.set(scale, 1, scale);
      mat.alpha = Math.max(0, alpha);

      if (alpha <= 0) {
        this.scene.onBeforeRenderObservable.remove(observer);
        ring.dispose();
        mat.dispose();
      }
    });
  }

  // 3. Perfekt-Aura entlang der Kanten des neuen Blocks
  public emitPerfectSparkles(center: Vector3, sizeX: number, sizeZ: number, colorRgb: { r: number; g: number; b: number }, comboLevel: number = 1) {
    const count = Math.min(100, 35 + comboLevel * 15);
    const ps = new ParticleSystem("perfectSparkles", count, this.scene);
    ps.particleTexture = this.sparkleTexture;
    ps.emitter = center;

    ps.minEmitBox = new Vector3(-sizeX / 2, 0, -sizeZ / 2);
    ps.maxEmitBox = new Vector3(sizeX / 2, 0.1, sizeZ / 2);

    const { r, g, b } = colorRgb;
    ps.color1 = new Color4(1, 1, 1, 1.0);
    ps.color2 = new Color4(r * 1.3, g * 1.3, b * 1.3, 0.9);
    ps.colorDead = new Color4(r * 0.4, g * 0.4, b * 0.4, 0.0);

    ps.minSize = 0.14;
    ps.maxSize = 0.38;
    ps.minLifeTime = 0.35;
    ps.maxLifeTime = 0.75;
    ps.emitRate = 350;

    ps.direction1 = new Vector3(-1.2, 2.5, -1.2);
    ps.direction2 = new Vector3(1.2, 4.5, 1.2);
    ps.minEmitPower = 1.0 + Math.min(2.0, comboLevel * 0.3);
    ps.maxEmitPower = 2.5 + Math.min(3.0, comboLevel * 0.4);
    ps.gravity = new Vector3(0, -6, 0);

    ps.targetStopDuration = 0.14;
    ps.disposeOnStop = true;
    ps.start();

    // Schockwellen-Ring abfeuern!
    this.emitShockwaveRing(center, Math.max(sizeX, sizeZ), colorRgb);
  }

  // 4. Schnitt-Funken an der Trennlinie
  public emitCutSparks(edgePos: Vector3, colorRgb: { r: number; g: number; b: number }) {
    const ps = new ParticleSystem("cutSparks", 20, this.scene);
    ps.particleTexture = this.sparkleTexture;
    ps.emitter = edgePos;

    ps.minEmitBox = new Vector3(-0.2, -0.1, -0.2);
    ps.maxEmitBox = new Vector3(0.2, 0.1, 0.2);

    const { r, g, b } = colorRgb;
    ps.color1 = new Color4(1, 0.9, 0.5, 0.9);
    ps.color2 = new Color4(r, g, b, 0.6);
    ps.colorDead = new Color4(0.2, 0.2, 0.2, 0.0);

    ps.minSize = 0.08;
    ps.maxSize = 0.2;
    ps.minLifeTime = 0.2;
    ps.maxLifeTime = 0.45;
    ps.emitRate = 180;

    ps.direction1 = new Vector3(-1, 1, -1);
    ps.direction2 = new Vector3(1, 2, 1);
    ps.minEmitPower = 0.8;
    ps.maxEmitPower = 2.0;
    ps.gravity = new Vector3(0, -8, 0);

    ps.targetStopDuration = 0.08;
    ps.disposeOnStop = true;
    ps.start();
  }
}
