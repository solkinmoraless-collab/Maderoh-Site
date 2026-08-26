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

let galeriaModalActual = [];

let indiceGaleriaActual = 0;


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

        seccion.hidden =
            true;

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


    /* =====================================================
       ENLACE DIRECTO AL PRODUCTO DESTACADO
    ===================================================== */

    const enlaceProducto =
        document.getElementById(
            "featured-product-link"
        );


    if (enlaceProducto) {

        enlaceProducto.href =
            `producto.html?id=${encodeURIComponent(
                producto.id
            )}`;

    }


    const contenedorImagen =
        document.getElementById(
            "featured-product-image"
        );


    if (contenedorImagen) {

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


    if (botonWhatsApp) {

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


    /* =====================================================
       URL PÁGINA INDIVIDUAL
    ===================================================== */

    const urlProducto =
        `producto.html?id=${encodeURIComponent(
            producto.id
        )}`;


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


                <!-- =====================================
                     ACCIONES DEL PRODUCTO
                ====================================== -->

                <div class="catalog-product-links">


                    <a
                        href="${escaparAtributo(
                            urlProducto
                        )}"
                        class="product-detail-link"
                    >
                        Ver producto →
                    </a>


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


    const selector =
        `.catalog-filters [data-filter="${CSS.escape(
            categoria
        )}"]`;


    const boton =
        document.querySelector(
            selector
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


    const contenedorImagen =
        document.getElementById(
            "modal-product-image"
        );


    /* =====================================================
       BOTÓN CERRAR
    ===================================================== */

    if (cerrar) {

        cerrar.addEventListener(
            "click",
            function (evento) {

                evento.preventDefault();

                evento.stopPropagation();

                cerrarModal();

            }
        );

    }


    /* =====================================================
       FONDO
    ===================================================== */

    if (fondo) {

        fondo.addEventListener(
            "click",
            cerrarModal
        );

    }


    /* =====================================================
       WHATSAPP
    ===================================================== */

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


    /* =====================================================
       FLECHAS DE GALERÍA
    ===================================================== */

    if (contenedorImagen) {

        contenedorImagen.addEventListener(
            "click",
            function (evento) {

                const objetivo =
                    evento.target;


                if (
                    !(objetivo instanceof Element)
                ) {

                    return;

                }


                const botonAnterior =
                    objetivo.closest(
                        "#modal-gallery-prev"
                    );


                const botonSiguiente =
                    objetivo.closest(
                        "#modal-gallery-next"
                    );


                if (botonAnterior) {

                    evento.preventDefault();

                    evento.stopPropagation();


                    cambiarImagenGaleria(
                        -1
                    );


                    return;

                }


                if (botonSiguiente) {

                    evento.preventDefault();

                    evento.stopPropagation();


                    cambiarImagenGaleria(
                        1
                    );


                    return;

                }

            }
        );

    }


    /* =====================================================
       TECLADO
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (evento) {

            const modal =
                document.getElementById(
                    "product-modal"
                );


            if (
                !modal ||
                !modal.classList.contains(
                    "active"
                )
            ) {

                return;

            }


            if (
                evento.key ===
                "Escape"
            ) {

                evento.preventDefault();

                cerrarModal();

                return;

            }


            if (
                evento.key ===
                "ArrowLeft"
            ) {

                evento.preventDefault();


                cambiarImagenGaleria(
                    -1
                );


                return;

            }


            if (
                evento.key ===
                "ArrowRight"
            ) {

                evento.preventDefault();


                cambiarImagenGaleria(
                    1
                );

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


    limpiarMiniaturasModal();


    actualizarImagenModal(
        producto
    );


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
   LIMPIAR CONTENIDO VISUAL DEL MODAL
========================================================= */

function limpiarContenidoImagenModal() {

    const contenedor =
        document.getElementById(
            "modal-product-image"
        );


    if (!contenedor) {
        return;
    }


    const imagenActual =
        contenedor.querySelector(
            ".modal-product-photo"
        );


    if (imagenActual) {

        imagenActual.remove();

    }


    const nombreActual =
        contenedor.querySelector(
            "#modal-image-name"
        );


    if (nombreActual) {

        nombreActual.remove();

    }

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


    limpiarContenidoImagenModal();


    const imagen =
        normalizarURLImagen(
            producto.imagen
        );


    if (imagen) {

        const elementoImagen =
            document.createElement(
                "img"
            );


        elementoImagen.src =
            imagen;


        elementoImagen.alt =
            producto.nombre ||
            "Producto Maderóh";


        elementoImagen.className =
            "modal-product-photo";


        contenedor.insertBefore(
            elementoImagen,
            contenedor.firstChild
        );


        contenedor.classList.add(
            "has-image"
        );


        return;

    }


    const nombre =
        document.createElement(
            "span"
        );


    nombre.id =
        "modal-image-name";


    nombre.textContent =
        producto.nombre ||
        "MADERÓH";


    contenedor.insertBefore(
        nombre,
        contenedor.firstChild
    );


    contenedor.classList.remove(
        "has-image"
    );

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

            actualizarImagenModal(
                producto
            );

            return;

        }


        galeriaModalActual =
            imagenes;


        indiceGaleriaActual =
            0;


        mostrarImagenGaleria(
            galeriaModalActual[0],
            producto
        );


        renderizarMiniaturasModal(
            galeriaModalActual,
            producto
        );


        actualizarControlesGaleria();


    } catch (error) {

        console.error(
            "Maderóh galería:",
            error
        );


        limpiarMiniaturasModal();


        actualizarImagenModal(
            producto
        );

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


        if (!urlNormalizada) {
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


    agregarImagen(

        resultado &&
        resultado.imagenPrincipal

            ? resultado.imagenPrincipal

            : producto.imagen,

        producto.nombre

    );


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


    limpiarContenidoImagenModal();


    const elementoImagen =
        document.createElement(
            "img"
        );


    elementoImagen.src =
        imagen.url;


    elementoImagen.alt =
        imagen.alt ||
        producto.nombre ||
        "Producto Maderóh";


    elementoImagen.className =
        "modal-product-photo";


    contenedor.insertBefore(
        elementoImagen,
        contenedor.firstChild
    );


    contenedor.classList.add(
        "has-image"
    );

}


/* =========================================================
   RENDER MINIATURAS
========================================================= */

function renderizarMiniaturasModal(
    imagenes,
    producto
) {

    const contenedor =
        document.getElementById(
            "modal-gallery-thumbnails"
        );


    galeriaModalActual =
        Array.isArray(
            imagenes
        )
            ? imagenes
            : [];


    indiceGaleriaActual =
        0;


    if (!contenedor) {

        actualizarControlesGaleria();

        return;

    }


    if (
        galeriaModalActual.length <= 1
    ) {

        contenedor.innerHTML =
            "";


        contenedor.hidden =
            true;


        actualizarControlesGaleria();


        return;

    }


    contenedor.innerHTML =
        galeriaModalActual
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


                        seleccionarImagenGaleria(
                            indice
                        );

                    }
                );

            }
        );


    actualizarControlesGaleria();

}


/* =========================================================
   SELECCIONAR IMAGEN
========================================================= */

function seleccionarImagenGaleria(
    indice
) {

    if (
        galeriaModalActual.length === 0
    ) {

        return;

    }


    if (
        indice < 0 ||
        indice >=
        galeriaModalActual.length
    ) {

        return;

    }


    indiceGaleriaActual =
        indice;


    const imagen =
        galeriaModalActual[
            indiceGaleriaActual
        ];


    if (
        imagen &&
        productoModalActual
    ) {

        mostrarImagenGaleria(
            imagen,
            productoModalActual
        );

    }


    actualizarMiniaturaActiva();

    actualizarControlesGaleria();

}


/* =========================================================
   IMAGEN ANTERIOR / SIGUIENTE
========================================================= */

function cambiarImagenGaleria(
    direccion
) {

    if (
        galeriaModalActual.length <= 1
    ) {

        return;

    }


    let nuevoIndice =
        indiceGaleriaActual +
        direccion;


    if (
        nuevoIndice < 0
    ) {

        nuevoIndice =
            galeriaModalActual.length -
            1;

    }


    if (
        nuevoIndice >=
        galeriaModalActual.length
    ) {

        nuevoIndice =
            0;

    }


    seleccionarImagenGaleria(
        nuevoIndice
    );

}


/* =========================================================
   MINIATURA ACTIVA
========================================================= */

function actualizarMiniaturaActiva() {

    const contenedor =
        document.getElementById(
            "modal-gallery-thumbnails"
        );


    if (!contenedor) {
        return;
    }


    const botones =
        contenedor.querySelectorAll(
            ".modal-gallery-thumbnail"
        );


    botones.forEach(
        function (
            boton,
            indice
        ) {

            const activa =
                indice ===
                indiceGaleriaActual;


            boton.classList.toggle(
                "active",
                activa
            );


            if (activa) {

                boton.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "nearest",

                    inline:
                        "nearest"

                });

            }

        }
    );

}


/* =========================================================
   CONTROLES DE GALERÍA
========================================================= */

function actualizarControlesGaleria() {

    const contador =
        document.getElementById(
            "modal-gallery-counter"
        );


    const anterior =
        document.getElementById(
            "modal-gallery-prev"
        );


    const siguiente =
        document.getElementById(
            "modal-gallery-next"
        );


    const cantidad =
        galeriaModalActual.length;


    if (
        cantidad <= 1
    ) {

        if (contador) {

            contador.hidden =
                true;

        }


        if (anterior) {

            anterior.hidden =
                true;

        }


        if (siguiente) {

            siguiente.hidden =
                true;

        }


        return;

    }


    if (contador) {

        contador.hidden =
            false;


        contador.textContent =
            `${indiceGaleriaActual + 1} / ${cantidad}`;

    }


    if (anterior) {

        anterior.hidden =
            false;

    }


    if (siguiente) {

        siguiente.hidden =
            false;

    }

}


/* =========================================================
   LIMPIAR MINIATURAS
========================================================= */

function limpiarMiniaturasModal() {

    const contenedor =
        document.getElementById(
            "modal-gallery-thumbnails"
        );


    galeriaModalActual =
        [];


    indiceGaleriaActual =
        0;


    if (contenedor) {

        contenedor.innerHTML =
            "";


        contenedor.hidden =
            true;

    }


    actualizarControlesGaleria();

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


/* =========================================================
   ESCAPAR ATRIBUTO
========================================================= */

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