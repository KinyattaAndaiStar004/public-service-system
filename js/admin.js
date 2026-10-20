import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const ADMIN_EMAIL = "dorrohstar@gmail.com";

const totalCount = document.getElementById("total-requests-count");
const pendingCount = document.getElementById("pending-requests-count");
const progressCount = document.getElementById("in-progress-count");
const resolvedCount = document.getElementById("resolved-count");

const tableBody = document.getElementById("admin-requests-table-body");
const requestCountLabel = document.getElementById("request-count-label");
const tableNote = document.getElementById("table-note");

const searchInput = document.getElementById("request-search");
const categoryFilter = document.getElementById("category-filter");
const statusFilter = document.getElementById("status-filter");
const logoutLink = document.querySelector(".logout-link");

const detailsModal = document.getElementById("request-details-modal");
const detailsContent = document.getElementById("request-details-content");
const closeDetailsButton = document.getElementById("close-request-details");
const detailsStatusSelect = document.getElementById("details-status-select");
const saveStatusButton = document.getElementById("save-request-status");
const detailsStatusMessage = document.getElementById("details-status-message");

let allRequests = [];
let citizenDetails = new Map();
let requestsUnsubscribe = null;
let isAdmin = false;
let selectedRequestId = null;
let isSavingStatus = false;
let redirecting = false;

function showTableMessage(message) {
  if (!tableBody) {
    console.error("[Admin] Request table body is missing.");
    return;
  }

  tableBody.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = 7;
  cell.className = "empty-state";
  cell.textContent = message;

  row.appendChild(cell);
  tableBody.appendChild(row);
}

function setText(element, value) {
  if (element) element.textContent = value;
}

function formatDate(timestamp) {
  if (!timestamp) return "Not available";

  const date =
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateValue(timestamp) {
  if (!timestamp) return 0;

  if (typeof timestamp.toMillis === "function") {
    return timestamp.toMillis();
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function createStatusBadge(status) {
  const badge = document.createElement("span");
  badge.classList.add("status-badge");

  if (status === "Pending") {
    badge.classList.add("status-pending");
  } else if (status === "In Progress") {
    badge.classList.add("status-progress");
  } else if (status === "Resolved") {
    badge.classList.add("status-resolved");
  }

  badge.textContent = status || "Pending";
  return badge;
}

function updateStatistics(requests) {
  setText(totalCount, requests.length);

  setText(
    pendingCount,
    requests.filter((request) => (request.status || "Pending") === "Pending")
      .length,
  );

  setText(
    progressCount,
    requests.filter((request) => request.status === "In Progress").length,
  );

  setText(
    resolvedCount,
    requests.filter((request) => request.status === "Resolved").length,
  );
}

async function loadCitizenDetails() {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    citizenDetails.clear();

    snapshot.forEach((userDoc) => {
      const user = userDoc.data();

      const name =
        user.fullName ||
        user.name ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.email ||
        "Registered citizen";

      citizenDetails.set(userDoc.id, {
        name,
        email: user.email || "",
        phone: user.phone || "",
        county: user.county || "",
      });
    });
  } catch (error) {
    console.error("[Admin] Could not load citizen profiles:", error);
    throw error;
  }
}

function getCitizen(request) {
  const citizen = citizenDetails.get(request.userId);

  if (citizen) return citizen.name;

  return request.userId
    ? `Citizen (${request.userId.slice(0, 8)})`
    : "Unknown citizen";
}

function createCell(value, label) {
  const cell = document.createElement("td");
  cell.dataset.label = label;
  cell.textContent = value;
  return cell;
}

function addDetailField(container, label, value) {
  const field = document.createElement("div");
  field.className = "request-detail-field";

  const heading = document.createElement("strong");
  heading.textContent = label;

  const content = document.createElement("p");
  content.textContent = value || "Not provided";

  field.append(heading, content);
  container.appendChild(field);
}

function openRequestDetails(request) {
  if (
    !detailsModal ||
    !detailsContent ||
    !detailsStatusSelect ||
    !saveStatusButton
  ) {
    console.error("[Admin] Request details modal elements are missing.");
    return;
  }

  selectedRequestId = request.id;
  detailsContent.replaceChildren();

  const citizen = citizenDetails.get(request.userId) || {};
  const status = request.status || "Pending";

  const id = document.createElement("p");
  id.className = "request-detail-id";
  id.textContent = `Request ID: ${request.id}`;
  detailsContent.appendChild(id);

  const grid = document.createElement("div");
  grid.className = "request-details-grid";

  addDetailField(grid, "Category", request.category);
  addDetailField(grid, "Location", request.location);
  addDetailField(grid, "Citizen name", citizen.name || getCitizen(request));
  addDetailField(grid, "Citizen email", citizen.email);
  addDetailField(grid, "Citizen phone", citizen.phone);
  addDetailField(grid, "County", citizen.county);
  addDetailField(grid, "Date submitted", formatDate(request.createdAt));
  addDetailField(grid, "Last updated", formatDate(request.updatedAt));
  addDetailField(grid, "Current status", status);

  detailsContent.appendChild(grid);

  const descriptionHeading = document.createElement("h3");
  descriptionHeading.textContent = "Issue Description";
  detailsContent.appendChild(descriptionHeading);

  const description = document.createElement("p");
  description.className = "request-detail-description";
  description.textContent = request.description || "No description provided.";
  detailsContent.appendChild(description);

  if (request.imageUrl) {
    const imageHeading = document.createElement("h3");
    imageHeading.textContent = "Attached Image";
    detailsContent.appendChild(imageHeading);

    const image = document.createElement("img");
    image.className = "request-detail-image";
    image.src = request.imageUrl;
    image.alt = "Image attached to this public service request";
    image.loading = "lazy";

    image.addEventListener("error", () => {
      image.hidden = true;
    });

    detailsContent.appendChild(image);

    const imageLink = document.createElement("a");
    imageLink.href = request.imageUrl;
    imageLink.target = "_blank";
    imageLink.rel = "noopener noreferrer";
    imageLink.textContent = "Open full-size image";
    detailsContent.appendChild(imageLink);
  } else {
    const noImage = document.createElement("p");
    noImage.textContent = "No image was attached to this request.";
    detailsContent.appendChild(noImage);
  }

  detailsStatusSelect.value = status;
  detailsStatusMessage && (detailsStatusMessage.textContent = "");
  saveStatusButton.disabled = false;
  saveStatusButton.textContent = "Save Status";

  detailsModal.hidden = false;
  document.body.classList.add("request-modal-open");
  closeDetailsButton?.focus();
}

function closeRequestDetails() {
  if (!detailsModal || isSavingStatus) return;

  detailsModal.hidden = true;
  document.body.classList.remove("request-modal-open");
  selectedRequestId = null;
}

closeDetailsButton?.addEventListener("click", closeRequestDetails);

detailsModal?.addEventListener("click", (event) => {
  if (event.target === detailsModal) closeRequestDetails();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && detailsModal && !detailsModal.hidden) {
    closeRequestDetails();
  }
});

saveStatusButton?.addEventListener("click", async () => {
  if (!isAdmin || !auth.currentUser || !selectedRequestId || isSavingStatus) {
    return;
  }

  const request = allRequests.find((item) => item.id === selectedRequestId);

  if (!request) {
    setText(
      detailsStatusMessage,
      "Request not found. Close this window and open it again.",
    );
    return;
  }

  const newStatus = detailsStatusSelect.value;
  const allowedStatuses = ["Pending", "In Progress", "Resolved"];

  if (!allowedStatuses.includes(newStatus)) {
    setText(detailsStatusMessage, "Please select a valid status.");
    return;
  }

  if ((request.status || "Pending") === newStatus) {
    setText(detailsStatusMessage, "The request already has this status.");
    return;
  }

  isSavingStatus = true;

  saveStatusButton.disabled = true;
  detailsStatusSelect.disabled = true;
  saveStatusButton.textContent = "Saving...";
  setText(detailsStatusMessage, "");

  try {
    await updateDoc(doc(db, "requests", selectedRequestId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    setText(
      detailsStatusMessage,
      `Request status successfully updated to ${newStatus}.`,
    );

    setText(tableNote, `Request status updated to "${newStatus}".`);
  } catch (error) {
    console.error("[Admin] Status update failed:", error);

    setText(
      detailsStatusMessage,
      error.code === "permission-denied"
        ? "Permission denied. Check your Firestore admin security rules."
        : "Could not update the status. Please try again.",
    );
  } finally {
    isSavingStatus = false;

    saveStatusButton.disabled = false;
    detailsStatusSelect.disabled = false;
    saveStatusButton.textContent = "Save Status";
  }
});

function createRequestRow(request) {
  const row = document.createElement("tr");
  row.classList.add("clickable-request-row");
  row.tabIndex = 0;
  row.setAttribute("aria-label", `View request ${request.id}`);

  const idCell = createCell(request.id.slice(0, 8), "Request ID");
  idCell.title = request.id;
  row.appendChild(idCell);

  const citizen = citizenDetails.get(request.userId);
  const citizenCell = createCell(getCitizen(request), "Citizen");

  if (citizen?.email) citizenCell.title = citizen.email;
  row.appendChild(citizenCell);

  row.appendChild(createCell(request.category || "Other", "Category"));
  row.appendChild(createCell(request.location || "Not provided", "Location"));
  row.appendChild(createCell(formatDate(request.createdAt), "Date Submitted"));

  const statusCell = document.createElement("td");
  statusCell.dataset.label = "Status";
  statusCell.appendChild(createStatusBadge(request.status || "Pending"));
  row.appendChild(statusCell);

  const actionCell = document.createElement("td");
  actionCell.dataset.label = "Action";

  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.className = "action-button view-request-button";
  viewButton.textContent = "View Request";

  viewButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openRequestDetails(request);
  });

  actionCell.appendChild(viewButton);
  row.appendChild(actionCell);

  row.addEventListener("click", () => openRequestDetails(request));

  row.addEventListener("keydown", (event) => {
    if (event.target !== row) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRequestDetails(request);
    }
  });

  return row;
}

function renderRequests() {
  if (!tableBody) return;

  const searchTerm = (searchInput?.value || "").trim().toLowerCase();
  const selectedCategory = categoryFilter?.value || "";
  const selectedStatus = statusFilter?.value || "";

  const filteredRequests = allRequests.filter((request) => {
    const citizen = getCitizen(request);
    const email = citizenDetails.get(request.userId)?.email || "";

    const searchableText = [
      request.id,
      citizen,
      email,
      request.category,
      request.location,
      request.description,
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchableText.includes(searchTerm) &&
      (!selectedCategory || request.category === selectedCategory) &&
      (!selectedStatus || (request.status || "Pending") === selectedStatus)
    );
  });

  tableBody.replaceChildren();

  if (filteredRequests.length === 0) {
    showTableMessage(
      allRequests.length === 0
        ? "No public service requests have been submitted yet."
        : "No requests match your search or filters.",
    );
  } else {
    filteredRequests.forEach((request) => {
      tableBody.appendChild(createRequestRow(request));
    });
  }

  setText(requestCountLabel, `Requests: ${filteredRequests.length}`);
  setText(
    tableNote,
    `Showing ${filteredRequests.length} of ${allRequests.length} requests.`,
  );
}

function listenForRequests() {
  if (requestsUnsubscribe) {
    requestsUnsubscribe();
    requestsUnsubscribe = null;
  }

  showTableMessage("Loading requests from Firebase...");

  requestsUnsubscribe = onSnapshot(
    collection(db, "requests"),
    (snapshot) => {
      if (
        !isAdmin ||
        auth.currentUser?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        return;
      }

      allRequests = snapshot.docs.map((requestDoc) => ({
        id: requestDoc.id,
        ...requestDoc.data(),
      }));

      allRequests.sort(
        (a, b) => getDateValue(b.createdAt) - getDateValue(a.createdAt),
      );

      updateStatistics(allRequests);
      renderRequests();

      if (
        selectedRequestId &&
        detailsModal &&
        !detailsModal.hidden &&
        !isSavingStatus
      ) {
        const selected = allRequests.find(
          (request) => request.id === selectedRequestId,
        );

        if (selected) {
          openRequestDetails(selected);
        } else {
          closeRequestDetails();
        }
      }
    },
    (error) => {
      console.error("[Admin] Firestore listener error:", error);

      showTableMessage(
        error.code === "permission-denied"
          ? "Access denied. Check your Firestore security rules and administrator account."
          : "Could not load requests. Check your internet connection and Firebase configuration.",
      );
    },
  );
}

searchInput?.addEventListener("input", renderRequests);
categoryFilter?.addEventListener("change", renderRequests);
statusFilter?.addEventListener("change", renderRequests);

logoutLink?.addEventListener("click", async (event) => {
  event.preventDefault();

  if (requestsUnsubscribe) {
    requestsUnsubscribe();
    requestsUnsubscribe = null;
  }

  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("[Admin] Logout failed:", error);
    setText(tableNote, "Logout failed. Please try again.");
  }
});

onAuthStateChanged(auth, async (user) => {
  console.log(
    "[Admin] Auth state:",
    user ? `Signed in as ${user.email}` : "No signed-in user",
  );

  if (!user) {
    isAdmin = false;

    if (requestsUnsubscribe) {
      requestsUnsubscribe();
      requestsUnsubscribe = null;
    }

    if (!redirecting) {
      redirecting = true;
      console.warn("[Admin] Redirecting to login.html");
      window.location.replace("login.html");
    }

    return;
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    isAdmin = false;
    console.warn("[Admin] Signed-in account is not the administrator.");

    if (!redirecting) {
      redirecting = true;
      window.location.replace("dashboard.html");
    }

    return;
  }

  redirecting = false;
  isAdmin = true;

  try {
    await loadCitizenDetails();

    // Check that the same admin remains signed in after loading profiles.
    if (
      !auth.currentUser ||
      auth.currentUser.uid !== user.uid ||
      auth.currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ) {
      console.warn("[Admin] Authentication changed during initialization.");
      return;
    }

    listenForRequests();
  } catch (error) {
    console.error("[Admin] Initialization failed:", error);
    showTableMessage(
      "The admin dashboard could not be initialized. Check Firestore permissions.",
    );
  }
});

console.log("[Admin] Module loaded.");
