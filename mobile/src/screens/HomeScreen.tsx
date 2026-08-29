import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Complejo } from '../types';
import { getCurrentCoordinates, fetchNearbyComplejos } from '../services/locationService';
import { registerForPushNotificationsAsync } from '../services/notificationService';

export function HomeScreen() {
  const { user, logout, isLoading } = useAuth();
  const [nearbyClubs, setNearbyClubs] = useState<Complejo[]>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Inicializar geolocalización al cargar el Home
  useEffect(() => {
    handleFindNearby();
  }, []);

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
            <Text className="text-xl font-bold text-white mt-1">2 Activos</Text>
          </View>
          <View className="flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <Text className="text-2xl mb-1">🏆</Text>
            <Text className="text-xs font-semibold text-slate-400">Torneos</Text>
            <Text className="text-xl font-bold text-white mt-1">1 Inscripto</Text>
          </View>
        </View>

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
