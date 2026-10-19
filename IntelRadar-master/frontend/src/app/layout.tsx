import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "IntelRadar | Competitor intelligence",
  description:
    "Track competitors, pricing, customer sentiment and market moves in one place.",
};

// Applies the saved theme before first paint so dark mode never flashes light.
const THEME_SCRIPT = `try{if(localStorage.getItem("intelradar-theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The blocking theme script below adds a `dark` class to <html> before
  // hydration so dark mode never flashes light. That intentional class
  // difference must not be reported as a hydration mismatch.
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
