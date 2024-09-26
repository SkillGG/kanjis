import { useEffect, useRef, useState } from "react";
import { DEFAULT_KANJI_VERSION } from "@/components/list/defaultKanji";
import { LS_KEYS, useLocalStorage } from "@/components/localStorageProvider";

import kanjiCSS from "@/components/list/list.module.css";

import popupCSS from "@/components/popup.module.css";

import {
  checkKanjiListUpdate,
  getMergedKanjis,
  getOverrideType,
  migrateFromLS,
  parseKanjiURI,
  removeSearchParams,
  saveToIDB,
  useKanjiStorage,
} from "@/components/list/kanjiStorage";
import { getShareLink, doesKanjiFitFilter } from "@/components/list/kanjiUtils";
import Head from "next/head";
import { textColors } from "@/components/list/theme";
import Link from "next/link";
import { api } from "@/utils/api";
import shortUUID from "short-uuid";
import { log, warn } from "@/utils/utils";
import { usePopup } from "@/components/usePopup";
import { type Kanji, useAppStore } from "@/appStore";
import WordbankOnlyKanjiList from "@/components/list/wordbankOnlyKanjiList";
import KanjiTile from "@/components/list/kanjiTile";

const CHECK_DEDPUE_DELAY = 500;

function App() {
  const LS = useLocalStorage();
  const { resetDBToDefault, getKanjiFromOnlineDB } = useKanjiStorage();
  const { popup, setPopup } = usePopup();

  const mut = api.backup.backupList.useMutation();

  const apiUtils = api.useUtils();

  const {
    kanjis,
    updateKanji,
    addKanji,
    shouldUpdate,
    setShouldUpdate,
    mutateKanjis,
    idb,
  } = useAppStore((s) => ({
    kanjis: s.kanji,
    updateKanji: s.updateKanji,
    mutateKanjis: s.mutateKanjis,
    addKanji: s.addKanji,
    shouldUpdate: s.shouldUpdateKanjiList,
    setShouldUpdate: s.setShouldUpdateKanjiList,
    idb: s.getIDB(),
  }));

  const [showbadges, setShowbadges] = useState<0 | 1 | 2 | 3 | null>(null);

  useEffect(() => {
    if (showbadges === null) return;
    LS.set<0 | 1 | 2 | 3>(LS_KEYS.badges, showbadges);
  }, [showbadges, LS]);

  const [kanjisToSelect, setKanjisToSelect] = useState("");

  const [filter, setFilter] = useState("");

  const [rowCount, setRowCount] = useAppStore((s) => [
    s.settings.kanjiRowCount,
    (fn: (f: number) => number) =>
      s.setSettings("kanjiRowCount", fn(s.settings.kanjiRowCount)),
  ]);

  const [restoreID, setRestoreID] = useState("");
  const [restoreIDText, setRestoreIDText] = useState("");
  const [restorePopup, setRestorePopup] = useState(false);
  const [restorePopupOpen, setRestorePopupOpen] = useState(false);

  const [canRestore, setCanRestore] = useState<
    true | { reason: string } | null
  >(null);

  const [checkDelayer, setCheckDelayer] = useState<{
    timer: number;
    fn: () => void;
  } | null>(null);

  useEffect(() => {
    if (!checkDelayer) return;

    const timer = setTimeout(() => checkDelayer.fn(), checkDelayer.timer);

    return () => {
      console.log("Clearing checktimer delay");
      clearTimeout(timer);
    };
  }, [checkDelayer]);

  useEffect(() => {
    if (!restoreID) return setCanRestore({ reason: "Empty ID!" });
    const controller = new AbortController();
    setCanRestore(null);
    void (async () => {
      const val = await apiUtils.backup.checkKanjiListIDAvailability
        .fetch(restoreID, {
          signal: controller.signal,
        })
        .catch(() => ({ reason: "Aborted" }));
      const value =
        typeof val === "object" && val && val.reason === "ID already occupied!"
          ? true
          : val === true
            ? { reason: "No backup with that ID!" }
            : val;
      if (!controller.signal.aborted) setCanRestore(value);
    })();
    return () => {
      console.error("Aborting call to", restoreID, "early");
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreID]);

  useEffect(() => {
    if (restorePopup) setRestorePopupOpen(true);
  }, [restorePopup]);

  useEffect(() => {
    if (!restorePopupOpen) {
      const cT = setTimeout(() => {
        setRestorePopup(false);
      }, 200);
      return () => {
        clearTimeout(cT);
      };
    }
  }, [restorePopupOpen]);

  const [customID, setCustomID] = useState("");
  const [customIDText, setCustomIDText] = useState("");
  const [customIDPopup, setCustomIDPopup] = useState(false);
  const [customIDPopupOpen, setCustomIDPopupOpen] = useState(false);

  useEffect(() => {
    if (customIDPopup) setCustomIDPopupOpen(true);
  }, [customIDPopup]);

  useEffect(() => {
    if (!customIDPopupOpen) {
      const cT = setTimeout(() => {
        setCustomIDPopup(false);
      }, 200);
      return () => {
        clearTimeout(cT);
      };
    }
  }, [customIDPopupOpen]);

  const [idAvailable, setIDAvailable] = useState<
    true | { reason: string } | null
  >(null);

  useEffect(() => {
    if (!customID) return setIDAvailable({ reason: "Empty ID!" });
    const controller = new AbortController();
    setIDAvailable(null);
    const timer = setTimeout(() => {
      void (async () => {
        const val = await apiUtils.backup.checkKanjiListIDAvailability
          .fetch(customID, {
            signal: controller.signal,
          })
          .catch(() => ({ reason: "Aborted" }));
        if (!controller.signal.aborted) setIDAvailable(val);
      })();
    }, 100);
    return () => {
      console.error("Aborting call to", customID, "early");
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customID]);

  useEffect(() => {
    setShowbadges(LS.getNum<0 | 1 | 2 | 3>(LS_KEYS.badges) ?? 0);

    void (async () => {
      const currURL = new URL(location.href);

      if (currURL.searchParams.has("q")) {
        const success = await getKanjiFromOnlineDB(
          currURL.searchParams.get("q"),
        );
        log`Succeeded? ${success}`;
        const mergedKanjis = await getMergedKanjis(
          LS,
          idb,
          success ? success : [],
          "r",
        );
        if (!!success) await removeSearchParams("r");
        else
          setPopup({
            text: (
              <div className="text-center">
                Could not resotre backup with ID &quot;
                <span className="text-[red]">
                  {currURL.searchParams.get("q")}
                </span>
                &quot;
                <br />
                Are you sure the ID is correct?
              </div>
            ),
            borderColor: "red",
            time: 3000,
          });
        mutateKanjis(() => mergedKanjis.kanji);
        await saveToIDB(idb, mergedKanjis.kanji);
      } else if (currURL.searchParams.has("t")) {
        const urlKanji = parseKanjiURI(currURL.searchParams);
        const overrideType = getOverrideType(currURL.searchParams);
        const mergedKanjis = await getMergedKanjis(
          LS,
          idb,
          urlKanji,
          overrideType,
        );

        mutateKanjis(() => mergedKanjis.kanji);

        await saveToIDB(idb, mergedKanjis.kanji);

        await removeSearchParams(overrideType);
      }

      await migrateFromLS(LS, idb);

      setShouldUpdate(checkKanjiListUpdate(LS));
    })();
  }, [LS, getKanjiFromOnlineDB, idb, mutateKanjis, setPopup, setShouldUpdate]);

  const addRef = useRef<HTMLDialogElement>(null);
  const clearAddRef = useRef<HTMLButtonElement>(null);

  function showCopiedPopup(shortened?: boolean) {
    setPopup({
      text: (
        <div style={{ textAlign: "center" }}>
          Copied {shortened && "shortened link"} to clipboard!
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
  }

  return (
    <>
      <Head>
        <title>Kanji list</title>
      </Head>
      <div>
        {customIDPopup && (
          <div
            className={popupCSS.popup + " " + popupCSS.popupModal}
            style={{
              "--borderColor": "green",
              "--textColor": "white",
              "--backdrop": "#fff3",
            }}
            data-open={customIDPopupOpen ? "open" : "closed"}
            onClick={() => {
              setCustomIDPopupOpen(false);
            }}
          >
            <div
              className="mx-2 flex w-fit flex-row flex-wrap justify-center gap-y-2 rounded-xl border-2 p-[1em] sm:mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                <input
                  value={customIDText}
                  onChange={(e) => {
                    const value = e.currentTarget.value;
                    setCustomIDText(value);
                    setIDAvailable(null);
                    setCheckDelayer({
                      fn: () => {
                        setCustomID(value);
                      },
                      timer: CHECK_DEDPUE_DELAY,
                    });
                  }}
                  className="w-[20rem] border-b-[--bbcolor] text-center text-[1.3rem] outline-none"
                  style={{
                    "--bbcolor":
                      idAvailable === true
                        ? "green"
                        : !!idAvailable
                          ? "red"
                          : "white",
                  }}
                />
                {typeof idAvailable === "object" ? (
                  idAvailable ? (
                    <span className="text-[red]">{idAvailable.reason}</span>
                  ) : (
                    <span>Checking...</span>
                  )
                ) : (
                  <span className="text-[lime]">Valid ID!</span>
                )}
              </div>
              <div className="flex gap-x-2">
                <button
                  onClick={async () => {
                    const insert = await mut.mutateAsync({
                      sharelink: getShareLink(kanjis),
                      customID,
                    });
                    if ("err" in insert) {
                      return setIDAvailable({ reason: insert.err });
                    }
                    setCustomIDPopupOpen(false);
                    await navigator.clipboard.writeText(insert.link);
                    setCustomID("");
                    showCopiedPopup();
                  }}
                  disabled={idAvailable === true ? false : true}
                  className="ml-2 disabled:text-[red]"
                >
                  SAVE
                </button>
                <button
                  onClick={() => {
                    const randomID = shortUUID(
                      shortUUID.constants.uuid25Base36,
                    ).new();
                    setCustomID(randomID);
                    setCustomIDText(randomID);
                  }}
                >
                  RANDOM
                </button>
                <button
                  onClick={() => {
                    setCustomIDPopupOpen(false);
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
        {restorePopup && (
          <div
            className={popupCSS.popup + " " + popupCSS.popupModal}
            style={{
              "--borderColor": "green",
              "--backdrop": "#fff3",
              "--textColor": "white",
            }}
            data-open={restorePopupOpen ? "open" : "closed"}
            onClick={() => {
              setRestorePopupOpen(false);
            }}
          >
            <div
              className="mx-2 flex w-fit flex-row flex-wrap justify-center gap-y-2 rounded-xl border-2 p-[1em] sm:mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col">
                <input
                  value={restoreIDText}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    setRestoreIDText(value);
                    setCanRestore(null);
                    setCheckDelayer({
                      timer: CHECK_DEDPUE_DELAY,
                      fn: () => {
                        setRestoreID(value);
                      },
                    });
                  }}
                  className="w-[20rem] border-b-[--bbcolor] text-center text-[1.3rem] outline-none"
                  style={{
                    "--bbcolor":
                      canRestore === null
                        ? "white"
                        : canRestore === true
                          ? "green"
                          : "red",
                  }}
                />
                <span
                  style={{
                    color:
                      canRestore === null
                        ? "white"
                        : canRestore === true
                          ? "green"
                          : "red",
                  }}
                >
                  {canRestore === null
                    ? "Checking..."
                    : canRestore === true
                      ? "Can restore!"
                      : canRestore.reason}
                </span>
              </div>
              <div className="flex gap-x-2">
                <button
                  onClick={async () => {
                    if (canRestore === true) {
                      const success = await getKanjiFromOnlineDB(restoreID);
                      warn`${success}`;
                      if (success) {
                        const merged = await getMergedKanjis(
                          LS,
                          idb,
                          success,
                          "m",
                        );
                        log`${merged.kanji}`;
                        setRestorePopupOpen(false);
                        await saveToIDB(idb, merged.kanji);
                        mutateKanjis(() => merged.kanji);
                        await removeSearchParams("r");
                      } else {
                        setPopup({
                          text: (
                            <div className="text-center">
                              Could not restore backup because of a server
                              error! Try again later!
                            </div>
                          ),
                          borderColor: "red",
                        });
                      }
                    }
                  }}
                  disabled={canRestore === true ? false : true}
                  className="ml-2 disabled:text-[red]"
                >
                  LOAD
                </button>
                <button
                  onClick={() => {
                    setRestorePopupOpen(false);
                    setRestoreID("");
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
        {popup}
        {shouldUpdate && (
          <div
            className={kanjiCSS.popup + " z-20 text-center text-[1.3rem]"}
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
                    window.location.href = getShareLink(kanjis, "reset");
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
        <Link
          className={
            "absolute block items-center justify-start p-2 text-left underline"
          }
          href={"/"}
        >
          Go back
        </Link>
        <div
          id="settings"
          style={{ "--maxw": `calc(100vw - 130px)` }}
          className={`mx-[auto] mb-[3px] flex w-[--maxw] flex-wrap justify-around`}
        >
          <div className={kanjiCSS["setting-menu"] + " flex-col"}>
            <div style={{ color: textColors.learning }}>
              {" "}
              Learning (
              {kanjis?.filter((f) => f.status === "learning").length ?? 0})
            </div>
            <div style={{ color: textColors.completed }}>
              Completed (
              {kanjis?.filter((f) => f.status === "completed").length ?? 0})
            </div>
            <div style={{ color: "white" }}> All ({kanjis?.length ?? 0})</div>
          </div>
          <div className={kanjiCSS["setting-menu"] + " items-center"}>
            <KanjiTile
              badges={showbadges ?? 3}
              kanji={{
                kanji: "札",
                lvl: 3,
                status: "new",
                type: "extra",
                index: 0,
              }}
              update={() => {
                setShowbadges((p) =>
                  !p ? 1 : ((p > 2 ? 0 : p + 1) as 0 | 1 | 2 | 3),
                );
              }}
              disabled
            />
          </div>
          <WordbankOnlyKanjiList listKanji={kanjis} />
          <div className={kanjiCSS["setting-menu"]}>
            <button
              className="w-min break-words border-red-600 text-orange-300 sm:break-keep"
              onClick={() => {
                setPopup({
                  modal: true,
                  text: (close) => (
                    <div className="text-center">
                      <div>Do you really want to delete all your progress?</div>
                      <button
                        className="border-red-500"
                        onClick={async () => {
                          close();
                          await resetDBToDefault(LS, idb, []);
                        }}
                      >
                        Yes
                      </button>
                      <button onClick={() => close()}>No</button>
                    </div>
                  ),
                  borderColor: "red",
                  time: "user",
                });
              }}
            >
              Reset List
            </button>
          </div>
          <div className={kanjiCSS["setting-menu"]}>
            <label>
              <input
                className="outline-none focus:outline-dotted"
                value={kanjisToSelect}
                onChange={(e) => setKanjisToSelect(e.target.value)}
                placeholder="森 or lvl1 base cpl"
                onKeyDown={(e) => {
                  if (e.code === "Enter" || e.keyCode === 13) {
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
                    .querySelectorAll(
                      `.${kanjiCSS.kanjiBtn}:not([data-disabled="true"])`,
                    )
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
          <div className={kanjiCSS["setting-menu"] + " gap-y-2"}>
            <div className={`mx-2 flex flex-row gap-x-2 gap-y-1 self-center`}>
              <button
                className="w-min break-words sm:w-[initial] sm:break-keep"
                onClick={async () => {
                  setCustomIDPopup(true);
                }}
              >
                Custom ID backup
              </button>
              <button
                className="w-min break-words sm:w-[initial] sm:break-keep"
                onClick={async () => {
                  setRestorePopup(true);
                }}
              >
                Restore from DB
              </button>
              <button
                className="w-min break-words sm:w-[initial] sm:break-keep"
                onClick={async () => {
                  const sharelink = getShareLink(kanjis);
                  const dbSharelink = await mut.mutateAsync({ sharelink });
                  if ("link" in dbSharelink) {
                    await navigator.clipboard.writeText(dbSharelink.link);
                  } else {
                    console.error(dbSharelink.err);
                    await navigator.clipboard.writeText(sharelink);
                  }
                  showCopiedPopup("link" in dbSharelink);
                }}
              >
                Quick backup to DB
              </button>
              <button
                className="w-min break-words sm:w-[initial] sm:break-keep"
                onClick={async () => {
                  const sharelink = getShareLink(kanjis);
                  await navigator.clipboard.writeText(sharelink);
                  showCopiedPopup();
                }}
              >
                Share long link
              </button>
            </div>
            <button
              className="w-min break-words sm:w-[initial] sm:break-keep"
              onClick={() => {
                clearAddRef.current?.click();
                addRef.current?.showModal();
              }}
            >
              Add kanjis
            </button>
            <dialog
              ref={addRef}
              onPointerDown={(event) => {
                const dialog = addRef.current;
                if (!dialog) return;
                const rect = dialog.getBoundingClientRect();
                const isInDialog =
                  rect.top <= event.clientY &&
                  event.clientY <= rect.top + rect.height &&
                  rect.left <= event.clientX &&
                  event.clientX <= rect.left + rect.width;
                if (!isInDialog) {
                  addRef.current?.close();
                }
              }}
            >
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
                    let i = 0;
                    for (const kanji of kanjis) {
                      addKanji({
                        kanji,
                        lvl,
                        type,
                        status,
                        index: kanjis.length + ++i,
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

          <div className={kanjiCSS["setting-menu"] + ` flex-col`}>
            Kanji per row:
            <div className="flex flex-row items-center justify-center">
              <button
                className="mx-1"
                onClick={() => setRowCount((p) => (p <= 1 ? 1 : p - 1))}
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
        {kanjis ? (
          kanjis
            .filter(
              (f) => filter.includes(f.kanji) || doesKanjiFitFilter(filter, f),
            )
            .map((kanji) => {
              return (
                <KanjiTile
                  badges={showbadges ?? 3}
                  kanji={kanji}
                  update={async (kanji, data) => {
                    updateKanji(kanji, data);
                    const prev = await idb?.get("kanji", kanji);
                    if (prev) {
                      await idb?.put("kanji", { ...prev, ...data });
                    }
                  }}
                  key={kanji.kanji}
                />
              );
            })
        ) : (
          <>Loading...</>
        )}
      </div>
    </>
  );
}

export default App;
