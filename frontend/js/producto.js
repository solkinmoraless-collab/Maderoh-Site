"use strict";


/* =========================================================
   MADERÓH
   PÁGINA INDIVIDUAL DE PRODUCTO
========================================================= */


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const PRODUCTOS_ENDPOINT =
    "/.netlify/functions/products";


const IMAGENES_ENDPOINT =
    "/.netlify/functions/product-images";


const WHATSAPP_NUMBER =
    "525577265340";


/* =========================================================
   ELEMENTOS
========================================================= */

const loadingElement =
    document.getElementById(
        "product-detail-loading"
    );


const productElement =
    document.getElementById(
        "product-detail"
    );


const errorElement =
    document.getElementById(
        "product-detail-error"
    );


const mainImageElement =
    document.getElementById(
        "product-detail-main-image"
    );


const thumbnailsElement =
    document.getElementById(
        "product-detail-thumbnails"
    );


const categoryElement =
    document.getElementById(
        "product-detail-category"
    );


const nameElement =
    document.getElementById(
        "product-detail-name"
    );


const descriptionElement =
    document.getElementById(
        "product-detail-description"
    );


const priceElement =
    document.getElementById(
        "product-detail-price"
    );


const measurementsElement =
    document.getElementById(
        "product-detail-measurements"
    );


const widthElement =
    document.getElementById(
        "product-detail-width"
    );


const depthElement =
    document.getElementById(
        "product-detail-depth"
    );


const heightElement =
    document.getElementById(
        "product-detail-height"
    );


const finishElement =
    document.getElementById(
        "product-detail-finish"
    );


const whatsappButton =
    document.getElementById(
        "product-detail-whatsapp"
    );


const metaDescription =
    document.getElementById(
        "product-meta-description"
    );


/* =========================================================
   ESTADO
========================================================= */

let productoActual =
    null;


let galeriaActual =
    [];


let imagenActual =
    0;


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    iniciarPaginaProducto
);


async function iniciarPaginaProducto() {

    try {

        const productId =
            obtenerProductId();


        if (!productId) {

            mostrarError();

            return;

        }


        const producto =
            await obtenerProducto(
                productId
            );


        if (!producto) {

            mostrarError();

            return;

        }


        productoActual =
            producto;


        renderizarProducto(
            producto
        );


        await cargarGaleria(
            productId,
            producto
        );


        configurarWhatsApp(
            producto
        );


        actualizarSEO(
            producto
        );


        mostrarProducto();


    } catch (error) {

        console.error(
            "Maderóh producto:",
            error
        );


        mostrarError();

    }

}


/* =========================================================
   PRODUCT ID
========================================================= */

function obtenerProductId() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );


    const valor =
        parametros.get(
            "id"
        );


    if (!valor) {

        return null;

    }


    const id =
        Number(
            valor
        );


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        return null;

    }


    return id;

}


/* =========================================================
   OBTENER PRODUCTO
========================================================= */

async function obtenerProducto(
    productId
) {

    const respuesta =
        await fetch(
            PRODUCTOS_ENDPOINT,
            {
                method:
                    "GET",

                headers: {
                    Accept:
                        "application/json"
                }
            }
        );


    if (!respuesta.ok) {

        throw new Error(
            "No fue posible cargar el catálogo."
        );

    }


    const contenido =
        await respuesta.json();


    const productos =
        Array.isArray(
            contenido.productos
        )
            ? contenido.productos
            : [];


    return (
        productos.find(
            producto =>
                Number(
                    producto.id
                ) === productId
        ) ||
        null
    );

}


/* =========================================================
   RENDER PRODUCTO
========================================================= */

function renderizarProducto(
    producto
) {

    if (categoryElement) {

        categoryElement.textContent =
            producto.categoriaNombre ||
            producto.categoria ||
            "Producto";

    }


    if (nameElement) {

        nameElement.textContent =
            producto.nombre ||
            "Producto Maderóh";

    }


    if (descriptionElement) {

        descriptionElement.textContent =
            producto.descripcion ||
            "Diseño y fabricación Maderóh.";

    }


    if (priceElement) {

        priceElement.textContent =
            formatearPrecio(
                producto.precio,
                producto.moneda
            );

    }


    if (measurementsElement) {

        measurementsElement.textContent =
            textoSeguro(
                producto.medidas,
                "Consultar"
            );

    }


    if (widthElement) {

        widthElement.textContent =
            formatearCentimetros(
                producto.anchoCm
            );

    }


    if (depthElement) {

        depthElement.textContent =
            formatearCentimetros(
                producto.profundidadCm
            );

    }


    if (heightElement) {

        heightElement.textContent =
            formatearCentimetros(
                producto.alturaCm
            );

    }


    if (finishElement) {

        finishElement.textContent =
            textoSeguro(
                producto.acabado,
                "Consultar"
            );

    }


    /*
     * Mientras se obtiene la galería,
     * mostramos la imagen principal que
     * ya viene desde products.js.
     */

    if (producto.imagen) {

        mostrarImagenPrincipal(
            producto.imagen,
            producto.nombre
        );

    } else {

        mostrarPlaceholder();

    }

}


/* =========================================================
   GALERÍA
========================================================= */

async function cargarGaleria(
    productId,
    producto
) {

    try {

        const respuesta =
            await fetch(
                `${IMAGENES_ENDPOINT}?productId=${encodeURIComponent(productId)}`,
                {
                    method:
                        "GET",

                    headers: {
                        Accept:
                            "application/json"
                    }
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                "No fue posible cargar la galería."
            );

        }


        const contenido =
            await respuesta.json();


        let imagenes =
            Array.isArray(
                contenido.imagenes
            )
                ? contenido.imagenes
                : [];


        /*
         * Eliminamos registros sin URL.
         */

        imagenes =
            imagenes.filter(
                imagen =>
                    imagen &&
                    typeof imagen.url ===
                        "string" &&
                    imagen.url.trim()
            );


        /*
         * Si main_image_url no aparece en
         * product_images, la agregamos para
         * evitar perder la foto principal.
         */

        if (
            producto.imagen &&
            !imagenes.some(
                imagen =>
                    imagen.url ===
                    producto.imagen
            )
        ) {

            imagenes.unshift({
                id:
                    "principal",

                url:
                    producto.imagen,

                alt:
                    producto.nombre ||
                    "Producto Maderóh",

                posicion:
                    0,

                principal:
                    true
            });

        }


        /*
         * Evitamos URLs duplicadas.
         */

        const urls =
            new Set();


        galeriaActual =
            imagenes.filter(
                imagen => {

                    if (
                        urls.has(
                            imagen.url
                        )
                    ) {

                        return false;

                    }


                    urls.add(
                        imagen.url
                    );


                    return true;

                }
            );


        imagenActual =
            0;


        if (
            galeriaActual.length === 0
        ) {

            if (producto.imagen) {

                mostrarImagenPrincipal(
                    producto.imagen,
                    producto.nombre
                );

            } else {

                mostrarPlaceholder();

            }


            ocultarMiniaturas();

            return;

        }


        /*
         * Si Supabase marca una imagen como
         * principal, la mostramos primero.
         */

        const indicePrincipal =
            galeriaActual.findIndex(
                imagen =>
                    imagen.principal ===
                    true
            );


        if (
            indicePrincipal > 0
        ) {

            const [
                principal
            ] =
                galeriaActual.splice(
                    indicePrincipal,
                    1
                );


            galeriaActual.unshift(
                principal
            );

        }


        renderizarGaleria();

    } catch (error) {

        /*
         * Una falla en la galería no debe
         * impedir mostrar el producto.
         */

        console.error(
            "Maderóh galería producto:",
            error
        );


        if (producto.imagen) {

            mostrarImagenPrincipal(
                producto.imagen,
                producto.nombre
            );

        }


        ocultarMiniaturas();

    }

}


/* =========================================================
   RENDER GALERÍA
========================================================= */

function renderizarGaleria() {

    if (
        galeriaActual.length === 0
    ) {

        mostrarPlaceholder();

        ocultarMiniaturas();

        return;

    }


    seleccionarImagen(
        0
    );


    renderizarMiniaturas();

}


/* =========================================================
   SELECCIONAR IMAGEN
========================================================= */

function seleccionarImagen(
    indice
) {

    if (
        !Number.isInteger(indice) ||
        indice < 0 ||
        indice >=
            galeriaActual.length
    ) {

        return;

    }


    imagenActual =
        indice;


    const imagen =
        galeriaActual[
            imagenActual
        ];


    mostrarImagenPrincipal(
        imagen.url,
        imagen.alt ||
        productoActual?.nombre ||
        "Producto Maderóh"
    );


    actualizarMiniaturaActiva();

}


/* =========================================================
   IMAGEN PRINCIPAL
========================================================= */

function mostrarImagenPrincipal(
    url,
    alt
) {

    if (!mainImageElement) {

        return;

    }


    mainImageElement.innerHTML =
        "";


    const imagen =
        document.createElement(
            "img"
        );


    imagen.src =
        url;


    imagen.alt =
        alt ||
        "Producto Maderóh";


    imagen.className =
        "product-detail-photo";


    imagen.loading =
        "eager";


    imagen.decoding =
        "async";


    mainImageElement.appendChild(
        imagen
    );

}


/* =========================================================
   PLACEHOLDER
========================================================= */

function mostrarPlaceholder() {

    if (!mainImageElement) {

        return;

    }


    mainImageElement.innerHTML =
        "";


    const texto =
        document.createElement(
            "span"
        );


    texto.textContent =
        productoActual?.nombre ||
        "MADERÓH";


    mainImageElement.appendChild(
        texto
    );

}


/* =========================================================
   MINIATURAS
========================================================= */

function renderizarMiniaturas() {

    if (!thumbnailsElement) {

        return;

    }


    thumbnailsElement.innerHTML =
        "";


    /*
     * Con una sola fotografía no necesitamos
     * mostrar la fila de miniaturas.
     */

    if (
        galeriaActual.length <= 1
    ) {

        ocultarMiniaturas();

        return;

    }


    galeriaActual.forEach(
        (
            imagen,
            indice
        ) => {

            const boton =
                document.createElement(
                    "button"
                );


            boton.type =
                "button";


            boton.className =
                "product-detail-thumbnail";


            boton.setAttribute(
                "aria-label",
                `Ver imagen ${indice + 1}`
            );


            boton.dataset.index =
                String(
                    indice
                );


            const miniatura =
                document.createElement(
                    "img"
                );


            miniatura.src =
                imagen.url;


            miniatura.alt =
                imagen.alt ||
                productoActual?.nombre ||
                "Producto Maderóh";


            miniatura.loading =
                "lazy";


            miniatura.decoding =
                "async";


            boton.appendChild(
                miniatura
            );


            boton.addEventListener(
                "click",
                function () {

                    seleccionarImagen(
                        indice
                    );

                }
            );


            thumbnailsElement.appendChild(
                boton
            );

        }
    );


    thumbnailsElement.hidden =
        false;


    actualizarMiniaturaActiva();

}


/* =========================================================
   MINIATURA ACTIVA
========================================================= */

function actualizarMiniaturaActiva() {

    if (!thumbnailsElement) {

        return;

    }


    const miniaturas =
        thumbnailsElement.querySelectorAll(
            ".product-detail-thumbnail"
        );


    miniaturas.forEach(
        (
            miniatura,
            indice
        ) => {

            const activa =
                indice ===
                imagenActual;


            miniatura.classList.toggle(
                "active",
                activa
            );


            miniatura.setAttribute(
                "aria-current",
                activa
                    ? "true"
                    : "false"
            );

        }
    );

}


/* =========================================================
   OCULTAR MINIATURAS
========================================================= */

function ocultarMiniaturas() {

    if (!thumbnailsElement) {

        return;

    }


    thumbnailsElement.innerHTML =
        "";


    thumbnailsElement.hidden =
        true;

}


/* =========================================================
   WHATSAPP
========================================================= */

function configurarWhatsApp(
    producto
) {

    if (!whatsappButton) {

        return;

    }


    whatsappButton.addEventListener(
        "click",
        function () {

            const mensaje =
                construirMensajeWhatsApp(
                    producto
                );


            const url =
                `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;


            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );

        }
    );

}


/* =========================================================
   MENSAJE WHATSAPP
========================================================= */

function construirMensajeWhatsApp(
    producto
) {

    const partes = [
        "Hola Maderóh, me interesa este producto:",
        "",
        producto.nombre ||
            "Producto Maderóh"
    ];


    if (
        producto.precio !== null &&
        producto.precio !== undefined
    ) {

        partes.push(
            `Precio publicado: ${formatearPrecio(
                producto.precio,
                producto.moneda
            )}`
        );

    }


    if (producto.medidas) {

        partes.push(
            `Medidas: ${producto.medidas}`
        );

    }


    if (producto.acabado) {

        partes.push(
            `Acabado: ${producto.acabado}`
        );

    }


    partes.push(
        "",
        "¿Me pueden dar más información y ayudarme con una cotización?",
        "",
        `Producto: ${window.location.href}`
    );


    return partes.join(
        "\n"
    );

}


/* =========================================================
   SEO
========================================================= */

function actualizarSEO(
    producto
) {

    const nombre =
        producto.nombre ||
        "Producto";


    document.title =
        `${nombre} | Maderóh`;


    if (metaDescription) {

        const descripcion =
            producto.descripcion
                ? `${nombre}. ${producto.descripcion}`
                : `${nombre}, mobiliario diseñado y fabricado por Maderóh.`;


        metaDescription.setAttribute(
            "content",
            limitarTexto(
                descripcion,
                155
            )
        );

    }

}


/* =========================================================
   MOSTRAR PRODUCTO
========================================================= */

function mostrarProducto() {

    if (loadingElement) {

        loadingElement.hidden =
            true;

    }


    if (errorElement) {

        errorElement.hidden =
            true;

    }


    if (productElement) {

        productElement.hidden =
            false;

    }

}


/* =========================================================
   MOSTRAR ERROR
========================================================= */

function mostrarError() {

    if (loadingElement) {

        loadingElement.hidden =
            true;

    }


    if (productElement) {

        productElement.hidden =
            true;

    }


    if (errorElement) {

        errorElement.hidden =
            false;

    }

}


/* =========================================================
   PRECIO
========================================================= */

function formatearPrecio(
    precio,
    moneda
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
        !Number.isFinite(numero)
    ) {

        return "Cotizar";

    }


    try {

        return new Intl.NumberFormat(
            "es-MX",
            {
                style:
                    "currency",

                currency:
                    moneda ||
                    "MXN",

                maximumFractionDigits:
                    0
            }
        ).format(
            numero
        );

    } catch {

        return `$${numero.toLocaleString(
            "es-MX"
        )}`;

    }

}


/* =========================================================
   CENTÍMETROS
========================================================= */

function formatearCentimetros(
    valor
) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return "Consultar";

    }


    const numero =
        Number(
            valor
        );


    if (
        Number.isFinite(numero)
    ) {

        return `${numero} cm`;

    }


    return `${valor} cm`;

}


/* =========================================================
   TEXTO SEGURO
========================================================= */

function textoSeguro(
    valor,
    respaldo
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return respaldo;

    }


    const texto =
        String(
            valor
        ).trim();


    return texto ||
        respaldo;

}


/* =========================================================
   LIMITAR TEXTO
========================================================= */

function limitarTexto(
    texto,
    limite
) {

    const limpio =
        String(
            texto ||
            ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    if (
        limpio.length <=
        limite
    ) {

        return limpio;

    }


    return (
        limpio
            .slice(
                0,
                limite - 1
            )
            .trim() +
        "…"
    );

}