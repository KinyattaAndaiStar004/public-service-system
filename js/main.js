
"use strict";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Mobile navigation menu
    const menuToggle = document.querySelector(
        "#menu-toggle, #menu-btn, .menu-toggle, .menu-btn, .hamburger"
    );

    const navigation = document.querySelector(
        "#nav-links, #navbar, .nav-links, .nav-menu"
    );

    if (menuToggle && navigation) {
        menuToggle.addEventListener("click", () => {
            const isOpen = navigation.classList.toggle("active");

            menuToggle.setAttribute("aria-expanded", String(isOpen));
            menuToggle.setAttribute(
                "aria-label",
                isOpen ? "Close navigation menu" : "Open navigation menu"
            );
        });

        // Close the mobile menu after selecting a link
        navigation.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                navigation.classList.remove("active");
                menuToggle.setAttribute("aria-expanded", "false");
            });
        });
    }

    // 2. Close buttons for dismissible alerts
    document.querySelectorAll(
        ".alert-close, .close-alert, [data-dismiss='alert']"
    ).forEach((button) => {
        button.addEventListener("click", () => {
            const alert = button.closest(
                ".alert, .notification, .form-message"
            );

            if (alert) {
                alert.hidden = true;
            }
        });
    });

    // 3. Automatically update the footer year
    document.querySelectorAll(
        "#current-year, #year, [data-current-year]"
    ).forEach((element) => {
        element.textContent = new Date().getFullYear();
    });

    // 4. Add a back-to-top button if the page has one
    const backToTop = document.querySelector(
        "#back-to-top, .back-to-top"
    );

    if (backToTop) {
        backToTop.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }

    // 5. Prevent accidental double-clicks on ordinary submit buttons.
    // Firebase forms should manage their own loading states in auth.js.
    document.querySelectorAll(
        "form[data-prevent-double-submit]"
    ).forEach((form) => {
        form.addEventListener("submit", () => {
            const button = form.querySelector(
                "button[type='submit'], input[type='submit']"
            );

            if (button) {
                button.disabled = true;
            }
        });
    });

    console.log("Kenyan Voice: main.js loaded successfully.");
});
