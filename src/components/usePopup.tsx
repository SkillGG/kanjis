import { useEffect, useState } from "react";

import kanjiCSS from "./list/list.module.css";

const POPUP_SHOW_TIME = 2000;

export const usePopup = () => {
  const [popup, setPopup] = useState<
    | {
        text: React.ReactNode;
        time?: number;
        borderColor?: string;
        color?: string;
      }
    | {
        text: (close: () => void) => React.ReactNode;
        time: "user";
        borderColor?: string;
        color?: string;
      }
    | null
  >(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    if (popup === null) return;
    setPopupOpen(true);
    if (popup.time !== "user") {
      const oT = setTimeout(() => {
        setPopupOpen(false);
      }, popup.time ?? POPUP_SHOW_TIME);
      return () => {
        clearTimeout(oT);
      };
    }
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

  return {
    setPopup,
    popup,
    Popup: () => (
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
