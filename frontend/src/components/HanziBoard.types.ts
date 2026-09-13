export type HanziMode = "demonstrate" | "trace" | "test";

export type HanziEvent =
  | { type: "ready" }
  | { type: "engineError" }
  | { type: "charError"; data: { char: string } }
  | { type: "modeReady"; data: { mode: HanziMode } }
  | { type: "strokeCorrect"; data: any }
  | { type: "strokeError"; data: any }
  | { type: "complete"; data: { character: string; totalMistakes: number } }
  | { type: string; data: any };

export type HanziBoardHandle = {
  speak: (char: string, lang: string) => void;
  replay: () => void;
  reset: () => void;
  celebrate: () => void;
};
