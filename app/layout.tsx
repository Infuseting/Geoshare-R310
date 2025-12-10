import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LeftPanel from "../components/ui/left-panel";
import { LeftPanelProvider } from "../components/ui/left-panel-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "geoshare",
  description: "App to see infrastructure and get informations about natural disease.",
  icons: {
    icon: [
      { url: '/logo.webp', type: 'image/webp' },
      { url: '/logo.webp', sizes: '32x32', type: 'image/webp' },
      { url: '/logo.webp', sizes: '16x16', type: 'image/webp' },
    ],
    apple: '/logo.webp',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
          {children}
      </body>
    </html>
  );
}
