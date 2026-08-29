import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export function LoginScreen({ onNavigateToRegister }: LoginScreenProps) {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setErrorMessage(null);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al iniciar sesión');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-950"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        className="px-6 py-12"
      >
        {/* Header / Logo */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-2xl bg-emerald-600 items-center justify-center mb-3 shadow-lg shadow-emerald-500/30">
            <Text className="text-3xl font-black text-white">🎾</Text>
          </View>
          <Text className="text-3xl font-extrabold text-white tracking-tight">Turnos App</Text>
          <Text className="text-sm text-slate-400 mt-1">Gestión de Turnos y Clubes Deportivos</Text>
        </View>

        {/* Form Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <Text className="text-xl font-bold text-white mb-6 text-center">
            Iniciar Sesión
          </Text>

          {errorMessage && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 mb-4">
              <Text className="text-red-400 text-xs font-medium text-center">
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Correo Electrónico
            </Text>
            <TextInput
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-base focus:border-emerald-500"
              placeholder="ejemplo@correo.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Contraseña
            </Text>
            <TextInput
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-base focus:border-emerald-500"
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            className="bg-emerald-600 active:bg-emerald-700 py-3.5 rounded-xl items-center shadow-lg shadow-emerald-600/30 flex-row justify-center"
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">Ingresar</Text>
            )}
          </TouchableOpacity>

          {/* Switch to Register */}
          <View className="flex-row justify-center items-center mt-6 pt-4 border-t border-slate-800/80">
            <Text className="text-slate-400 text-sm">¿No tienes una cuenta? </Text>
            <TouchableOpacity onPress={onNavigateToRegister}>
              <Text className="text-emerald-400 font-bold text-sm">Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
