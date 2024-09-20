import { useEffect, useState } from "react";

import kanjiCSS from "./list/list.module.css";
import { log } from "@/utils/utils";

const POPUP_SHOW_TIME = 2000;

type ClosePopupCallback = (close: () => void) => React.ReactNode;

export const usePopup = () => {
  const [popup, setPopup] = useState<
    | {
        text: ClosePopupCallback | React.ReactNode;
        time?: number;
        borderColor?: string;
        color?: string;
      }
    | {
        text: ClosePopupCallback;
        time: "user";
        borderColor?: string;
        color?: string;
      }
    | null
  >(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (popup === null) return;
    log`Opening popup`;
    setPopupOpen(true);

    if (popup.time !== "user") {
      log`Activating auto-close after ${popup.time ?? POPUP_SHOW_TIME}`;
      const oT = setTimeout(() => {
        log`Auto-closing popup`;
        setPopupOpen(false);
      }, popup.time ?? POPUP_SHOW_TIME);
      return () => {
        log`Clearing popup auto-close`;
        clearTimeout(oT);
      };
    }
  }, [popup]);

  useEffect(() => {
    if (!popupOpen) {
      log`Removing PopupDiv in 200`;
      const cT = setTimeout(() => {
        log`Removing PopupDiv`;
        setPopup(null);
      }, 200);
      return () => {
        log`Discarding removing of PopupDiv`;
        clearTimeout(cT);
      };
    }
  }, [popupOpen]);

  return {
    setPopup,
    popup: (
      <>
        {popup && (
          <div
            className={kanjiCSS.popup}
            style={{
              "--borderColor": popup.borderColor ?? "green",
              "--textColor": popup.color ?? "white",
            }}
            data-open={popupOpen ? "open" : "closed"}
          >
            <div>
              {typeof popup.text == "function"
                ? popup.text(() => setPopupOpen(false))
                : popup.text}
            </div>
          </div>
        )}
      </>
    ),
  };
};
