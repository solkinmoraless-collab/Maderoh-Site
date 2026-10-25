"use strict";


/* =========================================================
   MADERÓH
   CONFIGURADOR DE PROYECTOS PERSONALIZADOS
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */




const PRIVACY_VERSION =
    "2026-08-preliminar";


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* =================================================
           ELEMENTOS PRINCIPALES
        ================================================= */

        const formulario =
            document.getElementById(
                "configurador"
            );


        if (!formulario) {

            return;

        }


        const comentarios =
            document.getElementById(
                "comentarios"
            );


        const contadorCaracteres =
            document.getElementById(
                "character-count"
            );


        const businessExtra =
            document.getElementById(
                "business-extra"
            );


        const errorBox =
            document.getElementById(
                "form-error"
            );


        const successBox =
            document.getElementById(
                "form-success"
            );


        const botonEnviar =
            document.getElementById(
                "configurator-submit"
            );


        const radiosTipo =
            document.querySelectorAll(
                'input[name="tipoProyecto"]'
            );


        /* =================================================
           TIPO DE PROYECTO
        ================================================= */

        radiosTipo.forEach(
            radio => {

                radio.addEventListener(
                    "change",
                    () => {

                        actualizarTipoProyecto();

                        actualizarResumen();

                    }
                );

            }
        );


        function actualizarTipoProyecto() {

            const tipo =
                obtenerTipoProyecto();


            if (!businessExtra) {

                return;

            }


            businessExtra.hidden =
                tipo !== "Negocio";

        }


        /* =================================================
           CONTADOR DE COMENTARIOS
        ================================================= */

        if (
            comentarios &&
            contadorCaracteres
        ) {

            comentarios.addEventListener(
                "input",
                () => {

                    contadorCaracteres.textContent =
                        String(
                            comentarios.value.length
                        );

                }
            );

        }


        /* =================================================
           RESUMEN EN TIEMPO REAL
        ================================================= */

        const camposResumen = [

            "producto",
            "cantidad"

        ];


        camposResumen.forEach(
            id => {

                const elemento =
                    document.getElementById(
                        id
                    );


                if (!elemento) {

                    return;

                }


                elemento.addEventListener(
                    "input",
                    actualizarResumen
                );


                elemento.addEventListener(
                    "change",
                    actualizarResumen
                );

            }
        );


        /* =================================================
           ENVÍO DEL FORMULARIO
        ================================================= */

        formulario.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                ocultarError();

                ocultarExito();


                const datos =
                    obtenerConfiguracion();


                /* =========================================
                   VALIDACIÓN DEL PROYECTO
                ========================================== */

                const errorValidacion =
                    validarConfiguracion(
                        datos
                    );


                if (
                    errorValidacion
                ) {

                    mostrarError(
                        errorValidacion
                    );


                    return;

                }


                /* =========================================
                   VALIDAR WHATSAPP
                ========================================== */

                if (
                    typeof crearWhatsAppURL !==
                    "function"
                ) {

                    mostrarError(
                        "No fue posible preparar WhatsApp. Recarga la página e inténtalo nuevamente."
                    );


                    return;

                }


                /* =========================================
                   BLOQUEAR BOTÓN
                ========================================== */

                cambiarEstadoEnvio(
                    true
                );


                try {
                    const mensaje = crearMensajeWhatsApp(datos);
                    const url = crearWhatsAppURL(mensaje);
                    prepararAccionesSolicitud(null,url);
                    mostrarExito('Tu resumen está listo. Pulsa Continuar por WhatsApp para enviarlo a Maderóh. El mensaje se enviará solo cuando tú lo confirmes en WhatsApp.');
                    cambiarEstadoEnvio(false);
                    document.getElementById('personal-request-whatsapp').focus();

                } catch (error) {


                    console.error(
                        "Maderóh configurador:",
                        error
                    );


                    mostrarError(
                        error &&
                        error.message

                            ? error.message

                            : "No fue posible preparar tu mensaje. Inténtalo nuevamente."
                    );


                    cambiarEstadoEnvio(
                        false
                    );

                }

            }
        );


        /* =================================================
           ESTADO INICIAL
        ================================================= */

        actualizarTipoProyecto();

        actualizarResumen();


        /* =================================================
           FUNCIONES
        ================================================= */


        /* =================================================
           TIPO DE PROYECTO
        ================================================= */

        function obtenerTipoProyecto() {

            const seleccionado =
                document.querySelector(
                    'input[name="tipoProyecto"]:checked'
                );


            return seleccionado
                ? seleccionado.value
                : "Hogar";

        }


        /* =================================================
           OBTENER CONFIGURACIÓN COMPLETA
        ================================================= */

        function obtenerConfiguracion() {

            return {

                tipoProyecto:
                    obtenerTipoProyecto(),

                producto:
                    obtenerValor(
                        "producto"
                    ),

                ancho:
                    obtenerNumero(
                        "ancho",
                        1,
                        2000
                    ),

                profundidad:
                    obtenerNumero(
                        "profundidad",
                        1,
                        2000
                    ),

                altura:
                    obtenerNumero(
                        "altura",
                        1,
                        2000
                    ),

                acabado:
                    obtenerValor(
                        "acabado"
                    ),

                estructura:
                    obtenerValor(
                        "estructura"
                    ),

                cantidad:
                    obtenerNumero(
                        "cantidad",
                        1,
                        500
                    ),

                tipoNegocio:
                    obtenerValor(
                        "tipoNegocio"
                    ),

                tamanoEspacio:
                    obtenerNumero(
                        "tamanoEspacio",
                        1,
                        10000
                    ),

                comentarios:
                    obtenerValor(
                        "comentarios"
                    )
                    .slice(
                        0,
                        700
                    ),

                /* =========================================
                   DATOS DEL CLIENTE
                ========================================== */

                nombre:
                    obtenerValor(
                        "nombre"
                    )
                    .slice(
                        0,
                        120
                    ),

                telefono:
                    obtenerValor(
                        "telefono"
                    )
                    .slice(
                        0,
                        30
                    ),

                correo:
                    obtenerValor(
                        "correo"
                    )
                    .slice(
                        0,
                        180
                    ),

                ubicacion:
                    obtenerValor(
                        "ubicacion"
                    )
                    .slice(
                        0,
                        180
                    ),

                /* =========================================
                   PRIVACIDAD
                ========================================== */

                privacyAccepted:
                    obtenerCheckbox(
                        "privacy-accepted"
                    ),

                privacyVersion:
                    PRIVACY_VERSION,

                marketingConsent:
                    obtenerCheckbox(
                        "marketing-consent"
                    )

            };

        }


        /* =================================================
           VALIDAR CONFIGURACIÓN
        ================================================= */

        function validarConfiguracion(
            datos
        ) {


            /* =============================================
               PRODUCTO
            ============================================== */

            if (!datos.producto) {

                enfocarCampo(
                    "producto"
                );


                return "Selecciona el tipo de mobiliario.";

            }


            /* =============================================
               CANTIDAD
            ============================================== */

            if (
                !datos.cantidad ||
                datos.cantidad < 1 ||
                datos.cantidad > 500
            ) {

                enfocarCampo(
                    "cantidad"
                );


                return "Verifica la cantidad de piezas.";

            }


            /* =============================================
               NOMBRE
            ============================================== */

            if (!datos.nombre) {

                enfocarCampo(
                    "nombre"
                );


                return "Ingresa tu nombre.";

            }


            /* =============================================
               TELÉFONO
            ============================================== */

            if (!datos.telefono) {

                enfocarCampo(
                    "telefono"
                );


                return "Ingresa un teléfono de contacto.";

            }


            if (
                !validarTelefono(
                    datos.telefono
                )
            ) {

                enfocarCampo(
                    "telefono"
                );


                return "Ingresa un teléfono válido.";

            }


            /* =============================================
               CORREO
            ============================================== */

            if (
                datos.correo &&
                !validarCorreo(
                    datos.correo
                )
            ) {

                enfocarCampo(
                    "correo"
                );


                return "Ingresa un correo electrónico válido.";

            }


            /* =============================================
               PRIVACIDAD
            ============================================== */

            if (
                datos.privacyAccepted !==
                true
            ) {

                enfocarCampo(
                    "privacy-accepted"
                );


                return "Debes leer y aceptar el Aviso de Privacidad para preparar tu solicitud.";

            }


            return null;

        }


        /* =================================================
           REGISTRAR SOLICITUD EN BACKEND
        ================================================= */

        function prepararAccionesSolicitud(_,whatsappUrl) {
            const actions=document.getElementById('personal-request-actions');
            const whatsapp=document.getElementById('personal-request-whatsapp');
            if(!actions||!whatsapp)return;
            whatsapp.href=whatsappUrl;actions.hidden=false;
        }

        function crearMensajeWhatsApp(
            datos,
            folio
        ) {

            const medidas =
                [];


            if (datos.ancho) {

                medidas.push(
                    `${datos.ancho} cm ancho`
                );

            }


            if (datos.profundidad) {

                medidas.push(
                    `${datos.profundidad} cm profundidad`
                );

            }


            if (datos.altura) {

                medidas.push(
                    `${datos.altura} cm altura`
                );

            }


            const textoMedidas =
                medidas.length

                    ? medidas.join(
                        " × "
                    )

                    : "Por definir";


            const lineas = [

                "Hola, quiero cotizar este proyecto con Maderóh.",

                "",

                "Datos para revisar con el taller:",

                "",

                "PROYECTO",

                `Tipo: ${datos.tipoProyecto}`,

                `Mobiliario: ${datos.producto}`,

                `Cantidad: ${datos.cantidad}`,

                "",

                "ESPECIFICACIONES",

                `Medidas: ${textoMedidas}`,

                `Acabado: ${datos.acabado || "Por definir"}`,

                `Estructura: ${datos.estructura || "Por definir"}`

            ];


            if (
                datos.tipoProyecto ===
                "Negocio"
            ) {

                lineas.push(

                    "",

                    "INFORMACIÓN DEL NEGOCIO",

                    `Tipo de negocio: ${
                        datos.tipoNegocio ||
                        "Por definir"
                    }`,

                    `Tamaño aproximado: ${
                        datos.tamanoEspacio
                            ? `${datos.tamanoEspacio} m²`
                            : "Por definir"
                    }`

                );

            }


            if (
                datos.comentarios
            ) {

                lineas.push(

                    "",

                    "COMENTARIOS",

                    datos.comentarios

                );

            }


            lineas.push(

                "",

                "DATOS DE CONTACTO",

                `Nombre: ${datos.nombre}`,
                `WhatsApp: ${datos.telefono}`,
                `Correo: ${datos.correo || "No proporcionado"}`,
                `Ubicación: ${datos.ubicacion || "Por definir"}`,

                "",

                "¿Me pueden apoyar con el seguimiento de esta solicitud?"

            );


            return lineas.join(
                "\n"
            );

        }


        /* =================================================
           RESUMEN
        ================================================= */

        function actualizarResumen() {

            const tipo =
                obtenerTipoProyecto();


            const producto =
                obtenerValor(
                    "producto"
                );


            const cantidad =
                obtenerValor(
                    "cantidad"
                ) || "1";


            actualizarTexto(
                "summary-type",
                tipo
            );


            actualizarTexto(
                "summary-product",
                producto ||
                "Por seleccionar"
            );


            actualizarTexto(
                "summary-quantity",
                cantidad
            );

        }


        /* =================================================
           ANALÍTICA DE COTIZACIÓN

           No enviamos nombre, teléfono,
           correo ni ubicación.
        ================================================= */

        function registrarEventoCotizacion(
            datos,
            folio
        ) {

            if (
                typeof window.registrarEvento !==
                "function"
            ) {

                return;

            }


            window.registrarEvento(
                "cotizacion_registrada",
                {

                    tipoProyecto:
                        datos.tipoProyecto,

                    producto:
                        datos.producto,

                    cantidad:
                        datos.cantidad,

                    tipoNegocio:
                        datos.tipoProyecto ===
                        "Negocio"

                            ? datos.tipoNegocio

                            : null,

                    marketingConsent:
                        datos.marketingConsent ===
                        true,

                    folio:
                        folio

                }
            );

        }


        /* =================================================
           OBTENER VALOR
        ================================================= */

        function obtenerValor(
            id
        ) {

            const elemento =
                document.getElementById(
                    id
                );


            if (!elemento) {

                return "";

            }


            return String(
                elemento.value ||
                ""
            )
            .trim();

        }


        /* =================================================
           OBTENER CHECKBOX
        ================================================= */

        function obtenerCheckbox(
            id
        ) {

            const elemento =
                document.getElementById(
                    id
                );


            if (
                !elemento ||
                elemento.type !==
                "checkbox"
            ) {

                return false;

            }


            return elemento.checked ===
                true;

        }


        /* =================================================
           OBTENER NÚMERO
        ================================================= */

        function obtenerNumero(
            id,
            minimo,
            maximo
        ) {

            const valorTexto =
                obtenerValor(
                    id
                );


            if (
                valorTexto ===
                ""
            ) {

                return null;

            }


            const valor =
                Number(
                    valorTexto
                );


            if (
                !Number.isFinite(
                    valor
                ) ||
                valor < minimo ||
                valor > maximo
            ) {

                return null;

            }


            return valor;

        }


        /* =================================================
           VALIDAR CORREO
        ================================================= */

        function validarCorreo(
            correo
        ) {

            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(
                    correo
                );

        }


        /* =================================================
           VALIDAR TELÉFONO
        ================================================= */

        function validarTelefono(
            telefono
        ) {

            const numeros =
                String(
                    telefono ||
                    ""
                )
                .replace(
                    /\D/g,
                    ""
                );


            /*
             * Permitimos distintos formatos.
             * Solo verificamos una longitud razonable.
             */

            return (
                numeros.length >= 8 &&
                numeros.length <= 15
            );

        }


        /* =================================================
           ACTUALIZAR TEXTO
        ================================================= */

        function actualizarTexto(
            id,
            texto
        ) {

            const elemento =
                document.getElementById(
                    id
                );


            if (elemento) {

                elemento.textContent =
                    texto;

            }

        }


        /* =================================================
           ENFOCAR CAMPO
        ================================================= */

        function enfocarCampo(
            id
        ) {

            const elemento =
                document.getElementById(
                    id
                );


            if (!elemento) {

                return;

            }


            try {

                elemento.focus(
                    {
                        preventScroll:
                            true
                    }
                );

            } catch {

                elemento.focus();

            }


            elemento.scrollIntoView(
                {

                    behavior:
                        "smooth",

                    block:
                        "center"

                }
            );

        }


        /* =================================================
           ESTADO DE ENVÍO
        ================================================= */

        function cambiarEstadoEnvio(
            enviando
        ) {

            if (!botonEnviar) {

                return;

            }


            botonEnviar.disabled =
                enviando;


            botonEnviar.setAttribute(
                "aria-busy",
                enviando
                    ? "true"
                    : "false"
            );


            botonEnviar.textContent =
                enviando

                    ? "Preparando resumen..."

                    : "Preparar mensaje para WhatsApp →";

        }


        /* =================================================
           ERROR
        ================================================= */

        function mostrarError(
            mensaje
        ) {

            ocultarExito();


            if (!errorBox) {

                return;

            }


            errorBox.textContent =
                mensaje;


            errorBox.hidden =
                false;


            errorBox.scrollIntoView(
                {

                    behavior:
                        "smooth",

                    block:
                        "nearest"

                }
            );

        }


        function ocultarError() {

            if (!errorBox) {

                return;

            }


            errorBox.hidden =
                true;


            errorBox.textContent =
                "";

        }


        /* =================================================
           ÉXITO
        ================================================= */

        function mostrarExito(
            mensaje
        ) {

            ocultarError();


            if (!successBox) {

                return;

            }


            successBox.textContent =
                mensaje;


            successBox.hidden =
                false;

        }


        function ocultarExito() {
            const actions=document.getElementById('personal-request-actions');if(actions)actions.hidden=true;

            if (!successBox) {

                return;

            }


            successBox.hidden =
                true;


            successBox.textContent =
                "";

        }

    }
);