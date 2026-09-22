import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", style: ["normal", "italic"] });

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} ${playfair.variable} min-h-screen antialiased`}>{children}</div>;
}
