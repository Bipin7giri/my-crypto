import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock Notes",
  description: "Track stock trades quickly on web & mobile.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
