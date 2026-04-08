import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SEHATI - Sekolah Hijau dan Anti Plastik",
  description: "Sekolah Hijau dan Anti Plastik",
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
    <html lang="en">
      <head>
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-QNGHQKZH24"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-QNGHQKZH24');
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
