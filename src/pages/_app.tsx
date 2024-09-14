import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";

import { api } from "@/utils/api";

import "@/styles/globals.css";
import { LocalStorageProvider } from "./localStorageProvider";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <LocalStorageProvider>
      <div className={GeistSans.className}>
        <Component {...pageProps} />
      </div>
    </LocalStorageProvider>
  );
};

export default api.withTRPC(MyApp);
