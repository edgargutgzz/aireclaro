import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";

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
        <div className="flex h-screen w-full flex-col-reverse lg:flex-row">
          {/* Navbar */}
          <div className="w-full lg:w-1/5">
            <Navbar />
          </div>
          {/* Content */}
          <div className="w-full flex-grow bg-slate-200 lg:w-4/5">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
