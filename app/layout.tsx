import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

/**
 * Two faces, one temperament. Space Grotesk carries display type: geometric
 * skeleton, a little character in the terminals, reads as engineered rather
 * than decorated. Manrope carries everything else — body, labels, and the
 * numbers, where its tabular-figures feature does the one job the retired
 * monospace was there for. A data product does not need to dress as a
 * terminal to be taken seriously.
 */
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  weight: ["500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NGAM · Nigeria Gas Allocation Model",
  description:
    "Decision-support tool for siting AI data centres in Nigeria. Values one MMBtu of gas across compute, grid power, fertiliser and LNG export.",
};

/**
 * Applied before first paint so the page never flashes the wrong theme.
 * Inlined as a string because it must run ahead of React hydration, and
 * wrapped in try/catch because storage is blocked inside sandboxed frames.
 */
const themeScript = `
(function(){
  try{
    var t = localStorage.getItem('djn-theme');
    if(!t){ t = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'; }
    document.documentElement.dataset.theme = t;
  }catch(e){ document.documentElement.dataset.theme = 'light'; }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${grotesk.variable} ${manrope.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}