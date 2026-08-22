"use strict";

const crypto = require("crypto");

const {
    getSupabaseAdmin
} = require("./db");


const COOKIE_NAME =
    "maderoh_admin_session";


function response(
    statusCode,
    body
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
            JSON.stringify(body)
    };

}


function getCookie(
    cookieHeader,
    name
) {

    if (!cookieHeader) {
        return null;
    }

    const cookies =
        cookieHeader.split(";");

    for (const cookie of cookies) {

        const separator =
            cookie.indexOf("=");

        if (separator === -1) {
            continue;
        }

        const key =
            cookie
                .slice(0, separator)
                .trim();

        const value =
            cookie
                .slice(separator + 1)
                .trim();

        if (key === name) {
            return value;
        }

    }

    return null;

}


function verifyToken(token) {

    const secret =
        process.env.ADMIN_SESSION_SECRET;

    if (
        !secret ||
        !token
    ) {

        return null;

    }

    const parts =
        token.split(".");

    if (parts.length !== 2) {
        return null;
    }

    const [
        encodedPayload,
        suppliedSignature
    ] = parts;


    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                secret
            )
            .update(encodedPayload)
            .digest("base64url");


    const suppliedBuffer =
        Buffer.from(
            suppliedSignature
        );

    const expectedBuffer =
        Buffer.from(
            expectedSignature
        );


    if (
        suppliedBuffer.length !==
        expectedBuffer.length
    ) {

        return null;

    }


    if (
        !crypto.timingSafeEqual(
            suppliedBuffer,
            expectedBuffer
        )
    ) {

        return null;

    }


    let payload;

    try {

        payload =
            JSON.parse(
                Buffer
                    .from(
                        encodedPayload,
                        "base64url"
                    )
                    .toString("utf8")
            );

    } catch {

        return null;

    }


    const now =
        Math.floor(
            Date.now() / 1000
        );


    if (
        !payload.exp ||
        payload.exp <= now
    ) {

        return null;

    }


    return payload;

}


exports.handler =
async function handler(event) {

    if (event.httpMethod !== "GET") {

        return response(
            405,
            {
                authenticated: false
            }
        );

    }

    try {

        const cookieHeader =
            event.headers.cookie ||
            event.headers.Cookie ||
            "";

        const token =
            getCookie(
                cookieHeader,
                COOKIE_NAME
            );

        const payload =
            verifyToken(token);


        if (!payload) {

            return response(
                401,
                {
                    authenticated: false
                }
            );

        }


        /*
         * Aunque la cookie sea válida,
         * volvemos a comprobar admin_users.
         *
         * Así podemos quitarle acceso a un
         * administrador desde Supabase sin
         * esperar ocho horas.
         */

        const supabase =
            getSupabaseAdmin();


        const {
            data: admin,
            error
        } =
            await supabase
                .from("admin_users")
                .select(
                    "id, email, role, active"
                )
                .eq(
                    "id",
                    payload.sub
                )
                .maybeSingle();


        if (
            error ||
            !admin ||
            admin.active !== true
        ) {

            return response(
                401,
                {
                    authenticated: false
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
                    authenticated: false
                }
            );

        }


        return response(
            200,
            {
                authenticated: true,

                user: {
                    id:
                        admin.id,

                    email:
                        admin.email,

                    role
                }
            }
        );


    } catch (error) {

        console.error(
            "Maderóh admin session:",
            error
        );

        return response(
            500,
            {
                authenticated: false
            }
        );

    }

};