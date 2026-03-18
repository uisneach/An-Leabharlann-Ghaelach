import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "./AuthContext";
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
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap" rel="stylesheet" />
      
      <title>An Leabharlann Ghaelach</title>
      <link rel="icon" type="image/x-icon" href="https://uisneac.com/assets/Gold-Celtic-Design.png" />
      <meta name="author" content="Ogmios" />
      <link rel="canonical" href="https://uisneac.com" />
      <meta property="og:title" content="An Leabharlann Ghaelach - Uisneac" />
      <meta property="og:site_name" content="An Leabharlann Ghaelach - Uisneac" />
      <meta property="og:description" content="A digital library of Irish and Celtic source texts." />
      <meta property="og:image" content="https://uisneac.com/assets/Uisneac.webp" />
      <meta property="og:url" content="https://leabharlann.uisneac.com" />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ogmios" />
      <meta name="twitter:title" content="An Leabharlann Ghaelach - Uisneac" />
      <meta name="twitter:creator" content="Ogmios" />
      <meta name="twitter:description" content="A digital library of Irish and Celtic source texts." />
      <meta name="twitter:image" content="https://uisneac.com/assets/Uisneac.webp" />
    </head>

    <body className={`${bunchlo.variable} antialiased`} >
      <AuthProvider>
        {children}
      </AuthProvider>
    </body>
    </html>
  );
}