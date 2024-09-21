import { type DrawSessionData } from "@/components/draw/drawSession";
import { type KanjiCardSide } from "@/components/draw/kanjiCard";
import { DEFAULT_POINTS_TO_COMPLETE, Quizlet } from "@/components/draw/Quizlet";
import {
  getAllWordsWithKanji,
  getWordPoints,
  isKanjiCompleted,
  type QuizWord,
} from "@/components/draw/quizWords";
import { KanjiTile } from "@/components/list/kanjiTile";
import { useLocalStorage } from "@/components/localStorageProvider";
import { usePopup } from "@/components/usePopup";
import { noop } from "@/utils/utils";
import Link from "next/link";
import Router, { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function DrawSession() {
  const router = useRouter();

  const LS = useLocalStorage();

  const { id } = router.query;

  const { popup, setPopup } = usePopup();

  const [sessionData, setSessionData] = useState<DrawSessionData | null>(null);

  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [words, setWords] = useState<QuizWord[] | null>(null);

  useEffect(() => {
    void (async () => {
      if (!LS.idb || words) return;
      setWords(await LS.idb.getAll("wordbank"));
    })();
  }, [LS, words]);

  useEffect(() => {
    void (async () => {
      if (id === undefined || !LS.idb) return;
      if (typeof id !== "string") {
        setLoadingError("Wrong session id!");
        return;
      }
      const sD = await LS.idb.get("draw", id);
      if (!sD)
        return setLoadingError(
          `Could not load session data for session "${id}"`,
        );
      setSessionData(sD);
    })();
  }, [LS, id]);

  const [canClose, setCanClose] = useState(false);

  const [showCanClose, setShowCanClose] = useState(true);

  useEffect(() => {
    if (!sessionData) return;
    if (!words) return;
    for (const kanji of sessionData.sessionKanjis) {
      if (!words.find((w) => w.kanji === kanji)) {
        setSessionData((prev) =>
          prev
            ? {
                ...prev,
                sessionResults: [
                  ...prev?.sessionResults,
                  { kanji: kanji, result: 0, word: "", completed: true },
                ],
              }
            : prev,
        );
      }
    }
  }, [sessionData, words]);

  useEffect(() => {
    if (sessionData) {
      // check if all results are completed
      const allCompleted = sessionData.sessionKanjis.reduce(
        (p, k) => (!p ? p : isKanjiCompleted(sessionData, k)),
        true,
      );

      if (allCompleted) {
        setCanClose(true);
      } else {
        setShowCanClose(false);
      }
    }
  }, [sessionData]);

  const [side, setSide] = useState<KanjiCardSide>("quiz");

  if (!sessionData && !loadingError) {
    return <>Loading...</>;
  }

  if (loadingError) {
    return (
      <span>
        There has been an error loading session data!
        <br />
        {loadingError}
      </span>
    );
  }

  if (!sessionData) {
    return (
      <span>Session data is corrupted! Try again or start a new session!</span>
    );
  }

  if (!sessionData.open) {
    return <span>This session has already been closed!</span>;
  }

  return (
    <>
      <Link
        href="/draw"
        className="block w-fit bg-transparent p-2 underline sm:fixed"
      >
        Go back
      </Link>
      <div className="w-full lg:mx-[auto] lg:w-[80vw]">
        <div className="text-center text-lg">
          {sessionData.sessionID}(
          {sessionData.pointsToComplete ?? DEFAULT_POINTS_TO_COMPLETE})
          {canClose && showCanClose && (
            <div>
              <button
                onClick={async () => {
                  if (!LS?.idb) throw new Error("No database connection!");
                  const newSession = { ...sessionData, open: false };
                  await LS.idb.put("draw", newSession);
                  setSessionData((p) => (p ? newSession : p));
                  await Router.push("/draw");
                }}
              >
                Close session
              </button>
            </div>
          )}
        </div>
        {popup}
        <Quizlet
          onSideChanged={setSide}
          session={sessionData}
          commitResult={async (result) => {
            if (!LS?.idb) throw new Error("No database connection!");
            if (!sessionData) throw new Error("Session Data not found!");
            const newSession: DrawSessionData = sessionData
              ? {
                  ...sessionData,
                  sessionResults: [...sessionData?.sessionResults, result],
                }
              : sessionData;
            await LS.idb.put("draw", newSession);
            setSessionData(() => newSession);

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

            const PTC =
              newSession.pointsToComplete ?? DEFAULT_POINTS_TO_COMPLETE;

            if (
              !isKanjiCompleted(newSession, result.kanji) &&
              allWPoints?.reduce((p, n) => (!p ? p : n > PTC), true)
            ) {
              setPopup({
                modal: true,
                text: (close) => (
                  <div className="text-center text-xl">
                    You got more than {PTC} on every word with {result.kanji}
                    <br />
                    <button
                      onClick={async () => {
                        close();
                        const sessionWithCompleted: DrawSessionData = {
                          ...newSession,
                          sessionResults: [
                            ...newSession.sessionResults,
                            { ...result, result: 0, completed: true },
                          ],
                        };

                        await LS.idb?.put("draw", sessionWithCompleted);
                        setSessionData(sessionWithCompleted);
                      }}
                    >
                      Mark as completed
                    </button>
                  </div>
                ),
                time: 6000,
                borderColor: "green",
              });
            }
            if (
              newSession.sessionKanjis.reduce(
                (p, k) => (!p ? p : isKanjiCompleted(newSession, k)),
                true,
              )
            ) {
              // every kanji is done
              setPopup({
                modal: true,
                onCancel: () => {
                  // canceled
                },
                text: (close) => (
                  <div className="flex text-center text-xl">
                    You&quot;ve done everything!
                    <br />
                    <button
                      onClick={async () => {
                        if (!LS?.idb)
                          throw new Error("No database connection!");
                        const newSession = { ...sessionData, open: false };
                        await LS.idb.put("draw", newSession);
                        setSessionData((p) => (p ? newSession : p));
                        close();
                      }}
                    >
                      Close the session!
                    </button>
                    <br />
                    <button
                      onClick={async () => {
                        setShowCanClose(true);
                        close(true);
                      }}
                    >
                      Keep going
                    </button>
                  </div>
                ),
                time: "user",
                borderColor: "green",
                modalStyle: {
                  styles: {
                    "--offsetFromCenter": "50%",
                    "--backdrop": "#ffffff33",
                  },
                },
              });
            }

            return newSession;
          }}
        />
        {side === "answer" && (
          <div className="mx-auto mt-3 flex flex-wrap justify-center text-center sm:max-w-[50%]">
            {words &&
              sessionData.sessionKanjis.map((kanji) => {
                if (isKanjiCompleted(sessionData, kanji)) {
                  return (
                    <div key={kanji}>
                      <KanjiTile
                        badges={3}
                        kanji={{
                          kanji,
                          index: 0,
                          lvl: 0,
                          status: "new",
                          type: "base",
                        }}
                        update={noop}
                        disabled
                        lvlBadge=""
                        extraBadge="DONE"
                      />
                    </div>
                  );
                }
                const points = getAllWordsWithKanji(words, kanji);
                const PTC =
                  sessionData.pointsToComplete ?? DEFAULT_POINTS_TO_COMPLETE;
                return (
                  <div key={kanji}>
                    <KanjiTile
                      badges={0}
                      className="w-fit p-[0.6rem] before:text-[0.7rem]"
                      kanji={{
                        kanji,
                        index: 0,
                        lvl: 0,
                        status: "new",
                        type: "base",
                      }}
                      update={noop}
                      lvlBadge={`${points.reduce(
                        (p, w) =>
                          p +
                          (getWordPoints(sessionData, w.word, kanji) > PTC
                            ? 1
                            : 0),
                        0,
                      )}/${points.length}`}
                      extraBadge=""
                    />
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </>
  );
}
