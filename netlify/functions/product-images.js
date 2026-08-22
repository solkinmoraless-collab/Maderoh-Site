"use strict";


/* =========================================================
   MADERÓH
   GALERÍA PÚBLICA DE PRODUCTOS
========================================================= */


const {
    obtenerSupabase
} = require(
    "./db"
);


/* =========================================================
   HANDLER
========================================================= */

exports.handler =
async function handler(event) {


    /* =====================================================
       SOLO GET
    ===================================================== */

    if (
        event.httpMethod !==
        "GET"
    ) {

        return responder(
            405,
            {
                error:
                    "Método no permitido."
            },
            {
                Allow:
                    "GET"
            }
        );

    }


    try {


        /* =================================================
           PRODUCT ID
        ================================================= */

        const parametros =
            event.queryStringParameters ||
            {};


        const productId =
            Number(
                parametros.productId
            );


        if (
            !Number.isInteger(productId) ||
            productId <= 0
        ) {

            return responder(
                400,
                {
                    error:
                        "Producto inválido."
                }
            );

        }


        const supabase =
            obtenerSupabase();


        /* =================================================
           VERIFICAR PRODUCTO ACTIVO
        ================================================= */

        const {
            data: producto,
            error: productoError
        } =
            await supabase

                .from(
                    "products"
                )

                .select(
                    `
                    id,
                    active,
                    main_image_url
                    `
                )

                .eq(
                    "id",
                    productId
                )

                .eq(
                    "active",
                    true
                )

                .maybeSingle();


        if (
            productoError
        ) {

            console.error(
                "Maderóh product-images product:",
                productoError.message
            );


            throw new Error(
                "Error consultando producto."
            );

        }


        if (!producto) {

            return responder(
                404,
                {
                    error:
                        "Producto no encontrado."
                }
            );

        }


        /* =================================================
           OBTENER GALERÍA
        ================================================= */

        const {
            data: imagenes,
            error: imagenesError
        } =
            await supabase

                .from(
                    "product_images"
                )

                .select(
                    `
                    id,
                    image_url,
                    alt_text,
                    position
                    `
                )

                .eq(
                    "product_id",
                    productId
                )

                .order(
                    "position",
                    {
                        ascending:
                            true
                    }
                )

                .order(
                    "created_at",
                    {
                        ascending:
                            true
                    }
                );


        if (
            imagenesError
        ) {

            console.error(
                "Maderóh product-images gallery:",
                imagenesError.message
            );


            throw new Error(
                "Error consultando galería."
            );

        }


        /* =================================================
           TRANSFORMAR
        ================================================= */

        const galeria =
            (imagenes || [])
                .map(
                    imagen => ({

                        id:
                            imagen.id,

                        url:
                            imagen.image_url,

                        alt:
                            imagen.alt_text ||
                            "Producto Maderóh",

                        posicion:
                            imagen.position,

                        principal:
                            imagen.image_url ===
                            producto.main_image_url

                    })
                );


        /* =================================================
           RESPUESTA
        ================================================= */

        return responder(
            200,
            {

                productId,

                imagenPrincipal:
                    producto.main_image_url ||
                    null,

                imagenes:
                    galeria

            },
            {

                "Cache-Control":
                    "public, max-age=60"

            }
        );


    } catch (error) {


        console.error(
            "Maderóh product images error:",
            error.message
        );


        return responder(
            500,
            {
                error:
                    "No fue posible cargar las imágenes."
            }
        );

    }

};


/* =========================================================
   RESPUESTA
========================================================= */

function responder(
    statusCode,
    contenido,
    headersExtra = {}
) {

    return {

        statusCode,

        headers: {

            "Content-Type":
                "application/json; charset=utf-8",

            "X-Content-Type-Options":
                "nosniff",

            ...headersExtra

        },

        body:
            JSON.stringify(
                contenido
            )

    };

}