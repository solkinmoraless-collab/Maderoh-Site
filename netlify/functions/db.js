"use strict";

/* =========================================================
   MADERÓH - CONEXIÓN PRIVADA A SUPABASE
========================================================= */

const {
    createClient
} = require("@supabase/supabase-js");


/* =========================================================
   VARIABLES DE ENTORNO
========================================================= */

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SECRET_KEY =
    process.env.SUPABASE_SECRET_KEY;


/* =========================================================
   VALIDACIÓN
========================================================= */

function validarConfiguracion() {

    if (!SUPABASE_URL) {

        throw new Error(
            "SUPABASE_URL no está configurada."
        );

    }

    if (!SUPABASE_SECRET_KEY) {

        throw new Error(
            "SUPABASE_SECRET_KEY no está configurada."
        );

    }

}


/* =========================================================
   CLIENTE SUPABASE
========================================================= */

let clienteSupabase = null;


function obtenerSupabase() {

    validarConfiguracion();


    if (clienteSupabase) {

        return clienteSupabase;

    }


    clienteSupabase =
        createClient(
            SUPABASE_URL,
            SUPABASE_SECRET_KEY,
            {

                auth: {

                    persistSession:
                        false,

                    autoRefreshToken:
                        false,

                    detectSessionInUrl:
                        false

                }

            }
        );


    return clienteSupabase;

}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {

    obtenerSupabase

};