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
        <div className="flex h-screen">
          <div className="w-1/5">
            <Navbar />
          </div>
          <div className="w-4/5 bg-slate-50">{children}</div>
        </div>
      </body>
    </html>
  );
}
