import { useCallback, useEffect, useState } from "react";
import { type SessionResult, type DrawSessionData } from "./drawSession";
import {
  type NextWordGenerator,
  nextWordGenerator,
  toRQW,
  type QuizWord,
} from "./quizWords";
import { KanjiCard } from "./kanjiCard";
import { useLocalStorage } from "../localStorageProvider";
import { myFont } from "@/pages/_app";

export const Quizlet = ({
  session,
  commitResult,
}: {
  session: DrawSessionData;
  commitResult: (result: SessionResult) => Promise<DrawSessionData>;
}) => {
  const LS = useLocalStorage();

  const [wordGenerator, setWordGenerator] = useState<NextWordGenerator | null>(
    null,
  );
  const [currentWord, setCurrentWord] = useState<QuizWord | null>(null);

  const [error, setError] = useState<React.ReactNode | null>(null);

  const nextWord = useCallback(
    async (sessionData: DrawSessionData) => {
      if (!wordGenerator) return;
      const nextWord = (await wordGenerator.next(sessionData)).value;
      if ("err" in nextWord) {
        setError(nextWord.err);
      } else {
        setCurrentWord(nextWord);
      }
    },
    [wordGenerator],
  );

  useEffect(() => {
    void (async () => {
      if (!LS.idb || !session) return;
      console.log("getting a new word!");
      const newWG = nextWordGenerator(session, LS);
      setWordGenerator(newWG);
      const firstWord = await newWG.next();
      console.log("fw", firstWord);
      if (firstWord.done) {
        setError(firstWord.value.err);
        return;
      }
      if ("err" in firstWord.value) {
        setError(firstWord.value.err);
      } else {
        setCurrentWord(firstWord.value);
      }
    })();
  }, [LS, session]);

  if (currentWord === null) {
    return <>{error ? error : "Loading..."}</>;
  }

  return (
    <>
      <span>
        Cur points:{" "}
        {session.sessionResults
          .filter((f) => f.kanji === currentWord.kanji)
          .reduce((p, n) => p + n.result, 0)}
      </span>
      <KanjiCard
        classNames={{ text: "text-4xl", border: "text-2xl" }}
        commit={async (result) => {
          const newSession = await commitResult(result);
          await nextWord(newSession);
        }}
        word={toRQW(currentWord, {
          full: {
            ruby: {
              fontFamily: myFont.style.fontFamily,
              fontSize: "10rem",
              "--color": "green",
            },
          },
          hint: {
            ruby: {
              fontSize: "10rem",
            },
          },
        })}
      />
    </>
  );
};
