"use strict";


/* =========================================================
   MADERÓH
   ADMINISTRACIÓN SEGURA DE IMÁGENES
========================================================= */


const crypto =
    require("crypto");


const {
    getSupabaseAdmin
} = require("./db");


const COOKIE_NAME =
    "maderoh_admin_session";


const BUCKET =
    "product-images";


const MAX_FILE_SIZE =
    8 * 1024 * 1024;


/* =========================================================
   TIPOS PERMITIDOS
========================================================= */

const ALLOWED_TYPES =
new Set([

    "image/jpeg",

    "image/png",

    "image/webp"

]);


const EXTENSIONS = {

    "image/jpeg":
        "jpg",

    "image/png":
        "png",

    "image/webp":
        "webp"

};


/* =========================================================
   RESPONSE
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
   COOKIE
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
   VERIFICAR TOKEN
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
        suppliedSignature
    ] = parts;


    const expectedSignature =
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
   ADMIN AUTORIZADO
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
   VALIDACIONES
========================================================= */

function validProductId(
    value
) {

    const id =
        Number(value);


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        return null;

    }


    return id;

}


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


/* =========================================================
   VALIDAR PRODUCTO EXISTENTE
========================================================= */

async function productExists(
    supabase,
    productId
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
                "id"
            )

            .eq(
                "id",
                productId
            )

            .maybeSingle();


    if (
        error ||
        !data
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   PUBLIC URL
========================================================= */

function getPublicUrl(
    supabase,
    path
) {

    const {
        data
    } =
        supabase

            .storage

            .from(
                BUCKET
            )

            .getPublicUrl(
                path
            );


    return (
        data &&
        data.publicUrl
    )
        ? data.publicUrl
        : null;

}


/* =========================================================
   AUDITORÍA
========================================================= */

async function audit(
    supabase,
    admin,
    action,
    productId,
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
                        "product_image",

                    entity_id:
                        productId,

                    old_data:
                        oldData || null,

                    new_data:
                        newData || null

                }
            );


    if (error) {

        console.error(
            "Image audit error:",
            error.message
        );

    }

}


/* =========================================================
   LISTAR IMÁGENES
========================================================= */

async function listImages(
    supabase,
    productId
) {

    const {
        data,
        error
    } =
        await supabase

            .from(
                "product_images"
            )

            .select(
                `
                id,
                product_id,
                image_url,
                storage_path,
                alt_text,
                position,
                created_at
                `
            )

            .eq(
                "product_id",
                productId
            )

            .order(
                "position",
                {
                    ascending:
                        true
                }
            )

            .order(
                "created_at",
                {
                    ascending:
                        true
                }
            );


    if (error) {

        throw error;

    }


    const {
        data: product,
        error: productError
    } =
        await supabase

            .from(
                "products"
            )

            .select(
                "main_image_url"
            )

            .eq(
                "id",
                productId
            )

            .maybeSingle();


    if (productError) {

        throw productError;

    }


    return {

        images:
            data || [],

        mainImageUrl:
            product
                ? product.main_image_url
                : null

    };

}


/* =========================================================
   PREPARAR SUBIDA

   El archivo NO pasa por Netlify.

   Aquí solamente autorizamos al administrador
   y generamos una URL temporal de Storage.
========================================================= */

async function prepareUpload(
    supabase,
    body
) {

    const productId =
        validProductId(
            body.productId
        );


    const mimeType =
        cleanText(
            body.mimeType,
            100
        );


    const fileSize =
        Number(
            body.fileSize
        );


    if (!productId) {

        return response(
            400,
            {
                error:
                    "Producto inválido."
            }
        );

    }


    if (
        !ALLOWED_TYPES.has(
            mimeType
        )
    ) {

        return response(
            400,
            {
                error:
                    "Formato de imagen no permitido."
            }
        );

    }


    if (
        !Number.isFinite(
            fileSize
        ) ||
        fileSize <= 0 ||
        fileSize > MAX_FILE_SIZE
    ) {

        return response(
            400,
            {
                error:
                    "La imagen debe pesar máximo 8 MB."
            }
        );

    }


    const exists =
        await productExists(
            supabase,
            productId
        );


    if (!exists) {

        return response(
            404,
            {
                error:
                    "Producto no encontrado."
            }
        );

    }


    const extension =
        EXTENSIONS[
            mimeType
        ];


    const uniqueName =
        crypto
            .randomUUID();


    const path =
        `${productId}/${uniqueName}.${extension}`;


    const {
        data,
        error
    } =
        await supabase

            .storage

            .from(
                BUCKET
            )

            .createSignedUploadUrl(
                path
            );


    if (
        error ||
        !data
    ) {

        console.error(
            "Signed upload error:",
            error
                ? error.message
                : "No data"
        );


        return response(
            500,
            {
                error:
                    "No fue posible preparar la carga de la imagen."
            }
        );

    }


    return response(
        200,
        {

            ok:
                true,

            productId,

            path:
                data.path,

            signedUrl:
                data.signedUrl,

            token:
                data.token,

            mimeType,

            maxFileSize:
                MAX_FILE_SIZE

        }
    );

}


/* =========================================================
   CONFIRMAR SUBIDA

   Se ejecuta DESPUÉS de que el navegador
   subió correctamente el archivo a Storage.
========================================================= */

async function registerUpload(
    supabase,
    admin,
    body
) {

    const productId =
        validProductId(
            body.productId
        );


    const path =
        cleanText(
            body.path,
            500
        );


    const altText =
        cleanText(
            body.altText,
            200
        );


    const makeMain =
        body.makeMain === true;


    if (
        !productId ||
        !path
    ) {

        return response(
            400,
            {
                error:
                    "Información de imagen inválida."
            }
        );

    }


    /*
    Impedimos que un usuario use una ruta
    perteneciente a otro producto.
    */

    if (
        !path.startsWith(
            `${productId}/`
        )
    ) {

        return response(
            400,
            {
                error:
                    "Ruta de imagen inválida."
            }
        );

    }


    const exists =
        await productExists(
            supabase,
            productId
        );


    if (!exists) {

        return response(
            404,
            {
                error:
                    "Producto no encontrado."
            }
        );

    }


    /*
    Confirmamos que el archivo sí existe
    dentro del bucket.
    */

    const fileName =
        path
            .split("/")
            .pop();


    const folder =
        String(
            productId
        );


    const {
        data: files,
        error: filesError
    } =
        await supabase

            .storage

            .from(
                BUCKET
            )

            .list(
                folder,
                {

                    limit:
                        100,

                    search:
                        fileName

                }
            );


    if (filesError) {

        throw filesError;

    }


    const storedFile =
        Array.isArray(
            files
        )
            ? files.find(
                file =>
                    file.name ===
                    fileName
            )
            : null;


    if (!storedFile) {

        return response(
            400,
            {
                error:
                    "La imagen todavía no existe en Storage."
            }
        );

    }


    const publicUrl =
        getPublicUrl(
            supabase,
            path
        );


    if (!publicUrl) {

        return response(
            500,
            {
                error:
                    "No fue posible generar la URL de la imagen."
            }
        );

    }


    const {
        data: currentImages,
        error: currentError
    } =
        await supabase

            .from(
                "product_images"
            )

            .select(
                "id, position"
            )

            .eq(
                "product_id",
                productId
            )

            .order(
                "position",
                {
                    ascending:
                        false
                }
            )

            .limit(
                1
            );


    if (currentError) {

        throw currentError;

    }


    const nextPosition =

        Array.isArray(
            currentImages
        ) &&
        currentImages.length > 0

            ? Number(
                currentImages[0].position
            ) + 1

            : 0;


    const {
        data: image,
        error: insertError
    } =
        await supabase

            .from(
                "product_images"
            )

            .insert(
                {

                    product_id:
                        productId,

                    image_url:
                        publicUrl,

                    storage_path:
                        path,

                    alt_text:
                        altText,

                    position:
                        nextPosition

                }
            )

            .select()

            .single();


    if (insertError) {

        throw insertError;

    }


    /*
    Si es la primera imagen,
    también se vuelve principal.

    O puede indicarse explícitamente
    con makeMain.
    */

    const shouldBeMain =
        makeMain ||
        nextPosition === 0;


    if (shouldBeMain) {

        const {
            error: mainError
        } =
            await supabase

                .from(
                    "products"
                )

                .update(
                    {

                        main_image_url:
                            publicUrl,

                        updated_at:
                            new Date()
                                .toISOString()

                    }
                )

                .eq(
                    "id",
                    productId
                );


        if (mainError) {

            throw mainError;

        }

    }


    await audit(
        supabase,
        admin,
        "ADD_PRODUCT_IMAGE",
        productId,
        null,
        {

            imageId:
                image.id,

            path,

            publicUrl,

            main:
                shouldBeMain

        }
    );


    return response(
        201,
        {

            ok:
                true,

            image,

            main:
                shouldBeMain

        }
    );

}


/* =========================================================
   DEFINIR IMAGEN PRINCIPAL
========================================================= */

async function setMainImage(
    supabase,
    admin,
    body
) {

    const productId =
        validProductId(
            body.productId
        );


    const imageId =
        Number(
            body.imageId
        );


    if (
        !productId ||
        !Number.isInteger(
            imageId
        ) ||
        imageId <= 0
    ) {

        return response(
            400,
            {
                error:
                    "Imagen inválida."
            }
        );

    }


    const {
        data: image,
        error: imageError
    } =
        await supabase

            .from(
                "product_images"
            )

            .select(
                "id, product_id, image_url"
            )

            .eq(
                "id",
                imageId
            )

            .eq(
                "product_id",
                productId
            )

            .maybeSingle();


    if (
        imageError ||
        !image
    ) {

        return response(
            404,
            {
                error:
                    "Imagen no encontrada."
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

            .select(
                "main_image_url"
            )

            .eq(
                "id",
                productId
            )

            .maybeSingle();


    if (oldError) {

        throw oldError;

    }


    const {
        error
    } =
        await supabase

            .from(
                "products"
            )

            .update(
                {

                    main_image_url:
                        image.image_url,

                    updated_at:
                        new Date()
                            .toISOString()

                }
            )

            .eq(
                "id",
                productId
            );


    if (error) {

        throw error;

    }


    await audit(
        supabase,
        admin,
        "SET_MAIN_PRODUCT_IMAGE",
        productId,
        {

            mainImageUrl:
                oldProduct
                    ? oldProduct.main_image_url
                    : null

        },
        {

            imageId,

            mainImageUrl:
                image.image_url

        }
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
   ELIMINAR IMAGEN
========================================================= */

async function deleteImage(
    supabase,
    admin,
    body
) {

    const productId =
        validProductId(
            body.productId
        );


    const imageId =
        Number(
            body.imageId
        );


    if (
        !productId ||
        !Number.isInteger(
            imageId
        ) ||
        imageId <= 0
    ) {

        return response(
            400,
            {
                error:
                    "Imagen inválida."
            }
        );

    }


    const {
        data: image,
        error: imageError
    } =
        await supabase

            .from(
                "product_images"
            )

            .select(
                `
                id,
                product_id,
                image_url,
                storage_path,
                position
                `
            )

            .eq(
                "id",
                imageId
            )

            .eq(
                "product_id",
                productId
            )

            .maybeSingle();


    if (
        imageError ||
        !image
    ) {

        return response(
            404,
            {
                error:
                    "Imagen no encontrada."
            }
        );

    }


    /*
    Consultamos si era la principal.
    */

    const {
        data: product,
        error: productError
    } =
        await supabase

            .from(
                "products"
            )

            .select(
                "main_image_url"
            )

            .eq(
                "id",
                productId
            )

            .maybeSingle();


    if (productError) {

        throw productError;

    }


    const wasMain =
        product &&
        product.main_image_url ===
        image.image_url;


    /*
    Primero retiramos Storage.
    */

    if (
        image.storage_path
    ) {

        const {
            error: storageError
        } =
            await supabase

                .storage

                .from(
                    BUCKET
                )

                .remove(
                    [
                        image.storage_path
                    ]
                );


        if (storageError) {

            throw storageError;

        }

    }


    /*
    Después eliminamos registro SQL.
    */

    const {
        error: deleteError
    } =
        await supabase

            .from(
                "product_images"
            )

            .delete()

            .eq(
                "id",
                imageId
            );


    if (deleteError) {

        throw deleteError;

    }


    /*
    Si era principal, buscamos siguiente.
    */

    if (wasMain) {

        const {
            data: nextImage,
            error: nextError
        } =
            await supabase

                .from(
                    "product_images"
                )

                .select(
                    "image_url"
                )

                .eq(
                    "product_id",
                    productId
                )

                .order(
                    "position",
                    {
                        ascending:
                            true
                    }
                )

                .limit(
                    1
                )

                .maybeSingle();


        if (nextError) {

            throw nextError;

        }


        const {
            error: updateError
        } =
            await supabase

                .from(
                    "products"
                )

                .update(
                    {

                        main_image_url:
                            nextImage
                                ? nextImage.image_url
                                : null,

                        updated_at:
                            new Date()
                                .toISOString()

                    }
                )

                .eq(
                    "id",
                    productId
                );


        if (updateError) {

            throw updateError;

        }

    }


    await audit(
        supabase,
        admin,
        "DELETE_PRODUCT_IMAGE",
        productId,
        image,
        null
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


        /* =================================================
           GET
        ================================================= */

        if (
            event.httpMethod ===
            "GET"
        ) {

            const params =
                event.queryStringParameters ||
                {};


            const productId =
                validProductId(
                    params.productId
                );


            if (!productId) {

                return response(
                    400,
                    {
                        error:
                            "Producto inválido."
                    }
                );

            }


            const result =
                await listImages(
                    supabase,
                    productId
                );


            return response(
                200,
                result
            );

        }


        /* =================================================
           BODY
        ================================================= */

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


        /* =================================================
           POST
        ================================================= */

        if (
            event.httpMethod ===
            "POST"
        ) {

            const action =
                cleanText(
                    body.action,
                    50
                );


            if (
                action ===
                "prepare-upload"
            ) {

                return await prepareUpload(
                    supabase,
                    body
                );

            }


            if (
                action ===
                "register-upload"
            ) {

                return await registerUpload(
                    supabase,
                    admin,
                    body
                );

            }


            return response(
                400,
                {
                    error:
                        "Acción inválida."
                }
            );

        }


        /* =================================================
           PUT
        ================================================= */

        if (
            event.httpMethod ===
            "PUT"
        ) {

            const action =
                cleanText(
                    body.action,
                    50
                );


            if (
                action ===
                "set-main"
            ) {

                return await setMainImage(
                    supabase,
                    admin,
                    body
                );

            }


            return response(
                400,
                {
                    error:
                        "Acción inválida."
                }
            );

        }


        /* =================================================
           DELETE
        ================================================= */

        if (
            event.httpMethod ===
            "DELETE"
        ) {

            return await deleteImage(
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
            "Maderóh admin product images:",
            error
        );


        return response(
            500,
            {
                error:
                    "No fue posible procesar las imágenes."
            }
        );

    }

};