import type { Metadata } from "next";
import GuruLayoutClient from "./GuruLayoutClient";

export const metadata: Metadata = {
  title: "Guru",
  description: "Dashboard dan layanan guru di aplikasi SEHATI.",
};

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  return <GuruLayoutClient>{children}</GuruLayoutClient>;
}
