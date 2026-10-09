import { ColorTheme } from "./types";

// Helper: HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) {
    r = c; g = x; b = 0;
  } else if (h < 120) {
    r = x; g = c; b = 0;
  } else if (h < 180) {
    r = 0; g = c; b = x;
  } else if (h < 240) {
    r = 0; g = x; b = c;
  } else if (h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return { r: r + m, g: g + m, b: b + m };
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "hshl",
    name: "HSHL Campus CI (Blau & Gelb)",
    getBaseColor: (index: number) => {
      // Wandert von HSHL-Blau (ca. 198 Grad) über Cyan zu HSHL-Gelb (ca. 48 Grad)
      const hue = (198 - index * 6) % 360;
      return hslToRgb(hue, 0.85, 0.55);
    }
  },
  {
    id: "sunset",
    name: "Sunset Pastel (Lila & Gold)",
    getBaseColor: (index: number) => {
      const hue = (280 + index * 5) % 360;
      return hslToRgb(hue, 0.80, 0.58);
    }
  },
  {
    id: "cyberpunk",
    name: "Cyber Neon (Cyan & Pink)",
    getBaseColor: (index: number) => {
      const hue = (175 + index * 8) % 360;
      return hslToRgb(hue, 0.95, 0.52);
    }
  },
  {
    id: "emerald",
    name: "Emerald Forest (Grün & Türkis)",
    getBaseColor: (index: number) => {
      const hue = (140 + index * 5) % 360;
      return hslToRgb(hue, 0.75, 0.50);
    }
  }
];
