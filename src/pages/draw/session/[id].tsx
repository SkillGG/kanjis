import { useLocalStorage } from "@/components/localStorageProvider";
import Link from "next/link";
import { useRouter } from "next/router";

export default function DrawSession() {
  const router = useRouter();

  const LS = useLocalStorage();

  const { id } = router.query;

  if (typeof id !== "string") {
    return <>???</>;
  }

  return (
    <>
      <div>Cur sesh: {id}</div>
      <div>
        <Link
          href="/draw"
          onClick={() => {
            LS.set("draw_session", "");
          }}
        >
          Abort session
        </Link>
      </div>
    </>
  );
}
