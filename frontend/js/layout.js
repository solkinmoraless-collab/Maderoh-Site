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

        <footer
            class="commercial-footer"
            aria-label="Pie de página de Maderóh"
        >


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


                    <a
                        href="index.html"
                        data-footer-page="index.html"
                    >
                        Inicio
                    </a>


                    <a
                        href="productos.html"
                        data-footer-page="productos.html"
                    >
                        Productos
                    </a>


                    <a
                        href="personaliza.html"
                        data-footer-page="personaliza.html"
                    >
                        Personaliza
                    </a>


                    <a
                        href="personaliza.html#configurador-section"
                    >
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


                    <a
                        href="preguntas-frecuentes.html"
                        data-footer-page="preguntas-frecuentes.html"
                    >
                        Preguntas frecuentes
                    </a>


                    <a
                        href="envios.html"
                        data-footer-page="envios.html"
                    >
                        Envíos y entregas
                    </a>


                    <a
                        href="facturacion.html"
                        data-footer-page="facturacion.html"
                    >
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


                    <a
                        href="aviso-privacidad.html"
                        data-footer-page="aviso-privacidad.html"
                    >
                        Aviso de privacidad
                    </a>


                    <a
                        href="terminos-condiciones.html"
                        data-footer-page="terminos-condiciones.html"
                    >
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


                    <div
                        class="payment-methods"
                        aria-label="Métodos de pago"
                    >

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
                        Las opciones y condiciones de pago
                        pueden variar según el producto,
                        tipo y alcance del proyecto.
                    </p>

                </div>


            </div>



            <!-- =========================================
                 INFORMACIÓN COMPLEMENTARIA
            ========================================== -->

            <div class="commercial-footer-secondary">

                <div>

                    <strong>
                        PROYECTOS PERSONALIZADOS
                    </strong>

                    <p>
                        Fabricamos mobiliario a medida para
                        hogares, oficinas, cafeterías
                        y espacios comerciales.
                    </p>

                </div>


                <div>

                    <strong>
                        COTIZACIONES
                    </strong>

                    <p>
                        Puedes enviarnos las características
                        de tu proyecto desde nuestro configurador.
                    </p>

                    <a
                        href="personaliza.html#configurador-section"
                        class="footer-secondary-link"
                    >
                        Iniciar cotización →
                    </a>

                </div>


                <div>

                    <strong>
                        PRIVACIDAD
                    </strong>

                    <p>
                        Consulta cómo tratamos la información
                        proporcionada mediante nuestros formularios.
                    </p>

                    <a
                        href="aviso-privacidad.html"
                        class="footer-secondary-link"
                    >
                        Ver Aviso de Privacidad →
                    </a>

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


                <nav
                    class="footer-bottom-links"
                    aria-label="Enlaces legales"
                >

                    <a href="aviso-privacidad.html">
                        Privacidad
                    </a>


                    <a href="terminos-condiciones.html">
                        Términos
                    </a>


                    <a href="facturacion.html">
                        Facturación
                    </a>

                </nav>


                <p>
                    Diseño · Madera · Metal
                </p>


            </div>


        </footer>

    `;


    actualizarAnoFooter();

    inicializarWhatsAppFooter();

    marcarPaginaActualFooter();

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

                    evento.preventDefault();


                    /*
                     * main.js contiene la configuración
                     * central de WhatsApp de Maderóh.
                     */

                    if (
                        typeof crearWhatsAppURL !==
                        "function"
                    ) {

                        console.error(
                            "Maderóh: crearWhatsAppURL no está disponible."
                        );

                        return;

                    }


                    const mensaje =
                        "Hola, quiero recibir información sobre los productos y servicios de Maderóh.";


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

        }
    );

}


/* =========================================================
   PÁGINA ACTUAL
========================================================= */

function marcarPaginaActualFooter() {

    const ruta =
        window.location.pathname;


    let paginaActual =
        ruta
            .split("/")
            .pop();


    /*
     * Cuando la ruta termina en "/",
     * consideramos index.html como la página actual.
     */

    if (
        !paginaActual
    ) {

        paginaActual =
            "index.html";

    }


    const enlaces =
        document.querySelectorAll(
            "#site-footer [data-footer-page]"
        );


    enlaces.forEach(
        function (enlace) {

            const pagina =
                enlace.getAttribute(
                    "data-footer-page"
                );


            if (
                pagina ===
                paginaActual
            ) {

                enlace.setAttribute(
                    "aria-current",
                    "page"
                );


                enlace.classList.add(
                    "footer-current-link"
                );

            }

        }
    );

}