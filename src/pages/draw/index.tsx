"use client";

import { useKanjiStorage } from "@/components/list/kanjiStorage";
import { type Kanji, useKanjiStore } from "@/components/list/kanjiStore";
import { KanjiTile } from "@/components/list/kanjiTile";
import { LS_KEYS, useLocalStorage } from "@/components/localStorageProvider";
import Link from "next/link";
import Router from "next/router";
import { useEffect, useState } from "react";

export default function Draw() {
  const LS = useLocalStorage();

  useKanjiStorage(LS);
  const { kanjis } = useKanjiStore();

  const [selectedKanjis, setSelectedKanjis] = useState<string[]>(
    kanjis?.filter((k) => k.type != "extra").map((k) => k.kanji) ?? [],
  );

  const [rowCount, setRowCount] = useState<number | null>(null);

  const [showFilter, setShowFilter] = useState<string>("");

  const [learningKanjis, setLearningKanjis] = useState<Kanji[]>([]);
  const [completedKanjis, setCompletedKanjis] = useState<Kanji[]>([]);
  const [newKanjis, setNewKanjis] = useState<Kanji[]>([]);

  useEffect(() => {
    if (rowCount === null) {
      setRowCount(LS.getNum(LS_KEYS.row_count + "_draw") ?? 8);
    } else {
      LS.set(LS_KEYS.row_count + "_draw", rowCount);
    }

    if (LS.getString("draw_session")) {
      void Router.replace("/draw/session/1");
    }
  }, [LS, rowCount]);

  useEffect(() => {
    void (async () => {
      if (!LS?.db) return;
      const learning = await LS.db.getAllFromIndex(
        "kanji",
        "status",
        "learning",
      );
      setLearningKanjis(learning);

      const completed = await LS.db.getAllFromIndex(
        "kanji",
        "status",
        "completed",
      );
      setCompletedKanjis(completed);

      const newKs = await LS.db.getAllFromIndex("kanji", "status", "new");
      setNewKanjis(newKs);
    })();
  }, [LS]);

  if (!kanjis) {
    return <>Loading</>;
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Link
        onClick={() => LS.set("draw_session", selectedKanjis)}
        href={"/draw/session/1"}
        className="mt-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] underline hover:bg-slate-500"
      >
        Start new session
      </Link>
      <div
        className="grid min-h-64 overflow-hidden"
        style={{ gridAutoRows: "min-content" }}
      >
        <div className="flex h-full max-h-[90vh] flex-col">
          <div
            className={`grid h-full max-h-full grid-flow-row overflow-y-auto`}
          >
            <div
              className="mb-2 flex max-h-20 max-w-[--maxw] select-none flex-wrap justify-around gap-x-2 justify-self-center"
              style={{ "--maxw": `${(rowCount ?? 8) * 55}px` }}
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
                      ...new Set([...prev, ...(lv1.map((k) => k.kanji) ?? [])]),
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
                      ...new Set([...prev, ...(lv2.map((k) => k.kanji) ?? [])]),
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
              <label>
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
  );
}
