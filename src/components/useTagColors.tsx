import { useEffect } from "react";

import defaultWordBank from "@/pages/wordbank/wordbank.json";
import { type TagInfo, useKanjiStore } from "./list/kanjiStore";
import { LS_KEYS, useLocalStorage } from "./localStorageProvider";

export const useTagColors = () => {
  const LS = useLocalStorage();

  const { tagColors, setTagColors } = useKanjiStore((s) => ({
    tagColors: s.tagColors,
    setTagColors: s.setTagColors,
  }));

  useEffect(() => {
    const tColors = defaultWordBank.tags as Record<string, TagInfo>;

    if (!tagColors) {
      // first edit
      const lsColors =
        LS.getObject<Record<string, TagInfo>>(LS_KEYS.tag_colors) ?? {};
      setTagColors({ ...tColors, ...lsColors });
    } else {
      let restored = false;
      const mix = { ...tagColors };
      for (const [name, obj] of Object.entries(tColors)) {
        if (!(name in mix)) {
          restored = true;
          mix[name] = obj;
        }
      }
      if (restored) {
        setTagColors(mix);
      } else {
        LS.set(LS_KEYS.tag_colors, mix);
      }
    }
  }, [LS, setTagColors, tagColors]);

  return { tagColors, setTagColors };
};
