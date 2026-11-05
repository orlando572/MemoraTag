# Guía de compilación y pruebas de la app móvil

Esta guía explica cómo instalar, compilar y probar la app móvil de MemoraTag (`proyecto/apps/mobile`) en un teléfono Android, paso a paso.

Hay dos formas de probarla:

| | **A. Expo Go** (rápida) | **B. Compilación de desarrollo** (completa) |
|---|---|---|
| Para qué sirve | Revisar pantallas y flujos | Probar todo, incluido NFC, el icono y la pantalla de carga |
| NFC | ❌ No disponible | ✅ Disponible |
| Icono y pantalla de carga propios | ❌ Usa los de Expo Go | ✅ |
| Necesita Android SDK y Java | No | Sí (la primera vez tarda unos 15–20 min) |

---

## 1. Requisitos comunes

- **Node.js 22.6 o superior.** Comprueba con `node --version`. Las pruebas automáticas usan `--experimental-strip-types`.
- **pnpm.** Instálalo con `npm install -g pnpm` y comprueba con `pnpm --version`.
- **Git** y una copia del repositorio.
- **Un teléfono Android.** Para NFC, uno con NFC y etiquetas **NTAG213 o NTAG215**.

Instala las dependencias una sola vez, desde la carpeta `proyecto/` (no desde la raíz, que contiene el prototipo original):

```bash
cd proyecto
pnpm install
```

---

## 2. Opción A: probar con Expo Go

1. Instala **Expo Go** desde Google Play.
2. Pon la computadora y el teléfono en la **misma red WiFi**.
3. Arranca el servidor de desarrollo:
   ```bash
   cd proyecto
   pnpm --filter @memoratag/mobile start
   ```
4. Escanea el QR que aparece en la terminal con Expo Go.

En Expo Go, las pantallas de NFC muestran «NFC necesita una compilación de desarrollo»; es normal. El resto de la app funciona.

---

## 3. Opción B: compilación de desarrollo (con NFC)

### 3.1 Instalar Java 17 y el Android SDK (solo la primera vez)

**Windows o macOS:** instala [Android Studio](https://developer.android.com/studio). En *SDK Manager*, instala **Android SDK Platform 36**, **Build-Tools 36.0.0**, **NDK 27.1.12297006** y **CMake 3.22.1**. Android Studio ya incluye un JDK compatible.

**Linux (sin Android Studio ni permisos de administrador):** todo queda dentro de `~/Android`.

```bash
mkdir -p ~/Android/Sdk/cmdline-tools && cd ~/Android
# Java 17 (Eclipse Temurin)
curl -L -o jdk.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
tar -xzf jdk.tar.gz && mv jdk-17* jdk-17
# Herramientas de línea de comandos de Android
curl -L -o cmdline.zip "https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
unzip -q cmdline.zip -d Sdk/cmdline-tools && mv Sdk/cmdline-tools/cmdline-tools Sdk/cmdline-tools/latest
```

Añade estas líneas al final de `~/.bashrc` y abre una terminal nueva:

```bash
export JAVA_HOME=$HOME/Android/jdk-17
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH
```

Acepta las licencias e instala los paquetes del SDK (descarga unos 2 GB):

```bash
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006" "cmake;3.22.1"
```

Comprueba que funciona: `java -version` debe mostrar la 17 y `adb version` debe responder.

### 3.2 Preparar el teléfono (solo la primera vez)

1. **Activa las opciones de desarrollador:** en **Ajustes → Acerca del teléfono**, toca **7 veces** «Número de compilación» (en algunos modelos está en «Información de software»).
2. **Activa la depuración USB:** en **Ajustes → Sistema → Opciones de desarrollador**, activa **Depuración USB**.
3. **Solo en Xiaomi, Redmi o POCO:** en las mismas opciones activa también **«Instalar vía USB»** y **«Depuración USB (ajustes de seguridad)»**. Puede pedirte iniciar sesión con la cuenta Xiaomi; sin esto la instalación falla con `INSTALL_FAILED_USER_RESTRICTED`.
4. **Conecta el teléfono por USB** y acepta **«¿Permitir depuración USB?»**, marcando «Permitir siempre».
5. Comprueba que la computadora lo detecta:
   ```bash
   adb devices
   ```
   Debe aparecer una línea terminada en `device`. Si dice `unauthorized`, desbloquea el teléfono y acepta el aviso.

### 3.3 Compilar e instalar

La forma corta compila, instala y arranca todo:

```bash
cd proyecto/apps/mobile
pnpm exec expo run:android --device
```

La primera compilación tarda varios minutos; las siguientes son mucho más rápidas. Al terminar, la app **MemoraTag** queda instalada en el teléfono con su propio icono.

> `expo run:android` crea la carpeta `android/`. Está en `.gitignore`, así que no se sube al repositorio. También puede modificar los scripts de `package.json`; si `git status` lo muestra modificado, descarta ese cambio con `git checkout -- package.json`.

<details>
<summary>Forma manual, paso a paso (útil si la corta falla)</summary>

```bash
cd proyecto/apps/mobile
pnpm exec expo prebuild --clean --platform android   # genera android/
git checkout -- package.json                          # descarta el cambio de scripts
cd android && ./gradlew assembleDebug && cd ..        # compila el APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Para compilar más rápido solo para teléfonos modernos de 64 bits, añade `-PreactNativeArchitectures=arm64-v8a` al comando de `gradlew`.
</details>

### 3.4 Usar la app instalada

La compilación de desarrollo carga el código desde la computadora. Cada vez que quieras usarla:

```bash
cd proyecto/apps/mobile
adb reverse tcp:8081 tcp:8081      # el teléfono usa el servidor por el cable USB
pnpm start:dev
```

Abre **MemoraTag** en el teléfono (no Expo Go). Los cambios en el código se recargan solos. Mantén el cable conectado mientras pruebas.

**Cuándo hay que recompilar.** Solo si cambias algo nativo: el icono o la pantalla de carga (`assets/`, `app.json`), los plugins o permisos, o si añades una librería con código nativo. En ese caso, vuelve a ejecutar el paso 3.3. Si cambias solo código TypeScript, no hace falta.

---

## 4. Comprobaciones automáticas

Desde `proyecto/`:

```bash
pnpm --filter @memoratag/mobile typecheck       # tipos de TypeScript
pnpm --filter @memoratag/mobile test:nfc        # formato QR/NFC y sesión NFC (sin hardware)
pnpm --filter @memoratag/mobile test:backup     # respaldos: validación, fusión e importación
pnpm --filter @memoratag/mobile test:ui         # fechas relativas, iconos y colores
pnpm --filter @memoratag/mobile check:contrast  # contraste WCAG AA de los temas claro y oscuro
```

Todas deben terminar sin errores (`fail 0` en las pruebas y «Todas las combinaciones cumplen WCAG AA» en el contraste).

Para regenerar el logotipo y los iconos después de editar `scripts/generate-icons.py` (necesita Python 3 con Pillow: `pip install pillow`):

```bash
cd proyecto/apps/mobile && pnpm icons
```

---

## 5. Guion de prueba manual

Recorre estos pasos en el teléfono tras cada cambio importante. Marca cada uno al comprobarlo.

**Primer uso**
- [ ] La pantalla de carga muestra el logotipo y desaparece sin parpadeo.
- [ ] La bienvenida pide el nombre; si se deja vacío, aparece el error junto al campo.
- [ ] El tutorial de 4 pasos funciona con «Siguiente», «Anterior» y «Saltar».

**Objetos y eventos**
- [ ] Crear un objeto eligiendo icono y color: se abre su página al guardarlo.
- [ ] Registrar una nota, una incidencia y un mantenimiento, con foto y documento.
- [ ] Marcar la incidencia como resuelta y usar «Deshacer». El resumen del objeto se actualiza.
- [ ] Filtrar la historia por tipo; la historia aparece agrupada por mes.
- [ ] Editar un evento, borrarlo y usar «Deshacer»: el evento vuelve.
- [ ] Escribir en un formulario y pulsar atrás: pregunta «¿Descartar los cambios?».
- [ ] Archivar el objeto («…» → Archivar) y usar «Deshacer». Volver a archivarlo y restaurarlo desde Ajustes → «Objetos archivados».
- [ ] Buscar en el inicio por nombre, también sin tildes.

**QR**
- [ ] En el objeto, «Código QR» → «Compartir o imprimir» genera una imagen.
- [ ] «Escanear» lee el QR y abre el objeto.
- [ ] Con la app cerrada, la cámara del teléfono reconoce el QR y abre MemoraTag en el objeto.
- [ ] Un QR ajeno muestra «Este código no es de MemoraTag».

**NFC** (solo compilación de desarrollo, con NFC activado)
- [ ] En el objeto, «Etiqueta NFC» → escribir: vibra, muestra el check y el objeto indica «Vinculada».
- [ ] «Escanear» → «Leer etiqueta NFC» abre el objeto.
- [ ] Con la app cerrada y el teléfono desbloqueado, acercar la etiqueta abre el objeto.
- [ ] Una etiqueta escrita con la versión anterior (texto) se sigue leyendo.

**Apariencia y accesibilidad**
- [ ] En Ajustes → Apariencia, «Claro», «Oscuro» y «Automático» cambian la app sin cambiar el teléfono, y la elección se mantiene al reiniciar.
- [ ] Con TalkBack activado se puede recorrer el flujo principal; los botones de icono tienen nombre.
- [ ] Con la letra del sistema al máximo, ningún texto se corta.
- [ ] Con «Quitar animaciones» activado, los avisos y diálogos aparecen sin animación.

**Respaldo**
- [ ] Exportar un respaldo, importarlo de nuevo y comprobar que no se duplican los objetos.

---

## 6. Problemas frecuentes

| Mensaje o síntoma | Causa | Solución |
|---|---|---|
| `Failed to resolve the Android SDK path` | No se encuentra el SDK. | Define `ANDROID_HOME` (apartado 3.1) y abre una terminal nueva. |
| `spawn adb ENOENT` | `adb` no está en el `PATH`. | Añade `$ANDROID_HOME/platform-tools` al `PATH`. |
| `adb devices` no muestra nada | Cable solo de carga, depuración USB apagada o aviso sin aceptar. | Usa un cable de datos, activa la depuración USB y acepta el aviso en el teléfono. |
| `INSTALL_FAILED_USER_RESTRICTED` (Xiaomi) | Falta «Instalar vía USB». | Actívalo en Opciones de desarrollador (apartado 3.2) y vuelve a instalar; acepta el aviso del teléfono. |
| La app muestra «Unable to load script» o se queda en blanco | El teléfono no llega al servidor. | Ejecuta `adb reverse tcp:8081 tcp:8081` y `pnpm start:dev`, y vuelve a abrir la app. |
| La app no refleja los últimos cambios | El servidor se inició en modo CI (sin recarga) o con caché antigua. | Detén el servidor y arráncalo con `pnpm start:dev --clear` (sin `CI=1`). |
| `An unknown error occurred while installing React Native DevTools … chrome-sandbox` | El depurador de escritorio no puede abrirse en Linux. | Se puede ignorar: no afecta a la app. |
| NFC: «NFC necesita una compilación de desarrollo» | Se está usando Expo Go. | Usa la opción B. |
| NFC: «Activa NFC en los ajustes» | NFC apagado en el teléfono. | Actívalo en el centro de control o en Ajustes → Conexión y uso compartido → NFC. |
| El icono o la pantalla de carga no cambian | Son recursos nativos. | Recompila (apartado 3.3); si persiste, desinstala la app del teléfono y vuelve a instalarla. |
