"use client";

import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";

import { api } from "@/utils/api";

import "@/styles/globals.css";
import { LocalStorageProvider } from "@/components/localStorageProvider";
import { useAppStore } from "@/appStore";

import localFont from "next/font/local";
import { LoadingIcon } from "@/components/wordbank/loadingIcon";

export const strokeOrderFont = localFont({
  src: "./KSOF.ttf",
  variable: "--KSOF",
});

const MyApp: AppType = ({ Component, pageProps }) => {
  const db = useAppStore((d) => d.idb);
  return (
    <>
      {db ? (
        <LocalStorageProvider surpressWarnings>
          <div
            className={`${GeistSans.className} ${strokeOrderFont.className}`}
          >
            <Component {...pageProps} />
          </div>
        </LocalStorageProvider>
      ) : (
        <div className="mt-2 flex content-center justify-center">
          Connecting to local DB
          <LoadingIcon
            width={3}
            className="ml-3 inline-block"
            accent="lime"
            spinner="transparent"
            size={20}
          />
        </div>
      )}
    </>
  );
};

export default api.withTRPC(MyApp);
