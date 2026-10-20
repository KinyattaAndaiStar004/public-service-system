
import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// ========================================
// CONFIGURATION
// ========================================

const ADMIN_EMAIL = "dorrohstar@gmail.com";

// ========================================
// SHARED FEEDBACK FUNCTIONS
// ========================================

function showMessage(element, message, type = "error") {
  if (!element) return;

  element.textContent = message;
  element.className = `form-message ${type}`;
  element.hidden = false;
}

function clearMessage(element) {
  if (!element) return;

  element.textContent = "";
  element.hidden = true;
  element.classList.remove("error", "success");
}

function showFieldError(input, message) {
  if (!input) return;

  input.classList.add("input-error");
  input.setAttribute("aria-invalid", "true");

  const group = input.closest(".form-group");
  if (!group) return;

  let errorElement = document.getElementById(`${input.id}-error`);

  if (!errorElement || !group.contains(errorElement)) {
    errorElement = document.createElement("small");
    errorElement.id = `${input.id}-error`;
    errorElement.className = "field-error-message";
    errorElement.setAttribute("role", "alert");
    group.appendChild(errorElement);
  }

  errorElement.textContent = message;
  errorElement.hidden = false;
  input.setAttribute("aria-describedby", errorElement.id);
}

function clearFieldError(input) {
  if (!input) return;

  input.classList.remove("input-error");
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");

  const errorElement = document.getElementById(`${input.id}-error`);

  if (errorElement) {
    errorElement.textContent = "";
    errorElement.hidden = true;
  }

  if (input.id === "terms") {
    input.closest(".terms-group")?.classList.remove("input-error");
  }
}

function clearFormErrors(form) {
  if (!form) return;

  form.querySelectorAll("input, select, textarea").forEach(clearFieldError);

  form.querySelectorAll(".terms-group").forEach((group) => {
    group.classList.remove("input-error");
  });
}

// ========================================
// REGISTRATION
// ========================================

const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");
const registerButton = document.getElementById("register-submit");

let isRegistering = false;

if (registerForm) {
  const fullNameInput = document.getElementById("full-name");
  const nationalIdInput = document.getElementById("national-id");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const countyInput = document.getElementById("county");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const termsInput = document.getElementById("terms");

  registerForm.querySelectorAll("input, select").forEach((input) => {
    const clearErrors = () => {
      clearFieldError(input);
      clearMessage(registerMessage);

      if (input === passwordInput || input === confirmPasswordInput) {
        checkPasswordMatch();
      }
    };

    input.addEventListener("input", clearErrors);
    input.addEventListener("change", clearErrors);
  });

  function checkPasswordMatch() {
    if (!confirmPasswordInput.value) {
      clearFieldError(confirmPasswordInput);
      return;
    }

    if (passwordInput.value !== confirmPasswordInput.value) {
      showFieldError(
        confirmPasswordInput,
        "Passwords do not match. Please enter the same password."
      );
    } else {
      clearFieldError(confirmPasswordInput);
    }
  }

  function validateRegistration() {
    let valid = true;

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const county = countyInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!fullName) {
      showFieldError(fullNameInput, "Please enter your full name.");
      valid = false;
    } else if (fullName.length < 2) {
      showFieldError(
        fullNameInput,
        "Your full name must contain at least 2 characters."
      );
      valid = false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      showFieldError(emailInput, "Please enter your email address.");
      valid = false;
    } else if (!emailPattern.test(email) || !emailInput.validity.valid) {
      showFieldError(emailInput, "Please enter a valid email address.");
      valid = false;
    }

    if (!phone) {
      showFieldError(phoneInput, "Please enter your phone number.");
      valid = false;
    } else if (!/^\+?[0-9\s()-]{9,15}$/.test(phone)) {
      showFieldError(phoneInput, "Please enter a valid phone number.");
      valid = false;
    }

    if (!county) {
      showFieldError(countyInput, "Please select your county.");
      valid = false;
    }

    if (!password) {
      showFieldError(passwordInput, "Please create a password.");
      valid = false;
    } else if (password.length < 8) {
      showFieldError(passwordInput, "Password must contain at least 8 characters.");
      valid = false;
    } else if (!/[A-Z]/.test(password)) {
      showFieldError(passwordInput, "Add at least one uppercase letter (A-Z).");
      valid = false;
    } else if (!/[a-z]/.test(password)) {
      showFieldError(passwordInput, "Add at least one lowercase letter (a-z).");
      valid = false;
    } else if (!/[0-9]/.test(password)) {
      showFieldError(passwordInput, "Add at least one number (0-9).");
      valid = false;
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      showFieldError(
        passwordInput,
        "Add at least one special character, such as @, #, or !."
      );
      valid = false;
    }

    if (!confirmPassword) {
      showFieldError(confirmPasswordInput, "Please confirm your password.");
      valid = false;
    } else if (password !== confirmPassword) {
      showFieldError(
        confirmPasswordInput,
        "Passwords do not match. Please enter the same password."
      );
      valid = false;
    }

    if (!termsInput.checked) {
      showFieldError(termsInput, "You must agree before creating an account.");
      termsInput.closest(".terms-group")?.classList.add("input-error");
      valid = false;
    }

    return valid;
  }

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isRegistering) return;

    clearMessage(registerMessage);
    clearFormErrors(registerForm);

    if (!validateRegistration()) {
      showMessage(
        registerMessage,
        "Please correct the highlighted fields before continuing."
      );

      registerForm.querySelector(".input-error")?.focus();
      return;
    }

    const fullName = fullNameInput.value.trim();
    const nationalId = nationalIdInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const county = countyInput.value;
    const password = passwordInput.value;

    isRegistering = true;

    if (registerButton) {
      registerButton.disabled = true;
      registerButton.textContent = "Creating account...";
    }

    let accountCreated = false;
    let profileSaved = false;

    try {
      // Use persistent Firebase authentication.
      await setPersistence(auth, browserLocalPersistence);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;
      accountCreated = true;

      await updateProfile(user, { displayName: fullName });

      // These fields must match the Firestore /users security rule.
      await setDoc(doc(db, "users", user.uid), {
        userId: user.uid,
        fullName,
        nationalId: nationalId || "",
        email: user.email.toLowerCase(),
        phone,
        county,
        createdAt: serverTimestamp(),
      });

      profileSaved = true;

      // Verification email is optional; registration can continue if it fails.
      try {
        await sendEmailVerification(user);
      } catch (verificationError) {
        console.error(
          "[Registration] Verification email failed:",
          verificationError.code || verificationError.message
        );
      }

      // Require the citizen to log in explicitly after registration.
      await signOut(auth);

      registerForm.reset();
      clearFormErrors(registerForm);

      showMessage(
        registerMessage,
        "Account created successfully! You can now log in using your email and password. Check your email if you wish to verify your address.",
        "success"
      );

      if (registerButton) {
        registerButton.textContent = "Account Created";
      }
    } catch (error) {
      console.error("[Registration] Error:", error.code, error.message);

      if (error.code === "auth/email-already-in-use") {
        showFieldError(
          emailInput,
          "This email already exists. Please log in or use another email."
        );

        showMessage(registerMessage, "An account already exists with this email.");
      } else if (error.code === "auth/invalid-email") {
        showFieldError(emailInput, "Please enter a valid email address.");
        showMessage(registerMessage, "Please correct your email address.");
      } else if (error.code === "auth/weak-password") {
        showFieldError(passwordInput, "Please choose a stronger password.");
        showMessage(registerMessage, "Please choose a stronger password.");
      } else if (error.code === "auth/operation-not-allowed") {
        showMessage(
          registerMessage,
          "Email and password registration is disabled in Firebase Authentication."
        );
      } else if (error.code === "auth/network-request-failed") {
        showMessage(
          registerMessage,
          "Network error. Check your internet connection and try again."
        );
      } else if (error.code === "auth/too-many-requests") {
        showMessage(
          registerMessage,
          "Too many attempts. Please wait a while and try again."
        );
      } else if (accountCreated && !profileSaved) {
        showMessage(
          registerMessage,
          "Your authentication account was created, but saving your profile failed. Do not register again with this email. Check your Firestore security rules."
        );
      } else if (accountCreated && profileSaved) {
        showMessage(
          registerMessage,
          "Your account and profile were saved, but sign-out failed. Please log out before sharing this device."
        );
      } else {
        showMessage(
          registerMessage,
          "Registration failed. Please check your details and try again."
        );
      }
    } finally {
      isRegistering = false;

      if (registerButton && registerButton.isConnected) {
        registerButton.disabled = false;

        if (registerButton.textContent !== "Account Created") {
          registerButton.textContent = "Create Account";
        }
      }
    }
  });
}

// ========================================
// LOGIN: ADMIN / CITIZEN REDIRECT
// ========================================

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const resetMessage = document.getElementById("reset-message");
const forgotPasswordLink = document.getElementById("forgot-password");

if (loginForm) {
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const loginButton = loginForm.querySelector('button[type="submit"]');

  let isLoggingIn = false;

  [emailInput, passwordInput].forEach((input) => {
    input?.addEventListener("input", () => {
      clearFieldError(input);
      clearMessage(loginMessage);
    });
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isLoggingIn) return;

    clearMessage(loginMessage);
    clearFieldError(emailInput);
    clearFieldError(passwordInput);

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email) {
      showFieldError(emailInput, "Please enter your email address.");
      emailInput.focus();
      return;
    }

    if (!emailInput.validity.valid) {
      showFieldError(emailInput, "Please enter a valid email address.");
      emailInput.focus();
      return;
    }

    if (!password) {
      showFieldError(passwordInput, "Please enter your password.");
      passwordInput.focus();
      return;
    }

    isLoggingIn = true;

    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = "Logging in...";
    }

    try {
      // Set persistence BEFORE signing in.
      await setPersistence(auth, browserLocalPersistence);

      // This resolves only after Firebase successfully authenticates the user.
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = credential.user;

      const isAdmin =
        user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      const destination = isAdmin
        ? "./admin.html"
        : "./dashboard.html";

      console.log("[Login] Successful:", user.email);
      console.log("[Login] User UID:", user.uid);
      console.log("[Login] Destination:", destination);

      showMessage(
        loginMessage,
        "Login successful! Redirecting...",
        "success"
      );

      // Navigate immediately. Do not wait for a second auth-state callback.
      window.location.assign(destination);
    } catch (error) {
      console.error("[Login] Error:", error.code, error.message);

      const errorMessages = {
        "auth/invalid-credential":
          "Incorrect email or password. Check your details and try again.",
        "auth/invalid-email":
          "Please enter a valid email address.",
        "auth/user-disabled":
          "This account has been disabled. Contact the administrator.",
        "auth/too-many-requests":
          "Too many login attempts. Please wait a while and try again.",
        "auth/network-request-failed":
          "Network error. Check your internet connection and try again.",
        "auth/operation-not-allowed":
          "Email and password login is disabled in Firebase Authentication.",
      };

      showMessage(
        loginMessage,
        errorMessages[error.code] ||
          "Login failed. Please check your details and try again.",
        "error"
      );

      isLoggingIn = false;

      if (loginButton && loginButton.isConnected) {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
      }
    }
  });
}

// ========================================
// FORGOT PASSWORD
// ========================================

if (forgotPasswordLink) {
  forgotPasswordLink.addEventListener("click", async (event) => {
    event.preventDefault();

    clearMessage(loginMessage);
    clearMessage(resetMessage);

    const emailInput = document.getElementById("login-email");
    const email = emailInput?.value.trim().toLowerCase();

    if (!email) {
      showMessage(
        resetMessage,
        "Enter your email address in the Email Address field first."
      );

      emailInput?.focus();
      return;
    }

    if (!emailInput.validity.valid) {
      showFieldError(emailInput, "Please enter a valid email address.");
      emailInput.focus();

      showMessage(
        resetMessage,
        "Please correct your email address before requesting a reset link."
      );

      return;
    }

    forgotPasswordLink.style.pointerEvents = "none";
    forgotPasswordLink.setAttribute("aria-disabled", "true");
    forgotPasswordLink.textContent = "Sending reset link...";

    try {
      await sendPasswordResetEmail(auth, email);

      showMessage(
        resetMessage,
        "If an account matches this email address, a password-reset link will be sent. Check your inbox and spam folder.",
        "success"
      );
    } catch (error) {
      console.error("[Password Reset] Error:", error.code, error.message);

      const resetErrors = {
        "auth/invalid-email":
          "Please enter a valid email address.",
        "auth/too-many-requests":
          "Too many requests. Please wait before trying again.",
        "auth/network-request-failed":
          "Network error. Check your internet connection and try again.",
        "auth/operation-not-allowed":
          "Password reset is unavailable because email/password authentication is disabled.",
      };

      showMessage(
        resetMessage,
        resetErrors[error.code] ||
          "We couldn't process the reset request right now. Please try again later."
      );
    } finally {
      forgotPasswordLink.style.pointerEvents = "";
      forgotPasswordLink.removeAttribute("aria-disabled");
      forgotPasswordLink.textContent = "Forgot password?";
    }
  });
}

console.log("Kenyan Voice: Authentication module loaded successfully.");
