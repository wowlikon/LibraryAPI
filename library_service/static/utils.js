const Utils = {
  escapeHtml: (text) => {
    if (!text) return "";
    return text.replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m];
    });
  },

  showToast: (message, type = "info") => {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    const colors =
      type === "error"
        ? "bg-red-500"
        : type === "success"
          ? "bg-green-500"
          : "bg-blue-500";
    el.className = `${colors} text-white px-6 py-3 rounded shadow-lg transform transition-all duration-300 translate-y-10 opacity-0 mb-3`;
    el.textContent = message;

    container.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.remove("translate-y-10", "opacity-0");
    });

    setTimeout(() => {
      el.classList.add("translate-y-10", "opacity-0");
      setTimeout(() => el.remove(), 300);
    }, 3000);
  },

  getGravatarUrl: async (email) => {
    if (!email) return "";
    const msgBuffer = new TextEncoder().encode(email.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `https://www.gravatar.com/avatar/${hashHex}?d=identicon&s=200`;
  },
};

const Api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("access_token");
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    try {
      const response = await fetch(endpoint, config);
      if (response.status === 401) {
        Auth.logout();
        return null;
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      return response.json();
    } catch (error) {
      throw error;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  postForm(endpoint, formData) {
    return this.request(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
  },
};

const Auth = {
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.reload();
  },

  init: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const user = await Api.get("/api/auth/me");
      if (user) {
        document.dispatchEvent(new CustomEvent("auth:login", { detail: user }));
      }
    } catch (e) {
      console.error("Auth check failed", e);
    }
  },
};
