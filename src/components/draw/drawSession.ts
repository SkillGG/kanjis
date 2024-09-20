export type SessionResult = {
  kanji: string;
  word: string;
  result: number;
};

export type DrawSessionData = {
  sessionID: string;
  sessionKanjis: string[];
  sessionResults: SessionResult[];
  open: boolean;
  pointsToComplete?: number;
};
