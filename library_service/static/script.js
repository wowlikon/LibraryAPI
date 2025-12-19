$(document).ready(function () {
  Promise.all([
    fetch("/authors").then((response) => response.json()),
    fetch("/genres").then((response) => response.json()),
  ])
    .then(([authorsData, genresData]) => {
      const $dropdown = $("#author-dropdown");
      authorsData.authors.forEach((author) => {
        const $div = $("<div>", {
          class: "p-2 hover:bg-gray-100 cursor-pointer",
          "data-value": author.name,
          text: author.name,
        });
        $dropdown.append($div);
      });

      const $list = $("#genres-list");
      genresData.genres.forEach((genre) => {
        const $li = $("<li>", { class: "mb-1" });
        $li.html(`
        <label class="custom-checkbox flex items-center">
          <input type="checkbox" />
          <span class="checkmark"></span>
          ${genre.name}
        </label>
      `);
        $list.append($li);
      });

      initializeAuthorDropdown();
    })
    .catch((error) => console.error("Error loading data:", error));

  function initializeAuthorDropdown() {
    const $authorSearchInput = $("#author-search-input");
    const $authorDropdown = $("#author-dropdown");
    const $selectedAuthorsContainer = $("#selected-authors-container");
    const $dropdownItems = $authorDropdown.find("[data-value]");
    let selectedAuthors = new Set();

    const updateDropdownHighlights = () => {
      $dropdownItems.each(function () {
        const value = $(this).data("value");
        $(this).toggleClass("bg-gray-200", selectedAuthors.has(value));
      });
    };

    const renderSelectedAuthors = () => {
      $selectedAuthorsContainer.children().not("#author-search-input").remove();

      selectedAuthors.forEach((author) => {
        const $authorChip = $("<span>", {
          class:
            "flex items-center bg-gray-200 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full",
        });
        $authorChip.html(`
          ${author}
          <button type="button" class="ml-1 inline-flex items-center p-0.5 text-sm text-gray-400 bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900" data-author="${author}">
            <svg class="w-2 h-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Remove author</span>
          </button>
        `);
        $selectedAuthorsContainer.append($authorChip);
      });
      updateDropdownHighlights();
    };

    $authorSearchInput.on("focus", () => {
      $authorDropdown.removeClass("hidden");
    });

    $authorSearchInput.on("input", function () {
      const query = $(this).val().toLowerCase();
      $dropdownItems.each(function () {
        const text = $(this).text().toLowerCase();
        $(this).css("display", text.includes(query) ? "block" : "none");
      });
      $authorDropdown.removeClass("hidden");
    });

    $(document).on("click", function (event) {
      if (
        !$selectedAuthorsContainer.is(event.target) &&
        !$selectedAuthorsContainer.has(event.target).length &&
        !$authorDropdown.is(event.target) &&
        !$authorDropdown.has(event.target).length
      ) {
        $authorDropdown.addClass("hidden");
      }
    });

    $authorDropdown.on("click", "[data-value]", function () {
      const selectedValue = $(this).data("value");
      if (selectedAuthors.has(selectedValue)) {
        selectedAuthors.delete(selectedValue);
      } else {
        selectedAuthors.add(selectedValue);
      }
      $authorSearchInput.val("");
      renderSelectedAuthors();
      $authorSearchInput.focus();
    });

    $selectedAuthorsContainer.on("click", "button", function () {
      const authorToRemove = $(this).data("author");
      selectedAuthors.delete(authorToRemove);
      renderSelectedAuthors();
      $authorSearchInput.focus();
    });

    renderSelectedAuthors();
  }
});
