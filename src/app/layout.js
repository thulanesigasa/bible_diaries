import "./globals.css";
import AppWrapper from "./AppWrapper";

export const metadata = {
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

export default function RootLayout({ children }) {
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
