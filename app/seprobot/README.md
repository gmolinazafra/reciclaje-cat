# SeproBot — asistente documental de ReciclaCat_Gest

Bot **determinista**: sin IA externa, sin API keys, sin llamadas de red. Responde
únicamente con fichas validadas por el técnico de la asociación.

## Archivos

| Archivo | Función |
|---|---|
| `types.ts` | Tipos: `Ficha`, `EstadoConversacion`, `MensajeBot`… |
| `knowledgeBase.ts` | Fichas de **normativa y trámites**. |
| `knowledgeBaseApp.ts` | Fichas de **uso de la aplicación** (guías paso a paso). |
| `kbStore.ts` | Combina las fichas de código con las ediciones del técnico guardadas en el navegador; exportar/importar JSON. |
| `intentClassifier.ts` | Clasifica cada mensaje en intención + entidad + acción antes de buscar. |
| `PanelTecnico.tsx` | Panel «Biblioteca y reglas de SeproBot»: contadores por estado, filtros, crear/editar fichas, cambiar estado. |
| `searchEngine.ts` | Normalización (minúsculas, tildes, plurales), búsqueda por título/etiquetas/sinónimos/materia y ranking. Solo devuelve fichas `Vigente`. |
| `conversation.ts` | Máquina de estados: mantiene tema, ubicación, destino del agua y motivo entre mensajes. Función pura `procesar(estado, texto)`. |
| `SeproBot.tsx` | Componente visual. No contiene respuestas ni lógica de negocio. |
| `casos.test.ts` | Casos de prueba. Ejecutar: `npx tsx app/seprobot/casos.test.ts` |

## Cómo añadir o validar una ficha (técnico)

Desde la interfaz: ver `GUIA_PANEL_TECNICO.md` (panel «Biblioteca y reglas de SeproBot», sin código). Desde código:

1. Abrir `knowledgeBase.ts` y añadir un objeto `Ficha` al array `knowledgeBase`.
2. Rellenar `sinonimos` con las formas en que un gerente de CAT preguntaría ("GICA", "baja vehículo", "DI"…). Sin tildes ni mayúsculas es indiferente: el motor normaliza.
3. `resumen` y `requisitos` deben salir de la fuente indicada en `fuente`. **Nunca inventar contenido legal.**
4. Dejar `estado: "En revisión"` hasta comprobar la fuente. Cambiar a `"Vigente"` solo cuando esté validada; a `"Obsoleta"` cuando deje de aplicar.
5. Actualizar `fechaRevision` y `version`.
6. Ejecutar los casos de prueba.

Las fichas `En revisión` u `Obsoleta` **nunca** se usan para responder: el bot deriva la
consulta al técnico y, como mucho, informa de que existe documentación pendiente.

## Flujos guiados

Una ficha con `flujo: "vertidos"` activa el flujo de tres pasos (provincia/municipio →
destino del agua → motivo) **solo** cuando la consulta describe un trámite
("renovar", "alta", "modificar", "inspección"…). Una pregunta general ("¿qué es…?") se
responde directamente sin interrogatorio. El bot nunca asume ubicación por defecto.
