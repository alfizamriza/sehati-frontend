import type { Metadata } from "next";
import KantinLayoutClient from "./KantinLayoutClient";

export const metadata: Metadata = {
  title: "Kantin",
  description: "Dashboard dan transaksi kantin pada aplikasi SEHATI.",
};

export default function KantinLayout({ children }: { children: React.ReactNode }) {
  return <KantinLayoutClient>{children}</KantinLayoutClient>;
}
