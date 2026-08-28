interface TenantPageProps {
  params: {
    subdomain: string;
  };
}

export default function TenantPage({ params }: TenantPageProps) {
  const { subdomain } = params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-slate-900 text-white">
      <div className="max-w-2xl rounded-2xl bg-slate-800 p-10 shadow-2xl border border-slate-700">
        <span className="inline-block rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-1.5 text-sm font-semibold mb-4">
          Club: {subdomain}
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl capitalize">
          Complejo {subdomain}
        </h1>
        <p className="mt-4 text-lg text-slate-300">
          Sitio oficial y portal de reservas de canchas en línea. Selecciona tu horario disponible y juega hoy.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <button className="rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg hover:bg-emerald-400 transition">
            Reservar Turno
          </button>
        </div>
      </div>
    </main>
  );
}
