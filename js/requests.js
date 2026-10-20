import { auth, db } from "./firebase-config.js";

import {
  addDoc,
  collection,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "xxiptswg";
const CLOUDINARY_UPLOAD_PRESET = "kenyan_voice_uploads";

// Form elements
const requestForm = document.getElementById("request-form");
const message = document.getElementById("request-form-message");
const submitButton = document.getElementById("submit-request-button");

// Confirmation popup elements
const confirmModal = document.getElementById("request-confirm-modal");
const confirmCategory = document.getElementById("confirm-category");
const confirmLocation = document.getElementById("confirm-location");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmSubmit = document.getElementById("confirm-submit");

// Form input elements
const categoryInput = document.getElementById("request-category");
const locationInput = document.getElementById("request-location");
const descriptionInput = document.getElementById("request-description");
const imageInput = document.getElementById("request-image");

let isSubmitting = false;

// Display messages to the citizen
function showMessage(text, type = "error") {
  if (!message) return;

  message.textContent = text;
  message.className = `form-message ${type}`;
  message.hidden = false;
}

// Hide messages
function clearMessage() {
  if (!message) return;

  message.textContent = "";
  message.hidden = true;
}

// Open the confirmation popup
function openConfirmationModal() {
  if (!confirmModal) {
    showMessage("The confirmation popup could not be found.");
    return;
  }

  if (confirmCategory) {
    confirmCategory.textContent = categoryInput.value;
  }

  if (confirmLocation) {
    confirmLocation.textContent = locationInput.value.trim();
  }

  if (typeof confirmModal.showModal === "function") {
    if (!confirmModal.open) {
      confirmModal.showModal();
    }
  } else {
    confirmModal.hidden = false;
    confirmModal.style.display = "block";
  }
}

// Close the confirmation popup
function closeConfirmationModal() {
  if (!confirmModal) return;

  if (typeof confirmModal.close === "function" && confirmModal.open) {
    confirmModal.close();
  } else {
    confirmModal.hidden = true;
    confirmModal.style.display = "none";
  }
}

// Validate an optional image
function validateImage(file) {
  if (!file) return null;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  const maxSize = 5 * 1024 * 1024; // 5 MB

  if (!allowedTypes.includes(file.type)) {
    return "Please upload a JPEG, PNG, or WebP image.";
  }

  if (file.size > maxSize) {
    return "Your image must not exceed 5 MB.";
  }

  return null;
}

// Upload an image to Cloudinary
async function uploadImage(file) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || "The image upload failed.");
  }

  if (!result.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return result.secure_url;
}

// Step 1: Validate the form and ask for confirmation
if (requestForm) {
  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearMessage();

    if (!auth.currentUser) {
      showMessage("Please log in before submitting a request.");
      return;
    }

    const category = categoryInput?.value.trim();
    const location = locationInput?.value.trim();
    const description = descriptionInput?.value.trim();
    const imageFile = imageInput?.files?.[0] || null;

    if (!category || !location || !description) {
      showMessage("Please complete all required fields.");
      return;
    }

    if (description.length < 10) {
      showMessage("Please describe your issue in at least 10 characters.");
      return;
    }

    const imageError = validateImage(imageFile);

    if (imageError) {
      showMessage(imageError);
      return;
    }

    openConfirmationModal();
  });
}

// Step 2: Upload the optional image and save the request
if (confirmSubmit) {
  confirmSubmit.addEventListener("click", async () => {
    if (isSubmitting) return;

    const user = auth.currentUser;

    if (!user) {
      closeConfirmationModal();
      showMessage("Your session has ended. Please log in again.");
      return;
    }

    const category = categoryInput.value.trim();
    const location = locationInput.value.trim();
    const description = descriptionInput.value.trim();
    const imageFile = imageInput?.files?.[0] || null;

    // Validate again before saving
    if (!category || !location || !description) {
      closeConfirmationModal();
      showMessage("Please complete all required fields.");
      return;
    }

    const imageError = validateImage(imageFile);

    if (imageError) {
      closeConfirmationModal();
      showMessage(imageError);
      return;
    }

    isSubmitting = true;
    confirmSubmit.disabled = true;

    if (submitButton) {
      submitButton.disabled = true;
    }

    if (confirmCancel) {
      confirmCancel.disabled = true;
    }

    confirmSubmit.textContent = imageFile
      ? "Uploading and submitting..."
      : "Submitting...";

    try {
      closeConfirmationModal();

      let imageUrl = "";

      // Upload only when a citizen selected an image
      if (imageFile) {
        showMessage("Uploading image...", "info");
        imageUrl = await uploadImage(imageFile);
      }

      showMessage("Saving your service request...", "info");

      // Save request details and image URL in Firestore
      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        category,
        location,
        description,
        imageUrl,
        status: "Pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showMessage(
        "✓ Request submitted successfully! Your Voice! Our Concern.",
        "success",
      );

      requestForm.reset();
    } catch (error) {
      console.error("Request submission error:", error);

      let errorMessage = error.message || "An unexpected error occurred.";

      if (error.code === "permission-denied") {
        errorMessage =
          "Permission denied. Please check your Firestore security rules.";
      } else if (error.code === "unavailable") {
        errorMessage =
          "The service is temporarily unavailable. Please try again.";
      }

      showMessage(`Could not submit your request: ${errorMessage}`);
    } finally {
      isSubmitting = false;
      confirmSubmit.disabled = false;

      if (submitButton) {
        submitButton.disabled = false;
      }

      if (confirmCancel) {
        confirmCancel.disabled = false;
      }

      confirmSubmit.textContent = "Confirm & Submit";
    }
  });
}

// Cancel submission
if (confirmCancel) {
  confirmCancel.addEventListener("click", () => {
    if (!isSubmitting) {
      closeConfirmationModal();
    }
  });
}
