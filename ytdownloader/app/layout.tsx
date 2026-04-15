import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ytdownloader",
  description: "YouTube URL to MP4 download streaming app with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
