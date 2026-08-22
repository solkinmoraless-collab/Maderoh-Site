"use strict";


document.addEventListener(
    "DOMContentLoaded",
    () => {

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


        const radiosTipo =
            document.querySelectorAll(
                'input[name="tipoProyecto"]'
            );


        /*
        =====================================
        TIPO DE PROYECTO
        =====================================
        */

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


        /*
        =====================================
        CONTADOR COMENTARIOS
        =====================================
        */

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


        /*
        =====================================
        RESUMEN EN TIEMPO REAL
        =====================================
        */

        const camposResumen = [

            "producto",
            "cantidad"

        ];


        camposResumen.forEach(
            id => {

                const elemento =
                    document.getElementById(id);


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


        /*
        =====================================
        ENVÍO
        =====================================
        */

        formulario.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                ocultarError();


                const datos =
                    obtenerConfiguracion();


                if (
                    !validarConfiguracion(datos)
                ) {

                    mostrarError(
                        "Selecciona el tipo de mobiliario y verifica la cantidad."
                    );

                    return;
                }


                registrarCotizacion(
                    datos
                );


                const mensaje =
                    crearMensajeWhatsApp(
                        datos
                    );


                /*
                crearWhatsAppURL()
                está disponible desde main.js
                */

                if (
                    typeof crearWhatsAppURL !==
                    "function"
                ) {

                    mostrarError(
                        "No fue posible preparar WhatsApp. Recarga la página e inténtalo nuevamente."
                    );

                    return;
                }


                const url =
                    crearWhatsAppURL(
                        mensaje
                    );


                window.open(
                    url,
                    "_blank",
                    "noopener,noreferrer"
                );

            }
        );


        actualizarTipoProyecto();

        actualizarResumen();


        /*
        =====================================
        FUNCIONES
        =====================================
        */

        function obtenerTipoProyecto() {

            const seleccionado =
                document.querySelector(
                    'input[name="tipoProyecto"]:checked'
                );


            return seleccionado
                ? seleccionado.value
                : "Hogar";

        }


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
                    )

            };

        }


        function validarConfiguracion(
            datos
        ) {

            if (!datos.producto) {

                const producto =
                    document.getElementById(
                        "producto"
                    );


                if (producto) {
                    producto.focus();
                }


                return false;

            }


            if (
                !datos.cantidad ||
                datos.cantidad < 1 ||
                datos.cantidad > 500
            ) {

                return false;

            }


            return true;

        }


        function crearMensajeWhatsApp(
            datos
        ) {

            const medidas = [];


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
                    ? medidas.join(" × ")
                    : "Por definir";


            const lineas = [

                "Hola, quiero solicitar una cotización con Maderóh.",

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
                    `Tipo de negocio: ${datos.tipoNegocio || "Por definir"}`,
                    `Tamaño aproximado: ${
                        datos.tamanoEspacio
                            ? `${datos.tamanoEspacio} m²`
                            : "Por definir"
                    }`
                );

            }


            if (datos.comentarios) {

                lineas.push(
                    "",
                    "COMENTARIOS",
                    datos.comentarios
                );

            }


            lineas.push(
                "",
                "¿Me pueden apoyar con opciones y cotización?"
            );


            return lineas.join(
                "\n"
            );

        }


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


        function registrarCotizacion(
            datos
        ) {

            if (
                typeof window.registrarEvento !==
                "function"
            ) {

                return;

            }


            window.registrarEvento(
                "configuracion_whatsapp",
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
                            : null

                }
            );

        }


        function obtenerValor(
            id
        ) {

            const elemento =
                document.getElementById(id);


            if (!elemento) {

                return "";

            }


            return String(
                elemento.value || ""
            )
            .trim();

        }


        function obtenerNumero(
            id,
            minimo,
            maximo
        ) {

            const valor =
                Number(
                    obtenerValor(id)
                );


            if (
                !Number.isFinite(valor) ||
                valor < minimo ||
                valor > maximo
            ) {

                return null;

            }


            return valor;

        }


        function actualizarTexto(
            id,
            texto
        ) {

            const elemento =
                document.getElementById(id);


            if (elemento) {

                elemento.textContent =
                    texto;

            }

        }


        function mostrarError(
            mensaje
        ) {

            if (!errorBox) {
                return;
            }


            errorBox.textContent =
                mensaje;


            errorBox.hidden =
                false;

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

    }
);