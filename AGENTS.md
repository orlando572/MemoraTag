# Instrucciones del proyecto

- El prototipo funcional existente en la raíz debe permanecer intacto. No modificar, sobrescribir, mover ni eliminar sus archivos o configuración, incluidos `app/`, `components/`, `features/`, `package.json`, `pnpm-lock.yaml`, `app.json`, `tsconfig.json` y los demás archivos de configuración del prototipo.
- Desarrollar las nuevas aplicaciones y el backend en carpetas separadas dentro de esta misma raíz; consultar `docs/arquitectura.md` para la estructura prevista.
- Antes de configurar el monorepositorio, elegir una solución que no modifique el `package.json` del prototipo ni altere su ejecución. Si una tarea requiere cambiar el prototipo, solicitar autorización expresa.
- Mantener el backend como monolito modular con arquitectura hexagonal, sin microservicios.
- Distinguir en la documentación las funcionalidades implementadas de las previstas.
