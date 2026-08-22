"use strict";


/* =========================================================
   MADERÓH
   CATÁLOGO PÚBLICO
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const PRODUCTS_ENDPOINT =
    "/.netlify/functions/products";


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
   CARGAR PRODUCTOS DESDE NETLIFY / SUPABASE
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


        renderizarCatalogo();


    } catch (error) {

        console.error(
            "Maderóh catálogo:",
            error
        );


        productosActuales = [];


        mostrarErrorCatalogo();

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
   RENDERIZAR
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
                        producto.categoria || ""
                    );


                const coincideCategoria =

                    filtroActual === "all"

                    ||

                    categoria ===
                    filtroActual;


                const textoProducto =
                    normalizarTexto(

                        String(
                            producto.nombre || ""
                        )

                        + " " +

                        String(
                            producto.categoriaNombre || ""
                        )

                        + " " +

                        String(
                            producto.descripcion || ""
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

        grid.innerHTML = "";

        mostrarSinResultados(true);

        return;

    }


    mostrarSinResultados(false);


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
        String(indice + 1)
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
            src="${escaparAtributo(imagen)}"
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
   CATEGORÍA DESDE URL
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
            `.catalog-filters [data-filter="${CSS.escape(categoria)}"]`
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

function buscarProducto(id) {

    return productosActuales.find(
        function (producto) {

            return (
                String(
                    producto.id
                ) ===
                String(id)
            );

        }
    );

}


/* =========================================================
   MODAL
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

function abrirModal(producto) {

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

}


/* =========================================================
   IMAGEN MODAL
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
                src="${escaparAtributo(imagen)}"
                alt="${escaparHTML(producto.nombre || "Producto Maderóh")}"
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
            ${escaparHTML(producto.nombre || "MADERÓH")}
        </span>

    `;

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

        `Precio mostrado: ${formatearPrecio(producto.precio)}`,

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

function formatearPrecio(precio) {

    if (
        precio === null ||
        precio === undefined ||
        precio === ""
    ) {

        return "Cotizar";

    }


    const numero =
        Number(precio);


    if (
        !Number.isFinite(numero)
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
    .format(numero);

}


/* =========================================================
   URL DE IMAGEN
========================================================= */

function normalizarURLImagen(url) {

    if (!url) {
        return "";
    }


    const valor =
        String(url)
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
   TEXTO
========================================================= */

function normalizarTexto(texto) {

    return String(
        texto || ""
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

function escaparHTML(valor) {

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


function escaparAtributo(valor) {

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
        document.getElementById(id);


    if (elemento) {

        elemento.textContent =
            texto === null ||
            texto === undefined

            ? ""

            : texto;

    }

}