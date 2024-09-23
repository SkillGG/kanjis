import React, { useEffect, useRef, useState } from "react";
import { type TagInfo } from "../../appStore";

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

  const curBGColor = bgColorTransparent ? "transparent" : bgColor;
  const curBorderColor = borderColorTransparent ? "transparent" : borderColor;
  const curTextColor = textColorTransparent ? "transparent" : textColor;

  return (
    <React.Fragment>
      <div className="col-[1/span_4] flex flex-wrap gap-x-2 sm:flex-nowrap lg:col-span-2">
        <input
          className="span col-span-2 min-w-10 flex-grow text-center outline-none"
          value={label}
          style={{ borderBottomStyle: "dotted" }}
          onChange={(e) => {
            setLabel(e.currentTarget.value);
          }}
        />
        <input
          onChange={(e) => {
            setDesc(e.currentTarget.value);
          }}
          style={{ borderBottomStyle: "dotted" }}
          className="col-span-2 min-w-10 flex-grow text-center outline-none"
          value={desc}
        />
      </div>
      <div className="flex flex-col items-center lg:col-[3]">
        <input
          type="color"
          disabled={textColorTransparent}
          value={textColor}
          onChange={(e) => setTextColor(e.currentTarget.value)}
        />
        <label className="text-center">
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
      <div className="flex flex-col items-center lg:col-[4]">
        <input
          type="color"
          disabled={borderColorTransparent}
          value={borderColor}
          onChange={(e) => setBorderColor(e.currentTarget.value)}
        />
        <label className="text-center">
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
      <div className="flex flex-col items-center lg:col-[5]">
        <input
          type="color"
          disabled={bgColorTransparent}
          value={bgColor}
          onChange={(e) => setBgColor(e.currentTarget.value)}
        />
        <label className="text-center">
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
      <div className="flex flex-col justify-center gap-y-2 lg:col-[6]">
        <button
          disabled={
            !(
              name !== label ||
              data.description !== desc ||
              data.bg !== curBGColor ||
              data.border !== curBorderColor ||
              data.color !== curTextColor
            )
          }
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
            if (name !== label) {
              setLabel(name);
            }
          }}
          className="save-tag-btn border-[lime] disabled:border-[gray] disabled:text-[gray]"
        >
          SAVE
        </button>
        <button
          onClick={() => {
            remove();
          }}
          className="border-[red]"
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
        className="relative max-h-[90vh] flex-col rounded-xl border-2 border-[white] p-4 backdrop:h-full backdrop:w-full backdrop:bg-slate-900 backdrop:opacity-70"
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
        <button
          className="absolute right-[0.5rem] top-[0.5rem] m-0 flex h-[1.2rem] w-[1.2rem] items-center justify-center rounded-[50%] border-2 border-[red] p-0 text-[red] hover:bg-[red]"
          onClick={close}
        ></button>
        <div className="text-xl">Tag Editor</div>
        <div className="overflow-scroll">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 overflow-scroll lg:grid-cols-[3fr_3fr_1fr_1fr_1fr_min-content]">
            <div className="col-[1/span_4] flex flex-wrap gap-x-2 sm:flex-nowrap lg:col-span-2">
              <div className="flex-grow basis-[350px] text-center">Name</div>
              <div className="flex-grow basis-[350px] text-center">
                Description
              </div>
            </div>
            <div className="flex items-center justify-center text-center">
              Text color
            </div>
            <div className="flex items-center justify-center text-center">
              Border color
            </div>
            <div className="flex items-center justify-center text-center">
              Background color
            </div>
            <hr className="col-[1/span_4] border-2 lg:col-[1/span_6]" />
            {Object.entries(tags).map(([name, data]) => {
              return (
                <React.Fragment key={name}>
                  <TagEdit
                    data={data}
                    name={name}
                    remove={() => {
                      const NTags = tags;
                      delete NTags[name];
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
                        setTags(NTags);
                      }
                    }}
                  />
                  <hr className="col-[1/span_4] border-2 lg:col-[1/span_6]" />
                </React.Fragment>
              );
            })}
            <div className="col-[1/span_4] text-center lg:col-[1/span_6]">
              <button
                className="text-xl"
                onClick={() => {
                  setTags({ ...tags, newTag: { description: "" } });
                }}
              >
                ADD
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
};
