import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// Hide the dashboard until authentication is confirmed, so the user never
// sees a flash of the dashboard before an unavoidable redirect.
document.body.style.visibility = "hidden";

const tableBody = document.getElementById("citizen-requests-table-body");
const statusFilter = document.getElementById("citizen-status-filter");
const dashboardMessage = document.getElementById("dashboard-message");
const tableNote = document.getElementById("citizen-table-note");
const logoutLink = document.getElementById("citizen-logout");

let citizenRequests = [];
let unsubscribeRequests = null;
let currentUserId = null;
let authReady = false;
let redirectStarted = false;

function showMessage(message, type = "error") {
  if (!dashboardMessage) {
    console.error("[Dashboard]", message);
    return;
  }

  dashboardMessage.textContent = message;
  dashboardMessage.className = `citizen-form-message ${type}`;
  dashboardMessage.hidden = false;
}

function hideMessage() {
  if (!dashboardMessage) return;
  dashboardMessage.textContent = "";
  dashboardMessage.hidden = true;
}

function updateCount(id, count) {
  const element = document.getElementById(id);
  if (element) element.textContent = count;
}

function stopRequestListener() {
  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }
}

function formatDate(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return "Just submitted";
  }

  return timestamp.toDate().toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function updateStatistics(requests) {
  updateCount("citizen-total-count", requests.length);
  updateCount(
    "citizen-pending-count",
    requests.filter((r) => (r.status || "Pending") === "Pending").length,
  );
  updateCount(
    "citizen-progress-count",
    requests.filter((r) => r.status === "In Progress").length,
  );
  updateCount(
    "citizen-resolved-count",
    requests.filter((r) => r.status === "Resolved").length,
  );
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderRequests() {
  if (!tableBody) return;

  tableBody.replaceChildren();

  const selectedStatus = statusFilter?.value || "";
  const filtered = citizenRequests.filter(
    (r) => !selectedStatus || (r.status || "Pending") === selectedStatus,
  );

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 6;
    cell.className = "citizen-empty-state";
    cell.textContent = selectedStatus
      ? `No ${selectedStatus} requests found.`
      : "You have not submitted any requests yet.";

    row.appendChild(cell);
    tableBody.appendChild(row);

    if (tableNote) {
      tableNote.textContent = "Your request history updates automatically.";
    }
    return;
  }

  filtered.forEach((request) => {
    const row = document.createElement("tr");

    row.appendChild(createCell(request.id.slice(0, 8)));
    row.appendChild(createCell(request.category || "Other"));
    row.appendChild(createCell(request.location || "Not provided"));
    row.appendChild(createCell(formatDate(request.createdAt)));

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");
    const status = request.status || "Pending";

    badge.textContent = status;
    badge.className =
      "request-status status-" + status.toLowerCase().replace(/\s+/g, "-");

    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const detailsCell = document.createElement("td");
    const detailsButton = document.createElement("button");

    detailsButton.type = "button";
    detailsButton.className = "citizen-secondary-button";
    detailsButton.textContent = "View Details";

    detailsButton.addEventListener("click", () => {
      const existing = row.nextElementSibling;

      if (existing?.classList.contains("request-details-row")) {
        existing.remove();
        detailsButton.textContent = "View Details";
        return;
      }

      tableBody
        .querySelectorAll(".request-details-row")
        .forEach((item) => item.remove());
      tableBody
        .querySelectorAll(".citizen-secondary-button")
        .forEach((button) => {
          button.textContent = "View Details";
        });

      const detailsRow = document.createElement("tr");
      detailsRow.className = "request-details-row";

      const detailsCellContent = document.createElement("td");
      detailsCellContent.colSpan = 6;
      detailsCellContent.className = "request-details-content";

      const heading = document.createElement("strong");
      heading.textContent = "Request Description";

      const description = document.createElement("p");
      description.textContent =
        request.description || "No description provided.";

      detailsCellContent.append(heading, description);

      if (request.imageUrl) {
        const imageLink = document.createElement("a");
        imageLink.href = request.imageUrl;
        imageLink.target = "_blank";
        imageLink.rel = "noopener noreferrer";
        imageLink.textContent = "View attached image";
        detailsCellContent.appendChild(imageLink);
      }

      detailsRow.appendChild(detailsCellContent);
      row.after(detailsRow);
      detailsButton.textContent = "Hide Details";
    });

    detailsCell.appendChild(detailsButton);
    row.appendChild(detailsCell);
    tableBody.appendChild(row);
  });

  if (tableNote) {
    tableNote.textContent = `Showing ${filtered.length} of ${citizenRequests.length} requests.`;
  }
}

function showLoadingState() {
  if (!tableBody) return;

  tableBody.replaceChildren();

  const row = document.createElement("tr");
  const cell = document.createElement("td");

  cell.colSpan = 6;
  cell.textContent = "Loading your requests...";

  row.appendChild(cell);
  tableBody.appendChild(row);
}

function listenForCitizenRequests(user) {
  stopRequestListener();
  currentUserId = user.uid;
  citizenRequests = [];

  showLoadingState();
  hideMessage();

  const requestsQuery = query(
    collection(db, "requests"),
    where("userId", "==", user.uid),
  );

  unsubscribeRequests = onSnapshot(
    requestsQuery,
    (snapshot) => {
      if (auth.currentUser?.uid !== currentUserId) return;

      citizenRequests = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      citizenRequests.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
      );

      updateStatistics(citizenRequests);
      renderRequests();
      hideMessage();
    },
    (error) => {
      console.error("[Dashboard] Request loading failed:", error);

      showMessage(
        error.code === "permission-denied"
          ? "Access denied. Please check your Firestore security rules."
          : "Could not load your requests. Please refresh and try again.",
      );
    },
  );
}

if (statusFilter) {
  statusFilter.addEventListener("change", renderRequests);
}

if (logoutLink) {
  logoutLink.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      stopRequestListener();
      await signOut(auth);
      window.location.replace("./login.html");
    } catch (error) {
      console.error("[Dashboard] Logout failed:", error);
      showMessage("Could not log out. Please try again.");
    }
  });
}

function startDashboard() {
  onAuthStateChanged(
    auth,
    (user) => {
      authReady = true;

      console.log(
        "[Dashboard] Auth state:",
        user ? `Signed in: ${user.email}` : "No signed-in user",
      );

      if (!user) {
        stopRequestListener();
        currentUserId = null;

        if (!redirectStarted) {
          redirectStarted = true;
          console.warn("[Dashboard] No session; returning to login.");
          window.location.replace("./login.html");
        }
        return;
      }

      redirectStarted = false;

      // Session confirmed — reveal the dashboard.
      document.body.style.visibility = "visible";

      const welcome = document.getElementById("citizen-welcome-message");
      if (welcome) {
        welcome.textContent = user.displayName
          ? `Welcome, ${user.displayName}! Report public service issues and track your requests here.`
          : "Report public service issues and track your requests here.";
      }

      if (currentUserId !== user.uid || !unsubscribeRequests) {
        listenForCitizenRequests(user);
      }
    },
    (error) => {
      authReady = true;
      console.error("[Dashboard] Authentication listener failed:", error);

      // Don't leave the page permanently hidden if auth errors out.
      document.body.style.visibility = "visible";

      showMessage(
        "Authentication could not be verified. Please sign in again.",
      );
    },
  );
}

console.log("[Dashboard] Module loaded.");
startDashboard();
