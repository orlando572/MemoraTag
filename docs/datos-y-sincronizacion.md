# Datos y sincronización

## Objetivo

Definir la información principal de MemoraTag y cómo se conserva y sincroniza entre el dispositivo y la nube.

## Entidades principales

| Entidad | Información principal |
|---|---|
| Usuario | Identidad de una persona con cuenta. |
| Objeto | Identificador, nombre, descripción, imagen, visibilidad y fechas. |
| Evento | Objeto asociado, tipo, título, descripción y fecha. |
| Archivo | Objeto o evento asociado, nombre, tipo, tamaño y ubicación local o remota. |
| Identificador QR/NFC | Valor que permite encontrar el objeto asociado. |

Cada archivo tendrá un límite de **5 MB**. Los formatos admitidos se definirán antes de implementar su selección y validación.

## Almacenamiento

- **SQLite local:** objetos, eventos, metadatos y operaciones pendientes.
- **Archivos locales:** fotografías y documentos guardados en el dispositivo.
- **PostgreSQL en Supabase:** datos sincronizados y relaciones entre entidades.
- **Supabase Storage:** archivos sincronizados en la nube.

## Uso local y sincronización

La aplicación móvil permite crear y consultar objetos, registrar eventos, adjuntar archivos y leer o escribir etiquetas NFC sin cuenta ni conexión. También permite generar y leer códigos QR.

Los datos permanecen en el dispositivo hasta que el usuario vincule una cuenta y los sincronice. Si pierde el dispositivo o borra los datos de la aplicación antes de sincronizar, podría perder la información local. Los identificadores de QR y NFC deben seguir asociados al mismo objeto después de la sincronización.

Al vincular una cuenta, la aplicación asocia y sincroniza los datos locales. Los cambios realizados sin conexión se guardan localmente y se envían al recuperar la conexión. Los archivos pueden quedar pendientes aunque el objeto o evento ya se haya sincronizado.

La interfaz mostrará estados sencillos: **pendiente**, **sincronizado** o **error**. Una operación en curso se considera pendiente hasta que el servidor confirme su sincronización. Los reintentos no deben crear duplicados.

## Conflictos

- Los eventos creados por separado en distintos dispositivos se conservan.
- Si el mismo objeto se edita simultáneamente en distintos dispositivos, se informa al usuario y se le permite elegir qué versión conservar, sin sobrescribir cambios silenciosamente.
- Los archivos se asocian a su objeto o evento cuando se completa su carga.

La detección y resolución concreta de conflictos se definirá antes de implementar la sincronización.

## Privacidad y publicación

- Los objetos son **privados por defecto**. Sin cuenta, permanecen únicamente en el dispositivo.
- Si el usuario marca un objeto como público, se publica automáticamente al sincronizarlo con una cuenta, tanto si la cuenta ya estaba vinculada como si se vincula después.
- El acceso público permite consultar, no editar. Los eventos y archivos siguen la visibilidad del objeto en la primera versión.
- La interfaz debe advertir que hacer público un objeto puede exponer información sensible y sus archivos.
- QR y NFC contienen un identificador, no el historial ni los archivos del objeto.

## Archivo y eliminación lógica

Los objetos se archivan en lugar de eliminarse inmediatamente. En la base de datos central, los registros utilizan **eliminación lógica**: se marcan como eliminados en vez de borrarse físicamente y las consultas habituales los excluyen.

Las reglas de restauración, retención y tratamiento de archivos almacenados se definirán antes de implementar esta funcionalidad.
