$(document).ready(() => {
  const STATUS_CONFIG = {
    active: {
      label: "Доступна",
      bgClass: "bg-green-100",
      textClass: "text-green-800",
      icon: `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>`,
    },
    borrowed: {
      label: "Выдана",
      bgClass: "bg-yellow-100",
      textClass: "text-yellow-800",
      icon: `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
    },
    reserved: {
      label: "Забронирована",
      bgClass: "bg-blue-100",
      textClass: "text-blue-800",
      icon: `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
        </svg>`,
    },
    restoration: {
      label: "На реставрации",
      bgClass: "bg-orange-100",
      textClass: "text-orange-800",
      icon: `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
        </svg>`,
    },
    written_off: {
      label: "Списана",
      bgClass: "bg-red-100",
      textClass: "text-red-800",
      icon: `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
        </svg>`,
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

  if (!bookId || isNaN(bookId)) {
    Utils.showToast("Некорректный ID книги", "error");
    return;
  }

  Api.get(`/api/books/${bookId}`)
    .then((book) => {
      document.title = `LiB - ${book.title}`;
      renderBook(book);
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

    const statusConfig = getStatusConfig(book.status);
    $("#book-status")
      .html(statusConfig.icon + statusConfig.label)
      .removeClass()
      .addClass(
        `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`,
      );

    if (book.genres && book.genres.length > 0) {
      $("#genres-section").removeClass("hidden");
      const $genres = $("#genres-container");
      book.genres.forEach((g) => {
        $genres.append(`
                    <a href="/books?genre_id=${g.id}" class="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm transition-colors">
                        ${Utils.escapeHtml(g.name)}
                    </a>
                `);
      });
    }

    if (book.authors && book.authors.length > 0) {
      $("#authors-section").removeClass("hidden");
      const $authors = $("#authors-container");
      book.authors.forEach((a) => {
        $authors.append(`
                    <a href="/author/${a.id}" class="flex items-center bg-gray-50 hover:bg-gray-100 rounded-lg p-2 border transition-colors">
                        <div class="w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">
                            ${a.name.charAt(0).toUpperCase()}
                        </div>
                        <span class="text-gray-900 font-medium text-sm">${Utils.escapeHtml(a.name)}</span>
                    </a>
                `);
      });
    }

    $("#book-loader").addClass("hidden");
    $("#book-content").removeClass("hidden");
  }
});
