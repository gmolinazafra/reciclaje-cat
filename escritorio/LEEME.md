# ReciclaCat_Gest para Windows

Programa instalable (Electron) que empaqueta la app de `app/` exportada en estático.
**Sin nube y sin coste**: todo funciona en el ordenador, también sin internet.

## Dónde se guardan los datos
`%APPDATA%\ReciclaCat_Gest\datos`
- `reciclacat.json`: base de datos (escritura atómica; `reciclacat.json.bak` = versión anterior).
- `adjuntos\AAAA\`: originales de los documentos subidos (PDF, fotos…).
- `copias\`: copia automática diaria (30 últimas) y copias de seguridad previas a cada restauración.

Desinstalar el programa **no borra** los datos.

## Lectura de documentos
- PDF con texto: pdf.js (lectura exacta).
- PDF escaneado o foto: Tesseract (español), en el propio equipo. Sin IA externa.
- Facturas: las líneas que coinciden con el diccionario de pesos se proponen como piezas
  (kilos estimados); se revisan antes de guardar.

## Compilar el instalador
Lo hace GitHub Actions en Windows (`.github/workflows/escritorio.yml`): Actions → «Instalador Windows».
El `.exe` queda en los artefactos de la ejecución. Con una etiqueta `escritorio-vX.Y.Z` se publica como versión.

En local (Windows):
```
npm install
npm run build
npm run escritorio:preparar
cd escritorio
npm install
npm run iniciar      # probar
npm run instalador   # crea dist\ReciclaCat_Gest-instalador-X.Y.Z.exe
```

© Limonada Web · Powered by Limonada Web
