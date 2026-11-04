# Mejoras de interacción humano-computadora en MemoraTag

Este documento recoge los cambios de la aplicación móvil (`proyecto/apps/mobile`) que responden a principios de interacción humano-computadora (IHM). Cada cambio indica el problema que tenía la versión anterior, qué se cambió, el principio que lo justifica y dónde está implementado.

**Marcos de referencia usados**

- **Nielsen:** las 10 heurísticas de usabilidad de Nielsen, citadas por número (H1–H10):
  1. visibilidad del estado del sistema;
  2. relación entre el sistema y el mundo real;
  3. control y libertad del usuario;
  4. consistencia y estándares;
  5. prevención de errores;
  6. reconocer antes que recordar;
  7. flexibilidad y eficiencia;
  8. diseño estético y minimalista;
  9. ayudar a reconocer, diagnosticar y recuperarse de errores;
  10. ayuda y documentación.
- **Shneiderman:** las 8 reglas de oro.
- **Norman:** affordances, significantes, retroalimentación y correspondencia (*mapping*).
- **WCAG 2.2:** pautas de accesibilidad, nivel AA.
- **Leyes:** leyes de Fitts y de Hick-Hyman, y principios de la Gestalt.

> **Estado.** Todo lo descrito está implementado, salvo lo que se indica en la última sección. Ningún cambio se ha validado todavía con usuarios: la evaluación con participantes está pendiente.

---

## 1. Identidad visual y estética

| Antes | Cambio | Principio | Dónde |
|---|---|---|---|
| La app usaba el icono y la pantalla de carga genéricos de Expo; en el teléfono no se distinguía de otras apps. | Identidad nueva: un logotipo con forma de etiqueta (el objeto físico), un ojal ámbar (la «memoria») y una línea de tiempo (su historia). Icono de app, icono adaptativo, icono monocromo de Android 13 y pantalla de carga propios. | Reconocimiento y correspondencia con el mundo real (H2): el símbolo representa lo que hace la app. Identidad consistente (H4). | `assets/`, `scripts/generate-icons.py`, `app.json` |
| Colores escritos a mano en cada pantalla, con variaciones del mismo verde. | Paleta «petróleo y ámbar» definida una sola vez como tokens: colores, tipografía, espaciado y radios. | Consistencia y estándares (H4); diseño estético y minimalista (H8). | `src/ui/tokens.ts`, `src/ui/theme.ts` |
| Botones, tarjetas y campos se dibujaban distinto en cada pantalla. | Biblioteca de componentes compartidos: `Button`, `IconButton`, `Chip`, `Badge`, `Card`, `TextField`, `EmptyState`, `NavBar`… | Consistencia interna (H4, regla de oro 1 de Shneiderman). | `src/ui/components.tsx` |
| Solo había tema claro. | Tema oscuro, con su propia paleta validada. | Flexibilidad (H7); comodidad visual en ambientes con poca luz. | `src/ui/tokens.ts` (`dark`), `app.json` (`userInterfaceStyle`) |
| El tema dependía únicamente del modo del teléfono. | En **Ajustes → Apariencia** se elige «Automático (igual que el teléfono)», «Claro» u «Oscuro», sin cambiar el modo del teléfono. La preferencia se guarda y se aplica antes de que desaparezca la pantalla de carga, para que no haya parpadeo. | Control y libertad del usuario (H3); flexibilidad y personalización (H7). | `src/Settings.tsx`, `src/data/profile.tsx` (`Appearance.setColorScheme`) |
| El QR adoptaba los colores de la app. | El QR se presenta como una etiqueta imprimible, siempre negra sobre blanco (también en modo oscuro), con el nombre del objeto y la marca. | Correspondencia con el mundo real (H2): parece la etiqueta física que se va a pegar. Así cualquier lector lo reconoce. | `app/object/[id]/qr.tsx` |

## 2. Navegación y estructura

| Antes | Cambio | Principio | Dónde |
|---|---|---|---|
| Toda la app estaba en una pantalla que mostraba u ocultaba partes; no había transiciones ni gesto de volver del sistema. | Pantallas reales con Expo Router: inicio, objeto, formularios, QR, NFC, escáner, archivados, ajustes, bienvenida y tutorial. Tienen transiciones nativas y gesto/botón de volver. | Consistencia con las convenciones de la plataforma (H4); el usuario sabe dónde está y cómo regresar (H1, H3). | `app/`, `app/_layout.tsx` |
| Todos los cambios de pantalla tenían la misma animación. | Los formularios (crear o editar) se abren desde abajo; la navegación entre secciones se desliza lateralmente. | La animación comunica el tipo de tarea: «tarea temporal» frente a «ir a otro lugar» (Norman, significantes). | `app/_layout.tsx` |
| Abrir un objeto desde un QR o NFC dejaba la pantalla sin historial. | El enlace abre directamente `/object/<id>` con el inicio debajo, de modo que «Volver» lleva a la lista. | Control y libertad (H3). | `app/+native-intent.tsx`, `unstable_settings` |
| Las acciones Editar, Archivar, QR y NFC eran cuatro iconos sueltos sobre la foto. | El QR y el NFC pasan a tarjetas con título y estado. Editar y Archivar se agrupan en «Más opciones». | Ley de Hick (menos opciones simultáneas); jerarquía visual (H8); etiquetas explícitas antes que iconos ambiguos (H6). | `app/object/[id]/index.tsx` |
| Al crear un objeto se volvía a la lista. | Al crear un objeto se abre su página, donde están los siguientes pasos (QR, NFC, primer evento). | Diseñar diálogos que conduzcan a un cierre (regla de oro 4 de Shneiderman); eficiencia (H7). | `src/forms/ObjectForm.tsx` |

## 3. Retroalimentación y estado del sistema

| Antes | Cambio | Principio | Dónde |
|---|---|---|---|
| Las acciones solo confirmaban con texto. | Retroalimentación multimodal: vibración de éxito, advertencia o error, junto con el aviso visual. | Retroalimentación inmediata (Norman; H1; regla de oro 3 de Shneiderman). | `src/ui/feedback/haptics.ts`, `FeedbackProvider.tsx` |
| Al leer o escribir NFC no se sabía si el teléfono estaba esperando la etiqueta. | Animación de pulso «acerca la etiqueta» y texto que indica dónde colocarla. Al terminar, check de éxito o icono de error; los cambios de estado se anuncian al lector de pantalla. | Visibilidad del estado (H1); correspondencia con el gesto físico (Norman, *mapping*). | `src/NfcScreen.tsx` |
| No había forma de saber si un objeto tenía etiqueta NFC. | Estado «Vinculada hace X» en la página del objeto e insignia «NFC» en la lista. | Visibilidad del estado (H1); reconocer antes que recordar (H6). | `app/index.tsx`, `app/object/[id]/index.tsx` |
| La lista mostraba la fecha completa del último evento. | Franja de resumen en el inicio (objetos, incidencias abiertas, con NFC) e insignias de incidencias abiertas en cada tarjeta. | Visibilidad del estado (H1); lectura de un vistazo (H8). | `app/index.tsx` |
| Las incidencias no tenían estado. | Las incidencias pueden estar «Abierta» o «Resuelta», con color, icono y texto. La página del objeto resume cuántas siguen abiertas y cuándo fue el último mantenimiento. | Correspondencia con el mundo real (H2): una incidencia se arregla. Estado visible (H1). | `src/storage.ts` (`resolved_at`), `app/object/[id]/index.tsx` |
| Escanear un QR ajeno daba un mensaje genérico. | Mensajes que distinguen los casos: código ajeno, objeto archivado (con botón «Ver objetos archivados») y objeto creado en otro teléfono. | Ayudar a diagnosticar y recuperarse de errores (H9). | `src/Scanner.tsx`, `src/NfcScreen.tsx`, `app/object/[id]/index.tsx` |

## 4. Prevención de errores y recuperación (control del usuario)

| Antes | Cambio | Principio | Dónde |
|---|---|---|---|
| Archivar y borrar eventos pedían confirmación con un diálogo; los diálogos repetidos se aceptan sin leer. | Las acciones reversibles se ejecutan al momento y muestran un aviso con «Deshacer». El borrado definitivo se hace solo cuando el aviso desaparece. | Control y libertad: salida de emergencia (H3); permitir revertir acciones (regla de oro 6 de Shneiderman). | `src/data/bus.ts`, `src/forms/EventForm.tsx`, `app/object/[id]/index.tsx` |
| Salir de un formulario descartaba lo escrito sin avisar. | Si hay cambios sin guardar, al salir (botón, gesto o tecla atrás) se pregunta «¿Descartar los cambios?». | Prevención de errores (H5). | `src/forms/useUnsavedGuard.ts` |
| La fecha de un evento podía ser futura. | El selector de fecha no permite fechas futuras y muestra la fecha relativa junto a la completa. | Prevención de errores (H5). | `src/forms/EventForm.tsx` |
| Se podía salir de la pantalla NFC a mitad de una escritura. | Salir se bloquea solo mientras se escribe o verifica la etiqueta, y se explica el motivo. | Prevención de errores (H5): evita etiquetas a medio escribir. | `src/NfcScreen.tsx` |
| Los errores de campo se mostraban solo con un borde rojo. | Error junto al campo, con icono, texto y anuncio al lector de pantalla, más una vibración de error. | No usar solo el color (WCAG 1.4.1); recuperación de errores (H9). | `src/ui/components.tsx` (`TextField`) |
| Al restaurar o resolver una incidencia no se podía deshacer. | «Deshacer» al resolver o reabrir una incidencia, y acceso directo «Abrir» al restaurar un objeto. | Control y libertad (H3); eficiencia (H7). | `app/object/[id]/index.tsx`, `app/archived.tsx` |

## 5. Accesibilidad (WCAG 2.2 AA)

| Antes | Cambio | Criterio | Dónde |
|---|---|---|---|
| Algunos textos y bordes no llegaban al contraste mínimo. | Todos los pares de texto y fondo, en claro y oscuro, se validan automáticamente (≥ 4.5:1 para texto, ≥ 3:1 para bordes de campos). | 1.4.3 Contraste mínimo; 1.4.11 Contraste sin texto. | `scripts/check-contrast.mjs` (`pnpm check:contrast`) |
| Había botones de icono de 44 dp y enlaces de texto pequeños. | Todos los controles miden al menos 48 dp; los botones con texto, 52 dp. | 2.5.8 Tamaño del objetivo; ley de Fitts. | `src/ui/components.tsx` |
| Los iconos sin texto no tenían descripción. | Cada `IconButton` exige una etiqueta accesible. Títulos de pantalla y secciones marcados como encabezados. Las tarjetas leen un resumen («Bici. Último evento… 2 incidencias abiertas»). | 1.1.1 Contenido no textual; 1.3.1 Información y relaciones; 4.1.2 Nombre, función, valor. | `src/ui/components.tsx`, `app/index.tsx` |
| Los cambios de estado no se anunciaban. | Avisos, errores y fases de NFC se anuncian con TalkBack, y el foco pasa al botón «Deshacer». | 4.1.3 Mensajes de estado. | `FeedbackProvider.tsx`, `NfcScreen.tsx` |
| Los avisos desaparecían a tiempo fijo. | La duración de los avisos respeta el ajuste de «tiempo de acción» del sistema; los que tienen «Deshacer» duran más. | 2.2.1 Tiempo ajustable. | `FeedbackProvider.tsx` |
| Las animaciones eran siempre iguales. | Con «reducir movimiento» activado se omiten las animaciones de diálogos, avisos, tutorial y pulso NFC. | 2.3.3 Animación desde interacciones. | `FeedbackProvider.tsx`, `NfcScreen.tsx`, `Onboarding.tsx` |
| Algunas alturas fijas cortaban el texto con letra grande. | Las alturas mínimas sustituyen a las fijas; el texto respeta el tamaño de letra del sistema. | 1.4.4 Cambio de tamaño del texto. | Todas las pantallas |
| El tipo de evento se distinguía sobre todo por el color. | Cada tipo tiene icono, color y nombre propios; las incidencias resueltas cambian también de icono. | 1.4.1 Uso del color. | `src/ui/event-types.ts` |
| Los grupos de opciones (tipo, icono, color) eran botones sueltos. | Se exponen como grupos de opción única (`radiogroup`/`radio`) con su estado «seleccionado». | 4.1.2 Nombre, función, valor. | `ObjectForm.tsx`, `EventForm.tsx` |

## 6. Carga cognitiva e información

| Antes | Cambio | Principio | Dónde |
|---|---|---|---|
| Las fechas siempre eran completas («4 de noviembre de 2026»). | Fechas relativas («Hoy», «Ayer», «Hace 3 días»); el lector de pantalla recibe la fecha completa. | Reconocer antes que recordar (H6); menos esfuerzo de lectura. | `src/ui/format.ts` |
| La historia era una lista larga sin orden visual. | Historia agrupada por mes y filtros por tipo (Todos / Notas / Incidencias / Mantenimientos) con contador. | Gestalt (proximidad, región común); flexibilidad (H7). | `app/object/[id]/index.tsx` |
| Con muchos objetos había que desplazarse para encontrar uno. | Buscador por nombre y descripción, que ignora acentos y mayúsculas, con contador de resultados y estado «Sin resultados». | Eficiencia para usuarios frecuentes (H7). | `app/index.tsx` |
| El icono del objeto se adivinaba por su nombre y fallaba a menudo. | El usuario elige el icono en una cuadrícula con nombres; si no elige, se propone uno según el nombre. | Control del usuario (H3); reconocer antes que recordar (H6). | `src/objects/icons.ts`, `ObjectForm.tsx` |
| El formulario de evento no explicaba los tipos. | Cada tipo muestra una explicación breve y un ejemplo adaptado en el título. | Ayuda contextual (H10); relación con el mundo real (H2). | `src/forms/EventForm.tsx` |
| El formulario mostraba todos los campos a la vez. | Divulgación progresiva: primero lo esencial (nombre o título); foto, documento, icono y color como secciones opcionales y marcadas como tales. | Diseño minimalista (H8); reducir carga de memoria (regla de oro 8). | `ObjectForm.tsx`, `EventForm.tsx` |
| Los estados vacíos solo decían que no había nada. | Cada estado vacío explica para qué sirve el espacio y ofrece la siguiente acción («Crear mi primer objeto», «Ver todos», «Borrar búsqueda»). | Visibilidad (H1); ayuda (H10). | `EmptyState` y todas las pantallas |
| Había opciones de cuenta que no funcionaban («Iniciar sesión»). | Se retiraron de la bienvenida; se explica que no hace falta cuenta. | Diseño minimalista (H8): no mostrar funciones inexistentes; correspondencia con el sistema real (H2). | `app/welcome.tsx` |

## 7. Interacción física con QR y NFC

| Antes | Cambio | Principio | Dónde |
|---|---|---|---|
| El QR solo lo entendía el escáner interno. | QR y NFC llevan un enlace `memoratag://objeto/<id>`: la cámara del sistema y un toque NFC abren la app directamente, incluso cerrada. | Eficiencia: menos pasos (H7); acceso directo desde el objeto físico. | `src/qr.ts`, `src/nfc-protocol.ts`, `plugins/with-nfc-intent.js` |
| El escáner era un recuadro sin guía. | Visor con esquinas marcadas en ámbar, instrucción de encuadre y alternativas visibles (leer NFC, elegir una foto del QR). | Affordance y significantes (Norman); flexibilidad (H7). | `src/Scanner.tsx` |
| La pantalla del QR no indicaba qué hacer con él. | Tres pasos ilustrados: imprimir, pegar y escanear. | Ayuda contextual (H10). | `app/object/[id]/qr.tsx` |
| No se explicaba qué guardan el QR o la etiqueta. | Aviso de privacidad: solo contienen un enlace, nunca la historia, y funcionan en el teléfono que tiene los datos. | Relación con el mundo real (H2); confianza y transparencia. | QR, NFC, tutorial |

## 8. Aprendizaje y ayuda

| Antes | Cambio | Principio | Dónde |
|---|---|---|---|
| No había introducción a la app. | Tutorial corto y opcional, con «Saltar» y «Anterior»: qué es, incidencias y deshacer, QR/NFC y privacidad. Se puede volver a ver. | Ayuda y documentación (H10); control del usuario (H3). | `src/Onboarding.tsx` |
| No había ayuda dentro de la app. | Sección «Ayuda» en Ajustes con respuestas breves: QR, NFC, incidencias, deshacer, y qué hacer si un código no abre nada. | Ayuda y documentación (H10). | `src/Settings.tsx` |
| La bienvenida solo pedía el nombre. | La bienvenida resume en tres puntos el valor de la app y explica para qué se usa el nombre. | Relación con el mundo real (H2); transparencia. | `app/welcome.tsx` |

## 9. Lenguaje

En toda la app los mensajes se escriben en lenguaje cotidiano, en segunda persona, y dicen qué pasó y qué hacer después. Por ejemplo: «Este objeto no está guardado en este teléfono. Puede haberse creado en otro dispositivo», en lugar de «Objeto no encontrado». Responde a H2 (relación con el mundo real) y H9 (diagnóstico y recuperación).

---

## Implementado frente a pendiente

**Implementado y comprobado técnicamente.**
- Comprobaciones automáticas en verde: tipos, pruebas de NFC/QR, respaldos y formatos, contraste WCAG de ambos temas, y compilación del bundle de Android.
- Lo anterior al rediseño (QR, vibración y tutorial) se probó en un teléfono Android real.
- El rediseño se instala en ese mismo teléfono para revisarlo.

**Pendiente de validar.**
- Lectura y escritura NFC con etiquetas físicas (NTAG213/215).
- Recorrido completo con TalkBack y con el tamaño de letra al máximo.
- **Validación con usuarios:** este documento describe decisiones de diseño basadas en principios, no resultados medidos. El efecto real en la usabilidad debe comprobarse con participantes.
