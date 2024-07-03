import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://aireclaro.com"),
  title: "Aire Claro",
  description: "Mejor información de calidad del aire para cuidar tu salud.",
  openGraph: {
    title: "Aire Claro",
    description: "Mejor información de calidad del aire para cuidar tu salud.",
    url: "https://aireclaro.com",
    type: "website",
    images: [
      {
        url: "https://aireclaro.com/aireclaro-logo.png",
        width: 800,
        height: 600,
        alt: "Aire Claro Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aire Claro",
    description: "Mejor información de calidad del aire para cuidar tu salud.",
    images: [
      {
        url: "https://aireclaro.com/aireclaro-logo.png",
        alt: "Aire Claro Logo",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Aire Claro</title>
        <meta
          name="description"
          content="Mejor información de calidad del aire para cuidar tu salud."
        />
        <meta property="og:title" content="Aire Claro" />
        <meta
          property="og:description"
          content="Mejor información de calidad del aire para cuidar tu salud."
        />
        <meta property="og:url" content="https://aireclaro.com" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://aireclaro.com/aireclaro-logo.png"
        />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="600" />
        <meta property="og:image:alt" content="Aire Claro Logo" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Aire Claro" />
        <meta
          name="twitter:description"
          content="Mejor información de calidad del aire para cuidar tu salud."
        />
        <meta
          name="twitter:image"
          content="https://aireclaro.com/aireclaro-logo.png"
        />
      </head>
      <body className={inter.className}>
        <div className="flex flex-col-reverse lg:h-screen lg:flex-row">
          {/* Navbar */}
          <div className="fixed bottom-0 z-10 w-full lg:static lg:bottom-auto lg:w-1/5">
            <Navbar />
          </div>
          {/* Content */}
          <div className="w-full flex-grow overflow-y-auto bg-gray-50 lg:w-4/5">
            {children}
          </div>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
