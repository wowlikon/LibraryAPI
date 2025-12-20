$(document).ready(() => {
    let allAuthors = [];
    let filteredAuthors = [];
    let currentPage = 1;
    let pageSize = 12;
    let currentSort = "name_asc";
  
    loadAuthors();
  
    function loadAuthors() {
      showLoadingState();
  
      fetch("/api/authors")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          allAuthors = data.authors;
          applyFiltersAndSort();
        })
        .catch((error) => {
          console.error("Error loading authors:", error);
          showErrorState();
        });
    }
  
    function applyFiltersAndSort() {
      const searchQuery = $("#author-search-input").val().trim().toLowerCase();
  
      filteredAuthors = allAuthors.filter((author) =>
        author.name.toLowerCase().includes(searchQuery)
      );
  
      filteredAuthors.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
  
        if (currentSort === "name_asc") {
          return nameA.localeCompare(nameB, "ru");
        } else {
          return nameB.localeCompare(nameA, "ru");
        }
      });
  
      updateResultsCounter();
  
      renderAuthors();
      renderPagination();
    }
  
    function updateResultsCounter() {
      const $counter = $("#results-counter");
      const total = filteredAuthors.length;
  
      if (total === 0) {
        $counter.text("Авторы не найдены");
      } else {
        const wordForm = getWordForm(total, ["автор", "автора", "авторов"]);
        $counter.text(`Найдено: ${total} ${wordForm}`);
      }
    }

    function getWordForm(number, forms) {
      const cases = [2, 0, 1, 1, 1, 2];
      const index =
        number % 100 > 4 && number % 100 < 20
          ? 2
          : cases[Math.min(number % 10, 5)];
      return forms[index];
    }
  
    function renderAuthors() {
      const $container = $("#authors-container");
      $container.empty();
  
      if (filteredAuthors.length === 0) {
        $container.html(`
          <div class="bg-white p-8 rounded-lg shadow-md text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Авторы не найдены</h3>
            <p class="text-gray-500">Попробуйте изменить параметры поиска</p>
          </div>
        `);
        return;
      }
  
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageAuthors = filteredAuthors.slice(startIndex, endIndex);
  
      const $grid = $('<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>');
  
      pageAuthors.forEach((author) => {
        const firstLetter = author.name.charAt(0).toUpperCase();
  
        const $authorCard = $(`
          <div class="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer author-card" data-id="${author.id}">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-gray-500 text-white rounded-full flex items-center justify-center text-xl font-bold mr-4">
                ${firstLetter}
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                  ${escapeHtml(author.name)}
                </h3>
                <p class="text-sm text-gray-500">ID: ${author.id}</p>
              </div>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        `);
  
        $grid.append($authorCard);
      });
  
      $container.append($grid);
  
      $container.off("click", ".author-card").on("click", ".author-card", function () {
        const authorId = $(this).data("id");
        window.location.href = `/author/${authorId}`;
      });
    }
  
    function renderPagination() {
      const $paginationContainer = $("#pagination-container");
      $paginationContainer.empty();
  
      const totalPages = Math.ceil(filteredAuthors.length / pageSize);
  
      if (totalPages <= 1) return;
  
      const $pagination = $(`
        <div class="flex justify-center items-center gap-2 mt-6 mb-4">
          <button id="prev-page" class="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === 1 ? "disabled" : ""}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div id="page-numbers" class="flex gap-1"></div>
          <button id="next-page" class="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === totalPages ? "disabled" : ""}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      `);
  
      const $pageNumbers = $pagination.find("#page-numbers");
  
      const pages = generatePageNumbers(currentPage, totalPages);
  
      pages.forEach((page) => {
        if (page === "...") {
          $pageNumbers.append(`<span class="px-3 py-2">...</span>`);
        } else {
          const isActive = page === currentPage;
          $pageNumbers.append(`
            <button class="page-btn px-3 py-2 rounded-lg ${isActive ? "bg-gray-500 text-white" : "bg-white border border-gray-300 hover:bg-gray-50"}" data-page="${page}">
              ${page}
            </button>
          `);
        }
      });
  
      $paginationContainer.append($pagination);
  
      $paginationContainer.find("#prev-page").on("click", function () {
        if (currentPage > 1) {
          currentPage--;
          renderAuthors();
          renderPagination();
          scrollToTop();
        }
      });
  
      $paginationContainer.find("#next-page").on("click", function () {
        if (currentPage < totalPages) {
          currentPage++;
          renderAuthors();
          renderPagination();
          scrollToTop();
        }
      });
  
      $paginationContainer.find(".page-btn").on("click", function () {
        const page = parseInt($(this).data("page"));
        if (page !== currentPage) {
          currentPage = page;
          renderAuthors();
          renderPagination();
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
      $("html, body").animate({ scrollTop: 0 }, 300);
    }
  
    function showLoadingState() {
      const $container = $("#authors-container");
      $container.html(`
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${Array(6)
            .fill()
            .map(
              () => `
            <div class="bg-white p-4 rounded-lg shadow-md animate-pulse">
              <div class="flex items-center">
                <div class="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                <div class="flex-1">
                  <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `);
    }
  
    function showErrorState() {
      const $container = $("#authors-container");
      $container.html(`
        <div class="bg-red-50 p-8 rounded-lg shadow-md text-center">
          <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="text-lg font-medium text-red-900 mb-2">Ошибка загрузки</h3>
          <p class="text-red-700 mb-4">Не удалось загрузить список авторов</p>
          <button id="retry-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
            Попробовать снова
          </button>
        </div>
      `);
  
      $("#retry-btn").on("click", loadAuthors);
    }
  
    function escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  
    function initializeFilters() {
      const $authorSearch = $("#author-search-input");
      const $resetBtn = $("#reset-filters-btn");
      const $sortRadios = $('input[name="sort"]');
  
      let searchTimeout;
      $authorSearch.on("input", function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          currentPage = 1;
          applyFiltersAndSort();
        }, 300);
      });
  
      $authorSearch.on("keypress", function (e) {
        if (e.which === 13) {
          clearTimeout(searchTimeout);
          currentPage = 1;
          applyFiltersAndSort();
        }
      });
  
      $sortRadios.on("change", function () {
        currentSort = $(this).val();
        currentPage = 1;
        applyFiltersAndSort();
      });
  
      $resetBtn.on("click", function () {
        $authorSearch.val("");
        $('input[name="sort"][value="name_asc"]').prop("checked", true);
        currentSort = "name_asc";
        currentPage = 1;
        applyFiltersAndSort();
      });
    }
  
    initializeFilters();
  
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
  
    $(document).on("keydown", function (e) {
      if (e.key === "Escape" && isDropdownOpen) {
        closeDropdown();
      }
    });
  
    $logoutBtn.on("click", function () {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.reload();
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
      const avatarImg = document.getElementById("user-avatar");
      if (avatarImg) {
        avatarImg.src = avatarUrl;
      }
    }
  
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
  
          document.getElementById("user-btn").classList.remove("hidden");
          document.getElementById("guest-link").classList.add("hidden");
        })
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          showGuest();
        });
    }
  });