# Revisión y correcciones — microcredito-p2-pwa

## Alcance

Se revisó únicamente `microcredito-p2-pwa` y los archivos de la raíz. La carpeta `microcredito-p1` fue excluida deliberadamente.

No se modificaron los archivos CSS ni se rediseñaron los estilos.

## Correcciones principales

1. **Estado de solicitudes**
   - Se corregió la inconsistencia `PENDIENTE` vs `SOLICITADO`.
   - La solicitud creada por el cliente/asesor ahora llega correctamente a la bandeja de gerencia.
   - Se evita crear solicitudes pendientes duplicadas.

2. **Flujo de aprobación**
   - Gerencia es la única que puede acceder a la bandeja del comité.
   - Solo se aprueban solicitudes dentro de los límites definidos: Q100–Q20,000 y 1–24 meses.
   - Se agregó confirmación antes de aprobar/rechazar.
   - Al aprobar se conserva el flujo de dominio `SOLICITADO -> APROBADO -> VIGENTE`.
   - Se evita crear dos veces el mismo crédito.

3. **Autorización por rol**
   - Cliente: puede operar únicamente sus propios créditos.
   - Asesor: puede registrar solicitudes para clientes, consultar la cartera y registrar pagos.
   - Gerencia: puede revisar y decidir solicitudes.
   - Las páginas operativas redirigen a la pantalla correspondiente cuando no hay sesión o el rol no está autorizado.

4. **Solicitudes de crédito**
   - El cliente ya no puede cambiar el nombre de cliente para solicitar por otra persona.
   - El asesor puede indicar el cliente.
   - Validación de nombre, monto, plazo, rangos, enteros y valores numéricos.
   - Se impide solicitar otro crédito mientras exista uno activo o una solicitud pendiente.

5. **Créditos**
   - Se agregó estado persistente al crédito.
   - Se mantiene compatibilidad con créditos creados por una versión anterior, asignándoles `VIGENTE`.
   - Se evita registrar cuotas cuando el crédito ya está cancelado.

6. **Registro de pagos**
   - El cliente no puede pagar un crédito ajeno manipulando el `id` de la URL.
   - Se valida que exista el crédito.
   - Se valida que no esté totalmente pagado.
   - Se valida que el monto sea válido.
   - En esta versión se exige el total exacto de la cuota exigible para evitar que un pago parcial o excedente incremente incorrectamente una cuota completa.
   - Se considera la suspensión del interés corriente después de 90 días de atraso según la regla existente en el dominio.
   - Se evita doble envío deshabilitando el botón durante el procesamiento.

7. **`mi-credito`**
   - Se corrigió el flujo de carga de la vista.
   - Ahora muestra solicitudes y créditos.
   - Cliente ve los suyos; asesor puede consultar la cartera completa.
   - Los enlaces de detalle, plan y pago llevan el `id` correcto.

8. **Navegación y sesión**
   - Se corrigió el cierre de sesión para no borrar `localStorage`, ya que eso destruía cuentas, solicitudes y créditos.
   - Los enlaces de pago sin `id` ahora llevan a la selección/listado correcto.
   - Se agregó menú funcional para el rol asesor.

9. **Datos locales**
   - Lecturas de `localStorage`/`sessionStorage` más tolerantes ante JSON corrupto.
   - Validación de cuentas y roles.
   - Escape de contenido dinámico antes de insertarlo con `innerHTML`.

10. **PWA / Service Worker**
    - Se incrementó la versión de caché.
    - Se incluyeron las páginas y archivos JS realmente utilizados.
    - Se eliminaron del `dist` archivos compilados obsoletos que ya no existen en `src`.

11. **Reseñas**
    - Se habilitó el formulario de reseña en el inicio del cliente.
    - La marca de reseña realizada se separa por usuario.
    - Se agregó límite de 500 caracteres.

12. **Dominio**
    - Validación de tasa y número de cuotas en el plan francés.
    - Validación de pagos negativos y rubros de deuda negativos.

## Sobre las peticiones/backend

La PWA no contiene llamadas HTTP reales a una API/backend para créditos, solicitudes o pagos. La persistencia actual se hace con `localStorage` y la cola offline es una simulación local de sincronización.

Por lo tanto, no se inventó ningún endpoint. Las correcciones se hicieron sobre el flujo local existente. Si el Proyecto 2 debe conectarse posteriormente a una API real, habrá que sustituir esas operaciones por llamadas autenticadas al backend.

## Validaciones ejecutadas

- `npm run build` → OK.
- Verificación de sintaxis JavaScript del Service Worker y archivos principales → OK.
- Comprobación de imports relativos generados en `dist` → OK.
- Comprobación de referencias HTML → `dist` → OK.
- Smoke test de amortización → OK.
- Smoke test de prelación de pagos → OK.
- Smoke test de transición de solicitud a aprobación y desembolso → OK.
- Smoke test de cuentas, sesión y solicitudes en almacenamiento local → OK.
