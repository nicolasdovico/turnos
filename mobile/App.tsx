import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';

function MainNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentAuthScreen, setCurrentAuthScreen] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <HomeScreen />;
  }

  return currentAuthScreen === 'login' ? (
    <LoginScreen onNavigateToRegister={() => setCurrentAuthScreen('register')} />
  ) : (
    <RegisterScreen onNavigateToLogin={() => setCurrentAuthScreen('login')} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <MainNavigator />
    </AuthProvider>
  );
}
