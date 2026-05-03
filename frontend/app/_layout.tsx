import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <ThemeProvider value={DarkTheme}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0D17' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
            <Stack.Screen name="alert" options={{ presentation: 'transparentModal', animation: 'fade' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}
