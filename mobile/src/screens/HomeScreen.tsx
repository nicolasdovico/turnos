import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export function HomeScreen() {
  const { user, logout, isLoading } = useAuth();

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

        {/* Banner de Estado Seguro */}
        <View className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 my-6 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-emerald-600/20 items-center justify-center mr-3 border border-emerald-500/40">
            <Text className="text-emerald-400 text-lg">🛡️</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-white">Sesión Segura Activa</Text>
            <Text className="text-xs text-slate-300">
              Token Sanctum almacenado y encriptado con SecureStore.
            </Text>
          </View>
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

        {/* Convocatorias de Partidos Abiertos */}
        <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Partidos Abiertos Disponibles
        </Text>
        <View className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-6">
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-base font-bold text-white">Pádel - Categoría 4ta</Text>
              <Text className="text-xs text-slate-400">Complejo Padel Pro • Cancha 1</Text>
            </View>
            <View className="bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <Text className="text-xs font-semibold text-emerald-300">Falta 1</Text>
            </View>
          </View>
          <Text className="text-xs text-slate-300 mt-2">
            Hoy 20:00 hs • $3.500 / cuota (Split Payment)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
