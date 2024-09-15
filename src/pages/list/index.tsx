import { useEffect, useRef, useState } from "react";
import { type Kanji, useKanjiStore } from "@/components/list/kanjiStore";
import {
  DEFAULT_KANJI_VERSION,
  DEFAULT_KANJIS,
} from "@/components/list/defaultKanji";
import { LS_KEYS, useLocalStorage } from "@/components/localStorageProvider";

import kanjiCSS from "@/components/list/list.module.css";
import { useKanjiStorage } from "@/components/list/kanjiStorage";
import { getShareLink, doesKanjiFitFilter } from "@/components/list/kanjiUtils";
import Head from "next/head";
import { textColors } from "@/components/list/theme";
import { KanjiTile } from "@/components/list/kanjiTile";

const POPUP_SHOW_TIME = 2000;

function App() {
  const LS = useLocalStorage();
  useKanjiStorage(LS);

  const {
    kanjis,
    mutateKanjis,
    updateKanji,
    addKanji,
    shouldUpdate,
    setShouldUpdate,
  } = useKanjiStore();

  useEffect(() => {
    if (!kanjis) return;
    LS.set<Kanji[]>(LS_KEYS.kanjis, kanjis);
  }, [kanjis, LS]);

  const [showbadges, setShowbadges] = useState<0 | 1 | 2 | 3 | null>(null);

  useEffect(() => {
    if (showbadges === null) return;
    LS.set<0 | 1 | 2 | 3>(LS_KEYS.badges, showbadges);
    console.log("showbadges change");
  }, [showbadges, LS]);

  const [kanjisToSelect, setKanjisToSelect] = useState("");

  const [filter, setFilter] = useState("");

  const [rowCount, setRowCount] = useState(10);

  useEffect(() => {
    setRowCount(LS.getNum(LS_KEYS.row_count) ?? 10);
    setShowbadges(LS.getNum<0 | 1 | 2 | 3>(LS_KEYS.badges) ?? 0);
  }, [LS]);

  const [popup, setPopup] = useState<{
    text: React.ReactNode;
    time?: number;
    borderColor?: string;
    color?: string;
  } | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (popup === null) return;
    setPopupOpen(true);
    const oT = setTimeout(() => {
      setPopupOpen(false);
    }, popup.time ?? POPUP_SHOW_TIME);
    return () => {
      clearTimeout(oT);
    };
  }, [popup]);

  useEffect(() => {
    if (!popupOpen) {
      const cT = setTimeout(() => {
        setPopup(null);
      }, 200);
      return () => {
        clearTimeout(cT);
      };
    }
  }, [popupOpen]);

  useEffect(() => {
    LS.set("rowCount", `${rowCount}`);
  }, [rowCount, LS]);

  const addRef = useRef<HTMLDialogElement>(null);
  const clearAddRef = useRef<HTMLButtonElement>(null);

  console.log("badges", showbadges);

  return (
    <>
      <Head>
        <title>Kanji list</title>
      </Head>
      <div>
        {popup && (
          <div
            className={kanjiCSS.popup}
            style={{
              "--borderColor": popup.borderColor ?? "green",
              "--textColor": popup.color ?? "white",
            }}
            data-open={popupOpen ? "open" : "closed"}
          >
            <div>{popup.text}</div>
          </div>
        )}
        {shouldUpdate && (
          <div
            className={kanjiCSS.popup + " z-10 text-center text-[1.3rem]"}
            style={{
              "--borderColor": "red",
              "--textColor": "white",
            }}
            data-open={"open"}
          >
            <div>
              There was an update to the kanji list!
              <br />({LS.getString(LS_KEYS.kanji_ver) ?? "0.0.1"} =&gt;{" "}
              {DEFAULT_KANJI_VERSION})
              <br />
              <button
                className={kanjiCSS.updateBTN}
                onClick={() => {
                  LS.set<string>(LS_KEYS.omit_version, null);
                  LS.set<Kanji[]>(LS_KEYS.kanjis, null);
                  setTimeout(() => {
                    window.location.href = getShareLink(kanjis);
                  }, 50);
                }}
              >
                Update
              </button>
              <button
                className={kanjiCSS.updateBTN}
                onClick={() => {
                  setShouldUpdate(false);
                }}
              >
                Dismiss
              </button>
              <button
                className={kanjiCSS.updateBTN}
                onClick={() => {
                  localStorage.setItem(
                    LS_KEYS.omit_version,
                    DEFAULT_KANJI_VERSION,
                  );
                  setShouldUpdate(false);
                }}
              >
                Don&apos;t ask anymore
              </button>
            </div>
          </div>
        )}
        <div
          id="settings"
          className={`mb-[3px] flex w-full flex-wrap justify-around`}
        >
          <div className={kanjiCSS["setting-menu"] + " flex-col"}>
            <div style={{ color: textColors.learning }}>Learning</div>
            <div style={{ color: textColors.completed }}>Completed</div>
          </div>
          <div className={kanjiCSS["setting-menu"] + " items-center"}>
            <KanjiTile
              badges={showbadges ?? 3}
              kanji={{ kanji: "札", lvl: 3, status: "new", type: "extra" }}
              update={() => {
                setShowbadges((p) =>
                  !p ? 1 : ((p > 2 ? 0 : p + 1) as 0 | 1 | 2 | 3),
                );
              }}
              disabled
            />
          </div>
          <div className={kanjiCSS["setting-menu"]}>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(getShareLink(kanjis));
                setPopup({
                  text: (
                    <div style={{ textAlign: "center" }}>
                      Copied to clipboard!
                      <br />
                      You can share it to your other devices!
                      <br />
                      <span style={{ color: "red" }}>
                        Going into this link will override the
                        <br />
                        data from the importing device!
                      </span>
                    </div>
                  ),
                });
              }}
            >
              Get save link
            </button>
            <button
              onClick={() => {
                clearAddRef.current?.click();
                addRef.current?.showModal();
              }}
            >
              Add kanjis
            </button>
            <dialog ref={addRef}>
              List kanjis to add
              <form
                style={{
                  margin: "0 auto",
                  textAlign: "center",
                }}
                action="#"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = addRef.current?.querySelector("form");
                  if (form) {
                    const arf = new FormData(form);
                    const kanjis = arf.get("kanjis");
                    const type = arf.get("type");
                    const lvlStr = arf.get("lvl");
                    const status = arf.get("status");

                    if (
                      !kanjis ||
                      !type ||
                      !status ||
                      !lvlStr ||
                      typeof kanjis !== "string" ||
                      typeof lvlStr !== "string"
                    )
                      return;

                    const lvl = parseInt(lvlStr);
                    if (isNaN(lvl) || lvl < 1) return;

                    if (type !== "base" && type !== "extra") return;
                    if (
                      status !== "new" &&
                      status !== "learning" &&
                      status !== "completed"
                    )
                      return;

                    for (const kanji of kanjis) {
                      addKanji({
                        kanji,
                        lvl,
                        type,
                        status,
                      });
                    }

                    addRef.current?.close();
                  }
                }}
              >
                <input required name="kanjis" />
                <br />
                <br />
                Status:
                <br />
                <label>
                  New <input required type="radio" value="new" name="status" />
                </label>
                <br />
                <label>
                  Learning{" "}
                  <input required type="radio" value="learning" name="status" />
                </label>
                <br />
                <label>
                  Completed{" "}
                  <input
                    required
                    type="radio"
                    name="status"
                    value="completed"
                  />
                </label>
                <br />
                Type:
                <br />
                <label>
                  Base <input required type="radio" name="type" value="base" />
                </label>
                <br />
                <label>
                  Extra{" "}
                  <input required type="radio" name="type" value="extra" />
                </label>
                <br />
                <label>
                  Level:
                  <input type="number" min="1" step="1" name="lvl" />
                </label>
                <div style={{ marginTop: "5px" }}>
                  <button type="submit">Add</button>
                  <button type="button" onClick={() => addRef.current?.close()}>
                    Cancel
                  </button>
                  <button type="reset" ref={clearAddRef}>
                    Clear
                  </button>
                </div>
              </form>
              <br />
            </dialog>
          </div>
          <div className={kanjiCSS["setting-menu"]}>
            <label>
              <input
                className="outline-none focus:outline-dotted"
                value={kanjisToSelect}
                onChange={(e) => setKanjisToSelect(e.target.value)}
                placeholder="森 or lvl1 base cpl"
                onKeyDown={(e) => {
                  if (e.code === "Enter") {
                    setFilter(kanjisToSelect);
                  }
                }}
              />
            </label>
            <div className="flex min-h-10 items-center">
              <button
                onClick={() => {
                  setFilter(kanjisToSelect);
                }}
              >
                Filter
              </button>
              <button
                onClick={() => {
                  document
                    .querySelectorAll(".kanjiBtn")
                    .forEach((e) => (e as HTMLElement).click());
                }}
              >
                Click
              </button>
              <button
                onClick={() => {
                  setFilter("");
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <div className={kanjiCSS["setting-menu"]}>
            <button
              className="border-red-600 text-orange-300"
              onClick={() => {
                mutateKanjis(() => [...DEFAULT_KANJIS()]);
                setPopup({
                  text: <span>Reset successful!</span>,
                  borderColor: "red",
                });
              }}
            >
              Reset to Default
            </button>
          </div>
          <div className={kanjiCSS["setting-menu"] + ` flex-col`}>
            Kanji per row:
            <div className="flex flex-row items-center justify-center">
              <button
                className="mx-1"
                onClick={() => setRowCount((p) => (p === 1 ? 1 : p - 1))}
              >
                -
              </button>
              {rowCount}
              <button
                className="mx-1"
                onClick={() => setRowCount((p) => p + 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className="m-[0_auto] grid w-fit grid-flow-row gap-[1px]"
        style={{
          gridTemplateColumns: "1fr ".repeat(rowCount),
        }}
      >
        {(kanjis ?? [])
          .filter(
            (f) => filter.includes(f.kanji) || doesKanjiFitFilter(filter, f),
          )
          .map((kanji) => {
            return (
              <KanjiTile
                badges={showbadges ?? 3}
                kanji={kanji}
                update={updateKanji}
                key={kanji.kanji}
              />
            );
          })}
      </div>
    </>
  );
}

export default App;
