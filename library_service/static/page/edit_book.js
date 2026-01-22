$(document).ready(() => {
  if (!window.canManage()) return;
  setTimeout(() => window.canManage, 100);

  const pathParts = window.location.pathname.split("/");
  const bookId = parseInt(pathParts[pathParts.length - 2]);

  if (!bookId || isNaN(bookId)) {
    Utils.showToast("Некорректный ID книги", "error");
    setTimeout(() => (window.location.href = "/books"), 1500);
    return;
  }

  let originalBook = null;
  let allAuthors = [];
  let allGenres = [];
  const currentAuthors = new Map();
  const currentGenres = new Map();

  const $form = $("#edit-book-form");
  const $loader = $("#loader");
  const $dangerZone = $("#danger-zone");
  const $titleInput = $("#book-title");
  const $descInput = $("#book-description");
  const $statusSelect = $("#book-status");
  const $pagesInput = $("#book-page-count");
  const $submitBtn = $("#submit-btn");
  const $submitText = $("#submit-text");
  const $loadingSpinner = $("#loading-spinner");
  const $deleteModal = $("#delete-modal");
  const $successModal = $("#success-modal");

  Promise.all([
    Api.get(`/api/books/${bookId}`),
    Api.get(`/api/books/${bookId}/authors/`),
    Api.get(`/api/books/${bookId}/genres/`),
    Api.get("/api/authors"),
    Api.get("/api/genres"),
  ])
    .then(([book, bookAuthors, bookGenres, authorsData, genresData]) => {
      originalBook = book;
      allAuthors = authorsData.authors || [];
      allGenres = genresData.genres || [];

      (bookAuthors.authors || bookAuthors || []).forEach((a) =>
        currentAuthors.set(a.id, a.name),
      );
      (bookGenres.genres || bookGenres || []).forEach((g) =>
        currentGenres.set(g.id, g.name),
      );

      document.title = `Редактирование: ${book.title} | LiB`;
      populateForm(book);
      initAuthorsDropdown();
      initGenresDropdown();
      renderCurrentAuthors();
      renderCurrentGenres();

      $loader.addClass("hidden");
      $form.removeClass("hidden");
      $dangerZone.removeClass("hidden");
      $("#cancel-btn").attr("href", `/book/${bookId}`);
    })
    .catch((error) => {
      console.error(error);
      Utils.showToast("Ошибка загрузки данных", "error");
      setTimeout(() => (window.location.href = "/books"), 1500);
    });

  function populateForm(book) {
    $titleInput.val(book.title);
    $descInput.val(book.description || "");
    $pagesInput.val(book.page_count);
    $statusSelect.val(book.status);
    updateCounters();
  }

  function updateCounters() {
    $("#title-counter").text(`${$titleInput.val().length}/255`);
    $("#desc-counter").text(`${$descInput.val().length}/2000`);
  }

  $titleInput.on("input", updateCounters);
  $descInput.on("input", updateCounters);

  function initAuthorsDropdown() {
    const $dropdown = $("#author-dropdown");
    $dropdown.empty();
    allAuthors.forEach((author) => {
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

  function initGenresDropdown() {
    const $dropdown = $("#genre-dropdown");
    $dropdown.empty();
    allGenres.forEach((genre) => {
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

  function renderCurrentAuthors() {
    const $container = $("#current-authors-container");
    const $dropdown = $("#author-dropdown");

    $container.empty();
    $("#authors-count").text(
      currentAuthors.size > 0 ? `(${currentAuthors.size})` : "",
    );

    currentAuthors.forEach((name, id) => {
      $(`<span class="inline-flex items-center bg-gray-600 text-white text-sm font-medium px-2.5 pt-0.5 pb-1 rounded-full">
                ${Utils.escapeHtml(name)}
                <button type="button" class="remove-author mt-0.5 ml-2 inline-flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500 rounded-full w-4 h-4 transition-colors" data-id="${id}" data-name="${Utils.escapeHtml(name)}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </span>`).appendTo($container);
    });

    $dropdown.find(".author-item").each(function () {
      const id = parseInt($(this).data("id"));
      if (currentAuthors.has(id)) {
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

  function renderCurrentGenres() {
    const $container = $("#current-genres-container");
    const $dropdown = $("#genre-dropdown");

    $container.empty();
    $("#genres-count").text(
      currentGenres.size > 0 ? `(${currentGenres.size})` : "",
    );

    currentGenres.forEach((name, id) => {
      $(`<span class="inline-flex items-center bg-gray-600 text-white text-sm font-medium px-2.5 pt-0.5 pb-1 rounded-full">
                ${Utils.escapeHtml(name)}
                <button type="button" class="remove-genre mt-0.5 ml-2 inline-flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500 rounded-full w-4 h-4 transition-colors" data-id="${id}" data-name="${Utils.escapeHtml(name)}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </span>`).appendTo($container);
    });

    $dropdown.find(".genre-item").each(function () {
      const id = parseInt($(this).data("id"));
      if (currentGenres.has(id)) {
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

  const $authorInput = $("#author-search-input");
  const $authorDropdown = $("#author-dropdown");
  const $authorContainer = $("#current-authors-container");

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

  $authorDropdown.on("click", ".author-item", async function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data("id"));
    const name = $(this).data("name");

    if (currentAuthors.has(id)) {
      return;
    }

    $(this).addClass("opacity-50 pointer-events-none");

    try {
      await Api.post(
        `/api/relationships/author-book?author_id=${id}&book_id=${bookId}`,
      );
      currentAuthors.set(id, name);
      renderCurrentAuthors();
      Utils.showToast(`Автор "${name}" добавлен`, "success");
    } catch (error) {
      console.error(error);
      Utils.showToast("Ошибка добавления автора", "error");
    } finally {
      $(this).removeClass("opacity-50 pointer-events-none");
    }

    $authorInput.val("");
    $authorDropdown.find(".author-item").show();
  });

  $authorContainer.on("click", ".remove-author", async function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data("id"));
    const name = $(this).data("name");
    const $chip = $(this).parent();

    $chip.addClass("opacity-50");

    try {
      await Api.delete(
        `/api/relationships/author-book?author_id=${id}&book_id=${bookId}`,
      );
      currentAuthors.delete(id);
      renderCurrentAuthors();
      Utils.showToast(`Автор "${name}" удалён`, "success");
    } catch (error) {
      console.error(error);
      Utils.showToast("Ошибка удаления автора", "error");
      $chip.removeClass("opacity-50");
    }
  });

  const $genreInput = $("#genre-search-input");
  const $genreDropdown = $("#genre-dropdown");
  const $genreContainer = $("#current-genres-container");

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

  $genreDropdown.on("click", ".genre-item", async function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data("id"));
    const name = $(this).data("name");

    if (currentGenres.has(id)) {
      return;
    }

    $(this).addClass("opacity-50 pointer-events-none");

    try {
      await Api.post(
        `/api/relationships/genre-book?genre_id=${id}&book_id=${bookId}`,
      );
      currentGenres.set(id, name);
      renderCurrentGenres();
      Utils.showToast(`Жанр "${name}" добавлен`, "success");
    } catch (error) {
      console.error(error);
      Utils.showToast("Ошибка добавления жанра", "error");
    } finally {
      $(this).removeClass("opacity-50 pointer-events-none");
    }

    $genreInput.val("");
    $genreDropdown.find(".genre-item").show();
  });

  $genreContainer.on("click", ".remove-genre", async function (e) {
    e.stopPropagation();
    const id = parseInt($(this).data("id"));
    const name = $(this).data("name");
    const $chip = $(this).parent();

    $chip.addClass("opacity-50");

    try {
      await Api.delete(
        `/api/relationships/genre-book?genre_id=${id}&book_id=${bookId}`,
      );
      currentGenres.delete(id);
      renderCurrentGenres();
      Utils.showToast(`Жанр "${name}" удалён`, "success");
    } catch (error) {
      console.error(error);
      Utils.showToast("Ошибка удаления жанра", "error");
      $chip.removeClass("opacity-50");
    }
  });

  $(document).on("click", function (e) {
    if (!$(e.target).closest("#author-search-input, #author-dropdown").length) {
      $authorDropdown.addClass("hidden");
    }
    if (!$(e.target).closest("#genre-search-input, #genre-dropdown").length) {
      $genreDropdown.addClass("hidden");
    }
  });

  $form.on("submit", async function (e) {
    e.preventDefault();

    const title = $titleInput.val().trim();
    const description = $descInput.val().trim();
    const pages = $pagesInput.val();
    const status = $statusSelect.val();

    if (!title) {
      Utils.showToast("Введите название книги", "error");
      return;
    }

    const payload = {};
    if (title !== originalBook.title) payload.title = title;
    if (description !== (originalBook.description || ""))
      payload.description = description || null;
    if (pageCount !== originalBook.page_count) payload.page_count = pages;
    if (status !== originalBook.status) payload.status = status;

    if (Object.keys(payload).length === 0) {
      Utils.showToast("Нет изменений для сохранения", "info");
      return;
    }

    setLoading(true);

    try {
      const updatedBook = await Api.put(`/api/books/${bookId}`, payload);
      originalBook = updatedBook;
      showSuccessModal(updatedBook);
    } catch (error) {
      console.error("Ошибка обновления:", error);

      let errorMsg = "Произошла ошибка при обновлении книги";
      if (error.responseJSON && error.responseJSON.detail) {
        errorMsg = error.responseJSON.detail;
      } else if (error.status === 401) {
        errorMsg = "Вы не авторизованы";
      } else if (error.status === 403) {
        errorMsg = "У вас недостаточно прав";
      } else if (error.status === 404) {
        errorMsg = "Книга не найдена";
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
      $submitText.text("Сохранить изменения");
      $loadingSpinner.addClass("hidden");
    }
  }

  function showSuccessModal(book) {
    $("#success-book-title").text(book.title);
    $("#success-link-btn").attr("href", `/book/${book.id}`);
    $successModal.removeClass("hidden");
  }

  $("#success-close-btn").on("click", function () {
    $successModal.addClass("hidden");
  });

  $successModal.on("click", function (e) {
    if (e.target === this) {
      $successModal.addClass("hidden");
    }
  });

  $("#delete-btn").on("click", function () {
    $("#modal-book-title").text(originalBook.title);
    $deleteModal.removeClass("hidden");
  });

  $("#cancel-delete-btn").on("click", function () {
    $deleteModal.addClass("hidden");
  });

  $deleteModal.on("click", function (e) {
    if (e.target === this) {
      $deleteModal.addClass("hidden");
    }
  });

  $("#confirm-delete-btn").on("click", async function () {
    const $btn = $(this);
    const $spinner = $("#delete-spinner");

    $btn.prop("disabled", true);
    $spinner.removeClass("hidden");

    try {
      await Api.delete(`/api/books/${bookId}`);
      Utils.showToast("Книга успешно удалена", "success");
      setTimeout(() => (window.location.href = "/books"), 1000);
    } catch (error) {
      console.error("Ошибка удаления:", error);

      let errorMsg = "Произошла ошибка при удалении книги";
      if (error.responseJSON && error.responseJSON.detail) {
        errorMsg = error.responseJSON.detail;
      } else if (error.status === 401) {
        errorMsg = "Вы не авторизованы";
      } else if (error.status === 403) {
        errorMsg = "У вас недостаточно прав";
      }

      Utils.showToast(errorMsg, "error");
      $btn.prop("disabled", false);
      $spinner.addClass("hidden");
      $deleteModal.addClass("hidden");
    }
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      if (!$deleteModal.hasClass("hidden")) {
        $deleteModal.addClass("hidden");
      } else if (!$successModal.hasClass("hidden")) {
        $successModal.addClass("hidden");
      }
    }
  });
});
