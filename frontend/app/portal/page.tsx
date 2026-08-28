export default function PortalPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl rounded-2xl bg-white p-10 shadow-xl border border-slate-100">
        <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800 mb-4">
          Marketplace Central
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Portal Global de Complejos Deportivos
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Encuentra tu club favorito, reserva turnos de pádel, fútbol y tenis en tiempo real, o gestiona tu propio complejo deportivo.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="http://padelpro.localhost:3000"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-emerald-700 transition"
          >
            Ver Demo Club (Padel Pro)
          </a>
          <button className="rounded-xl bg-slate-100 px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-200 transition">
            Registrar mi Club
          </button>
        </div>
      </div>
    </main>
  );
}
