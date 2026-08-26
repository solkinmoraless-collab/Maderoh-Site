"use strict";


/* =========================================================
   MADERÓH
   PRODUCTOS DESTACADOS DEL INICIO
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const INICIO_PRODUCTS_ENDPOINT =
    "/.netlify/functions/products";


const INICIO_MAX_DESTACADOS =
    3;


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        iniciarProductosDestacadosInicio();

    }
);


/* =========================================================
   CARGAR DESTACADOS
========================================================= */

async function iniciarProductosDestacadosInicio() {

    const grid =
        document.getElementById(
            "home-featured-grid"
        );


    if (!grid) {

        return;

    }


    mostrarCargandoDestacados(
        grid
    );


    try {

        const respuesta =
            await fetch(
                INICIO_PRODUCTS_ENDPOINT,
                {

                    method:
                        "GET",

                    headers: {

                        Accept:
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
                "Respuesta de productos inválida."
            );

        }


        const productosActivos =
            resultado.productos.filter(
                function (producto) {

                    return (
                        producto &&
                        producto.activo !== false
                    );

                }
            );


        let destacados =
            productosActivos.filter(
                function (producto) {

                    return (
                        producto.destacado === true
                    );

                }
            );


        /*
         * Si todavía no existen suficientes productos
         * marcados como destacados, completamos con los
         * primeros productos activos sin duplicarlos.
         */

        if (
            destacados.length <
            INICIO_MAX_DESTACADOS
        ) {

            productosActivos.forEach(
                function (producto) {

                    if (
                        destacados.length >=
                        INICIO_MAX_DESTACADOS
                    ) {

                        return;

                    }


                    const yaExiste =
                        destacados.some(
                            function (destacado) {

                                return (
                                    String(
                                        destacado.id
                                    ) ===
                                    String(
                                        producto.id
                                    )
                                );

                            }
                        );


                    if (!yaExiste) {

                        destacados.push(
                            producto
                        );

                    }

                }
            );

        }


        destacados =
            destacados.slice(
                0,
                INICIO_MAX_DESTACADOS
            );


        renderizarDestacados(
            grid,
            destacados
        );


    } catch (error) {

        console.error(
            "Maderóh destacados inicio:",
            error
        );


        mostrarErrorDestacados(
            grid
        );

    }

}


/* =========================================================
   RENDERIZAR
========================================================= */

function renderizarDestacados(
    grid,
    productos
) {

    if (
        !Array.isArray(
            productos
        ) ||
        productos.length === 0
    ) {

        grid.innerHTML = `

            <div class="home-featured-empty">

                <span class="eyebrow">
                    CATÁLOGO
                </span>

                <p>
                    Próximamente encontrarás aquí
                    nuestra selección destacada.
                </p>

                <a
                    href="productos.html"
                    class="text-link"
                >
                    Ver catálogo →
                </a>

            </div>

        `;


        return;

    }


    grid.innerHTML =
        productos
            .map(
                function (producto) {

                    return crearTarjetaDestacada(
                        producto
                    );

                }
            )
            .join("");

}


/* =========================================================
   TARJETA
========================================================= */

function crearTarjetaDestacada(
    producto
) {

    const id =
        escaparHTMLInicio(
            producto.id
        );


    const nombre =
        escaparHTMLInicio(
            producto.nombre ||
            "Producto Maderóh"
        );


    const categoria =
        escaparHTMLInicio(
            producto.categoriaNombre ||
            producto.categoria ||
            "Producto"
        );


    const imagen =
        normalizarURLImagenInicio(
            producto.imagen
        );


    const url =
        `producto.html?id=${encodeURIComponent(
            producto.id
        )}`;


    const contenidoImagen =
        imagen

            ?

            `
            <img
                src="${escaparAtributoInicio(
                    imagen
                )}"
                alt="${nombre}"
                class="home-featured-photo"
                loading="lazy"
                decoding="async"
            >
            `

            :

            `
            <div
                class="home-featured-placeholder"
                aria-hidden="true"
            >
                <span>
                    MADERÓH
                </span>
            </div>
            `;


    return `

        <article
            class="featured-product home-featured-product"
            data-product-id="${id}"
        >

            <a
                href="${escaparAtributoInicio(
                    url
                )}"
                class="home-featured-image-link"
                aria-label="Ver ${nombre}"
            >

                <div class="featured-image home-featured-image">

                    ${contenidoImagen}

                </div>

            </a>


            <div class="featured-info">

                <div>

                    <span class="product-small">
                        ${categoria}
                    </span>

                    <h3>
                        ${nombre}
                    </h3>

                </div>


                <a
                    href="${escaparAtributoInicio(
                        url
                    )}"
                    class="home-featured-arrow"
                    aria-label="Ver ${nombre}"
                >
                    →
                </a>

            </div>

        </article>

    `;

}


/* =========================================================
   CARGANDO
========================================================= */

function mostrarCargandoDestacados(
    grid
) {

    grid.innerHTML = `

        <div class="home-featured-loading">

            <span>
                MADERÓH
            </span>

            <p>
                Cargando productos destacados...
            </p>

        </div>

    `;

}


/* =========================================================
   ERROR
========================================================= */

function mostrarErrorDestacados(
    grid
) {

    grid.innerHTML = `

        <div class="home-featured-empty">

            <span class="eyebrow">
                PRODUCTOS
            </span>

            <p>
                No fue posible cargar los productos destacados.
            </p>

            <a
                href="productos.html"
                class="text-link"
            >
                Ver catálogo →
            </a>

        </div>

    `;

}


/* =========================================================
   URL DE IMAGEN
========================================================= */

function normalizarURLImagenInicio(
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
        ) ||
        valor.startsWith(
            "http://"
        )
    ) {

        return valor;

    }


    return "";

}


/* =========================================================
   SEGURIDAD HTML
========================================================= */

function escaparHTMLInicio(
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

function escaparAtributoInicio(
    valor
) {

    return escaparHTMLInicio(
        valor
    );

}