# ReciclaCat_Gest para Windows

Programa instalable (Electron) que empaqueta la app de `app/` exportada en estático.
**Sin nube y sin coste**: todo funciona en el ordenador, también sin internet.

## Dónde se guardan los datos
`%APPDATA%\ReciclaCat_Gest\datos`
- `reciclacat.json`: base de datos (escritura atómica; `reciclacat.json.bak` = versión anterior).
- `adjuntos\AAAA\`: originales de los documentos subidos (PDF, fotos…).
- `copias\`: copia automática diaria (30 últimas) y copias de seguridad previas a cada restauración.

Desinstalar el programa **no borra** los datos.

## Licencia (llave de activación)
- Al abrirlo por primera vez muestra el **código de equipo** (XXXX-XXXX-XXXX-XXXX).
- Limonada Web genera la llave con `herramientas/licencias/Generar llave.bat` (necesita la clave privada
  `llave-privada-reciclacat.pem`, que **nunca** está en el repositorio).
- La llave va firmada (Ed25519) y ligada a ese equipo; puede caducar (1 año por defecto) o no.
- Sin llave válida no se abre la app ni se accede a los datos.

## Actualizaciones (Cloudflare)
- Se publican en el bucket R2 `nubrya-descargas`, carpeta `reciclacat/` → `https://descargas.limonadaweb.com/reciclacat/`
  (el mismo dominio que NUBRYA). Botón de descarga para la web: `https://descargas.limonadaweb.com/reciclacat/ReciclaCat_Gest-Setup.exe`.
- El programa comprueba `latest.yml` al arrancar, descarga la versión nueva en segundo plano, verifica su huella SHA-512
  y la instala al cerrar (o al pulsar «Reiniciar ahora»). Los datos no se tocan.
- Única conexión a internet del programa: `descargas.limonadaweb.com/reciclacat/`.
- Publicar una versión: subir `version` en `escritorio/package.json` (p. ej. 1.0.1) y crear la etiqueta `v1.0.1`
  en ese commit. GitHub Actions compila en Windows y sube a R2.
- Requisito (una vez): secretos del repositorio `CLOUDFLARE_API_TOKEN` (permiso *Workers R2 Storage: Edit*) y
  `CLOUDFLARE_ACCOUNT_ID`.

## Lectura de documentos
- PDF con texto: pdf.js (lectura exacta).
- PDF escaneado o foto: Tesseract (español), en el propio equipo. Sin IA externa.
- Facturas: las líneas que coinciden con el diccionario de pesos se proponen como piezas
  (kilos estimados); se revisan antes de guardar.

## Compilar el instalador
Lo hace GitHub Actions en Windows (`.github/workflows/escritorio.yml`): Actions → «Instalador Windows».
El `.exe` queda en los artefactos de la ejecución. Con una etiqueta `vX.Y.Z` se sube a Cloudflare y llega a todos como actualización.

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
