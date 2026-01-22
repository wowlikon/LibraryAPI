$(document).ready(() => {
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

  function getStatusConfig(status) {
    return (
      STATUS_CONFIG[status] || {
        label: status || "Неизвестно",
        bgClass: "bg-gray-100",
        textClass: "text-gray-800",
      }
    );
  }

  let selectedAuthors = new Map();
  let selectedGenres = new Map();
  let currentPage = 1;
  let pageSize = 12;
  let totalBooks = 0;

  const urlParams = new URLSearchParams(window.location.search);
  const genreIdsFromUrl = urlParams.getAll("genre_id");
  const authorIdsFromUrl = urlParams.getAll("author_id");
  const searchFromUrl = urlParams.get("q");

  if (searchFromUrl) $("#book-search-input").val(searchFromUrl);

  Promise.all([Api.get("/api/authors"), Api.get("/api/genres")])
    .then(([authorsData, genresData]) => {
      initAuthors(authorsData.authors);
      initGenres(genresData.genres);
      initializeAuthorDropdownListeners();
      renderChips();
      loadBooks();
    })
    .catch((error) => {
      console.error(error);
      Utils.showToast("Ошибка загрузки данных", "error");
    });

  function initAuthors(authors) {
    const $dropdown = $("#author-dropdown");
    authors.forEach((author) => {
      $("<div>")
        .addClass(
          "p-2 hover:bg-gray-100 cursor-pointer author-item transition-colors",
        )
        .attr("data-id", author.id)
        .attr("data-name", author.name)
        .text(author.name)
        .appendTo($dropdown);

      if (authorIdsFromUrl.includes(String(author.id))) {
        selectedAuthors.set(author.id, author.name);
      }
    });
  }

  function initGenres(genres) {
    const $list = $("#genres-list");
    genres.forEach((genre) => {
      const isChecked = genreIdsFromUrl.includes(String(genre.id));
      if (isChecked) selectedGenres.set(genre.id, genre.name);

      const editButton = window.canManage()
        ? `<a href="/genre/${genre.id}/edit" class="ml-auto mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors" onclick="event.stopPropagation();" title="Редактировать жанр">
             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
             </svg>
           </a>`
        : "";

      $list.append(`
        <li class="mb-1">
          <div class="flex items-center">
            <label class="custom-checkbox flex items-center flex-1">
              <input type="checkbox" data-id="${genre.id}" data-name="${Utils.escapeHtml(genre.name)}" ${isChecked ? "checked" : ""} />
              <span class="checkmark"></span> ${Utils.escapeHtml(genre.name)}
            </label>
            ${editButton}
          </div>
        </li>
      `);
    });

    $list.on("change", "input", function () {
      const id = parseInt($(this).data("id"));
      const name = $(this).data("name");
      this.checked ? selectedGenres.set(id, name) : selectedGenres.delete(id);
    });

    $list.on("change", "input", function () {
      const id = parseInt($(this).data("id"));
      const name = $(this).data("name");
      this.checked ? selectedGenres.set(id, name) : selectedGenres.delete(id);
    });
  }

  function loadBooks() {
    const searchQuery = $("#book-search-input").val().trim();
    const params = new URLSearchParams();

    params.append("q", searchQuery);
    selectedAuthors.forEach((_, id) => params.append("author_ids", id));
    selectedGenres.forEach((_, id) => params.append("genre_ids", id));

    const browserParams = new URLSearchParams();
    browserParams.append("q", searchQuery);
    selectedAuthors.forEach((_, id) => browserParams.append("author_id", id));
    selectedGenres.forEach((_, id) => browserParams.append("genre_id", id));

    const newUrl =
      window.location.pathname +
      (browserParams.toString() ? `?${browserParams.toString()}` : "");
    window.history.replaceState({}, "", newUrl);

    params.append("page", currentPage);
    params.append("size", pageSize);

    showLoadingState();

    Api.get(`/api/books/filter?${params.toString()}`)
      .then((data) => {
        totalBooks = data.total;
        renderBooks(data.books);
        renderPagination();
      })
      .catch((error) => {
        console.error(error);
        Utils.showToast("Не удалось загрузить книги", "error");
        $("#books-container").html(
          document.getElementById("empty-state-template").innerHTML,
        );
      });
  }

  function renderBooks(books) {
    const $container = $("#books-container");
    const tpl = document.getElementById("book-card-template");
    const emptyTpl = document.getElementById("empty-state-template");
    const badgeTpl = document.getElementById("genre-badge-template");

    $container.empty();

    if (books.length === 0) {
      $container.append(emptyTpl.content.cloneNode(true));
      return;
    }

    books.forEach((book) => {
      const clone = tpl.content.cloneNode(true);
      const card = clone.querySelector(".book-card");

      card.dataset.id = book.id;
      clone.querySelector(".book-title").textContent = book.title;
      clone.querySelector(".book-authors").textContent =
        book.authors.map((a) => a.name).join(", ") || "Автор неизвестен";
      if (book.page_count && book.page_count > 0) {
        const pageEl = clone.querySelector(".book-page-count");
        pageEl.querySelector(".page-count-value").textContent = book.page_count;
        pageEl.classList.remove("hidden");
      }
      clone.querySelector(".book-desc").textContent = book.description || "";

      const statusConfig = getStatusConfig(book.status);
      const statusEl = clone.querySelector(".book-status");
      statusEl.textContent = statusConfig.label;
      statusEl.classList.add(statusConfig.bgClass, statusConfig.textClass);

      const genresContainer = clone.querySelector(".book-genres");
      book.genres.forEach((g) => {
        const badge = badgeTpl.content.cloneNode(true);
        const span = badge.querySelector("span");
        span.textContent = g.name;
        genresContainer.appendChild(badge);
      });

      $container.append(clone);
    });
  }

  function renderPagination() {
    $("#pagination-container").empty();
    const totalPages = Math.ceil(totalBooks / pageSize);
    if (totalPages <= 1) return;

    const $pagination = $(`
            <div class="flex justify-center items-center gap-2 mt-6 mb-4">
                <button id="prev-page" class="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === 1 ? "disabled" : ""}>&larr;</button>
                <div id="page-numbers" class="flex gap-1"></div>
                <button id="next-page" class="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${currentPage === totalPages ? "disabled" : ""}>&rarr;</button>
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showLoadingState() {
    $("#books-container").html(`
            <div class="space-y-4">
                ${Array(3)
                  .fill()
                  .map(
                    () => `
                    <div class="bg-white p-4 rounded-lg shadow-md animate-pulse">
                        <div class="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div class="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
        `);
  }

  function renderChips() {
    const $container = $("#selected-authors-container");
    const $dropdown = $("#author-dropdown");

    $container.empty();

    selectedAuthors.forEach((name, id) => {
      $(`<span class="author-chip inline-flex items-center bg-gray-600 text-white text-sm font-medium px-2.5 pt-0.5 pb-1 rounded-full">
            ${Utils.escapeHtml(name)}
            <button type="button" class="remove-author mt-0.5 ml-2 inline-flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-400 rounded-full w-4 h-4 transition-colors" data-id="${id}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </span>`).appendTo($container);
    });

    $dropdown.find(".author-item").each(function () {
      const id = parseInt($(this).data("id"));
      if (selectedAuthors.has(id)) {
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
    const $input = $("#author-search-input");
    const $dropdown = $("#author-dropdown");
    const $container = $("#selected-authors-container");

    $input.on("focus", function () {
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
          "#author-search-input, #author-dropdown, #selected-authors-container",
        ).length
      ) {
        $dropdown.addClass("hidden");
      }
    });

    $dropdown.on("click", ".author-item", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      const name = $(this).data("name");

      if (selectedAuthors.has(id)) {
        selectedAuthors.delete(id);
      } else {
        selectedAuthors.set(id, name);
      }

      $input.val("");
      $dropdown.find(".author-item").show();
      renderChips();
      $input[0].focus();
    });

    $container.on("click", ".remove-author", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      selectedAuthors.delete(id);
      renderChips();
    });
  }

  $("#books-container").on("click", ".book-card", function () {
    window.location.href = `/book/${$(this).data("id")}`;
  });

  $("#apply-filters-btn").on("click", function () {
    currentPage = 1;
    loadBooks();
  });

  $("#reset-filters-btn").on("click", function () {
    $("#book-search-input").val("");
    selectedAuthors.clear();
    selectedGenres.clear();
    $("#genres-list input").prop("checked", false);
    renderChips();
    currentPage = 1;
    loadBooks();
  });

  $("#book-search-input").on("keypress", function (e) {
    if (e.which === 13) {
      currentPage = 1;
      loadBooks();
    }
  });

  function showAdminControls() {
    if (window.canManage()) {
      $("#admin-actions").removeClass("hidden");
    }
  }

  showAdminControls();
  setTimeout(showAdminControls, 100);
});
