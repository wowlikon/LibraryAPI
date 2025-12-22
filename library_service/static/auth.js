$(() => {
  $("#login-tab").on("click", function () {
    $(this)
      .removeClass("text-gray-400 hover:text-gray-600")
      .addClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500");
    $("#register-tab")
      .removeClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500")
      .addClass("text-gray-400 hover:text-gray-600");

    $("#login-form").removeClass("hidden");
    $("#register-form").addClass("hidden");
  });

  $("#register-tab").on("click", function () {
    $(this)
      .removeClass("text-gray-400 hover:text-gray-600")
      .addClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500");
    $("#login-tab")
      .removeClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500")
      .addClass("text-gray-400 hover:text-gray-600");

    $("#register-form").removeClass("hidden");
    $("#login-form").addClass("hidden");
  });

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
    const $bar = $("#password-strength-bar");

    $bar.css("width", level.width);
    $bar.attr("class", "h-full transition-all duration-300 " + level.color);
    $("#password-strength-text").text(level.text);

    checkPasswordMatch();
  });

  function checkPasswordMatch() {
    const password = $("#register-password").val();
    const confirm = $("#register-password-confirm").val();
    const $error = $("#password-match-error");

    if (confirm && password !== confirm) {
      $error.removeClass("hidden");
      return false;
    } else {
      $error.addClass("hidden");
      return true;
    }
  }

  $("#register-password-confirm").on("input", checkPasswordMatch);

  $("#login-form").on("submit", async function (event) {
    event.preventDefault();
    const $submitBtn = $("#login-submit");
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    const rememberMe = $("#remember-me").prop("checked");
    $submitBtn.prop("disabled", true).text("Вход...");

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const data = await Api.postForm("/api/auth/token", formData);
      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("access_token", data.access_token);
      if (rememberMe && data.refresh_token) {
        storage.setItem("refresh_token", data.refresh_token);
      }

      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem("access_token");
      otherStorage.removeItem("refresh_token");

      window.location.href = "/";
    } catch (error) {
      Utils.showToast(error.message || "Ошибка входа", "error");
    } finally {
      $submitBtn.prop("disabled", false).text("Войти");
    }
  });

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
      await Api.post("/api/auth/register", userData);
      Utils.showToast("Регистрация успешна! Войдите в систему.", "success");

      setTimeout(() => {
        $("#login-tab").trigger("click");
        $("#login-username").val(userData.username);
      }, 1500);
    } catch (error) {
      let msg = error.message;
      if (Array.isArray(error.detail)) {
        msg = error.detail.map((e) => e.msg).join(". ");
      }
      Utils.showToast(msg || "Ошибка регистрации", "error");
    } finally {
      $submitBtn.prop("disabled", false).text("Зарегистрироваться");
    }
  });
});
