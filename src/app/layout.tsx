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
  title: "Graph.Cafe — Small graphs, served warm",
  description:
    "Create and lightly edit small node graphs with a cozy café aesthetic. Templates, drag-and-connect, and rename on the fly.",
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
