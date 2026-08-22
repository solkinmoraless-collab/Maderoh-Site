"use strict";

const crypto = require("crypto");

const {
    getSupabaseAdmin
} = require("./db");


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const COOKIE_NAME =
    "maderoh_admin_session";

const SESSION_DURATION_SECONDS =
    60 * 60 * 8;


/* =========================================================
   RESPUESTA
========================================================= */

function response(
    statusCode,
    body,
    extraHeaders = {}
) {

    return {
        statusCode,

        headers: {
            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control":
                "no-store",

            ...extraHeaders
        },

        body:
            JSON.stringify(body)
    };

}


/* =========================================================
   COOKIE
========================================================= */

function createSessionToken(payload) {

    const secret =
        process.env.ADMIN_SESSION_SECRET;

    if (!secret) {

        throw new Error(
            "ADMIN_SESSION_SECRET no está configurada."
        );

    }

    const encodedPayload =
        Buffer
            .from(
                JSON.stringify(payload)
            )
            .toString("base64url");

    const signature =
        crypto
            .createHmac(
                "sha256",
                secret
            )
            .update(encodedPayload)
            .digest("base64url");

    return (
        encodedPayload +
        "." +
        signature
    );

}


/* =========================================================
   LOGIN
========================================================= */

exports.handler =
async function handler(event) {

    if (event.httpMethod !== "POST") {

        return response(
            405,
            {
                error:
                    "Método no permitido."
            },
            {
                Allow: "POST"
            }
        );

    }

    try {

        const {
            email,
            password
        } =
            JSON.parse(
                event.body || "{}"
            );

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {

            return response(
                400,
                {
                    error:
                        "Correo y contraseña son obligatorios."
                }
            );

        }


        /* =============================================
           AUTENTICACIÓN SUPABASE
        ============================================= */

        const supabaseUrl =
            process.env.SUPABASE_URL;

        const publishableKey =
            process.env
                .SUPABASE_PUBLISHABLE_KEY;

        if (
            !supabaseUrl ||
            !publishableKey
        ) {

            console.error(
                "Faltan variables de Supabase."
            );

            return response(
                500,
                {
                    error:
                        "Error de configuración del servidor."
                }
            );

        }


        const authResponse =
            await fetch(
                `${supabaseUrl}/auth/v1/token?grant_type=password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "apikey":
                            publishableKey
                    },

                    body:
                        JSON.stringify({
                            email:
                                email
                                    .trim()
                                    .toLowerCase(),

                            password
                        })
                }
            );


        const authData =
            await authResponse.json();


        if (
            !authResponse.ok ||
            !authData.user
        ) {

            return response(
                401,
                {
                    error:
                        "Correo o contraseña incorrectos."
                }
            );

        }


        /* =============================================
           VERIFICAR ADMINISTRADOR
        ============================================= */

        const supabase =
            getSupabaseAdmin();

        const {
            data: admin,
            error: adminError
        } =
            await supabase
                .from("admin_users")
                .select(
                    "id, email, role, active"
                )
                .eq(
                    "id",
                    authData.user.id
                )
                .maybeSingle();


        if (adminError) {

            console.error(
                "Error consultando admin_users:",
                adminError
            );

            return response(
                500,
                {
                    error:
                        "No fue posible verificar permisos."
                }
            );

        }


        if (
            !admin ||
            admin.active !== true
        ) {

            return response(
                403,
                {
                    error:
                        "Esta cuenta no tiene acceso administrativo."
                }
            );

        }


        const role =
            String(
                admin.role || ""
            )
            .toUpperCase();


        if (
            role !== "OWNER" &&
            role !== "ADMIN"
        ) {

            return response(
                403,
                {
                    error:
                        "La cuenta no tiene un rol administrativo válido."
                }
            );

        }


        /* =============================================
           CREAR SESIÓN
        ============================================= */

        const now =
            Math.floor(
                Date.now() / 1000
            );

        const token =
            createSessionToken({
                sub:
                    authData.user.id,

                email:
                    admin.email ||
                    authData.user.email,

                role,

                iat:
                    now,

                exp:
                    now +
                    SESSION_DURATION_SECONDS
            });


        const cookie = [
            `${COOKIE_NAME}=${token}`,
            "Path=/",
            `Max-Age=${SESSION_DURATION_SECONDS}`,
            "HttpOnly",
            "Secure",
            "SameSite=Strict"
        ].join("; ");


        return response(
            200,
            {
                success: true,

                user: {
                    id:
                        authData.user.id,

                    email:
                        admin.email ||
                        authData.user.email,

                    role
                }
            },
            {
                "Set-Cookie":
                    cookie
            }
        );


    } catch (error) {

        console.error(
            "Maderóh admin login:",
            error
        );

        return response(
            500,
            {
                error:
                    "No fue posible iniciar sesión."
            }
        );

    }

};