import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  ShadowGenerator,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  GlowLayer
} from "@babylonjs/core";
import { GameState, Axis, ColorTheme } from "./types";
import { COLOR_THEMES } from "./colorTheme";
import { StackAudioController } from "./audio";
import { StackParticleController } from "./particles";

interface FallingPiece {
  mesh: Mesh;
  vy: number;
  rotationSpeed: Vector3;
  age: number;
}

interface WobbleBlock {
  mesh: Mesh;
  timer: number;
  duration: number;
  initialScaleY: number;
}

export class StackGame {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private dirLight: DirectionalLight;
  private shadowGenerator: ShadowGenerator;
  private glowLayer: GlowLayer;

  public audioCtrl: StackAudioController;
  public particleCtrl: StackParticleController;

  // Game Settings & State
  private state: GameState = "READY";
  private score: number = 0;
  private bestScore: number = 0;
  private combo: number = 0;
  private currentTheme: ColorTheme = COLOR_THEMES[0];

  // Constants
  public readonly BLOCK_HEIGHT = 0.55;
  private readonly INITIAL_SIZE = 3.0;
  private readonly PERFECT_TOLERANCE = 0.12;
  private readonly MOVE_AMPLITUDE = 5.2;

  // Active Tower Dimensions
  private currentSizeX = this.INITIAL_SIZE;
  private currentSizeZ = this.INITIAL_SIZE;
  private currentPosX = 0;
  private currentPosZ = 0;
  private currentLevel = 0;
  private currentAxis: Axis = "x";

  // Moving Block
  private activeBlock: Mesh | null = null;
  private activeMaterial: StandardMaterial | null = null;
  private movePhase = 0;
  private moveSpeed = 3.2;

  // Tower Meshes, Wobbles and Debris
  private towerBlocks: Mesh[] = [];
  private fallingPieces: FallingPiece[] = [];
  private wobblingBlocks: WobbleBlock[] = [];

  // Smooth Camera Target & Screen Shake
  private targetCameraY = 1.5;
  private baseCameraTarget: Vector3 = new Vector3(0, 1.5, 0);
  private shakeTimer: number = 0;
  private shakeMagnitude: number = 0;

  // Callbacks
  public onScoreChanged?: (score: number) => void;
  public onComboChanged?: (combo: number, isPerfect: boolean) => void;
  public onGameOver?: (score: number, bestScore: number) => void;
  public onStateChanged?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    });

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.06, 0.08, 0.13, 1.0);

    // Volumetrischer Atmosphären-Nebel für plastische Tiefe
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.024;
    this.scene.fogColor = new Color3(0.06, 0.08, 0.13);

    // Audio & Particles
    this.audioCtrl = new StackAudioController();
    this.particleCtrl = new StackParticleController(this.scene);

    // Load Highscore
    this.bestScore = parseInt(localStorage.getItem("stack3d_best_score") || "0", 10);

    // Camera setup: Isometrischer Winkel für Monument Valley / Stack Ästhetik
    this.camera = new ArcRotateCamera(
      "isoCam",
      -Math.PI / 4,
      Math.PI / 3.25,
      13.5,
      this.baseCameraTarget.clone(),
      this.scene
    );
    this.camera.attachControl(canvas, false);
    this.camera.inputs.clear(); // Fixe Kameraführung für perfekte Arcade-Kontrolle

    // Beleuchtungssystem: Weiches Umgebungslicht + gerichtetes Sonnenlicht
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.6;
    hemiLight.diffuse = new Color3(0.95, 0.98, 1.0);
    hemiLight.groundColor = new Color3(0.2, 0.25, 0.38);

    this.dirLight = new DirectionalLight("dirLight", new Vector3(-0.7, -1.8, 0.65), this.scene);
    this.dirLight.position = new Vector3(12, 22, -12);
    this.dirLight.intensity = 1.25;

    // Weiche Kaskadenschatten auf den Turmstufen
    this.shadowGenerator = new ShadowGenerator(1024, this.dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 18;
    this.shadowGenerator.darkness = 0.42;

    // Bloom / GlowLayer für die Perfekt-Aura & Neon-Effekte
    this.glowLayer = new GlowLayer("glow", this.scene);
    this.glowLayer.intensity = 0.75;

    // Turm-Basis initialisieren
    this.createBasePlatform();

    // Render-Loop
    this.engine.runRenderLoop(() => {
      this.update();
      this.scene.render();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  private createBasePlatform() {
    const baseMat = new StandardMaterial("baseMat", this.scene);
    const col = this.currentTheme.getBaseColor(0);
    baseMat.diffuseColor = new Color3(col.r, col.g, col.b);
    baseMat.specularColor = new Color3(0.4, 0.4, 0.4);
    baseMat.specularPower = 48;

    const baseMesh = MeshBuilder.CreateBox(
      "basePlatform",
      {
        width: this.INITIAL_SIZE,
        height: 2.8,
        depth: this.INITIAL_SIZE
      },
      this.scene
    );
    baseMesh.position.set(0, -1.4 + this.BLOCK_HEIGHT / 2, 0);
    baseMesh.material = baseMat;
    baseMesh.receiveShadows = true;

    this.shadowGenerator.addShadowCaster(baseMesh);
    this.towerBlocks.push(baseMesh);
  }

  public setTheme(theme: ColorTheme) {
    this.currentTheme = theme;
    if (this.towerBlocks.length > 0) {
      const baseMat = this.towerBlocks[0].material as StandardMaterial;
      if (baseMat) {
        const col = this.currentTheme.getBaseColor(0);
        baseMat.diffuseColor = new Color3(col.r, col.g, col.b);
      }
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getScore(): number {
    return this.score;
  }

  public getBestScore(): number {
    return this.bestScore;
  }

  public startGame() {
    this.audioCtrl.init();
    this.reset();
    this.state = "PLAYING";
    this.onStateChanged?.(this.state);
    this.spawnNextBlock();
  }

  public reset() {
    // Alte Blöcke abräumen (außer Basis)
    for (let i = 1; i < this.towerBlocks.length; i++) {
      this.towerBlocks[i].dispose();
    }
    this.towerBlocks = [this.towerBlocks[0]];

    // Trümmer abräumen
    this.fallingPieces.forEach((p) => p.mesh.dispose());
    this.fallingPieces = [];
    this.wobblingBlocks = [];

    if (this.activeBlock) {
      this.activeBlock.dispose();
      this.activeBlock = null;
    }

    this.score = 0;
    this.combo = 0;
    this.currentLevel = 0;
    this.currentSizeX = this.INITIAL_SIZE;
    this.currentSizeZ = this.INITIAL_SIZE;
    this.currentPosX = 0;
    this.currentPosZ = 0;
    this.currentAxis = "x";
    this.moveSpeed = 3.2;
    this.targetCameraY = 1.5;
    this.baseCameraTarget.set(0, this.targetCameraY, 0);
    this.camera.target.copyFrom(this.baseCameraTarget);
    this.shakeTimer = 0;

    this.updateAtmosphereColor(0);

    this.onScoreChanged?.(this.score);
    this.onComboChanged?.(0, false);
  }

  // Sanfte Anpassung der Himmel- und Nebelfarbe an das aktuelle Stockwerk
  private updateAtmosphereColor(level: number) {
    const col = this.currentTheme.getBaseColor(level);
    // Sanfter dunkler Ton abgeleitet von der aktuellen Turmfarbe
    const bgR = Math.max(0.04, col.r * 0.12);
    const bgG = Math.max(0.05, col.g * 0.12);
    const bgB = Math.max(0.09, col.b * 0.16);

    this.scene.clearColor = new Color4(bgR, bgG, bgB, 1.0);
    this.scene.fogColor = new Color3(bgR, bgG, bgB);
  }

  // Juiciness: Kamera-Erschütterung
  public triggerScreenShake(magnitude: number, duration: number) {
    this.shakeMagnitude = magnitude;
    this.shakeTimer = duration;
  }

  // Juiciness: Squash & Stretch Wobble bei Block-Landung
  private triggerBlockWobble(mesh: Mesh) {
    this.wobblingBlocks.push({
      mesh,
      timer: 0,
      duration: 0.28,
      initialScaleY: mesh.scaling.y
    });
  }

  private spawnNextBlock() {
    this.currentLevel++;
    const y = this.currentLevel * this.BLOCK_HEIGHT;

    // Wechsel der Achse: abwechselnd X und Z
    this.currentAxis = this.currentLevel % 2 === 1 ? "x" : "z";

    // Material mit edlem Glanz & prozeduraler Farbe
    const col = this.currentTheme.getBaseColor(this.currentLevel);
    this.activeMaterial = new StandardMaterial(`blockMat_${this.currentLevel}`, this.scene);
    this.activeMaterial.diffuseColor = new Color3(col.r, col.g, col.b);
    this.activeMaterial.specularColor = new Color3(0.55, 0.55, 0.55);
    this.activeMaterial.specularPower = 48;
    this.activeMaterial.emissiveColor = new Color3(col.r * 0.08, col.g * 0.08, col.b * 0.08);

    this.activeBlock = MeshBuilder.CreateBox(
      `activeBlock_${this.currentLevel}`,
      {
        width: this.currentSizeX,
        height: this.BLOCK_HEIGHT,
        depth: this.currentSizeZ
      },
      this.scene
    );
    this.activeBlock.material = this.activeMaterial;
    this.activeBlock.receiveShadows = true;
    this.shadowGenerator.addShadowCaster(this.activeBlock);

    // Start-Position außerhalb des Turms
    this.movePhase = -Math.PI / 2;
    if (this.currentAxis === "x") {
      this.activeBlock.position.set(-this.MOVE_AMPLITUDE, y, this.currentPosZ);
    } else {
      this.activeBlock.position.set(this.currentPosX, y, -this.MOVE_AMPLITUDE);
    }

    // Leichte Geschwindigkeitssteigerung
    this.moveSpeed = Math.min(6.5, 3.2 + this.currentLevel * 0.08);

    // Kamera und Hintergrund sanft mitwandern lassen
    this.targetCameraY = Math.max(1.5, y + 0.8);
    this.updateAtmosphereColor(this.currentLevel);
    this.particleCtrl.updateDustPosition(this.targetCameraY);
  }

  // --- DIE TRIVIALE SPIELMECHANIK + MAXIMALE JUICINESS ---
  public placeBlock(): boolean {
    if (this.state !== "PLAYING" || !this.activeBlock) {
      if (this.state === "READY") {
        this.startGame();
        return true;
      }
      return false;
    }

    const y = this.currentLevel * this.BLOCK_HEIGHT;
    const isAxisX = this.currentAxis === "x";

    const currentPos = isAxisX ? this.activeBlock.position.x : this.activeBlock.position.z;
    const prevPos = isAxisX ? this.currentPosX : this.currentPosZ;
    const currentDim = isAxisX ? this.currentSizeX : this.currentSizeZ;

    // 1D-Schnitt-Berechnung: Versatz Delta
    const delta = currentPos - prevPos;
    const absDelta = Math.abs(delta);

    // Fall 1: Perfekter Treffer (innerhalb Toleranz)
    if (absDelta <= this.PERFECT_TOLERANCE) {
      // Exaktes Einrasten auf die vorherige Position
      if (isAxisX) {
        this.activeBlock.position.x = prevPos;
      } else {
        this.activeBlock.position.z = prevPos;
      }

      this.combo++;
      const isPerfect = true;
      this.audioCtrl.playStackSound(this.combo, true);

      // Juiciness: Kamera-Mikroruckler & Block-Wobble
      this.triggerScreenShake(0.08 + Math.min(0.12, this.combo * 0.02), 0.18);
      this.triggerBlockWobble(this.activeBlock);

      // Partikel-Aura + Expanding Shockwave Ring!
      const col = this.currentTheme.getBaseColor(this.currentLevel);
      this.particleCtrl.emitPerfectSparkles(
        this.activeBlock.position.clone(),
        this.currentSizeX,
        this.currentSizeZ,
        col,
        this.combo
      );

      // Belohnungsmechanismus: Bei 5 Combos wächst der Turm wieder an!
      if (this.combo >= 5) {
        const bonus = 0.25;
        this.currentSizeX = Math.min(this.INITIAL_SIZE, this.currentSizeX + bonus);
        this.currentSizeZ = Math.min(this.INITIAL_SIZE, this.currentSizeZ + bonus);
        this.activeBlock.scaling.x = this.currentSizeX / this.activeBlock.scaling.x;
        this.activeBlock.scaling.z = this.currentSizeZ / this.activeBlock.scaling.z;
      }

      this.towerBlocks.push(this.activeBlock);
      this.activeBlock = null;

      this.score++;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        localStorage.setItem("stack3d_best_score", this.bestScore.toString());
      }
      this.onScoreChanged?.(this.score);
      this.onComboChanged?.(this.combo, isPerfect);

      this.spawnNextBlock();
      return true;
    }

    // Fall 2: Kompletter Fehlschlag (keine Überlappung -> Game Over)
    if (absDelta >= currentDim) {
      this.createFallingPiece(
        this.activeBlock.position.x,
        y,
        this.activeBlock.position.z,
        this.currentSizeX,
        this.currentSizeZ,
        this.activeMaterial!
      );
      this.activeBlock.dispose();
      this.activeBlock = null;

      this.triggerGameOver();
      return false;
    }

    // Fall 3: Teil-Überlappung (Schnittstellen-Aufteilung)
    this.combo = 0;
    this.audioCtrl.playStackSound(0, false);
    this.audioCtrl.playSliceSound();
    this.onComboChanged?.(0, false);

    // Juiciness: Sanfter Ruckler bei Schnitt
    this.triggerScreenShake(0.06, 0.14);

    const overlapSize = currentDim - absDelta;
    const cutSize = absDelta;

    const overlapCenter = prevPos + delta / 2;
    const cutCenter = delta > 0
      ? prevPos + currentDim / 2 + cutSize / 2
      : prevPos - currentDim / 2 - cutSize / 2;

    this.activeBlock.dispose();

    if (isAxisX) {
      this.currentSizeX = overlapSize;
      this.currentPosX = overlapCenter;
    } else {
      this.currentSizeZ = overlapSize;
      this.currentPosZ = overlapCenter;
    }

    // Neuer zugeschnittener Turmblock
    const placedBlock = MeshBuilder.CreateBox(
      `placedBlock_${this.currentLevel}`,
      {
        width: this.currentSizeX,
        height: this.BLOCK_HEIGHT,
        depth: this.currentSizeZ
      },
      this.scene
    );
    placedBlock.position.set(this.currentPosX, y, this.currentPosZ);
    placedBlock.material = this.activeMaterial;
    placedBlock.receiveShadows = true;
    this.shadowGenerator.addShadowCaster(placedBlock);

    // Juiciness: Elastisches Nachfedern
    this.triggerBlockWobble(placedBlock);
    this.towerBlocks.push(placedBlock);
    this.activeBlock = null;

    // Abgeschnittener Trümmer-Block fällt taumelnd nach unten
    const cutWidth = isAxisX ? cutSize : this.currentSizeX;
    const cutDepth = isAxisX ? this.currentSizeZ : cutSize;
    const cutX = isAxisX ? cutCenter : this.currentPosX;
    const cutZ = isAxisX ? this.currentPosZ : cutCenter;

    this.createFallingPiece(cutX, y, cutZ, cutWidth, cutDepth, this.activeMaterial!);

    // Schnitt-Funken an der Kante
    const col = this.currentTheme.getBaseColor(this.currentLevel);
    this.particleCtrl.emitCutSparks(new Vector3(cutX, y, cutZ), col);

    this.score++;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem("stack3d_best_score", this.bestScore.toString());
    }
    this.onScoreChanged?.(this.score);

    this.spawnNextBlock();
    return true;
  }

  private createFallingPiece(
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
    mat: StandardMaterial
  ) {
    const debris = MeshBuilder.CreateBox(
      "debris",
      { width, height: this.BLOCK_HEIGHT, depth },
      this.scene
    );
    debris.position.set(x, y, z);
    debris.material = mat;
    this.shadowGenerator.addShadowCaster(debris);

    this.fallingPieces.push({
      mesh: debris,
      vy: 0.1,
      rotationSpeed: new Vector3(
        (Math.random() - 0.5) * 5.0,
        (Math.random() - 0.5) * 3.0,
        (Math.random() - 0.5) * 5.0
      ),
      age: 0
    });
  }

  private triggerGameOver() {
    this.state = "GAMEOVER";
    this.triggerScreenShake(0.35, 0.45); // Starker Einsturz-Shake
    this.audioCtrl.playGameOverSound();
    this.onStateChanged?.(this.state);
    this.onGameOver?.(this.score, this.bestScore);
  }

  private update() {
    const deltaSec = this.engine.getDeltaTime() / 1000;

    // 1. Schwingender aktiver Block
    if (this.state === "PLAYING" && this.activeBlock) {
      this.movePhase += deltaSec * this.moveSpeed;
      const offset = Math.sin(this.movePhase) * this.MOVE_AMPLITUDE;

      if (this.currentAxis === "x") {
        this.activeBlock.position.x = this.currentPosX + offset;
      } else {
        this.activeBlock.position.z = this.currentPosZ + offset;
      }
    }

    // 2. Sanfte gedämpfte Kamera-Verfolgung
    this.baseCameraTarget.y += (this.targetCameraY - this.baseCameraTarget.y) * 0.06;

    // 3. Screen Shake Abklingen
    if (this.shakeTimer > 0) {
      this.shakeTimer -= deltaSec;
      const shakeX = (Math.random() - 0.5) * this.shakeMagnitude * 2;
      const shakeY = (Math.random() - 0.5) * this.shakeMagnitude * 2;
      const shakeZ = (Math.random() - 0.5) * this.shakeMagnitude * 2;
      this.camera.target.set(
        this.baseCameraTarget.x + shakeX,
        this.baseCameraTarget.y + shakeY,
        this.baseCameraTarget.z + shakeZ
      );
    } else {
      this.camera.target.copyFrom(this.baseCameraTarget);
    }

    // 4. Juiciness: Block Wobble (Squash & Stretch Dämpfung)
    for (let i = this.wobblingBlocks.length - 1; i >= 0; i--) {
      const wb = this.wobblingBlocks[i];
      wb.timer += deltaSec;
      const progress = wb.timer / wb.duration;

      if (progress >= 1.0) {
        wb.mesh.scaling.y = wb.initialScaleY;
        this.wobblingBlocks.splice(i, 1);
      } else {
        // Gedämpfte Sinus-Federschwingung: staucht leicht und federt ein
        const wobble = Math.sin(progress * Math.PI * 3.5) * Math.exp(-progress * 4.5) * 0.16;
        wb.mesh.scaling.y = wb.initialScaleY * (1.0 + wobble);
      }
    }

    // 5. Stürzende Trümmerstücke (Schwerkraft & Taumeln)
    for (let i = this.fallingPieces.length - 1; i >= 0; i--) {
      const p = this.fallingPieces[i];
      p.age += deltaSec;
      p.vy -= 18.0 * deltaSec; // Schwerkraft
      p.mesh.position.y += p.vy * deltaSec;
      p.mesh.rotation.x += p.rotationSpeed.x * deltaSec;
      p.mesh.rotation.y += p.rotationSpeed.y * deltaSec;
      p.mesh.rotation.z += p.rotationSpeed.z * deltaSec;

      if (p.age > 3.0 || p.mesh.position.y < -12) {
        p.mesh.dispose();
        this.fallingPieces.splice(i, 1);
      }
    }
  }
}
