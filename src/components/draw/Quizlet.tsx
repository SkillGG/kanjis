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
import { usePopup } from "../usePopup";

export const Quizlet = ({
  session,
  commitResult,
}: {
  session: DrawSessionData;
  commitResult: (result: SessionResult) => Promise<DrawSessionData>;
}) => {
  const LS = useLocalStorage();
  const { Popup, setPopup } = usePopup();

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
      const newWG = nextWordGenerator(session, LS);
      setWordGenerator(newWG);
      const firstWord = await newWG.next();
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
      <Popup />
      <KanjiCard
        classNames={{ text: "text-4xl", border: "text-2xl" }}
        commit={async (result) => {
          const newSession = await commitResult(result);

          const allWords = await LS.idb?.getAllFromIndex(
            "wordbank",
            "kanji",
            result.kanji,
          );

          const allWPoints = allWords?.map((word) => {
            return newSession.sessionResults
              .filter((r) => r.word === word.word)
              .reduce((p, n) => p + n.result, 0);
          });

          console.log(allWPoints);

          await nextWord(newSession);
        }}
        word={toRQW(currentWord, {
          full: {
            ruby: {
              fontFamily: myFont.style.fontFamily,
              fontSize: "10rem",
              lineHeight: "1.25em",
              "--color": "green",
            },
          },
          hint: {
            ruby: {
              lineHeight: "1.25em",
              fontSize: "10rem",
            },
          },
        })}
      />
    </>
  );
};
