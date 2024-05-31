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
      <body className={`${inter.className} flex h-screen flex-col lg:flex-row`}>
        <Navbar />
        <div className="flex-grow overflow-y-auto bg-gray-50">{children}</div>
      </body>
    </html>
  );
}
