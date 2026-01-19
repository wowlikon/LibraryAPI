$(() => {
  const PARTIAL_TOKEN_KEY = "partial_token";
  const PARTIAL_USERNAME_KEY = "partial_username";
  const TOTP_PERIOD = 30;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 38;

  let loginState = {
    step: "credentials",
    partialToken: null,
    username: "",
    rememberMe: false,
  };

  let registeredRecoveryCodes = [];
  let totpAnimationFrame = null;

  function getTotpProgress() {
    const now = Date.now() / 1000;
    const elapsed = now % TOTP_PERIOD;
    return elapsed / TOTP_PERIOD;
  }

  function updateTotpTimer() {
    const circle = document.getElementById("lock-progress-circle");
    if (!circle) return;

    const progress = getTotpProgress();
    const offset = CIRCLE_CIRCUMFERENCE * (1 - progress);
    circle.style.strokeDashoffset = offset;

    totpAnimationFrame = requestAnimationFrame(updateTotpTimer);
  }

  function startTotpTimer() {
    stopTotpTimer();
    updateTotpTimer();
  }

  function stopTotpTimer() {
    if (totpAnimationFrame) {
      cancelAnimationFrame(totpAnimationFrame);
      totpAnimationFrame = null;
    }
  }

  function resetCircle() {
    const circle = document.getElementById("lock-progress-circle");
    if (circle) {
      circle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
    }
  }

  function initLoginState() {
    const savedToken = sessionStorage.getItem(PARTIAL_TOKEN_KEY);
    const savedUsername = sessionStorage.getItem(PARTIAL_USERNAME_KEY);

    if (savedToken && savedUsername) {
      loginState.partialToken = savedToken;
      loginState.username = savedUsername;
      loginState.step = "2fa";

      $("#login-username").val(savedUsername);
      $("#credentials-section").addClass("hidden");
      $("#totp-section").removeClass("hidden");
      $("#login-submit").text("Подтвердить");

      startTotpTimer();

      setTimeout(() => {
        const totpInput = document.getElementById("login-totp");
        if (totpInput) totpInput.focus();
      }, 100);
    }
  }

  function savePartialToken(token, username) {
    sessionStorage.setItem(PARTIAL_TOKEN_KEY, token);
    sessionStorage.setItem(PARTIAL_USERNAME_KEY, username);
  }

  function clearPartialToken() {
    sessionStorage.removeItem(PARTIAL_TOKEN_KEY);
    sessionStorage.removeItem(PARTIAL_USERNAME_KEY);
  }

  function showForm(formId) {
    $("#login-form, #register-form, #reset-password-form").addClass("hidden");
    $(formId).removeClass("hidden");

    $("#login-tab, #register-tab")
      .removeClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500")
      .addClass("text-gray-400 hover:text-gray-600");

    if (formId === "#login-form") {
      $("#login-tab")
        .removeClass("text-gray-400 hover:text-gray-600")
        .addClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500");
      resetLoginState();
    } else if (formId === "#register-form") {
      $("#register-tab")
        .removeClass("text-gray-400 hover:text-gray-600")
        .addClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500");
    }
  }

  function resetLoginState() {
    clearPartialToken();
    stopTotpTimer();
    loginState = {
      step: "credentials",
      partialToken: null,
      username: "",
      rememberMe: false,
    };
    $("#totp-section").addClass("hidden");
    $("#login-totp").val("");
    $("#credentials-section").removeClass("hidden");
    $("#login-submit").text("Войти");
    resetCircle();
  }

  $("#login-tab").on("click", () => showForm("#login-form"));
  $("#register-tab").on("click", () => showForm("#register-form"));
  $("#forgot-password-btn").on("click", () => showForm("#reset-password-form"));
  $("#back-to-login-btn").on("click", () => showForm("#login-form"));

  $("body").on("click", ".toggle-password", function () {
    const $btn = $(this);
    const $input = $btn.siblings("input");
    const isPassword = $input.attr("type") === "password";
    $input.attr("type", isPassword ? "text" : "password");
    $btn.find("svg").toggleClass("hidden");
  });

  $("#register-password").on("input", function () {
    const password = $(this).val();
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = [
      { width: "0%", color: "", text: "" },
      { width: "20%", color: "bg-red-500", text: "Очень слабый" },
      { width: "40%", color: "bg-orange-500", text: "Слабый" },
      { width: "60%", color: "bg-yellow-500", text: "Средний" },
      { width: "80%", color: "bg-lime-500", text: "Хороший" },
      { width: "100%", color: "bg-green-500", text: "Отличный" },
    ];

    const level = levels[strength];
    $("#password-strength-bar")
      .css("width", level.width)
      .attr("class", "h-full transition-all duration-300 " + level.color);
    $("#password-strength-text").text(level.text);

    checkPasswordMatch();
  });

  function checkPasswordMatch() {
    const password = $("#register-password").val();
    const confirm = $("#register-password-confirm").val();
    if (confirm && password !== confirm) {
      $("#password-match-error").removeClass("hidden");
      return false;
    }
    $("#password-match-error").addClass("hidden");
    return true;
  }

  $("#register-password-confirm").on("input", checkPasswordMatch);

  function formatRecoveryCode(input) {
    let value = input.value.toUpperCase().replace(/[^0-9A-F]/g, "");
    let formatted = "";
    for (let i = 0; i < value.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) formatted += "-";
      formatted += value[i];
    }
    input.value = formatted;
  }

  $("#reset-recovery-code").on("input", function () {
    formatRecoveryCode(this);
  });

  $("#login-totp").on("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 6);
    if (this.value.length === 6) {
      $("#login-form").trigger("submit");
    }
  });

  $("#back-to-credentials-btn").on("click", function () {
    resetLoginState();
  });

  $("#login-form").on("submit", async function (event) {
    event.preventDefault();
    const $submitBtn = $("#login-submit");

    if (loginState.step === "credentials") {
      const username = $("#login-username").val();
      const password = $("#login-password").val();
      const rememberMe = $("#remember-me").prop("checked");

      loginState.username = username;
      loginState.rememberMe = rememberMe;

      $submitBtn.prop("disabled", true).text("Вход...");

      try {
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);

        const data = await Api.postForm("/api/auth/token", formData);

        if (data.requires_2fa && data.partial_token) {
          loginState.partialToken = data.partial_token;
          loginState.step = "2fa";

          savePartialToken(data.partial_token, username);

          $("#credentials-section").addClass("hidden");
          $("#totp-section").removeClass("hidden");

          startTotpTimer();

          const totpInput = document.getElementById("login-totp");
          if (totpInput) totpInput.focus();

          $submitBtn.text("Подтвердить");
          Utils.showToast("Введите код из приложения аутентификатора", "info");
        } else if (data.access_token) {
          clearPartialToken();
          saveTokensAndRedirect(data, rememberMe);
        }
      } catch (error) {
        Utils.showToast(error.message || "Ошибка входа", "error");
      } finally {
        $submitBtn.prop("disabled", false);
        if (loginState.step === "credentials") {
          $submitBtn.text("Войти");
        }
      }
    } else if (loginState.step === "2fa") {
      const totpCode = $("#login-totp").val();

      if (!totpCode || totpCode.length !== 6) {
        Utils.showToast("Введите 6-значный код", "error");
        return;
      }

      $submitBtn.prop("disabled", true).text("Проверка...");

      try {
        const response = await fetch("/api/auth/2fa/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${loginState.partialToken}`,
          },
          body: JSON.stringify({ code: totpCode }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 401) {
            resetLoginState();
            throw new Error(
              "Время сессии истекло. Пожалуйста, войдите заново.",
            );
          }

          throw new Error(errorData.detail || "Неверный код");
        }

        const data = await response.json();
        clearPartialToken();
        stopTotpTimer();
        saveTokensAndRedirect(data, loginState.rememberMe);
      } catch (error) {
        Utils.showToast(error.message || "Неверный код", "error");
        $("#login-totp").val("");
        const totpInput = document.getElementById("login-totp");
        if (totpInput) totpInput.focus();
      } finally {
        $submitBtn.prop("disabled", false).text("Подтвердить");
      }
    }
  });

  function saveTokensAndRedirect(data, rememberMe) {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    storage.setItem("access_token", data.access_token);
    if (data.refresh_token) {
      storage.setItem("refresh_token", data.refresh_token);
    }

    otherStorage.removeItem("access_token");
    otherStorage.removeItem("refresh_token");

    window.location.href = "/";
  }

  $("#register-form").on("submit", async function (event) {
    event.preventDefault();
    const $submitBtn = $("#register-submit");
    const pass = $("#register-password").val();
    const confirm = $("#register-password-confirm").val();

    if (pass !== confirm) {
      Utils.showToast("Пароли не совпадают", "error");
      return;
    }

    const userData = {
      username: $("#register-username").val(),
      email: $("#register-email").val(),
      full_name: $("#register-fullname").val() || null,
      password: pass,
    };

    $submitBtn.prop("disabled", true).text("Регистрация...");

    try {
      const response = await Api.post("/api/auth/register", userData);

      if (response.recovery_codes && response.recovery_codes.codes) {
        registeredRecoveryCodes = response.recovery_codes.codes;
        showRecoveryCodesModal(registeredRecoveryCodes, userData.username);
      } else {
        Utils.showToast("Регистрация успешна! Войдите в систему.", "success");
        setTimeout(() => {
          showForm("#login-form");
          $("#login-username").val(userData.username);
        }, 1500);
      }
    } catch (error) {
      let msg = error.message;
      if (error.detail && Array.isArray(error.detail)) {
        msg = error.detail.map((e) => e.msg).join(". ");
      }
      Utils.showToast(msg || "Ошибка регистрации", "error");
    } finally {
      $submitBtn.prop("disabled", false).text("Зарегистрироваться");
    }
  });

  function showRecoveryCodesModal(codes, username) {
    const $list = $("#recovery-codes-list");
    $list.empty();

    codes.forEach((code, index) => {
      $list.append(`
        <div class="py-1 px-2 bg-white rounded border select-all font-mono">
          ${index + 1}. ${Utils.escapeHtml(code)}
        </div>
      `);
    });

    $("#codes-saved-checkbox").prop("checked", false);
    $("#close-recovery-modal-btn").prop("disabled", true);
    $("#recovery-codes-modal").data("username", username);
    $("#recovery-codes-modal").removeClass("hidden");
  }

  function renderRecoveryCodesStatus(usedCodes) {
    return usedCodes
      .map((used, index) => {
        const codeDisplay = "████-████-████-████";
        const statusClass = used
          ? "text-gray-300 line-through"
          : "text-green-600";
        const statusIcon = used ? "✗" : "✓";
        return `
          <div class="flex items-center justify-between py-1 px-2 rounded ${used ? "bg-gray-50" : "bg-green-50"}">
            <span class="font-mono ${statusClass}">${index + 1}. ${codeDisplay}</span>
            <span class="${used ? "text-gray-400" : "text-green-600"}">${statusIcon}</span>
          </div>
        `;
      })
      .join("");
  }

  $("#codes-saved-checkbox").on("change", function () {
    $("#close-recovery-modal-btn").prop("disabled", !this.checked);
  });

  $("#copy-codes-btn").on("click", function () {
    const codesText = registeredRecoveryCodes.join("\n");
    navigator.clipboard.writeText(codesText).then(() => {
      Utils.showToast("Коды скопированы в буфер обмена", "success");
    });
  });

  $("#download-codes-btn").on("click", function () {
    const username = $("#recovery-codes-modal").data("username") || "user";
    const codesText = `Резервные коды для аккаунта: ${username}\nДата: ${new Date().toLocaleString()}\n\n${registeredRecoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nХраните эти коды в надёжном месте!`;

    const blob = new Blob([codesText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recovery-codes-${username}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    Utils.showToast("Файл с кодами скачан", "success");
  });

  $("#close-recovery-modal-btn").on("click", function () {
    const username = $("#recovery-codes-modal").data("username");
    $("#recovery-codes-modal").addClass("hidden");

    Utils.showToast("Регистрация успешна! Войдите в систему.", "success");
    showForm("#login-form");
    $("#login-username").val(username);
  });

  function checkResetPasswordMatch() {
    const password = $("#reset-new-password").val();
    const confirm = $("#reset-confirm-password").val();
    if (confirm && password !== confirm) {
      $("#reset-password-match-error").removeClass("hidden");
      return false;
    }
    $("#reset-password-match-error").addClass("hidden");
    return true;
  }

  $("#reset-confirm-password").on("input", checkResetPasswordMatch);

  $("#reset-password-form").on("submit", async function (event) {
    event.preventDefault();
    const $submitBtn = $("#reset-submit");

    const newPassword = $("#reset-new-password").val();
    const confirmPassword = $("#reset-confirm-password").val();

    if (newPassword !== confirmPassword) {
      Utils.showToast("Пароли не совпадают", "error");
      return;
    }

    if (newPassword.length < 8) {
      Utils.showToast("Пароль должен содержать минимум 8 символов", "error");
      return;
    }

    const data = {
      username: $("#reset-username").val(),
      recovery_code: $("#reset-recovery-code").val().toUpperCase(),
      new_password: newPassword,
    };

    if (
      !/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(
        data.recovery_code,
      )
    ) {
      Utils.showToast("Неверный формат резервного кода", "error");
      return;
    }

    $submitBtn.prop("disabled", true).text("Сброс...");

    try {
      const response = await Api.post("/api/auth/password/reset", data);

      showPasswordResetResult(response, data.username);
    } catch (error) {
      Utils.showToast(error.message || "Ошибка сброса пароля", "error");
      $submitBtn.prop("disabled", false).text("Сбросить пароль");
    }
  });

  function showPasswordResetResult(response, username) {
    const $form = $("#reset-password-form");

    $form.html(`
      <div class="text-center mb-4">
        <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-800">Пароль успешно изменён!</h3>
      </div>

      <div class="mb-4">
        <p class="text-sm text-gray-600 mb-2 text-center">
          Осталось резервных кодов: <strong class="${response.remaining <= 2 ? "text-red-600" : "text-green-600"}">${response.remaining}</strong> из ${response.total}
        </p>

        ${
          response.should_regenerate
            ? `
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <p class="text-sm text-yellow-800 flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              Рекомендуем сгенерировать новые коды в профиле
            </p>
          </div>
        `
            : ""
        }

        <div class="bg-gray-50 rounded-lg p-3 space-y-1 max-h-48 overflow-y-auto">
          <p class="text-xs text-gray-500 mb-2 text-center">Статус резервных кодов:</p>
          ${renderRecoveryCodesStatus(response.used_codes)}
        </div>

        ${
          response.generated_at
            ? `
          <p class="text-xs text-gray-400 mt-2 text-center">
            Сгенерированы: ${new Date(response.generated_at).toLocaleString()}
          </p>
        `
            : ""
        }
      </div>

      <button type="button" id="goto-login-after-reset"
        class="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition duration-200 font-medium">
        Перейти к входу
      </button>
    `);

    $form.off("submit");

    $("#goto-login-after-reset").on("click", function () {
      location.reload();
      setTimeout(() => {
        showForm("#login-form");
        $("#login-username").val(username);
      }, 100);
    });
  }

  initLoginState();
});
