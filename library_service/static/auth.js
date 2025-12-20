$(function () {
  $("#login-form").on("submit", async function (event) {
    event.preventDefault();
    const $submitBtn = $("#login-submit");
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    $submitBtn.prop("disabled", true).text("Вход...");

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const data = await Api.postForm("/api/auth/token", formData);

      localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token)
        localStorage.setItem("refresh_token", data.refresh_token);
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
      setTimeout(() => window.location.reload(), 1500);
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

  $("body").on("click", ".toggle-password", function () {
    const $input = $(this).siblings("input");
    const type = $input.attr("type") === "password" ? "text" : "password";
    $input.attr("type", type);
    $(this).find("svg").toggleClass("hidden");
  });
});
