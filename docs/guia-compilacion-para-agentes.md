# Compilar e instalar la app móvil: procedimiento para agentes

Procedimiento exacto con el que se compila la app móvil (`proyecto/apps/mobile`) y se instala en un teléfono Android físico por depuración USB, sin Android Studio. Está escrito para un agente de IA que trabaja en la rama `develop` con un shell **no interactivo**. La guía para personas, con más contexto y el guion de prueba manual, es [guia-compilacion-y-pruebas.md](guia-compilacion-y-pruebas.md).

## 0. Reglas que no se deben romper

1. **No tocar el prototipo de la raíz** (`app/`, `components/`, `features/`, `package.json`, `pnpm-lock.yaml`, `app.json`, etc.). Ver `AGENTS.md`. Todos los comandos se ejecutan dentro de `proyecto/`.
2. **Nunca ejecutar `pnpm install` en la raíz del repositorio.** Solo en `proyecto/`.
3. **No usar Android Studio ni emuladores.** Se usan el SDK de línea de comandos, Gradle y `adb`.
4. **No subir la carpeta `proyecto/apps/mobile/android/`.** Es código nativo generado y ya está en `.gitignore`.
5. **Revisar `git status` después de compilar.** `expo run:android` y `expo prebuild` reescriben los scripts de `proyecto/apps/mobile/package.json`. Ese cambio se descarta siempre con `git checkout -- proyecto/apps/mobile/package.json`.
6. Las acciones que dependen del teléfono físico (aceptar avisos, desbloquearlo, activar opciones) las hace **la persona usuaria**. El agente se las pide y espera.

## 1. Entorno: las variables NO se cargan solas

Las herramientas están instaladas en `~/Android`, sin permisos de administrador:

| Ruta | Contenido |
|---|---|
| `~/Android/jdk-17` | JDK 17 (Eclipse Temurin), lo usa Gradle |
| `~/Android/Sdk/platform-tools` | `adb` |
| `~/Android/Sdk/cmdline-tools/latest/bin` | `sdkmanager` |
| `~/Android/Sdk/platforms` | `android-34`, `android-36` |
| `~/Android/Sdk/build-tools` | `35.0.0`, `36.0.0` |
| `~/Android/Sdk/ndk` | `27.1.12297006` |
| `~/Android/Sdk/cmake` | CMake |

`~/.bashrc` **no** exporta estas variables, y además el shell de un agente no lo carga. Por eso cada comando de Bash que use Gradle, Expo o `adb` tiene que empezar con este prefijo:

```bash
export JAVA_HOME=$HOME/Android/jdk-17 ANDROID_HOME=$HOME/Android/Sdk; export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH
```

En el resto de este documento ese prefijo se abrevia como `<ENV>`. Comprobación:

```bash
<ENV>; java -version 2>&1 | head -1; adb version | head -1; node --version; pnpm --version
```

Resultado esperado: Java 17, `adb` respondiendo, Node ≥ 22.6 (hoy hay v24) y pnpm (hoy 12.x).

Si `~/Android` no existe (otra máquina), hay que instalarlo siguiendo el apartado 3.1 de la guía para personas. Descarga unos 2 GB.

## 2. Dependencias

```bash
cd ~/Documentos/MemoraTag/proyecto && pnpm install
```

Solo hace falta la primera vez o cuando cambia `proyecto/pnpm-lock.yaml`.

## 3. Comprobar que el teléfono está conectado

```bash
<ENV>; adb devices
```

| Salida | Qué hacer |
|---|---|
| `XXXXXXXX	device` | Listo, se puede continuar. |
| `unauthorized` | Pedir a la persona que desbloquee el teléfono y acepte «¿Permitir depuración USB?» marcando «Permitir siempre». |
| Lista vacía | Pedir que revise el cable (tiene que ser de datos) y que active Opciones de desarrollador → Depuración USB. |

En Xiaomi, Redmi o POCO también deben estar activadas «Instalar vía USB» y «Depuración USB (ajustes de seguridad)». Sin ellas la instalación falla con `INSTALL_FAILED_USER_RESTRICTED`.

## 4. Antes de compilar: comprobaciones rápidas

Desde `proyecto/`:

```bash
pnpm --filter @memoratag/mobile typecheck
pnpm --filter @memoratag/mobile test:nfc
pnpm --filter @memoratag/mobile test:backup
pnpm --filter @memoratag/mobile test:ui
pnpm --filter @memoratag/mobile check:contrast
```

Todas deben terminar sin errores. No sirve de nada compilar si `typecheck` falla.

## 5. Compilar e instalar (procedimiento recomendado, paso a paso)

Se usa la forma manual porque cada paso deja ver claramente dónde falla. Todos los comandos se ejecutan desde `proyecto/apps/mobile`.

```bash
# 5.1 Generar el proyecto nativo android/ a partir de app.json y los plugins
<ENV>; cd ~/Documentos/MemoraTag/proyecto/apps/mobile && pnpm exec expo prebuild --clean --platform android

# 5.2 Descartar la reescritura de scripts que hace prebuild
cd ~/Documentos/MemoraTag/proyecto/apps/mobile && git checkout -- package.json

# 5.3 Compilar el APK de depuración (solo arm64, que es más rápido; sirve para cualquier teléfono moderno)
<ENV>; cd ~/Documentos/MemoraTag/proyecto/apps/mobile/android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a

# 5.4 Instalar en el teléfono (-r reemplaza la versión anterior sin borrar los datos)
<ENV>; cd ~/Documentos/MemoraTag/proyecto/apps/mobile && adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Notas para el agente:
- El paso 5.3 tarda varios minutos la primera vez (de 5 a 15) y menos de uno en las siguientes. Hay que ejecutarlo **en segundo plano** o con un timeout amplio (≥ 10 min). Si no, el comando se corta.
- Éxito en 5.3: `BUILD SUCCESSFUL`. Éxito en 5.4: `Success`.
- `--clean` en 5.1 regenera `android/` desde cero. Solo es necesario cuando cambian `app.json`, `assets/`, `plugins/`, los permisos o las dependencias nativas. Si solo cambió TypeScript, **no hace falta recompilar** (ver apartado 7).

**Atajo equivalente** (hace 5.1, 5.3 y 5.4 en un solo paso y además arranca el servidor). Después hay que repetir igualmente el paso 5.2:

```bash
<ENV>; cd ~/Documentos/MemoraTag/proyecto/apps/mobile && pnpm exec expo run:android --device
```

## 6. Ejecutar la app (servidor de desarrollo)

El APK es una *development build* (`expo-dev-client`): no lleva el JavaScript dentro, lo carga desde Metro en la computadora a través del cable USB.

```bash
<ENV>; adb reverse tcp:8081 tcp:8081
cd ~/Documentos/MemoraTag/proyecto/apps/mobile && pnpm start:dev     # = expo start --dev-client
```

- `pnpm start:dev` es un proceso que no termina: se lanza **en segundo plano**.
- **No** se debe poner `CI=1`, porque desactiva la recarga automática. Si los cambios no aparecen en el teléfono, hay que reiniciar con `pnpm start:dev --clear`.
- `adb reverse` se pierde al desconectar el cable o reiniciar `adb`. Si la app muestra «Unable to load script», hay que repetirlo.
- Para abrir la app desde el agente: `<ENV>; adb shell monkey -p com.memoratag.mobile 1`. El paquete Android es `com.memoratag.mobile`.
- No se debe usar `pnpm start` (`expo start --go`): ese comando es para Expo Go, que no tiene NFC.
- Si aparece el aviso `chrome-sandbox` / React Native DevTools en Linux, se puede ignorar.

## 7. Qué hacer según el tipo de cambio

| Cambio | Acción |
|---|---|
| Solo `.ts`/`.tsx` en `app/` o `src/` | Nada: Metro recarga solo. Si no se ve el cambio, recargar desde el menú de desarrollo o reiniciar Metro con `--clear`. |
| `app.json`, `assets/` (icono, pantalla de carga), `plugins/`, permisos, librería con código nativo | Repetir todo el apartado 5 (con `--clean`). Si el icono sigue sin cambiar: `adb uninstall com.memoratag.mobile` y volver a instalar (**esto borra los datos de la app en el teléfono**, así que hay que avisar a la persona antes). |

## 8. Ver errores en tiempo de ejecución

```bash
<ENV>; adb logcat -d | grep -iE "ReactNativeJS|AndroidRuntime|memoratag" | tail -50
```

Los errores de JavaScript también salen en la salida de Metro.

## 9. Problemas frecuentes

| Error | Causa | Solución |
|---|---|---|
| `Failed to resolve the Android SDK path` / `SDK location not found` | Falta `ANDROID_HOME` | Añadir el prefijo `<ENV>` al comando. |
| `spawn adb ENOENT` / `adb: command not found` | `platform-tools` no está en el `PATH` | Añadir el prefijo `<ENV>`. |
| `Unsupported class file major version` o un error de versión de Java | Se está usando otro Java | Añadir el prefijo `<ENV>` (Java 17). |
| `INSTALL_FAILED_USER_RESTRICTED` | Xiaomi sin «Instalar vía USB» | Pedir a la persona que lo active y acepte el aviso. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | El APK instalado se firmó con otra clave | `adb uninstall com.memoratag.mobile` (borra datos, así que hay que avisar antes) y volver a instalar. |
| La app se queda en blanco o muestra «Unable to load script» | El teléfono no llega a Metro | `adb reverse tcp:8081 tcp:8081` y comprobar que `pnpm start:dev` sigue en marcha. |
| `git status` muestra `apps/mobile/package.json` modificado | Lo reescribió `prebuild`/`run:android` | `git checkout -- package.json`. |

## 10. Al terminar

1. `git status`: no debe haber cambios en `package.json` ni en ningún archivo de la raíz (prototipo). `android/` no aparece porque está ignorada.
2. Informar a la persona: si la compilación salió bien, si la instalación respondió `Success` y si Metro está corriendo. Para las pruebas manuales en el teléfono, indicarle el apartado 5 de [guia-compilacion-y-pruebas.md](guia-compilacion-y-pruebas.md).
