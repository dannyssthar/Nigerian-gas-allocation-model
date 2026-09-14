import type { Metadata } from "next";
import { Urbanist, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist",
  weight: ["600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DJN · Gas Allocation Model",
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
      className={`${urbanist.variable} ${manrope.variable} ${jetbrains.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}