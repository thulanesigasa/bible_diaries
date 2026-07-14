import "./globals.css";
import AppWrapper from "./AppWrapper";

export const metadata = {
  title: "bible_diaries - Sharing Reflections & Faith",
  description: "A premium spiritual space to share daily reflections, bible study diaries, and connect with other believers under categories of hope, faith, love, and wisdom.",
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
