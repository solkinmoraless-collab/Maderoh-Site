"use strict";


/* =========================================================
   MADERÓH
   ADMINISTRACIÓN SEGURA DE PRODUCTOS
========================================================= */


const crypto =
    require("crypto");


const {
    getSupabaseAdmin
} = require("./db");


const COOKIE_NAME =
    "maderoh_admin_session";


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

            "X-Content-Type-Options":
                "nosniff",

            ...extraHeaders

        },

        body:
            JSON.stringify(body)

    };

}


/* =========================================================
   COOKIES
========================================================= */

function getCookie(
    cookieHeader,
    name
) {

    if (!cookieHeader) {

        return null;

    }


    const cookies =
        cookieHeader.split(";");


    for (
        const cookie
        of cookies
    ) {

        const index =
            cookie.indexOf("=");


        if (
            index === -1
        ) {

            continue;

        }


        const key =
            cookie
                .slice(
                    0,
                    index
                )
                .trim();


        const value =
            cookie
                .slice(
                    index + 1
                )
                .trim();


        if (
            key === name
        ) {

            return value;

        }

    }


    return null;

}


/* =========================================================
   VALIDAR TOKEN
========================================================= */

function verifyToken(
    token
) {

    const secret =
        process.env
            .ADMIN_SESSION_SECRET;


    if (
        !secret ||
        !token
    ) {

        return null;

    }


    const parts =
        token.split(".");


    if (
        parts.length !== 2
    ) {

        return null;

    }


    const [
        payloadEncoded,
        signature
    ] = parts;


    const expected =
        crypto
            .createHmac(
                "sha256",
                secret
            )
            .update(
                payloadEncoded
            )
            .digest(
                "base64url"
            );


    const signatureBuffer =
        Buffer.from(
            signature
        );


    const expectedBuffer =
        Buffer.from(
            expected
        );


    if (
        signatureBuffer.length !==
        expectedBuffer.length
    ) {

        return null;

    }


    if (
        !crypto.timingSafeEqual(
            signatureBuffer,
            expectedBuffer
        )
    ) {

        return null;

    }


    try {

        const payload =
            JSON.parse(
                Buffer
                    .from(
                        payloadEncoded,
                        "base64url"
                    )
                    .toString(
                        "utf8"
                    )
            );


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

    } catch {

        return null;

    }

}


/* =========================================================
   AUTORIZACIÓN
========================================================= */

async function getAuthorizedAdmin(
    event
) {

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
        verifyToken(
            token
        );


    if (!payload) {

        return null;

    }


    const supabase =
        getSupabaseAdmin();


    const {
        data,
        error
    } =
        await supabase

            .from(
                "admin_users"
            )

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
        !data ||
        data.active !== true
    ) {

        return null;

    }


    const role =
        String(
            data.role || ""
        )
        .toUpperCase();


    if (
        role !== "OWNER" &&
        role !== "ADMIN"
    ) {

        return null;

    }


    return {

        ...data,

        role

    };

}


/* =========================================================
   LIMPIEZA
========================================================= */

function cleanText(
    value,
    maxLength
) {

    if (
        typeof value !==
        "string"
    ) {

        return "";

    }


    return value

        .replace(
            /[\u0000-\u001F\u007F]/g,
            ""
        )

        .trim()

        .slice(
            0,
            maxLength
        );

}


function cleanNumber(
    value,
    min,
    max
) {

    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {

        return null;

    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number) ||
        number < min ||
        number > max
    ) {

        return null;

    }


    return number;

}


function slugify(
    text
) {

    return String(
        text || ""
    )

        .normalize(
            "NFD"
        )

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .replace(
            /[^a-z0-9]+/g,
            "-"
        )

        .replace(
            /^-+|-+$/g,
            ""
        )

        .slice(
            0,
            120
        );

}


/* =========================================================
   VALIDAR PRODUCTO
========================================================= */

function validateProduct(
    body
) {

    const name =
        cleanText(
            body.name,
            120
        );


    const category =
        cleanText(
            body.category,
            60
        );


    const categoryName =
        cleanText(
            body.categoryName,
            80
        );


    const description =
        cleanText(
            body.description,
            500
        );


    const measurements =
        cleanText(
            body.measurements,
            150
        );


    const finish =
        cleanText(
            body.finish,
            150
        );


    const price =
        cleanNumber(
            body.price,
            0,
            10000000
        );


    if (
        !name ||
        !category ||
        !categoryName
    ) {

        return null;

    }


    return {

        name,

        category,

        category_name:
            categoryName,

        description,

        price,

        currency:
            "MXN",

        measurements,

        width_cm:
            cleanNumber(
                body.widthCm,
                0,
                10000
            ),

        depth_cm:
            cleanNumber(
                body.depthCm,
                0,
                10000
            ),

        height_cm:
            cleanNumber(
                body.heightCm,
                0,
                10000
            ),

        finish,

        featured:
            body.featured === true,

        active:
            body.active !== false

    };

}


/* =========================================================
   AUDITORÍA
========================================================= */

async function audit(
    supabase,
    admin,
    action,
    entityId,
    oldData,
    newData
) {

    const {
        error
    } =
        await supabase

            .from(
                "admin_audit_log"
            )

            .insert(
                {

                    admin_user_id:
                        admin.id,

                    action,

                    entity_type:
                        "product",

                    entity_id:
                        entityId,

                    old_data:
                        oldData || null,

                    new_data:
                        newData || null

                }
            );


    if (error) {

        console.error(
            "Audit error:",
            error.message
        );

    }

}


/* =========================================================
   GET
========================================================= */

async function listProducts(
    supabase
) {

    const {
        data,
        error
    } =
        await supabase

            .from(
                "products"
            )

            .select(
                `
                id,
                name,
                slug,
                category,
                category_name,
                description,
                price,
                currency,
                measurements,
                width_cm,
                depth_cm,
                height_cm,
                finish,
                main_image_url,
                featured,
                active,
                created_at,
                updated_at
                `
            )

            .order(
                "created_at",
                {
                    ascending:
                        false
                }
            );


    if (error) {

        throw error;

    }


    return data || [];

}


/* =========================================================
   POST
========================================================= */

async function createProduct(
    supabase,
    admin,
    body
) {

    const product =
        validateProduct(
            body
        );


    if (!product) {

        return response(
            400,
            {
                error:
                    "Completa correctamente los datos obligatorios."
            }
        );

    }


    let slug =
        slugify(
            product.name
        );


    if (!slug) {

        slug =
            `producto-${Date.now()}`;

    }


    const {
        data: existing
    } =
        await supabase

            .from(
                "products"
            )

            .select(
                "id"
            )

            .eq(
                "slug",
                slug
            )

            .maybeSingle();


    if (existing) {

        slug =
            `${slug}-${Date.now()}`;

    }


    const {
        data,
        error
    } =
        await supabase

            .from(
                "products"
            )

            .insert(
                {

                    ...product,

                    slug

                }
            )

            .select()

            .single();


    if (error) {

        throw error;

    }


    await audit(
        supabase,
        admin,
        "CREATE_PRODUCT",
        data.id,
        null,
        data
    );


    return response(
        201,
        {
            ok:
                true,

            product:
                data
        }
    );

}


/* =========================================================
   PUT
========================================================= */

async function updateProduct(
    supabase,
    admin,
    body
) {

    const id =
        Number(
            body.id
        );


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        return response(
            400,
            {
                error:
                    "Producto inválido."
            }
        );

    }


    const product =
        validateProduct(
            body
        );


    if (!product) {

        return response(
            400,
            {
                error:
                    "Completa correctamente los datos."
            }
        );

    }


    const {
        data: oldProduct,
        error: oldError
    } =
        await supabase

            .from(
                "products"
            )

            .select("*")

            .eq(
                "id",
                id
            )

            .maybeSingle();


    if (
        oldError ||
        !oldProduct
    ) {

        return response(
            404,
            {
                error:
                    "Producto no encontrado."
            }
        );

    }


    const {
        data,
        error
    } =
        await supabase

            .from(
                "products"
            )

            .update(
                {

                    ...product,

                    updated_at:
                        new Date()
                            .toISOString()

                }
            )

            .eq(
                "id",
                id
            )

            .select()

            .single();


    if (error) {

        throw error;

    }


    await audit(
        supabase,
        admin,
        "UPDATE_PRODUCT",
        id,
        oldProduct,
        data
    );


    return response(
        200,
        {
            ok:
                true,

            product:
                data
        }
    );

}


/* =========================================================
   DELETE = RETIRAR

   No borramos físicamente el producto.
   Lo desactivamos para conservar historial.
========================================================= */

async function retireProduct(
    supabase,
    admin,
    body
) {

    const id =
        Number(
            body.id
        );


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        return response(
            400,
            {
                error:
                    "Producto inválido."
            }
        );

    }


    const {
        data: oldProduct,
        error: oldError
    } =
        await supabase

            .from(
                "products"
            )

            .select("*")

            .eq(
                "id",
                id
            )

            .maybeSingle();


    if (
        oldError ||
        !oldProduct
    ) {

        return response(
            404,
            {
                error:
                    "Producto no encontrado."
            }
        );

    }


    const {
        data,
        error
    } =
        await supabase

            .from(
                "products"
            )

            .update(
                {

                    active:
                        false,

                    updated_at:
                        new Date()
                            .toISOString()

                }
            )

            .eq(
                "id",
                id
            )

            .select()

            .single();


    if (error) {

        throw error;

    }


    await audit(
        supabase,
        admin,
        "RETIRE_PRODUCT",
        id,
        oldProduct,
        data
    );


    return response(
        200,
        {
            ok:
                true
        }
    );

}


/* =========================================================
   HANDLER
========================================================= */

exports.handler =
async function handler(
    event
) {

    try {

        const admin =
            await getAuthorizedAdmin(
                event
            );


        if (!admin) {

            return response(
                401,
                {
                    error:
                        "Sesión no autorizada."
                }
            );

        }


        const supabase =
            getSupabaseAdmin();


        if (
            event.httpMethod ===
            "GET"
        ) {

            const products =
                await listProducts(
                    supabase
                );


            return response(
                200,
                {
                    products
                }
            );

        }


        let body = {};


        if (
            event.body
        ) {

            try {

                body =
                    JSON.parse(
                        event.body
                    );

            } catch {

                return response(
                    400,
                    {
                        error:
                            "Solicitud inválida."
                    }
                );

            }

        }


        if (
            event.httpMethod ===
            "POST"
        ) {

            return await createProduct(
                supabase,
                admin,
                body
            );

        }


        if (
            event.httpMethod ===
            "PUT"
        ) {

            return await updateProduct(
                supabase,
                admin,
                body
            );

        }


        if (
            event.httpMethod ===
            "DELETE"
        ) {

            return await retireProduct(
                supabase,
                admin,
                body
            );

        }


        return response(
            405,
            {
                error:
                    "Método no permitido."
            },
            {
                Allow:
                    "GET, POST, PUT, DELETE"
            }
        );


    } catch (error) {

        console.error(
            "Maderóh admin products:",
            error
        );


        return response(
            500,
            {
                error:
                    "No fue posible procesar los productos."
            }
        );

    }

};