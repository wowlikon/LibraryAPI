$(document).ready(() => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.href = "/auth";
    return;
  }

  loadProfile();

  function loadProfile() {
    Promise.all([
      Api.get("/api/auth/me"),
      Api.get("/api/auth/roles").catch(() => ({ roles: [] })),
    ])
      .then(async ([user, rolesData]) => {
        document.title = `LiB - ${user.full_name || user.username}`;
        await renderProfileHeader(user);
        renderInfo(user);
        renderRoles(user.roles || [], rolesData.roles || []);

        $("#account-section, #roles-section").removeClass("hidden");
      })
      .catch((error) => {
        console.error(error);
        Utils.showToast("Ошибка загрузки профиля", "error");
      });
  }

  async function renderProfileHeader(user) {
    const avatarUrl = await Utils.getGravatarUrl(user.email);
    const displayName = Utils.escapeHtml(user.full_name || user.username);

    $("#profile-card").html(`
            <div class="flex flex-col sm:flex-row items-center sm:items-start">
                <div class="relative mb-4 sm:mb-0 sm:mr-6">
                    <img src="${avatarUrl}" class="w-24 h-24 rounded-full object-cover border-4 border-gray-200">
                    ${user.is_verified ? '<div class="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white"><svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg></div>' : ""}
                </div>
                <div class="flex-1 text-center sm:text-left">
                    <h1 class="text-2xl font-bold text-gray-900 mb-1">${displayName}</h1>
                    <p class="text-gray-500 mb-3">@${Utils.escapeHtml(user.username)}</p>
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm ${user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}">
                        ${user.is_active ? "Активен" : "Заблокирован"}
                    </span>
                </div>
            </div>
        `);
  }

  function renderInfo(user) {
    const fields = [
      { label: "ID пользователя", value: user.id },
      { label: "Email", value: user.email },
      { label: "Полное имя", value: user.full_name || "Не указано" },
    ];

    const html = fields
      .map(
        (f) => `
            <div class="flex justify-between py-2 border-b last:border-0">
                <span class="text-gray-500">${f.label}</span>
                <span class="font-medium text-gray-900">${Utils.escapeHtml(String(f.value))}</span>
            </div>
        `,
      )
      .join("");

    $("#account-info").html(html);
  }

  function renderRoles(userRoles, allRoles) {
    const $container = $("#roles-container");
    if (userRoles.length === 0) {
      $container.html('<p class="text-gray-500">Нет ролей</p>');
      return;
    }

    const roleMap = {};
    allRoles.forEach((r) => (roleMap[r.name] = r.description));

    const html = userRoles
      .map(
        (role) => `
            <div class="p-3 bg-blue-50 border border-blue-100 rounded text-blue-800">
                <div class="font-bold capitalize">${Utils.escapeHtml(role)}</div>
                <div class="text-xs opacity-75">${Utils.escapeHtml(roleMap[role] || "")}</div>
            </div>
        `,
      )
      .join("");

    $container.html(html);
  }

  $("#submit-password-btn").on("click", async function () {
    const $btn = $(this);
    const newPass = $("#new-password").val();
    const confirm = $("#confirm-password").val();

    if (newPass !== confirm) {
      Utils.showToast("Пароли не совпадают", "error");
      return;
    }

    if (newPass.length < 4) {
      Utils.showToast("Пароль слишком короткий", "error");
      return;
    }

    $btn.prop("disabled", true).text("Меняем...");

    try {
      await Api.request("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          password: newPass,
        }),
      });

      Utils.showToast("Пароль успешно изменен", "success");
      window.dispatchEvent(new CustomEvent("close-modal"));

      $("#change-password-form")[0].reset();
    } catch (error) {
      console.error(error);
      Utils.showToast(error.message || "Ошибка смены пароля", "error");
    } finally {
      $btn.prop("disabled", false).text("Сменить");
    }
  });
});
