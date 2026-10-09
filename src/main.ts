import { StackGame } from "./stackGame";
import { COLOR_THEMES } from "./colorTheme";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const game = new StackGame(canvas);

  // UI Elements
  const startOverlay = document.getElementById("start-overlay")!;
  const gameoverOverlay = document.getElementById("gameover-overlay")!;
  const infoModal = document.getElementById("info-modal")!;

  const liveHud = document.getElementById("live-hud")!;
  const liveScore = document.getElementById("live-score")!;
  const comboBadge = document.getElementById("combo-badge")!;

  const startBestScore = document.getElementById("start-best-score")!;
  const summaryScore = document.getElementById("summary-score")!;
  const summaryBest = document.getElementById("summary-best")!;
  const medalIcon = document.getElementById("medal-icon")!;
  const medalText = document.getElementById("medal-text")!;

  const btnStart = document.getElementById("btn-start")!;
  const btnRestart = document.getElementById("btn-restart")!;
  const btnSoundToggle = document.getElementById("btn-sound-toggle")!;
  const soundIcon = document.getElementById("sound-icon")!;
  const btnThemeToggle = document.getElementById("btn-theme-toggle")!;
  const themeLabel = document.getElementById("theme-label")!;
  const btnInfo = document.getElementById("btn-info")!;
  const btnCloseInfo = document.getElementById("btn-close-info")!;

  let currentThemeIndex = 0;

  // Initial Highscore
  startBestScore.textContent = game.getBestScore().toString();

  // Callbacks
  game.onScoreChanged = (score) => {
    liveScore.textContent = score.toString();
    liveScore.classList.remove("punch");
    void liveScore.offsetWidth; // Trigger reflow
    liveScore.classList.add("punch");
    setTimeout(() => liveScore.classList.remove("punch"), 130);
  };

  game.onComboChanged = (combo, isPerfect) => {
    if (isPerfect && combo > 0) {
      comboBadge.classList.remove("hidden");
      if (combo >= 4) {
        comboBadge.classList.add("high-combo");
      } else {
        comboBadge.classList.remove("high-combo");
      }

      if (combo >= 5) {
        comboBadge.textContent = `MAX COMBO x${combo}! (+EXPAND)`;
      } else if (combo >= 2) {
        comboBadge.textContent = `PERFEKT x${combo}!`;
      } else {
        comboBadge.textContent = "PERFEKT!";
      }
    } else {
      comboBadge.classList.add("hidden");
      comboBadge.classList.remove("high-combo");
    }
  };

  game.onGameOver = (score, bestScore) => {
    summaryScore.textContent = score.toString();
    summaryBest.textContent = bestScore.toString();
    startBestScore.textContent = bestScore.toString();

    // Medaillen nach Turmhöhe
    if (score >= 40) {
      medalIcon.textContent = "🏛️";
      medalText.textContent = "Meister-Wolkenkratzer";
    } else if (score >= 25) {
      medalIcon.textContent = "🏢";
      medalText.textContent = "Architektur-Wunder";
    } else if (score >= 12) {
      medalIcon.textContent = "🏠";
      medalText.textContent = "Stabiles Mehrfamilienhaus";
    } else {
      medalIcon.textContent = "🏗️";
      medalText.textContent = "Solider Rohbau";
    }
  };

  game.onStateChanged = (state) => {
    if (state === "READY") {
      startOverlay.classList.remove("hidden");
      startOverlay.classList.add("active");
      gameoverOverlay.classList.add("hidden");
      liveHud.classList.add("hidden");
    } else if (state === "PLAYING") {
      startOverlay.classList.add("hidden");
      startOverlay.classList.remove("active");
      gameoverOverlay.classList.add("hidden");
      liveHud.classList.remove("hidden");
    } else if (state === "GAMEOVER") {
      liveHud.classList.add("hidden");
      setTimeout(() => {
        gameoverOverlay.classList.remove("hidden");
        gameoverOverlay.classList.add("active");
      }, 350);
    }
  };

  // User Action (Tippen / Leertaste platziert den Block)
  const handleAction = (e?: Event) => {
    if (e) {
      if (e.target instanceof HTMLElement && e.target.closest("button, .modal-card, #game-header")) {
        return; // Buttons nicht als Stack-Aktion werten
      }
      e.preventDefault();
    }

    if (game.getState() === "GAMEOVER") {
      return;
    }

    game.placeBlock();
  };

  // Keyboard
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      handleAction();
    }
  });

  // Touch & Mouse auf dem gesamten Viewport
  const viewport = document.getElementById("game-viewport")!;
  viewport.addEventListener("pointerdown", (e: PointerEvent) => {
    handleAction(e);
  });

  // Buttons
  btnStart.addEventListener("click", () => {
    game.startGame();
  });

  btnRestart.addEventListener("click", () => {
    game.startGame();
  });

  btnSoundToggle.addEventListener("click", () => {
    const next = !game.audioCtrl.isEnabled();
    game.audioCtrl.setEnabled(next);
    soundIcon.textContent = next ? "🔊" : "🔇";
    btnSoundToggle.title = next ? "Ton an" : "Ton stummgeschaltet";
  });

  btnThemeToggle.addEventListener("click", () => {
    currentThemeIndex = (currentThemeIndex + 1) % COLOR_THEMES.length;
    const theme = COLOR_THEMES[currentThemeIndex];
    game.setTheme(theme);
    themeLabel.textContent = theme.name.split(" ")[0]; // Kurzer Name
  });

  btnInfo.addEventListener("click", () => {
    infoModal.classList.remove("hidden");
  });

  btnCloseInfo.addEventListener("click", () => {
    infoModal.classList.add("hidden");
  });

  infoModal.addEventListener("click", (e) => {
    if (e.target === infoModal) {
      infoModal.classList.add("hidden");
    }
  });
});
