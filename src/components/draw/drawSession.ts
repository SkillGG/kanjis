export type SessionResult = {
  kanji: string;
  word: string;
  result: number;
  notAnswered?: true;
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
