$(document).ready(() => {
  let selectedAuthors = new Map();
  let selectedGenres = new Map();
  let currentPage = 1;
  let pageSize = 20;
  let totalBooks = 0;

  const urlParams = new URLSearchParams(window.location.search);
  const genreIdsFromUrl = urlParams.getAll("genre_id");
  const authorIdsFromUrl = urlParams.getAll("author_id");
  const searchFromUrl = urlParams.get("q");

  Promise.all([
    fetch("/api/authors").then((response) => response.json()),
    fetch("/api/genres").then((response) => response.json()),
  ])
    .then(([authorsData, genresData]) => {
      const $dropdown = $("#author-dropdown");
      authorsData.authors.forEach((author) => {
        $("<div>")
          .addClass("p-2 hover:bg-gray-100 cursor-pointer author-item")
          .attr("data-id", author.id)
          .attr("data-name", author.name)
          .text(author.name)
          .appendTo($dropdown);
        
        if (authorIdsFromUrl.includes(String(author.id))) {
          selectedAuthors.set(author.id, author.name);
        }
      });

      const $list = $("#genres-list");
      genresData.genres.forEach((genre) => {
        const isChecked = genreIdsFromUrl.includes(String(genre.id));
        
        if (isChecked) {
          selectedGenres.set(genre.id, genre.name);
        }

        $("<li>")
          .addClass("mb-1")
          .html(
            `<label class="custom-checkbox flex items-center">
              <input type="checkbox" data-id="${genre.id}" data-name="${genre.name}" ${isChecked ? 'checked' : ''} />
              <span class="checkmark"></span>
              ${genre.name}
            </label>`,
          )
          .appendTo($list);
      });

      initializeAuthorDropdown();
      initializeFilters();
      
      loadBooks();
    })
    .catch((error) => console.error("Error loading data:", error));

  function loadBooks() {
    const searchQuery = $("#book-search-input").val().trim();

    const params = new URLSearchParams();
    if (searchQuery.length >= 3) {
      params.append("q", searchQuery);
    }

    selectedAuthors.forEach((name, id) => {
      params.append("author_ids", id);
    });

    selectedGenres.forEach((name, id) => {
      params.append("genre_ids", id);
    });

    function updateBrowserUrl() {
      const params = new URLSearchParams();
      
      const searchQuery = $("#book-search-input").val().trim();
      if (searchQuery.length >= 3) {
        params.append("q", searchQuery);
      }
  
      selectedAuthors.forEach((name, id) => {
        params.append("author_id", id);
      });
  
      selectedGenres.forEach((name, id) => {
        params.append("genre_id", id);
      });
  
      const newUrl = params.toString() 
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      
      window.history.replaceState({}, "", newUrl);
    }

    params.append("page", currentPage);
    params.append("size", pageSize);

    const url = `/api/books/filter?${params.toString()}`;

    showLoadingState();

    updateBrowserUrl();

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        totalBooks = data.total;
        renderBooks(data.books);
        renderPagination();
      })
      .catch((error) => {
        console.error("Error loading books:", error);
        showErrorState();
      });
  }

  function renderBooks(books) {
    const $container = $("#books-container");
    $container.empty();

    if (books.length === 0) {
      $container.html(`
        <div class="bg-white p-8 rounded-lg shadow-md text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Книги не найдены</h3>
          <p class="text-gray-500">Попробуйте изменить параметры поиска или фильтры</p>
        </div>
      `);
      return;
    }

    books.forEach((book) => {
      const authorsText =
        book.authors.map((a) => a.name).join(", ") || "Автор неизвестен";
      const genresText =
        book.genres.map((g) => g.name).join(", ") || "Без жанра";

      const $bookCard = $(`
        <div class="bg-white p-4 rounded-lg shadow-md mb-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer book-card" data-id="${book.id}">
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="text-lg font-bold mb-1 text-gray-900 hover:text-blue-600 transition-colors">
                ${escapeHtml(book.title)}
              </h3>
              <p class="text-sm text-gray-600 mb-2">
                <span class="font-medium">Авторы:</span> ${escapeHtml(authorsText)}
              </p>
              <p class="text-gray-700 text-sm mb-2">
                ${escapeHtml(book.description || "Описание отсутствует")}
              </p>
              <div class="flex flex-wrap gap-1">
                ${book.genres
                  .map(
                    (g) => `
                  <span class="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    ${escapeHtml(g.name)}
                  </span>
                `,
                  )
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      `);

      $container.append($bookCard);
    });
    
    $container.on("click", ".book-card", function () {
      const bookId = $(this).data("id");
      window.location.href = `/book/${bookId}`;
    });
  }

  function renderPagination() {
    $("#pagination-container").remove();

    const totalPages = Math.ceil(totalBooks / pageSize);

    if (totalPages <= 1) return;

    const $pagination = $(`
      <div id="pagination-container" class="flex justify-center items-center gap-2 mt-6 mb-4">
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

    $("#books-container").after($pagination);

    $("#prev-page").on("click", function () {
      if (currentPage > 1) {
        currentPage--;
        loadBooks();
        scrollToTop();
      }
    });

    $("#next-page").on("click", function () {
      if (currentPage < totalPages) {
        currentPage++;
        loadBooks();
        scrollToTop();
      }
    });

    $(".page-btn").on("click", function () {
      const page = parseInt($(this).data("page"));
      if (page !== currentPage) {
        currentPage = page;
        loadBooks();
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
    const $container = $("#books-container");
    $container.html(`
      <div class="space-y-4">
        ${Array(3)
          .fill()
          .map(
            () => `
          <div class="bg-white p-4 rounded-lg shadow-md animate-pulse">
            <div class="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div class="flex gap-2">
              <div class="h-6 bg-gray-200 rounded-full w-16"></div>
              <div class="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `);
  }

  function showErrorState() {
    const $container = $("#books-container");
    $container.html(`
      <div class="bg-red-50 p-8 rounded-lg shadow-md text-center">
        <svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <h3 class="text-lg font-medium text-red-900 mb-2">Ошибка загрузки</h3>
        <p class="text-red-700 mb-4">Не удалось загрузить список книг</p>
        <button id="retry-btn" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
          Попробовать снова
        </button>
      </div>
    `);

    $("#retry-btn").on("click", loadBooks);
  }

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function initializeAuthorDropdown() {
    const $input = $("#author-search-input");
    const $dropdown = $("#author-dropdown");
    const $container = $("#selected-authors-container");

    function updateHighlights() {
      $dropdown.find(".author-item").each(function () {
        const id = $(this).attr("data-id");
        const isSelected = selectedAuthors.has(parseInt(id));
        $(this)
          .toggleClass("bg-gray-300 text-gray-600", isSelected)
          .toggleClass("hover:bg-gray-100", !isSelected);
      });
    }

    function filterDropdown(query) {
      const lowerQuery = query.toLowerCase();
      $dropdown.find(".author-item").each(function () {
        $(this).toggle($(this).text().toLowerCase().includes(lowerQuery));
      });
    }

    function renderChips() {
      $container.find(".author-chip").remove();
      selectedAuthors.forEach((name, id) => {
        $(`<span class="author-chip flex items-center bg-gray-500 text-white text-sm font-medium px-2.5 py-0.5 rounded-full">
            ${escapeHtml(name)}
            <button type="button" class="remove-author ml-1.5 inline-flex items-center p-0.5 text-gray-200 hover:text-white hover:bg-gray-600 rounded-full" data-id="${id}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
            </button>
          </span>`).insertBefore($input);
      });
      updateHighlights();
    }

    function toggleAuthor(id, name) {
      id = parseInt(id);
      if (selectedAuthors.has(id)) {
        selectedAuthors.delete(id);
      } else {
        selectedAuthors.add(id, name);
        selectedAuthors.set(id, name);
      }
      $input.val("");
      filterDropdown("");
      renderChips();
    }

    $input.on("focus", () => $dropdown.removeClass("hidden"));

    $input.on("input", function () {
      filterDropdown($(this).val().toLowerCase());
      $dropdown.removeClass("hidden");
    });

    $(document).on("click", (e) => {
      if (
        !$(e.target).closest("#selected-authors-container, #author-dropdown")
          .length
      ) {
        $dropdown.addClass("hidden");
      }
    });

    $dropdown.on("click", ".author-item", function (e) {
      e.stopPropagation();
      toggleAuthor($(this).attr("data-id"), $(this).attr("data-name"));
      $input.focus();
    });

    $container.on("click", ".remove-author", function (e) {
      e.stopPropagation();
      selectedAuthors.delete(parseInt($(this).attr("data-id")));
      renderChips();
      $input.focus();
    });

    $container.on("click", (e) => {
      if (!$(e.target).closest(".author-chip").length) {
        $input.focus();
      }
    });

    window.renderAuthorChips = renderChips;
    window.updateAuthorHighlights = updateHighlights;
  }

  function initializeFilters() {
    const $bookSearch = $("#book-search-input");
    const $applyBtn = $("#apply-filters-btn");
    const $resetBtn = $("#reset-filters-btn");

    $("#genres-list").on("change", "input[type='checkbox']", function () {
      const id = parseInt($(this).attr("data-id"));
      const name = $(this).attr("data-name");
      if ($(this).is(":checked")) {
        selectedGenres.set(id, name);
      } else {
        selectedGenres.delete(id);
      }
    });

    $applyBtn.on("click", function () {
      currentPage = 1;
      loadBooks();
    });

    $resetBtn.on("click", function () {
      $bookSearch.val("");

      selectedAuthors.clear();
      $("#selected-authors-container .author-chip").remove();
      if (window.updateAuthorHighlights) window.updateAuthorHighlights();

      selectedGenres.clear();
      $("#genres-list input[type='checkbox']").prop("checked", false);

      currentPage = 1;
      loadBooks();
    });

    let searchTimeout;
    $bookSearch.on("input", function () {
      clearTimeout(searchTimeout);
      const query = $(this).val().trim();

      if (query.length >= 3 || query.length === 0) {
        searchTimeout = setTimeout(() => {
          currentPage = 1;
          loadBooks();
        }, 500);
      }
    });

    $bookSearch.on("keypress", function (e) {
      if (e.which === 13) {
        clearTimeout(searchTimeout);
        currentPage = 1;
        loadBooks();
      }
    });
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
