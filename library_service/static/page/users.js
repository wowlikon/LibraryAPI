$(document).ready(() => {
  if (!window.isAdmin()) {
    $("#users-container").html(
      document.getElementById("access-denied-template").innerHTML,
    );
    return;
  }
  setTimeout(() => {
    if (!window.isAdmin()) {
      $("#users-container").html(
        document.getElementById("access-denied-template").innerHTML,
      );
    }
  }, 100);

  let allRoles = [];
  let users = [];
  let currentPage = 1;
  let pageSize = 20;
  let totalUsers = 0;
  let searchQuery = "";
  let selectedFilterRoles = new Set();
  let activeDropdown = null;
  let userToDelete = null;

  const defaultPlaceholder = "Фильтр по роли...";

  showLoadingState();

  Promise.all([
    Api.get("/api/auth/users?skip=0&limit=100"),
    Api.get("/api/auth/roles"),
  ])
    .then(([usersData, rolesData]) => {
      users = usersData.users;
      totalUsers = usersData.total;
      allRoles = rolesData.roles;
      $("#total-users-count").text(totalUsers);
      initRoleFilterDropdown();
      renderUsers();
      renderPagination();
    })
    .catch((error) => {
      console.error(error);
      Utils.showToast("Ошибка загрузки данных", "error");
    });

  function initRoleFilterDropdown() {
    const $dropdown = $("#role-filter-dropdown");
    $dropdown.empty();

    allRoles.forEach((role) => {
      $("<div>")
        .addClass(
          "p-2 hover:bg-gray-100 cursor-pointer role-filter-item transition-colors flex items-center justify-between",
        )
        .attr("data-name", role.name)
        .html(
          `<div>
                        <div class="font-medium text-sm">${Utils.escapeHtml(role.name)}</div>
                        ${role.description ? `<div class="text-xs text-gray-500">${Utils.escapeHtml(role.description)}</div>` : ""}
                    </div>
                    <svg class="check-icon w-4 h-4 text-green-600 hidden" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                    </svg>`,
        )
        .appendTo($dropdown);
    });

    initRoleFilterListeners();
  }

  function updateFilterPlaceholder() {
    const $input = $("#role-filter-input");
    const count = selectedFilterRoles.size;

    if (count === 0) {
      $input.attr("placeholder", defaultPlaceholder);
    } else {
      $input.attr("placeholder", `Выбрано ролей: ${count}`);
    }
  }

  function updateDropdownCheckmarks() {
    $("#role-filter-dropdown .role-filter-item").each(function () {
      const name = $(this).data("name");
      const $check = $(this).find(".check-icon");
      if (selectedFilterRoles.has(name)) {
        $check.removeClass("hidden");
        $(this).addClass("bg-gray-50");
      } else {
        $check.addClass("hidden");
        $(this).removeClass("bg-gray-50");
      }
    });
  }

  function initRoleFilterListeners() {
    const $input = $("#role-filter-input");
    const $dropdown = $("#role-filter-dropdown");

    $input.on("focus", function () {
      $dropdown.removeClass("hidden");
    });

    $input.on("input", function () {
      const val = $(this).val().toLowerCase();
      $dropdown.removeClass("hidden");
      $dropdown.find(".role-filter-item").each(function () {
        const name = $(this).data("name").toLowerCase();
        $(this).toggle(name.includes(val));
      });
    });

    $(document).on("click", function (e) {
      if (
        !$(e.target).closest("#role-filter-input, #role-filter-dropdown").length
      ) {
        $dropdown.addClass("hidden");
        $input.val("");
        $dropdown.find(".role-filter-item").show();
      }
    });

    $dropdown.on("click", ".role-filter-item", function (e) {
      e.stopPropagation();
      const name = $(this).data("name");

      if (selectedFilterRoles.has(name)) {
        selectedFilterRoles.delete(name);
      } else {
        selectedFilterRoles.add(name);
      }

      updateDropdownCheckmarks();
      updateFilterPlaceholder();
      renderUsers();
    });
  }

  function loadUsers() {
    const params = new URLSearchParams();
    params.append("skip", (currentPage - 1) * pageSize);
    params.append("limit", pageSize);

    showLoadingState();

    Api.get(`/api/auth/users?${params.toString()}`)
      .then((data) => {
        users = data.users;
        totalUsers = data.total;
        $("#total-users-count").text(totalUsers);
        renderUsers();
        renderPagination();
      })
      .catch((error) => {
        console.error(error);
        Utils.showToast("Не удалось загрузить пользователей", "error");
      });
  }

  async function renderUsers() {
    const $container = $("#users-container");
    const tpl = document.getElementById("user-card-template");
    const emptyTpl = document.getElementById("empty-state-template");
    const roleBadgeTpl = document.getElementById("role-badge-template");

    $container.empty();

    let filteredUsers = users;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          (user.full_name && user.full_name.toLowerCase().includes(q)),
      );
    }

    if (selectedFilterRoles.size > 0) {
      filteredUsers = filteredUsers.filter((user) => {
        if (!user.roles || user.roles.length === 0) return false;
        return Array.from(selectedFilterRoles).every((roleName) =>
          user.roles.includes(roleName),
        );
      });
    }

    if (filteredUsers.length === 0) {
      $container.append(emptyTpl.content.cloneNode(true));
      return;
    }

    const currentUser = window.getUser();

    for (const user of filteredUsers) {
      const clone = tpl.content.cloneNode(true);
      const card = clone.querySelector(".user-card");

      card.dataset.id = user.id;
      clone.querySelector(".user-fullname").textContent =
        user.full_name || user.username;
      clone.querySelector(".user-username").textContent = "@" + user.username;
      clone.querySelector(".user-email").textContent = user.email;

      const avatar = clone.querySelector(".user-avatar");
      Utils.getGravatarUrl(user.email).then((url) => {
        avatar.src = url;
      });

      if (user.is_verified) {
        clone.querySelector(".user-verified-badge").classList.remove("hidden");
      }
      if (user.is_active) {
        clone.querySelector(".user-active-badge").classList.remove("hidden");
      } else {
        clone.querySelector(".user-inactive-badge").classList.remove("hidden");
      }

      const rolesContainer = clone.querySelector(".user-roles");
      if (user.roles && user.roles.length > 0) {
        user.roles.forEach((roleName) => {
          const badge = roleBadgeTpl.content.cloneNode(true);
          const badgeSpan = badge.querySelector(".role-badge");

          if (roleName === "admin") {
            badgeSpan.classList.remove("bg-gray-600");
            badgeSpan.classList.add("bg-red-600");
          } else if (roleName === "librarian") {
            badgeSpan.classList.remove("bg-gray-600");
            badgeSpan.classList.add("bg-blue-600");
          }

          badge.querySelector(".role-name").textContent = roleName;
          const removeBtn = badge.querySelector(".remove-role-btn");
          removeBtn.dataset.userId = user.id;
          removeBtn.dataset.roleName = roleName;
          rolesContainer.appendChild(badge);
        });
      } else {
        rolesContainer.innerHTML =
          '<span class="text-gray-400 text-sm italic">Нет ролей</span>';
      }

      const addRoleBtn = clone.querySelector(".add-role-btn");
      addRoleBtn.dataset.userId = user.id;

      const editBtn = clone.querySelector(".edit-user-btn");
      editBtn.dataset.userId = user.id;

      const deleteBtn = clone.querySelector(".delete-user-btn");
      deleteBtn.dataset.userId = user.id;

      if (currentUser && currentUser.id === user.id) {
        deleteBtn.classList.add("opacity-30", "cursor-not-allowed");
        deleteBtn.disabled = true;
        deleteBtn.title = "Нельзя удалить себя";
      }

      $container.append(clone);
    }
  }

  function showLoadingState() {
    $("#users-container").html(`
            <div class="space-y-4">
                ${Array(3)
                  .fill()
                  .map(
                    () => `
                    <div class="bg-white p-4 rounded-lg shadow-md animate-pulse">
                        <div class="flex items-start gap-4">
                            <div class="w-14 h-14 bg-gray-200 rounded-full"></div>
                            <div class="flex-1">
                                <div class="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
                                <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                                <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                                <div class="flex gap-2">
                                    <div class="h-6 bg-gray-200 rounded-full w-16"></div>
                                    <div class="h-6 bg-gray-200 rounded-full w-20"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `);
  }

  function renderPagination() {
    $("#pagination-container").empty();
    const totalPages = Math.ceil(totalUsers / pageSize);
    if (totalPages <= 1) return;

    const $pagination = $(`
            <div class="flex justify-center items-center gap-2 mt-6 mb-4">
                <button id="prev-page" class="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition" ${currentPage === 1 ? "disabled" : ""}>&larr;</button>
                <div id="page-numbers" class="flex gap-1"></div>
                <button id="next-page" class="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition" ${currentPage === totalPages ? "disabled" : ""}>&rarr;</button>
            </div>
        `);

    const $pageNumbers = $pagination.find("#page-numbers");
    const pages = generatePageNumbers(currentPage, totalPages);

    pages.forEach((page) => {
      if (page === "...") {
        $pageNumbers.append(`<span class="px-3 py-2 text-gray-500">...</span>`);
      } else {
        const isActive = page === currentPage;
        $pageNumbers.append(`
                    <button class="page-btn px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-gray-600 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}" data-page="${page}">${page}</button>
                `);
      }
    });

    $("#pagination-container").append($pagination);

    $("#prev-page").on("click", function () {
      if (currentPage > 1) {
        currentPage--;
        loadUsers();
        scrollToTop();
      }
    });

    $("#next-page").on("click", function () {
      if (currentPage < totalPages) {
        currentPage++;
        loadUsers();
        scrollToTop();
      }
    });

    $(".page-btn").on("click", function () {
      const page = parseInt($(this).data("page"));
      if (page !== currentPage) {
        currentPage = page;
        loadUsers();
        scrollToTop();
      }
    });
  }

  function generatePageNumbers(current, total) {
    const pages = [];
    const delta = 2;
    for (let i = 1; i <= total; i++) {
      if (
        i === 1 ||
        i === total ||
        (i >= current - delta && i <= current + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showRoleDropdown(button, userId) {
    closeActiveDropdown();

    const user = users.find((u) => u.id === userId);
    const userRoles = user ? user.roles || [] : [];

    const availableRoles = allRoles.filter(
      (role) => !userRoles.includes(role.name),
    );

    if (availableRoles.length === 0) {
      Utils.showToast("Все роли уже назначены", "info");
      return;
    }

    const $dropdown = $(`
            <div class="role-add-dropdown absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden" style="min-width: 200px;">
                <div class="p-2 border-b border-gray-100">
                    <input type="text" class="role-search-input w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400" placeholder="Поиск роли..." autocomplete="off" />
                </div>
                <div class="role-items max-h-48 overflow-y-auto"></div>
            </div>
        `);

    const $roleItems = $dropdown.find(".role-items");

    availableRoles.forEach((role) => {
      const roleClass =
        role.name === "admin"
          ? "hover:bg-red-50"
          : role.name === "librarian"
            ? "hover:bg-blue-50"
            : "hover:bg-gray-50";

      $roleItems.append(`
                <div class="role-item p-2 ${roleClass} cursor-pointer transition-colors border-b border-gray-50 last:border-0" data-role-name="${Utils.escapeHtml(role.name)}">
                    <div class="font-medium text-sm text-gray-800">${Utils.escapeHtml(role.name)}</div>
                    ${role.description ? `<div class="text-xs text-gray-500">${Utils.escapeHtml(role.description)}</div>` : ""}
                    ${role.payroll ? `<div class="text-xs text-green-600">Оклад: ${role.payroll}</div>` : ""}
                </div>
            `);
    });

    const $button = $(button);
    const buttonOffset = $button.offset();
    const buttonHeight = $button.outerHeight();

    $dropdown.css({
      position: "fixed",
      top: buttonOffset.top + buttonHeight + 5,
      left: Math.max(10, buttonOffset.left - 150),
    });

    $("body").append($dropdown);
    activeDropdown = $dropdown;

    setTimeout(() => {
      $dropdown.find(".role-search-input").focus();
    }, 50);

    $dropdown.find(".role-search-input").on("input", function () {
      const searchVal = $(this).val().toLowerCase();
      $dropdown.find(".role-item").each(function () {
        const roleName = $(this).data("role-name").toLowerCase();
        $(this).toggle(roleName.includes(searchVal));
      });
    });

    $dropdown.on("click", ".role-item", function () {
      const roleName = $(this).data("role-name");
      addRoleToUser(userId, roleName);
      closeActiveDropdown();
    });

    $(document).on("keydown.roleDropdown", function (e) {
      if (e.key === "Escape") {
        closeActiveDropdown();
      }
    });
  }

  function closeActiveDropdown() {
    if (activeDropdown) {
      activeDropdown.remove();
      activeDropdown = null;
      $(document).off("keydown.roleDropdown");
    }
  }

  function addRoleToUser(userId, roleName) {
    Api.request(
      `/api/auth/users/${userId}/roles/${encodeURIComponent(roleName)}`,
      {
        method: "POST",
      },
    )
      .then((updatedUser) => {
        const userIndex = users.findIndex((u) => u.id === userId);
        if (userIndex !== -1) {
          users[userIndex] = updatedUser;
        }
        renderUsers();
        Utils.showToast(`Роль "${roleName}" добавлена`, "success");
      })
      .catch((error) => {
        console.error(error);
        Utils.showToast(error.message || "Ошибка добавления роли", "error");
      });
  }

  function removeRoleFromUser(userId, roleName) {
    const currentUser = window.getUser();

    if (currentUser && currentUser.id === userId && roleName === "admin") {
      Utils.showToast("Нельзя удалить свою роль администратора", "error");
      return;
    }

    Api.request(
      `/api/auth/users/${userId}/roles/${encodeURIComponent(roleName)}`,
      {
        method: "DELETE",
      },
    )
      .then((updatedUser) => {
        const userIndex = users.findIndex((u) => u.id === userId);
        if (userIndex !== -1) {
          users[userIndex] = updatedUser;
        }
        renderUsers();
        Utils.showToast(`Роль "${roleName}" удалена`, "success");
      })
      .catch((error) => {
        console.error(error);
        Utils.showToast(error.message || "Ошибка удаления роли", "error");
      });
  }

  function openEditModal(userId) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    $("#edit-user-id").val(user.id);
    $("#edit-user-email").val(user.email);
    $("#edit-user-fullname").val(user.full_name || "");
    $("#edit-user-password").val("");
    $("#edit-user-active").prop("checked", user.is_active);
    $("#edit-user-verified").prop("checked", user.is_verified);

    $("#edit-user-modal").removeClass("hidden");
  }

  function closeEditModal() {
    $("#edit-user-modal").addClass("hidden");
    $("#edit-user-form")[0].reset();
  }

  function saveUserChanges() {
    const userId = parseInt($("#edit-user-id").val());
    const email = $("#edit-user-email").val().trim();
    const fullName = $("#edit-user-fullname").val().trim();
    const password = $("#edit-user-password").val();

    if (!email) {
      Utils.showToast("Email обязателен", "error");
      return;
    }

    const updateData = {
      email: email,
      full_name: fullName || null,
    };

    if (password) {
      updateData.password = password;
    }

    Api.put(`/api/auth/me`, updateData)
      .then((updatedUser) => {
        const userIndex = users.findIndex((u) => u.id === userId);
        if (userIndex !== -1) {
          users[userIndex] = { ...users[userIndex], ...updatedUser };
        }
        renderUsers();
        closeEditModal();
        Utils.showToast("Пользователь обновлён", "success");
      })
      .catch((error) => {
        console.warn("API update failed, updating locally:", error);
        const userIndex = users.findIndex((u) => u.id === userId);
        if (userIndex !== -1) {
          users[userIndex].email = email;
          users[userIndex].full_name = fullName || null;
          users[userIndex].is_active = $("#edit-user-active").prop("checked");
          users[userIndex].is_verified = $("#edit-user-verified").prop(
            "checked",
          );
        }
        renderUsers();
        closeEditModal();
        Utils.showToast("Изменения сохранены локально", "info");
      });
  }

  function openDeleteModal(userId) {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const currentUser = window.getUser();
    if (currentUser && currentUser.id === userId) {
      Utils.showToast("Нельзя удалить себя", "error");
      return;
    }

    userToDelete = user;
    $("#delete-user-name").text(user.full_name || user.username);
    $("#delete-user-modal").removeClass("hidden");
  }

  function closeDeleteModal() {
    $("#delete-user-modal").addClass("hidden");
    userToDelete = null;
  }

  function confirmDeleteUser() {
    if (!userToDelete) return;

    Utils.showToast("Удаление пользователей не поддерживается API", "error");
    closeDeleteModal();

    // Api.delete(`/api/auth/users/${userToDelete.id}`)
    //     .then(() => {
    //         users = users.filter(u => u.id !== userToDelete.id);
    //         totalUsers--;
    //         $("#total-users-count").text(totalUsers);
    //         renderUsers();
    //         closeDeleteModal();
    //         Utils.showToast("Пользователь удалён", "success");
    //     })
    //     .catch((error) => {
    //         console.error(error);
    //         Utils.showToast(error.message || "Ошибка удаления", "error");
    //     });
  }

  $("#users-container").on("click", ".add-role-btn", function (e) {
    e.stopPropagation();
    const userId = parseInt($(this).data("user-id"));
    showRoleDropdown(this, userId);
  });

  $("#users-container").on("click", ".remove-role-btn", function (e) {
    e.stopPropagation();
    const userId = parseInt($(this).data("user-id"));
    const roleName = $(this).data("role-name");

    const user = users.find((u) => u.id === userId);
    const userName = user ? user.full_name || user.username : "пользователя";

    if (confirm(`Удалить роль "${roleName}" у ${userName}?`)) {
      removeRoleFromUser(userId, roleName);
    }
  });

  $("#users-container").on("click", ".edit-user-btn", function (e) {
    e.stopPropagation();
    const userId = parseInt($(this).data("user-id"));
    openEditModal(userId);
  });

  $("#edit-user-form").on("submit", function (e) {
    e.preventDefault();
    saveUserChanges();
  });

  $("#cancel-edit-btn, #modal-backdrop").on("click", closeEditModal);

  $("#users-container").on("click", ".delete-user-btn", function (e) {
    e.stopPropagation();
    if ($(this).prop("disabled")) return;
    const userId = parseInt($(this).data("user-id"));
    openDeleteModal(userId);
  });

  $("#confirm-delete-btn").on("click", confirmDeleteUser);
  $("#cancel-delete-btn, #delete-modal-backdrop").on("click", closeDeleteModal);

  $(document).on("click", function (e) {
    if (!$(e.target).closest(".role-add-dropdown, .add-role-btn").length) {
      closeActiveDropdown();
    }
  });

  let searchTimeout;
  $("#user-search-input").on("input", function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = $(this).val().trim();
      renderUsers();
    }, 300);
  });

  $("#user-search-input").on("keypress", function (e) {
    if (e.which === 13) {
      clearTimeout(searchTimeout);
      searchQuery = $(this).val().trim();
      renderUsers();
    }
  });

  $("#reset-filters-btn").on("click", function () {
    $("#user-search-input").val("");
    $("#role-filter-input").val("");
    searchQuery = "";
    selectedFilterRoles.clear();
    updateDropdownCheckmarks();
    updateFilterPlaceholder();
    renderUsers();
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      closeEditModal();
      closeDeleteModal();
    }
  });
});
