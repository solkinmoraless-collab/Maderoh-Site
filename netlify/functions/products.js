"use strict";


/* =========================================================
   MADERÓH - PRODUCTOS PÚBLICOS
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
async function (event) {

    /*
    El catálogo público
    solamente permite GET.
    */

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

        const supabase =
            obtenerSupabase();


        const {
            data,
            error
        } =
        await supabase

            .from(
                "products"
            )

            .select(
                `
                id,
                name,
                slug,
                category,
                category_name,
                description,
                price,
                currency,
                measurements,
                width_cm,
                depth_cm,
                height_cm,
                finish,
                main_image_url,
                featured,
                active
                `
            )

            .eq(
                "active",
                true
            )

            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            );


        if (error) {

            console.error(
                "Supabase products:",
                error.message
            );


            throw new Error(
                "Error consultando productos."
            );

        }


        /*
        Transformamos nombres SQL
        al formato esperado por frontend.
        */

        const productos =
            data.map(
                producto => ({

                    id:
                        producto.id,

                    nombre:
                        producto.name,

                    slug:
                        producto.slug,

                    categoria:
                        producto.category,

                    categoriaNombre:
                        producto.category_name,

                    descripcion:
                        producto.description,

                    precio:
                        producto.price === null
                            ? null
                            : Number(
                                producto.price
                            ),

                    moneda:
                        producto.currency,

                    medidas:
                        producto.measurements,

                    anchoCm:
                        producto.width_cm,

                    profundidadCm:
                        producto.depth_cm,

                    alturaCm:
                        producto.height_cm,

                    acabado:
                        producto.finish,

                    imagen:
                        producto.main_image_url,

                    destacado:
                        producto.featured,

                    activo:
                        producto.active

                })
            );


        return responder(
            200,
            {
                productos
            },
            {
                "Cache-Control":
                    "public, max-age=60"
            }
        );


    } catch (error) {

        console.error(
            "Maderóh products error:",
            error.message
        );


        return responder(
            500,
            {
                error:
                    "No fue posible cargar el catálogo."
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

            /*
             * Las funciones son APIs.
             * Los motores de búsqueda no deben
             * indexar directamente sus respuestas JSON.
             */
            "X-Robots-Tag":
                "noindex, nofollow",

            ...headersExtra

        },

        body:
            JSON.stringify(
                contenido
            )

    };

}