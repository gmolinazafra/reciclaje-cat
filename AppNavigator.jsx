import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from 'react-native';
import VehiculoScreen from '../screens/VehiculoScreen';
import ChecklistScreen from '../screens/ChecklistScreen';
import FirmaScreen from '../screens/FirmaScreen';
import AjustesScreen from '../screens/AjustesScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#1D6FA4',
  primaryDark: '#0C447C',
  inactive: '#8E8E93',
};

function TabIcon({ label }) {
  const icons = {
    Vehículo: '🚗',
    Checklist: '✅',
    Firma: '✍️',
    Ajustes: '⚙️',
  };
  return <Text style={{ fontSize: 20 }}>{icons[label]}</Text>;
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: () => <TabIcon label={route.name} />,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.inactive,
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#E5E5EA',
            borderTopWidth: 0.5,
            paddingBottom: 4,
            height: 60,
          },
          tabBarLabelStyle: { fontSize: 11 },
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        })}
      >
        <Tab.Screen
          name="Vehículo"
          component={VehiculoScreen}
          options={{ title: 'Datos del Vehículo' }}
        />
        <Tab.Screen
          name="Checklist"
          component={ChecklistScreen}
          options={{ title: 'Checklist de Residuos' }}
        />
        <Tab.Screen
          name="Firma"
          component={FirmaScreen}
          options={{ title: 'Firma y Generar Acta' }}
        />
        <Tab.Screen
          name="Ajustes"
          component={AjustesScreen}
          options={{ title: 'Configuración CAT' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
