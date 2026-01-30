$(() => {
  const SELECTORS = {
    loginForm: "#login-form",
    registerForm: "#register-form",
    resetForm: "#reset-password-form",
    authTabs: "#auth-tabs",
    loginTab: "#login-tab",
    registerTab: "#register-tab",
    forgotBtn: "#forgot-password-btn",
    backToLoginBtn: "#back-to-login-btn",
    backToCredentialsBtn: "#back-to-credentials-btn",
    submitLogin: "#login-submit",
    submitRegister: "#register-submit",
    submitReset: "#reset-submit",
    usernameLogin: "#login-username",
    passwordLogin: "#login-password",
    totpInput: "#login-totp",
    rememberMe: "#remember-me",
    credentialsSection: "#credentials-section",
    totpSection: "#totp-section",
    registerUsername: "#register-username",
    registerEmail: "#register-email",
    registerFullname: "#register-fullname",
    registerPassword: "#register-password",
    registerConfirm: "#register-password-confirm",
    passwordStrengthBar: "#password-strength-bar",
    passwordStrengthText: "#password-strength-text",
    passwordMatchError: "#password-match-error",
    resetUsername: "#reset-username",
    resetCode: "#reset-recovery-code",
    resetNewPassword: "#reset-new-password",
    resetConfirmPassword: "#reset-confirm-password",
    resetMatchError: "#reset-password-match-error",
    recoveryModal: "#recovery-codes-modal",
    recoveryList: "#recovery-codes-list",
    codesSavedCheckbox: "#codes-saved-checkbox",
    closeRecoveryBtn: "#close-recovery-modal-btn",
    copyCodesBtn: "#copy-codes-btn",
    downloadCodesBtn: "#download-codes-btn",
    gotoLoginAfterReset: "#goto-login-after-reset",
    capWidget: "#cap",
    lockProgressCircle: "#lock-progress-circle",
  };

  const STORAGE_KEYS = {
    partialToken: "partial_token",
    partialUsername: "partial_username",
  };

  const TEXTS = {
    login: "Войти",
    confirm: "Подтвердить",
    checking: "Проверка...",
    registering: "Регистрация...",
    resetting: "Сброс...",
    enterTotp: "Введите код из приложения аутентификатора",
    sessionExpired: "Время сессии истекло. Пожалуйста, войдите заново.",
    invalidCode: "Неверный код",
    passwordsNotMatch: "Пароли не совпадают",
    captchaRequired: "Пожалуйста, пройдите проверку Captcha",
    registrationSuccess: "Регистрация успешна! Войдите в систему.",
    codesCopied: "Коды скопированы в буфер обмена",
    codesDownloaded: "Файл с кодами скачан",
    passwordResetSuccess: "Пароль успешно изменён!",
    invalidRecoveryCode: "Неверный формат резервного кода",
    passwordTooShort: "Пароль должен содержать минимум 8 символов",
  };

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

  const getTotpProgress = () => {
    const now = Date.now() / 1000;
    const elapsed = now % TOTP_PERIOD;
    return elapsed / TOTP_PERIOD;
  };

  const updateTotpTimer = () => {
    const circle = $(SELECTORS.lockProgressCircle).get(0);
    if (!circle) return;
    const progress = getTotpProgress();
    const offset = CIRCLE_CIRCUMFERENCE * (1 - progress);
    circle.style.strokeDashoffset = offset;
    totpAnimationFrame = requestAnimationFrame(updateTotpTimer);
  };

  const startTotpTimer = () => {
    stopTotpTimer();
    updateTotpTimer();
  };

  const stopTotpTimer = () => {
    if (totpAnimationFrame) {
      cancelAnimationFrame(totpAnimationFrame);
      totpAnimationFrame = null;
    }
  };

  const resetCircle = () => {
    const circle = $(SELECTORS.lockProgressCircle).get(0);
    if (circle) circle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
  };

  const savePartialToken = (token, username) => {
    sessionStorage.setItem(STORAGE_KEYS.partialToken, token);
    sessionStorage.setItem(STORAGE_KEYS.partialUsername, username);
  };

  const clearPartialToken = () => {
    sessionStorage.removeItem(STORAGE_KEYS.partialToken);
    sessionStorage.removeItem(STORAGE_KEYS.partialUsername);
  };

  const showForm = (formId) => {
    let newHash = "";
    if (formId === SELECTORS.loginForm) newHash = "login";
    else if (formId === SELECTORS.registerForm) newHash = "register";
    else if (formId === SELECTORS.resetForm) newHash = "reset";
    if (newHash && window.location.hash !== "#" + newHash) {
      window.history.pushState(null, null, "#" + newHash);
    }
    $(
      `${SELECTORS.loginForm}, ${SELECTORS.registerForm}, ${SELECTORS.resetForm}`,
    ).addClass("hidden");
    $(formId).removeClass("hidden");

    $(`${SELECTORS.loginTab}, ${SELECTORS.registerTab}`)
      .removeClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500")
      .addClass("text-gray-400 hover:text-gray-600");

    if (formId === SELECTORS.loginForm) {
      $(SELECTORS.loginTab)
        .removeClass("text-gray-400 hover:text-gray-600")
        .addClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500");
      resetLoginState();
    } else if (formId === SELECTORS.registerForm) {
      $(SELECTORS.registerTab)
        .removeClass("text-gray-400 hover:text-gray-600")
        .addClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500");
    }
  };

  const handleHash = () => {
    const hash = window.location.hash.toLowerCase();
    if (hash === "#register" || hash === "#signup") {
      showForm(SELECTORS.registerForm);
      $(SELECTORS.registerTab).trigger("click");
    } else if (hash === "#login" || hash === "#signin") {
      showForm(SELECTORS.loginForm);
      $(SELECTORS.loginTab).trigger("click");
    }
  };

  const resetLoginState = () => {
    clearPartialToken();
    stopTotpTimer();
    loginState = {
      step: "credentials",
      partialToken: null,
      username: "",
      rememberMe: false,
    };
    $(SELECTORS.authTabs).removeClass("hide-animated");
    $(SELECTORS.totpSection).addClass("hidden");
    $(SELECTORS.totpInput).val("");
    $(SELECTORS.credentialsSection).removeClass("hidden");
    $(SELECTORS.submitLogin).text(TEXTS.login);
    resetCircle();
  };

  const checkPasswordMatch = (passwordId, confirmId, errorId) => {
    const password = $(passwordId).val();
    const confirm = $(confirmId).val();
    const $error = $(errorId);
    if (confirm && password !== confirm) {
      $error.removeClass("hidden");
      return false;
    }
    $error.addClass("hidden");
    return true;
  };

  const saveTokensAndRedirect = (data, rememberMe) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    storage.setItem("access_token", data.access_token);
    if (data.refresh_token)
      storage.setItem("refresh_token", data.refresh_token);
    otherStorage.removeItem("access_token");
    otherStorage.removeItem("refresh_token");
    window.location.href = "/";
  };

  const initLoginState = () => {
    const savedToken = sessionStorage.getItem(STORAGE_KEYS.partialToken);
    const savedUsername = sessionStorage.getItem(STORAGE_KEYS.partialUsername);
    if (savedToken && savedUsername) {
      $(SELECTORS.authTabs).addClass("hide-animated");
      loginState.partialToken = savedToken;
      loginState.username = savedUsername;
      loginState.step = "2fa";
      $(SELECTORS.usernameLogin).val(savedUsername);
      $(SELECTORS.credentialsSection).addClass("hidden");
      $(SELECTORS.totpSection).removeClass("hidden");
      $(SELECTORS.submitLogin).text(TEXTS.confirm);
      startTotpTimer();
      setTimeout(() => $(SELECTORS.totpInput).get(0)?.focus(), 100);
    }
  };

  $(SELECTORS.loginTab).on("click", () => showForm(SELECTORS.loginForm));
  $(SELECTORS.registerTab).on("click", () => showForm(SELECTORS.registerForm));
  $(SELECTORS.forgotBtn).on("click", () => showForm(SELECTORS.resetForm));
  $(SELECTORS.backToLoginBtn).on("click", () => showForm(SELECTORS.loginForm));
  $(SELECTORS.backToCredentialsBtn).on("click", resetLoginState);

  $("body").on("click", ".toggle-password", function () {
    const $input = $(this).siblings("input");
    const isPassword = $input.attr("type") === "password";
    $input.attr("type", isPassword ? "text" : "password");
    $(this).find("svg").toggleClass("hidden");
  });

  $(SELECTORS.registerPassword).on("input", function () {
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
    $(SELECTORS.passwordStrengthBar)
      .css("width", level.width)
      .attr("class", `h-full transition-all duration-300 ${level.color}`);
    $(SELECTORS.passwordStrengthText).text(level.text);
    checkPasswordMatch(
      SELECTORS.registerPassword,
      SELECTORS.registerConfirm,
      SELECTORS.passwordMatchError,
    );
  });

  $(SELECTORS.registerConfirm).on("input", () =>
    checkPasswordMatch(
      SELECTORS.registerPassword,
      SELECTORS.registerConfirm,
      SELECTORS.passwordMatchError,
    ),
  );

  $(SELECTORS.resetCode).on("input", function () {
    let value = this.value.toUpperCase().replace(/[^0-9A-F]/g, "");
    let formatted = "";
    for (let i = 0; i < value.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) formatted += "-";
      formatted += value[i];
    }
    this.value = formatted;
  });

  $(SELECTORS.totpInput).on("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 6);
    if (this.value.length === 6) $(SELECTORS.loginForm).trigger("submit");
  });

  $(SELECTORS.loginForm).on("submit", async function (event) {
    event.preventDefault();
    const $submitBtn = $(SELECTORS.submitLogin);
    if (loginState.step === "credentials") {
      const username = $(SELECTORS.usernameLogin).val();
      const password = $(SELECTORS.passwordLogin).val();
      const rememberMe = $(SELECTORS.rememberMe).prop("checked");
      loginState.username = username;
      loginState.rememberMe = rememberMe;
      $submitBtn.prop("disabled", true).text("Вход...");
      try {
        const formData = new URLSearchParams({ username, password });
        const data = await Api.postForm("/api/auth/token", formData);
        if (data.requires_2fa && data.partial_token) {
          loginState.partialToken = data.partial_token;
          loginState.step = "2fa";
          savePartialToken(data.partial_token, username);
          $(SELECTORS.authTabs).addClass("hide-animated");
          $(SELECTORS.credentialsSection).addClass("hidden");
          $(SELECTORS.totpSection).removeClass("hidden");
          startTotpTimer();
          $(SELECTORS.totpInput).get(0)?.focus();
          $submitBtn.text(TEXTS.confirm);
          Utils.showToast(TEXTS.enterTotp, "info");
        } else if (data.access_token) {
          clearPartialToken();
          saveTokensAndRedirect(data, rememberMe);
        }
      } catch (error) {
        Utils.showToast(error.message || "Ошибка входа", "error");
      } finally {
        $submitBtn.prop("disabled", false);
        if (loginState.step === "credentials") $submitBtn.text(TEXTS.login);
      }
    } else if (loginState.step === "2fa") {
      const totpCode = $(SELECTORS.totpInput).val();
      if (!totpCode || totpCode.length !== 6) {
        Utils.showToast("Введите 6-значный код", "error");
        return;
      }
      $submitBtn.prop("disabled", true).text(TEXTS.checking);
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
            throw new Error(TEXTS.sessionExpired);
          }
          throw new Error(errorData.detail || TEXTS.invalidCode);
        }
        const data = await response.json();
        clearPartialToken();
        stopTotpTimer();
        saveTokensAndRedirect(data, loginState.rememberMe);
      } catch (error) {
        Utils.showToast(error.message || TEXTS.invalidCode, "error");
        $(SELECTORS.totpInput).val("");
        $(SELECTORS.totpInput).get(0)?.focus();
      } finally {
        $submitBtn.prop("disabled", false).text(TEXTS.confirm);
      }
    }
  });

  $(SELECTORS.registerForm).on("submit", async function (event) {
    event.preventDefault();
    const $submitBtn = $(SELECTORS.submitRegister);
    const pass = $(SELECTORS.registerPassword).val();
    const confirm = $(SELECTORS.registerConfirm).val();
    if (pass !== confirm) {
      Utils.showToast(TEXTS.passwordsNotMatch, "error");
      return;
    }
    const userData = {
      username: $(SELECTORS.registerUsername).val(),
      email: $(SELECTORS.registerEmail).val(),
      full_name: $(SELECTORS.registerFullname).val() || null,
      password: pass,
    };
    $submitBtn.prop("disabled", true).text(TEXTS.registering);
    try {
      const response = await Api.post("/api/auth/register", userData);
      if (response.recovery_codes && response.recovery_codes.codes) {
        registeredRecoveryCodes = response.recovery_codes.codes;
        showRecoveryCodesModal(registeredRecoveryCodes, userData.username);
      } else {
        Utils.showToast(TEXTS.registrationSuccess, "success");
        setTimeout(() => {
          showForm(SELECTORS.loginForm);
          $(SELECTORS.usernameLogin).val(userData.username);
        }, 1500);
      }
    } catch (error) {
      console.log("Debug error object:", error);

      const cleanMsg = (text) => {
        if (!text) return "";
        if (text.includes("value is not a valid email address")) {
          return "Некорректный адрес электронной почты";
        }

        text = text.replace(/^Value error,\s*/i, "");
        return text.charAt(0).toUpperCase() + text.slice(1);
      };

      let msg = "Ошибка регистрации";
      if (error.detail && error.detail.error === "captcha_required") {
        Utils.showToast(TEXTS.captchaRequired, "error");
        const $capElement = $(SELECTORS.capWidget);
        const $parent = $capElement.parent();
        $capElement.remove();
        $parent.append(
          `<cap-widget id="cap" data-cap-api-endpoint="/api/cap/" style="--cap-widget-width: 100%;"></cap-widget>`,
        );
        return;
      }

      if (error.detail && Array.isArray(error.detail)) {
        msg = error.detail.map((e) => cleanMsg(e.msg)).join(". ");
      } else if (Array.isArray(error)) {
        msg = error.map((e) => cleanMsg(e.msg || e.message)).join(". ");
      } else if (typeof error.detail === "string") {
        msg = cleanMsg(error.detail);
      } else if (error.message && !error.message.includes("[object Object]")) {
        msg = cleanMsg(error.message);
      }

      console.log("Resulting msg:", msg);
      Utils.showToast(msg, "error");
    } finally {
      $submitBtn
        .prop("disabled", false)
        .text(TEXTS.registering.replace("...", ""));
    }
  });

  const showRecoveryCodesModal = (codes, username) => {
    const $list = $(SELECTORS.recoveryList);
    $list.empty();
    codes.forEach((code, index) => {
      $list.append(
        `<div class="py-1 px-2 bg-white rounded border select-all font-mono">${index + 1}. ${Utils.escapeHtml(code)}</div>`,
      );
    });
    $(SELECTORS.codesSavedCheckbox).prop("checked", false);
    $(SELECTORS.closeRecoveryBtn).prop("disabled", true);
    $(SELECTORS.recoveryModal).data("username", username).removeClass("hidden");
  };

  const renderRecoveryCodesStatus = (usedCodes) => {
    return usedCodes
      .map((used, index) => {
        const codeDisplay = "████-████-████-████";
        const statusClass = used
          ? "text-gray-300 line-through"
          : "text-green-600";
        const statusIcon = used ? "✗" : "✓";
        return `<div class="flex items-center justify-between py-1 px-2 rounded ${used ? "bg-gray-50" : "bg-green-50"}"><span class="font-mono ${statusClass}">${index + 1}. ${codeDisplay}</span><span class="${used ? "text-gray-400" : "text-green-600"}">${statusIcon}</span></div>`;
      })
      .join("");
  };

  $(SELECTORS.codesSavedCheckbox).on("change", function () {
    $(SELECTORS.closeRecoveryBtn).prop("disabled", !this.checked);
  });

  $(SELECTORS.copyCodesBtn).on("click", function () {
    const codesText = registeredRecoveryCodes.join("\n");
    navigator.clipboard
      .writeText(codesText)
      .then(() => Utils.showToast(TEXTS.codesCopied, "success"));
  });

  $(SELECTORS.downloadCodesBtn).on("click", function () {
    const username = $(SELECTORS.recoveryModal).data("username") || "user";
    const codesText = `Резервные коды для аккаунта: ${username}\nДата: ${new Date().toLocaleString()}\n\n${registeredRecoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nХраните эти коды в надёжном месте!`;
    const blob = new Blob([codesText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recovery-codes-${username}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    Utils.showToast(TEXTS.codesDownloaded, "success");
  });

  $(SELECTORS.closeRecoveryBtn).on("click", function () {
    const username = $(SELECTORS.recoveryModal).data("username");
    $(SELECTORS.recoveryModal).addClass("hidden");
    Utils.showToast(TEXTS.registrationSuccess, "success");
    showForm(SELECTORS.loginForm);
    $(SELECTORS.usernameLogin).val(username);
  });

  $(SELECTORS.resetConfirmPassword).on("input", () =>
    checkPasswordMatch(
      SELECTORS.resetNewPassword,
      SELECTORS.resetConfirmPassword,
      SELECTORS.resetMatchError,
    ),
  );

  $(SELECTORS.resetForm).on("submit", async function (event) {
    event.preventDefault();
    const $submitBtn = $(SELECTORS.submitReset);
    const newPassword = $(SELECTORS.resetNewPassword).val();
    const confirmPassword = $(SELECTORS.resetConfirmPassword).val();
    if (newPassword !== confirmPassword) {
      Utils.showToast(TEXTS.passwordsNotMatch, "error");
      return;
    }
    if (newPassword.length < 8) {
      Utils.showToast(TEXTS.passwordTooShort, "error");
      return;
    }
    const data = {
      username: $(SELECTORS.resetUsername).val(),
      recovery_code: $(SELECTORS.resetCode).val().toUpperCase(),
      new_password: newPassword,
    };
    if (
      !/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(
        data.recovery_code,
      )
    ) {
      Utils.showToast(TEXTS.invalidRecoveryCode, "error");
      return;
    }
    $submitBtn.prop("disabled", true).text(TEXTS.resetting);
    try {
      const response = await Api.post("/api/auth/password/reset", data);
      showPasswordResetResult(response, data.username);
    } catch (error) {
      Utils.showToast(error.message || "Ошибка сброса пароля", "error");
      $submitBtn.prop("disabled", false).text("Сбросить пароль");
    }
  });

  const showPasswordResetResult = (response, username) => {
    const $form = $(SELECTORS.resetForm);
    $form.html(`
      <div class="text-center mb-4">
        <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-800">${TEXTS.passwordResetSuccess}</h3>
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
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
      <button type="button" id="goto-login-after-reset" class="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition duration-200 font-medium">
        Перейти к входу
      </button>
    `);
    $form.off("submit");
    $("#goto-login-after-reset").on("click", function () {
      location.reload();
      setTimeout(() => {
        showForm(SELECTORS.loginForm);
        $(SELECTORS.usernameLogin).val(username);
      }, 100);
    });
  };

  initLoginState();
  handleHash();

  const widget = $(SELECTORS.capWidget).get(0);
  if (widget && widget.shadowRoot) {
    const style = document.createElement("style");
    style.textContent = `.credits { right: 20px !important; }`;
    $(widget.shadowRoot).append(style);
  }
});
