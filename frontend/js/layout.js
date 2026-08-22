"use strict";


/* =========================================================
   MADERÓH
   COMPONENTES COMPARTIDOS DE LA WEB PÚBLICA
========================================================= */


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        renderizarFooter();

    }
);


/* =========================================================
   FOOTER
========================================================= */

function renderizarFooter() {

    const contenedor =
        document.getElementById(
            "site-footer"
        );


    if (!contenedor) {

        return;

    }


    contenedor.innerHTML = `

        <footer class="commercial-footer">


            <div class="commercial-footer-main">


                <!-- =====================================
                     MARCA
                ====================================== -->

                <div class="footer-brand-column">

                    <a
                        href="index.html"
                        class="footer-logo"
                        aria-label="Maderóh - Inicio"
                    >
                        MADERÓH
                    </a>


                    <p>
                        Diseño y fabricación de mobiliario
                        para hogar, oficina y negocios.
                    </p>


                    <span>
                        CDMX · México
                    </span>

                </div>



                <!-- =====================================
                     EXPLORA
                ====================================== -->

                <div class="footer-column">

                    <h3>
                        EXPLORA
                    </h3>


                    <a href="index.html">
                        Inicio
                    </a>


                    <a href="productos.html">
                        Productos
                    </a>


                    <a href="personaliza.html">
                        Personaliza
                    </a>


                    <a href="personaliza.html#configurador-section">
                        Cotizar proyecto
                    </a>

                </div>



                <!-- =====================================
                     ATENCIÓN
                ====================================== -->

                <div class="footer-column">

                    <h3>
                        ATENCIÓN
                    </h3>


                    <a
                        href="#"
                        class="whatsapp-general"
                        data-track="footer_whatsapp"
                    >
                        WhatsApp
                    </a>


                    <a href="preguntas-frecuentes.html">
                        Preguntas frecuentes
                    </a>


                    <a href="envios.html">
                        Envíos y entregas
                    </a>


                    <a href="facturacion.html">
                        Facturación
                    </a>

                </div>



                <!-- =====================================
                     LEGAL
                ====================================== -->

                <div class="footer-column">

                    <h3>
                        LEGAL
                    </h3>


                    <a href="aviso-privacidad.html">
                        Aviso de privacidad
                    </a>


                    <a href="terminos-condiciones.html">
                        Términos y condiciones
                    </a>

                </div>



                <!-- =====================================
                     FORMAS DE PAGO
                ====================================== -->

                <div class="footer-column footer-payment-column">

                    <h3>
                        FORMAS DE PAGO
                    </h3>


                    <div class="payment-methods">

                        <span>
                            VISA
                        </span>


                        <span>
                            Mastercard
                        </span>


                        <span>
                            PayPal
                        </span>


                        <span>
                            Mercado Pago
                        </span>

                    </div>


                    <p class="footer-payment-note">
                        Las condiciones de pago pueden variar
                        según el tipo y alcance del proyecto.
                    </p>

                </div>


            </div>



            <!-- =========================================
                 PARTE INFERIOR
            ========================================== -->

            <div class="commercial-footer-bottom">


                <p>

                    ©
                    <span class="shared-current-year"></span>
                    Maderóh. Todos los derechos reservados.

                </p>


                <p>
                    Diseño · Madera · Metal
                </p>


            </div>


        </footer>

    `;


    actualizarAnoFooter();

    inicializarWhatsAppFooter();

}


/* =========================================================
   AÑO
========================================================= */

function actualizarAnoFooter() {

    const elementos =
        document.querySelectorAll(
            ".shared-current-year"
        );


    const ano =
        new Date()
            .getFullYear();


    elementos.forEach(
        function (elemento) {

            elemento.textContent =
                String(
                    ano
                );

        }
    );

}


/* =========================================================
   WHATSAPP DEL FOOTER
========================================================= */

function inicializarWhatsAppFooter() {

    const enlaces =
        document.querySelectorAll(
            "#site-footer .whatsapp-general"
        );


    enlaces.forEach(
        function (enlace) {

            enlace.addEventListener(
                "click",
                function (evento) {

                    /*
                     * main.js ya contiene la configuración
                     * general de WhatsApp de Maderóh.
                     */

                    if (
                        typeof crearWhatsAppURL !==
                        "function"
                    ) {

                        return;

                    }


                    evento.preventDefault();


                    const mensaje =
                        "Hola, quiero recibir información sobre los productos y servicios de Maderóh.";


                    window.open(
                        crearWhatsAppURL(
                            mensaje
                        ),
                        "_blank",
                        "noopener,noreferrer"
                    );

                }
            );

        }
    );

}