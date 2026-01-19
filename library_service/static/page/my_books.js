$(document).ready(() => {
  let allLoans = [];
  let booksCache = new Map();

  init();

  function init() {
    const user = window.getUser();
    if (!user) {
      Utils.showToast("Необходима авторизация", "error");
      window.location.href = "/auth";
      return;
    }
    loadLoans();
  }

  async function loadLoans() {
    try {
      const data = await Api.get("/api/loans/?page=1&size=100");
      allLoans = data.loans;

      const bookIds = [...new Set(allLoans.map((loan) => loan.book_id))];
      await loadBooks(bookIds);

      renderLoans();
    } catch (error) {
      console.error("Failed to load loans", error);
      Utils.showToast("Ошибка загрузки выдач", "error");
    }
  }

  async function loadBooks(bookIds) {
    const promises = bookIds.map(async (bookId) => {
      if (!booksCache.has(bookId)) {
        try {
          const book = await Api.get(`/api/books/${bookId}`);
          booksCache.set(bookId, book);
        } catch (error) {
          console.error(`Failed to load book ${bookId}`, error);
        }
      }
    });
    await Promise.all(promises);
  }

  function renderLoans() {
    const reservations = allLoans.filter(
      (loan) => !loan.returned_at && getBookStatus(loan.book_id) === "reserved",
    );
    const activeLoans = allLoans.filter(
      (loan) => !loan.returned_at && getBookStatus(loan.book_id) === "borrowed",
    );
    const returned = allLoans.filter((loan) => loan.returned_at !== null);

    renderReservations(reservations);
    renderActiveLoans(activeLoans);
    renderReturned(returned);
  }

  function getBookStatus(bookId) {
    const book = booksCache.get(bookId);
    return book ? book.status : null;
  }

  function renderReservations(reservations) {
    const $container = $("#reservations-container");
    $("#reservations-count").text(reservations.length);
    $container.empty();

    if (reservations.length === 0) {
      $container.html(
        '<div class="text-center text-gray-500 py-8">Нет активных бронирований</div>',
      );
      return;
    }

    reservations.forEach((loan) => {
      const book = booksCache.get(loan.book_id);
      if (!book) return;

      const borrowedDate = new Date(loan.borrowed_at).toLocaleDateString(
        "ru-RU",
      );
      const dueDate = new Date(loan.due_date).toLocaleDateString("ru-RU");

      const $card = $(`
        <div class="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <a href="/book/${book.id}" class="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                ${Utils.escapeHtml(book.title)}
              </a>
              <p class="text-sm text-gray-600 mt-1">
                Авторы: ${book.authors.map((a) => a.name).join(", ") || "Не указаны"}
              </p>
              <div class="mt-3 space-y-1 text-sm text-gray-600">
                <p><span class="font-medium">Дата бронирования:</span> ${borrowedDate}</p>
                <p><span class="font-medium">Срок возврата:</span> ${dueDate}</p>
              </div>
              <div class="mt-2">
                <span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  Забронирована
                </span>
              </div>
            </div>
            <button
              class="cancel-reservation-btn ml-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              data-loan-id="${loan.id}"
              data-book-id="${book.id}"
            >
              Отменить бронь
            </button>
          </div>
        </div>
      `);

      $card.find(".cancel-reservation-btn").on("click", function () {
        const loanId = $(this).data("loan-id");
        const bookId = $(this).data("book-id");
        cancelReservation(loanId, bookId);
      });

      $container.append($card);
    });
  }

  function renderActiveLoans(activeLoans) {
    const $container = $("#active-loans-container");
    $("#active-loans-count").text(activeLoans.length);
    $container.empty();

    if (activeLoans.length === 0) {
      $container.html(
        '<div class="text-center text-gray-500 py-8">Нет активных выдач</div>',
      );
      return;
    }

    activeLoans.forEach((loan) => {
      const book = booksCache.get(loan.book_id);
      if (!book) return;

      const borrowedDate = new Date(loan.borrowed_at).toLocaleDateString(
        "ru-RU",
      );
      const dueDate = new Date(loan.due_date).toLocaleDateString("ru-RU");
      const isOverdue = new Date(loan.due_date) < new Date();

      const $card = $(`
        <div class="border ${isOverdue ? "border-red-300 bg-red-50" : "border-yellow-200 bg-yellow-50"} rounded-lg p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <a href="/book/${book.id}" class="text-lg font-semibold text-gray-900 hover:text-yellow-600 transition-colors">
                ${Utils.escapeHtml(book.title)}
              </a>
              <p class="text-sm text-gray-600 mt-1">
                Авторы: ${book.authors.map((a) => a.name).join(", ") || "Не указаны"}
              </p>
              <div class="mt-3 space-y-1 text-sm text-gray-600">
                <p><span class="font-medium">Дата выдачи:</span> ${borrowedDate}</p>
                <p><span class="font-medium">Срок возврата:</span> ${dueDate}</p>
              </div>
              <div class="mt-2 flex items-center gap-2">
                <span class="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  Выдана
                </span>
                ${isOverdue ? '<span class="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Просрочена</span>' : ""}
              </div>
            </div>
          </div>
        </div>
      `);

      $container.append($card);
    });
  }

  function renderReturned(returned) {
    const $container = $("#returned-container");
    $("#returned-count").text(returned.length);
    $container.empty();

    if (returned.length === 0) {
      $container.html(
        '<div class="text-center text-gray-500 py-8">Нет возвращенных книг</div>',
      );
      return;
    }

    returned.forEach((loan) => {
      const book = booksCache.get(loan.book_id);
      if (!book) return;

      const borrowedDate = new Date(loan.borrowed_at).toLocaleDateString(
        "ru-RU",
      );
      const returnedDate = new Date(loan.returned_at).toLocaleDateString(
        "ru-RU",
      );
      const dueDate = new Date(loan.due_date).toLocaleDateString("ru-RU");

      const $card = $(`
        <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <a href="/book/${book.id}" class="text-lg font-semibold text-gray-900 hover:text-gray-600 transition-colors">
                ${Utils.escapeHtml(book.title)}
              </a>
              <p class="text-sm text-gray-600 mt-1">
                Авторы: ${book.authors.map((a) => a.name).join(", ") || "Не указаны"}
              </p>
              <div class="mt-3 space-y-1 text-sm text-gray-600">
                <p><span class="font-medium">Дата выдачи:</span> ${borrowedDate}</p>
                <p><span class="font-medium">Срок возврата:</span> ${dueDate}</p>
                <p><span class="font-medium">Дата возврата:</span> ${returnedDate}</p>
              </div>
              <div class="mt-2">
                <span class="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                  Возвращена
                </span>
              </div>
            </div>
          </div>
        </div>
      `);

      $container.append($card);
    });
  }

  async function cancelReservation(loanId, bookId) {
    if (!confirm("Вы уверены, что хотите отменить бронирование?")) {
      return;
    }

    try {
      await Api.delete(`/api/loans/${loanId}`);
      Utils.showToast("Бронирование отменено", "success");

      allLoans = allLoans.filter((loan) => loan.id !== loanId);
      const book = booksCache.get(bookId);
      if (book) {
        book.status = "active";
        booksCache.set(bookId, book);
      }

      renderLoans();
    } catch (error) {
      console.error(error);
      Utils.showToast(error.message || "Ошибка отмены бронирования", "error");
    }
  }
});
