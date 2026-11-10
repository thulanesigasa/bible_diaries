import {rootRole} from '../lib/site-domains.mjs';
import {connection} from 'next/server';
import "./globals.css";
import AppWrapper from "./AppWrapper";

export const metadata = {
  metadataBase:new URL(process.env.MAIN_SITE_URL||process.env.APP_ORIGIN||'https://biblediaries.co.za'),
  openGraph:{type:'website',siteName:'Bible Diaries',title:'Bible Diaries — Reflect. Share. Grow.',images:[{url:'/logo.png',alt:'Bible Diaries'}]},
  robots:{index:false,follow:false},
  title: "Bible Diaries - Sharing Reflections & Faith",
  description: "A premium spiritual space to share daily reflections, bible study diaries, and connect with other believers under categories of hope, faith, love, and wisdom.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" }
    ],
    apple: "/logo.png",
  },
};

export default async function RootLayout({ children }) {
  // A per-request CSP nonce cannot be attached to build-time static HTML.
  await connection();
  return (
    <html lang="en">
      <body>
        {rootRole()==='main'?children:<AppWrapper>{children}</AppWrapper>}
      </body>
    </html>
  );
}
