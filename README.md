# SkyJourney — The Art of Flying

Abrí **index.html** en un navegador moderno con WebGL2. El juego contiene Three.js, geometría, shaders, pantallas, estilos y audio dentro del mismo archivo. No necesita conexión, cuenta, CDN ni instalación para el vuelo normal. Para GitHub Pages basta publicar ese HTML.

Comienza en crucero al atardecer. Flight permite elegir Zen, Standard o Simulation, cambiar el piloto automático y practicar despegue o aproximación en Solana. World ofrece seis rutas sobre el mismo archipiélago que muestran los mapas de navegación. Weather controla nueve climas y la hora. Camera permite doce vistas y fotografías PNG. Settings incluye idioma, calidad, audio, controles, movimiento del móvil y guardado/importación/exportación.

| Control | Acción |
|---|---|
| W / S | Bajar / subir el morro |
| A / D | Alabeo izquierdo / derecho |
| Q / E | Timón de dirección |
| Shift / Ctrl | Aumentar / reducir potencia |
| P | Piloto automático |
| G / F | Tren de aterrizaje / flaps |
| Space | Frenar |
| V / C | Cambiar cámara / cámara cinematográfica |
| Esc / H | Pausa / ocultar interfaz |
| Arrastrar, rueda, doble clic | Mirar u orbitar, zoom, restablecer encuadre |
| Flechas y Page Up / Down en Free | Desplazar la cámara libre |

En la cabina, pulsá las perillas SPD, HDG, ALT y VS para aumentar sus objetivos; Shift y clic los reduce. Los mandos, flaps, tren, instrumentos, mapa y motores leen el mismo estado físico. El gamepad utiliza stick izquierdo para vuelo, derecho para cámara y gatillos para potencia. La pantalla táctil ofrece joystick, potencia, freno y cámara.

## Volar directamente en el móvil

Usá una copia publicada por HTTPS o la página del servidor local. En Settings pulsá **Phone tilt controls**, concedé el permiso de movimiento y calibrá sosteniendo el teléfono en tu posición cómoda. La inclinación lee los sensores de acelerómetro y giroscopio mediante Device Orientation, se adapta a la orientación de pantalla y aplica suavizado y zona neutra. En Settings podés invertir cada eje del acelerómetro: **Y** para cabeceo (subir/bajar el morro), **X** para alabeo y **Z** para timón. El eje Z usa la rotación de orientación que entregue el teléfono; si no hay datos de ese sensor, el timón queda neutro. La preferencia se guarda y también se incluye en el vuelo exportado. Si el dispositivo no entrega sensores, el joystick sigue disponible.

## Usar el móvil como mando de la PC por Wi-Fi

1. En una PC con Windows, Node.js 22 o posterior y PowerShell, abrí **Start-SkyJourney.cmd**. Conservá junto al lanzador las carpetas `tools` y `src`; el vuelo normal solo requiere `index.html`.
2. La consola abre el simulador por HTTPS y muestra direcciones para el teléfono y un código de seis dígitos. Ambos dispositivos deben compartir la Wi-Fi. Si hay varias direcciones, elegí la del adaptador de esa red.
3. El panel de conexión muestra el **QR automáticamente**. Escanealo con la cámara del teléfono: el enlace incluye el código y conecta el mando automáticamente. Podés volver a abrirlo desde **Settings → Use phone as Wi-Fi yoke**, o usar la dirección `/controller` y escribir el código manualmente. Al enlazar el celular, el panel se cierra para dejar visible el vuelo. El servidor genera su propio certificado local; la aceptación del navegador la hace el usuario. Si los sensores necesitan confianza completa, la página ofrece descargar el certificado de **esta PC** y explica cómo instalarlo en Android o iPhone. El lanzador no cambia almacenes de certificados ni reglas de firewall automáticamente.
4. Una vez conectado, pulsá **Activar movimiento**, concedé el permiso y **Centrar mando**. Incliná el móvil como un yoke; regulá la potencia con el deslizador. El teléfono muestra IAS, altitud, rumbo, velocidad vertical, actitud y estados de AP, tren y flaps.
5. En **Confort y sensibilidad** podés invertir por separado **Y (cabeceo)**, **X (alabeo)** y **Z (timón)**; las opciones se recuerdan en ese teléfono y conservan el centrado. El feedback háptico se puede desactivar o ajustar en intensidad. Hay joystick táctil de respaldo, freno y botones de cámara, AP, tren, flaps y pausa. Al perder la conexión se sueltan los mandos y la PC mantiene el vuelo con piloto automático. Ctrl+C en la consola detiene el servidor.

Si Windows consulta el acceso de Node.js a la red, habilitá únicamente la red privada que estás usando. Algunas redes Wi-Fi aíslan a sus dispositivos y no permiten este enlace.

## Feedback háptico

En Settings activá **Feedback háptico de vuelo**, elegí su intensidad y pulsá **Probar vibración**. El mando Wi-Fi tiene los mismos ajustes en **Confort y sensibilidad**. Los pulsos reaccionan al movimiento de los mandos, la carga aerodinámica, las turbulencias y la tormenta; la pérdida y el aterrizaje tienen avisos diferentes. El clima **Tormenta** aumenta lluvia, viento y turbulencia de la simulación.

La intensidad cambia la duración y frecuencia de los pulsos: la API web no controla la fuerza del motor ni puede oponer resistencia física. La sensación de resistencia es una señal háptica de la carga. La vibración se cancela al desactivarla, poner intensidad cero, pausar u ocultar la página; en el mando Wi-Fi también se detiene si se pierde la conexión o la telemetría.

La vibración necesita interacción con la página y compatibilidad del navegador y dispositivo. El botón de prueba indica si falta la API o el navegador rechaza el pedido, pero solo una prueba con el teléfono confirma la sensación física. [API de vibración y compatibilidad](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate).

## Verificación y límites

Se verificaron la física, los actuadores, el terreno visible frente a su colisión, el guardado, las cámaras, controles, fotografía y diseño móvil. El puente se probó con HTTPS verificando su CA local, emparejamiento, controles, telemetría y desconexión. El HTML se probó por una vista previa HTTP local sin solicitudes de recursos externos; su script clásico integrado también se valida de forma estática. La prueba de apertura directa `file://` en la herramienta de navegador no estuvo disponible por su política de protocolos.

La orientación, vibración y gamepad físico necesitan comprobación con los dispositivos reales. La compatibilidad de sensores y vibración depende del navegador; iPhone puede no ofrecer vibración. Los gráficos son procedurales y la física es simplificada: la fidelidad es estilizada, sin alcanzar el fotorealismo de las referencias.

Desarrollo con Node.js 22 o posterior: `npm ci`, `npm run build` y `npm test`. La carpeta `artifacts` contiene capturas de verificación. No se necesita para jugar.

Para las pruebas de navegador, instalá Chromium con `npx playwright install chromium`. Ejecutá `node tests/qr-dialog-browser.mjs`, `node tests/mobile-qr-browser.cjs` y `node tests/motion-browser.mjs`. Para el recorrido completo, dejá `node tools/preview.mjs` activo en otra terminal y ejecutá `node tests/browser-smoke.mjs`. Opcionalmente, la variable `SKYJOURNEY_BROWSER_CHANNEL=chrome` permite usar Google Chrome ya instalado. [Guía de instalación de Playwright](https://playwright.dev/docs/library).

Three.js está incluido bajo su licencia MIT. La aplicación no incorpora las imágenes de referencia como fondo ni carga modelos, texturas, música o servicios externos.

Documentación de sensores: [DeviceOrientationEvent y permisos](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static).
