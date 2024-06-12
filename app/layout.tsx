import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aire Claro",
  description: "Mejor información de calidad de aire para cuidar tu salud",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
