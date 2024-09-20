import { useCallback, useEffect, useState } from "react";

export default function Home() {
  const [events, setEvents] = useState<string[]>([]);

  const addEvent = useCallback(
    (t: string, ev: string) => {
      setEvents((p) =>
        [...p, `[${t}] ${ev}`].slice(Math.max(0, p.length - 50)),
      );
    },
    [setEvents],
  );

  const handleWindowKeydown = useCallback(
    (ev: KeyboardEvent) => {
      addEvent("Window", `code: ${ev.code}, compose: ${ev.isComposing}`);
    },
    [addEvent],
  );

  const [val, setVal] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleWindowKeydown);
      return () => {
        window.removeEventListener("keydown", handleWindowKeydown);
      };
    }
  }, [handleWindowKeydown]);

  useEffect(() => {
    addEvent("effect.val", `value: ${val}`);
  }, [addEvent, val]);

  return (
    <>
      <input
        onKeyDown={(ev) => {
          addEvent(
            "input.okd",
            `code: ${ev.code}, compose: ${ev.nativeEvent.isComposing}`,
          );
        }}
        onKeyUp={(ev) =>
          addEvent(
            "input.okd",
            `code: ${ev.code}, compose: ${ev.nativeEvent.isComposing}`,
          )
        }
        onCompositionStart={(e) => {
          addEvent("input.compStart", `data: ${e.data}`);
        }}
        onCompositionEnd={(e) => {
          addEvent("input.compEnd", `data: ${e.data}`);
        }}
        onCompositionUpdate={(e) => {
          addEvent("input.compUpdate", `data: ${e.data}`);
        }}
        onInput={(e) => {
          const value = e.currentTarget.value;
          addEvent("input.input", `value: ${value}`);
          setVal(value);
        }}
        onChange={(e) => {
          const value = e.currentTarget.value;
          addEvent("input.change", `value: ${value}`);
        }}
        value={val}
      />
      {events.map((ev, i) => (
        <div key={i}>{ev}</div>
      ))}
    </>
  );
}
