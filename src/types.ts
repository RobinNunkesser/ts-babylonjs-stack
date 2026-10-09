export type GameState = "READY" | "PLAYING" | "GAMEOVER";

export type Axis = "x" | "z";

export interface ColorTheme {
  id: string;
  name: string;
  getBaseColor: (index: number) => { r: number; g: number; b: number };
}

export interface BlockSliceResult {
  isPerfect: boolean;
  isGameOver: boolean;
  overlapSize: number;
  overlapCenter: number;
  cutSize: number;
  cutCenter: number;
}
