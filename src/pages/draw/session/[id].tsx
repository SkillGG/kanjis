import { type DrawSessionData } from "@/components/draw/drawSession";
import { Quizlet } from "@/components/draw/Quizlet";
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
      if (id === undefined || !LS.idb) return;
      if (typeof id !== "string") {
        setLoadingError("Wrong session id!");
        return;
      }
      const sD = await LS.idb.get("draw", id);
      if (!sD)
        return setLoadingError(
          `Could not load session data for session "${id}"`,
        );
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
      <Link
        href="/draw"
        className="block w-fit bg-transparent p-2 underline sm:fixed"
      >
        Go back
      </Link>
      <div className="mx-[auto] w-[80vw]">
        <div className="text-center text-lg">{sessionData.sessionID}</div>
        <Quizlet
          session={sessionData}
          commitResult={async (result) => {
            if (!LS?.idb) throw new Error("No database connection!");
            if (!sessionData) throw new Error("Session Data not found!");
            const newSD: DrawSessionData = sessionData
              ? {
                  ...sessionData,
                  sessionResults: [...sessionData?.sessionResults, result],
                }
              : sessionData;
            await LS.idb.put("draw", newSD);
            setSessionData(() => newSD);
            return newSD;
          }}
        />
      </div>
    </>
  );
}
