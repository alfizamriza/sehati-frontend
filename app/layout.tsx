import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "@/app/admin/admin.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "SEHATI",
    template: "%s | SEHATI",
  },
  description: "Platform sekolah hijau untuk absensi, pelanggaran, leaderboard, dan transaksi kantin.",
  applicationName: "SEHATI",
  keywords: ["SEHATI", "sekolah hijau", "absensi", "kantin", "leaderboard"],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "SEHATI",
    description: "Platform sekolah hijau untuk absensi, pelanggaran, leaderboard, dan transaksi kantin.",
    siteName: "SEHATI",
    locale: "id_ID",
    type: "website",
  },
  icons: {
    icon: "/branding/logo/logo-sehati.svg",
    shortcut: "/branding/logo/logo-sehati.svg",
    apple: "/branding/logo/logo-sehati.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <Script
          id="gtag-src"
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-QNGHQKZH24"
        />
        <Script id="gtag-inline" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QNGHQKZH24');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
