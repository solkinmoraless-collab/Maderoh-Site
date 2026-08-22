"use strict";


/* =========================================================
   MADERÓH ADMIN
========================================================= */


const API = {

    login:
        "/.netlify/functions/admin-login",

    session:
        "/.netlify/functions/admin-session",

    logout:
        "/.netlify/functions/admin-logout",

    products:
        "/.netlify/functions/admin-products",

    images:
        "/.netlify/functions/admin-product-images"

};


let products = [];


let currentImageProductId =
    null;


/* =========================================================
   DOM
========================================================= */

const loginView =
    document.getElementById(
        "loginView"
    );


const adminView =
    document.getElementById(
        "adminView"
    );


const dashboardSection =
    document.getElementById(
        "dashboardSection"
    );


const productsSection =
    document.getElementById(
        "productsSection"
    );


const productModal =
    document.getElementById(
        "productModal"
    );


const productImageInput =
    document.getElementById(
        "productImageInput"
    );


const selectProductImagesButton =
    document.getElementById(
        "selectProductImagesButton"
    );


const productImagesGrid =
    document.getElementById(
        "productImagesGrid"
    );


const imageUploadMessage =
    document.getElementById(
        "imageUploadMessage"
    );


/* =========================================================
   JSON
========================================================= */

async function readJson(
    response
) {

    try {

        return await response.json();

    } catch {

        return {};

    }

}


/* =========================================================
   LOGIN UI
========================================================= */

function showLogin() {

    closeProductModal();


    loginView.hidden =
        false;


    adminView.hidden =
        true;

}


function showAdmin(
    user
) {

    loginView.hidden =
        true;


    adminView.hidden =
        false;


    document
        .getElementById(
            "adminEmail"
        )
        .textContent =
            user.email ||
            "Administrador";


    document
        .getElementById(
            "adminRole"
        )
        .textContent =
            user.role ===
            "OWNER"

                ? "Propietario"

                : "Administrador";

}


/* =========================================================
   CHECK SESSION
========================================================= */

async function checkSession() {

    try {

        const response =
            await fetch(
                API.session,
                {

                    method:
                        "GET",

                    credentials:
                        "same-origin",

                    cache:
                        "no-store"

                }
            );


        const data =
            await readJson(
                response
            );


        if (
            response.ok &&
            data.authenticated === true &&
            data.user
        ) {

            showAdmin(
                data.user
            );


            return;

        }

    } catch (error) {

        console.error(
            "Error verificando sesión:",
            error
        );

    }


    showLogin();

}


/* =========================================================
   LOGIN
========================================================= */

document
    .getElementById(
        "loginForm"
    )
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const button =
                document.getElementById(
                    "loginButton"
                );


            const message =
                document.getElementById(
                    "loginMessage"
                );


            message.textContent =
                "";


            button.disabled =
                true;


            button.textContent =
                "Verificando...";


            try {

                const response =
                    await fetch(
                        API.login,
                        {

                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    {

                                        email:
                                            value(
                                                "email"
                                            ),

                                        password:
                                            document
                                                .getElementById(
                                                    "password"
                                                )
                                                .value

                                    }
                                )

                        }
                    );


                const data =
                    await readJson(
                        response
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        data.error ||
                        "No fue posible iniciar sesión."
                    );

                }


                document
                    .getElementById(
                        "loginForm"
                    )
                    .reset();


                showAdmin(
                    data.user
                );


            } catch (error) {

                message.textContent =
                    error.message;

            } finally {

                button.disabled =
                    false;


                button.textContent =
                    "Ingresar";

            }

        }
    );


/* =========================================================
   LOGOUT
========================================================= */

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        async () => {

            try {

                await fetch(
                    API.logout,
                    {

                        method:
                            "POST",

                        credentials:
                            "same-origin"

                    }
                );

            } catch (error) {

                console.error(
                    "Logout:",
                    error
                );

            }


            showLogin();

        }
    );


/* =========================================================
   ABRIR PRODUCTOS
========================================================= */

document
    .getElementById(
        "openProductsButton"
    )
    .addEventListener(
        "click",
        async () => {

            dashboardSection.hidden =
                true;


            productsSection.hidden =
                false;


            await loadProducts();

        }
    );


/* =========================================================
   REGRESAR
========================================================= */

document
    .getElementById(
        "backDashboardButton"
    )
    .addEventListener(
        "click",
        () => {

            productsSection.hidden =
                true;


            dashboardSection.hidden =
                false;

        }
    );


/* =========================================================
   CARGAR PRODUCTOS
========================================================= */

async function loadProducts() {

    const container =
        document.getElementById(
            "adminProductsList"
        );


    container.innerHTML =
        "<p>Cargando productos...</p>";


    try {

        const response =
            await fetch(
                API.products,
                {

                    method:
                        "GET",

                    credentials:
                        "same-origin",

                    cache:
                        "no-store"

                }
            );


        const data =
            await readJson(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "No fue posible cargar productos."
            );

        }


        products =
            data.products ||
            [];


        renderProducts();


    } catch (error) {

        container.innerHTML = `

            <p class="message">

                ${escapeHtml(
                    error.message
                )}

            </p>

        `;

    }

}


/* =========================================================
   RENDER PRODUCTOS
========================================================= */

function renderProducts() {

    const container =
        document.getElementById(
            "adminProductsList"
        );


    if (
        products.length === 0
    ) {

        container.innerHTML = `

            <p>
                No hay productos.
            </p>

        `;


        return;

    }


    container.innerHTML =
        products
            .map(
                product => `

                <article
                    class="admin-product-row"
                >


                    <div
                        class="admin-product-main"
                    >


                        ${
                            product.main_image_url
                                ? `

                                <img
                                    class="admin-product-thumb"
                                    src="${escapeHtml(
                                        product.main_image_url
                                    )}"
                                    alt="${escapeHtml(
                                        product.name
                                    )}"
                                    loading="lazy"
                                >

                                `
                                : `

                                <div
                                    class="admin-product-thumb admin-product-no-image"
                                >
                                    Sin foto
                                </div>

                                `
                        }


                        <div>

                            <span
                                class="admin-product-status ${
                                    product.active
                                        ? "active"
                                        : "inactive"
                                }"
                            >

                                ${
                                    product.active
                                        ? "Activo"
                                        : "Retirado"
                                }

                            </span>


                            <h3>
                                ${escapeHtml(
                                    product.name
                                )}
                            </h3>


                            <p>

                                ${escapeHtml(
                                    product.category_name
                                )}

                                ·

                                ${formatPrice(
                                    product.price
                                )}

                            </p>

                        </div>


                    </div>



                    <div
                        class="admin-product-actions"
                    >


                        ${
                            product.featured
                                ? `

                                <span
                                    class="featured-tag"
                                >
                                    Destacado
                                </span>

                                `
                                : ""
                        }


                        <button
                            type="button"
                            class="edit-product"
                            data-id="${product.id}"
                        >
                            Editar
                        </button>


                        ${
                            product.active
                                ? `

                                <button
                                    type="button"
                                    class="retire-product"
                                    data-id="${product.id}"
                                >
                                    Retirar
                                </button>

                                `
                                : ""
                        }


                    </div>


                </article>

            `
            )
            .join("");


    bindProductButtons();

}


/* =========================================================
   BOTONES PRODUCTOS
========================================================= */

function bindProductButtons() {

    document
        .querySelectorAll(
            ".edit-product"
        )
        .forEach(
            button => {

                button
                    .addEventListener(
                        "click",
                        () => {

                            const product =
                                products.find(
                                    item =>
                                        item.id ===
                                        Number(
                                            button.dataset.id
                                        )
                                );


                            if (product) {

                                openProductModal(
                                    product
                                );

                            }

                        }
                    );

            }
        );


    document
        .querySelectorAll(
            ".retire-product"
        )
        .forEach(
            button => {

                button
                    .addEventListener(
                        "click",
                        () => {

                            retireProduct(
                                Number(
                                    button.dataset.id
                                )
                            );

                        }
                    );

            }
        );

}


/* =========================================================
   NUEVO PRODUCTO
========================================================= */

document
    .getElementById(
        "newProductButton"
    )
    .addEventListener(
        "click",
        () => {

            openProductModal();

        }
    );


/* =========================================================
   ABRIR MODAL
========================================================= */

function openProductModal(
    product = null
) {

    document
        .getElementById(
            "productForm"
        )
        .reset();


    document
        .getElementById(
            "productId"
        )
        .value =
            "";


    document
        .getElementById(
            "productActive"
        )
        .checked =
            true;


    document
        .getElementById(
            "productFeatured"
        )
        .checked =
            false;


    document
        .getElementById(
            "productFormMessage"
        )
        .textContent =
            "";


    imageUploadMessage.textContent =
        "";


    productImagesGrid.innerHTML =
        "";


    currentImageProductId =
        null;


    if (product) {

        document
            .getElementById(
                "productFormTitle"
            )
            .textContent =
                "Editar producto";


        document
            .getElementById(
                "productId"
            )
            .value =
                product.id;


        document
            .getElementById(
                "productName"
            )
            .value =
                product.name || "";


        document
            .getElementById(
                "productPrice"
            )
            .value =
                product.price ?? "";


        document
            .getElementById(
                "productCategory"
            )
            .value =
                product.category || "";


        document
            .getElementById(
                "productCategoryName"
            )
            .value =
                product.category_name || "";


        document
            .getElementById(
                "productDescription"
            )
            .value =
                product.description || "";


        document
            .getElementById(
                "productMeasurements"
            )
            .value =
                product.measurements || "";


        document
            .getElementById(
                "productWidth"
            )
            .value =
                product.width_cm ?? "";


        document
            .getElementById(
                "productDepth"
            )
            .value =
                product.depth_cm ?? "";


        document
            .getElementById(
                "productHeight"
            )
            .value =
                product.height_cm ?? "";


        document
            .getElementById(
                "productFinish"
            )
            .value =
                product.finish || "";


        document
            .getElementById(
                "productFeatured"
            )
            .checked =
                product.featured === true;


        document
            .getElementById(
                "productActive"
            )
            .checked =
                product.active === true;


        document
            .getElementById(
                "productImagesSection"
            )
            .hidden =
                false;


        loadProductImages(
            product.id
        );


    } else {


        document
            .getElementById(
                "productFormTitle"
            )
            .textContent =
                "Nuevo producto";


        document
            .getElementById(
                "productImagesSection"
            )
            .hidden =
                true;

    }


    productModal.hidden =
        false;


    document.body.style.overflow =
        "hidden";

}


/* =========================================================
   CERRAR MODAL
========================================================= */

function closeProductModal() {

    if (!productModal) {
        return;
    }


    productModal.hidden =
        true;


    document.body.style.overflow =
        "";


    currentImageProductId =
        null;


    if (
        productImageInput
    ) {

        productImageInput.value =
            "";

    }

}


/* =========================================================
   BOTONES MODAL
========================================================= */

document
    .getElementById(
        "closeProductModal"
    )
    .addEventListener(
        "click",
        closeProductModal
    );


document
    .getElementById(
        "cancelProductButton"
    )
    .addEventListener(
        "click",
        closeProductModal
    );


document
    .getElementById(
        "productModalBackdrop"
    )
    .addEventListener(
        "click",
        closeProductModal
    );


/* =========================================================
   GUARDAR PRODUCTO
========================================================= */

document
    .getElementById(
        "productForm"
    )
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const id =
                document
                    .getElementById(
                        "productId"
                    )
                    .value;


            const button =
                document
                    .getElementById(
                        "saveProductButton"
                    );


            const message =
                document
                    .getElementById(
                        "productFormMessage"
                    );


            button.disabled =
                true;


            button.textContent =
                "Guardando...";


            message.textContent =
                "";


            const body = {

                name:
                    value(
                        "productName"
                    ),

                price:
                    value(
                        "productPrice"
                    ),

                category:
                    value(
                        "productCategory"
                    ),

                categoryName:
                    value(
                        "productCategoryName"
                    ),

                description:
                    value(
                        "productDescription"
                    ),

                measurements:
                    value(
                        "productMeasurements"
                    ),

                widthCm:
                    value(
                        "productWidth"
                    ),

                depthCm:
                    value(
                        "productDepth"
                    ),

                heightCm:
                    value(
                        "productHeight"
                    ),

                finish:
                    value(
                        "productFinish"
                    ),

                featured:
                    document
                        .getElementById(
                            "productFeatured"
                        )
                        .checked,

                active:
                    document
                        .getElementById(
                            "productActive"
                        )
                        .checked

            };


            if (id) {

                body.id =
                    Number(id);

            }


            try {

                const response =
                    await fetch(
                        API.products,
                        {

                            method:
                                id
                                    ? "PUT"
                                    : "POST",

                            credentials:
                                "same-origin",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    body
                                )

                        }
                    );


                const data =
                    await readJson(
                        response
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        data.error ||
                        "No fue posible guardar."
                    );

                }


                /*
                 * Si se acaba de crear un producto,
                 * mantenemos abierto el formulario
                 * para que ya pueda agregar imágenes.
                 */

                if (
                    !id &&
                    data.product &&
                    data.product.id
                ) {

                    document
                        .getElementById(
                            "productId"
                        )
                        .value =
                            data.product.id;


                    document
                        .getElementById(
                            "productFormTitle"
                        )
                        .textContent =
                            "Editar producto";


                    document
                        .getElementById(
                            "productImagesSection"
                        )
                        .hidden =
                            false;


                    currentImageProductId =
                        data.product.id;


                    message.textContent =
                        "Producto creado. Ya puedes agregar fotografías.";


                    await loadProducts();


                    await loadProductImages(
                        data.product.id
                    );


                    return;

                }


                closeProductModal();


                await loadProducts();


            } catch (error) {

                message.textContent =
                    error.message;

            } finally {

                button.disabled =
                    false;


                button.textContent =
                    "Guardar producto";

            }

        }
    );


/* =========================================================
   RETIRAR PRODUCTO
========================================================= */

async function retireProduct(
    id
) {

    const confirmed =
        window.confirm(
            "¿Deseas retirar este producto del catálogo?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                API.products,
                {

                    method:
                        "DELETE",

                    credentials:
                        "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            {
                                id
                            }
                        )

                }
            );


        const data =
            await readJson(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "No fue posible retirar."
            );

        }


        await loadProducts();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* =========================================================
   SELECCIONAR IMÁGENES
========================================================= */

selectProductImagesButton
    .addEventListener(
        "click",
        () => {

            if (
                !currentImageProductId
            ) {

                imageUploadMessage
                    .textContent =
                    "Guarda primero el producto.";

                return;

            }


            productImageInput.click();

        }
    );


/* =========================================================
   INPUT DE IMÁGENES
========================================================= */

productImageInput
    .addEventListener(
        "change",
        async () => {

            const files =
                Array.from(
                    productImageInput.files ||
                    []
                );


            if (
                files.length === 0
            ) {

                return;

            }


            await uploadProductImages(
                files
            );


            productImageInput.value =
                "";

        }
    );


/* =========================================================
   CARGAR GALERÍA
========================================================= */

async function loadProductImages(
    productId
) {

    currentImageProductId =
        Number(
            productId
        );


    productImagesGrid.innerHTML =
        `

        <p class="image-loading">
            Cargando fotografías...
        </p>

        `;


    imageUploadMessage.textContent =
        "";


    try {

        const response =
            await fetch(
                `${API.images}?productId=${encodeURIComponent(
                    currentImageProductId
                )}`,
                {

                    method:
                        "GET",

                    credentials:
                        "same-origin",

                    cache:
                        "no-store"

                }
            );


        const data =
            await readJson(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "No fue posible cargar las imágenes."
            );

        }


        renderProductImages(
            data.images || [],
            data.mainImageUrl || null
        );


    } catch (error) {

        productImagesGrid.innerHTML =
            "";


        imageUploadMessage.textContent =
            error.message;

    }

}


/* =========================================================
   RENDER GALERÍA
========================================================= */

function renderProductImages(
    images,
    mainImageUrl
) {

    if (
        images.length === 0
    ) {

        productImagesGrid.innerHTML =
            `

            <div class="empty-images">
                Este producto todavía no tiene fotografías.
            </div>

            `;


        return;

    }


    productImagesGrid.innerHTML =
        images
            .map(
                image => {

                    const isMain =
                        image.image_url ===
                        mainImageUrl;


                    return `

                    <article
                        class="product-image-card"
                    >


                        <div
                            class="product-image-preview"
                        >


                            <img
                                src="${escapeHtml(
                                    image.image_url
                                )}"
                                alt="${escapeHtml(
                                    image.alt_text ||
                                    "Producto Maderóh"
                                )}"
                                loading="lazy"
                            >


                            ${
                                isMain
                                    ? `

                                    <span
                                        class="main-image-badge"
                                    >
                                        Principal
                                    </span>

                                    `
                                    : ""
                            }


                        </div>



                        <div
                            class="product-image-actions"
                        >


                            ${
                                !isMain
                                    ? `

                                    <button
                                        type="button"
                                        class="set-main-image"
                                        data-image-id="${image.id}"
                                    >
                                        Hacer principal
                                    </button>

                                    `
                                    : `

                                    <span
                                        class="main-image-label"
                                    >
                                        Imagen principal
                                    </span>

                                    `
                            }


                            <button
                                type="button"
                                class="delete-product-image"
                                data-image-id="${image.id}"
                            >
                                Eliminar
                            </button>


                        </div>


                    </article>

                    `;

                }
            )
            .join("");


    bindImageButtons();

}


/* =========================================================
   SUBIR IMÁGENES
========================================================= */

async function uploadProductImages(
    files
) {

    if (
        !currentImageProductId
    ) {

        return;

    }


    const allowedTypes =
        new Set([
            "image/jpeg",
            "image/png",
            "image/webp"
        ]);


    const maxSize =
        8 * 1024 * 1024;


    selectProductImagesButton.disabled =
        true;


    try {

        for (
            const file
            of files
        ) {

            if (
                !allowedTypes.has(
                    file.type
                )
            ) {

                imageUploadMessage.textContent =
                    `${file.name}: formato no permitido.`;

                continue;

            }


            if (
                file.size >
                maxSize
            ) {

                imageUploadMessage.textContent =
                    `${file.name}: supera los 8 MB.`;

                continue;

            }


            selectProductImagesButton.textContent =
                `Subiendo ${file.name}...`;


            imageUploadMessage.textContent =
                "";


            /* =============================================
               1. SOLICITAR AUTORIZACIÓN
            ============================================= */

            const prepareResponse =
                await fetch(
                    API.images,
                    {

                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(
                                {

                                    action:
                                        "prepare-upload",

                                    productId:
                                        currentImageProductId,

                                    mimeType:
                                        file.type,

                                    fileSize:
                                        file.size

                                }
                            )

                    }
                );


            const prepareData =
                await readJson(
                    prepareResponse
                );


            if (
                !prepareResponse.ok
            ) {

                throw new Error(
                    prepareData.error ||
                    "No fue posible preparar la imagen."
                );

            }


            /* =============================================
               2. SUBIR A STORAGE
            ============================================= */

            const uploadResponse =
                await fetch(
                    prepareData.signedUrl,
                    {

                        method:
                            "PUT",

                        headers: {

                            "Content-Type":
                                file.type

                        },

                        body:
                            file

                    }
                );


            if (
                !uploadResponse.ok
            ) {

                throw new Error(
                    `No fue posible subir ${file.name}.`
                );

            }


            /* =============================================
               3. REGISTRAR EN LA BD
            ============================================= */

            const registerResponse =
                await fetch(
                    API.images,
                    {

                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(
                                {

                                    action:
                                        "register-upload",

                                    productId:
                                        currentImageProductId,

                                    path:
                                        prepareData.path,

                                    altText:
                                        value(
                                            "productName"
                                        )

                                }
                            )

                    }
                );


            const registerData =
                await readJson(
                    registerResponse
                );


            if (
                !registerResponse.ok
            ) {

                throw new Error(
                    registerData.error ||
                    "La imagen se subió pero no pudo registrarse."
                );

            }

        }


        await loadProductImages(
            currentImageProductId
        );


        await loadProducts();


    } catch (error) {

        console.error(
            "Image upload:",
            error
        );


        imageUploadMessage.textContent =
            error.message;


    } finally {

        selectProductImagesButton.disabled =
            false;


        selectProductImagesButton.textContent =
            "+ Seleccionar fotografías";

    }

}


/* =========================================================
   BOTONES DE IMAGEN
========================================================= */

function bindImageButtons() {

    document
        .querySelectorAll(
            ".set-main-image"
        )
        .forEach(
            button => {

                button
                    .addEventListener(
                        "click",
                        async () => {

                            await setMainImage(
                                Number(
                                    button.dataset.imageId
                                )
                            );

                        }
                    );

            }
        );


    document
        .querySelectorAll(
            ".delete-product-image"
        )
        .forEach(
            button => {

                button
                    .addEventListener(
                        "click",
                        async () => {

                            await deleteProductImage(
                                Number(
                                    button.dataset.imageId
                                )
                            );

                        }
                    );

            }
        );

}


/* =========================================================
   HACER PRINCIPAL
========================================================= */

async function setMainImage(
    imageId
) {

    try {

        const response =
            await fetch(
                API.images,
                {

                    method:
                        "PUT",

                    credentials:
                        "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            {

                                action:
                                    "set-main",

                                productId:
                                    currentImageProductId,

                                imageId

                            }
                        )

                }
            );


        const data =
            await readJson(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "No fue posible cambiar la imagen principal."
            );

        }


        await loadProductImages(
            currentImageProductId
        );


        await loadProducts();


    } catch (error) {

        imageUploadMessage.textContent =
            error.message;

    }

}


/* =========================================================
   ELIMINAR IMAGEN
========================================================= */

async function deleteProductImage(
    imageId
) {

    const confirmed =
        window.confirm(
            "¿Deseas eliminar esta fotografía?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                API.images,
                {

                    method:
                        "DELETE",

                    credentials:
                        "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            {

                                productId:
                                    currentImageProductId,

                                imageId

                            }
                        )

                }
            );


        const data =
            await readJson(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.error ||
                "No fue posible eliminar la fotografía."
            );

        }


        await loadProductImages(
            currentImageProductId
        );


        await loadProducts();


    } catch (error) {

        imageUploadMessage.textContent =
            error.message;

    }

}


/* =========================================================
   HELPERS
========================================================= */

function value(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return "";

    }


    return String(
        element.value || ""
    )
    .trim();

}


function formatPrice(
    price
) {

    if (
        price === null ||
        price === undefined ||
        price === ""
    ) {

        return "Cotizar";

    }


    return new Intl.NumberFormat(
        "es-MX",
        {

            style:
                "currency",

            currency:
                "MXN",

            maximumFractionDigits:
                0

        }
    )
    .format(
        Number(price)
    );

}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   INICIO
========================================================= */

checkSession();