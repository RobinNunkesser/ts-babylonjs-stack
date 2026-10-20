# ts-babylonjs-stack

> **Stack 3D — Minimal Mechanics, Rich Visuals**  
> Entwickelt für das Lehrgebiet Interaktive Grafikanwendungen (IGA) zur didaktischen Demonstration, wie eine minimale mathematische Spielmechanik durch moderne 3D-Engines (Babylon.js) in ein visuell faszinierendes Spiel verwandelt wird.  
>  
> 🌐 **Live Demo (GitHub Pages)**: [https://robinnunkesser.github.io/ts-babylonjs-stack/](https://robinnunkesser.github.io/ts-babylonjs-stack/)

---

## 🎯 Das didaktische Konzept

In der Lehre zu Computergrafik und Game Development wird hinter visuell beeindruckenden Titeln oft vermutet, dass komplexe Algorithmen, massive Physiksimulationen oder kilometerlanger Code erforderlich sind.

**Stack 3D** demonstriert das didaktische Gegenbeispiel:

1. **Die triviale 1D-Schnittmechanik (~20 Zeilen Code):**
   - Ein Quader gleitet auf einer Achse ($X$ oder $Z$).
   - Beim Klick wird lediglich die Differenz $\Delta = \text{position} - \text{vorherigePosition}$ auf dieser einen Achse berechnet.
   - Liegt $|\Delta| \le \text{Toleranz}$, rastet der Block exakt ein (*Perfekt-Bonus*).
   - Ist $|\Delta| \ge \text{Breite}$, stürzt der Block ab (*Game Over*).
   - Dazwischen: Neuer Block mit $\text{Breite} - |\Delta|$ und stürzender Rest mit $|\Delta|$.

2. **Die babylonische „Täuschung“ (Rich 3D Visuals & Juiciness):**
   - **PBR-Materialien & Schlagschatten**: Babylon.js `ShadowGenerator` mit `BlurExponentialShadowMap` wirft dramatische Eigenschatten auf jede tiefere Turmstufe.
   - **Squash & Stretch (Elastischer Wobble)**: Beim Aufsetzen federt der Block per gedämpfter Sinus-Schwingung elastisch ein.
   - **Kamera-Mikro-Shake**: Haptische Bildschirmerschütterungen bei Schnitten und Einsturz.
   - **Horizontale Schockwellen & Bokeh**: Expandierende Leuchtringe bei perfekten Treffern und schwebende Ambient Dust Motes im 3D-Raum.
   - **Volumetrischer Farbnebel**: Die Atmosphäre passt sich fließend den HSL-Farben der aktuellen Turmhöhe an (u. a. HSHL Campus CI Blau & Gelb).
   - **Web Audio mit Raum-Echo**: Harmonische Pentatonik mit Stereo-Feedback-Delay für kathedralenartigen Hall.

---

## 🛠️ Architektur

```
ts-babylonjs-stack/
├── index.html              # Modernes Glassmorphism-UI, Live-Score & Didaktik-Modal
├── src/
│   ├── audio.ts            # Prozeduraler Web-Audio Synthesizer (Pentatonik-Skala)
│   ├── colorTheme.ts       # Prozedurale Gradienten (HSHL CI, Sunset, Cyberpunk, Emerald)
│   ├── main.ts             # DOM Bindings, Touch & Keyboard Listener
│   ├── particles.ts        # Partikel-Auren bei perfekten Stacks
│   ├── stackGame.ts        # Babylon.js Scene, 1D-Schnittlogik, Schatten & Kamera
│   ├── style.css           # Responsives Designsystem (Outfit & Press Start 2P)
│   └── types.ts            # Typdefinitionen
├── package.json
└── tsconfig.json
```

---

## 🕹️ Steuerung

- **Desktop**: `Leertaste`, `Enter` oder `Mausklick`
- **Mobile**: Einfaches Antippen an beliebiger Stelle des Bildschirms (`touch-action: none`)
