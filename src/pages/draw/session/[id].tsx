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
import { dbPutMultiple, type Kanji, useAppStore } from "@/appStore";
import { log, noop } from "@/utils/utils";
import Link from "next/link";
import Router, { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import SettingBox from "@/components/settingBox";
import { getMergedKanjis } from "@/components/list/kanjiStorage";
import { useLocalStorage } from "@/components/localStorageProvider";

export default function DrawSession() {
  const router = useRouter();

  const LS = useLocalStorage();

  const { id } = router.query;

  const { popup, setPopup } = usePopup();

  const [sessionData, setSessionData] = useState<DrawSessionData | null>(null);

  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [words, setWords] = useState<QuizWord[] | null>(null);

  const [disableAnswering, setDisableAnswering] = useState(false);

  const setSettings = useAppStore((s) => s.setSettings);
  const mutateKanji = useAppStore((s) => s.mutateKanjis);

  const showSessionProgress = useAppStore(
    (s) => s.settings.showSessionProgress,
  );
  const autoComplete = useAppStore((s) => s.settings.autoMarkAsCompleted);
  const autoMarkAsCompletedOnClose = useAppStore(
    (s) => s.settings.markKanjiAsCompletedOnSessionClose,
  );

  const setAutoComplete = useCallback(
    (v: boolean) => setSettings("autoMarkAsCompleted", v),
    [setSettings],
  );
  const setAutoMarkAsCompletedOnClose = useCallback(
    (p: (b: boolean) => boolean) =>
      setSettings(
        "markKanjiAsCompletedOnSessionClose",
        p(autoMarkAsCompletedOnClose),
      ),
    [autoMarkAsCompletedOnClose, setSettings],
  );

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

  const closeTheSession = useCallback(async () => {
    if (!sessionData) return;
    const newSession = { ...sessionData, open: false };
    await idb.put("draw", newSession);
    setSessionData((p) => (p ? newSession : p));

    if (autoMarkAsCompletedOnClose) {
      // mark as compl. on close
      const listKanji = await idb.getAll("kanji");
      const sessionKanji = listKanji.filter((f) =>
        newSession.sessionKanjis.includes(f.kanji),
      );

      const completedKanjis = sessionKanji.map<Kanji>((k) => ({
        ...k,
        status: "completed",
      }));

      await dbPutMultiple(idb, "kanji", completedKanjis);

      const mergedKanji = await getMergedKanjis(LS, idb, completedKanjis, "m");

      mutateKanji(() => mergedKanji.kanji);
    }
    await Router.push("/draw");
  }, [LS, autoMarkAsCompletedOnClose, idb, mutateKanji, sessionData]);

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
        <div className="flex flex-col gap-2 text-center text-xl">
          You&apos;ve done everything!
          <br />
          <label>
            Mark kanjis as completed in the list{" "}
            <input
              type="checkbox"
              checked={autoMarkAsCompletedOnClose}
              onChange={() => setAutoMarkAsCompletedOnClose((p) => !p)}
            />
          </label>
          <button
            className="w-full py-2 hover:bg-[#fff2]"
            onClick={async () => {
              await closeTheSession();
            }}
          >
            End the session!
          </button>
          <button
            className="w-full py-2 hover:bg-[#fff2]"
            onClick={async () => {
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
  }, [
    autoMarkAsCompletedOnClose,
    closeTheSession,
    sessionData,
    setAutoMarkAsCompletedOnClose,
    setPopup,
  ]);

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
        shallow={false}
        className="block w-fit bg-transparent p-2 underline sm:fixed sm:left-0 sm:top-0"
      >
        Go back
      </Link>
      <div className="w-full lg:mx-[auto] lg:w-[80vw]">
        <div className="my-2 flex justify-center gap-2 text-center text-lg">
          {sessionData.sessionID}(
          {sessionData.pointsToComplete ?? DEFAULT_POINTS_TO_COMPLETE})
          {canClose && showCanClose && (
            <>
              <div className="mr-2 block">
                <button
                  onClick={async () => {
                    await closeTheSession();
                  }}
                >
                  End the session
                </button>
              </div>
            </>
          )}
          <div>
            <button
              onClick={async () => {
                setPopup({
                  modal: true,
                  modalStyle: {
                    styles: { "--backdrop": "#fff5" },
                  },
                  contentStyle: {
                    className: "px-8",
                  },
                  text(close) {
                    return (
                      <div className="text-center">
                        <SettingBox
                          name="Draw settings"
                          wordbank={false}
                          draw={true}
                          global={false}
                          list={false}
                        />
                        <button
                          onClick={() => {
                            close();
                          }}
                          className="absolute right-[2px] top-[5px] border-none text-[red]"
                        >
                          X
                        </button>
                      </div>
                    );
                  },
                  time: "user",
                });
              }}
            >
              Settings
            </button>
          </div>
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
        {showSessionProgress && side === "answer" && (
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
