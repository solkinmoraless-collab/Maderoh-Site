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


const SITE_URL =
    "https://maderoh.store";


/* =========================================================
   ELEMENTOS DE PRODUCTO
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


/*
 * IMPORTANTE:
 *
 * No cambiamos la API.
 *
 * anchoCm       → width_cm
 * profundidadCm → depth_cm
 * alturaCm      → height_cm
 */

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


/* =========================================================
   ELEMENTOS SEO
========================================================= */

const metaDescription =
    document.getElementById(
        "product-meta-description"
    );


const canonicalElement =
    document.getElementById(
        "product-canonical"
    );


const ogTitleElement =
    document.getElementById(
        "product-og-title"
    );


const ogDescriptionElement =
    document.getElementById(
        "product-og-description"
    );


const ogUrlElement =
    document.getElementById(
        "product-og-url"
    );


const ogImageElement =
    document.getElementById(
        "product-og-image"
    );


const twitterCardElement =
    document.getElementById(
        "product-twitter-card"
    );


const twitterTitleElement =
    document.getElementById(
        "product-twitter-title"
    );


const twitterDescriptionElement =
    document.getElementById(
        "product-twitter-description"
    );


const twitterImageElement =
    document.getElementById(
        "product-twitter-image"
    );


const structuredDataElement =
    document.getElementById(
        "product-structured-data"
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

/*
 * Arranque robusto.
 *
 * Si el DOM todavía está cargando,
 * esperamos DOMContentLoaded.
 *
 * Si el archivo JavaScript se ejecuta
 * cuando el DOM ya terminó de cargar,
 * iniciamos inmediatamente.
 */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarPaginaProducto,
        {
            once:
                true
        }
    );

} else {

    iniciarPaginaProducto();

}


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
            producto,
            productId
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
        !Number.isInteger(
            id
        ) ||
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

                },

                cache:
                    "no-store"

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
                ) ===
                productId
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


    /* =====================================================
       DIMENSIONES

       Visual:
       Alto  → alturaCm
       Largo → profundidadCm
       Ancho → anchoCm

       Internamente NO cambia la API.
    ===================================================== */


    if (heightElement) {

        heightElement.textContent =
            formatearCentimetros(
                producto.alturaCm
            );

    }


    if (depthElement) {

        depthElement.textContent =
            formatearCentimetros(
                producto.profundidadCm
            );

    }


    if (widthElement) {

        widthElement.textContent =
            formatearCentimetros(
                producto.anchoCm
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

    if (
        producto.imagen
    ) {

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
                `${IMAGENES_ENDPOINT}?productId=${encodeURIComponent(
                    productId
                )}`,
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


        /* =================================================
           ELIMINAR REGISTROS SIN URL
        ================================================= */

        imagenes =
            imagenes.filter(
                imagen =>
                    imagen &&
                    typeof imagen.url ===
                        "string" &&
                    imagen.url.trim()
            );


        /* =================================================
           INCLUIR IMAGEN PRINCIPAL
        ================================================= */

        if (
            producto.imagen &&
            !imagenes.some(
                imagen =>
                    imagen.url ===
                    producto.imagen
            )
        ) {

            imagenes.unshift(
                {

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

                }
            );

        }


        /* =================================================
           ELIMINAR DUPLICADOS
        ================================================= */

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

            if (
                producto.imagen
            ) {

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


        /* =================================================
           IMAGEN PRINCIPAL PRIMERO
        ================================================= */

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


        if (
            producto.imagen
        ) {

            mostrarImagenPrincipal(
                producto.imagen,
                producto.nombre
            );

        } else {

            mostrarPlaceholder();

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
        !Number.isInteger(
            indice
        ) ||
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

    if (
        !mainImageElement
    ) {

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

    if (
        !mainImageElement
    ) {

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

    if (
        !thumbnailsElement
    ) {

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

    if (
        !thumbnailsElement
    ) {

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

    if (
        !thumbnailsElement
    ) {

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

    if (
        !whatsappButton
    ) {

        return;

    }


    whatsappButton.addEventListener(
        "click",
        function () {

            const mensaje =
                construirMensajeWhatsApp(
                    producto
                );


            /*
             * El número de WhatsApp vive
             * únicamente en main.js.
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


    /* =====================================================
       DIMENSIONES

       Mostramos las nuevas etiquetas,
       pero mantenemos los campos internos.
    ===================================================== */

    if (
        producto.alturaCm
    ) {

        partes.push(
            `Alto: ${formatearCentimetros(
                producto.alturaCm
            )}`
        );

    }


    if (
        producto.profundidadCm
    ) {

        partes.push(
            `Largo: ${formatearCentimetros(
                producto.profundidadCm
            )}`
        );

    }


    if (
        producto.anchoCm
    ) {

        partes.push(
            `Ancho: ${formatearCentimetros(
                producto.anchoCm
            )}`
        );

    }


    /*
     * Conservamos medidas generales
     * si existen.
     */

    if (
        producto.medidas
    ) {

        partes.push(
            `Referencia de medidas: ${producto.medidas}`
        );

    }


    if (
        producto.acabado
    ) {

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
   SEO DINÁMICO
========================================================= */

function actualizarSEO(
    producto,
    productId
) {

    const nombre =
        textoSeguro(
            producto.nombre,
            "Producto"
        );


    const categoria =
        textoSeguro(
            producto.categoriaNombre ||
            producto.categoria,
            "Mobiliario"
        );


    const descripcionBase =
        producto.descripcion

            ? `${nombre}. ${producto.descripcion}`

            : `${nombre}, ${categoria.toLowerCase()} diseñado y fabricado por Maderóh.`;


    const descripcion =
        limitarTexto(
            descripcionBase,
            155
        );


    const titulo =
        limitarTexto(
            `${nombre} | Maderóh`,
            60
        );


    const urlProducto =
        `${SITE_URL}/producto.html?id=${encodeURIComponent(
            productId
        )}`;


    const imagen =
        obtenerURLSEOImagen(
            producto.imagen
        );


    /* =====================================================
       TITLE
    ===================================================== */

    document.title =
        titulo;


    /* =====================================================
       DESCRIPTION
    ===================================================== */

    establecerContenidoMeta(
        metaDescription,
        descripcion
    );


    /* =====================================================
       CANONICAL
    ===================================================== */

    if (
        canonicalElement
    ) {

        canonicalElement.setAttribute(
            "href",
            urlProducto
        );

    }


    /* =====================================================
       OPEN GRAPH
    ===================================================== */

    establecerContenidoMeta(
        ogTitleElement,
        titulo
    );


    establecerContenidoMeta(
        ogDescriptionElement,
        descripcion
    );


    establecerContenidoMeta(
        ogUrlElement,
        urlProducto
    );


    if (
        imagen
    ) {

        establecerContenidoMeta(
            ogImageElement,
            imagen
        );

    } else {

        eliminarMetaSiVacio(
            ogImageElement
        );

    }


    /* =====================================================
       TWITTER / X
    ===================================================== */

    establecerContenidoMeta(
        twitterTitleElement,
        titulo
    );


    establecerContenidoMeta(
        twitterDescriptionElement,
        descripcion
    );


    if (
        imagen
    ) {

        establecerContenidoMeta(
            twitterImageElement,
            imagen
        );


        establecerContenidoMeta(
            twitterCardElement,
            "summary_large_image"
        );

    } else {

        eliminarMetaSiVacio(
            twitterImageElement
        );


        establecerContenidoMeta(
            twitterCardElement,
            "summary"
        );

    }


    /* =====================================================
       JSON-LD
    ===================================================== */

    actualizarDatosEstructurados(
        producto,
        productId,
        urlProducto,
        imagen,
        descripcion
    );

}


/* =========================================================
   JSON-LD PRODUCT
========================================================= */

function actualizarDatosEstructurados(
    producto,
    productId,
    urlProducto,
    imagen,
    descripcion
) {

    if (
        !structuredDataElement
    ) {

        return;

    }


    const datos =
        {

            "@context":
                "https://schema.org",

            "@type":
                "Product",

            "@id":
                `${urlProducto}#product`,

            "url":
                urlProducto,

            "name":
                textoSeguro(
                    producto.nombre,
                    "Producto Maderóh"
                ),

            "description":
                descripcion,

            "brand":
                {

                    "@type":
                        "Brand",

                    "name":
                        "Maderóh"

                },

            "sku":
                `MADEROH-${productId}`

        };


    if (
        producto.categoriaNombre ||
        producto.categoria
    ) {

        datos.category =
            producto.categoriaNombre ||
            producto.categoria;

    }


    if (
        imagen
    ) {

        datos.image =
            [
                imagen
            ];

    }


    /* =====================================================
       DIMENSIONES
    ===================================================== */

    if (
        producto.alturaCm
    ) {

        datos.height =
            {

                "@type":
                    "QuantitativeValue",

                "value":
                    Number(
                        producto.alturaCm
                    ),

                "unitCode":
                    "CMT"

            };

    }


    if (
        producto.profundidadCm
    ) {

        /*
         * La API conserva depth_cm.
         * Visualmente Maderóh lo muestra como Largo.
         */

        datos.depth =
            {

                "@type":
                    "QuantitativeValue",

                "value":
                    Number(
                        producto.profundidadCm
                    ),

                "unitCode":
                    "CMT"

            };

    }


    if (
        producto.anchoCm
    ) {

        datos.width =
            {

                "@type":
                    "QuantitativeValue",

                "value":
                    Number(
                        producto.anchoCm
                    ),

                "unitCode":
                    "CMT"

            };

    }


    /* =====================================================
       OFERTA / PRECIO
    ===================================================== */

    const precio =
        Number(
            producto.precio
        );


    if (
        Number.isFinite(
            precio
        ) &&
        precio >= 0
    ) {

        datos.offers =
            {

                "@type":
                    "Offer",

                "url":
                    urlProducto,

                "priceCurrency":
                    producto.moneda ||
                    "MXN",

                "price":
                    String(
                        precio
                    ),

                "availability":
                    "https://schema.org/InStock"

            };

    }


    structuredDataElement.textContent =
        JSON.stringify(
            datos
        );

}


/* =========================================================
   META HELPERS
========================================================= */

function establecerContenidoMeta(
    elemento,
    contenido
) {

    if (
        !elemento
    ) {

        return;

    }


    elemento.setAttribute(
        "content",
        String(
            contenido ||
            ""
        )
    );

}


/* =========================================================
   ELIMINAR META VACÍA
========================================================= */

function eliminarMetaSiVacio(
    elemento
) {

    if (
        !elemento
    ) {

        return;

    }


    elemento.removeAttribute(
        "content"
    );

}


/* =========================================================
   URL DE IMAGEN PARA SEO
========================================================= */

function obtenerURLSEOImagen(
    url
) {

    if (
        !url
    ) {

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
   MOSTRAR PRODUCTO
========================================================= */

function mostrarProducto() {

    if (
        loadingElement
    ) {

        loadingElement.hidden =
            true;

    }


    if (
        errorElement
    ) {

        errorElement.hidden =
            true;

    }


    if (
        productElement
    ) {

        productElement.hidden =
            false;

    }

}


/* =========================================================
   MOSTRAR ERROR
========================================================= */

function mostrarError() {

    if (
        loadingElement
    ) {

        loadingElement.hidden =
            true;

    }


    if (
        productElement
    ) {

        productElement.hidden =
            true;

    }


    if (
        errorElement
    ) {

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
        !Number.isFinite(
            numero
        )
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
        )
        .format(
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
        Number.isFinite(
            numero
        )
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
        )
        .trim();


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
            .trim()
        +
        "…"
    );

}