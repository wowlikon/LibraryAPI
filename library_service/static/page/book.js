$(document).ready(() => {
  const STATUS_CONFIG = {
    active: {
      label: "Доступна",
      bgClass: "bg-green-100",
      textClass: "text-green-800",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
    },
    borrowed: {
      label: "Выдана",
      bgClass: "bg-yellow-100",
      textClass: "text-yellow-800",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    },
    reserved: {
      label: "Забронирована",
      bgClass: "bg-blue-100",
      textClass: "text-blue-800",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`,
    },
    restoration: {
      label: "На реставрации",
      bgClass: "bg-orange-100",
      textClass: "text-orange-800",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>`,
    },
    written_off: {
      label: "Списана",
      bgClass: "bg-red-100",
      textClass: "text-red-800",
      icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>`,
    },
  };

  const pathParts = window.location.pathname.split("/");
  const bookId = parseInt(pathParts[pathParts.length - 1]);
  let isDraggingOver = false;
  let currentBook = null;
  let cachedUsers = null;
  let selectedLoanUserId = null;
  let activeLoan = null;

  init();

  function init() {
    if (!bookId || isNaN(bookId)) {
      Utils.showToast("Некорректный ID книги", "error");
      return;
    }
    loadBookData();
    setupEventHandlers();
    setupCoverUpload();
  }

  function getPreviewUrl(book) {
    if (!book.preview_urls) {
      return null;
    }

    const priorities = ["webp", "jpeg", "jpg", "png"];

    for (const format of priorities) {
      if (book.preview_urls[format]) {
        return book.preview_urls[format];
      }
    }

    const availableFormats = Object.keys(book.preview_urls);
    if (availableFormats.length > 0) {
      return book.preview_urls[availableFormats[0]];
    }

    return null;
  }

  function setupEventHandlers() {
    $(document).on("click", (e) => {
      const $menu = $("#status-menu");
      const $toggleBtn = $("#status-toggle-btn");
      if (
        $menu.length &&
        !$menu.hasClass("hidden") &&
        !$toggleBtn.is(e.target) &&
        $toggleBtn.has(e.target).length === 0 &&
        !$menu.has(e.target).length
      ) {
        $menu.addClass("hidden");
      }
    });

    $("#cancel-loan-btn").on("click", closeLoanModal);
    $("#user-search-input").on("input", handleUserSearch);
    $("#confirm-loan-btn").on("click", submitLoan);
    $("#refresh-loans-btn").on("click", loadLoans);

    const future = new Date();
    future.setDate(future.getDate() + 14);
    $("#loan-due-date").val(future.toISOString().split("T")[0]);
  }

  function setupCoverUpload() {
    const $container = $("#book-cover-container");
    const $fileInput = $("#cover-file-input");

    $fileInput.on("change", function (e) {
      const file = e.target.files[0];
      if (file) {
        uploadCover(file);
      }
      $(this).val("");
    });

    $container.on("dragenter", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!window.canManage()) return;
      isDraggingOver = true;
      showDropOverlay();
    });

    $container.on("dragover", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!window.canManage()) return;
      isDraggingOver = true;
    });

    $container.on("dragleave", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!window.canManage()) return;

      const rect = this.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        isDraggingOver = false;
        hideDropOverlay();
      }
    });

    $container.on("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!window.canManage()) return;

      isDraggingOver = false;
      hideDropOverlay();

      const files = e.dataTransfer?.files || [];
      if (files.length > 0) {
        const file = files[0];

        if (!file.type.startsWith("image/")) {
          Utils.showToast("Пожалуйста, загрузите изображение", "error");
          return;
        }

        uploadCover(file);
      }
    });
  }

  function showDropOverlay() {
    const $container = $("#book-cover-container");
    $container.find(".drop-overlay").remove();

    const $overlay = $(`
      <div class="drop-overlay absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
        <div class="absolute inset-2 border-2 border-dashed border-gray-600 rounded-lg"></div>
        <svg class="w-10 h-10 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
        </svg>
        <span class="text-gray-700 text-sm font-medium text-center px-4">Отпустите для загрузки</span>
      </div>
    `);

    $container.append($overlay);
  }

  function hideDropOverlay() {
    $("#book-cover-container .drop-overlay").remove();
  }

  async function uploadCover(file) {
    const $container = $("#book-cover-container");

    const maxSize = 32 * 1024 * 1024;
    if (file.size > maxSize) {
      Utils.showToast("Файл слишком большой. Максимум 32 MB", "error");
      return;
    }

    if (!file.type.startsWith("image/")) {
      Utils.showToast("Пожалуйста, загрузите изображение", "error");
      return;
    }

    const $loader = $(`
      <div class="upload-loader absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-20">
        <svg class="animate-spin w-8 h-8 text-white mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-white text-sm">Загрузка...</span>
      </div>
    `);

    $container.find(".upload-loader").remove();
    $container.append($loader);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await Api.uploadFile(
        `/api/books/${bookId}/preview`,
        formData,
      );

      if (!response) {
        return;
      }

      if (response.preview) {
        currentBook.preview_urls = response.preview;
      } else if (response.preview_urls) {
        currentBook.preview_urls = response.preview_urls;
      } else {
        currentBook = response;
      }

      Utils.showToast("Обложка успешно загружена", "success");
      renderBookCover(currentBook);
    } catch (error) {
      console.error("Upload error:", error);
      Utils.showToast(error.message || "Ошибка загрузки обложки", "error");
    } finally {
      $container.find(".upload-loader").remove();
    }
  }

  async function deleteCover() {
    if (!confirm("Удалить обложку книги?")) {
      return;
    }

    const $container = $("#book-cover-container");

    const $loader = $(`
      <div class="upload-loader absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
        <svg class="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    `);

    $container.find(".upload-loader").remove();
    $container.append($loader);

    try {
      await Api.delete(`/api/books/${bookId}/preview`);

      currentBook.preview_urls = null;
      Utils.showToast("Обложка удалена", "success");
      renderBookCover(currentBook);
    } catch (error) {
      console.error("Delete error:", error);
      Utils.showToast(error.message || "Ошибка удаления обложки", "error");
    } finally {
      $container.find(".upload-loader").remove();
    }
  }

  function renderBookCover(book) {
    const $container = $("#book-cover-container");
    const canManage = window.canManage();
    const previewUrl = getPreviewUrl(book);

    if (previewUrl) {
      $container.html(`
        <img
          src="${Utils.escapeHtml(previewUrl)}"
          alt="Обложка книги ${Utils.escapeHtml(book.title)}"
          class="w-full h-full object-cover"
          onerror="this.onerror=null; this.parentElement.querySelector('.cover-fallback').classList.remove('hidden'); this.classList.add('hidden');"
        />
        <div class="cover-fallback hidden w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center absolute inset-0">
          <svg class="w-20 h-20 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
        ${
          canManage
            ? `
          <button
            id="delete-cover-btn"
            class="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Удалить обложку"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex flex-col items-center justify-center cursor-pointer z-0" id="cover-replace-overlay">
            <svg class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
            </svg>
            <span class="text-white text-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium pointer-events-none px-2">
              Заменить
            </span>
          </div>
        `
            : ""
        }
      `);

      if (canManage) {
        $("#delete-cover-btn").on("click", function (e) {
          e.stopPropagation();
          deleteCover();
        });

        $("#cover-replace-overlay").on("click", function () {
          $("#cover-file-input").trigger("click");
        });
      }
    } else {
      if (canManage) {
        $container.html(`
          <div
            id="cover-upload-zone"
            class="w-full h-full bg-gray-100 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-200 transition-all text-center relative"
          >
            <div class="absolute inset-2 border-2 border-dashed border-gray-300 rounded-lg pointer-events-none"></div>
            <svg class="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
            </svg>
            <span class="text-gray-500 text-xs font-medium px-2">
              Добавить обложку
            </span>
            <span class="text-gray-400 text-xs mt-1 px-2">
              или перетащите
            </span>
          </div>
        `);

        $("#cover-upload-zone").on("click", function () {
          $("#cover-file-input").trigger("click");
        });
      } else {
        $container.html(`
          <div class="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
            <svg class="w-20 h-20 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
        `);
      }
    }
  }

  function loadBookData() {
    Api.get(`/api/books/${bookId}`)
      .then((book) => {
        currentBook = book;
        renderBook(book);
        if (window.canManage()) {
          $("#edit-book-btn")
            .attr("href", `/book/${book.id}/edit`)
            .removeClass("hidden");
          $("#loans-section").removeClass("hidden");
          loadLoans();
        }
      })
      .catch((error) => {
        console.error(error);
        Utils.showToast("Книга не найдена", "error");
        $("#book-loader").html(
          '<p class="text-center text-red-500 w-full p-4">Ошибка загрузки</p>',
        );
      });
  }

  async function loadLoans() {
    if (!window.canManage()) return;

    try {
      const data = await Api.get(
        `/api/loans/?book_id=${bookId}&active_only=true&page=1&size=10`,
      );
      activeLoan = data.loans.length > 0 ? data.loans[0] : null;
      renderLoans(data.loans);
    } catch (error) {
      console.error("Failed to load loans", error);
      $("#loans-container").html(
        '<div class="text-center text-red-500 py-4">Ошибка загрузки выдач</div>',
      );
    }
  }

  function renderLoans(loans) {
    const $container = $("#loans-container");
    $container.empty();

    if (!loans || loans.length === 0) {
      $container.html(
        '<div class="text-center text-gray-500 py-8">Нет активных выдач</div>',
      );
      return;
    }

    loans.forEach((loan) => {
      const borrowedDate = new Date(loan.borrowed_at).toLocaleDateString(
        "ru-RU",
      );
      const dueDate = new Date(loan.due_date).toLocaleDateString("ru-RU");
      const isOverdue =
        !loan.returned_at && new Date(loan.due_date) < new Date();

      const $loanCard = $(`
        <div class="border border-gray-200 rounded-lg p-4 ${
          isOverdue ? "bg-red-50 border-red-300" : "bg-gray-50"
        }">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span class="font-medium text-gray-900">ID выдачи: ${loan.id}</span>
                ${
                  isOverdue
                    ? '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Просрочена</span>'
                    : ""
                }
              </div>
              <p class="text-sm text-gray-600 mb-1">
                <span class="font-medium">Дата выдачи:</span> ${borrowedDate}
              </p>
              <p class="text-sm text-gray-600 mb-1">
                <span class="font-medium">Срок возврата:</span> ${dueDate}
              </p>
              <p class="text-sm text-gray-600">
                <span class="font-medium">Пользователь ID:</span> ${loan.user_id}
              </p>
            </div>
            <div class="flex flex-col gap-2">
              ${
                !loan.returned_at && currentBook.status === "reserved"
                  ? `<button class="confirm-loan-btn px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors" data-loan-id="${loan.id}">
                     Подтвердить
                   </button>`
                  : ""
              }
              ${
                !loan.returned_at
                  ? `<button class="return-loan-btn px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors" data-loan-id="${loan.id}">
                     Вернуть
                   </button>`
                  : ""
              }
            </div>
          </div>
        </div>
      `);

      $loanCard.find(".confirm-loan-btn").on("click", function () {
        const loanId = $(this).data("loan-id");
        confirmLoan(loanId);
      });

      $loanCard.find(".return-loan-btn").on("click", function () {
        const loanId = $(this).data("loan-id");
        returnLoan(loanId);
      });

      $container.append($loanCard);
    });
  }

  async function confirmLoan(loanId) {
    try {
      await Api.post(`/api/loans/${loanId}/confirm`);
      Utils.showToast("Бронь подтверждена", "success");
      loadBookData();
      loadLoans();
    } catch (error) {
      console.error(error);
      Utils.showToast(error.message || "Ошибка подтверждения брони", "error");
    }
  }

  async function returnLoan(loanId) {
    if (!confirm("Вы уверены, что хотите вернуть эту книгу?")) {
      return;
    }

    try {
      await Api.post(`/api/loans/${loanId}/return`);
      Utils.showToast("Книга возвращена", "success");
      loadBookData();
      loadLoans();
    } catch (error) {
      console.error(error);
      Utils.showToast(error.message || "Ошибка возврата книги", "error");
    }
  }

  function getStatusConfig(status) {
    return (
      STATUS_CONFIG[status] || {
        label: status || "Неизвестно",
        bgClass: "bg-gray-100",
        textClass: "text-gray-800",
        icon: "",
      }
    );
  }

  function renderBook(book) {
    $("#book-title").text(book.title);
    $("#book-id").text(`ID: ${book.id}`);

    renderBookCover(book);

    if (book.page_count && book.page_count > 0) {
      $("#book-page-count-value").text(book.page_count);
      $("#book-page-count-text").removeClass("hidden");
    } else {
      $("#book-page-count-text").addClass("hidden");
    }

    $("#book-authors-text").text(
      book.authors.map((a) => a.name).join(", ") || "Автор неизвестен",
    );
    $("#book-description").text(book.description || "Описание отсутствует");

    renderStatusWidget(book);

    if (!window.canManage() && book.status === "active") {
      renderReserveButton();
    } else {
      $("#book-actions-container").empty();
    }

    if (book.genres && book.genres.length > 0) {
      $("#genres-section").removeClass("hidden");
      const $genres = $("#genres-container");
      $genres.empty();
      book.genres.forEach((g) => {
        $genres.append(`
          <a href="/books?genre_id=${g.id}" class="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm transition-colors border border-gray-200">
            ${Utils.escapeHtml(g.name)}
          </a>
        `);
      });
    }

    if (book.authors && book.authors.length > 0) {
      $("#authors-section").removeClass("hidden");
      const $authors = $("#authors-container");
      $authors.empty();
      book.authors.forEach((a) => {
        $authors.append(`
          <a href="/author/${a.id}" class="flex items-center bg-white hover:bg-gray-50 rounded-lg p-2 border border-gray-200 shadow-sm transition-colors group">
            <div class="w-8 h-8 bg-gray-200 text-gray-600 group-hover:bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold mr-2 transition-colors">
              ${a.name.charAt(0).toUpperCase()}
            </div>
            <span class="text-gray-800 font-medium text-sm">${Utils.escapeHtml(a.name)}</span>
          </a>
        `);
      });
    }

    $("#book-loader").addClass("hidden");
    $("#book-content").removeClass("hidden");
  }

  function renderStatusWidget(book) {
    const $container = $("#book-status-container");
    $container.empty();
    const config = getStatusConfig(book.status);

    if (window.canManage()) {
      const $dropdownHTML = $(`
        <div class="relative inline-block text-left w-full md:w-auto">
            <button id="status-toggle-btn" type="button" class="w-full justify-center md:w-auto inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${config.bgClass} ${config.textClass} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                ${config.icon}
                <span class="ml-2">${config.label}</span>
                <svg class="ml-2 -mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>

            <div id="status-menu" class="hidden absolute left-0 md:left-1/2 md:-translate-x-1/2 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden z-20">
                <div class="py-1" role="menu">
                    ${Object.entries(STATUS_CONFIG)
                      .map(([key, conf]) => {
                        const isCurrent = book.status === key;
                        return `
                        <button class="status-option w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${isCurrent ? "bg-gray-50 font-medium" : "text-gray-700"}"
                                data-status="${key}">
                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${conf.bgClass} ${conf.textClass}">
                                ${conf.icon}
                            </span>
                            <span>${conf.label}</span>
                            ${isCurrent ? '<svg class="ml-auto h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ""}
                        </button>
                    `;
                      })
                      .join("")}
                </div>
            </div>
        </div>
      `);

      $container.append($dropdownHTML);

      $("#status-toggle-btn").on("click", (e) => {
        e.stopPropagation();
        $("#status-menu").toggleClass("hidden");
      });

      $(".status-option").on("click", function () {
        const newStatus = $(this).data("status");
        $("#status-menu").addClass("hidden");

        if (newStatus === currentBook.status) return;

        if (newStatus === "borrowed") {
          openLoanModal();
        } else {
          updateBookStatus(newStatus);
        }
      });
    } else {
      $container.append(`
        <span class="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium ${config.bgClass} ${config.textClass} shadow-sm">
            ${config.icon}
            ${config.label}
        </span>
      `);
    }
  }

  function renderReserveButton() {
    const $container = $("#book-actions-container");
    $container.html(`
      <button id="reserve-btn" class="w-full flex items-center justify-center px-4 py-2.5 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Зарезервировать
      </button>
    `);

    $("#reserve-btn").on("click", function () {
      const user = window.getUser();
      if (!user) {
        Utils.showToast("Необходима авторизация", "error");
        return;
      }

      Api.post("/api/loans/", {
        book_id: currentBook.id,
        user_id: user.id,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
        .then((loan) => {
          Utils.showToast("Книга забронирована", "success");
          loadBookData();
        })
        .catch((err) => {
          Utils.showToast(err.message || "Ошибка бронирования", "error");
        });
    });
  }

  async function updateBookStatus(newStatus) {
    const $toggleBtn = $("#status-toggle-btn");
    const originalContent = $toggleBtn.html();

    $toggleBtn.prop("disabled", true).addClass("opacity-75").html(`
        <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Обновление...
    `);

    try {
      const payload = {
        status: newStatus,
      };

      const updatedBook = await Api.put(
        `/api/books/${currentBook.id}`,
        payload,
      );
      currentBook = updatedBook;
      Utils.showToast("Статус успешно изменен", "success");
      renderStatusWidget(updatedBook);
      loadLoans();
    } catch (error) {
      console.error(error);
      Utils.showToast(error.message || "Ошибка при смене статуса", "error");
      $toggleBtn
        .prop("disabled", false)
        .removeClass("opacity-75")
        .html(originalContent);
    }
  }

  function openLoanModal() {
    $("#loan-modal").removeClass("hidden");
    $("#user-search-input").val("")[0].focus();
    $("#users-list-container").html(
      '<div class="p-4 text-center text-gray-500 text-sm">Загрузка списка пользователей...</div>',
    );
    $("#confirm-loan-btn").prop("disabled", true);
    selectedLoanUserId = null;

    fetchUsers();
  }

  function closeLoanModal() {
    $("#loan-modal").addClass("hidden");
  }

  async function fetchUsers() {
    if (cachedUsers) {
      renderUsersList(cachedUsers);
      return;
    }

    try {
      const data = await Api.get("/api/users/?skip=0&limit=500");
      cachedUsers = data.users;
      renderUsersList(cachedUsers);
    } catch (error) {
      console.error("Failed to load users", error);
      $("#users-list-container").html(
        '<div class="p-4 text-center text-red-500 text-sm">Ошибка загрузки пользователей</div>',
      );
    }
  }

  function renderUsersList(users) {
    const $container = $("#users-list-container");
    $container.empty();

    if (!users || users.length === 0) {
      $container.html(
        '<div class="p-4 text-center text-gray-500 text-sm">Пользователи не найдены</div>',
      );
      return;
    }

    users.forEach((user) => {
      const roleBadges = user.roles
        .map((r) => {
          const color =
            r === "admin"
              ? "bg-purple-100 text-purple-800"
              : r === "librarian"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800";
          return `<span class="text-xs px-2 py-0.5 rounded-full ${color} mr-1">${r}</span>`;
        })
        .join("");

      const $item = $(`
            <div class="user-item p-3 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between group" data-id="${user.id}">
                <div>
                    <div class="font-medium text-gray-900">${Utils.escapeHtml(user.full_name || user.username)}</div>
                    <div class="text-xs text-gray-500">@${Utils.escapeHtml(user.username)} • ${Utils.escapeHtml(user.email)}</div>
                </div>
                <div>${roleBadges}</div>
            </div>
        `);

      $item.on("click", function () {
        $(".user-item").removeClass("bg-blue-100 border-l-4 border-blue-500");
        $(this).addClass("bg-blue-100 border-l-4 border-blue-500");
        selectedLoanUserId = user.id;
        $("#confirm-loan-btn")
          .prop("disabled", false)
          .text(`Выдать для ${user.username}`);
      });

      $container.append($item);
    });
  }

  function handleUserSearch() {
    const query = $(this).val().toLowerCase();
    if (!cachedUsers) return;

    if (!query) {
      renderUsersList(cachedUsers);
      return;
    }

    const filtered = cachedUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        (u.full_name && u.full_name.toLowerCase().includes(query)) ||
        u.email.toLowerCase().includes(query),
    );
    renderUsersList(filtered);
  }

  async function submitLoan() {
    if (!selectedLoanUserId) return;
    const dueDate = $("#loan-due-date").val();

    if (!dueDate) {
      Utils.showToast("Выберите дату возврата", "error");
      return;
    }

    const $btn = $("#confirm-loan-btn");
    const originalText = $btn.text();
    $btn.prop("disabled", true).text("Обработка...");

    try {
      const payload = {
        book_id: currentBook.id,
        user_id: selectedLoanUserId,
        due_date: new Date(dueDate).toISOString(),
      };

      if (window.isAdmin()) {
        await Api.post("/api/loans/issue", payload);
      } else {
        await Api.post("/api/loans/", payload);
      }

      Utils.showToast("Книга успешно выдана", "success");
      closeLoanModal();
      loadBookData();
      loadLoans();
    } catch (error) {
      console.error(error);
      Utils.showToast(error.message || "Ошибка выдачи", "error");
    } finally {
      $btn.prop("disabled", false).text(originalText);
    }
  }
});
