import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActaProvider } from './src/context/ActaContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && window.__hideSplash) {
      window.__hideSplash();
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, height: '100vh', width: '100vw' }}>
      <SafeAreaProvider>
        <ActaProvider>
          <AppNavigator />
        </ActaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}