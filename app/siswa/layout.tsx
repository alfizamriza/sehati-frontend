import type { Metadata } from "next";
import SiswaLayoutClient from "./SiswaLayoutClient";

export const metadata: Metadata = {
  title: "Siswa",
  description: "Fitur siswa SEHATI untuk dashboard, absensi, profil, dan riwayat.",
};

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  return <SiswaLayoutClient>{children}</SiswaLayoutClient>;
}
