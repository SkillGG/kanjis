"use client";

import { type DrawSessionData } from "@/components/draw/drawSession";
import { DEFAULT_POINTS_TO_COMPLETE } from "@/components/draw/Quizlet";
import { type QuizWord } from "@/components/draw/quizWords";
import { useLocalStorage } from "@/components/localStorageProvider";
import SettingBox from "@/components/settingBox";
import { usePopup } from "@/components/usePopup";
import { dbPutMultiple, type Kanji, useAppStore } from "@/appStore";
import Link from "next/link";
import Router, { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMergedKanjis } from "@/components/list/kanjiStorage";
import { useWindowSize } from "@/utils/useWindowSize";
import KanjiTile from "@/components/list/kanjiTile";
import { err } from "@/utils/utils";

const MIN_SESSION_SIZE = 5;
const MIN_WORD_SIZE = 10;

type KanjiSorting = {
  name: string;
  check: (kanjis: Kanji[], selected: string[]) => boolean;
  deselect: (kanjis: Kanji[], selected: string[]) => string[];
  select: (kanjis: Kanji[], selected: string[]) => string[];
};

type WordSorting = {
  name: string;
  check: (words: QuizWord[], selectedTags: string[]) => boolean;
  deselect: (words: QuizWord[], selectedTags: string[]) => string[];
  select: (words: QuizWord[], selectedTags: string[]) => string[];
};

export default function Draw() {
  const LS = useLocalStorage();

  const router = useRouter();

  useWindowSize();

  const { kanjis, idb, mutateKanji } = useAppStore((s) => ({
    kanjis: s.kanji,
    idb: s.getIDB(),
    mutateKanji: s.mutateKanjis,
  }));

  const markAsLearning = useAppStore(
    (s) => s.settings.markKanjisAsLearningOnSessionStart,
  );
  const [rowCount, setSettings] = useAppStore((s) => [
    s.settings.kanjiRowCount,
    s.setSettings,
  ]);

  const setRowCount = useCallback(
    (f: (p: number) => number) => setSettings("kanjiRowCount", f(rowCount)),
    [rowCount, setSettings],
  );

  const [selectedKanjis, setSelectedKanjis] = useState<string[]>([]);
  const [selectedWordTags, setSelectedWordTags] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState<string>("");
  const [sessionName, setSessionName] = useState<string>("");
  const [sessionCreationError, setSessionCreationError] = useState<{
    reason: "name" | "kanjiNum" | "wordNum";
    el: React.ReactNode;
  } | null>(null);
  const [sesssions, setSessions] = useState<DrawSessionData[]>([]);
  const [donePoints, setDonePoints] = useState<number | null>(null);

  const words = useAppStore((s) => s.words);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const { popup, setPopup } = usePopup();

  const allWordTags = useMemo(
    () => [...new Set(["UNTAGGED", ...words.map((m) => m.tags ?? []).flat()])],
    [words],
  );

  useEffect(() => {
    void (async () => {
      const prevSessionIndex = await idb.count("draw");
      if (!sessionName) setSessionName(`Session ${prevSessionIndex + 1}`);
    })();
  }, [idb, sessionName]);

  useEffect(() => {
    void (async () => {
      const openSessions = await idb.getAll("draw");
      setSessions(() => openSessions.filter((s) => s.open));
      setSelectedWordTags(allWordTags);
    })();
  }, [allWordTags, idb, words]);

  useEffect(() => {
    setSessionCreationError(null);
  }, [selectedKanjis, selectedWordTags]);

  const headerDiv = useRef<HTMLDivElement>(null);
  const nameDiv = useRef<HTMLDivElement>(null);
  const dashboardLinkRef = useRef<HTMLAnchorElement>(null);

  const selectedWords = useMemo(() => {
    return words.filter(
      (w) =>
        !!selectedWordTags.find((s) => w.tags?.includes(s)) ||
        (selectedWordTags.includes("UNTAGGED") &&
          (!w.tags || w.tags?.length === 0)),
    );
  }, [selectedWordTags, words]);

  const createNewSession = useCallback(async () => {
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
            You can only use &quot;<code>A-Z0-9_- </code>&quot; in your session
            name!
          </>
        ),
      });

    if ((await idb.count("draw", sessionName)) > 0) {
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
      selectedWords.filter((f) => selectedKanjis.includes(f.kanji)).length <
      MIN_WORD_SIZE
    ) {
      return setSessionCreationError({
        reason: "wordNum",
        el: (
          <>
            Cannot create a session with less than {MIN_WORD_SIZE} words!
            <br />
            <Link href="/wordbank" className="underline">
              Go to wordbank if you need to add more!
            </Link>
          </>
        ),
      });
    }
    const sessionData: DrawSessionData = {
      sessionID: sessionName,
      sessionKanjis: selectedKanjis.filter(
        (k) => !!words.find((w) => w.kanji === k),
      ),
      sessionResults: [],
      sessionWordTags: selectedWordTags,
      open: true,
      pointsToComplete: donePoints ?? undefined,
    };
    await idb.put("draw", sessionData);

    if (markAsLearning) {
      const kanjiToMarkAsLearning = kanjis?.filter(
        (k) => k.status === "new" && selectedKanjis.includes(k.kanji),
      );

      const newKanji = kanjiToMarkAsLearning.map<Kanji>((k) => ({
        ...k,
        status: "learning",
      }));

      await dbPutMultiple(idb, "kanji", newKanji);

      const newKanjiList = await getMergedKanjis(LS, idb, newKanji, "m");

      mutateKanji(() => newKanjiList.kanji);
    }

    await Router.replace(`/draw/session/${sessionData.sessionID}`);
  }, [
    LS,
    donePoints,
    idb,
    kanjis,
    markAsLearning,
    mutateKanji,
    selectedKanjis,
    selectedWordTags,
    selectedWords,
    sessionName,
    words,
  ]);

  const areWordsLoaded = useAppStore((s) => s.firstWordLoad);

  useEffect(() => {
    for (const kanji of selectedKanjis) {
      if (selectedWords.filter((f) => f.kanji === kanji).length <= 0) {
        setSelectedKanjis((p) => p.filter((k) => k !== kanji));
      }
    }
  }, [selectedKanjis, selectedWordTags, selectedWords]);

  if (!kanjis || rowCount === null) {
    return <>Loading</>;
  }

  const wordSortings: WordSorting[] = [
    ...[
      "UNTAGGED",
      ...[
        ...new Set<string>(words.map<string[]>((w) => w.tags ?? []).flat()),
      ].sort(),
    ].map<WordSorting>((tag) => ({
      name: tag.toUpperCase(),
      check(_w, selected) {
        return selected.includes(tag);
      },
      deselect(_w, s) {
        return s.filter((q) => q !== tag);
      },
      select(_w, s) {
        return [...s, tag];
      },
    })),
  ];

  const selectableKanji: Kanji[] = kanjis.filter((k) =>
    selectedWords.some((w) => w.kanji === k.kanji),
  );

  const kanjiSortings: KanjiSorting[] = [
    {
      name: "ALL",
      check(kanjis, selected) {
        return kanjis.every((k) => selected.includes(k.kanji));
      },
      deselect() {
        return [];
      },
      select(k) {
        return k.map((k) => k.kanji);
      },
    },
    ...[...new Set<string>(kanjis.map((k) => k.status))]
      .sort()
      .map<KanjiSorting>((status) => ({
        name: status.toUpperCase(),
        check(kanjis, selected) {
          return kanjis.reduce(
            (p, n) =>
              !p || n.status !== status ? p : selected.includes(n.kanji),
            true,
          );
        },
        deselect(k, s) {
          return s.filter(
            (q) => k.find((x) => x.kanji === q)?.status !== status,
          );
        },
        select(kanjis, selected) {
          return [
            ...selected,
            ...kanjis.filter((k) => k.status === status).map((k) => k.kanji),
          ];
        },
      })),
    ...[...new Set<string>(kanjis.map((k) => k.type))]
      .sort()
      .map<KanjiSorting>((type) => ({
        name: type.toUpperCase(),
        check(kanjis, selected) {
          return kanjis.reduce(
            (p, n) => (!p || n.type !== type ? p : selected.includes(n.kanji)),
            true,
          );
        },
        deselect(k, s) {
          return s.filter((q) => k.find((x) => x.kanji === q)?.type !== type);
        },
        select(kanjis, selected) {
          return [
            ...selected,
            ...kanjis.filter((k) => k.type === type).map((k) => k.kanji),
          ];
        },
      })),
    ...[...new Set<number>(kanjis.map((k) => k.lvl))].map<KanjiSorting>(
      (lvl) => ({
        name: `LVL${lvl}`,
        check(kanjis, selected) {
          return kanjis.reduce(
            (p, n) => (!p || n.lvl !== lvl ? p : selected.includes(n.kanji)),
            true,
          );
        },
        deselect(k, s) {
          return s.filter((q) => k.find((x) => x.kanji === q)?.lvl !== lvl);
        },
        select(kanjis, selected) {
          return [
            ...selected,
            ...kanjis.filter((k) => k.lvl === lvl).map((k) => k.kanji),
          ];
        },
      }),
    ),
  ];

  if (!areWordsLoaded) {
    return <>Loading...</>;
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
      {popup}
      <div className="mx-[auto] flex flex-col items-center gap-2 text-center">
        <div className="text-balance pt-2 text-xl" ref={headerDiv}>
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
                        <br />
                        <div className="bg-transparent text-center text-sm text-[inherit]">
                          {[...new Set(s.sessionWordTags)].join(", ")}
                        </div>
                      </div>
                      <button
                        style={{ gridArea: "a" }}
                        className="h-full rounded-none border-x-0 border-b-2 border-t-0 border-slate-600 hover:bg-slate-300"
                        onClick={() => {
                          void router.push(`/draw/session/${s.sessionID}`);
                        }}
                      >
                        LOAD
                      </button>
                      <button
                        style={{ gridArea: "b" }}
                        className="h-full rounded-none border-none hover:bg-slate-300"
                        onClick={() => {
                          dialogRef.current?.close();
                          setSelectedKanjis(s.sessionKanjis);
                          setSessionName(`${s.sessionID}_1`);
                          setSelectedWordTags(s.sessionWordTags ?? allWordTags);
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
        <div
          ref={nameDiv}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <div className="flex flex-row gap-x-2">
            <div className="relative flex min-h-[2.5rem] underline after:absolute after:left-1.5 after:top-[-5px] after:content-['Points']"></div>
            <input
              className="w-[4rem] border-green-400 text-center text-[1rem] outline-none"
              type="number"
              maxLength={4}
              value={`${donePoints ?? ""}`}
              onChange={({ currentTarget: { value } }) => {
                const num = parseInt(value);
                if (num) {
                  setDonePoints(num);
                } else {
                  setDonePoints(null);
                }
              }}
              minLength={1}
              min={10}
              placeholder={`${DEFAULT_POINTS_TO_COMPLETE}`}
            />
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
          </div>
          <div className="flex flex-row flex-wrap justify-center">
            <button
              onClick={async () => {
                await createNewSession();
              }}
              className="ml-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] hover:bg-slate-500"
            >
              Start new session
            </button>
            <button
              className="ml-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] hover:bg-slate-500"
              onClick={() => {
                const f = document.createElement("input");
                f.type = "file";
                f.click();
                f.onchange = async () => {
                  const SD = await f.files?.[0]?.text();
                  if (SD) {
                    try {
                      const nSD = JSON.parse(SD) as DrawSessionData;
                      await idb.put("draw", nSD);
                      await router.push(`/draw/session/${nSD.sessionID}`);
                    } catch (_e) {
                      err`${_e}`;
                      return;
                    }
                  }
                };
              }}
            >
              Import session
            </button>
            <button
              onClick={() => {
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
              className="ml-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] hover:bg-slate-500"
            >
              Settings
            </button>

            <div className="ml-2 flex flex-col justify-center text-center">
              Row count
              <div>
                <button
                  onClick={() => {
                    setRowCount((p) => {
                      if (p <= 1) return p;
                      return p - 1;
                    });
                  }}
                >
                  -
                </button>{" "}
                {rowCount}{" "}
                <button
                  onClick={() => {
                    setRowCount((p) => p + 1);
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[0.9rem] text-[red]">
          {sessionCreationError?.el}
        </div>
        <div
          className="grid min-h-64 w-full overflow-hidden"
          style={{ gridAutoRows: "min-content" }}
        >
          <div
            className="flex h-full max-h-[--maxh] w-full flex-col sm:max-h-[--maxhsm]"
            style={{
              "--maxh": `calc(99vh - ${
                (headerDiv.current?.offsetHeight ?? 0) +
                (nameDiv.current?.offsetHeight ?? 0) +
                (dashboardLinkRef.current?.offsetHeight ?? 0)
              }px - 1.0rem)`,
              "--maxhsm": `calc(99vh - ${
                (headerDiv.current?.offsetHeight ?? 0) +
                (nameDiv.current?.offsetHeight ?? 0)
              }px - 1.0rem)`,
            }}
          >
            <div
              className={`grid h-full max-h-full grid-flow-row overflow-y-auto`}
            >
              <div className="mb-2 flex select-none flex-wrap justify-center gap-2 justify-self-center">
                Select kanjis from group:
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-2">
                  {kanjiSortings.map((s) => {
                    return (
                      <button
                        key={s.name}
                        onClick={() => {
                          setSelectedKanjis((prev) => {
                            if (s.check(selectableKanji, prev))
                              return s.deselect(selectableKanji, prev);
                            else return s.select(selectableKanji, prev);
                          });
                        }}
                        className={`block ${s.check(selectableKanji, selectedKanjis) ? "border-[1px] border-solid border-green-800 bg-[#282]" : ""}`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                title="Words with at least one of the tags"
                className="mb-2 flex select-none flex-wrap justify-center gap-2 justify-self-center text-balance"
              >
                <div className="text-balance">Use only words with:</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {wordSortings.map((s) => {
                    return (
                      <button
                        key={s.name}
                        onClick={() => {
                          setSelectedWordTags((prev) => {
                            if (s.check(words, prev))
                              return s.deselect(words, prev);
                            return s.select(words, prev);
                          });
                        }}
                        className={`block ${s.check(words, selectedWordTags) ? "border-[1px] border-solid border-green-800 bg-[#282]" : ""}`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
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
              <div className="select-none">
                <div
                  style={{
                    ...(sessionCreationError?.reason === "kanjiNum"
                      ? { color: "red" }
                      : {}),
                  }}
                >
                  kanji: ({selectedKanjis.length}/{selectableKanji.length})
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
                    new Set(
                      selectedWords
                        .filter((f) => !!selectedKanjis.includes(f.kanji))
                        .map((w) => w.word),
                    ).size
                  }
                  /
                  {
                    new Set(
                      selectedWords
                        .filter((f) => kanjis.some((w) => w.kanji === f.kanji))
                        .map((w) => w.word),
                    ).size
                  }
                  )
                </div>
              </div>
              <div className="z-20 grid w-full justify-center justify-self-center overflow-auto pt-3">
                <div
                  className="grid w-min gap-1"
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
                          extraBadge={`${selectedWords.filter((f) => f.kanji === kanji.kanji).length}`}
                          className="w-min hover:z-10"
                          key={kanji.kanji}
                          update={() => {
                            if (
                              selectedWords.filter(
                                (w) => w.kanji === kanji.kanji,
                              ).length > 0
                            )
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
      </div>
    </>
  );
}
