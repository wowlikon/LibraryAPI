$(document).ready(() => {
  const pathParts = window.location.pathname.split("/");
  const authorId = pathParts[pathParts.length - 1];

  if (!authorId || isNaN(authorId)) {
    Utils.showToast("Некорректный ID автора", "error");
    return;
  }

  Api.get(`/api/authors/${authorId}`)
    .then((author) => {
      document.title = `LiB - ${author.name}`;
      renderAuthor(author);
      renderBooks(author.books);
    })
    .catch((error) => {
      console.error(error);
      Utils.showToast("Автор не найден", "error");
      $("#author-loader").html('<p class="text-red-500">Ошибка загрузки</p>');
    });

  function renderAuthor(author) {
    $("#author-name").text(author.name);
    $("#author-id").text(`ID: ${author.id}`);
    $("#author-avatar").text(author.name.charAt(0).toUpperCase());

    const count = author.books ? author.books.length : 0;
    $("#author-books-count").text(`${count} книг в библиотеке`);

    $("#author-loader").addClass("hidden");
    $("#author-content").removeClass("hidden");
  }

  function renderBooks(books) {
    const $container = $("#books-container");
    const tpl = document.getElementById("book-item-template");

    $container.empty();

    if (!books || books.length === 0) {
      $container.html('<p class="text-gray-500 italic">Книг пока нет</p>');
      return;
    }

    books.forEach((book) => {
      const clone = tpl.content.cloneNode(true);
      const card = clone.querySelector(".book-card");

      card.dataset.id = book.id;
      clone.querySelector(".book-title").textContent = book.title;
      clone.querySelector(".book-desc").textContent =
        book.description || "Описание отсутствует";

      $container.append(clone);
    });
  }

  $("#books-container").on("click", ".book-card", function () {
    window.location.href = `/book/${$(this).data("id")}`;
  });
});
