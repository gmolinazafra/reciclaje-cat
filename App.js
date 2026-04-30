import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActaProvider } from './src/context/ActaContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ActaProvider>
          <AppNavigator />
        </ActaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
