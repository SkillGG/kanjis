import React, { useEffect, useRef, useState } from "react";
import { type TagInfo } from "../list/kanjiStore";
import { log } from "@/utils/utils";

const TagEdit = ({
  name,
  data,
  apply,
  remove,
}: {
  name: string;
  data: TagInfo;
  apply: (d: { name: string; data: TagInfo }) => void;
  remove: () => void;
}) => {
  const [label, setLabel] = useState(name);
  const [desc, setDesc] = useState(data.description);

  const [textColor, setTextColor] = useState(
    !data.color ? "#ffffff" : data.color,
  );
  const [textColorTransparent, setTextColorTransparent] = useState(
    data.color === "transparent",
  );

  const [borderColor, setBorderColor] = useState(
    !data.border ? "#000000" : data.border,
  );
  const [borderColorTransparent, setBorderColorTransparent] = useState(
    data.border === "transparent",
  );

  const [bgColor, setBgColor] = useState(!data.bg ? "#000000" : data.bg);
  const [bgColorTransparent, setBgColorTransparent] = useState(
    !data.bg || data.bg === "transparent",
  );

  return (
    <React.Fragment>
      <input
        className="text-center outline-none"
        value={label}
        onChange={(e) => {
          setLabel(e.currentTarget.value);
        }}
      />
      <input
        onChange={(e) => {
          setDesc(e.currentTarget.value);
        }}
        className="text-center outline-none"
        value={desc}
      />
      <div className="flex flex-col items-center">
        <input
          type="color"
          disabled={textColorTransparent}
          value={textColor}
          onChange={(e) => setTextColor(e.currentTarget.value)}
        />
        <label>
          Transparent{" "}
          <input
            type="checkbox"
            checked={textColorTransparent}
            onChange={() => {
              setTextColorTransparent((p) => !p);
            }}
          />
        </label>
      </div>
      <div className="flex flex-col items-center">
        <input
          type="color"
          disabled={borderColorTransparent}
          value={borderColor}
          onChange={(e) => setBorderColor(e.currentTarget.value)}
        />
        <label>
          Transparent{" "}
          <input
            type="checkbox"
            checked={borderColorTransparent}
            onChange={() => {
              setBorderColorTransparent((p) => !p);
            }}
          />
        </label>
      </div>
      <div className="flex flex-col items-center">
        <input
          type="color"
          disabled={bgColorTransparent}
          value={bgColor}
          onChange={(e) => setBgColor(e.currentTarget.value)}
        />
        <label>
          Transparent{" "}
          <input
            type="checkbox"
            checked={bgColorTransparent}
            onChange={() => {
              setBgColorTransparent((p) => !p);
            }}
          />
        </label>
      </div>
      <div className="flex flex-col">
        <button
          onClick={() => {
            apply({
              name: label,
              data: {
                description: desc,
                bg: bgColorTransparent ? "transparent" : bgColor,
                border: borderColorTransparent ? "transparent" : borderColor,
                color: textColorTransparent ? "transparent" : textColor,
              },
            });
          }}
        >
          SAVE
        </button>
        <button
          onClick={() => {
            remove();
          }}
        >
          DELETE
        </button>
      </div>
    </React.Fragment>
  );
};

export const TagEditor = ({
  close,
  state,
  tags,
  setTags,
}: {
  state: "open" | "closed";
  close: () => void;
  tags: Record<string, TagInfo>;
  setTags: (tags: Record<string, TagInfo>) => void;
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (state === "open") {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [state]);

  return (
    <>
      <dialog
        className="rounded-xl border-2 border-[white] p-4 backdrop:h-full backdrop:w-full backdrop:bg-slate-900 backdrop:opacity-70"
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
            close();
          }
        }}
      >
        <div className="text-xl">Tag Editor</div>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "3fr 3fr 1fr 1fr 1fr min-content",
          }}
        >
          <div className="text-center">Name</div>
          <div className="text-center">Description</div>
          <div className="text-center">Text color</div>
          <div className="text-center">Border color</div>
          <div className="text-center">Background color</div>
          <div></div>
          {Object.entries(tags).map(([name, data]) => {
            return (
              <TagEdit
                data={data}
                name={name}
                key={name}
                remove={() => {
                  log`Removing ${name} from ${tags}`;
                  const NTags = tags;
                  delete NTags[name];
                  log`${NTags}`;
                  setTags(NTags);
                }}
                apply={(d) => {
                  if (name === d.name) {
                    setTags({ ...tags, [name]: d.data });
                  } else {
                    const NTags = {
                      ...tags,
                      [d.name]: d.data,
                    };
                    delete NTags[name];
                    log`${NTags}`;
                    setTags(NTags);
                  }
                }}
              />
            );
          })}
        </div>
      </dialog>
    </>
  );
};
