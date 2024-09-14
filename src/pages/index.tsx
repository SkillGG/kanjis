import Head from "next/head";
import Link from "next/link";

// import { api } from "@/utils/api";

export default function Home() {
  // const hello = api.post.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>Kanji app</title>
        <meta name="description" content="An app to learn kanjis!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Link href={"/list"}>Kanji progress tracking list</Link>
    </>
  );
}
