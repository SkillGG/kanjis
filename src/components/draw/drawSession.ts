export type SessionResult = {
  kanji: string;
  result: number;
};

export type DrawSessionData = {
  sessionID: string;
  sessionKanjis: string[];
  sessionResults: SessionResult[];
  open: boolean;
};
