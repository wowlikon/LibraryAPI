$(document).ready(() => {
  let allAuthors = [];
  let filteredAuthors = [];
  let currentPage = 1;
  let pageSize = 24;
  let currentSort = "name_asc";

  loadAuthors();
  const USER_CAN_MANAGE =
    typeof window.canManage === "function" && window.canManage();
  if (USER_CAN_MANAGE) {
    $("#add-author-btn").removeClass("hidden");
  }

  function loadAuthors() {
    showLoadingState();

    Api.get("/api/authors")
      .then((data) => {
        allAuthors = data.authors;
        applyFiltersAndSort();
      })
      .catch((error) => {
        console.error(error);
        Utils.showToast("Не удалось загрузить авторов", "error");
        $("#authors-container").empty();
      });
  }

  function applyFiltersAndSort() {
    const searchQuery = $("#author-search-input").val().trim().toLowerCase();

    filteredAuthors = allAuthors.filter((author) =>
      author.name.toLowerCase().includes(searchQuery),
    );

    filteredAuthors.sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return currentSort === "name_asc"
        ? nameA.localeCompare(nameB, "ru")
        : nameB.localeCompare(nameA, "ru");
    });

    const total = filteredAuthors.length;
    $("#results-counter").text(
      total === 0 ? "Авторы не найдены" : `Найдено: ${total}`,
    );

    renderAuthors();
    renderPagination();
  }

  function renderAuthors() {
    const $container = $("#authors-container");
    const tpl = document.getElementById("author-card-template");
    const emptyTpl = document.getElementById("empty-state-template");

    $container.empty();

    if (filteredAuthors.length === 0) {
      $container.append(emptyTpl.content.cloneNode(true));
      return;
    }

    const startIndex = (currentPage - 1) * pageSize;
    const pageAuthors = filteredAuthors.slice(
      startIndex,
      startIndex + pageSize,
    );

    pageAuthors.forEach((author) => {
      const clone = tpl.content.cloneNode(true);
      const card = clone.querySelector(".author-card");

      card.dataset.id = author.id;
      clone.querySelector(".author-name").textContent = author.name;
      clone.querySelector(".author-id").textContent = `ID: ${author.id}`;
      clone.querySelector(".author-avatar").textContent = author.name
        .charAt(0)
        .toUpperCase();

      $container.append(clone);
    });
  }

  function renderPagination() {
    $("#pagination-container").empty();
    const totalPages = Math.ceil(filteredAuthors.length / pageSize);
    if (totalPages <= 1) return;

    const $pagination = $(`
            <div class="flex justify-center items-center gap-2 mt-6 mb-4">
                <button id="prev-page" class="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50" ${currentPage === 1 ? "disabled" : ""}>&larr;</button>
                <div id="page-numbers" class="flex gap-1"></div>
                <button id="next-page" class="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50" ${currentPage === totalPages ? "disabled" : ""}>&rarr;</button>
            </div>
        `);

    const $pageNumbers = $pagination.find("#page-numbers");
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 2 && i <= currentPage + 2)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }

    pages.forEach((page) => {
      if (page === "...") {
        $pageNumbers.append(`<span class="px-3 py-2">...</span>`);
      } else {
        const isActive = page === currentPage;
        $pageNumbers.append(`
                    <button class="page-btn px-3 py-2 rounded-lg ${isActive ? "bg-gray-500 text-white" : "bg-white border hover:bg-gray-50"}" data-page="${page}">${page}</button>
                `);
      }
    });

    $("#pagination-container").append($pagination);

    $("#prev-page").on("click", function () {
      if (currentPage > 1) {
        currentPage--;
        renderAuthors();
        renderPagination();
        scrollToTop();
      }
    });
    $("#next-page").on("click", function () {
      if (currentPage < totalPages) {
        currentPage++;
        renderAuthors();
        renderPagination();
        scrollToTop();
      }
    });
    $(".page-btn").on("click", function () {
      currentPage = parseInt($(this).data("page"));
      renderAuthors();
      renderPagination();
      scrollToTop();
    });
  }

  function showLoadingState() {
    $("#authors-container").html(`
            ${Array(6)
              .fill()
              .map(
                () => `
                <div class="bg-white p-4 rounded-lg shadow-md animate-pulse flex items-center">
                    <div class="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                    <div class="flex-1">
                        <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                </div>
            `,
              )
              .join("")}
        `);
  }

  function scrollToTop() {
    $("html, body").animate({ scrollTop: 0 }, 300);
  }

  $("#author-search-input").on("input", function () {
    currentPage = 1;
    applyFiltersAndSort();
  });

  $('input[name="sort"]').on("change", function () {
    currentSort = $(this).val();
    currentPage = 1;
    applyFiltersAndSort();
  });

  $("#authors-container").on("click", ".author-card", function () {
    window.location.href = `/author/${$(this).data("id")}`;
  });
});
