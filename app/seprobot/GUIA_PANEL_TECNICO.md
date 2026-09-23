# Cómo añadir una ficha desde el panel técnico de SeproBot

1. Abre ReciclaCat_Gest y pulsa **Área técnica** (arriba a la derecha). Se abre «Biblioteca y reglas de SeproBot».
2. Los cinco recuadros superiores muestran cuántas fichas hay en total y por estado (Vigente, En revisión, Obsoleta, No aplica). Pulsa uno para filtrar.
3. Pulsa **+ Nueva ficha**.
4. Rellena:
   - **Título**: lo que verá el usuario en negrita.
   - **Identificador**: sin espacios (p. ej. `app-exportar-informe-dgt`).
   - **Dominio**: *Uso de la aplicación* (cómo hacer algo en el programa), *Normativa* (qué dice una norma) o *Trámite* (expediente guiado).
   - **Estado**: déjalo en *En revisión* hasta haberla comprobado. SeproBot **solo usa fichas Vigentes**.
   - **Entidades**: sobre qué trata (DI, piezas_vendidas, vehículo…). Es lo que el bot compara con la pregunta.
   - **Acciones**: qué hace el usuario (registrar, importar, consultar…). Vacío = cualquiera.
   - **Sinónimos** y **Frases de ejemplo**: cómo lo preguntaría un gerente, una por línea, sin preocuparte de tildes o mayúsculas.
   - Si es de aplicación: **Respuesta** (frase de introducción) y **Pasos** (uno por línea, en orden).
   - Si es normativa: **Resumen** en lenguaje claro y **Puntos a revisar**. Nunca escribas lo que no esté en la **Fuente**.
5. Pulsa **Guardar ficha**.
6. Pruébala en el chat. Cuando esté validada, cambia el estado a **Vigente** desde el desplegable de la lista (no hace falta abrirla).

## Cambiar el estado de una norma
En la lista, usa el desplegable de color de cada ficha: Vigente / En revisión / Obsoleta / No aplica. El cambio es inmediato.

## Dónde se guardan los cambios
En el navegador del técnico (no en el servidor). Para conservarlos o pasarlos a otro equipo:
- **Exportar cambios** descarga un JSON con las fichas editadas o creadas.
- **Importar JSON** las carga en otro navegador.
- Entrega ese JSON al desarrollador para consolidarlo en `knowledgeBase.ts` / `knowledgeBaseApp.ts` cuando proceda.
- **Restaurar** descarta las ediciones locales de una ficha y vuelve a la versión de código.

## Cómo decide SeproBot
1. Clasifica el mensaje en intención (uso de la aplicación / normativa / trámite), entidad y acción.
2. Verbos de programa («cómo registro», «cómo subo», «dónde meto») → siempre ficha de aplicación.
3. «Qué es», «qué dice», «normativa», «ley», «RD» → ficha de normativa.
4. «Dar de alta» sobre una entidad que existe en ambos dominios (DI, residuo, baja, vehículo, traslado) → pregunta con dos botones.
5. Si no hay ficha Vigente para la entidad, deriva al técnico. Nunca responde con una norma «parecida».
