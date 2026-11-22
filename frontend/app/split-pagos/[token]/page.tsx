import type { Metadata } from "next";
import SplitPagoClient from "@/components/SplitPagoClient";

export const metadata: Metadata = {
  title: "Pago de Cuota | Split Payment - TurnosFlow",
  description: "Aboná tu parte del turno deportivo de forma rápida y segura.",
  robots: {
    index: false,
    follow: false,
  },
};

interface PageProps {
  params: {
    token: string;
  };
}

export default function SplitPagoPage({ params }: PageProps) {
  return <SplitPagoClient token={params.token} />;
}
