import {connection} from 'next/server';
import "./globals.css";
import AppWrapper from "./AppWrapper";

export const metadata = {
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
        <AppWrapper>
          {children}
        </AppWrapper>
      </body>
    </html>
  );
}
