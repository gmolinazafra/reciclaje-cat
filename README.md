# DesconCAT — App de Descontaminación de Vehículos

App móvil para Centros Autorizados de Tratamiento (CAT) que genera actas de descontaminación en PDF compartibles por WhatsApp, Email y Google Drive.

## Stack

- **Framework:** Expo (SDK 51+) con React Native
- **Navegación:** React Navigation v6 (Bottom Tabs)
- **PDF:** expo-print + expo-sharing
- **Almacenamiento local:** AsyncStorage
- **Firma táctil:** react-native-signature-canvas
- **Imagen logo:** expo-image-picker
- **Publicación:** Google Play Store

## Estructura del proyecto

```
app/
├── src/
│   ├── screens/
│   │   ├── VehiculoScreen.jsx
│   │   ├── ChecklistScreen.jsx
│   │   ├── FirmaScreen.jsx
│   │   └── AjustesScreen.jsx
│   ├── components/
│   │   ├── CarSearch.jsx
│   │   ├── ChecklistItem.jsx
│   │   ├── SignaturePad.jsx
│   │   └── WorkerList.jsx
│   ├── navigation/
│   │   └── AppNavigator.jsx
│   ├── data/
│   │   └── vehiculos.csv
│   ├── utils/
│   │   ├── pdfGenerator.js
│   │   └── storage.js
│   └── hooks/
│       └── useSettings.js
├── app.json
├── App.js
└── package.json
```

## Instalación

```bash
cd app
npm install
npx expo start
```

## Flujo de la app

1. **Vehículo** → Búsqueda por marca/modelo (CSV), matrícula, bastidor, operario
2. **Checklist** → 18 residuos con Sí/No + datos técnicos (Gas AC, Airbag, Híbrido/Eléctrico)
3. **Firma** → Panel táctil + aviso legal obligatorio → Generar PDF → Compartir
4. **Ajustes** → Datos CAT, logo, gestión de operarios

## Publicación Play Store

Ver `docs/play-store.md` para instrucciones de firma y publicación con EAS Build.
