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
  const [radioKm, setRadioKm] = useState<number>(50);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [complejos, setComplejos] = useState<ComplejoCercano[]>([]);
  const [selectedClub, setSelectedClub] = useState<ComplejoCercano | null>(null);
  const [baseDomain, setBaseDomain] = useState<string>("localhost:8080");

  // Manual Location Search State
  const [searchLocationText, setSearchLocationText] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [currentLocationName, setCurrentLocationName] = useState<string>("Buenos Aires (CABA)");

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
      } else {
        setSelectedClub(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLocation = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = (customQuery !== undefined ? customQuery : searchLocationText).trim();
    if (!query) return;

    setIsGeocoding(true);
    setErrorMsg(null);
    try {
      const q = encodeURIComponent(`${query}, Argentina`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`, {
        headers: { "Accept-Language": "es" },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const displayName = data[0].display_name ? data[0].display_name.split(",")[0] : query;
        const newCoords = { lat, lng };
        setUserCoords(newCoords);
        setCurrentLocationName(displayName);
        if (customQuery) setSearchLocationText(displayName);
        if (typeof window !== "undefined") {
          localStorage.setItem("jugar_user_location", JSON.stringify({ lat, lng, name: displayName }));
        }
        await fetchClubesCercanos(lat, lng, radioKm, deporte);
      } else {
        setErrorMsg(`No se encontró la ubicación "${query}". Probá con otra ciudad o localidad.`);
      }
    } catch (err: any) {
      setErrorMsg("Error al buscar la ubicación en el mapa.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSolicitarUbicacion = () => {
    if (
      typeof window === "undefined" ||
      !navigator.geolocation ||
      typeof navigator.geolocation.getCurrentPosition !== "function"
    ) {
      setErrorMsg("La geolocalización no está disponible en este navegador. Podés escribir tu ciudad o localidad en el buscador.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setCurrentLocationName("Mi ubicación actual (GPS)");
        setSearchLocationText("");
        if (typeof window !== "undefined") {
          localStorage.setItem("jugar_user_location", JSON.stringify({ lat: coords.lat, lng: coords.lng, name: "Mi ubicación actual (GPS)" }));
        }
        fetchClubesCercanos(coords.lat, coords.lng, radioKm, deporte);
      },
      (err) => {
        setLoading(false);
        setErrorMsg("Ubicación del dispositivo no disponible. Podés buscar tu ciudad o localidad directamente en el campo de búsqueda (ej. Luján).");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Carga inicial: revisa localStorage y si no, usa coordenadas de CABA
  useEffect(() => {
    if (isMarketplaceActive) {
      let initialCoords = { lat: -34.603722, lng: -58.381592 };
      let initialName = "Buenos Aires (CABA)";

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("jugar_user_location");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.lat && parsed.lng) {
              initialCoords = { lat: parsed.lat, lng: parsed.lng };
              if (parsed.name) {
                initialName = parsed.name;
                setSearchLocationText(parsed.name);
              }
            }
          } catch (e) {}
        }
      }

      setUserCoords(initialCoords);
      setCurrentLocationName(initialName);
      fetchClubesCercanos(initialCoords.lat, initialCoords.lng, radioKm, deporte);

      // Si no había guardada una ubicación manual previa y el navegador soporta GPS
      if (
        typeof window !== "undefined" &&
        !localStorage.getItem("jugar_user_location") &&
        navigator.geolocation &&
        typeof navigator.geolocation.getCurrentPosition === "function"
      ) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserCoords(coords);
            setCurrentLocationName("Mi ubicación actual (GPS)");
            fetchClubesCercanos(coords.lat, coords.lng, radioKm, deporte);
          },
          () => {},
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
              <p className="text-xs sm:text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-1.5">
                <span>Mostrando complejos en un radio de {radioKm} km desde:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>{currentLocationName}</span>
                </span>
              </p>
            </div>

            {/* Selector de Radio */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 text-xs self-start md:self-auto overflow-x-auto max-w-full">
              <span className="text-slate-400 px-2 font-semibold whitespace-nowrap">Radio:</span>
              {[5, 10, 20, 50, 100, 200].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleFilterChange(deporte, r)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                    radioKm === r ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Barra de Búsqueda Manual de Localidad */}
          <div className="space-y-2">
            <form onSubmit={(e) => handleSearchLocation(e)} className="flex flex-col sm:flex-row gap-2 max-w-2xl" data-testid="form-location-search">
              <div className="relative flex-1">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                <input
                  type="text"
                  data-testid="input-manual-location"
                  value={searchLocationText}
                  onChange={(e) => setSearchLocationText(e.target.value)}
                  placeholder="Escribí tu ciudad o zona (ej. Luján, Pilar, CABA, Mercedes...)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
                />
              </div>
              <button
                type="submit"
                data-testid="btn-search-manual-location"
                onClick={(e) => handleSearchLocation(e)}
                disabled={isGeocoding || !searchLocationText.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-md flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isGeocoding ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Buscando zona...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Cambiar ubicación</span>
                  </>
                )}
              </button>
            </form>

            {/* Accesos directos a ciudades / zonas populares */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400 pt-1">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Ciudades rápidas:</span>
              {["Luján", "Pilar", "Mercedes", "General Rodríguez", "CABA"].map((city) => (
                <button
                  key={city}
                  type="button"
                  data-testid={`quick-zone-${city.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => handleSearchLocation(undefined, city)}
                  className="px-2.5 py-0.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:text-emerald-300 transition text-[11px] font-medium cursor-pointer"
                >
                  📍 {city}
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
