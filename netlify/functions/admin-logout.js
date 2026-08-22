"use strict";


const COOKIE_NAME =
    "maderoh_admin_session";


function response(
    statusCode,
    body,
    headers = {}
) {

    return {
        statusCode,

        headers: {
            "Content-Type":
                "application/json; charset=utf-8",

            "Cache-Control":
                "no-store",

            ...headers
        },

        body:
            JSON.stringify(body)
    };

}


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


    const expiredCookie = [
        `${COOKIE_NAME}=`,
        "Path=/",
        "Max-Age=0",
        "HttpOnly",
        "Secure",
        "SameSite=Strict"
    ].join("; ");


    return response(
        200,
        {
            success: true
        },
        {
            "Set-Cookie":
                expiredCookie
        }
    );

};