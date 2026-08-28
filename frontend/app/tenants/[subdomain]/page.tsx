import GrillaHoraria from "@/components/GrillaHoraria";

interface TenantPageProps {
  params: {
    subdomain: string;
  };
}

export default function TenantPage({ params }: TenantPageProps) {
  const { subdomain } = params;

  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-10 text-center">
        <span className="inline-block rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-1 text-sm font-semibold mb-3">
          Club: {subdomain}
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight capitalize">
          Complejo {subdomain}
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Portal oficial de reservas de canchas en línea. Bloqueos atómicos en tiempo real.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <GrillaHoraria
          canchaId={1}
          canchaNombre="Cancha 1 - Césped Sintético"
          deporte="Pádel"
          subdomain={subdomain}
        />
      </div>
    </main>
  );
}
