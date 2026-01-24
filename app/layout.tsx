import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const bunchlo = localFont({
  src: [
    {
      path: "../public/fonts/bunchlo/bungc.woff2",  // Regular (Bunchló)
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/bunchlo/bunigc.woff2",  // Italic (Bunchló Iodlach)
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/bunchlo/buntgc.woff2",  // Bold (Bunchló Trom)
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/bunchlo/bundgc.woff2",  // Extra bold/black (Bunchló Dubh)
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-bunchlo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "An Leabharlann Ghaelach",
  description: "The Irish and Celtic Library",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
      <body
        className={`
          ${bunchlo.variable}
          antialiased
        `}
      >
        {children}
      </body>
    </html>
  );
}