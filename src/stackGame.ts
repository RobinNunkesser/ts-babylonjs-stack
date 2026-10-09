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

  // Tower Meshes and Debris
  private towerBlocks: Mesh[] = [];
  private fallingPieces: FallingPiece[] = [];

  // Smooth Camera Target
  private targetCameraY = 1.5;

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
    this.scene.clearColor = new Color4(0.06, 0.08, 0.12, 1.0);

    // Audio & Particles
    this.audioCtrl = new StackAudioController();
    this.particleCtrl = new StackParticleController(this.scene);

    // Load Highscore
    this.bestScore = parseInt(localStorage.getItem("stack3d_best_score") || "0", 10);

    // Camera setup: Isometrischer Winkel für Monument Valley / Stack Ästhetik
    this.camera = new ArcRotateCamera(
      "isoCam",
      -Math.PI / 4,
      Math.PI / 3.2,
      14,
      new Vector3(0, this.targetCameraY, 0),
      this.scene
    );
    this.camera.attachControl(canvas, false);
    // User darf nicht frei drehen, um das perfekte isometrische Gefühl zu bewahren
    this.camera.inputs.clear();

    // Beleuchtungssystem: Weiches Umgebungslicht + gerichtetes Licht für Schlagschatten
    const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.55;
    hemiLight.diffuse = new Color3(0.9, 0.95, 1.0);
    hemiLight.groundColor = new Color3(0.2, 0.25, 0.35);

    this.dirLight = new DirectionalLight("dirLight", new Vector3(-0.8, -1.8, 0.6), this.scene);
    this.dirLight.position = new Vector3(10, 20, -10);
    this.dirLight.intensity = 1.1;

    // Weiche Kaskadenschatten auf den Turmstufen
    this.shadowGenerator = new ShadowGenerator(1024, this.dirLight);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 16;
    this.shadowGenerator.darkness = 0.45;

    // Bloom / GlowLayer für die Perfekt-Aura
    this.glowLayer = new GlowLayer("glow", this.scene);
    this.glowLayer.intensity = 0.6;

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
    baseMat.specularColor = new Color3(0.3, 0.3, 0.3);
    baseMat.specularPower = 32;

    const baseMesh = MeshBuilder.CreateBox(
      "basePlatform",
      {
        width: this.INITIAL_SIZE,
        height: 2.5,
        depth: this.INITIAL_SIZE
      },
      this.scene
    );
    baseMesh.position.set(0, -1.25 + this.BLOCK_HEIGHT / 2, 0);
    baseMesh.material = baseMat;
    baseMesh.receiveShadows = true;

    this.shadowGenerator.addShadowCaster(baseMesh);
    this.towerBlocks.push(baseMesh);
  }

  public setTheme(theme: ColorTheme) {
    this.currentTheme = theme;
    // Basis-Farbe sofort anpassen
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
    this.camera.target.y = this.targetCameraY;

    this.onScoreChanged?.(this.score);
    this.onComboChanged?.(0, false);
  }

  private spawnNextBlock() {
    this.currentLevel++;
    const y = this.currentLevel * this.BLOCK_HEIGHT;

    // Wechsel der Achse: abwechselnd X und Z
    this.currentAxis = this.currentLevel % 2 === 1 ? "x" : "z";

    // Material mit prozeduralem Farbton aus gewähltem Theme
    const col = this.currentTheme.getBaseColor(this.currentLevel);
    this.activeMaterial = new StandardMaterial(`blockMat_${this.currentLevel}`, this.scene);
    this.activeMaterial.diffuseColor = new Color3(col.r, col.g, col.b);
    this.activeMaterial.specularColor = new Color3(0.4, 0.4, 0.4);
    this.activeMaterial.specularPower = 32;

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

    // Leichte Geschwindigkeitssteigerung mit zunehmender Turmhöhe
    this.moveSpeed = Math.min(6.2, 3.2 + this.currentLevel * 0.08);

    // Kamera sanft nach oben nachführen
    this.targetCameraY = Math.max(1.5, y + 0.8);
  }

  // --- DIE TRIVIALE SPIELMECHANIK (Didaktischer Kern) ---
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

      // Partikel-Aura an den Rändern des Blocks
      const col = this.currentTheme.getBaseColor(this.currentLevel);
      this.particleCtrl.emitPerfectSparkles(
        this.activeBlock.position.clone(),
        this.currentSizeX,
        this.currentSizeZ,
        col
      );

      // Didaktischer Belohnungsmechanismus: Bei 5 Combos wächst der Turm leicht wieder an!
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
      // Der ganze Block stürzt ab
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

    const overlapSize = currentDim - absDelta;
    const cutSize = absDelta;

    const overlapCenter = prevPos + delta / 2;
    const cutCenter = delta > 0
      ? prevPos + currentDim / 2 + cutSize / 2
      : prevPos - currentDim / 2 - cutSize / 2;

    // Alten aktiven Block entsorgen und durch den zugeschnittenen Turmblock ersetzen
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
    this.towerBlocks.push(placedBlock);
    this.activeBlock = null;

    // Abgeschnittener Trümmer-Block fällt taumelnd nach unten!
    const cutWidth = isAxisX ? cutSize : this.currentSizeX;
    const cutDepth = isAxisX ? this.currentSizeZ : cutSize;
    const cutX = isAxisX ? cutCenter : this.currentPosX;
    const cutZ = isAxisX ? this.currentPosZ : cutCenter;

    this.createFallingPiece(cutX, y, cutZ, cutWidth, cutDepth, this.activeMaterial!);

    this.score++;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem("stack3d_best_score", this.bestScore.toString());
    }
    this.onScoreChanged?.(this.score);

    this.spawnNextBlock();
    return true;
  }

  // Erzeugt das abgetrennte Trümmerstück mit realistischer Fall- & Rotationsphysik
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
      vy: 0.05,
      rotationSpeed: new Vector3(
        (Math.random() - 0.5) * 4.0,
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 4.0
      ),
      age: 0
    });
  }

  private triggerGameOver() {
    this.state = "GAMEOVER";
    this.audioCtrl.playGameOverSound();
    this.onStateChanged?.(this.state);
    this.onGameOver?.(this.score, this.bestScore);
  }

  // Update pro Frame
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

    // 2. Sanfte Kamera-Verfolgung (Smooth Damping)
    this.camera.target.y += (this.targetCameraY - this.camera.target.y) * 0.06;

    // 3. Stürzende Trümmerstücke (Schwerkraft & Taumeln)
    for (let i = this.fallingPieces.length - 1; i >= 0; i--) {
      const p = this.fallingPieces[i];
      p.age += deltaSec;
      p.vy -= 18.0 * deltaSec; // Schwerkraft
      p.mesh.position.y += p.vy * deltaSec;
      p.mesh.rotation.x += p.rotationSpeed.x * deltaSec;
      p.mesh.rotation.y += p.rotationSpeed.y * deltaSec;
      p.mesh.rotation.z += p.rotationSpeed.z * deltaSec;

      // Nach 3 Sekunden oder weit unter dem Boden aufräumen
      if (p.age > 3.0 || p.mesh.position.y < -12) {
        p.mesh.dispose();
        this.fallingPieces.splice(i, 1);
      }
    }
  }
}
