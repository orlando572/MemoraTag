# Visión y alcance de MemoraTag

## Visión

MemoraTag es una aplicación de memoria digital para objetos físicos. Permite consultar y registrar acontecimientos y archivos relacionados con un objeto mediante una línea de tiempo.

La interacción principal consiste en identificar el objeto mediante QR o NFC, recuperar su contexto y registrar lo sucedido.

## Objetivo

Diseñar y evaluar una interfaz móvil orientada a eventos que facilite el registro y la recuperación de información sobre objetos físicos. El proyecto apoya un artículo de investigación y se desarrollará con un alcance compatible con un plazo estimado de tres a cuatro semanas.

## Usuario principal

Personas que desean conservar información sobre objetos cotidianos, como notas, fotografías, incidencias, mantenimientos y documentos. La gestión empresarial se contempla como evolución futura, no como foco de la primera versión.

## Alcance inicial

- Crear, consultar y editar objetos y su historial.
- Registrar notas, incidencias, mantenimientos y fotografías.
- Adjuntar archivos ligeros, incluidos PDF y documentos de Excel, con un límite de 5 MB por archivo.
- Identificar y abrir objetos mediante códigos QR y etiquetas NFC; escribir etiquetas NFC desde la aplicación.
- Utilizar la aplicación móvil sin conexión y sin crear una cuenta.
- Crear objetos y eventos, y guardar archivos localmente sin conexión.
- Crear una cuenta posteriormente y sincronizar los datos locales.
- Gestionar objetos y eventos desde una plataforma web sencilla.
- Consultar objetos publicados desde un navegador, sin cuenta ni instalación de la aplicación.
- Permitir que un objeto sea público o privado.
- Evaluar la interfaz mediante tareas de uso representativas.

## Cuenta, publicación y privacidad

- Una persona puede usar la aplicación móvil sin cuenta ni conexión.
- Sin cuenta, los datos permanecen en el dispositivo y no están disponibles para otras personas ni dispositivos.
- Al crear una cuenta, la persona puede asociar y sincronizar sus datos locales.
- Los objetos son privados por defecto. Si el usuario los marca como públicos, se publican automáticamente al sincronizarlos con una cuenta.
- Un objeto privado requiere una cuenta para controlar su acceso.
- El acceso público permite consultar, pero no editar.
- La primera versión no incluirá bloqueo adicional con PIN o biometría.
- El QR o NFC identifica el objeto; no contiene su información privada.
- Los objetos se archivan en lugar de eliminarse inmediatamente; la base de datos central utiliza eliminación lógica para los registros.

## Archivos y sincronización

Los archivos se guardan localmente cuando no hay conexión y se sincronizan posteriormente con la cuenta vinculada. La aplicación debe indicar cuáles están pendientes de sincronización.

Cada archivo puede tener un tamaño máximo de 5 MB. Los formatos admitidos se definirán antes de la implementación. La interfaz debe advertir que hacer público un objeto puede exponer información sensible y sus archivos.

## Fuera del alcance inicial

- Dashboard empresarial con equipos, roles y múltiples organizaciones.
- Contabilidad y gestión avanzada de activos.
- Integraciones empresariales e inteligencia artificial.
