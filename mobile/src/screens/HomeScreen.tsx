import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Complejo, TurnoCliente } from '../types';
import { getCurrentCoordinates, fetchNearbyComplejos } from '../services/locationService';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { fetchMisTurnosApi, cancelarTurnoClienteApi } from '../services/api';

export const formatFechaDDMMAAAA = (fechaStr?: string): string => {
  if (!fechaStr) return '';
  const parts = fechaStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
  }
  return fechaStr;
};

export function HomeScreen() {
  const { user, logout, isLoading } = useAuth();
  const [nearbyClubs, setNearbyClubs] = useState<Complejo[]>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [misTurnos, setMisTurnos] = useState<TurnoCliente[]>([]);
  const [isLoadingTurnos, setIsLoadingTurnos] = useState<boolean>(false);

  // Inicializar geolocalización y turnos al cargar el Home
  useEffect(() => {
    handleFindNearby();
    handleLoadTurnos();
  }, []);

  const handleLoadTurnos = async () => {
    setIsLoadingTurnos(true);
    try {
      const turnos = await fetchMisTurnosApi();
      setMisTurnos(turnos);
    } catch {
      // ignore network errors on home load
    } finally {
      setIsLoadingTurnos(false);
    }
  };

  const handleCancelarTurno = (turno: TurnoCliente) => {
    const limite = turno.limite_horas_cancelacion ?? 4;
    const horas = turno.horas_restantes ?? 0;
    const aplicaReembolso = horas >= limite && turno.monto_pagado > 0;

    const mensajeExplicativo = aplicaReembolso
      ? `Faltan aproximadamente ${horas} horas para tu partido (mínimo del club: ${limite} hs).\n\nSe reembolsarán $${turno.monto_pagado.toLocaleString()} de forma automática a tu Billetera Virtual en este club.`
      : turno.monto_pagado > 0
      ? `Faltan menos de ${limite} horas para tu partido.\n\nPor cancelación fuera de término, la seña abonada de $${turno.monto_pagado.toLocaleString()} no será reembolsable y quedará retenida en concepto de penalidad.`
      : `¿Estás seguro de que deseas cancelar tu reserva para el ${formatFechaDDMMAAAA(turno.fecha)} a las ${turno.hora_inicio} hs?`;

    Alert.alert(
      '¿Cancelar Turno?',
      mensajeExplicativo,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: 'Confirmar Cancelación',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await cancelarTurnoClienteApi(turno.id, turno.complejo_id);
              Alert.alert('Turno Cancelado', res.message || 'Tu reserva ha sido cancelada exitosamente.');
              await handleLoadTurnos();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cancelar el turno.');
            }
          },
        },
      ]
    );
  };

  const handleFindNearby = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await getCurrentCoordinates();
      if (coords) {
        const clubs = await fetchNearbyComplejos(coords.latitude, coords.longitude, 30);
        setNearbyClubs(clubs);
      } else {
        // Fallback demostrativo desde Buenos Aires Centro
        const fallbackClubs = await fetchNearbyComplejos(-34.6037, -58.3816, 30);
        setNearbyClubs(fallbackClubs);
      }
    } catch (error: any) {
      setLocationError(error.message || 'No se pudieron obtener clubes cercanos.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleEnablePush = async () => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      setPushStatus('Notificaciones activas');
    } else {
      setPushStatus('Permiso no concedido');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <StatusBar barStyle="light-content" />
      <ScrollView className="flex-1 px-5 py-6">
        {/* Header con Perfil y Logout */}
        <View className="flex-row justify-between items-center pb-6 border-b border-slate-800">
          <View>
            <Text className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Bienvenido de nuevo
            </Text>
            <Text className="text-2xl font-extrabold text-white">
              {user?.name || 'Jugador'}
            </Text>
            <Text className="text-xs text-slate-400">{user?.email}</Text>
          </View>
          <TouchableOpacity
            className="bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl active:bg-slate-800"
            onPress={logout}
            disabled={isLoading}
          >
            <Text className="text-xs font-semibold text-rose-400">Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Banner de Push Notifications */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 my-5 flex-row justify-between items-center">
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-10 h-10 rounded-full bg-emerald-600/20 items-center justify-center mr-3 border border-emerald-500/30">
              <Text className="text-emerald-400 text-lg">🔔</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-white">
                {pushStatus ? pushStatus : 'Recordatorios de Partidos'}
              </Text>
              <Text className="text-xs text-slate-400">
                Recibe alertas Push antes del inicio de tu turno.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-emerald-600 active:bg-emerald-700 px-3 py-2 rounded-xl"
            onPress={handleEnablePush}
          >
            <Text className="text-white text-xs font-bold">Activar</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjetas de Accesos Rápidos */}
        <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Tus Actividades
        </Text>
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <Text className="text-2xl mb-1">📅</Text>
            <Text className="text-xs font-semibold text-slate-400">Mis Turnos</Text>
            <Text className="text-xl font-bold text-white mt-1">
              {misTurnos.filter((t) => t.estado === 'reservado').length} Activos
            </Text>
          </View>
          <View className="flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <Text className="text-2xl mb-1">🏆</Text>
            <Text className="text-xs font-semibold text-slate-400">Torneos</Text>
            <Text className="text-xl font-bold text-white mt-1">1 Inscripto</Text>
          </View>
        </View>

        {/* Sección Mis Turnos Reservados */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Tus Turnos Reservados 🎾
          </Text>
          <TouchableOpacity
            onPress={handleLoadTurnos}
            disabled={isLoadingTurnos}
            className="flex-row items-center"
          >
            {isLoadingTurnos && <ActivityIndicator size="small" color="#10b981" className="mr-1" />}
            <Text className="text-xs font-semibold text-emerald-400">Actualizar</Text>
          </TouchableOpacity>
        </View>

        {misTurnos.length > 0 ? (
          misTurnos.map((turno) => {
            const isPagado = (turno.estado_pago === 'pagado' || turno.estado_pago === 'pagado_total') && turno.saldo_pendiente <= 0;
            const isSenado = !isPagado && turno.monto_pagado > 0;
            const isCancelado = turno.estado === 'cancelado';

            return (
              <View
                key={turno.id}
                className={`p-4 rounded-2xl mb-3 border ${
                  isCancelado
                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-base font-bold text-white">
                      {turno.complejo?.nombre || 'Complejo Deportivo'}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {turno.cancha?.nombre || 'Cancha'} • {turno.cancha?.deporte?.toUpperCase() || 'PÁDEL'}
                    </Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-full border ${
                    isCancelado
                      ? 'bg-rose-500/10 border-rose-500/20'
                      : isPagado
                      ? 'bg-emerald-500/20 border-emerald-500/30'
                      : isSenado
                      ? 'bg-blue-500/20 border-blue-500/30'
                      : 'bg-amber-500/20 border-amber-500/30'
                  }`}>
                    <Text className={`text-xs font-bold ${
                      isCancelado
                        ? 'text-rose-400'
                        : isPagado
                        ? 'text-emerald-300'
                        : isSenado
                        ? 'text-blue-300'
                        : 'text-amber-300'
                    }`}>
                      {isCancelado
                        ? 'Cancelado'
                        : isPagado
                        ? '100% Abonado'
                        : isSenado
                        ? 'Seña Abonada'
                        : 'Pago Pendiente'}
                    </Text>
                  </View>
                </View>

                {/* Fecha y Horario */}
                <View className="flex-row items-center justify-between py-2 border-t border-slate-800/80 my-1">
                  <Text className="text-xs text-slate-300 font-medium">
                    📅 {formatFechaDDMMAAAA(turno.fecha)}
                  </Text>
                  <Text className="text-xs font-mono font-bold text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    ⏰ {turno.hora_inicio} - {turno.hora_fin} hs
                  </Text>
                </View>

                {/* Desglose Financiero */}
                <View className="flex-row justify-between items-center text-xs pt-1">
                  <Text className="text-xs text-slate-400">
                    Abonado: <Text className="font-bold text-white">${turno.monto_pagado.toLocaleString()}</Text>
                    {turno.saldo_pendiente > 0 && (
                      <Text className="text-amber-400"> (Resta: ${turno.saldo_pendiente.toLocaleString()})</Text>
                    )}
                  </Text>
                  <Text className="text-xs font-bold text-slate-300">
                    Total: ${turno.precio.toLocaleString()}
                  </Text>
                </View>

                {/* Botón de Cancelación */}
                {!isCancelado && turno.puede_cancelar && (
                  <TouchableOpacity
                    className="mt-3 bg-rose-500/15 border border-rose-500/30 py-2.5 rounded-xl items-center active:bg-rose-500/25"
                    onPress={() => handleCancelarTurno(turno)}
                  >
                    <Text className="text-rose-300 font-bold text-xs">✕ Cancelar Turno</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <View className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl items-center mb-6">
            <Text className="text-slate-400 text-xs text-center">
              No tienes turnos reservados actualmente.
            </Text>
          </View>
        )}

        {/* Sección de Geolocalización: Clubes Cercanos */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Clubes Cercanos a Ti 📍
          </Text>
          <TouchableOpacity
            onPress={handleFindNearby}
            disabled={isLocating}
            className="flex-row items-center"
          >
            {isLocating && <ActivityIndicator size="small" color="#10b981" className="mr-1" />}
            <Text className="text-xs font-semibold text-emerald-400">Actualizar</Text>
          </TouchableOpacity>
        </View>

        {locationError && (
          <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
            <Text className="text-amber-400 text-xs text-center">{locationError}</Text>
          </View>
        )}

        {nearbyClubs.length > 0 ? (
          nearbyClubs.map((club) => (
            <View
              key={club.id}
              className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 shadow-lg"
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-base font-bold text-white">{club.nombre}</Text>
                  <Text className="text-xs text-slate-400">
                    {club.direccion || 'Ubicación disponible'} • {club.ciudad || 'Centro'}
                  </Text>
                </View>
                {club.distancia_km !== undefined && (
                  <View className="bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <Text className="text-xs font-bold text-emerald-300">
                      {club.distancia_km} km
                    </Text>
                  </View>
                )}
              </View>

              {/* Deportes disponibles */}
              {club.deportes_disponibles && club.deportes_disponibles.length > 0 && (
                <View className="flex-row flex-wrap gap-1.5 mt-2">
                  {club.deportes_disponibles.map((deporte) => (
                    <View
                      key={deporte}
                      className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700"
                    >
                      <Text className="text-[10px] font-semibold text-slate-300 uppercase">
                        {deporte}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <View className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl items-center mb-6">
            <Text className="text-slate-400 text-xs text-center">
              {isLocating
                ? 'Buscando clubes cercanos a tu posición...'
                : 'No se encontraron complejos en el radio seleccionado.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
