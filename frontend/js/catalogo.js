"use strict";


/* =========================================================
   PRODUCTOS TEMPORALES
========================================================= */

const PRODUCTOS_LOCALES = [

    {
        id: 1,
        nombre: "César XL",
        categoria: "escritorios",
        categoriaNombre: "Escritorio",
        precio: 8500,
        medidas: "Consultar medidas",
        acabado: "Madera y metal",
        descripcion: "Escritorio industrial de gran formato."
    },

    {
        id: 2,
        nombre: "Berenice",
        categoria: "escritorios",
        categoriaNombre: "Escritorio",
        precio: 5799,
        medidas: "Consultar medidas",
        acabado: "Personalizable",
        descripcion: "Escritorio compacto para hogar u oficina."
    },

    {
        id: 3,
        nombre: "Berenice XL",
        categoria: "escritorios",
        categoriaNombre: "Escritorio",
        precio: 7800,
        medidas: "Consultar medidas",
        acabado: "Personalizable",
        descripcion: "Versión de gran formato del escritorio Berenice."
    },

    {
        id: 4,
        nombre: "Banca Otilia",
        categoria: "bancas",
        categoriaNombre: "Banca",
        precio: 3000,
        medidas: "Aprox. 120 cm",
        acabado: "Personalizable",
        descripcion: "Banca industrial para hogar o negocio."
    },

    {
        id: 5,
        nombre: "Banca David",
        categoria: "bancas",
        categoriaNombre: "Banca",
        precio: 2500,
        medidas: "Consultar medidas",
        acabado: "Madera natural",
        descripcion: "Banca de madera con estructura metálica."
    },

    {
        id: 6,
        nombre: "Banca Grande Cafetería",
        categoria: "negocios",
        categoriaNombre: "Cafetería",
        precio: 21500,
        medidas: "Según proyecto",
        acabado: "Personalizable",
        descripcion: "Banca de gran formato para espacios comerciales."
    },

    {
        id: 7,
        nombre: "Cajonera Said",
        categoria: "almacenamiento",
        categoriaNombre: "Almacenamiento",
        precio: 5500,
        medidas: "Consultar medidas",
        acabado: "Personalizable",
        descripcion: "Cajonera funcional de estilo industrial."
    },

    {
        id: 8,
        nombre: "Mesa Brasil",
        categoria: "mesas",
        categoriaNombre: "Mesa",
        precio: 12500,
        medidas: "Consultar medidas",
        acabado: "Personalizable",
        descripcion: "Mesa robusta para comedor o proyecto comercial."
    },

    {
        id: 9,
        nombre: "Centro de TV Omar Reygadas",
        categoria: "entretenimiento",
        categoriaNombre: "Centro de TV",
        precio: 16500,
        medidas: "Consultar medidas",
        acabado: "Personalizable",
        descripcion: "Centro de TV con almacenamiento integrado."
    },

    {
        id: 10,
        nombre: "Centro de TV Said",
        categoria: "entretenimiento",
        categoriaNombre: "Centro de TV",
        precio: 5000,
        medidas: "Consultar medidas",
        acabado: "Personalizable",
        descripcion: "Centro de TV ligero y funcional."
    },

    {
        id: 11,
        nombre: "Centro de TV Santa Fe",
        categoria: "entretenimiento",
        categoriaNombre: "Centro de TV",
        precio: 18500,
        medidas: "Consultar medidas",
        acabado: "Personalizable",
        descripcion: "Centro de TV de gran formato."
    },

    {
        id: 12,
        nombre: "Litera Jean Paul",
        categoria: "recamara",
        categoriaNombre: "Recámara",
        precio: 14500,
        medidas: "Consultar medidas",
        acabado: "Personalizable",
        descripcion: "Litera industrial de alta resistencia."
    },

    {
        id: 13,
        nombre: "Barra Sicarú",
        categoria: "negocios",
        categoriaNombre: "Cafetería",
        precio: 30000,
        medidas: "Según proyecto",
        acabado: "Personalizable",
        descripcion: "Barra para cafeterías y espacios comerciales."
    }

];


/* =========================================================
   ESTADO
========================================================= */

let productosActuales = [...PRODUCTOS_LOCALES];

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
   INICIAR
========================================================= */

function iniciarCatalogo() {

    const grid =
        document.getElementById(
            "product-grid"
        );


    if (!grid) {

        console.error(
            "No existe #product-grid"
        );

        return;

    }


    iniciarFiltros();

    iniciarBuscador();

    iniciarModal();

    aplicarFiltroURL();

    renderizarCatalogo();

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

                const coincideCategoria =

                    filtroActual === "all"

                    ||

                    producto.categoria ===
                    filtroActual;


                const textoProducto =
                    normalizarTexto(
                        producto.nombre +
                        " " +
                        producto.categoriaNombre +
                        " " +
                        producto.descripcion
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
   TARJETA
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

                <span
                    class="product-number"
                >
                    ${numero}
                </span>


                ${
                    producto.categoria ===
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
                        data-id="${producto.id}"
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
                    ${producto.categoriaNombre}
                </span>


                <div
                    class="product-title-row"
                >

                    <h3>
                        ${producto.nombre}
                    </h3>

                    <span>
                        ${precio}
                    </span>

                </div>


                <p>
                    ${producto.descripcion}
                </p>


                <button
                    type="button"
                    class="
                        product-text-whatsapp
                        dynamic-whatsapp
                    "
                    data-id="${producto.id}"
                >
                    ${
                        producto.categoria ===
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
            `.catalog-filters [data-filter="${categoria}"]`
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
                producto.id ===
                Number(id)
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
        producto.categoriaNombre
    );


    cambiarTexto(
        "modal-product-name",
        producto.nombre
    );


    cambiarTexto(
        "modal-product-description",
        producto.descripcion
    );


    cambiarTexto(
        "modal-product-size",
        producto.medidas
    );


    cambiarTexto(
        "modal-product-price",
        formatearPrecio(
            producto.precio
        )
    );


    cambiarTexto(
        "modal-image-name",
        producto.nombre
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

        `Producto: ${producto.nombre}`,

        `Categoría: ${producto.categoriaNombre}`,

        `Medidas: ${producto.medidas}`,

        `Acabado: ${producto.acabado}`,

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
        Number(precio)
    );

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


function cambiarTexto(
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