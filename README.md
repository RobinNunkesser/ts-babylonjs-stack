# ts-stack-babylonjs

> **Stack 3D — Minimal Mechanics, Rich Visuals**  
> Entwickelt für das Lehrgebiet Interaktive Grafikanwendungen (IGA) zur didaktischen Demonstration, wie eine minimale mathematische Spielmechanik durch moderne 3D-Engines (Babylon.js) in ein visuell faszinierendes Spiel verwandelt wird.  
>  
> 🌐 **Live Demo (GitHub Pages)**: [https://robinnunkesser.github.io/ts-stack-babylonjs/](https://robinnunkesser.github.io/ts-stack-babylonjs/)

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

2. **Die babylonische „Täuschung“ (Rich 3D Visuals):**
   - **PBR-Materialien & Schlagschatten**: Babylon.js `ShadowGenerator` mit `BlurExponentialShadowMap` wirft dramatische Eigenschatten auf jede tiefere Turmstufe.
   - **Prozedurales Farb-Changiieren**: Schichten wandern harmonisch im HSL-Farbraum (u. a. HSHL Campus CI Blau & Gelb).
   - **Physikalische Trümmer**: Abgetrennte Reste erhalten einen Fall- und Drehmomentimpuls.
   - **Sanft gedämpfte Kamera**: Kamera gleitet per Interpolation mit dem Turm in den Himmel.
   - **Web Audio Pentatonik-Synthesizer**: Fehlerfreies Stapeln erzeugt aufsteigende Tonleitern und Dopamin.

---

## 🛠️ Architektur

```
ts-stack-babylonjs/
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
