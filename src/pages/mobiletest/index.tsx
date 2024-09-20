import { useEffect, useState } from "react";

export default function Home() {
  const [events, setEvents] = useState<string[]>([]);
  const handleKeydown = (e: KeyboardEvent) => {
    setEvents((p) =>
      [...p, `code:${e.code} compose:${e.isComposing}`].slice(
        Math.max(0, p.length - 15),
      ),
    );
  };
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeydown);
      return () => {
        window.removeEventListener("keydown", handleKeydown);
      };
    }
  }, []);

  return (
    <>
      <input />
      {events.map((ev, i) => (
        <div key={i}>{ev}</div>
      ))}
    </>
  );
}
