"use strict";


/* =========================================================
   MADERÓH
   CATÁLOGO PÚBLICO DINÁMICO
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const PRODUCTS_ENDPOINT =
    "/.netlify/functions/products";


const PRODUCT_IMAGES_ENDPOINT =
    "/.netlify/functions/product-images";


/* =========================================================
   ESTADO
========================================================= */

let productosActuales = [];

let filtroActual = "all";

let busquedaActual = "";

let productoModalActual = null;


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        iniciarCatalogo();

    }
);


/* =========================================================
   INICIAR CATÁLOGO
========================================================= */

async function iniciarCatalogo() {

    const grid =
        document.getElementById(
            "product-grid"
        );


    if (!grid) {

        console.error(
            "Maderóh: No existe #product-grid."
        );

        return;

    }


    iniciarFiltros();

    iniciarBuscador();

    iniciarModal();

    aplicarFiltroURL();


    await cargarProductos();

}


/* =========================================================
   CARGAR PRODUCTOS
========================================================= */

async function cargarProductos() {

    mostrarCargando();


    try {

        const respuesta =
            await fetch(
                PRODUCTS_ENDPOINT,
                {

                    method:
                        "GET",

                    headers: {

                        "Accept":
                            "application/json"

                    },

                    cache:
                        "no-store"

                }
            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const resultado =
            await respuesta.json();


        if (
            !resultado ||
            !Array.isArray(
                resultado.productos
            )
        ) {

            throw new Error(
                "Respuesta de catálogo inválida."
            );

        }


        productosActuales =
            resultado.productos.filter(
                function (producto) {

                    return (
                        producto &&
                        producto.activo !== false
                    );

                }
            );


        renderizarProductoDestacado();

        renderizarCatalogo();


    } catch (error) {

        console.error(
            "Maderóh catálogo:",
            error
        );


        productosActuales = [];


        mostrarErrorCatalogo();

        ocultarProductoDestacado();

    }

}


/* =========================================================
   ESTADO CARGANDO
========================================================= */

function mostrarCargando() {

    const grid =
        document.getElementById(
            "product-grid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = `

        <div class="catalog-loading">

            <span>
                MADERÓH
            </span>

            <p>
                Cargando productos...
            </p>

        </div>

    `;

}


/* =========================================================
   ERROR CATÁLOGO
========================================================= */

function mostrarErrorCatalogo() {

    const grid =
        document.getElementById(
            "product-grid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = `

        <div class="catalog-loading">

            <span>
                MADERÓH
            </span>

            <p>
                No fue posible cargar el catálogo.
            </p>

            <button
                type="button"
                class="btn btn-secondary"
                id="retry-products"
            >
                Intentar nuevamente
            </button>

        </div>

    `;


    const boton =
        document.getElementById(
            "retry-products"
        );


    if (boton) {

        boton.addEventListener(
            "click",
            cargarProductos
        );

    }

}


/* =========================================================
   PRODUCTO DESTACADO
========================================================= */

function renderizarProductoDestacado() {

    const seccion =
        document.getElementById(
            "featured-product-section"
        );


    if (!seccion) {
        return;
    }


    if (
        productosActuales.length === 0
    ) {

        seccion.hidden = true;

        return;

    }


    seccion.hidden =
        false;


    let producto =
        productosActuales.find(
            function (item) {

                return (
                    item.destacado === true
                );

            }
        );


    if (!producto) {

        producto =
            productosActuales[0];

    }


    cambiarTexto(
        "featured-product-category",
        producto.categoriaNombre ||
        "Producto"
    );


    cambiarTexto(
        "featured-product-name",
        producto.nombre ||
        "Producto Maderóh"
    );


    cambiarTexto(
        "featured-product-description",
        producto.descripcion ||
        ""
    );


    cambiarTexto(
        "featured-product-size",
        producto.medidas ||
        "Consultar"
    );


    cambiarTexto(
        "featured-product-finish",
        producto.acabado ||
        "Consultar"
    );


    cambiarTexto(
        "featured-product-price",
        formatearPrecio(
            producto.precio
        )
    );


    const contenedorImagen =
        document.getElementById(
            "featured-product-image"
        );


    if (
        contenedorImagen
    ) {

        const imagen =
            normalizarURLImagen(
                producto.imagen
            );


        if (imagen) {

            contenedorImagen.innerHTML = `

                <img
                    src="${escaparAtributo(
                        imagen
                    )}"
                    alt="${escaparHTML(
                        producto.nombre ||
                        "Producto Maderóh"
                    )}"
                    class="featured-product-photo"
                    loading="eager"
                    decoding="async"
                >

            `;


            contenedorImagen.classList.add(
                "has-image"
            );

        } else {

            contenedorImagen.innerHTML = `

                <span id="featured-image-name">

                    ${escaparHTML(
                        producto.nombre ||
                        "MADERÓH"
                    )}

                </span>

            `;


            contenedorImagen.classList.remove(
                "has-image"
            );

        }

    }


    const botonWhatsApp =
        document.getElementById(
            "featured-product-whatsapp"
        );


    if (
        botonWhatsApp
    ) {

        const nuevoBoton =
            botonWhatsApp.cloneNode(
                true
            );


        botonWhatsApp.replaceWith(
            nuevoBoton
        );


        nuevoBoton.addEventListener(
            "click",
            function () {

                abrirWhatsAppProducto(
                    producto
                );

            }
        );

    }

}


/* =========================================================
   OCULTAR DESTACADO
========================================================= */

function ocultarProductoDestacado() {

    const seccion =
        document.getElementById(
            "featured-product-section"
        );


    if (seccion) {

        seccion.hidden =
            true;

    }

}


/* =========================================================
   RENDERIZAR CATÁLOGO
========================================================= */

function renderizarCatalogo() {

    const grid =
        document.getElementById(
            "product-grid"
        );


    if (!grid) {
        return;
    }


    const productosFiltrados =
        productosActuales.filter(
            function (producto) {

                const categoria =
                    String(
                        producto.categoria ||
                        ""
                    );


                const coincideCategoria =

                    filtroActual === "all"

                    ||

                    categoria ===
                    filtroActual;


                const textoProducto =
                    normalizarTexto(

                        String(
                            producto.nombre ||
                            ""
                        )

                        + " " +

                        String(
                            producto.categoriaNombre ||
                            ""
                        )

                        + " " +

                        String(
                            producto.descripcion ||
                            ""
                        )

                    );


                const coincideBusqueda =

                    busquedaActual === ""

                    ||

                    textoProducto.includes(
                        normalizarTexto(
                            busquedaActual
                        )
                    );


                return (
                    coincideCategoria &&
                    coincideBusqueda
                );

            }
        );


    if (
        productosFiltrados.length === 0
    ) {

        grid.innerHTML =
            "";


        mostrarSinResultados(
            true
        );


        return;

    }


    mostrarSinResultados(
        false
    );


    grid.innerHTML =
        productosFiltrados
            .map(
                function (
                    producto,
                    indice
                ) {

                    return crearTarjeta(
                        producto,
                        indice
                    );

                }
            )
            .join("");


    iniciarBotonesProductos();

}


/* =========================================================
   CREAR TARJETA
========================================================= */

function crearTarjeta(
    producto,
    indice
) {

    const numero =
        String(
            indice + 1
        )
        .padStart(
            2,
            "0"
        );


    const precio =
        formatearPrecio(
            producto.precio
        );


    const tono =
        (
            indice %
            11
        ) + 1;


    const id =
        escaparHTML(
            producto.id
        );


    const nombre =
        escaparHTML(
            producto.nombre ||
            "Producto Maderóh"
        );


    const categoria =
        escaparHTML(
            producto.categoria ||
            ""
        );


    const categoriaNombre =
        escaparHTML(
            producto.categoriaNombre ||
            "Producto"
        );


    const descripcion =
        escaparHTML(
            producto.descripcion ||
            ""
        );


    const imagen =
        normalizarURLImagen(
            producto.imagen
        );


    const contenidoImagen =
        imagen

        ?

        `
        <img
            src="${escaparAtributo(
                imagen
            )}"
            alt="${nombre}"
            class="catalog-product-photo"
            loading="lazy"
            decoding="async"
        >
        `

        :

        `
        <div
            class="catalog-product-placeholder"
            aria-hidden="true"
        >

            <span>
                MADERÓH
            </span>

        </div>
        `;


    return `

        <article
            class="catalog-product-card"
        >

            <div
                class="
                    catalog-product-image
                    product-tone-${tono}
                "
            >

                ${contenidoImagen}


                <span
                    class="product-number"
                >
                    ${numero}
                </span>


                ${
                    categoria ===
                    "negocios"

                    ?

                    `
                    <span
                        class="business-label"
                    >
                        NEGOCIOS
                    </span>
                    `

                    :

                    ""
                }


                <div
                    class="product-hover-actions"
                >

                    <button
                        type="button"
                        class="quick-view-dynamic"
                        data-id="${id}"
                    >
                        Vista rápida
                    </button>

                </div>

            </div>


            <div
                class="catalog-product-info"
            >

                <span
                    class="product-type"
                >
                    ${categoriaNombre}
                </span>


                <div
                    class="product-title-row"
                >

                    <h3>
                        ${nombre}
                    </h3>

                    <span>
                        ${precio}
                    </span>

                </div>


                <p>
                    ${descripcion}
                </p>


                <button
                    type="button"
                    class="
                        product-text-whatsapp
                        dynamic-whatsapp
                    "
                    data-id="${id}"
                >

                    ${
                        categoria ===
                        "negocios"

                        ? "Cotizar proyecto →"

                        : "Cotizar →"
                    }

                </button>

            </div>

        </article>

    `;

}


/* =========================================================
   FILTROS
========================================================= */

function iniciarFiltros() {

    const botones =
        document.querySelectorAll(
            ".catalog-filters .filter-btn"
        );


    botones.forEach(
        function (boton) {

            boton.addEventListener(
                "click",
                function () {

                    filtroActual =
                        boton.dataset.filter ||
                        "all";


                    botones.forEach(
                        function (item) {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    boton.classList.add(
                        "active"
                    );


                    renderizarCatalogo();

                }
            );

        }
    );

}


/* =========================================================
   BUSCADOR
========================================================= */

function iniciarBuscador() {

    const buscador =
        document.getElementById(
            "product-search"
        );


    if (!buscador) {
        return;
    }


    buscador.addEventListener(
        "input",
        function () {

            busquedaActual =
                buscador.value
                    .trim();


            renderizarCatalogo();

        }
    );

}


/* =========================================================
   FILTRO DESDE URL
========================================================= */

function aplicarFiltroURL() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const categoria =
        parametros.get(
            "categoria"
        );


    if (!categoria) {
        return;
    }


    const boton =
        document.querySelector(
            `.catalog-filters [data-filter="${CSS.escape(
                categoria
            )}"]`
        );


    if (!boton) {
        return;
    }


    filtroActual =
        categoria;


    document
        .querySelectorAll(
            ".catalog-filters .filter-btn"
        )
        .forEach(
            function (item) {

                item.classList.remove(
                    "active"
                );

            }
        );


    boton.classList.add(
        "active"
    );

}


/* =========================================================
   BOTONES PRODUCTO
========================================================= */

function iniciarBotonesProductos() {

    document
        .querySelectorAll(
            ".quick-view-dynamic"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        const producto =
                            buscarProducto(
                                boton.dataset.id
                            );


                        if (producto) {

                            abrirModal(
                                producto
                            );

                        }

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".dynamic-whatsapp"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        const producto =
                            buscarProducto(
                                boton.dataset.id
                            );


                        if (producto) {

                            abrirWhatsAppProducto(
                                producto
                            );

                        }

                    }
                );

            }
        );

}


/* =========================================================
   BUSCAR PRODUCTO
========================================================= */

function buscarProducto(
    id
) {

    return productosActuales.find(
        function (producto) {

            return (
                String(
                    producto.id
                ) ===
                String(
                    id
                )
            );

        }
    );

}


/* =========================================================
   INICIAR MODAL
========================================================= */

function iniciarModal() {

    const cerrar =
        document.getElementById(
            "modal-close"
        );


    const fondo =
        document.getElementById(
            "modal-backdrop"
        );


    const whatsapp =
        document.getElementById(
            "modal-whatsapp"
        );


    if (cerrar) {

        cerrar.addEventListener(
            "click",
            cerrarModal
        );

    }


    if (fondo) {

        fondo.addEventListener(
            "click",
            cerrarModal
        );

    }


    if (whatsapp) {

        whatsapp.addEventListener(
            "click",
            function () {

                if (
                    productoModalActual
                ) {

                    abrirWhatsAppProducto(
                        productoModalActual
                    );

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        function (evento) {

            if (
                evento.key ===
                "Escape"
            ) {

                cerrarModal();

            }

        }
    );

}


/* =========================================================
   ABRIR MODAL
========================================================= */

async function abrirModal(
    producto
) {

    const modal =
        document.getElementById(
            "product-modal"
        );


    if (!modal) {
        return;
    }


    productoModalActual =
        producto;


    cambiarTexto(
        "modal-product-category",
        producto.categoriaNombre ||
        "Producto"
    );


    cambiarTexto(
        "modal-product-name",
        producto.nombre ||
        "Producto Maderóh"
    );


    cambiarTexto(
        "modal-product-description",
        producto.descripcion ||
        ""
    );


    cambiarTexto(
        "modal-product-size",
        producto.medidas ||
        "Consultar"
    );


    cambiarTexto(
        "modal-product-price",
        formatearPrecio(
            producto.precio
        )
    );


    actualizarImagenModal(
        producto
    );


    limpiarMiniaturasModal();


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


    await cargarGaleriaProducto(
        producto
    );

}


/* =========================================================
   IMAGEN MODAL INICIAL
========================================================= */

function actualizarImagenModal(
    producto
) {

    const contenedor =
        document.getElementById(
            "modal-product-image"
        );


    if (!contenedor) {
        return;
    }


    const imagen =
        normalizarURLImagen(
            producto.imagen
        );


    if (imagen) {

        contenedor.innerHTML = `

            <img
                src="${escaparAtributo(
                    imagen
                )}"
                alt="${escaparHTML(
                    producto.nombre ||
                    "Producto Maderóh"
                )}"
                class="modal-product-photo"
            >

        `;


        contenedor.classList.add(
            "has-image"
        );


        return;

    }


    contenedor.classList.remove(
        "has-image"
    );


    contenedor.innerHTML = `

        <span id="modal-image-name">

            ${escaparHTML(
                producto.nombre ||
                "MADERÓH"
            )}

        </span>

    `;

}


/* =========================================================
   CARGAR GALERÍA
========================================================= */

async function cargarGaleriaProducto(
    producto
) {

    if (
        !producto ||
        !producto.id
    ) {

        return;

    }


    const productId =
        String(
            producto.id
        );


    try {

        const respuesta =
            await fetch(

                PRODUCT_IMAGES_ENDPOINT
                +
                "?productId="
                +
                encodeURIComponent(
                    productId
                ),

                {

                    method:
                        "GET",

                    headers: {

                        "Accept":
                            "application/json"

                    },

                    cache:
                        "no-store"

                }

            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const resultado =
            await respuesta.json();


        /*
         * Si mientras cargaba la galería
         * el usuario abrió otro producto
         * o cerró el modal, detenemos.
         */

        if (
            !productoModalActual ||
            String(
                productoModalActual.id
            ) !==
            productId
        ) {

            return;

        }


        const imagenes =
            construirGaleriaProducto(
                producto,
                resultado
            );


        if (
            imagenes.length === 0
        ) {

            limpiarMiniaturasModal();

            return;

        }


        mostrarImagenGaleria(
            imagenes[0],
            producto
        );


        renderizarMiniaturasModal(
            imagenes,
            producto
        );


    } catch (error) {

        console.error(
            "Maderóh galería:",
            error
        );


        /*
         * No rompemos Vista rápida.
         * La imagen principal ya quedó visible.
         */

        limpiarMiniaturasModal();

    }

}


/* =========================================================
   CONSTRUIR GALERÍA
========================================================= */

function construirGaleriaProducto(
    producto,
    resultado
) {

    const imagenes =
        [];


    const urlsUsadas =
        new Set();


    function agregarImagen(
        url,
        alt = ""
    ) {

        const urlNormalizada =
            normalizarURLImagen(
                url
            );


        if (
            !urlNormalizada
        ) {

            return;

        }


        if (
            urlsUsadas.has(
                urlNormalizada
            )
        ) {

            return;

        }


        urlsUsadas.add(
            urlNormalizada
        );


        imagenes.push({

            url:
                urlNormalizada,

            alt:
                alt ||
                producto.nombre ||
                "Producto Maderóh"

        });

    }


    /*
     * Imagen principal primero.
     */

    agregarImagen(

        resultado &&
        resultado.imagenPrincipal

            ? resultado.imagenPrincipal

            : producto.imagen,

        producto.nombre

    );


    /*
     * Resto de fotografías.
     */

    if (
        resultado &&
        Array.isArray(
            resultado.imagenes
        )
    ) {

        resultado.imagenes.forEach(
            function (imagen) {

                if (!imagen) {
                    return;
                }


                agregarImagen(
                    imagen.url,
                    imagen.alt
                );

            }
        );

    }


    /*
     * Respaldo.
     */

    agregarImagen(
        producto.imagen,
        producto.nombre
    );


    return imagenes;

}


/* =========================================================
   MOSTRAR IMAGEN DE GALERÍA
========================================================= */

function mostrarImagenGaleria(
    imagen,
    producto
) {

    const contenedor =
        document.getElementById(
            "modal-product-image"
        );


    if (
        !contenedor ||
        !imagen ||
        !imagen.url
    ) {

        return;

    }


    contenedor.innerHTML = `

        <img
            src="${escaparAtributo(
                imagen.url
            )}"
            alt="${escaparHTML(
                imagen.alt ||
                producto.nombre ||
                "Producto Maderóh"
            )}"
            class="modal-product-photo"
        >

    `;


    contenedor.classList.add(
        "has-image"
    );

}


/* =========================================================
   MINIATURAS
========================================================= */

function renderizarMiniaturasModal(
    imagenes,
    producto
) {

    const contenedor =
        document.getElementById(
            "modal-gallery-thumbnails"
        );


    if (!contenedor) {
        return;
    }


    if (
        imagenes.length <= 1
    ) {

        limpiarMiniaturasModal();

        return;

    }


    contenedor.innerHTML =
        imagenes
            .map(
                function (
                    imagen,
                    indice
                ) {

                    return `

                        <button
                            type="button"
                            class="
                                modal-gallery-thumbnail
                                ${
                                    indice === 0
                                        ? "active"
                                        : ""
                                }
                            "
                            data-gallery-index="${indice}"
                            aria-label="Ver imagen ${indice + 1}"
                        >

                            <img
                                src="${escaparAtributo(
                                    imagen.url
                                )}"
                                alt="${escaparHTML(
                                    imagen.alt ||
                                    producto.nombre ||
                                    "Producto Maderóh"
                                )}"
                                loading="lazy"
                            >

                        </button>

                    `;

                }
            )
            .join("");


    contenedor.hidden =
        false;


    contenedor
        .querySelectorAll(
            ".modal-gallery-thumbnail"
        )
        .forEach(
            function (boton) {

                boton.addEventListener(
                    "click",
                    function () {

                        const indice =
                            Number(
                                boton.dataset.galleryIndex
                            );


                        const imagen =
                            imagenes[
                                indice
                            ];


                        if (!imagen) {
                            return;
                        }


                        mostrarImagenGaleria(
                            imagen,
                            producto
                        );


                        contenedor
                            .querySelectorAll(
                                ".modal-gallery-thumbnail"
                            )
                            .forEach(
                                function (item) {

                                    item.classList.remove(
                                        "active"
                                    );

                                }
                            );


                        boton.classList.add(
                            "active"
                        );

                    }
                );

            }
        );

}


/* =========================================================
   LIMPIAR MINIATURAS
========================================================= */

function limpiarMiniaturasModal() {

    const contenedor =
        document.getElementById(
            "modal-gallery-thumbnails"
        );


    if (!contenedor) {
        return;
    }


    contenedor.innerHTML =
        "";


    contenedor.hidden =
        true;

}


/* =========================================================
   CERRAR MODAL
========================================================= */

function cerrarModal() {

    const modal =
        document.getElementById(
            "product-modal"
        );


    if (!modal) {
        return;
    }


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


    limpiarMiniaturasModal();


    productoModalActual =
        null;

}


/* =========================================================
   WHATSAPP
========================================================= */

function abrirWhatsAppProducto(
    producto
) {

    const mensaje = [

        "Hola, me interesa cotizar este producto de Maderóh:",

        "",

        `Producto: ${producto.nombre || ""}`,

        `Categoría: ${producto.categoriaNombre || ""}`,

        `Medidas: ${producto.medidas || "Consultar"}`,

        `Acabado: ${producto.acabado || "Consultar"}`,

        `Precio mostrado: ${formatearPrecio(
            producto.precio
        )}`,

        "",

        "¿Me pueden apoyar con disponibilidad y cotización?"

    ].join("\n");


    if (
        typeof crearWhatsAppURL !==
        "function"
    ) {

        alert(
            "WhatsApp todavía no está configurado."
        );

        return;

    }


    window.open(
        crearWhatsAppURL(
            mensaje
        ),

        "_blank",

        "noopener,noreferrer"
    );

}


/* =========================================================
   SIN RESULTADOS
========================================================= */

function mostrarSinResultados(
    mostrar
) {

    const elemento =
        document.getElementById(
            "no-products-message"
        );


    if (elemento) {

        elemento.hidden =
            !mostrar;

    }

}


/* =========================================================
   PRECIO
========================================================= */

function formatearPrecio(
    precio
) {

    if (
        precio === null ||
        precio === undefined ||
        precio === ""
    ) {

        return "Cotizar";

    }


    const numero =
        Number(
            precio
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {

        return "Cotizar";

    }


    return new Intl.NumberFormat(
        "es-MX",
        {

            style:
                "currency",

            currency:
                "MXN",

            maximumFractionDigits:
                0

        }
    )
    .format(
        numero
    );

}


/* =========================================================
   URL DE IMAGEN
========================================================= */

function normalizarURLImagen(
    url
) {

    if (!url) {
        return "";
    }


    const valor =
        String(
            url
        )
        .trim();


    if (
        valor.startsWith(
            "https://"
        )

        ||

        valor.startsWith(
            "http://"
        )
    ) {

        return valor;

    }


    return "";

}


/* =========================================================
   NORMALIZAR TEXTO
========================================================= */

function normalizarTexto(
    texto
) {

    return String(
        texto ||
        ""
    )
    .normalize(
        "NFD"
    )
    .replace(
        /[\u0300-\u036f]/g,
        ""
    )
    .toLowerCase();

}


/* =========================================================
   SEGURIDAD HTML
========================================================= */

function escaparHTML(
    valor
) {

    return String(

        valor === null ||
        valor === undefined

            ? ""

            : valor

    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


function escaparAtributo(
    valor
) {

    return escaparHTML(
        valor
    );

}


/* =========================================================
   CAMBIAR TEXTO
========================================================= */

function cambiarTexto(
    id,
    texto
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.textContent =

            texto === null ||
            texto === undefined

                ? ""

                : texto;

    }

}