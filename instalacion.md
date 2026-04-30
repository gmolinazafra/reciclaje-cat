# Guía de instalación — DesconCAT

## Requisitos previos

- Node.js 18+
- npm o yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (para builds): `npm install -g eas-cli`
- App **Expo Go** en tu móvil Android (para pruebas)

## Primer arranque

```bash
# 1. Clona el repo
git clone https://github.com/gmolinazafra/reciclaje-cat.git
cd reciclaje-cat/app

# 2. Instala dependencias
npm install

# 3. Arranca el servidor de desarrollo
npx expo start

# 4. Escanea el QR con Expo Go en tu móvil
```

## Estructura del proyecto

```
app/
├── App.js                          ← Punto de entrada
├── app.json                        ← Config Expo
├── eas.json                        ← Config builds Play Store
├── src/
│   ├── navigation/AppNavigator.jsx ← Tab navigation
│   ├── screens/
│   │   ├── VehiculoScreen.jsx      ← Tab 1: búsqueda vehículo
│   │   ├── ChecklistScreen.jsx     ← Tab 2: checklist residuos
│   │   ├── FirmaScreen.jsx         ← Tab 3: firma + PDF
│   │   └── AjustesScreen.jsx       ← Tab 4: config CAT
│   ├── utils/
│   │   ├── pdfGenerator.js         ← Genera y comparte PDF
│   │   └── storage.js              ← AsyncStorage helpers
│   ├── hooks/useSettings.js        ← Hook ajustes CAT
│   └── data/vehiculos.csv          ← Base de datos vehículos
```

## Generar APK de prueba (Preview)

```bash
# Requiere cuenta Expo / EAS
eas login
eas build --platform android --profile preview
```

El APK se descarga desde el dashboard de EAS y se instala directamente en el móvil.

## Publicar en Play Store

```bash
# Build AAB para producción
eas build --platform android --profile production

# Subir automáticamente (requiere google-play-key.json)
eas submit --platform android
```

## Próximos pasos (roadmap)

- [ ] Context API o Zustand para compartir datos entre tabs (Vehículo → Firma)
- [ ] Historial de actas generadas
- [ ] Búsqueda CSV cargado desde archivo externo
- [ ] Soporte iOS (App Store)
