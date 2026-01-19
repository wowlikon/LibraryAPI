$(document).ready(() => {
  const token = StorageHelper.get("access_token");
  if (!token) {
    window.location.href = "/auth";
    return;
  }

  let currentUsername = "";
  let currentRecoveryCodes = [];

  loadProfile();

  function loadProfile() {
    Promise.all([
      Api.get("/api/auth/me"),
      Api.get("/api/users/roles").catch(() => ({ roles: [] })),
      Api.get("/api/auth/recovery-codes/status").catch(() => null),
    ])
      .then(async ([user, rolesData, recoveryStatus]) => {
        document.title = `LiB - ${user.full_name || user.username}`;
        currentUsername = user.username;

        await renderProfileHeader(user);
        renderInfo(user);
        renderRoles(user.roles || [], rolesData.roles || []);

        window.dispatchEvent(
          new CustomEvent("update-2fa", { detail: user.is_2fa_enabled }),
        );

        if (recoveryStatus) {
          window.dispatchEvent(
            new CustomEvent("update-recovery-codes", {
              detail: recoveryStatus.remaining,
            }),
          );
        }

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

  $("#recovery-codes-btn").on("click", function () {
    resetRecoveryCodesModal();
    window.dispatchEvent(new CustomEvent("open-recovery-codes-modal"));
    loadRecoveryCodesStatus();
  });

  function resetRecoveryCodesModal() {
    $("#recovery-codes-loading").removeClass("hidden");
    $("#recovery-codes-status").addClass("hidden");
    $("#recovery-codes-display").addClass("hidden");
    $("#codes-saved-checkbox").prop("checked", false);
    $("#close-recovery-modal-btn").prop("disabled", true);
    $("#regenerate-codes-btn")
      .prop("disabled", false)
      .text("Сгенерировать новые коды");
    currentRecoveryCodes = [];
  }

  async function loadRecoveryCodesStatus() {
    try {
      const status = await Api.get("/api/auth/recovery-codes/status");
      renderRecoveryCodesStatus(status);
    } catch (error) {
      Utils.showToast(
        error.message || "Ошибка загрузки статуса кодов",
        "error",
      );
      window.dispatchEvent(new CustomEvent("close-recovery-codes-modal"));
    }
  }

  function renderRecoveryCodesStatus(status) {
    const { total, remaining, used_codes, generated_at, should_regenerate } =
      status;

    let iconBgClass, iconColorClass, iconSvg;
    if (remaining <= 2) {
      iconBgClass = "bg-red-100";
      iconColorClass = "text-red-600";
      iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`;
    } else if (remaining <= 5) {
      iconBgClass = "bg-yellow-100";
      iconColorClass = "text-yellow-600";
      iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />`;
    } else {
      iconBgClass = "bg-green-100";
      iconColorClass = "text-green-600";
      iconSvg = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />`;
    }

    $("#status-icon-container")
      .removeClass()
      .addClass(
        `flex items-center justify-center w-12 h-12 mx-auto rounded-full mb-4 ${iconBgClass}`,
      )
      .html(
        `<svg class="w-6 h-6 ${iconColorClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconSvg}</svg>`,
      );

    let statusColorClass;
    if (remaining <= 2) {
      statusColorClass = "text-red-600";
    } else if (remaining <= 5) {
      statusColorClass = "text-yellow-600";
    } else {
      statusColorClass = "text-green-600";
    }

    $("#codes-status-summary").html(`
      <p class="text-sm text-gray-600">
        Доступно кодов: <strong class="${statusColorClass}">${remaining}</strong> из <strong>${total}</strong>
      </p>
    `);

    const $list = $("#codes-status-list");
    $list.empty();

    used_codes.forEach((used, index) => {
      const codeDisplay = "████-████-████-████";
      const statusClass = used
        ? "text-gray-300 line-through"
        : "text-green-600";
      const statusIcon = used ? "✗" : "✓";
      const bgClass = used ? "bg-gray-50" : "bg-green-50";

      $list.append(`
        <div class="flex items-center justify-between py-1 px-2 rounded ${bgClass}">
          <span class="font-mono text-sm ${statusClass}">${index + 1}. ${codeDisplay}</span>
          <span class="${used ? "text-gray-400" : "text-green-600"}">${statusIcon}</span>
        </div>
      `);
    });

    if (should_regenerate || remaining <= 2) {
      let warningText;
      if (remaining === 0) {
        warningText =
          "У вас не осталось резервных кодов! Срочно сгенерируйте новые.";
      } else if (remaining <= 2) {
        warningText = "Осталось мало кодов. Рекомендуем сгенерировать новые.";
      } else {
        warningText = "Рекомендуем сгенерировать новые коды для безопасности.";
      }
      $("#warning-text").text(warningText);
      $("#codes-warning").removeClass("hidden");
    } else {
      $("#codes-warning").addClass("hidden");
    }

    if (generated_at) {
      const date = new Date(generated_at);
      $("#codes-generated-at").text(`Сгенерированы: ${date.toLocaleString()}`);
    }

    $("#recovery-codes-loading").addClass("hidden");
    $("#recovery-codes-status").removeClass("hidden");
  }

  $("#regenerate-codes-btn").on("click", async function () {
    const $btn = $(this);
    $btn.prop("disabled", true).text("Генерация...");

    try {
      const response = await Api.post("/api/auth/recovery-codes/regenerate");

      currentRecoveryCodes = response.codes;
      displayNewRecoveryCodes(response.codes, response.generated_at);

      window.dispatchEvent(
        new CustomEvent("update-recovery-codes", {
          detail: response.codes.length,
        }),
      );

      Utils.showToast("Новые коды успешно сгенерированы", "success");
    } catch (error) {
      Utils.showToast(error.message || "Ошибка генерации кодов", "error");
      $btn.prop("disabled", false).text("Сгенерировать новые коды");
    }
  });

  function displayNewRecoveryCodes(codes, generatedAt) {
    const $list = $("#recovery-codes-list");
    $list.empty();

    codes.forEach((code, index) => {
      $list.append(`
        <div class="py-1 px-2 bg-white rounded border select-all font-mono text-gray-800">
          ${index + 1}. ${Utils.escapeHtml(code)}
        </div>
      `);
    });

    if (generatedAt) {
      const date = new Date(generatedAt);
      $("#recovery-codes-generated-at").text(
        `Сгенерированы: ${date.toLocaleString()}`,
      );
    }

    $("#recovery-codes-status").addClass("hidden");
    $("#recovery-codes-display").removeClass("hidden");
  }

  $("#codes-saved-checkbox").on("change", function () {
    $("#close-recovery-modal-btn").prop("disabled", !this.checked);
  });

  $("#copy-codes-btn").on("click", function () {
    if (currentRecoveryCodes.length === 0) return;

    const codesText = currentRecoveryCodes.join("\n");
    navigator.clipboard.writeText(codesText).then(() => {
      const $btn = $(this);
      const originalHtml = $btn.html();
      $btn.html(`
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Скопировано!</span>
      `);
      setTimeout(() => $btn.html(originalHtml), 2000);
      Utils.showToast("Коды скопированы в буфер обмена", "success");
    });
  });

  $("#download-codes-btn").on("click", function () {
    if (currentRecoveryCodes.length === 0) return;

    const username = currentUsername || "user";
    const codesText = `Резервные коды для аккаунта: ${username}
Дата: ${new Date().toLocaleString()}

${currentRecoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Храните эти коды в надёжном месте!
Каждый код можно использовать только один раз.`;

    const blob = new Blob([codesText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recovery-codes-${username}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Utils.showToast("Файл с кодами скачан", "success");
  });

  $("#close-recovery-modal-btn, #close-status-modal-btn").on(
    "click",
    function () {
      window.dispatchEvent(new CustomEvent("close-recovery-codes-modal"));
    },
  );

  $("#submit-disable-2fa-btn").on("click", async function () {
    const $btn = $(this);
    const password = $("#disable-2fa-password").val();

    if (!password) {
      Utils.showToast("Введите пароль", "error");
      return;
    }

    $btn.prop("disabled", true).text("Отключение...");

    try {
      await Api.post("/api/auth/2fa/disable", { password });
      Utils.showToast("2FA успешно отключена", "success");
      window.dispatchEvent(new CustomEvent("update-2fa", { detail: false }));
      window.dispatchEvent(new CustomEvent("close-disable-2fa-modal"));

      $("#disable-2fa-form")[0].reset();
    } catch (error) {
      Utils.showToast(error.message || "Ошибка отключения 2FA", "error");
    } finally {
      $btn.prop("disabled", false).text("Отключить");
    }
  });

  $("#submit-password-btn").on("click", async function () {
    const $btn = $(this);
    const newPass = $("#new-password").val();
    const confirm = $("#confirm-password").val();

    if (newPass !== confirm) {
      Utils.showToast("Пароли не совпадают", "error");
      return;
    }

    if (newPass.length < 8) {
      Utils.showToast("Пароль должен быть минимум 8 символов", "error");
      return;
    }

    $btn.prop("disabled", true).text("Сохранение...");

    try {
      await Api.put("/api/auth/me", { password: newPass });

      Utils.showToast("Пароль успешно изменён", "success");

      window.dispatchEvent(new CustomEvent("close-password-modal"));

      $("#change-password-form")[0].reset();
    } catch (error) {
      Utils.showToast(error.message || "Ошибка смены пароля", "error");
    } finally {
      $btn.prop("disabled", false).text("Сменить");
    }
  });
});
