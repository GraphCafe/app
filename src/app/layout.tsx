import type { Metadata } from "next";
import { Commissioner, Crimson_Pro, Inconsolata } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { themeInitScript } from "@/lib/design/theme";
import "./globals.css";

const crimson = Crimson_Pro({
  variable: "--font-crimson",
  subsets: ["latin"],
  display: "swap",
});

const commissioner = Commissioner({
  variable: "--font-commissioner",
  subsets: ["latin"],
  display: "swap",
});

const inconsolata = Inconsolata({
  variable: "--font-inconsolata",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Graph.Cafe",
  description:
    "Connect any HTTP API, explore the JSON as a table, and save a chart your team can read.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${crimson.variable} ${commissioner.variable} ${inconsolata.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
