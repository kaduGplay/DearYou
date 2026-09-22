import "./mobile.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import MetaPixel from "@/components/analytics/MetaPixel";

export const metadata: Metadata = { title: "DearYou" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}<Suspense fallback={null}><MetaPixel /></Suspense></body>
    </html>
  );
}
