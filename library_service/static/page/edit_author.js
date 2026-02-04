$(document).ready(() => {
  if (!window.canManage()) return;
  setTimeout(() => window.canManage(), 100);

  const pathParts = window.location.pathname.split("/");
  const authorId = parseInt(pathParts[pathParts.length - 2]);

  if (!authorId || isNaN(authorId)) {
    Utils.showToast("Некорректный ID автора", "error");
    setTimeout(() => (window.location.href = "/authors"), 1500);
    return;
  }

  let originalAuthor = null;
  let authorBooks = [];

  const $form = $("#edit-author-form");
  const $loader = $("#loader");
  const $dangerZone = $("#danger-zone");
  const $nameInput = $("#author-name");
  const $submitBtn = $("#submit-btn");
  const $submitText = $("#submit-text");
  const $loadingSpinner = $("#loading-spinner");
  const $deleteModal = $("#delete-modal");
  const $successModal = $("#success-modal");

  Promise.all([
    Api.get(`/api/authors/${authorId}`),
    Api.get(`/api/authors/${authorId}/books/`),
  ])
    .then(([author, booksData]) => {
      originalAuthor = author;
      authorBooks = booksData.books || booksData || [];

      populateForm(author);
      renderAuthorBooks(authorBooks);

      $loader.addClass("hidden");
      $form.removeClass("hidden");
      $dangerZone.removeClass("hidden");
      $("#cancel-btn").attr("href", `/author/${authorId}`);
    })
    .catch((error) => {
      console.error(error);
      Utils.showToast("Автор не найден", "error");
      setTimeout(() => (window.location.href = "/authors"), 1500);
    });

  function populateForm(author) {
    $nameInput.val(author.name);
    updateCounter();
  }

  function updateCounter() {
    $("#name-counter").text(`${$nameInput.val().length}/255`);
  }

  $nameInput.on("input", updateCounter);

  function renderAuthorBooks(books) {
    const $container = $("#author-books-container");
    $container.empty();

    $("#books-count").text(books.length > 0 ? `(${books.length})` : "");

    if (books.length === 0) {
      $container.html(`
                <div class="text-sm text-gray-500 text-center py-4">
                    <svg class="w-8 h-8 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    У автора пока нет книг
                </div>
            `);
      return;
    }

    books.forEach((book) => {
      $container.append(`
                <a href="/book/${book.id}" class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors group">
                    <div class="flex items-center min-w-0">
                        <div class="w-8 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded flex items-center justify-center flex-shrink-0 mr-3">
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                        </div>
                        <span class="text-sm font-medium text-gray-900 truncate">${Utils.escapeHtml(book.title)}</span>
                    </div>
                    <svg class="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </a>
            `);
    });
  }

  $form.on("submit", async function (e) {
    e.preventDefault();

    const name = $nameInput.val().trim();

    if (!name) {
      Utils.showToast("Введите имя автора", "error");
      return;
    }

    if (name === originalAuthor.name) {
      Utils.showToast("Нет изменений для сохранения", "info");
      return;
    }

    setLoading(true);

    try {
      const updatedAuthor = await Api.put(`/api/authors/${authorId}`, { name });
      originalAuthor = updatedAuthor;
      showSuccessModal(updatedAuthor);
    } catch (error) {
      console.error("Ошибка обновления:", error);

      let errorMsg = "Произошла ошибка при обновлении автора";
      if (error.responseJSON && error.responseJSON.detail) {
        errorMsg = error.responseJSON.detail;
      } else if (error.status === 401) {
        errorMsg = "Вы не авторизованы";
      } else if (error.status === 403) {
        errorMsg = "У вас недостаточно прав";
      } else if (error.status === 404) {
        errorMsg = "Автор не найден";
      } else if (error.status === 409) {
        errorMsg = "Автор с таким именем уже существует";
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

  function showSuccessModal(author) {
    $("#success-author-name").text(author.name);
    $("#success-link-btn").attr("href", `/author/${author.id}`);
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
    $("#modal-author-name").text(originalAuthor.name);

    if (authorBooks.length > 0) {
      $("#modal-books-warning").removeClass("hidden");
    } else {
      $("#modal-books-warning").addClass("hidden");
    }

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
      await Api.delete(`/api/authors/${authorId}`);
      Utils.showToast("Автор успешно удалён", "success");
      setTimeout(() => (window.location.href = "/authors"), 1000);
    } catch (error) {
      console.error("Ошибка удаления:", error);

      let errorMsg = "Произошла ошибка при удалении автора";
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
