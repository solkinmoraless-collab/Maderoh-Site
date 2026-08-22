"use strict";


exports.handler =
async function (event) {

    if (event.httpMethod !== "POST") {

        return respuesta(
            405,
            {
                error:
                    "Método no permitido"
            }
        );

    }


    if (
        event.body &&
        event.body.length > 10000
    ) {

        return respuesta(
            413,
            {
                error:
                    "Solicitud demasiado grande"
            }
        );

    }


    try {

        const body =
            JSON.parse(
                event.body || "{}"
            );


        const producto =
            limpiarTexto(
                body.producto,
                100
            );


        const acabado =
            limpiarTexto(
                body.acabado,
                100
            );


        const estructura =
            limpiarTexto(
                body.estructura,
                100
            );


        const comentarios =
            limpiarTexto(
                body.comentarios,
                500
            );


        const cantidad =
            Number(body.cantidad);


        if (!producto) {

            return respuesta(
                400,
                {
                    error:
                        "Producto requerido"
                }
            );

        }


        if (
            !Number.isInteger(cantidad) ||
            cantidad < 1 ||
            cantidad > 100
        ) {

            return respuesta(
                400,
                {
                    error:
                        "Cantidad inválida"
                }
            );

        }


        const cotizacion = {

            producto,

            acabado,

            estructura,

            comentarios,

            cantidad

        };


        /*
        Posteriormente:

        PostgreSQL
        ↓
        guardar cotización
        ↓
        CRM / ERP

        Nunca regresaremos
        información privada.
        */


        return respuesta(
            200,
            {
                ok: true
            }
        );


    } catch {

        return respuesta(
            400,
            {
                error:
                    "Solicitud inválida"
            }
        );

    }

};


function limpiarTexto(
    valor,
    longitud
) {

    if (
        typeof valor !== "string"
    ) {

        return "";

    }


    return valor
        .trim()
        .slice(0, longitud);

}


function respuesta(
    statusCode,
    contenido
) {

    return {

        statusCode,

        headers: {

            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control":
                "no-store"

        },

        body:
            JSON.stringify(
                contenido
            )

    };

}