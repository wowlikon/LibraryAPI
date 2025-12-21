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

  const pathParts = window.location.pathname.split("/");
  const bookId = pathParts[pathParts.length - 1];
  let currentBook = null;

  if (!bookId || isNaN(bookId)) {
    Utils.showToast("Некорректный ID книги", "error");
    return;
  }

  Api.get(`/api/books/${bookId}`)
    .then((book) => {
      currentBook = book;
      document.title = `LiB - ${book.title}`;
      renderBook(book);
      if (window.canManage) {
        $("#edit-book-btn")
          .attr("href", `/book/${book.id}/edit`)
          .removeClass("hidden");
      }
    })
    .catch((error) => {
      console.error(error);
      Utils.showToast("Книга не найдена", "error");
      $("#book-loader").html(
        '<p class="text-center text-red-500 w-full p-4">Ошибка загрузки</p>',
      );
    });

  function renderBook(book) {
    $("#book-title").text(book.title);
    $("#book-id").text(`ID: ${book.id}`);
    $("#book-authors-text").text(
      book.authors.map((a) => a.name).join(", ") || "Автор неизвестен",
    );
    $("#book-description").text(book.description || "Описание отсутствует");

    renderStatusWidget(book);

    if (!window.canManage && book.status === "active") {
      renderReserveButton();
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

    if (window.canManage) {
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
                              .map(
                                ([key, conf]) => `
                                <button class="status-option w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ${book.status === key ? "bg-gray-50 font-medium" : "text-gray-700"}"
                                        data-status="${key}">
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full ${conf.bgClass} ${conf.textClass}">
                                        ${conf.icon}
                                    </span>
                                    <span>${conf.label}</span>
                                    ${book.status === key ? '<svg class="ml-auto h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ""}
                                </button>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>
                </div>
            `);

      $container.append($dropdownHTML);

      const $toggleBtn = $("#status-toggle-btn");
      const $menu = $("#status-menu");

      $toggleBtn.on("click", (e) => {
        e.stopPropagation();
        $menu.toggleClass("hidden");
      });

      $(document).on("click", (e) => {
        if (
          !$toggleBtn.is(e.target) &&
          $toggleBtn.has(e.target).length === 0 &&
          !$menu.has(e.target).length
        ) {
          $menu.addClass("hidden");
        }
      });

      $(".status-option").on("click", function () {
        const newStatus = $(this).data("status");
        if (newStatus !== currentBook.status) {
          updateBookStatus(newStatus);
        }
        $menu.addClass("hidden");
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
      Utils.showToast("Функция бронирования в разработке", "info");
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
        title: currentBook.title,
        description: currentBook.description,
        status: newStatus,
      };

      const updatedBook = await Api.put(
        `/api/books/${currentBook.id}`,
        payload,
      );
      currentBook = updatedBook;

      Utils.showToast("Статус успешно изменен", "success");

      renderStatusWidget(updatedBook);
    } catch (error) {
      console.error(error);
      Utils.showToast("Ошибка при смене статуса", "error");
      $toggleBtn
        .prop("disabled", false)
        .removeClass("opacity-75")
        .html(originalContent);
    }
  }
});
