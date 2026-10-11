import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Graph.Cafe — BYO APIs, served warm",
  description:
    "Connect any HTTP API, explore JSON as tables, and build small reports with café-flavored UX.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full font-[family-name:var(--font-nunito)] text-[var(--cafe-espresso)]">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
