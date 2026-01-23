$(() => {
  const SELECTORS = {
    booksContainer: "#books-container",
    paginationContainer: "#pagination-container",
    bookSearchInput: "#book-search-input",
    authorSearchInput: "#author-search-input",
    authorDropdown: "#author-dropdown",
    selectedAuthorsContainer: "#selected-authors-container",
    genresList: "#genres-list",
    applyFiltersBtn: "#apply-filters-btn",
    resetFiltersBtn: "#reset-filters-btn",
    adminActions: "#admin-actions",
    pagesMin: "#pages-min",
    pagesMax: "#pages-max",
  };

  const TEMPLATES = {
    bookCard: document.getElementById("book-card-template"),
    genreBadge: document.getElementById("genre-badge-template"),
    emptyState: document.getElementById("empty-state-template"),
  };

  const STATUS_CONFIG = {
    active: {
      label: "Доступна",
      bgClass: "bg-green-100",
      textClass: "text-green-800",
    },
    borrowed: {
      label: "Выдана",
      bgClass: "bg-yellow-100",
      textClass: "text-yellow-800",
    },
    reserved: {
      label: "Забронирована",
      bgClass: "bg-blue-100",
      textClass: "text-blue-800",
    },
    restoration: {
      label: "На реставрации",
      bgClass: "bg-orange-100",
      textClass: "text-orange-800",
    },
    written_off: {
      label: "Списана",
      bgClass: "bg-red-100",
      textClass: "text-red-800",
    },
  };

  const PAGE_SIZE = 12;

  const STATE = {
    selectedAuthors: new Map(),
    selectedGenres: new Map(),
    currentPage: 1,
    totalBooks: 0,
  };

  const urlParams = new URLSearchParams(window.location.search);
  const INITIAL_FILTERS = {
    search: urlParams.get("q") || "",
    authorIds: new Set(urlParams.getAll("author_id")),
    genreIds: new Set(urlParams.getAll("genre_id")),
  };

  if (INITIAL_FILTERS.search) {
    $(SELECTORS.bookSearchInput).val(INITIAL_FILTERS.search);
  }

  const LOADING_SKELETON_HTML = `<div class="space-y-4">${Array.from(
    { length: 3 },
    () => `
      <div class="bg-white p-4 rounded-lg shadow-md animate-pulse">
        <div class="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
      </div>
    `,
  ).join("")}</div>`;

  const USER_CAN_MANAGE =
    typeof window.canManage === "function" && window.canManage();

  function getStatusConfig(status) {
    return (
      STATUS_CONFIG[status] || {
        label: status || "Неизвестно",
        bgClass: "bg-gray-100",
        textClass: "text-gray-800",
      }
    );
  }

  function initAuthors(authors) {
    const $dropdown = $(SELECTORS.authorDropdown);
    const fragment = document.createDocumentFragment();

    authors.forEach((author) => {
      const item = document.createElement("div");
      item.className =
        "p-2 hover:bg-gray-100 cursor-pointer author-item transition-colors";
      item.dataset.id = author.id;
      item.dataset.name = author.name;
      item.textContent = author.name;
      fragment.appendChild(item);

      if (INITIAL_FILTERS.authorIds.has(String(author.id))) {
        STATE.selectedAuthors.set(author.id, author.name);
      }
    });

    $dropdown.empty().append(fragment);
  }

  function initGenres(genres) {
    const $list = $(SELECTORS.genresList);
    const canManage = USER_CAN_MANAGE;
    let html = "";

    genres.forEach((genre) => {
      const isChecked = INITIAL_FILTERS.genreIds.has(String(genre.id));
      if (isChecked) {
        STATE.selectedGenres.set(genre.id, genre.name);
      }
      const safeName = Utils.escapeHtml(genre.name);
      const editButton = canManage
        ? `<a href="/genre/${genre.id}/edit" class="ml-auto mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors" onclick="event.stopPropagation();" title="Редактировать жанр">
             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
             </svg>
           </a>`
        : "";
      html += `
        <li class="mb-1">
          <div class="flex items-center">
            <label class="custom-checkbox flex items-center flex-1">
              <input type="checkbox" data-id="${genre.id}" data-name="${safeName}" ${
                isChecked ? "checked" : ""
              } />
              <span class="checkmark"></span> ${safeName}
            </label>
            ${editButton}
          </div>
        </li>
      `;
    });

    $list.html(html);

    $list.on("change", "input", function () {
      const id = parseInt($(this).data("id"), 10);
      const name = $(this).data("name");
      if (this.checked) {
        STATE.selectedGenres.set(id, name);
      } else {
        STATE.selectedGenres.delete(id);
      }
    });
  }

  function getTotalPages() {
    return Math.max(1, Math.ceil(STATE.totalBooks / PAGE_SIZE));
  }

  function loadBooks() {
    const searchQuery = $(SELECTORS.bookSearchInput).val().trim();
    const $minPages = $(SELECTORS.pagesMin);
    const $maxPages = $(SELECTORS.pagesMax);
    const minPages = $minPages.length ? $minPages.val() : "";
    const maxPages = $maxPages.length ? $maxPages.val() : "";

    const apiParams = new URLSearchParams();
    const browserParams = new URLSearchParams();

    if (searchQuery) {
      apiParams.append("q", searchQuery);
      browserParams.append("q", searchQuery);
    }

    if (minPages && minPages > 0) {
      apiParams.append("min_page_count", minPages);
      browserParams.append("min_page_count", minPages);
    }

    if (maxPages && maxPages < 2000) {
      apiParams.append("max_page_count", maxPages);
      browserParams.append("max_page_count", maxPages);
    }

    STATE.selectedAuthors.forEach((_, id) => {
      apiParams.append("author_ids", id);
      browserParams.append("author_id", id);
    });

    STATE.selectedGenres.forEach((_, id) => {
      apiParams.append("genre_ids", id);
      browserParams.append("genre_id", id);
    });

    apiParams.append("page", STATE.currentPage);
    apiParams.append("size", PAGE_SIZE);

    const newUrl =
      window.location.pathname +
      (browserParams.toString() ? `?${browserParams.toString()}` : "");
    window.history.replaceState({}, "", newUrl);

    showLoadingState();

    Api.get(`/api/books/filter?${apiParams.toString()}`)
      .then((data) => {
        STATE.totalBooks = data.total || 0;
        renderBooks(data.books || []);
        renderPagination();
      })
      .catch((error) => {
        console.error(error);
        Utils.showToast("Не удалось загрузить книги", "error");
        $(SELECTORS.booksContainer).html(
          TEMPLATES.emptyState.content.cloneNode(true),
        );
      });
  }

  function renderBooks(books) {
    const $container = $(SELECTORS.booksContainer);
    $container.empty();

    if (!books.length) {
      $container.append(TEMPLATES.emptyState.content.cloneNode(true));
      return;
    }

    const fragment = document.createDocumentFragment();

    books.forEach((book) => {
      const clone = TEMPLATES.bookCard.content.cloneNode(true);
      const card = clone.querySelector(".book-card");
      card.dataset.id = book.id;

      const titleEl = clone.querySelector(".book-title");
      const authorsEl = clone.querySelector(".book-authors");
      const pageCountWrapper = clone.querySelector(".book-page-count");
      const pageCountValue =
        pageCountWrapper.querySelector(".page-count-value");
      const descEl = clone.querySelector(".book-desc");
      const statusEl = clone.querySelector(".book-status");
      const genresContainer = clone.querySelector(".book-genres");

      titleEl.textContent = book.title;
      authorsEl.textContent =
        (book.authors && book.authors.map((a) => a.name).join(", ")) ||
        "Автор неизвестен";

      if (book.page_count && book.page_count > 0) {
        pageCountValue.textContent = book.page_count;
        pageCountWrapper.classList.remove("hidden");
      }

      descEl.textContent = book.description || "";

      const statusConfig = getStatusConfig(book.status);
      statusEl.textContent = statusConfig.label;
      statusEl.classList.add(statusConfig.bgClass, statusConfig.textClass);

      if (Array.isArray(book.genres)) {
        book.genres.forEach((g) => {
          const badge = TEMPLATES.genreBadge.content.cloneNode(true);
          const span = badge.querySelector("span");
          span.textContent = g.name;
          genresContainer.appendChild(badge);
        });
      }

      fragment.appendChild(clone);
    });

    $container.append(fragment);
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

  function renderPagination() {
    const totalPages = getTotalPages();
    const $container = $(SELECTORS.paginationContainer);
    $container.empty();

    if (totalPages <= 1) {
      return;
    }

    const pages = generatePageNumbers(STATE.currentPage, totalPages);
    let pagesHtml = "";

    pages.forEach((page) => {
      if (page === "...") {
        pagesHtml += `<span class="px-3 py-2 text-gray-500">...</span>`;
      } else {
        const isActive = page === STATE.currentPage;
        pagesHtml += `<button class="page-btn px-3 py-2 rounded-lg transition-colors ${
          isActive
            ? "bg-gray-600 text-white"
            : "bg-white border border-gray-300 hover:bg-gray-50"
        }" data-page="${page}">${page}</button>`;
      }
    });

    const html = `
      <div class="flex justify-center items-center gap-2 mt-6 mb-4">
        <button id="prev-page" class="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${
          STATE.currentPage === 1 ? "disabled" : ""
        }>&larr;</button>
        <div id="page-numbers" class="flex gap-1">${pagesHtml}</div>
        <button id="next-page" class="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${
          STATE.currentPage === totalPages ? "disabled" : ""
        }>&rarr;</button>
      </div>
    `;

    $container.html(html);
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showLoadingState() {
    $(SELECTORS.booksContainer).html(LOADING_SKELETON_HTML);
  }

  function renderSelectedAuthors() {
    const $container = $(SELECTORS.selectedAuthorsContainer);
    const $dropdown = $(SELECTORS.authorDropdown);
    $container.empty();

    const fragment = document.createDocumentFragment();

    STATE.selectedAuthors.forEach((name, id) => {
      const wrapper = document.createElement("span");
      wrapper.className =
        "author-chip inline-flex items-center bg-gray-600 text-white text-sm font-medium px-2.5 pt-0.5 pb-1 rounded-full";
      wrapper.innerHTML = `
        ${Utils.escapeHtml(name)}
        <button type="button" class="remove-author mt-0.5 ml-2 inline-flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-400 rounded-full w-4 h-4 transition-colors" data-id="${id}">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      `;
      fragment.appendChild(wrapper);
    });

    $container.append(fragment);

    $dropdown.find(".author-item").each(function () {
      const id = parseInt($(this).data("id"), 10);
      if (STATE.selectedAuthors.has(id)) {
        $(this)
          .addClass("bg-gray-200 text-gray-900 font-semibold")
          .removeClass("hover:bg-gray-100");
      } else {
        $(this)
          .removeClass("bg-gray-200 text-gray-900 font-semibold")
          .addClass("hover:bg-gray-100");
      }
    });
  }

  function initializeAuthorDropdownListeners() {
    const $input = $(SELECTORS.authorSearchInput);
    const $dropdown = $(SELECTORS.authorDropdown);
    const $container = $(SELECTORS.selectedAuthorsContainer);

    $input.on("focus", () => {
      $dropdown.removeClass("hidden");
    });

    $input.on("input", function () {
      const val = $(this).val().toLowerCase();
      $dropdown.removeClass("hidden");
      $dropdown.find(".author-item").each(function () {
        const text = $(this).text().toLowerCase();
        $(this).toggle(text.includes(val));
      });
    });

    $(document).on("click", function (e) {
      if (
        !$(e.target).closest(
          `${SELECTORS.authorSearchInput}, ${SELECTORS.authorDropdown}, ${SELECTORS.selectedAuthorsContainer}`,
        ).length
      ) {
        $dropdown.addClass("hidden");
      }
    });

    $dropdown.on("click", ".author-item", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"), 10);
      const name = $(this).data("name");

      if (STATE.selectedAuthors.has(id)) {
        STATE.selectedAuthors.delete(id);
      } else {
        STATE.selectedAuthors.set(id, name);
      }

      $input.val("");
      $dropdown.find(".author-item").show();
      renderSelectedAuthors();
      $input[0].focus();
    });

    $container.on("click", ".remove-author", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"), 10);
      STATE.selectedAuthors.delete(id);
      renderSelectedAuthors();
    });
  }

  $(SELECTORS.booksContainer).on("click", ".book-card", function () {
    const id = $(this).data("id");
    if (id) {
      window.location.href = `/book/${id}`;
    }
  });

  $(SELECTORS.applyFiltersBtn).on("click", function () {
    STATE.currentPage = 1;
    loadBooks();
  });

  $(SELECTORS.resetFiltersBtn).on("click", function () {
    $(SELECTORS.bookSearchInput).val("");
    STATE.selectedAuthors.clear();
    STATE.selectedGenres.clear();
    $(`${SELECTORS.genresList} input`).prop("checked", false);

    const $min = $(SELECTORS.pagesMin);
    const $max = $(SELECTORS.pagesMax);
    if ($min.length && $max.length) {
      const minDefault = $min.attr("min");
      const maxDefault = $max.attr("max");
      if (minDefault !== undefined) $min.val(minDefault).trigger("input");
      if (maxDefault !== undefined) $max.val(maxDefault).trigger("input");
    }

    renderSelectedAuthors();
    STATE.currentPage = 1;
    loadBooks();
  });

  $(SELECTORS.bookSearchInput).on("keypress", function (e) {
    if (e.which === 13) {
      STATE.currentPage = 1;
      loadBooks();
    }
  });

  $(SELECTORS.paginationContainer).on("click", "#prev-page", function () {
    if (STATE.currentPage > 1) {
      STATE.currentPage -= 1;
      loadBooks();
      scrollToTop();
    }
  });

  $(SELECTORS.paginationContainer).on("click", "#next-page", function () {
    const totalPages = getTotalPages();
    if (STATE.currentPage < totalPages) {
      STATE.currentPage += 1;
      loadBooks();
      scrollToTop();
    }
  });

  $(SELECTORS.paginationContainer).on("click", ".page-btn", function () {
    const page = parseInt($(this).data("page"), 10);
    if (page && page !== STATE.currentPage) {
      STATE.currentPage = page;
      loadBooks();
      scrollToTop();
    }
  });

  if (USER_CAN_MANAGE) {
    $(SELECTORS.adminActions).removeClass("hidden");
  }

  Promise.all([Api.get("/api/authors"), Api.get("/api/genres")])
    .then(([authorsData, genresData]) => {
      initAuthors(authorsData.authors || []);
      initGenres(genresData.genres || []);
      initializeAuthorDropdownListeners();
      renderSelectedAuthors();
      loadBooks();
    })
    .catch((error) => {
      console.error(error);
      Utils.showToast("Ошибка загрузки данных", "error");
    });
});
