"use strict";


/* =========================================================
   MADERÓH
   SOLICITUD PÚBLICA DE COTIZACIÓN
========================================================= */


const {
    obtenerSupabase
} = require(
    "./db"
);


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const MAX_COMMENTS_LENGTH =
    700;


const MAX_NAME_LENGTH =
    120;


const MAX_PHONE_LENGTH =
    30;


const MAX_EMAIL_LENGTH =
    180;


const MAX_LOCATION_LENGTH =
    180;


/* =========================================================
   HANDLER
========================================================= */

exports.handler =
async function handler(event) {


    /* =====================================================
       SOLO POST
    ===================================================== */

    if (
        event.httpMethod !==
        "POST"
    ) {

        return responder(
            405,
            {
                ok:
                    false,

                error:
                    "Método no permitido."
            },
            {
                Allow:
                    "POST"
            }
        );

    }


    try {


        /* =================================================
           PARSEAR BODY
        ================================================= */

        let body;


        try {

            body =
                JSON.parse(
                    event.body ||
                    "{}"
                );

        } catch {

            return responder(
                400,
                {
                    ok:
                        false,

                    error:
                        "Solicitud inválida."
                }
            );

        }


        /* =================================================
           NORMALIZAR DATOS
        ================================================= */

        const datos =
            normalizarSolicitud(
                body
            );


        /* =================================================
           VALIDAR
        ================================================= */

        const errorValidacion =
            validarSolicitud(
                datos
            );


        if (
            errorValidacion
        ) {

            return responder(
                400,
                {
                    ok:
                        false,

                    error:
                        errorValidacion
                }
            );

        }


        const supabase =
            obtenerSupabase();


        /* =================================================
           INSERTAR COTIZACIÓN
        ================================================= */

        const {
            data: cotizacion,
            error: insertError
        } =
            await supabase

                .from(
                    "quotes"
                )

                .insert(
                    {

                        project_type:
                            datos.tipoProyecto,

                        product:
                            datos.producto,

                        width_cm:
                            datos.ancho,

                        depth_cm:
                            datos.profundidad,

                        height_cm:
                            datos.altura,

                        finish:
                            datos.acabado,

                        structure_color:
                            datos.estructura,

                        quantity:
                            datos.cantidad,

                        business_type:
                            datos.tipoNegocio,

                        space_size_m2:
                            datos.tamanoEspacio,

                        comments:
                            datos.comentarios,

                        customer_name:
                            datos.nombre,

                        customer_phone:
                            datos.telefono,

                        customer_email:
                            datos.correo,

                        customer_location:
                            datos.ubicacion,

                        source:
                            "website",

                        status:
                            "new"

                    }
                )

                .select(
                    `
                    id,
                    created_at
                    `
                )

                .single();


        if (
            insertError ||
            !cotizacion
        ) {

            console.error(
                "Maderóh quote insert:",
                insertError
                    ? insertError.message
                    : "Sin datos"
            );


            throw new Error(
                "No fue posible crear la cotización."
            );

        }


        /* =================================================
           GENERAR FOLIO
        ================================================= */

        const folio =
            generarFolio(
                cotizacion.id
            );


        /* =================================================
           GUARDAR FOLIO
        ================================================= */

        const {
            error: folioError
        } =
            await supabase

                .from(
                    "quotes"
                )

                .update(
                    {

                        folio,

                        updated_at:
                            new Date()
                                .toISOString()

                    }
                )

                .eq(
                    "id",
                    cotizacion.id
                );


        if (
            folioError
        ) {

            console.error(
                "Maderóh quote folio:",
                folioError.message
            );


            throw new Error(
                "No fue posible asignar el folio."
            );

        }


        /* =================================================
           RESPUESTA
        ================================================= */

        return responder(
            201,
            {

                ok:
                    true,

                id:
                    cotizacion.id,

                folio,

                createdAt:
                    cotizacion.created_at

            },
            {

                "Cache-Control":
                    "no-store"

            }
        );


    } catch (error) {


        console.error(
            "Maderóh quote request error:",
            error.message
        );


        return responder(
            500,
            {
                ok:
                    false,

                error:
                    "No fue posible registrar la cotización."
            }
        );

    }

};


/* =========================================================
   NORMALIZAR
========================================================= */

function normalizarSolicitud(
    body
) {

    return {

        tipoProyecto:
            limpiarTexto(
                body.tipoProyecto,
                40
            ),

        producto:
            limpiarTexto(
                body.producto,
                160
            ),

        ancho:
            limpiarNumero(
                body.ancho,
                1,
                2000
            ),

        profundidad:
            limpiarNumero(
                body.profundidad,
                1,
                2000
            ),

        altura:
            limpiarNumero(
                body.altura,
                1,
                2000
            ),

        acabado:
            limpiarTexto(
                body.acabado,
                100
            ),

        estructura:
            limpiarTexto(
                body.estructura,
                100
            ),

        cantidad:
            limpiarEntero(
                body.cantidad,
                1,
                500
            ),

        tipoNegocio:
            limpiarTexto(
                body.tipoNegocio,
                100
            ),

        tamanoEspacio:
            limpiarNumero(
                body.tamanoEspacio,
                1,
                10000
            ),

        comentarios:
            limpiarTexto(
                body.comentarios,
                MAX_COMMENTS_LENGTH
            ),

        nombre:
            limpiarTexto(
                body.nombre,
                MAX_NAME_LENGTH
            ),

        telefono:
            limpiarTexto(
                body.telefono,
                MAX_PHONE_LENGTH
            ),

        correo:
            limpiarTexto(
                body.correo,
                MAX_EMAIL_LENGTH
            ),

        ubicacion:
            limpiarTexto(
                body.ubicacion,
                MAX_LOCATION_LENGTH
            )

    };

}


/* =========================================================
   VALIDAR
========================================================= */

function validarSolicitud(
    datos
) {

    if (
        datos.tipoProyecto !== "Hogar" &&
        datos.tipoProyecto !== "Negocio"
    ) {

        return "Tipo de proyecto inválido.";

    }


    if (
        !datos.producto
    ) {

        return "Selecciona el tipo de mobiliario.";

    }


    if (
        !datos.cantidad ||
        datos.cantidad < 1 ||
        datos.cantidad > 500
    ) {

        return "Cantidad inválida.";

    }


    if (
        !datos.nombre
    ) {

        return "Ingresa tu nombre.";

    }


    if (
        !datos.telefono
    ) {

        return "Ingresa un teléfono de contacto.";

    }


    if (
        datos.correo &&
        !validarCorreo(
            datos.correo
        )
    ) {

        return "El correo electrónico no es válido.";

    }


    return null;

}


/* =========================================================
   FOLIO
========================================================= */

function generarFolio(
    id
) {

    const numero =
        String(
            id
        )
        .padStart(
            6,
            "0"
        );


    return `MAD-COT-${numero}`;

}


/* =========================================================
   TEXTO
========================================================= */

function limpiarTexto(
    valor,
    maximo
) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return null;

    }


    const texto =
        String(
            valor
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .slice(
            0,
            maximo
        );


    return texto ||
        null;

}


/* =========================================================
   NÚMERO
========================================================= */

function limpiarNumero(
    valor,
    minimo,
    maximo
) {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {

        return null;

    }


    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(
            numero
        ) ||
        numero < minimo ||
        numero > maximo
    ) {

        return null;

    }


    return numero;

}


/* =========================================================
   ENTERO
========================================================= */

function limpiarEntero(
    valor,
    minimo,
    maximo
) {

    const numero =
        Number(
            valor
        );


    if (
        !Number.isInteger(
            numero
        ) ||
        numero < minimo ||
        numero > maximo
    ) {

        return null;

    }


    return numero;

}


/* =========================================================
   CORREO
========================================================= */

function validarCorreo(
    correo
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            correo
        );

}


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