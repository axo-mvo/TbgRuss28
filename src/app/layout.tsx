import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buss 2028 Fellesmøte",
  description: "Diskusjonsapp for fellesmøte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body className="bg-warm-white text-text-primary font-sans antialiased min-h-dvh">
        {children}
      </body>
    </html>
  );
}
