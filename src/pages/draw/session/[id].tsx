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
import { usePopup } from "@/components/usePopup";
import { useAppStore } from "@/appStore";
import { log, noop } from "@/utils/utils";
import Link from "next/link";
import Router, { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

export default function DrawSession() {
  const router = useRouter();

  const { id } = router.query;

  const { popup, setPopup } = usePopup();

  const [sessionData, setSessionData] = useState<DrawSessionData | null>(null);

  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [words, setWords] = useState<QuizWord[] | null>(null);

  const [disableAnswering, setDisableAnswering] = useState(false);

  const [autoComplete, setAutoComplete] = useAppStore((s) => [
    s.settings.autoMarkAsCompleted,
    (v: boolean) => s.setSettings("autoMarkAsCompleted", v),
  ]);

  const idb = useAppStore((s) => s.getIDB());

  useEffect(() => {
    void (async () => {
      if (words) return;
      setWords(await idb.getAll("wordbank"));
    })();
  }, [idb, words]);

  useEffect(() => {
    void (async () => {
      if (id === undefined) return;
      if (typeof id !== "string") {
        setLoadingError("Wrong session id!");
        return;
      }
      const sD = await idb.get("draw", id);
      if (!sD)
        return setLoadingError(
          `Could not load session data for session "${id}"`,
        );
      setSessionData(sD);
    })();
  }, [id, idb]);

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

  const askForEndingSession = useCallback(() => {
    if (!sessionData) return;
    setDisableAnswering(true);
    setPopup({
      modal: true,
      onCancel: () => {
        // canceled
        setDisableAnswering(false);
        setShowCanClose(true);
      },
      text: (close) => (
        <div className="flex flex-col text-center text-xl">
          You&apos;ve done everything!
          <br />
          <div className="flex gap-2 text-center">
            <button
              onClick={async () => {
                const newSession = { ...sessionData, open: false };
                await idb.put("draw", newSession);
                setSessionData((p) => (p ? newSession : p));
                close();
                await Router.replace("/draw");
              }}
            >
              Close the session!
            </button>
            <button
              onClick={async () => {
                setShowCanClose(true);
                close(true);
              }}
            >
              Keep going
            </button>
          </div>
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
  }, [idb, sessionData, setPopup]);

  useEffect(() => {
    if (sessionData) {
      // check if all results are completed
      const allCompleted = sessionData.sessionKanjis.reduce(
        (p, k) => (!p ? p : isKanjiCompleted(sessionData, k)),
        true,
      );

      if (allCompleted) {
        setCanClose(true);

        if (!showCanClose) {
          askForEndingSession();
        }
      } else {
        setShowCanClose(false);
      }
    }
  }, [askForEndingSession, sessionData, showCanClose]);

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

  log`${autoComplete}`;

  return (
    <>
      <Link
        href="/draw"
        className="block w-fit bg-transparent p-2 underline sm:fixed sm:left-0 sm:top-0"
      >
        Go back
      </Link>
      <div className="w-full lg:mx-[auto] lg:w-[80vw]">
        <div className="my-2 flex justify-center gap-2 text-center text-lg">
          {sessionData.sessionID}(
          {sessionData.pointsToComplete ?? DEFAULT_POINTS_TO_COMPLETE})
          {canClose && showCanClose && (
            <div className="mr-2 block">
              <button
                onClick={async () => {
                  const newSession = { ...sessionData, open: false };
                  await idb.put("draw", newSession);
                  setSessionData((p) => (p ? newSession : p));
                  await Router.push("/draw");
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
        {popup}
        <Quizlet
          disableAnswering={disableAnswering}
          onSideChanged={setSide}
          session={sessionData}
          commitResult={async (result) => {
            if (!sessionData) throw new Error("Session Data not found!");
            const newSession: DrawSessionData = sessionData
              ? {
                  ...sessionData,
                  sessionResults: [...sessionData?.sessionResults, result],
                }
              : sessionData;
            await idb.put("draw", newSession);
            setSessionData(() => newSession);

            const allWords = await idb?.getAllFromIndex(
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
              if (!autoComplete) {
                setDisableAnswering(true);
                setPopup({
                  modal: true,
                  onCancel: () => {
                    setDisableAnswering(false);
                  },
                  text: (close) => (
                    <div className="text-center text-xl">
                      You got more than {PTC} on every word with {result.kanji}
                      <br />
                      Mark kanji as completed (in this session)?
                      <br />
                      <div className="flex flex-row justify-center gap-2">
                        <button
                          onClick={async () => {
                            close(true);
                            const sessionWithCompleted: DrawSessionData = {
                              ...newSession,
                              sessionResults: [
                                ...newSession.sessionResults,
                                { ...result, result: 0, completed: true },
                              ],
                            };

                            await idb?.put("draw", sessionWithCompleted);
                            setSessionData(sessionWithCompleted);
                          }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={async () => {
                            const sessionWithCompleted: DrawSessionData = {
                              ...newSession,
                              sessionResults: [
                                ...newSession.sessionResults,
                                { ...result, result: 0, completed: true },
                              ],
                            };

                            await idb?.put("draw", sessionWithCompleted);
                            setSessionData(sessionWithCompleted);
                            setAutoComplete(true);
                            close(true);
                          }}
                        >
                          Yes, Don&apos;t ask anymore
                        </button>
                        <button
                          onClick={() => {
                            close(true);
                          }}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ),
                  time: "user",
                  borderColor: "green",
                });
              } else {
                const sessionWithCompleted: DrawSessionData = {
                  ...newSession,
                  sessionResults: [
                    ...newSession.sessionResults,
                    { ...result, result: 0, completed: true },
                  ],
                };

                await idb?.put("draw", sessionWithCompleted);
                setSessionData(sessionWithCompleted);
              }
            }
            if (
              newSession.sessionKanjis.reduce(
                (p, k) => (!p ? p : isKanjiCompleted(newSession, k)),
                true,
              )
            ) {
              // every kanji is done
              if (!showCanClose) {
                askForEndingSession();
              }
            }

            return newSession;
          }}
        />
        {side === "answer" && (
          <div className="mx-auto mt-3 flex flex-wrap justify-center gap-1 text-center sm:max-w-[50%]">
            {words &&
              sessionData.sessionKanjis.map((kanji) => {
                if (isKanjiCompleted(sessionData, kanji)) {
                  return (
                    <div key={kanji}>
                      <KanjiTile
                        badges={3}
                        style={{ border: "1px solid lime" }}
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
                        extraBadge=""
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
