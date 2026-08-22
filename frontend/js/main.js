"use strict";


/* =========================================================
   CONFIGURACIÓN PÚBLICA
========================================================= */

const MADEROH = {

    /*
    Después sustituiremos por
    el número oficial de WhatsApp.

    Ejemplo México:
    525512345678
    */

    whatsapp: "NUMERO_MADEROH"

};



/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        iniciarMenu();

        iniciarCarruselCategorias();

        iniciarWhatsAppGeneral();

        iniciarWhatsAppProductos();

        iniciarCatalogo();

        iniciarVistaRapida();

        actualizarAno();

    }
);



/* =========================================================
   WHATSAPP
========================================================= */

function crearWhatsAppURL(
    mensaje
) {

    return (
        `https://wa.me/` +
        `${MADEROH.whatsapp}` +
        `?text=${encodeURIComponent(mensaje)}`
    );

}



/* =========================================================
   MENÚ
========================================================= */

function iniciarMenu() {

    const boton =
        document.getElementById(
            "menu-toggle"
        );


    const menu =
        document.getElementById(
            "main-nav"
        );


    if (!boton || !menu) {

        return;

    }


    boton.addEventListener(
        "click",
        () => {

            const abierto =
                menu
                    .classList
                    .toggle(
                        "active"
                    );


            boton.setAttribute(
                "aria-expanded",
                String(abierto)
            );

        }
    );


    menu
        .querySelectorAll("a")
        .forEach(
            enlace => {

                enlace.addEventListener(
                    "click",
                    () => {

                        menu
                            .classList
                            .remove(
                                "active"
                            );


                        boton.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                    }
                );

            }
        );

}



/* =========================================================
   CARRUSEL INICIO
========================================================= */

function iniciarCarruselCategorias() {

    const carrusel =
        document.getElementById(
            "category-carousel"
        );


    const track =
        document.getElementById(
            "category-track"
        );


    const anterior =
        document.getElementById(
            "carousel-prev"
        );


    const siguiente =
        document.getElementById(
            "carousel-next"
        );


    if (!carrusel || !track) {

        return;

    }


    let intervalo = null;

    let pausado = false;


    function obtenerDistancia() {

        const tarjeta =
            track.querySelector(
                ".carousel-card"
            );


        if (!tarjeta) {

            return 350;

        }


        return (
            tarjeta
                .getBoundingClientRect()
                .width
            +
            22
        );

    }


    function avanzar() {

        const distancia =
            obtenerDistancia();


        const limite =
            track.scrollWidth -
            track.clientWidth;


        if (
            track.scrollLeft >=
            limite - 20
        ) {

            track.scrollTo({

                left: 0,

                behavior: "smooth"

            });

        }

        else {

            track.scrollBy({

                left: distancia,

                behavior: "smooth"

            });

        }

    }


    function retroceder() {

        const distancia =
            obtenerDistancia();


        if (
            track.scrollLeft <= 20
        ) {

            track.scrollTo({

                left:
                    track.scrollWidth,

                behavior:
                    "smooth"

            });

        }

        else {

            track.scrollBy({

                left:
                    -distancia,

                behavior:
                    "smooth"

            });

        }

    }


    function iniciarAutoplay() {

        intervalo =
            setInterval(
                () => {

                    if (!pausado) {

                        avanzar();

                    }

                },

                3200
            );

    }


    carrusel.addEventListener(
        "mouseenter",
        () => {

            pausado = true;

        }
    );


    carrusel.addEventListener(
        "mouseleave",
        () => {

            pausado = false;

        }
    );


    carrusel.addEventListener(
        "touchstart",
        () => {

            pausado = true;

        },
        {
            passive: true
        }
    );


    carrusel.addEventListener(
        "touchend",
        () => {

            setTimeout(
                () => {

                    pausado = false;

                },
                1200
            );

        },
        {
            passive: true
        }
    );


    if (siguiente) {

        siguiente.addEventListener(
            "click",
            () => {

                avanzar();

                registrarEventoSeguro(
                    "carrusel_siguiente"
                );

            }
        );

    }


    if (anterior) {

        anterior.addEventListener(
            "click",
            () => {

                retroceder();

                registrarEventoSeguro(
                    "carrusel_anterior"
                );

            }
        );

    }


    const movimientoReducido =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );


    if (!movimientoReducido.matches) {

        iniciarAutoplay();

    }

}



/* =========================================================
   WHATSAPP GENERAL
========================================================= */

function iniciarWhatsAppGeneral() {

    const botones =
        document.querySelectorAll(
            ".whatsapp-general"
        );


    botones.forEach(
        boton => {

            boton.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const mensaje = [

                        "Hola, visité la página de Maderóh.",

                        "",

                        "Me gustaría recibir información sobre sus muebles y proyectos."

                    ].join("\n");


                    registrarEventoSeguro(
                        "whatsapp_general",
                        {
                            pagina:
                                window.location.pathname
                        }
                    );


                    abrirWhatsApp(
                        mensaje
                    );

                }
            );

        }
    );

}



/* =========================================================
   WHATSAPP PRODUCTOS
========================================================= */

function iniciarWhatsAppProductos() {

    const botones =
        document.querySelectorAll(
            ".product-whatsapp"
        );


    botones.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    const producto =
                        boton.dataset.product || "";

                    const medida =
                        boton.dataset.size || "";

                    const acabado =
                        boton.dataset.finish || "";


                    const mensaje = [

                        "Hola, me interesa cotizar el siguiente producto de Maderóh:",

                        "",

                        `Producto: ${producto}`,

                        `Medidas: ${medida}`,

                        `Acabado: ${acabado}`,

                        "",

                        "¿Me pueden apoyar con disponibilidad, opciones y cotización?"

                    ].join("\n");


                    registrarEventoSeguro(
                        "producto_whatsapp",
                        {
                            producto,
                            medida,
                            acabado
                        }
                    );


                    abrirWhatsApp(
                        mensaje
                    );

                }
            );

        }
    );

}



/* =========================================================
   CATÁLOGO
========================================================= */

function iniciarCatalogo() {

    const buscador =
        document.getElementById(
            "product-search"
        );


    const botones =
        document.querySelectorAll(
            ".catalog-filters .filter-btn"
        );


    const productos =
        Array.from(
            document.querySelectorAll(
                ".catalog-product-card"
            )
        );


    const contador =
        document.getElementById(
            "product-count"
        );


    const sinProductos =
        document.getElementById(
            "no-products"
        );


    if (!productos.length) {

        return;

    }


    let categoriaActual =
        "todos";

    let busquedaActual =
        "";


    function normalizarTexto(
        texto
    ) {

        return String(texto)
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .trim();

    }


    function actualizarCatalogo() {

        let visibles = 0;


        productos.forEach(
            producto => {

                const categorias =
                    String(
                        producto.dataset.category || ""
                    )
                    .split(" ");


                const nombre =
                    normalizarTexto(
                        producto.dataset.name || ""
                    );


                const coincideCategoria =

                    categoriaActual ===
                    "todos"

                    ||

                    categorias.includes(
                        categoriaActual
                    );


                const coincideBusqueda =

                    !busquedaActual

                    ||

                    nombre.includes(
                        normalizarTexto(
                            busquedaActual
                        )
                    );


                const visible =
                    coincideCategoria &&
                    coincideBusqueda;


                producto.hidden =
                    !visible;


                if (visible) {

                    visibles += 1;

                }

            }
        );


        if (contador) {

            contador.textContent =
                String(visibles);

        }


        if (sinProductos) {

            sinProductos.hidden =
                visibles !== 0;

        }

    }


    botones.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    botones.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    boton.classList.add(
                        "active"
                    );


                    categoriaActual =
                        boton.dataset.filter;


                    actualizarCatalogo();


                    registrarEventoSeguro(
                        "categoria_catalogo",
                        {
                            categoria:
                                categoriaActual
                        }
                    );

                }
            );

        }
    );


    if (buscador) {

        let timeoutBusqueda;


        buscador.addEventListener(
            "input",
            () => {

                busquedaActual =
                    buscador.value;


                actualizarCatalogo();


                clearTimeout(
                    timeoutBusqueda
                );


                timeoutBusqueda =
                    setTimeout(
                        () => {

                            if (
                                busquedaActual.trim()
                            ) {

                                registrarEventoSeguro(
                                    "busqueda_producto",
                                    {
                                        busqueda:
                                            busquedaActual
                                                .trim()
                                                .slice(
                                                    0,
                                                    100
                                                )
                                    }
                                );

                            }

                        },
                        700
                    );

            }
        );

    }


    /*
    Permite enlaces:

    productos.html?categoria=bancas
    */

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const categoriaURL =
        parametros.get(
            "categoria"
        );


    if (categoriaURL) {

        const boton =
            Array
                .from(botones)
                .find(
                    item =>
                        item.dataset.filter ===
                        categoriaURL
                );


        if (boton) {

            boton.click();

        }

    }


    actualizarCatalogo();

}



/* =========================================================
   VISTA RÁPIDA
========================================================= */

function iniciarVistaRapida() {

    const modal =
        document.getElementById(
            "product-modal"
        );


    if (!modal) {

        return;

    }


    const botones =
        document.querySelectorAll(
            ".quick-view-btn"
        );


    const cerrar =
        document.getElementById(
            "modal-close"
        );


    const backdrop =
        modal.querySelector(
            ".product-modal-backdrop"
        );


    const nombre =
        document.getElementById(
            "modal-product-name"
        );


    const categoria =
        document.getElementById(
            "modal-category"
        );


    const precio =
        document.getElementById(
            "modal-price"
        );


    const descripcion =
        document.getElementById(
            "modal-description"
        );


    const medida =
        document.getElementById(
            "modal-size"
        );


    const whatsapp =
        document.getElementById(
            "modal-whatsapp"
        );


    let productoActual =
        null;


    function abrirModal(
        boton
    ) {

        productoActual = {

            producto:
                boton.dataset.product || "",

            categoria:
                boton.dataset.category || "",

            precio:
                boton.dataset.price || "",

            descripcion:
                boton.dataset.description || "",

            medida:
                boton.dataset.size || ""

        };


        nombre.textContent =
            productoActual.producto;

        categoria.textContent =
            productoActual.categoria;

        precio.textContent =
            productoActual.precio;

        descripcion.textContent =
            productoActual.descripcion;

        medida.textContent =
            productoActual.medida;


        modal.classList.add(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        registrarEventoSeguro(
            "vista_producto",
            {
                producto:
                    productoActual.producto
            }
        );

    }


    function cerrarModal() {

        modal.classList.remove(
            "active"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );


        productoActual =
            null;

    }


    botones.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    abrirModal(
                        boton
                    );

                }
            );

        }
    );


    if (cerrar) {

        cerrar.addEventListener(
            "click",
            cerrarModal
        );

    }


    if (backdrop) {

        backdrop.addEventListener(
            "click",
            cerrarModal
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"

                &&

                modal.classList.contains(
                    "active"
                )
            ) {

                cerrarModal();

            }

        }
    );


    if (whatsapp) {

        whatsapp.addEventListener(
            "click",
            () => {

                if (!productoActual) {

                    return;

                }


                const mensaje = [

                    "Hola, me interesa cotizar este producto de Maderóh:",

                    "",

                    `Producto: ${productoActual.producto}`,

                    `Categoría: ${productoActual.categoria}`,

                    `Medidas: ${productoActual.medida}`,

                    `Precio mostrado: ${productoActual.precio}`,

                    "",

                    "¿Me pueden apoyar con opciones y cotización?"

                ].join("\n");


                registrarEventoSeguro(
                    "modal_producto_whatsapp",
                    {
                        producto:
                            productoActual.producto
                    }
                );


                abrirWhatsApp(
                    mensaje
                );

            }
        );

    }

}



/* =========================================================
   ABRIR WHATSAPP
========================================================= */

function abrirWhatsApp(
    mensaje
) {

    window.open(
        crearWhatsAppURL(
            mensaje
        ),
        "_blank",
        "noopener,noreferrer"
    );

}



/* =========================================================
   ANALYTICS
========================================================= */

function registrarEventoSeguro(
    evento,
    datos = {}
) {

    if (
        typeof window.registrarEvento ===
        "function"
    ) {

        window.registrarEvento(
            evento,
            datos
        );

    }

}



/* =========================================================
   AÑO
========================================================= */

function actualizarAno() {

    const elemento =
        document.getElementById(
            "current-year"
        );


    if (elemento) {

        elemento.textContent =
            new Date()
                .getFullYear();

    }

}