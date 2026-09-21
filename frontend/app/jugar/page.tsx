"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, MapPin, Navigation, Trophy, Sparkles, ArrowRight, ExternalLink, Calendar, Filter } from "lucide-react";

interface ComplejoCercano {
  id: number;
  uuid: string;
  nombre: string;
  subdominio: string;
  deporte_principal: string;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  latitud: number;
  longitud: number;
  distancia_km: number;
  deportes_disponibles: string[];
  canchas?: any[];
}

const API_BASE = typeof window !== "undefined" ? "/api" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api");

export default function JugarMarketplacePage() {
  const [isPreview, setIsPreview] = useState<boolean>(false);
  // Operativo por defecto. Cuando se requiera cortar el acceso público, basta con definir NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE="false"
  const isMarketplaceDisabled = process.env.NEXT_PUBLIC_ENABLE_PLAYER_MARKETPLACE === "false";

  // Search state
  const [deporte, setDeporte] = useState<string>("todos");
  const [radioKm, setRadioKm] = useState<number>(20);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [complejos, setComplejos] = useState<ComplejoCercano[]>([]);
  const [selectedClub, setSelectedClub] = useState<ComplejoCercano | null>(null);
  const [baseDomain, setBaseDomain] = useState<string>("localhost:8080");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("preview") === "true") {
        setIsPreview(true);
      }
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : "";
      if (hostname.endsWith("turnos.com")) {
        setBaseDomain("turnos.com");
      } else {
        setBaseDomain(`localhost${port || ":8080"}`);
      }
    }
  }, []);

  const isMarketplaceActive = !isMarketplaceDisabled || isPreview;

  // Auto-fetch complexes when coords or filters change
  const fetchClubesCercanos = async (lat: number, lng: number, radio: number, deporteFiltro: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const deporteQuery = deporteFiltro !== "todos" ? `&deporte=${encodeURIComponent(deporteFiltro)}` : "";
      const res = await fetch(
        `${API_BASE}/complejos/cercanos?lat=${lat}&lng=${lng}&radio_km=${radio}${deporteQuery}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al buscar complejos cercanos.");
      }
      const list: ComplejoCercano[] = data.data || [];
      setComplejos(list);
      if (list.length > 0) {
        setSelectedClub(list[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarUbicacion = () => {
    if (
      typeof window === "undefined" ||
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      const defaultCoords = { lat: -34.603722, lng: -58.381592 };
      setUserCoords(defaultCoords);
      fetchClubesCercanos(defaultCoords.lat, defaultCoords.lng, radioKm, deporte);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        fetchClubesCercanos(coords.lat, coords.lng, radioKm, deporte);
      },
      (err) => {
        const defaultCoords = { lat: -34.603722, lng: -58.381592 };
        setUserCoords(defaultCoords);
        fetchClubesCercanos(defaultCoords.lat, defaultCoords.lng, radioKm, deporte);
        setErrorMsg("Ubicación del dispositivo no disponible. Mostrando clubes de la región.");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Carga inmediata de clubes abonados al iniciar
  useEffect(() => {
    if (isMarketplaceActive) {
      const defaultCoords = { lat: -34.603722, lng: -58.381592 };
      setUserCoords(defaultCoords);
      fetchClubesCercanos(defaultCoords.lat, defaultCoords.lng, radioKm, deporte);

      // Si el navegador soporta geolocalización, solicitamos actualización en segundo plano
      if (
        typeof window !== "undefined" &&
        navigator.geolocation &&
        typeof navigator.geolocation.getCurrentPosition === "function"
      ) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserCoords(coords);
            fetchClubesCercanos(coords.lat, coords.lng, radioKm, deporte);
          },
          () => {
            // Se mantiene la vista por defecto sin interrumpir
          },
          { timeout: 6000, enableHighAccuracy: true }
        );
      }
    }
  }, [isMarketplaceActive]);

  const handleFilterChange = (nuevoDeporte: string, nuevoRadio: number) => {
    setDeporte(nuevoDeporte);
    setRadioKm(nuevoRadio);
    const coords = userCoords || { lat: -34.603722, lng: -58.381592 };
    fetchClubesCercanos(coords.lat, coords.lng, nuevoRadio, nuevoDeporte);
  };

  const getClubReservationUrl = (subdomain: string) => {
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol;
      return `${protocol}//${subdomain}.${baseDomain}/?ref=marketplace`;
    }
    return `http://${subdomain}.localhost:8080/?ref=marketplace`;
  };

  // ==========================================
  // VISTA OCULTA / PRÓXIMAMENTE (FEATURE FLAG OFF)
  // ==========================================
  if (!isMarketplaceActive) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-white" data-testid="marketplace-coming-soon">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="text-base font-black tracking-tight text-white">
                jugar<span className="text-emerald-400">.turnos.com</span>
              </span>
            </div>
            <a
              href="http://localhost:8080"
              className="text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              ← Volver al Portal de Negocios
            </a>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-8 my-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Próximamente en Fase de Lanzamiento</span>
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            El buscador y mapa de canchas deportivas{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
              más rápido cerca tuyo
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Estamos sumando los mejores complejos de pádel, fútbol y tenis a nuestra red. Muy pronto vas a poder encontrar turnos libres y reservar al instante sin intermediarios.
          </p>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-left space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🏟️</span> ¿Sos dueño o administrador de un club deportivo?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sumá tu complejo a nuestra plataforma de gestión y sé de los primeros en recibir reservas directas de jugadores cuando abramos el marketplace público.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href="http://localhost:8080/registro-club"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-950/50 text-center flex items-center justify-center gap-2"
              >
                <span>🚀 Registrar mi Club Gratis</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition text-center"
                data-testid="btn-enable-preview"
              >
                Acceso Exclusivo / Vista Previa
              </button>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
          © 2026 Turnos.com — Red de Gestión Deportiva Multitenant
        </footer>
      </main>
    );
  }

  // ==========================================
  // VISTA ACTIVA / MARKETPLACE DE JUGADORES
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-950 text-white pb-20 selection:bg-emerald-500 selection:text-white" data-testid="marketplace-active">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                jugar<span className="text-emerald-400">.turnos.com</span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Encontrá canchas disponibles cerca tuyo en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSolicitarUbicacion}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{loading ? "Localizando..." : "📍 Mi Ubicación"}</span>
            </button>
            <a
              href="http://localhost:8080"
              className="text-xs font-semibold text-slate-400 hover:text-white transition hidden md:block"
            >
              Para Clubes ↗
            </a>
          </div>
        </div>
      </header>

      {/* Hero & Filtros Espaciales */}
      <div className="border-b border-slate-800 bg-slate-900/40 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Canchas y Complejos Deportivos Cercanos
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Mostrando complejos en un radio de {radioKm} km ordenados por distancia de menor a mayor.
              </p>
            </div>

            {/* Selector de Radio */}
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs self-start md:self-auto">
              <span className="text-slate-400 px-2 font-semibold">Radio:</span>
              {[5, 10, 20, 50].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleFilterChange(deporte, r)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    radioKm === r ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de Deporte */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: "todos", label: "Todos los deportes", icon: "🏆" },
              { id: "padel", label: "Pádel", icon: "🎾" },
              { id: "tenis", label: "Tenis", icon: "🎾" },
              { id: "futbol", label: "Fútbol", icon: "⚽" },
              { id: "basquet", label: "Básquet", icon: "🏀" },
              { id: "gimnasio", label: "Gimnasio", icon: "💪" },
            ].map((dep) => (
              <button
                key={dep.id}
                type="button"
                onClick={() => handleFilterChange(dep.id, radioKm)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  deporte === dep.id
                    ? "bg-white text-slate-900 shadow-md"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700"
                }`}
              >
                <span>{dep.icon}</span>
                <span>{dep.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta de Error / Info */}
      {errorMsg && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-300 flex items-center justify-between">
            <span>ℹ️ {errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-amber-400 hover:text-amber-200 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Contenido Principal: Lista de Clubes y Mapa */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Buscando complejos y canchas en tu radio de ubicación...</p>
          </div>
        ) : complejos.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-slate-900 border border-slate-800 p-8 space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl mx-auto">
              📍
            </div>
            <h3 className="text-lg font-bold text-white">No encontramos clubes con canchas en este radio</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Probá ampliando el radio a 50 km o cambiando el filtro de deporte. También podés registrar un nuevo club si sos propietario.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleFilterChange("todos", 50)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Ampliar a 50 km
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Lista de Complejos Ordenados por Proximidad */}
            <div className="lg:col-span-7 space-y-4" data-testid="complejos-list">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between pb-1">
                <span>{complejos.length} {complejos.length === 1 ? "Complejo Encontrado" : "Complejos Encontrados"}</span>
                <span>Ordenado por proximidad GPS</span>
              </div>

              {complejos.map((club) => {
                const isSelected = selectedClub?.id === club.id;
                const reservationUrl = getClubReservationUrl(club.subdominio);

                return (
                  <div
                    key={club.id}
                    onClick={() => setSelectedClub(club)}
                    className={`rounded-2xl border p-5 transition cursor-pointer flex flex-col justify-between space-y-4 ${
                      isSelected
                        ? "bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/40"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                    data-testid={`club-card-${club.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white capitalize">{club.nombre}</h3>
                          <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 border border-emerald-500/30 capitalize">
                            🏆 {club.deporte_principal}
                          </span>
                          {club.canchas && club.canchas.length > 0 && (
                            <span className="rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-0.5 border border-slate-700">
                              🏟️ {club.canchas.length} {club.canchas.length === 1 ? "cancha" : "canchas"}
                            </span>
                          )}
                        </div>

                        {(club.direccion || club.ciudad) && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <span>📍</span>
                            <span>{[club.direccion, club.ciudad].filter(Boolean).join(", ")}</span>
                          </p>
                        )}
                      </div>

                      {/* Badge de Distancia */}
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-black text-emerald-400 shrink-0">
                        <span>🧭</span>
                        <span>{club.distancia_km < 1 ? `${(club.distancia_km * 1000).toFixed(0)} m` : `${club.distancia_km.toFixed(1)} km`}</span>
                      </span>
                    </div>

                    {/* Deportes y Acciones */}
                    <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-500">Deportes:</span>
                        {club.deportes_disponibles?.length > 0 ? (
                          club.deportes_disponibles.map((d) => (
                            <span key={d} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 capitalize text-[10px]">
                              {d}
                            </span>
                          ))
                        ) : (
                          <span className="capitalize">{club.deporte_principal}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {club.latitud && club.longitud && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${club.latitud},${club.longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                            title="Cómo llegar en Google Maps"
                          >
                            🗺️
                          </a>
                        )}
                        <a
                          href={reservationUrl}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                        >
                          <span>🎾 Ver Canchas</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Panel Lateral: Mapa Interactivo / Detalle del Club Seleccionado */}
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-1">
                <span>Mapa de Ubicación</span>
              </div>

              {selectedClub && selectedClub.latitud && selectedClub.longitud ? (
                <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 sticky top-24 shadow-xl">
                  {/* Vista Embebida de OpenStreetMap */}
                  <div className="h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-800 relative bg-slate-950">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedClub.longitud - 0.01}%2C${selectedClub.latitud - 0.008}%2C${selectedClub.longitud + 0.01}%2C${selectedClub.latitud + 0.008}&layer=mapnik&marker=${selectedClub.latitud}%2C${selectedClub.longitud}`}
                      className="w-full h-full filter contrast-105"
                      title={`Mapa de ${selectedClub.nombre}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-white">{selectedClub.nombre}</h4>
                      <span className="text-xs text-emerald-400 font-bold">
                        {selectedClub.distancia_km < 1
                          ? `A ${(selectedClub.distancia_km * 1000).toFixed(0)} m`
                          : `A ${selectedClub.distancia_km.toFixed(1)} km`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">
                      {[selectedClub.direccion, selectedClub.ciudad].filter(Boolean).join(", ")}
                    </p>

                    <div className="pt-2 flex items-center gap-2">
                      <a
                        href={getClubReservationUrl(selectedClub.subdominio)}
                        className="flex-1 text-center py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                      >
                        Reservar Turno en Este Club →
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClub.latitud},${selectedClub.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition flex items-center gap-1"
                        title="Abrir en Google Maps"
                      >
                        <span>🗺️</span>
                        <span>Cómo llegar</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center text-xs text-slate-400 space-y-2">
                  <span>🗺️</span>
                  <p>Seleccioná un complejo de la lista para visualizar su ubicación en el mapa interactivo.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
