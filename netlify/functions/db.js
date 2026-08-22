"use strict";


/* =========================================================
   MADERÓH
   CONEXIÓN PRIVADA A SUPABASE
========================================================= */


const {
    createClient
} = require(
    "@supabase/supabase-js"
);


/* =========================================================
   VARIABLES PRIVADAS
========================================================= */

const SUPABASE_URL =
    process.env.SUPABASE_URL;


const SUPABASE_SECRET_KEY =
    process.env.SUPABASE_SECRET_KEY;


/* =========================================================
   CLIENTE
========================================================= */

let supabaseAdmin = null;


/* =========================================================
   VALIDAR CONFIGURACIÓN
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
   CLIENTE ADMINISTRATIVO
========================================================= */

function getSupabaseAdmin() {

    validarConfiguracion();


    if (supabaseAdmin) {

        return supabaseAdmin;

    }


    supabaseAdmin =
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


    return supabaseAdmin;

}


/* =========================================================
   COMPATIBILIDAD

   products.js y analytics.js actualmente utilizan
   obtenerSupabase().
========================================================= */

function obtenerSupabase() {

    return getSupabaseAdmin();

}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {

    getSupabaseAdmin,

    obtenerSupabase

};