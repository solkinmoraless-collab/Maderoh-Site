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
        "/.netlify/functions/admin-products"

};


let products = [];


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


/* =========================================================
   RESPUESTAS
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
                                            document
                                                .getElementById(
                                                    "email"
                                                )
                                                .value
                                                .trim(),

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

            await fetch(
                API.logout,
                {

                    method:
                        "POST",

                    credentials:
                        "same-origin"

                }
            );


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
                            ${escapeHtml(product.name)}
                        </h3>

                        <p>
                            ${escapeHtml(product.category_name)}
                            ·
                            ${formatPrice(product.price)}
                        </p>

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
   BOTONES
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
   MODAL
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
            "productFormMessage"
        )
        .textContent =
            "";


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

    } else {

        document
            .getElementById(
                "productFormTitle"
            )
            .textContent =
                "Nuevo producto";

    }


    productModal.hidden =
        false;


    document.body.style.overflow =
        "hidden";

}


function closeProductModal() {

    productModal.hidden =
        true;


    document.body.style.overflow =
        "";

}


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
   RETIRAR
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
   HELPERS
========================================================= */

function value(
    id
) {

    return document
        .getElementById(
            id
        )
        .value
        .trim();

}


function formatPrice(
    price
) {

    if (
        price === null ||
        price === undefined
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