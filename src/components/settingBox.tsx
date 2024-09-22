import { useEffect } from "react";
import { DEFAULT_SETTINGS, useAppStore } from "../appStore";
import { LS_KEYS, useLocalStorage } from "./localStorageProvider";

export default function SettingBox({
  draw,
  global,
  list,
  wordbank,
  name,
}: {
  global?: boolean;
  list?: boolean;
  draw?: boolean;
  wordbank?: boolean;
  name?: string;
}) {
  const { settings, setSettings } = useAppStore((s) => ({
    settings: s.settings,
    setSettings: s.setSettings,
  }));

  const LS = useLocalStorage();

  useEffect(() => {
    LS.set(LS_KEYS.settings, settings);
  }, [LS, settings]);

  return (
    <>
      <div className="text-2xl">{name ? name : "Settings"}</div>
      <hr />
      {global !== false && (
        <>
          <div className={`mb-2 flex-col pt-1`}>
            Kanji per row:
            <div className="flex flex-row items-center justify-center">
              <button
                className="mx-1"
                onClick={() =>
                  setSettings(
                    "kanjiRowCount",
                    ((p) => (p <= 1 ? 1 : p - 1))(settings.kanjiRowCount),
                  )
                }
              >
                -
              </button>
              {settings.kanjiRowCount}
              <button
                className="mx-1"
                onClick={() =>
                  setSettings("kanjiRowCount", settings.kanjiRowCount + 1)
                }
              >
                +
              </button>
            </div>
          </div>
          <hr />
        </>
      )}
      {list !== false && (
        <>
          {list === undefined && <div className="text-2xl">/list</div>}
          <div className="mb-2">{/** LIST SETTINGS */}</div>
          <hr />
        </>
      )}
      {draw !== false && (
        <>
          {draw === undefined && <div className="text-2xl">/draw</div>}
          <div className="mb-2">
            <label className="block text-balance">
              Show session progress
              <input
                type="checkbox"
                checked={settings.showSessionProgress}
                onChange={() => {
                  setSettings(
                    "showSessionProgress",
                    !settings.showSessionProgress,
                  );
                }}
              />
            </label>
            <label className="block text-balance">
              Auto-mark kanjis as learning when starting a session
              <input
                type="checkbox"
                checked={settings.markKanjisAsLearningOnSessionStart}
                onChange={() => {
                  setSettings(
                    "markKanjisAsLearningOnSessionStart",
                    !settings.markKanjisAsLearningOnSessionStart,
                  );
                }}
              />
            </label>
            <label className="block text-balance">
              Auto-mark kanjis as completed when ending a session
              <input
                type="checkbox"
                checked={settings.markKanjiAsCompletedOnSessionClose}
                onChange={() => {
                  setSettings(
                    "markKanjiAsCompletedOnSessionClose",
                    !settings.markKanjiAsCompletedOnSessionClose,
                  );
                }}
              />
            </label>
          </div>
          <hr />
          <hr />
        </>
      )}
      {wordbank !== false && (
        <>
          {wordbank === undefined && <div className="text-2xl">/wordbank</div>}
          <div className="mb-2">
            <label className="block text-balance">
              Auto Change IME in meaning field (doesn&apos;t work on mobile)
              <input
                type="checkbox"
                checked={settings.autoChangeIME}
                onChange={() => {
                  setSettings("autoChangeIME", !settings.autoChangeIME);
                }}
              />
            </label>
            <label className="block text-balance">
              Filter data on input
              <input
                type="checkbox"
                checked={settings.wordBankAutoFilter}
                onChange={() => {
                  setSettings(
                    "wordBankAutoFilter",
                    !settings.wordBankAutoFilter,
                  );
                }}
              />
            </label>
            <label className="block text-balance">
              Max number of words to show (over 500 may slow down the page):
              <input
                type="number"
                className="text-left text-base outline-none"
                maxLength={4}
                min={100}
                max={9999}
                value={`${settings.showMax}`}
                onChange={(e) => {
                  const val =
                    parseInt(e.currentTarget.value.trim()) ??
                    DEFAULT_SETTINGS.showMax;
                  setSettings("showMax", Math.min(Math.max(1, val), 9999));
                }}
              />
            </label>
          </div>
        </>
      )}
    </>
  );
}
