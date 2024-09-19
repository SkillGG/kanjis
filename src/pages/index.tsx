import { useKanjiStorage } from "@/components/list/kanjiStorage";
import { randomEndWeighedInt } from "@/utils/utils";
import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";

// import { api } from "@/utils/api";

export default function Home() {
  // const hello = api.post.hello.useQuery({ text: "from tRPC" });

  useKanjiStorage();

  useEffect(() => {
    if (typeof window !== "undefined") window.wrN = randomEndWeighedInt;
  }, []);

  return (
    <>
      <Head>
        <title>Kanji app</title>
        <meta name="description" content="An app to learn kanjis!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="text-2xl">Kanji learning app hub</div>
        <Link
          href={"/list"}
          className="mt-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] underline hover:bg-slate-500"
        >
          Kanji progress tracking list
        </Link>
        <Link
          href={"/draw"}
          className="mt-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] underline hover:bg-slate-500"
        >
          Kanji drawing app
        </Link>
        <Link
          href={"/wordbank"}
          className="mt-2 cursor-pointer rounded-xl border-2 border-slate-400 bg-slate-600 p-2 text-[lime] underline hover:bg-slate-500"
        >
          Edit the word bank
        </Link>
      </div>
    </>
  );
}
