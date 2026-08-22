"use strict";

/* =========================================================
   MADERÓH ADMIN
========================================================= */

const API = {
    login: "/.netlify/functions/admin-login",
    session: "/.netlify/functions/admin-session",
    logout: "/.netlify/functions/admin-logout"
};


/* =========================================================
   ELEMENTOS
========================================================= */

const loginView =
    document.getElementById("loginView");

const adminView =
    document.getElementById("adminView");

const loginForm =
    document.getElementById("loginForm");

const loginButton =
    document.getElementById("loginButton");

const loginMessage =
    document.getElementById("loginMessage");

const adminEmail =
    document.getElementById("adminEmail");

const adminRole =
    document.getElementById("adminRole");

const logoutButton =
    document.getElementById("logoutButton");


/* =========================================================
   UTILIDADES
========================================================= */

function showLogin() {

    loginView.hidden = false;
    adminView.hidden = true;

}

function showAdmin(user) {

    loginView.hidden = true;
    adminView.hidden = false;

    adminEmail.textContent =
        user.email || "Administrador";

    adminRole.textContent =
        formatRole(user.role);

}

function formatRole(role) {

    const normalized =
        String(role || "")
            .toUpperCase();

    if (normalized === "OWNER") {
        return "Propietario";
    }

    if (normalized === "ADMIN") {
        return "Administrador";
    }

    return normalized || "Administrador";

}

async function readJson(response) {

    try {

        return await response.json();

    } catch {

        return {};

    }

}


/* =========================================================
   VERIFICAR SESIÓN
========================================================= */

async function checkSession() {

    try {

        const response =
            await fetch(
                API.session,
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

        const data =
            await readJson(response);

        if (
            response.ok &&
            data.authenticated === true &&
            data.user
        ) {

            showAdmin(data.user);

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

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        loginMessage.textContent = "";

        const email =
            document
                .getElementById("email")
                .value
                .trim();

        const password =
            document
                .getElementById("password")
                .value;

        if (!email || !password) {

            loginMessage.textContent =
                "Ingresa tu correo y contraseña.";

            return;
        }

        loginButton.disabled = true;

        loginButton.textContent =
            "Verificando...";

        try {

            const response =
                await fetch(
                    API.login,
                    {
                        method: "POST",

                        credentials:
                            "same-origin",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                email,
                                password
                            })
                    }
                );

            const data =
                await readJson(response);

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "No fue posible iniciar sesión."
                );

            }

            if (!data.user) {

                throw new Error(
                    "No se recibió información del administrador."
                );

            }

            loginForm.reset();

            showAdmin(data.user);

        } catch (error) {

            console.error(
                "Error de acceso:",
                error
            );

            loginMessage.textContent =
                error.message ||
                "No fue posible iniciar sesión.";

        } finally {

            loginButton.disabled = false;

            loginButton.textContent =
                "Ingresar";

        }

    }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.addEventListener(
    "click",
    async () => {

        logoutButton.disabled = true;

        try {

            await fetch(
                API.logout,
                {
                    method: "POST",
                    credentials: "same-origin"
                }
            );

        } catch (error) {

            console.error(
                "Error cerrando sesión:",
                error
            );

        }

        logoutButton.disabled = false;

        showLogin();

    }
);


/* =========================================================
   PRODUCTOS
========================================================= */

document
    .querySelectorAll(
        '[data-section="products"]'
    )
    .forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                /*
                 * En el siguiente bloque construiremos
                 * aquí el administrador real de productos.
                 */

                alert(
                    "Administrador de productos listo para el siguiente paso."
                );

            }
        );

    });


/* =========================================================
   INICIO
========================================================= */

checkSession();