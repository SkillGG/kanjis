"use client";

import { type DrawSessionData } from "@/components/draw/drawSession";
import { type QuizWord } from "@/components/draw/quizWords";
import { getMergedKanjis } from "@/components/list/kanjiStorage";
import { type Kanji, useKanjiStore } from "@/components/list/kanjiStore";
import { KanjiTile } from "@/components/list/kanjiTile";
import { LS_KEYS, useLocalStorage } from "@/components/localStorageProvider";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

const MIN_SESSION_SIZE = 5;
const MIN_WORD_SIZE = 10;

export default function Draw() {
  const LS = useLocalStorage();

  const router = useRouter();

  const { kanjis, mutateKanjis } = useKanjiStore();

  const [selectedKanjis, setSelectedKanjis] = useState<string[]>([]);

  const [rowCount, setRowCount] = useState<number | null>(null);

  const [showFilter, setShowFilter] = useState<string>("");

  const [learningKanjis, setLearningKanjis] = useState<Kanji[]>([]);
  const [completedKanjis, setCompletedKanjis] = useState<Kanji[]>([]);
  const [newKanjis, setNewKanjis] = useState<Kanji[]>([]);

  const [sessionName, setSessionName] = useState<string>("");

  const [sessionCreationError, setSessionCreationError] = useState<{
    reason: "name" | "kanjiNum" | "wordNum";
    el: React.ReactNode;
  } | null>(null);

  const [sesssions, setSessions] = useState<DrawSessionData[]>([]);

  const [wWidth, setWWidth] = useState<number | null>(null);

  const [words, setWords] = useState<QuizWord[]>([]);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    void (async () => {
      if (!LS.idb) return;
      const dbKanjis = await getMergedKanjis(LS, [], "m");
      mutateKanjis(() => dbKanjis.kanji);
    })();
  }, [LS, mutateKanjis]);

  useEffect(() => {
    if (rowCount === null) {
      setRowCount(LS.getNum(LS_KEYS.row_count + "_draw") ?? 8);
    } else {
      LS.set(LS_KEYS.row_count + "_draw", rowCount);
    }
  }, [LS, rowCount]);

  useEffect(() => {
    void (async () => {
      if (!LS?.idb) return;
      const learning = await LS.idb.getAllFromIndex(
        "kanji",
        "status",
        "learning",
      );
      setLearningKanjis(learning);

      const completed = await LS.idb.getAllFromIndex(
        "kanji",
        "status",
        "completed",
      );
      setCompletedKanjis(completed);

      const newKs = await LS.idb.getAllFromIndex("kanji", "status", "new");
      setNewKanjis(newKs);

      const prevSessionIndex = await LS.idb.count("draw");
      if (!sessionName) setSessionName(`Session ${prevSessionIndex + 1}`);

      const openSessions = await LS.idb.getAll("draw");
      setSessions(() => openSessions.filter((s) => s.open));

      setWords(await LS.idb.getAll("wordbank"));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [LS]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", () => {
        setWWidth(window.innerWidth);
      });
      setWWidth(window.innerWidth);
    }
  }, []);

  useEffect(() => {
    setSessionCreationError(null);
  }, [selectedKanjis]);

  const headerDiv = useRef<HTMLDivElement>(null);
  const nameDiv = useRef<HTMLDivElement>(null);
  const dashboardLinkRef = useRef<HTMLAnchorElement>(null);

  if (!kanjis || rowCount === null) {
    return <>Loading</>;
  }

  return (
    <>
      <Link
        href="/"
        ref={dashboardLinkRef}
        className="block w-fit bg-transparent p-2 underline sm:fixed"
      >
        Go back
      </Link>
      <div className="mx-[auto] flex flex-col items-center gap-2 text-center">
        <div className="pt-2 text-xl" ref={headerDiv}>
          {sesssions.length > 0 && (
            <>
              <button
                onClick={() => {
                  dialogRef.current?.showModal();
                }}
                className="border-none text-[lime] underline hover:text-[#383]"
              >
                Browse open sessions
              </button>
              <dialog
                ref={dialogRef}
                onPointerDown={(event) => {
                  const dialog = dialogRef.current;
                  if (!dialog) return;
                  const rect = dialog.getBoundingClientRect();
                  const isInDialog =
                    rect.top <= event.clientY &&
                    event.clientY <= rect.top + rect.height &&
                    rect.left <= event.clientX &&
                    event.clientX <= rect.left + rect.width;
                  if (!isInDialog) {
                    dialogRef.current?.close();
                  }
                }}
                className="min-h-[15%] min-w-[25%] rounded-xl border-2 border-[white] p-4 backdrop:bg-slate-900 backdrop:opacity-70"
              >
                <div>Currently open sessions:</div>
                <div>
                  {sesssions.map((s) => (
                    <div
                      key={s.sessionID}
                      className="grid grid-cols-[5fr_1fr] border-y-2 border-slate-600"
                      style={{ gridTemplateAreas: `"p a""p b"` }}
                    >
                      <div
                        title={"Kanji:\n" + s.sessionKanjis.join("")}
                        className="w-full cursor-default select-none rounded-none border-none hover:bg-slate-300 hover:text-black"
                        style={{ gridArea: "p" }}
                      >
                        {s.sessionID}
                        <br />
                        {s.sessionKanjis.length === 0
                          ? "No kanji selected"
                          : s.sessionKanjis.join("").substring(0, 20)}
                        ...
                      </div>
                      <button
                        style={{ gridArea: "a" }}
                        className="rounded-none border-x-0 border-b-2 border-t-0 border-slate-600 hover:bg-slate-300"
                        onClick={() => {
                          void router.replace(`/draw/session/${s.sessionID}`);
                        }}
                      >
                        LOAD
                      </button>
                      <button
                        style={{ gridArea: "b" }}
                        className="rounded-none border-none hover:bg-slate-300"
                        onClick={() => {
                          dialogRef.current?.close();
                          setSelectedKanjis(s.sessionKanjis);
                          setSessionName(`${s.sessionID} (1)`);
                        }}
                      >
                        COPY
                      </button>
                    </div>
                  ))}
                </div>
              </dialog>{" "}
              or{" "}
            </>
          )}
          <span>{sesssions.length === 0 ? "C" : "c"}reate a new session</span>
        </div>
        <div ref={nameDiv} className="flex flex-wrap gap-x-1">
          <div className="relative flex min-h-[2.5rem] underline after:absolute after:left-[calc(50%_-_21px)] after:top-[-5px] after:content-['Points']">
            <input
              className="w-[4rem] border-green-400 text-center text-[1rem] outline-none"
              type="number"
              maxLength={4}
              minLength={1}
              min={10}
            />
          </div>
          <div className="flex">
            <input
              placeholder="sName"
              className="text-center text-[1rem] outline-none"
              style={{
                ...(sessionCreationError?.reason === "name"
                  ? { borderColor: "red" }
                  : {}),
              }}
              value={sessionName}
              onChange={(e) => {
                setSessionCreationError(null);
                setSessionName(e.target.value);
              }}
            />
            <button
              onClick={async () => {
                if (!sessionName) {
                  return setSessionCreationError({
                    reason: "name",
                    el: "Cannot create a session without a name!",
                  });
                }
                if (!/^[a-z0-9_\- ]+$/i.exec(sessionName))
                  return setSessionCreationError({
                    reason: "name",
                    el: (
                      <>
                        You can only use &quot;<code>A-Z0-9_- </code>&quot; in
                        your session name!
                      </>
                    ),
                  });
                if (!LS.idb) return;

                if ((await LS.idb.count("draw", sessionName)) > 0) {
                  return setSessionCreationError({
                    reason: "name",
                    el: `Session with that name already exists!`,
                  });
                }

                if (selectedKanjis.length <= MIN_SESSION_SIZE) {
                  return setSessionCreationError({
                    reason: "kanjiNum",
                    el: `Cannot create a session with less than ${MIN_SESSION_SIZE}
                    kanjis!`,
                  });
                }
                if (
                  words.filter((f) => selectedKanjis.includes(f.kanji)).length <
                  MIN_WORD_SIZE
                ) {
                  return setSessionCreationError({
                    reason: "wordNum",
                    el: (
                      <>
                        Cannot create a session with less than {MIN_WORD_SIZE}{" "}
                        words!
                        <br />
                        <Link href="/wordbank" className="underline">
                          Go to wordbank if you need to add more!
                        </Link>
                      </>
                    ),
                  });
                }
                const sessionData = {
                  sessionID: sessionName,
                  sessionKanjis: selectedKanjis,
                  sessionResults: [],
                  open: true,
                };
                await LS.idb.put("draw", sessionData);
                void router.replace(`/draw/session/${sessionData.sessionID}`);
              }}
              className="ml-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] hover:bg-slate-500"
            >
              Start new session
            </button>
          </div>

          <div className="text-[0.9rem] text-[red]">
            {sessionCreationError?.el}
          </div>
        </div>
        <div
          className="grid min-h-64 overflow-hidden"
          style={{ gridAutoRows: "min-content" }}
        >
          <div
            className="flex h-full max-h-[--maxh] flex-col sm:max-h-[--maxhsm]"
            style={{
              "--maxh": `calc(100vh - ${
                (headerDiv.current?.offsetHeight ?? 0) +
                (nameDiv.current?.offsetHeight ?? 0) +
                (dashboardLinkRef.current?.offsetHeight ?? 0)
              }px - 1.0rem)`,
              "--maxhsm": `calc(100vh - ${
                (headerDiv.current?.offsetHeight ?? 0) +
                (nameDiv.current?.offsetHeight ?? 0)
              }px - 1.0rem)`,
            }}
          >
            <div
              className={`grid h-full max-h-full grid-flow-row overflow-y-auto`}
            >
              <div
                className="mb-2 flex max-w-[--maxw] select-none flex-wrap justify-around gap-x-2 gap-y-2 justify-self-center"
                style={{
                  "--maxw": `${Math.min(wWidth ?? Infinity, (rowCount ?? 8) * 55)}px`,
                }}
              >
                <div className="flex flex-col justify-center text-center">
                  Row count
                  <div>
                    <button
                      onClick={() => {
                        setRowCount((p) => (p ?? 8) + 1);
                      }}
                    >
                      +
                    </button>{" "}
                    {rowCount ?? 8}{" "}
                    <button
                      onClick={() => {
                        setRowCount((p) => {
                          if (!p || p <= 1) return p;
                          return p - 1;
                        });
                      }}
                    >
                      -
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedKanjis((prev) => {
                      if (
                        kanjis.reduce(
                          (p, n) => (!p ? p : prev.includes(n.kanji)),
                          true,
                        )
                      ) {
                        return prev.filter(
                          (f) => !kanjis.find((k) => k.kanji === f),
                        );
                      }
                      return [
                        ...new Set([
                          ...prev,
                          ...(kanjis.map((k) => k.kanji) ?? []),
                        ]),
                      ];
                    });
                  }}
                  className={`block ${
                    kanjis.reduce(
                      (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                      true,
                    )
                      ? "border-[1px] border-solid border-green-800 bg-[#282]"
                      : ""
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => {
                    setSelectedKanjis((prev) => {
                      const lv1 = kanjis.filter((f) => f.lvl === 1);
                      if (
                        lv1.reduce(
                          (p, n) => (!p ? p : prev.includes(n.kanji)),
                          true,
                        )
                      ) {
                        return prev.filter(
                          (f) => !lv1.find((k) => k.kanji === f),
                        );
                      }
                      return [
                        ...new Set([
                          ...prev,
                          ...(lv1.map((k) => k.kanji) ?? []),
                        ]),
                      ];
                    });
                  }}
                  className={`block ${
                    kanjis
                      .filter((f) => f.lvl === 1)
                      .reduce(
                        (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                        true,
                      )
                      ? "border-[1px] border-solid border-green-800 bg-[#282]"
                      : ""
                  }`}
                >
                  LVL1
                </button>
                <button
                  onClick={() => {
                    setSelectedKanjis((prev) => {
                      const lv2 = kanjis.filter((f) => f.lvl === 2);
                      if (
                        lv2.reduce(
                          (p, n) => (!p ? p : prev.includes(n.kanji)),
                          true,
                        )
                      ) {
                        return prev.filter(
                          (f) => !lv2.find((k) => k.kanji === f),
                        );
                      }
                      return [
                        ...new Set([
                          ...prev,
                          ...(lv2.map((k) => k.kanji) ?? []),
                        ]),
                      ];
                    });
                  }}
                  className={`${
                    kanjis
                      .filter((f) => f.lvl === 2)
                      .reduce(
                        (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                        true,
                      )
                      ? "border-[1px] border-solid border-green-800 bg-[#282]"
                      : ""
                  }`}
                >
                  LVL2
                </button>
                <button
                  onClick={() => {
                    setSelectedKanjis((prev) => {
                      const base = kanjis.filter((f) => f.type === "base");
                      if (
                        base.reduce(
                          (p, n) => (!p ? p : prev.includes(n.kanji)),
                          true,
                        )
                      ) {
                        return prev.filter(
                          (f) => !base.find((k) => k.kanji === f),
                        );
                      }
                      return [
                        ...new Set([
                          ...prev,
                          ...(base.map((k) => k.kanji) ?? []),
                        ]),
                      ];
                    });
                  }}
                  className={`block ${
                    kanjis
                      .filter((f) => f.type === "base")
                      .reduce(
                        (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                        true,
                      )
                      ? "border-[1px] border-solid border-green-800 bg-[#282]"
                      : ""
                  }`}
                >
                  BASE
                </button>
                <button
                  onClick={() => {
                    setSelectedKanjis((prev) => {
                      const base = kanjis.filter((f) => f.type === "extra");
                      if (
                        base.reduce(
                          (p, n) => (!p ? p : prev.includes(n.kanji)),
                          true,
                        )
                      ) {
                        return prev.filter(
                          (f) => !base.find((k) => k.kanji === f),
                        );
                      }
                      return [
                        ...new Set([
                          ...prev,
                          ...(base.map((k) => k.kanji) ?? []),
                        ]),
                      ];
                    });
                  }}
                  className={`block ${
                    kanjis
                      .filter((f) => f.type === "extra")
                      .reduce(
                        (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                        true,
                      )
                      ? "border-[1px] border-solid border-green-800 bg-[#282]"
                      : ""
                  }`}
                >
                  EXTRAS
                </button>
                <button
                  onClick={() => {
                    setSelectedKanjis((prev) => {
                      if (
                        newKanjis.reduce(
                          (p, n) => (!p ? p : prev.includes(n.kanji)),
                          true,
                        )
                      ) {
                        return prev.filter(
                          (f) => !newKanjis.find((k) => k.kanji === f),
                        );
                      }
                      return [
                        ...new Set([
                          ...prev,
                          ...(newKanjis.map((k) => k.kanji) ?? []),
                        ]),
                      ];
                    });
                  }}
                  className={`block ${
                    newKanjis.reduce(
                      (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                      true,
                    )
                      ? "border-[1px] border-solid border-green-800 bg-[#282]"
                      : ""
                  }`}
                >
                  NEW
                </button>
                <button
                  onClick={() => {
                    setSelectedKanjis((prev) => {
                      if (
                        learningKanjis.reduce(
                          (p, n) => (!p ? p : prev.includes(n.kanji)),
                          true,
                        )
                      ) {
                        return prev.filter(
                          (f) => !learningKanjis.find((k) => k.kanji === f),
                        );
                      }
                      return [
                        ...new Set([
                          ...prev,
                          ...(learningKanjis.map((k) => k.kanji) ?? []),
                        ]),
                      ];
                    });
                  }}
                  data-full={learningKanjis.reduce(
                    (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                    true,
                  )}
                  className={`block ${
                    learningKanjis.reduce(
                      (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                      true,
                    )
                      ? "border-[1px] border-solid border-green-800 bg-[#282]"
                      : ""
                  }`}
                >
                  LEARNING
                </button>
                <button
                  onClick={() => {
                    setSelectedKanjis((prev) => {
                      if (
                        completedKanjis.reduce(
                          (p, n) => (!p ? p : prev.includes(n.kanji)),
                          true,
                        )
                      ) {
                        return prev.filter(
                          (f) => !completedKanjis.find((k) => k.kanji === f),
                        );
                      }
                      return [
                        ...new Set([
                          ...prev,
                          ...(completedKanjis.map((k) => k.kanji) ?? []),
                        ]),
                      ];
                    });
                  }}
                  className={`block ${
                    completedKanjis.reduce(
                      (p, n) => (!p ? p : selectedKanjis.includes(n.kanji)),
                      true,
                    )
                      ? "border-[1px] border-solid border-green-800 bg-[#282]"
                      : ""
                  }`}
                >
                  COMPLETED
                </button>
                <label className="block">
                  FIND:
                  <input
                    value={showFilter}
                    onInput={(e) => {
                      setShowFilter(e.currentTarget.value);
                    }}
                    className="inline-block w-32 border-b-2 text-base outline-none focus:border-b-4"
                    placeholder="漢字"
                  />
                  <button onClick={() => setShowFilter("")}>CLEAR</button>
                </label>
                <div>
                  <div
                    style={{
                      ...(sessionCreationError?.reason === "kanjiNum"
                        ? { color: "red" }
                        : {}),
                    }}
                  >
                    kanji: ({selectedKanjis.length}/{kanjis.length})
                  </div>
                  <div
                    style={{
                      ...(sessionCreationError?.reason === "wordNum"
                        ? { color: "red" }
                        : {}),
                    }}
                  >
                    words: (
                    {
                      words.filter((f) => selectedKanjis.includes(f.kanji))
                        .length
                    }
                    /{words.length})
                  </div>
                </div>
              </div>
              <div
                className="z-20 grid w-fit gap-1 justify-self-center overflow-auto pt-3"
                style={{
                  gridTemplateColumns: "1fr ".repeat(rowCount ?? 8),
                }}
              >
                {kanjis
                  ?.filter((f) =>
                    showFilter ? showFilter.includes(f.kanji) : true,
                  )
                  .map((kanji) => {
                    const on = selectedKanjis.includes(kanji.kanji);
                    return (
                      <KanjiTile
                        badges={0}
                        kanji={{
                          ...kanji,
                          status: on ? "completed" : "new",
                        }}
                        style={{
                          "--border": on ? "green" : "red",
                        }}
                        extraBadge={`${words.filter((f) => f.kanji === kanji.kanji).length}`}
                        className="hover:z-10"
                        key={kanji.kanji}
                        update={() => {
                          setSelectedKanjis((prev) =>
                            prev.includes(kanji.kanji)
                              ? prev.filter((k) => k !== kanji.kanji)
                              : [...prev, kanji.kanji],
                          );
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
