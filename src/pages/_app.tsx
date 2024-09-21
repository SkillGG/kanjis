"use client";

import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";

import { api } from "@/utils/api";

import "@/styles/globals.css";
import { LocalStorageProvider } from "@/components/localStorageProvider";
import { useAppStore } from "@/appStore";

import localFont from "next/font/local";

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
        <>Connecting to local DB...</>
      )}
    </>
  );
};

export default api.withTRPC(MyApp);
