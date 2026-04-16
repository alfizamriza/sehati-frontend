import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke aplikasi SEHATI sesuai peran pengguna.",
  alternates: {
    canonical: "/auth",
  },
  openGraph: {
    title: "Masuk | SEHATI",
    description: "Masuk ke aplikasi SEHATI sesuai peran pengguna.",
    url: "/auth",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
