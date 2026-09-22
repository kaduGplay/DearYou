import type { Metadata } from "next";

export const metadata: Metadata = { title: "DearYou" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
