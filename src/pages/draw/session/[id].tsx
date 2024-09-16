import { type DrawSessionData } from "@/components/draw/drawSession";
import { useLocalStorage } from "@/components/localStorageProvider";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function DrawSession() {
  const router = useRouter();

  const LS = useLocalStorage();

  const { id } = router.query;

  const [sessionData, setSessionData] = useState<DrawSessionData | null>(null);

  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (id === undefined) return;
      console.log("Loading data");
      if (typeof id !== "string") {
        setLoadingError("Wrong session id!");
        return;
      }
      const sD = await LS.db?.get("draw", id);
      console.log("SD", sD);
      if (!sD)
        return setLoadingError(`Could not load session data for session#${id}`);
      setSessionData(sD);
    })();
  }, [LS, id]);

  if (!sessionData && !loadingError) {
    return <>Loading...</>;
  }

  if (loadingError) {
    return (
      <span>
        There has been an error loading session data!
        <br />
        {loadingError}
      </span>
    );
  }

  if (!sessionData) {
    return (
      <span>Session data is corrupted! Try again or start a new session!</span>
    );
  }

  if (!sessionData.open) {
    return <span>This session has already been closed!</span>;
  }

  return (
    <>
      <div>Cur sesh: {id}</div>
      <div>
        {sessionData.sessionKanjis.map((k) => (
          <span key={k}>{k}</span>
        ))}
      </div>
      <div>
        <Link
          className="text-red-500"
          href="/draw"
          onClick={async () => {
            await LS.db?.put("draw", { ...sessionData, open: false });
          }}
        >
          Close session
        </Link>
      </div>
    </>
  );
}
