const StorageHelper = {
  get: (key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  },
  getCurrentStorage: () => {
    return localStorage.getItem("refresh_token")
      ? localStorage
      : sessionStorage;
  },
  clearAll: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user");
  },
};

const Utils = {
  escapeHtml: (text) => {
    if (!text) return "";
    return text.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[m],
    );
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
  getBaseUrl() {
    return window.location.origin;
  },

  async request(endpoint, options = {}) {
    const fullUrl = this.getBaseUrl() + endpoint;
    const token = StorageHelper.get("access_token");

    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    try {
      const response = await fetch(fullUrl, config);

      const isLoginRequest = endpoint.includes("/auth/token");

      if (response.status === 401 && !isLoginRequest) {
        const refreshed = await Auth.tryRefresh();
        if (refreshed) {
          headers["Authorization"] =
            `Bearer ${StorageHelper.get("access_token")}`;
          const retryResponse = await fetch(fullUrl, { ...options, headers });
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
        Auth.logout();
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            errorData.error_description ||
            `Ошибка ${response.status}`,
        );
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

  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
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
    StorageHelper.clearAll();
    window.location.href = "/";
  },

  tryRefresh: async () => {
    const refreshToken = StorageHelper.get("refresh_token");
    if (!refreshToken) return false;

    const activeStorage = StorageHelper.getCurrentStorage();

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        activeStorage.setItem("access_token", data.access_token);
        activeStorage.setItem("refresh_token", data.refresh_token);
        return true;
      }
    } catch (e) {
      console.error("Refresh failed:", e);
    }
    return false;
  },

  init: async () => {
    const token = StorageHelper.get("access_token");
    const refreshToken = StorageHelper.get("refresh_token");

    if (!token && !refreshToken) {
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      return null;
    }

    const activeStorage = StorageHelper.getCurrentStorage();

    try {
      let response = await fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + token },
      });

      if (response.status === 401 && refreshToken) {
        const refreshed = await Auth.tryRefresh();
        if (refreshed) {
          response = await fetch("/api/auth/me", {
            headers: {
              Authorization: "Bearer " + StorageHelper.get("access_token"),
            },
          });
        }
      }

      if (response.ok) {
        const user = await response.json();
        activeStorage.setItem("user", JSON.stringify(user));
        document.dispatchEvent(new CustomEvent("auth:login", { detail: user }));
        return user;
      }
    } catch (e) {
      console.error("Auth check failed", e);
    }

    StorageHelper.clearAll();
    return null;
  },
};

window.getUser = function () {
  const userJson = StorageHelper.get("user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
};

window.hasRole = function (roleName) {
  const user = window.getUser();
  if (!user || !user.roles) {
    return false;
  }
  return user.roles.includes(roleName);
};

window.isAdmin = function () {
  return window.hasRole("admin");
};

window.isLibrarian = function () {
  return window.hasRole("librarian") || window.hasRole("admin");
};

window.isAuthenticated = function () {
  return !!window.getUser();
};

window.canManage = function () {
  return (
    (typeof window.isAdmin === "function" && window.isAdmin()) ||
    (typeof window.isLibrarian === "function" && window.isLibrarian())
  );
};
