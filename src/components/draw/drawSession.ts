export type SessionResult = {
  kanji: string;
  word: string;
  result: number;
  completed?: true;
};

export type DrawSessionData = {
  sessionID: string;
  sessionKanjis: string[];
  sessionResults: SessionResult[];
  sessionWordTags?: string[];
  open: boolean;
  pointsToComplete?: number;
};
