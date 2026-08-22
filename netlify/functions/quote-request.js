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


const MAX_PRODUCT_LENGTH =
    160;


/*
 * Esta versión debe coincidir con la utilizada
 * por frontend/js/configurador.js.
 *
 * Cuando publiquemos el Aviso de Privacidad
 * definitivo cambiaremos ambos valores.
 */

const CURRENT_PRIVACY_VERSION =
    "2026-08-preliminar";


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


        /* =================================================
           FECHA DE CONSENTIMIENTO

           Se genera en servidor.
           No confiamos en una fecha enviada
           desde el navegador.
        ================================================= */

        const fechaConsentimiento =
            new Date()
                .toISOString();


        /* =================================================
           SUPABASE
        ================================================= */

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

                        /* =================================
                           PROYECTO
                        ================================= */

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


                        /* =================================
                           NEGOCIO
                        ================================= */

                        business_type:
                            datos.tipoProyecto ===
                            "Negocio"

                                ? datos.tipoNegocio

                                : null,

                        space_size_m2:
                            datos.tipoProyecto ===
                            "Negocio"

                                ? datos.tamanoEspacio

                                : null,


                        /* =================================
                           COMENTARIOS
                        ================================= */

                        comments:
                            datos.comentarios,


                        /* =================================
                           CLIENTE
                        ================================= */

                        customer_name:
                            datos.nombre,

                        customer_phone:
                            datos.telefono,

                        customer_email:
                            datos.correo,

                        customer_location:
                            datos.ubicacion,


                        /* =================================
                           PRIVACIDAD
                        ================================= */

                        privacy_accepted:
                            true,

                        privacy_accepted_at:
                            fechaConsentimiento,

                        privacy_version:
                            CURRENT_PRIVACY_VERSION,

                        marketing_consent:
                            datos.marketingConsent ===
                            true,


                        /* =================================
                           SISTEMA
                        ================================= */

                        source:
                            "website",

                        status:
                            "new",

                        updated_at:
                            fechaConsentimiento

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
                    cotizacion.created_at,

                privacyVersion:
                    CURRENT_PRIVACY_VERSION

            },
            {

                "Cache-Control":
                    "no-store"

            }
        );


    } catch (error) {


        console.error(
            "Maderóh quote request error:",
            error
        );


        return responder(
            500,
            {
                ok:
                    false,

                error:
                    "No fue posible registrar la cotización."
            },
            {

                "Cache-Control":
                    "no-store"

            }
        );

    }

};


/* =========================================================
   NORMALIZAR SOLICITUD
========================================================= */

function normalizarSolicitud(
    body
) {

    return {


        /* =================================================
           PROYECTO
        ================================================= */

        tipoProyecto:
            limpiarTexto(
                body.tipoProyecto,
                40
            ),

        producto:
            limpiarTexto(
                body.producto,
                MAX_PRODUCT_LENGTH
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


        /* =================================================
           NEGOCIO
        ================================================= */

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


        /* =================================================
           COMENTARIOS
        ================================================= */

        comentarios:
            limpiarTexto(
                body.comentarios,
                MAX_COMMENTS_LENGTH
            ),


        /* =================================================
           CLIENTE
        ================================================= */

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
            ),


        /* =================================================
           PRIVACIDAD
        ================================================= */

        privacyAccepted:
            body.privacyAccepted ===
            true,

        privacyVersion:
            limpiarTexto(
                body.privacyVersion,
                80
            ),

        marketingConsent:
            body.marketingConsent ===
            true

    };

}


/* =========================================================
   VALIDAR SOLICITUD
========================================================= */

function validarSolicitud(
    datos
) {


    /* =====================================================
       TIPO DE PROYECTO
    ===================================================== */

    if (
        datos.tipoProyecto !== "Hogar" &&
        datos.tipoProyecto !== "Negocio"
    ) {

        return "Tipo de proyecto inválido.";

    }


    /* =====================================================
       PRODUCTO
    ===================================================== */

    if (
        !datos.producto
    ) {

        return "Selecciona el tipo de mobiliario.";

    }


    /* =====================================================
       CANTIDAD
    ===================================================== */

    if (
        !datos.cantidad ||
        datos.cantidad < 1 ||
        datos.cantidad > 500
    ) {

        return "Cantidad inválida.";

    }


    /* =====================================================
       NOMBRE
    ===================================================== */

    if (
        !datos.nombre
    ) {

        return "Ingresa tu nombre.";

    }


    /* =====================================================
       TELÉFONO
    ===================================================== */

    if (
        !datos.telefono
    ) {

        return "Ingresa un teléfono de contacto.";

    }


    if (
        !validarTelefono(
            datos.telefono
        )
    ) {

        return "El teléfono proporcionado no es válido.";

    }


    /* =====================================================
       CORREO
    ===================================================== */

    if (
        datos.correo &&
        !validarCorreo(
            datos.correo
        )
    ) {

        return "El correo electrónico no es válido.";

    }


    /* =====================================================
       PRIVACIDAD
    ===================================================== */

    if (
        datos.privacyAccepted !==
        true
    ) {

        return "Debes aceptar el Aviso de Privacidad para registrar tu solicitud.";

    }


    /*
     * También verificamos que el navegador
     * haya enviado la versión esperada.
     *
     * El servidor sigue utilizando su propia
     * constante al guardar la evidencia.
     */

    if (
        datos.privacyVersion !==
        CURRENT_PRIVACY_VERSION
    ) {

        return "La versión del Aviso de Privacidad no es válida. Actualiza la página e inténtalo nuevamente.";

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
   LIMPIAR TEXTO
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
   LIMPIAR NÚMERO
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
   LIMPIAR ENTERO
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
   VALIDAR CORREO
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
   VALIDAR TELÉFONO
========================================================= */

function validarTelefono(
    telefono
) {

    const numeros =
        String(
            telefono ||
            ""
        )
        .replace(
            /\D/g,
            ""
        );


    return (
        numeros.length >= 8 &&
        numeros.length <= 15
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

            "Cache-Control":
                "no-store",

            ...headersExtra

        },

        body:
            JSON.stringify(
                contenido
            )

    };

}