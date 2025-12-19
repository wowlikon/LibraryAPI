$(function () {
    const $loginTab = $("#login-tab");
    const $registerTab = $("#register-tab");
    const $loginForm = $("#login-form");
    const $registerForm = $("#register-form");
    
    const $guestLink = $("#guest-link");
    const $userBtn = $("#user-btn");
    const $userDropdown = $("#user-dropdown");
    const $userArrow = $("#user-arrow");
    const $userAvatar = $("#user-avatar");
    const $dropdownName = $("#dropdown-name");
    const $dropdownUsername = $("#dropdown-username");
    const $dropdownEmail = $("#dropdown-email");
    const $logoutBtn = $("#logout-btn");
    const $menuContainer = $("#user-menu-container");
    
    function switchToLogin() {
      $loginTab.addClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500").removeClass("text-gray-400");
      $registerTab.removeClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500").addClass("text-gray-400");
      $loginForm.removeClass("hidden"); $registerForm.addClass("hidden");
      history.replaceState(null, "", "/auth#login");
    }
  
    function switchToRegister() {
      $registerTab.addClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500").removeClass("text-gray-400");
      $loginTab.removeClass("text-gray-700 bg-gray-50 border-b-2 border-gray-500").addClass("text-gray-400");
      $registerForm.removeClass("hidden"); $loginForm.addClass("hidden");
      history.replaceState(null, "", "/auth#register");
    }
  
    $loginTab.on("click", switchToLogin);
    $registerTab.on("click", switchToRegister);
  
    $("body").on("click", ".toggle-password", function () {
      const $btn = $(this);
      const $input = $btn.siblings("input");
      const $eyeOpen = $btn.find(".eye-open");
      const $eyeClosed = $btn.find(".eye-closed");
  
      if ($input.attr("type") === "password") {
        $input.attr("type", "text");
        $eyeOpen.addClass("hidden");
        $eyeClosed.removeClass("hidden");
      } else {
        $input.attr("type", "password");
        $eyeOpen.removeClass("hidden");
        $eyeClosed.addClass("hidden");
      }
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
  
    $loginForm.on("submit", async function (event) {
      event.preventDefault();
  
      const $errorDiv = $("#login-error");
      const $submitBtn = $("#login-submit");
      const username = $("#login-username").val();
      const password = $("#login-password").val();
  
      $errorDiv.addClass("hidden");
      $submitBtn.prop("disabled", true).text("Вход...");
  
      try {
        const formData = new URLSearchParams();
        formData.append("username", username);
        formData.append("password", password);
  
        const response = await fetch("/api/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          localStorage.setItem("access_token", data.access_token);
          if (data.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token);
          }
          window.location.href = "/";
        } else {
          $errorDiv.text(data.detail || "Неверное имя пользователя или пароль");
          $errorDiv.removeClass("hidden");
          $submitBtn.prop("disabled", false).text("Войти");
        }
      } catch (error) {
        console.error("Login error:", error);
        $errorDiv.text("Ошибка соединения с сервером");
        $errorDiv.removeClass("hidden");
        $submitBtn.prop("disabled", false).text("Войти");
      }
    });
  
    $registerForm.on("submit", async function (event) {
      event.preventDefault();
  
      const $errorDiv = $("#register-error");
      const $successDiv = $("#register-success");
      const $submitBtn = $("#register-submit");
  
      if (!checkPasswordMatch()) {
        $errorDiv.text("Пароли не совпадают").removeClass("hidden");
        return;
      }
  
      const userData = {
        username: $("#register-username").val(),
        email: $("#register-email").val(),
        full_name: $("#register-fullname").val() || null,
        password: $("#register-password").val(),
      };
  
      $errorDiv.addClass("hidden");
      $successDiv.addClass("hidden");
      $submitBtn.prop("disabled", true).text("Регистрация...");
  
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
  
        const data = await response.json();
  
        if (response.ok) {
          $successDiv.text("Регистрация успешна! Переключаемся на вход...").removeClass("hidden");
          setTimeout(() => {
            $("#login-username").val(userData.username);
            switchToLogin();
          }, 2000);
        } else {
          let errorMessage = data.detail;
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((err) => err.msg).join(". ");
          }
          $errorDiv.text(errorMessage || "Ошибка регистрации").removeClass("hidden");
        }
      } catch (error) {
        console.error("Register error:", error);
        $errorDiv.text("Ошибка соединения с сервером").removeClass("hidden");
      } finally {
        $submitBtn.prop("disabled", false).text("Зарегистрироваться");
      }
    });
  
    let isDropdownOpen = false;
  
    function openDropdown() {
      isDropdownOpen = true;
      $userDropdown.removeClass("hidden");
      $userArrow.addClass("rotate-180");
    }
  
    function closeDropdown() {
      isDropdownOpen = false;
      $userDropdown.addClass("hidden");
      $userArrow.removeClass("rotate-180");
    }
  
    $userBtn.on("click", function (e) {
      e.stopPropagation();
      isDropdownOpen ? closeDropdown() : openDropdown();
    });
  
    $(document).on("click", function (e) {
      if (isDropdownOpen && !$(e.target).closest("#user-menu-container").length) {
        closeDropdown();
      }
    });
  
    $(document).on("keydown", function (e) {
      if (e.key === "Escape" && isDropdownOpen) {
        closeDropdown();
      }
    });
  
    $logoutBtn.on("click", function () {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/";
    });
  
    function showGuest() {
      $guestLink.removeClass("hidden");
      $userBtn.addClass("hidden").removeClass("flex");
      closeDropdown();
    }
  
    function showUser(user) {
      $guestLink.addClass("hidden");
      $userBtn.removeClass("hidden").addClass("flex");
  
      const displayName = user.full_name || user.username;
      const firstLetter = displayName.charAt(0).toUpperCase();
  
      $userAvatar.text(firstLetter);
      $dropdownName.text(displayName);
      $dropdownUsername.text("@" + user.username);
      $dropdownEmail.text(user.email);
    }
    

  function updateUserAvatar(email) {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const emailHash = sha256(cleanEmail); 

    const avatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=200`;
    const avatarImg = document.getElementById('user-avatar');
    if (avatarImg) { avatarImg.src = avatarUrl; }
  }
  
    if (window.location.hash === "#register") { switchToRegister(); }
  
    const token = localStorage.getItem("access_token");
    
    if (!token) {
      showGuest();
    } else {
      fetch("/api/auth/me", {
        headers: { Authorization: "Bearer " + token },
      })
        .then((response) => {
          if (response.ok) return response.json();
          throw new Error("Unauthorized");
        })
        .then((user) => {
          showUser(user);
          updateUserAvatar(user.email);
          
          document.getElementById('user-btn').classList.remove('hidden');
          document.getElementById('guest-link').classList.add('hidden');
          if (window.location.pathname === "/auth") { window.location.href = "/"; }
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          showGuest();
        });
    }
  });