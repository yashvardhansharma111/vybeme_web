import type { Metadata } from "next";
import { Figtree, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || 'https://app.vybeme.in';

export const metadata: Metadata = {
  metadataBase: new URL(WEB_BASE),
  title: "vybeme. — Find people for your plans",
  description: "Find people for your plans vybeme.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${plusJakarta.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
