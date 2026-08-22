"use strict";


/* =========================================================
   MADERÓH - ANALYTICS BACKEND
========================================================= */


const {
    obtenerSupabase
} = require(
    "./db"
);


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const CONFIG = {

    maxEventName:
        100,

    maxPage:
        200,

    maxReferrer:
        200,

    maxFields:
        20,

    maxString:
        120

};


/* =========================================================
   EVENTOS PERMITIDOS
========================================================= */

const EVENTOS_PERMITIDOS =
new Set([

    "page_view",

    "inicio_ver_productos",

    "inicio_personalizar",

    "inicio_negocio",

    "inicio_proyecto_personalizado",

    "categoria_escritorios",

    "categoria_mesas",

    "categoria_bancas",

    "categoria_almacenamiento",

    "categoria_entretenimiento",

    "categoria_recamara",

    "categoria_negocios",

    "categoria_personalizado",

    "categoria_catalogo",

    "busqueda_producto",

    "vista_producto",

    "producto_whatsapp",

    "producto_destacado_whatsapp",

    "productos_negocio",

    "productos_personalizar",

    "configuracion_whatsapp",

    "whatsapp_general",

    "whatsapp_inicio",

    "whatsapp_productos",

    "whatsapp_personaliza",

    "whatsapp_flotante",

    "carrusel_siguiente",

    "carrusel_anterior"

]);


/* =========================================================
   HANDLER
========================================================= */

exports.handler =
async function (event) {

    if (
        event.httpMethod !==
        "POST"
    ) {

        return responder(
            405,
            {
                error:
                    "Método no permitido."
            },
            {
                Allow:
                    "POST"
            }
        );

    }


    if (
        !event.body ||
        event.body.length >
        10000
    ) {

        return responder(
            400,
            {
                error:
                    "Solicitud inválida."
            }
        );

    }


    let cuerpo;


    try {

        cuerpo =
            JSON.parse(
                event.body
            );

    } catch {

        return responder(
            400,
            {
                error:
                    "JSON inválido."
            }
        );

    }


    const evento =
        validarEvento(
            cuerpo
        );


    if (!evento) {

        return responder(
            400,
            {
                error:
                    "Evento inválido."
            }
        );

    }


    try {

        const supabase =
            obtenerSupabase();


        const {
            error
        } =
        await supabase

            .from(
                "web_events"
            )

            .insert(
                {

                    event_name:
                        evento.eventName,

                    page:
                        evento.page,

                    referrer:
                        evento.referrer,

                    event_data:
                        evento.eventData

                }
            );


        if (error) {

            console.error(
                "Supabase analytics:",
                error.message
            );


            throw new Error(
                "No fue posible guardar analytics."
            );

        }


        return responder(
            202,
            {
                ok:
                    true
            }
        );


    } catch (error) {

        console.error(
            "Analytics error:",
            error.message
        );


        return responder(
            500,
            {
                error:
                    "No fue posible registrar el evento."
            }
        );

    }

};


/* =========================================================
   VALIDAR EVENTO
========================================================= */

function validarEvento(
    cuerpo
) {

    if (
        !cuerpo ||
        typeof cuerpo !==
        "object"
    ) {

        return null;

    }


    const eventName =
        limpiarTexto(
            cuerpo.eventName,
            CONFIG.maxEventName
        );


    if (
        !eventName ||
        !EVENTOS_PERMITIDOS.has(
            eventName
        )
    ) {

        return null;

    }


    return {

        eventName,

        page:
            limpiarTexto(
                cuerpo.page,
                CONFIG.maxPage
            ),

        referrer:
            limpiarTexto(
                cuerpo.referrer,
                CONFIG.maxReferrer
            ),

        eventData:
            limpiarDatosEvento(
                cuerpo.eventData
            )

    };

}


/* =========================================================
   LIMPIAR EVENT DATA
========================================================= */

function limpiarDatosEvento(
    datos
) {

    if (
        !datos ||
        typeof datos !==
        "object" ||
        Array.isArray(
            datos
        )
    ) {

        return {};

    }


    const resultado = {};


    Object.entries(
        datos
    )
    .slice(
        0,
        CONFIG.maxFields
    )
    .forEach(
        ([clave, valor]) => {

            const claveSegura =
                limpiarTexto(
                    clave,
                    60
                );


            if (
                !claveSegura ||
                campoBloqueado(
                    claveSegura
                )
            ) {

                return;

            }


            if (
                typeof valor ===
                "string"
            ) {

                resultado[
                    claveSegura
                ] =
                    limpiarTexto(
                        valor,
                        CONFIG.maxString
                    );

            }


            else if (
                typeof valor ===
                "number" &&
                Number.isFinite(
                    valor
                )
            ) {

                resultado[
                    claveSegura
                ] =
                    valor;

            }


            else if (
                typeof valor ===
                "boolean"
            ) {

                resultado[
                    claveSegura
                ] =
                    valor;

            }

        }
    );


    return resultado;

}


/* =========================================================
   CAMPOS BLOQUEADOS
========================================================= */

function campoBloqueado(
    clave
) {

    const bloqueados = [

        "password",
        "contraseña",

        "telefono",
        "teléfono",
        "phone",

        "email",
        "correo",

        "direccion",
        "dirección",
        "address",

        "rfc",
        "curp",

        "token",
        "secret",

        "mensaje",
        "message",

        "comentarios"

    ];


    const texto =
        clave.toLowerCase();


    return bloqueados.some(
        bloqueado =>
            texto.includes(
                bloqueado
            )
    );

}


/* =========================================================
   LIMPIAR TEXTO
========================================================= */

function limpiarTexto(
    valor,
    maximo
) {

    if (
        typeof valor !==
        "string"
    ) {

        return "";

    }


    return valor

        .replace(
            /[\u0000-\u001F\u007F]/g,
            ""
        )

        .trim()

        .slice(
            0,
            maximo
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