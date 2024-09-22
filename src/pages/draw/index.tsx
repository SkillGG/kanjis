"use client";

import { type DrawSessionData } from "@/components/draw/drawSession";
import { DEFAULT_POINTS_TO_COMPLETE } from "@/components/draw/Quizlet";
import { type QuizWord } from "@/components/draw/quizWords";
import { KanjiTile } from "@/components/list/kanjiTile";
import { useLocalStorage } from "@/components/localStorageProvider";
import SettingBox from "@/components/settingBox";
import { usePopup } from "@/components/usePopup";
import { dbPutMultiple, type Kanji, useAppStore } from "@/appStore";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { log } from "@/utils/utils";
import { getMergedKanjis } from "@/components/list/kanjiStorage";

const MIN_SESSION_SIZE = 5;
const MIN_WORD_SIZE = 10;

type Sorting = {
  name: string;
  check: (kanjis: Kanji[], selected: string[]) => boolean;
  deselect: (kanjis: Kanji[], selected: string[]) => string[];
  select: (kanjis: Kanji[], selected: string[]) => string[];
};

export default function Draw() {
  const LS = useLocalStorage();

  const router = useRouter();

  const { kanjis, idb, mutateKanji } = useAppStore((s) => ({
    kanjis: s.kanjis,
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
  const [showFilter, setShowFilter] = useState<string>("");
  const [sessionName, setSessionName] = useState<string>("");
  const [sessionCreationError, setSessionCreationError] = useState<{
    reason: "name" | "kanjiNum" | "wordNum";
    el: React.ReactNode;
  } | null>(null);
  const [sesssions, setSessions] = useState<DrawSessionData[]>([]);
  const [donePoints, setDonePoints] = useState<number | null>(null);
  const [wWidth, setWWidth] = useState<number | null>(null);
  const [words, setWords] = useState<QuizWord[]>([]);

  const dialogRef = useRef<HTMLDialogElement>(null);

  const { popup, setPopup } = usePopup();

  useEffect(() => {
    void (async () => {
      const prevSessionIndex = await idb.count("draw");
      if (!sessionName) setSessionName(`Session ${prevSessionIndex + 1}`);

      const openSessions = await idb.getAll("draw");
      setSessions(() => openSessions.filter((s) => s.open));

      setWords(await idb.getAll("wordbank"));
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

  const availableSortings: Sorting[] = [
    {
      name: "ALL",
      check(kanjis, selected) {
        return kanjis.reduce(
          (p, n) => (!p ? p : selected.includes(n.kanji)),
          true,
        );
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
      .map<Sorting>((status) => ({
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
    ...[...new Set<number>(kanjis.map((k) => k.lvl))].map<Sorting>((lvl) => ({
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
    })),
    ...[...new Set<string>(words.map<string[]>((w) => w.tags ?? []).flat())]
      .sort()
      .map<Sorting>((tag) => ({
        name: tag.toUpperCase(),
        check(kanjis, selected) {
          return words
            .filter((w) => w.tags?.includes(tag))
            .reduce(
              (p, n) =>
                !p
                  ? p
                  : kanjis.find((k) => k.kanji === n.kanji)
                    ? selected.includes(n.kanji)
                    : p,
              true,
            );
        },
        deselect(k, s) {
          return s.filter(
            (q) => !words.find((w) => w.tags?.includes(tag) && w.kanji === q),
          );
        },
        select(kanjis, s) {
          return [
            ...s,
            ...kanjis
              .filter(
                (k) =>
                  !!words.find(
                    (w) => w.tags?.includes(tag) && w.kanji === k.kanji,
                  ),
              )
              .map((k) => k.kanji),
          ];
        },
      })),
  ];

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
          <div className="relative flex min-h-[2.5rem] underline after:absolute after:left-1.5 after:top-[-5px] after:content-['Points']">
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
                const sessionData: DrawSessionData = {
                  sessionID: sessionName,
                  sessionKanjis: selectedKanjis.filter(
                    (k) => !!words.find((w) => w.kanji === k),
                  ),
                  sessionResults: [],
                  open: true,
                  pointsToComplete: donePoints ?? undefined,
                };
                await idb.put("draw", sessionData);

                if (markAsLearning) {
                  const kanjiToMarkAsLearning = kanjis.filter(
                    (k) =>
                      k.status === "new" && selectedKanjis.includes(k.kanji),
                  );
                  log`Marking as learning ${kanjiToMarkAsLearning}`;

                  const newKanji = kanjiToMarkAsLearning.map<Kanji>((k) => ({
                    ...k,
                    status: "learning",
                  }));

                  await dbPutMultiple(idb, "kanji", newKanji);

                  const newKanjiList = await getMergedKanjis(
                    LS,
                    idb,
                    newKanji,
                    "m",
                  );

                  mutateKanji(() => newKanjiList.kanji);
                }

                await router.replace(`/draw/session/${sessionData.sessionID}`);
              }}
              className="ml-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] hover:bg-slate-500"
            >
              Start new session
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
              <div
                className="mb-2 flex max-w-[--maxw] select-none flex-wrap justify-around gap-x-2 gap-y-2 justify-self-center"
                style={{
                  "--maxw": `${Math.min(wWidth ?? Infinity, rowCount * 55)}px`,
                }}
              >
                <div className="flex flex-col justify-center text-center">
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
                {availableSortings.map((s) => {
                  return (
                    <button
                      key={s.name}
                      onClick={() => {
                        setSelectedKanjis((prev) => {
                          if (s.check(kanjis, prev))
                            return s.deselect(kanjis, prev);
                          else return s.select(kanjis, prev);
                        });
                      }}
                      className={`block ${s.check(kanjis, selectedKanjis) ? "border-[1px] border-solid border-green-800 bg-[#282]" : ""}`}
                    >
                      {s.name}
                    </button>
                  );
                })}
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
                      new Set(
                        words
                          .filter((f) => !!selectedKanjis.includes(f.kanji))
                          .map((w) => w.word),
                      ).size
                    }
                    /
                    {
                      new Set(
                        words
                          .filter(
                            (f) => !!kanjis.find((w) => w.kanji === f.kanji),
                          )
                          .map((w) => w.word),
                      ).size
                    }
                    )
                  </div>
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
                      const on =
                        selectedKanjis.includes(kanji.kanji) &&
                        words.filter((w) => w.kanji === kanji.kanji).length;
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
                          className="w-min hover:z-10"
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
      </div>
    </>
  );
}
