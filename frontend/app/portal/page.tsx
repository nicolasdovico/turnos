import Link from "next/link";

export default function PortalPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 sm:p-12 text-center">
      <div className="max-w-3xl rounded-3xl bg-white p-8 sm:p-12 shadow-2xl border border-slate-100">
        <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-800 mb-4 tracking-wide">
          ⚡ Marketplace & Plataforma SaaS
        </span>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
          Portal Global de Complejos Deportivos
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Encuentra tu club favorito, reserva turnos de pádel, fútbol y tenis en tiempo real, o digitaliza y administra tu propio complejo con subdominio dedicado.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/registro-club"
            className="rounded-2xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition"
          >
            🚀 Registrar mi Club (Prueba 14 Días)
          </Link>
          <a
            href="http://padelpro.localhost:3000"
            className="rounded-2xl bg-slate-100 px-7 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Ver Demo Club (Padel Pro)
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left border-t border-slate-100 pt-8">
          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="text-2xl mb-2">📅</div>
            <h3 className="font-bold text-slate-900 text-sm">Reservas & Agenda</h3>
            <p className="mt-1 text-xs text-slate-500">
              Grilla en tiempo real, bloqueos atómicos sin dobles reservas y cobro de señas.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="text-2xl mb-2">🍔</div>
            <h3 className="font-bold text-slate-900 text-sm">POS & Buffet</h3>
            <p className="mt-1 text-xs text-slate-500">
              Control de stock, comandas asociadas a turnos y arqueo de caja diario.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
            <div className="text-2xl mb-2">💡</div>
            <h3 className="font-bold text-slate-900 text-sm">Domótica IoT</h3>
            <p className="mt-1 text-xs text-slate-500">
              Encendido y apagado automatizado de luces de canchas según horarios de turnos.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
