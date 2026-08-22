"use strict";


/* =========================================================
   MADERÓH - ANALYTICS FRONTEND
========================================================= */


/*
---------------------------------------------------------
OBJETIVO

Registrar únicamente eventos comerciales útiles.

NO guardamos aquí:
- contraseñas
- teléfonos
- mensajes completos
- direcciones
- datos fiscales
- información del .env
---------------------------------------------------------
*/


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const MADEROH_ANALYTICS = {

    endpoint:
        "/.netlify/functions/analytics",

    /*
    Evita enviar eventos repetidos
    demasiado rápido.
    */

    intervaloMinimoMs:
        0,

    maximoTexto:
        120

};


/* =========================================================
   ESTADO
========================================================= */

let ultimoEventoAnalytics = 0;


/* =========================================================
   INICIO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        registrarPagina();

        iniciarTrackingAutomatico();

    }
);


/* =========================================================
   FUNCIÓN GLOBAL

   Otros archivos pueden usar:

   window.registrarEvento(...)
========================================================= */

window.registrarEvento =
function (
    nombreEvento,
    datos = {}
) {

    enviarEvento(
        nombreEvento,
        datos
    );

};


/* =========================================================
   VISITA DE PÁGINA
========================================================= */

function registrarPagina() {

    enviarEvento(
        "page_view",
        {
            pagina:
                obtenerPaginaActual()
        }
    );

}


/* =========================================================
   TRACKING AUTOMÁTICO
========================================================= */

function iniciarTrackingAutomatico() {

    /*
    Cualquier elemento que tenga:

    data-track="evento"
    */

    document.addEventListener(
        "click",
        event => {

            const elemento =
                event.target.closest(
                    "[data-track]"
                );


            if (!elemento) {

                return;

            }


            const evento =
                sanitizarTexto(
                    elemento.dataset.track,
                    80
                );


            if (!evento) {

                return;

            }


            enviarEvento(
                evento,
                {
                    pagina:
                        obtenerPaginaActual()
                }
            );

        }
    );

}


/* =========================================================
   ENVIAR EVENTO
========================================================= */

async function enviarEvento(
    nombreEvento,
    datos = {}
) {

    const ahora =
        Date.now();


    /*
    Protección básica contra
    eventos disparados demasiado rápido.
    */

    if (
        ahora -
        ultimoEventoAnalytics <
        MADEROH_ANALYTICS.intervaloMinimoMs
    ) {

        return;

    }


    ultimoEventoAnalytics =
        ahora;


    const evento =
        sanitizarTexto(
            nombreEvento,
            100
        );


    if (!evento) {

        return;

    }


    const payload = {

        eventName:
            evento,

        page:
            obtenerPaginaActual(),

        referrer:
            obtenerReferrer(),

        eventData:
            sanitizarObjeto(
                datos
            )

    };


    /*
    LIVE SERVER

    No intentamos registrar en backend.
    Solo mostramos el evento en Console.
    */

    if (estamosEnDesarrolloLocal()) {

        console.debug(
            "Maderóh Analytics:",
            payload
        );

        return;

    }


    try {

        await fetch(
            MADEROH_ANALYTICS.endpoint,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"

                },

                body:
                    JSON.stringify(
                        payload
                    ),

                /*
                Analytics jamás debe
                bloquear navegación.
                */

                keepalive:
                    true

            }
        );


    } catch (error) {

        /*
        Un fallo de analytics
        jamás debe romper la web.
        */

        console.debug(
            "Analytics no disponible."
        );

    }

}


/* =========================================================
   SANITIZAR OBJETO
========================================================= */

function sanitizarObjeto(
    objeto
) {

    if (
        !objeto ||
        typeof objeto !==
        "object"
    ) {

        return {};

    }


    const resultado = {};


    /*
    Máximo 20 campos por evento.
    */

    Object.entries(
        objeto
    )
    .slice(
        0,
        20
    )
    .forEach(
        ([clave, valor]) => {

            const claveSegura =
                sanitizarTexto(
                    clave,
                    60
                );


            if (!claveSegura) {

                return;

            }


            /*
            Bloqueamos campos que
            accidentalmente puedan contener
            información sensible.
            */

            if (
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
                    sanitizarTexto(
                        valor,
                        MADEROH_ANALYTICS
                            .maximoTexto
                    );

            }


            else if (
                typeof valor ===
                "number"
            ) {

                if (
                    Number.isFinite(
                        valor
                    )
                ) {

                    resultado[
                        claveSegura
                    ] =
                        valor;

                }

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
   CAMPOS NO PERMITIDOS
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


    return bloqueados.some(
        palabra =>
            clave
                .toLowerCase()
                .includes(
                    palabra
                )
    );

}


/* =========================================================
   SANITIZAR TEXTO
========================================================= */

function sanitizarTexto(
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
   PÁGINA
========================================================= */

function obtenerPaginaActual() {

    return window
        .location
        .pathname
        .slice(
            0,
            200
        );

}


/* =========================================================
   REFERRER
========================================================= */

function obtenerReferrer() {

    if (
        !document.referrer
    ) {

        return "";

    }


    try {

        const url =
            new URL(
                document.referrer
            );


        /*
        Guardamos dominio,
        no toda la URL completa.
        */

        return url
            .hostname
            .slice(
                0,
                200
            );

    } catch {

        return "";

    }

}


/* =========================================================
   DESARROLLO LOCAL
========================================================= */

function estamosEnDesarrolloLocal() {

    return (

        window.location.hostname ===
        "127.0.0.1"

        ||

        window.location.hostname ===
        "localhost"

    );

}