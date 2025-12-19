$(document).ready(function () {
  let selectedAuthors = new Set();
  let selectedGenres = new Set();

  Promise.all([
    fetch("/api/authors").then((response) => response.json()),
    fetch("/api/genres").then((response) => response.json()),
  ])
    .then(([authorsData, genresData]) => {
      const $dropdown = $("#author-dropdown");
      authorsData.authors.forEach((author) => {
        $("<div>")
          .addClass("p-2 hover:bg-gray-100 cursor-pointer author-item")
          .attr("data-value", author.name)
          .text(author.name)
          .appendTo($dropdown);
      });

      const $list = $("#genres-list");
      genresData.genres.forEach((genre) => {
        $("<li>")
          .addClass("mb-1")
          .html(
            `<label class="custom-checkbox flex items-center">
              <input type="checkbox" data-genre="${genre.name}" />
              <span class="checkmark"></span>
              ${genre.name}
            </label>`,
          )
          .appendTo($list);
      });

      initializeAuthorDropdown();
      initializeFilters();
    })
    .catch((error) => console.error("Error loading data:", error));

  function initializeAuthorDropdown() {
    const $input = $("#author-search-input");
    const $dropdown = $("#author-dropdown");
    const $container = $("#selected-authors-container");

    function updateHighlights() {
      $dropdown.find(".author-item").each(function () {
        const value = $(this).attr("data-value");
        const isSelected = selectedAuthors.has(value);
        $(this)
          .toggleClass("bg-gray-300 text-gray-600", isSelected)
          .toggleClass("hover:bg-gray-100", !isSelected);
      });
    }

    function filterDropdown(query) {
      const lowerQuery = query.toLowerCase();
      $dropdown.find(".author-item").each(function () {
        $(this).toggle($(this).text().toLowerCase().includes(lowerQuery));
      });
    }

    function renderChips() {
      $container.find(".author-chip").remove();
      selectedAuthors.forEach((author) => {
        $(`<span class="author-chip flex items-center bg-gray-500 text-white text-sm font-medium px-2.5 py-0.5 rounded-full">
            ${author}
            <button type="button" class="remove-author ml-1.5 inline-flex items-center p-0.5 text-gray-200 hover:text-white hover:bg-gray-600 rounded-full" data-author="${author}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
            </button>
          </span>`).insertBefore($input);
      });
      updateHighlights();
    }

    function toggleAuthor(author) {
      if (selectedAuthors.has(author)) {
        selectedAuthors.delete(author);
      } else {
        selectedAuthors.add(author);
      }
      $input.val("");
      filterDropdown("");
      renderChips();
    }

    $input.on("focus", () => $dropdown.removeClass("hidden"));

    $input.on("input", function () {
      filterDropdown($(this).val().toLowerCase());
      $dropdown.removeClass("hidden");
    });

    $(document).on("click", (e) => {
      if (
        !$(e.target).closest("#selected-authors-container, #author-dropdown")
          .length
      ) {
        $dropdown.addClass("hidden");
      }
    });

    $dropdown.on("click", ".author-item", function (e) {
      e.stopPropagation();
      toggleAuthor($(this).attr("data-value"));
      $input.focus();
    });

    $container.on("click", ".remove-author", function (e) {
      e.stopPropagation();
      selectedAuthors.delete($(this).attr("data-author"));
      renderChips();
      $input.focus();
    });

    $container.on("click", (e) => {
      if (!$(e.target).closest(".author-chip").length) {
        $input.focus();
      }
    });

    window.renderAuthorChips = renderChips;
    window.updateAuthorHighlights = updateHighlights;
  }

  function initializeFilters() {
    const $bookSearch = $("#book-search-input");
    const $applyBtn = $("#apply-filters-btn");
    const $resetBtn = $("#reset-filters-btn");

    $("#genres-list").on("change", "input[type='checkbox']", function () {
      const genre = $(this).attr("data-genre");
      if ($(this).is(":checked")) {
        selectedGenres.add(genre);
      } else {
        selectedGenres.delete(genre);
      }
    });

    $applyBtn.on("click", function () {
      const searchQuery = $bookSearch.val().trim();
      console.log("Применены фильтры:", {
        search: searchQuery,
        authors: Array.from(selectedAuthors),
        genres: Array.from(selectedGenres),
      });
    });

    $resetBtn.on("click", function () {
      $bookSearch.val("");

      selectedAuthors.clear();
      $("#selected-authors-container .author-chip").remove();
      if (window.updateAuthorHighlights) window.updateAuthorHighlights();

      selectedGenres.clear();
      $("#genres-list input[type='checkbox']").prop("checked", false);

      console.log("Фильтры сброшены");
    });

    let searchTimeout;
    $bookSearch.on("input", function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        console.log("Поиск:", $(this).val());
      }, 300);
    });
  }

  const $guestLink = $("#guest-link");
  const $userBtn = $("#user-btn");
  const $userDropdown = $("#user-dropdown");
  const $userArrow = $("#user-arrow");
  const $userAvatar = $("#user-avatar");
  const $dropdownName = $("#dropdown-name");
  const $dropdownUsername = $("#dropdown-username");
  const $dropdownEmail = $("#dropdown-email");
  const $logoutBtn = $("#logout-btn");

  let isDropdownOpen = false;

  function openDropdown() {
    isDropdownOpen = true;
    $userDropdown.removeClass("hidden");
    $userArrow.addClass("rotate-180");
  }

  function closeDropdown() {
    isDropdownOpen = false;
    $userDropdown.addClass("hidden");
    $userArrow.removeClass("rotate-180");
  }

  $userBtn.on("click", function (e) {
    e.stopPropagation();
    isDropdownOpen ? closeDropdown() : openDropdown();
  });

  $(document).on("click", function (e) {
    if (isDropdownOpen && !$(e.target).closest("#user-menu-container").length) {
      closeDropdown();
    }
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && isDropdownOpen) {
      closeDropdown();
    }
  });

  $logoutBtn.on("click", function () {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.reload();
  });

  function showGuest() {
    $guestLink.removeClass("hidden");
    $userBtn.addClass("hidden").removeClass("flex");
    closeDropdown();
  }

  function showUser(user) {
    $guestLink.addClass("hidden");
    $userBtn.removeClass("hidden").addClass("flex");

    const displayName = user.full_name || user.username;
    const firstLetter = displayName.charAt(0).toUpperCase();

    $userAvatar.text(firstLetter);
    $dropdownName.text(displayName);
    $dropdownUsername.text("@" + user.username);
    $dropdownEmail.text(user.email);
  }

  function updateUserAvatar(email) {
    if (!email) return;
    const cleanEmail = email.trim().toLowerCase();
    const emailHash = sha256(cleanEmail);

    const avatarUrl = `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=200`;
    const avatarImg = document.getElementById("user-avatar");
    if (avatarImg) {
      avatarImg.src = avatarUrl;
    }
  }

  const token = localStorage.getItem("access_token");

  if (!token) {
    showGuest();
  } else {
    fetch("/api/auth/me", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((response) => {
        if (response.ok) return response.json();
        throw new Error("Unauthorized");
      })
      .then((user) => {
        showUser(user);
        updateUserAvatar(user.email);

        document.getElementById("user-btn").classList.remove("hidden");
        document.getElementById("guest-link").classList.add("hidden");
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        showGuest();
      });
  }
});
