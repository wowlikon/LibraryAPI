$(document).ready(() => {
    let currentUser = null;
    let allRoles = [];
    
    const token = localStorage.getItem("access_token");
  
    if (!token) {
      window.location.href = "/login";
      return;
    }
  
    loadProfile();
  
    function loadProfile() {
      showLoadingState();
  
      Promise.all([
        fetch("/api/auth/me", {
          headers: { Authorization: "Bearer " + token },
        }).then((response) => {
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Unauthorized");
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        }),
        fetch("/api/auth/roles", {
          headers: { Authorization: "Bearer " + token },
        }).then((response) => {
          if (response.ok) return response.json();
          return { roles: [] };
        }),
      ])
        .then(([user, rolesData]) => {
          currentUser = user;
          allRoles = rolesData.roles || [];
          renderProfile(user);
          renderAccountInfo(user);
          renderRoles(user.roles, allRoles);
          renderActions();
          document.title = `LiB - ${user.full_name || user.username}`;
        })
        .catch((error) => {
          console.error("Error loading profile:", error);
          if (error.message === "Unauthorized") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
          } else {
            showErrorState(error.message);
          }
        });
    }
  
    function renderProfile(user) {
      const $card = $("#profile-card");
      const displayName = user.full_name || user.username;
      const firstLetter = displayName.charAt(0).toUpperCase();
  
      const emailHash = sha256(user.email.trim().toLowerCase());
      const avatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=200`;
  
      $card.html(`
        <div class="flex flex-col sm:flex-row items-center sm:items-start">
          <!-- Аватар -->
          <div class="relative mb-4 sm:mb-0 sm:mr-6">
            <img src="${avatarUrl}" alt="Аватар" 
              class="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="w-24 h-24 bg-gray-500 text-white rounded-full items-center justify-center text-4xl font-bold hidden">
              ${firstLetter}
            </div>
            <!-- Статус верификации -->
            ${user.is_verified ? `
              <div class="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1" title="Подтверждённый аккаунт">
                <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            ` : ''}
          </div>
          
          <!-- Информация -->
          <div class="flex-1 text-center sm:text-left">
            <h1 class="text-2xl font-bold text-gray-900 mb-1">${escapeHtml(displayName)}</h1>
            <p class="text-gray-500 mb-3">@${escapeHtml(user.username)}</p>
            
            <!-- Статусы -->
            <div class="flex flex-wrap justify-center sm:justify-start gap-2">
              ${user.is_active ? `
                <span class="inline-flex items-center bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Активен
                </span>
              ` : `
                <span class="inline-flex items-center bg-red-100 text-red-800 text-sm px-3 py-1 rounded-full">
                  <span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Заблокирован
                </span>
              `}
              ${user.is_verified ? `
                <span class="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  Подтверждён
                </span>
              ` : `
                <span class="inline-flex items-center bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                  </svg>
                  Не подтверждён
                </span>
              `}
            </div>
          </div>
        </div>
      `);
    }
  
    function renderAccountInfo(user) {
      const $container = $("#account-container");
  
      $container.html(`
        <div class="space-y-4">
          <!-- ID пользователя -->
            <div class="flex items-center justify-between py-3 border-b border-gray-100">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                </svg>
                <div>
                  <p class="text-sm text-gray-500">ID пользователя</p>
                  <p class="text-gray-900">${user.id}</p>
                </div>
            </div>
          </div>
          <!-- Имя пользователя -->
          <div class="flex items-center justify-between py-3 border-b border-gray-100">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              <div>
                <p class="text-sm text-gray-500">Имя пользователя</p>
                <p class="text-gray-900">@${escapeHtml(user.username)}</p>
              </div>
            </div>
          </div>
  
          <!-- Полное имя -->
          <div class="flex items-center justify-between py-3 border-b border-gray-100">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>
              </svg>
              <div>
                <p class="text-sm text-gray-500">Полное имя</p>
                <p class="text-gray-900">${escapeHtml(user.full_name || "Не указано")}</p>
              </div>
            </div>
          </div>
          
          <!-- Email -->
          <div class="flex items-center justify-between py-3">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <div>
                <p class="text-sm text-gray-500">Email</p>
                <p class="text-gray-900">${escapeHtml(user.email)}</p>
              </div>
            </div>
          </div>
        </div>
      `);
    }
  
    function renderRoles(userRoles, allRoles) {
      const $container = $("#roles-container");
  
      if (!userRoles || userRoles.length === 0) {
        $container.html(`
          <p class="text-gray-500">У вас нет назначенных ролей</p>
        `);
        return;
      }
  
      const roleDescriptions = {};
      allRoles.forEach((role) => {
        roleDescriptions[role.name] = role.description;
      });
  
      const roleIcons = {
        admin: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
        </svg>`,
        librarian: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>`,
        member: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>`,
      };
  
      const roleColors = {
        admin: "bg-red-100 text-red-800 border-red-200",
        librarian: "bg-blue-100 text-blue-800 border-blue-200",
        member: "bg-green-100 text-green-800 border-green-200",
      };
    
      let rolesHtml = '<div class="space-y-3">';
    
      userRoles.forEach((roleName) => {
        const description = roleDescriptions[roleName] || "Описание недоступно";
        const icon = roleIcons[roleName] || roleIcons.member;
        const colorClass = roleColors[roleName] || roleColors.member;
    
        rolesHtml += `
          <div class="flex items-center p-4 rounded-lg border ${colorClass}">
            <div class="flex-shrink-0 mr-4">
              ${icon}
            </div>
            <div>
              <h4 class="font-medium capitalize">${escapeHtml(roleName)}</h4>
              <p class="text-sm opacity-75">${escapeHtml(description)}</p>
            </div>
          </div>
        `;
      });
    
      rolesHtml += '</div>';
  
      $container.html(rolesHtml);
    }
  
    function renderActions() {
      const $container = $("#actions-container");
  
      $container.html(`
        <div class="space-y-3">
          <!-- Смена пароля -->
          <button id="change-password-btn" class="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-gray-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
              <span class="text-gray-700">Сменить пароль</span>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
  
          <!-- Выход -->
          <button id="logout-profile-btn" class="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span class="text-red-700">Выйти из аккаунта</span>
            </div>
            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      `);
  
      $("#change-password-btn").on("click", openPasswordModal);
      $("#logout-profile-btn").on("click", logout);
    }
  
    function openPasswordModal() {
      $("#password-modal").removeClass("hidden").addClass("flex");
      $("#current-password").focus();
    }
  
    function closePasswordModal() {
      $("#password-modal").removeClass("flex").addClass("hidden");
      $("#password-form")[0].reset();
      $("#password-error").addClass("hidden").text("");
    }
  
    $("#close-password-modal, #cancel-password").on("click", closePasswordModal);
  
    $("#password-modal").on("click", function (e) {
      if (e.target === this) {
        closePasswordModal();
      }
    });
  
    $(document).on("keydown", function (e) {
      if (e.key === "Escape" && $("#password-modal").hasClass("flex")) {
        closePasswordModal();
      }
    });
  
    $("#password-form").on("submit", function (e) {
      e.preventDefault();
  
      const currentPassword = $("#current-password").val();
      const newPassword = $("#new-password").val();
      const confirmPassword = $("#confirm-password").val();
      const $error = $("#password-error");
  
      if (newPassword !== confirmPassword) {
        $error.text("Пароли не совпадают").removeClass("hidden");
        return;
      }
  
      if (newPassword.length < 6) {
        $error.text("Пароль должен содержать минимум 6 символов").removeClass("hidden");
        return;
      }
  
      // TODO: смена пароля, 2FA
      // fetch("/api/auth/change-password", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: "Bearer " + token,
      //   },
      //   body: JSON.stringify({
      //     current_password: currentPassword,
      //     new_password: newPassword,
      //   }),
      // })
      //   .then((response) => {
      //     if (!response.ok) throw new Error("Ошибка смены пароля");
      //     return response.json();
      //   })
      //   .then(() => {
      //     closePasswordModal();
      //     showNotification("Пароль успешно изменён", "success");
      //   })
      //   .catch((error) => {
      //     $error.text(error.message).removeClass("hidden");
      //   });
  
      $error.text("Функция смены пароля временно недоступна").removeClass("hidden");
    });
  
    function logout() {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
    }
  
    function showLoadingState() {
      const $profileCard = $("#profile-card");
      const $accountContainer = $("#account-container");
      const $rolesContainer = $("#roles-container");
      const $actionsContainer = $("#actions-container");
  
      $profileCard.html(`
        <div class="flex flex-col sm:flex-row items-center sm:items-start animate-pulse">
          <div class="w-24 h-24 bg-gray-200 rounded-full mb-4 sm:mb-0 sm:mr-6"></div>
          <div class="flex-1 text-center sm:text-left">
            <div class="h-7 bg-gray-200 rounded w-48 mx-auto sm:mx-0 mb-2"></div>
            <div class="h-5 bg-gray-200 rounded w-32 mx-auto sm:mx-0 mb-3"></div>
            <div class="flex justify-center sm:justify-start gap-2">
              <div class="h-7 bg-gray-200 rounded-full w-20"></div>
              <div class="h-7 bg-gray-200 rounded-full w-28"></div>
            </div>
          </div>
        </div>
      `);
  
      $accountContainer.html(`
        <div class="space-y-4 animate-pulse">
          ${Array(4)
            .fill()
            .map(
              () => `
            <div class="flex items-center py-3 border-b border-gray-100">
              <div class="w-5 h-5 bg-gray-200 rounded mr-3"></div>
              <div>
                <div class="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                <div class="h-4 bg-gray-200 rounded w-40"></div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `);
  
      $rolesContainer.html(`
        <div class="space-y-3 animate-pulse">
          <div class="h-16 bg-gray-200 rounded-lg"></div>
        </div>
      `);
  
      $actionsContainer.html(`
        <div class="space-y-3 animate-pulse">
          <div class="h-14 bg-gray-200 rounded-lg"></div>
          <div class="h-14 bg-gray-200 rounded-lg"></div>
        </div>
      `);
    }
  
    function showErrorState(message) {
      const $profileCard = $("#profile-card");
      const $accountSection = $("#account-section");
      const $rolesSection = $("#roles-section");
      const $actionsSection = $("#actions-section");
  
      $accountSection.hide();
      $rolesSection.hide();
      $actionsSection.hide();
  
      $profileCard.html(`
        <div class="text-center py-8">
          <svg class="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="text-xl font-medium text-gray-900 mb-2">${escapeHtml(message)}</h3>
          <p class="text-gray-500 mb-6">Не удалось загрузить профиль</p>
          <div class="flex justify-center gap-4">
            <button id="retry-btn" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              Попробовать снова
            </button>
            <a href="/" class="bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
              На главную
            </a>
          </div>
        </div>
      `);
  
      $("#retry-btn").on("click", function () {
        $accountSection.show();
        $rolesSection.show();
        $actionsSection.show();
        loadProfile();
      });
    }
  
    function escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  
    const $guestLink = $("#guest-link");
    const $userBtn = $("#user-btn");
    const $userDropdown = $("#user-dropdown");
    const $userArrow = $("#user-arrow");
    const $userAvatar = $("#user-avatar");
    const $dropdownName = $("#dropdown-name");
    const $dropdownUsername = $("#dropdown-username");
    const $dropdownEmail = $("#dropdown-email");
    const $logoutBtn = $("#logout-btn");
  
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
  
    $logoutBtn.on("click", logout);
  
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

    if (currentUser) {
      showUser(currentUser);
    }
  });