# ReciclaCat_Gest v2 — hallazgos y mejoras aplicadas

## Hallazgos en el prototipo (antes)
1. Todas las pestañas mostraban el mismo contenido: dos tarjetas fijas. Documentos, Vehículos, Piezas, Residuos e Informes estaban vacías.
2. «+ Documento» abría un modal con un `<input type="file">` sin ninguna acción: maqueta que aparentaba funcionar.
3. Sin persistencia ni datos demo; todo se perdía al recargar.
4. Sin estados vacío / carga / error / éxito.
5. Textos hardcodeados («Centro: Reciclados Soliva», «Ejercicio 2026»); sin selector de ejercicio ni ajustes.
6. Alturas mínimas forzadas (`min-h-[calc(100dvh-196px)]`) que generaban scroll innecesario en móvil.
7. Accesos de SeproBot solapados (piezas vendidas vs Excel de ventas).
8. Repo sin `tsconfig.json`; app Expo mezclada en `app/src`.

## Mejoras aplicadas
### Arquitectura de datos (`app/lib/`)
- `types.ts`: modelos Documento, Venta, Vehículo, Residuo, DI, Centro (ids string, fechas ISO, `demo` flag) listos para Supabase.
- `repo.ts`: interfaz `Repositorio` + `LocalRepositorio` (localStorage). Datos demo realistas marcados `demo: true`. Operaciones puras `ops.*`. Sin fingir persistencia central: aviso en Ajustes y en Resumen.
- `useDb.ts`: hook de acceso reactivo.

### OCR y documentos (prioridad máxima)
- `ocr.ts`: interfaz `OcrProvider` + `DemoOcrProvider` (simulado, campos etiquetados DEMO, confianzas variadas). Clasificación determinista en 10 tipos. Campos de revisión por tipo.
- Flujo: subir/foto (PDF, Excel, CSV, JPG, PNG, HEIC) → lectura → **revisión obligatoria** (campos <70 % en amarillo) → corregir → guardar. Nunca se guarda sin revisión.
- Estados: Pendiente de revisar / Revisado / Guardado / Error de lectura, con contadores y filtro.
- Trazabilidad: archivo, tamaño, fecha, usuario, proveedor OCR, valor detectado vs final, marca de corrección.

### Piezas
- «+ Venta manual»: pieza, referencia, descripción, cantidad, fecha, precio, peso real (opcional), observaciones, vehículo de origen. Si no hay peso: diccionario de pesos → «estimado»; sin coincidencia → «pendiente».
- «Importar ventas desde Excel»: lectura XLSX/CSV (SheetJS), mapeo automático de columnas corregible, mes del listado, validación por fila con errores en rojo, contadores real/estimado/sin peso, vista previa antes de guardar.
- Las ventas alimentan Resumen (kilos por mes), Informes y memoria.

### Vehículos
- Alta con matrícula/VIN, marca, modelo, fecha, estado. Tara estimada por base de modelos (`pesos.ts`), editable. Báscula opcional.
- Documento de baja **obligatorio**: se sube desde el propio formulario y se vincula; si el OCR detecta matrícula la rellena.
- Ficha del vehículo: baja, piezas recuperadas y residuos vinculados.

### Residuos y DI
- «+ DI» (desde Residuos; desde Documentos subiendo el archivo y vinculándolo): entrada/salida, fecha, LER, cantidad, NIMA origen/destino, gestor, transportista, adjunto, vehículo, residuo. Puede crear la salida de residuo a la vez.
- «+ Residuo» independiente; residuos sin DI se señalan.
- Texto explícito: registrar DI en la app ≠ consultar normativa del DI (SeproBot).

### Resumen e Informes
- Resumen en bloques de dos columnas: cuatro indicadores, alertas para cerrar la memoria, acciones rápidas, actividad por mes. Sin tarjetas vacías gigantes.
- Informes: memoria anual en texto, residuos por LER, piezas y vehículos por mes; exportación TXT/CSV. PDF oficial pendiente de backend.

### SeproBot
- Accesos: Registrar venta manual · Importar ventas desde Excel · Subir y revisar documento · Registrar un DI · Situación anual · Funcionamiento de la app. Test comprueba que los seis resuelven a fichas distintas.
- Fichas de app actualizadas al nuevo flujo real.

### UX
- Móvil primero: barra inferior de navegación, modales a pantalla completa desde abajo, áreas táctiles ≥44 px, `safe-area-inset`.
- Escritorio: lateral fijo, contenido en dos columnas.
- Cabecera fija con selector de ejercicio, Ajustes (nombre, NIMA, provincia, usuario, restaurar demo, borrar todo) y Área técnica.
- Estados vacío/carga/error/éxito en documentos, importación, altas.
- Datos demo visibles con chip morado DEMO.

## Verificación
`npm test` ejecuta: `app/lib/lib.test.ts` (7), `app/seprobot/casos.test.ts` (26), `tests/render.test.tsx` (7 pantallas con datos demo). `tsc --strict` sin errores. Ver PR_DESCRIPTION.md.

## Revisión 2 (correcciones de Gustavo)
1. **Residuos peligrosos y no peligrosos separados** en todo: categoría obligatoria en los formularios (LER filtrados por categoría, `*` = peligroso), dos columnas en la pestaña Residuos con sus DI, totales y tarjetas separados, memoria e informe por LER en dos bloques, CSV con columna Categoría. Un residuo ya registrado solo puede vincularse a un DI de su misma categoría.
2. **Piezas desde factura, no «manual»**: la línea se registra con nº de factura y el nombre de la pieza tal como aparece en la factura (con autocompletado del diccionario). Lo que cuenta es «Kilos gestionados piezas»; resumen, informes y memoria muestran ese total sin describir piezas. Origen de datos: `factura` | `excel`.
3. **Diccionario de pesos oficial** (`app/lib/diccionarioPesos.ts`, generado de `pesos.xls`: 1.147 artículos, 19 familias). Al importar el Excel de facturación o registrar una línea, si no hay kilos se toman del diccionario (exacto → aproximado por contención) y se marcan «estimado»; sin coincidencia → «sin peso».
4. **Tabla de taras editable** («Vehículos → Tabla de taras»): marca/modelo/tara guardada en la base de datos, con 29 modelos iniciales; en el alta de vehículo la tara se toma de la tabla (o por segmento si falta), es editable y puede guardarse en la tabla para la próxima vez. La baja no indica peso: se avisa en el propio campo.

## Revisión 3 (pesos reales y taras)
- **Pesos reales, no volumétricos.** Los pesos del Excel de facturación eran volumétricos y se han descartado. Se conserva la lista de 1.144 artículos y se asignan pesos reales aproximados por tipo de pieza (motor completo 150, caja de cambios 45, puerta 20, faro 2,5, batería 17…). 108 artículos quedan «sin peso» (nombres genéricos o basura de inventario) y aparecen resaltados para pesarlos.
- **Editor del diccionario en la app** (Piezas → Diccionario de pesos): buscar por artículo/familia, filtro «solo sin peso», corregir con báscula (el valor del usuario prevalece y se marca «báscula»), añadir artículos, restaurar. Las correcciones se aplican en la importación de Excel y en las líneas de factura.
- **Tabla de taras**: 199 modelos (turismos, SUV, furgonetas, industriales ligeros y motos habituales en CAT) con masa en orden de marcha orientativa; editable desde Vehículos.
- En la importación de Excel se advierte que no se mapee la columna de peso volumétrico.

## Revisión 4 (repaso final)
- **Compilación completa**: añadidos `app/globals.css` (Tailwind 4), `postcss.config.mjs`, `next.config.ts`, `public/favicon.svg` y scripts `dev`/`build` estándar. `next build` compila, pasa TypeScript y prerenderiza `/`.
- **SeproBot**: «¿Qué me aplica en Sevilla sobre vertidos?» extrae la ubicación del texto y entra en el flujo (destino → motivo) sin preguntar lo ya dicho ni asumir Málaga; «me aplica la GICA en Cádiz» responde directamente con la ubicación citada. Tres casos nuevos (29).
- **Residuos**: cada residuo puede vincular vehículo, DI y documento (adjunto desde el propio formulario); chips «DI / doc / vehículo» en la lista.
- **Documentos**: el detalle muestra proveedor OCR y la entidad vinculada (vehículo, DI, residuo).
- **Móvil**: el personaje y el chat de SeproBot ya no pisan la barra inferior; alto del chat ajustado al espacio real; `overflow-x-hidden` global; tablas de informes sin desbordar; memoria con `pre-wrap`.
- **Informes**: texto honesto sobre exportación (TXT/CSV; sin PDF oficial).
