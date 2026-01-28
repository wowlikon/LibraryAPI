$(document).ready(() => {
  if (!window.canManage()) return;
  setTimeout(() => window.canManage, 100);

  let allAuthors = [];
  let allGenres = [];
  const selectedAuthors = new Map();
  const selectedGenres = new Map();

  const $form = $("#create-book-form");
  const $submitBtn = $("#submit-btn");
  const $submitText = $("#submit-text");
  const $loadingSpinner = $("#loading-spinner");
  const $successModal = $("#success-modal");

  Promise.all([Api.get("/api/authors"), Api.get("/api/genres")])
    .then(([authorsData, genresData]) => {
      allAuthors = authorsData.authors || [];
      allGenres = genresData.genres || [];
      initAuthors(allAuthors);
      initGenres(allGenres);
      initializeDropdownListeners();
    })
    .catch((err) => {
      console.error("Ошибка загрузки данных:", err);
      Utils.showToast(
        "Не удалось загрузить списки авторов или жанров",
        "error",
      );
    });

  $("#book-title").on("input", function () {
    $("#title-counter").text(`${this.value.length}/255`);
  });

  $("#book-description").on("input", function () {
    $("#desc-counter").text(`${this.value.length}/2000`);
  });

  function initAuthors(authors) {
    const $dropdown = $("#author-dropdown");
    $dropdown.empty();
    authors.forEach((author) => {
      $("<div>")
        .addClass(
          "p-2 hover:bg-gray-100 cursor-pointer author-item transition-colors text-sm",
        )
        .attr("data-id", author.id)
        .attr("data-name", author.name)
        .text(author.name)
        .appendTo($dropdown);
    });
  }

  function initGenres(genres) {
    const $dropdown = $("#genre-dropdown");
    $dropdown.empty();
    genres.forEach((genre) => {
      $("<div>")
        .addClass(
          "p-2 hover:bg-gray-100 cursor-pointer genre-item transition-colors text-sm",
        )
        .attr("data-id", genre.id)
        .attr("data-name", genre.name)
        .text(genre.name)
        .appendTo($dropdown);
    });
  }

  function renderAuthorChips() {
    const $container = $("#selected-authors-container");
    const $dropdown = $("#author-dropdown");

    $container.empty();

    selectedAuthors.forEach((name, id) => {
      $(`<span class="inline-flex items-center bg-gray-600 text-white text-sm font-medium px-2.5 pt-0.5 pb-1 rounded-full">
                ${Utils.escapeHtml(name)}
                <button type="button" class="remove-author mt-0.5 ml-2 inline-flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500 rounded-full w-4 h-4 transition-colors" data-id="${id}">
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

  function renderGenreChips() {
    const $container = $("#selected-genres-container");
    const $dropdown = $("#genre-dropdown");

    $container.empty();

    selectedGenres.forEach((name, id) => {
      $(`<span class="inline-flex items-center bg-gray-600 text-white text-sm font-medium px-2.5 pt-0.5 pb-1 rounded-full">
                ${Utils.escapeHtml(name)}
                <button type="button" class="remove-genre mt-0.5 ml-2 inline-flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500 rounded-full w-4 h-4 transition-colors" data-id="${id}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </span>`).appendTo($container);
    });

    $dropdown.find(".genre-item").each(function () {
      const id = parseInt($(this).data("id"));
      if (selectedGenres.has(id)) {
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

  function initializeDropdownListeners() {
    const $authorInput = $("#author-search-input");
    const $authorDropdown = $("#author-dropdown");
    const $authorContainer = $("#selected-authors-container");

    $authorInput.on("focus", function () {
      $authorDropdown.removeClass("hidden");
    });

    $authorInput.on("input", function () {
      const val = $(this).val().toLowerCase();
      $authorDropdown.removeClass("hidden");
      $authorDropdown.find(".author-item").each(function () {
        const text = $(this).text().toLowerCase();
        $(this).toggle(text.includes(val));
      });
    });

    $authorDropdown.on("click", ".author-item", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      const name = $(this).data("name");

      if (selectedAuthors.has(id)) {
        selectedAuthors.delete(id);
      } else {
        selectedAuthors.set(id, name);
      }

      $authorInput.val("");
      $authorDropdown.find(".author-item").show();
      renderAuthorChips();
      $authorInput[0].focus();
    });

    $authorContainer.on("click", ".remove-author", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      selectedAuthors.delete(id);
      renderAuthorChips();
    });

    const $genreInput = $("#genre-search-input");
    const $genreDropdown = $("#genre-dropdown");
    const $genreContainer = $("#selected-genres-container");

    $genreInput.on("focus", function () {
      $genreDropdown.removeClass("hidden");
    });

    $genreInput.on("input", function () {
      const val = $(this).val().toLowerCase();
      $genreDropdown.removeClass("hidden");
      $genreDropdown.find(".genre-item").each(function () {
        const text = $(this).text().toLowerCase();
        $(this).toggle(text.includes(val));
      });
    });

    $genreDropdown.on("click", ".genre-item", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      const name = $(this).data("name");

      if (selectedGenres.has(id)) {
        selectedGenres.delete(id);
      } else {
        selectedGenres.set(id, name);
      }

      $genreInput.val("");
      $genreDropdown.find(".genre-item").show();
      renderGenreChips();
      $genreInput[0].focus();
    });

    $genreContainer.on("click", ".remove-genre", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      selectedGenres.delete(id);
      renderGenreChips();
    });

    $(document).on("click", function (e) {
      if (
        !$(e.target).closest(
          "#author-search-input, #author-dropdown, #selected-authors-container",
        ).length
      ) {
        $authorDropdown.addClass("hidden");
      }
      if (
        !$(e.target).closest(
          "#genre-search-input, #genre-dropdown, #selected-genres-container",
        ).length
      ) {
        $genreDropdown.addClass("hidden");
      }
    });
  }

  $form.on("submit", async function (e) {
    e.preventDefault();

    const title = $("#book-title").val().trim();
    const description = $("#book-description").val().trim();
    const pageCount = parseInt($("#book-page-count").val()) || null;

    if (!title) {
      Utils.showToast("Введите название книги", "error");
      return;
    }

    if (!pageCount) {
      Utils.showToast("Введите количество страниц", "error");
      return;
    }

    setLoading(true);

    try {
      const bookPayload = {
        title: title,
        description: description || null,
        page_count: pageCount,
      };

      const createdBook = await Api.post("/api/books/", bookPayload);

      const linkPromises = [];

      selectedAuthors.forEach((_, authorId) => {
        linkPromises.push(
          Api.post(
            `/api/relationships/author-book?author_id=${authorId}&book_id=${createdBook.id}`,
          ),
        );
      });

      selectedGenres.forEach((_, genreId) => {
        linkPromises.push(
          Api.post(
            `/api/relationships/genre-book?genre_id=${genreId}&book_id=${createdBook.id}`,
          ),
        );
      });

      if (linkPromises.length > 0) {
        await Promise.allSettled(linkPromises);
      }

      showSuccess(createdBook);
    } catch (error) {
      console.error("Ошибка создания:", error);

      let errorMsg = "Произошла ошибка при создании книги";
      if (error.responseJSON && error.responseJSON.detail) {
        errorMsg = error.responseJSON.detail;
      } else if (error.status === 401) {
        errorMsg = "Вы не авторизованы";
      } else if (error.status === 403) {
        errorMsg = "У вас недостаточно прав";
      }

      Utils.showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    $submitBtn.prop("disabled", isLoading);
    if (isLoading) {
      $submitText.text("Сохранение...");
      $loadingSpinner.removeClass("hidden");
    } else {
      $submitText.text("Создать книгу");
      $loadingSpinner.addClass("hidden");
    }
  }

  function showSuccess(book) {
    $("#modal-book-title").text(book.title);
    $("#modal-link-btn").attr("href", `/book/${book.id}`);
    $successModal.removeClass("hidden");
  }

  function resetForm() {
    $form[0].reset();
    selectedAuthors.clear();
    selectedGenres.clear();
    $("#selected-authors-container").empty();
    $("#selected-genres-container").empty();
    $("#title-counter").text("0/255");
    $("#desc-counter").text("0/2000");

    $("#author-dropdown .author-item")
      .removeClass("bg-gray-200 text-gray-900 font-semibold")
      .addClass("hover:bg-gray-100");
    $("#genre-dropdown .genre-item")
      .removeClass("bg-gray-200 text-gray-900 font-semibold")
      .addClass("hover:bg-gray-100");
  }

  $("#modal-close-btn").on("click", function () {
    $successModal.addClass("hidden");
    resetForm();
    window.scrollTo(0, 0);
  });

  $successModal.on("click", function (e) {
    if (e.target === this) {
      window.location.href = "/books";
    }
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && !$successModal.hasClass("hidden")) {
      window.location.href = "/books";
    }
  });
});
