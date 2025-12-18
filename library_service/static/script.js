// Load authors and genres asynchronously
Promise.all([
  fetch("/authors").then((response) => response.json()),
  fetch("/genres").then((response) => response.json()),
])
  .then(([authorsData, genresData]) => {
    // Populate authors dropdown
    const dropdown = document.getElementById("author-dropdown");
    authorsData.authors.forEach((author) => {
      const div = document.createElement("div");
      div.className = "p-2 hover:bg-gray-100 cursor-pointer";
      div.setAttribute("data-value", author.name);
      div.textContent = author.name;
      dropdown.appendChild(div);
    });

    // Populate genres list
    const list = document.getElementById("genres-list");
    genresData.genres.forEach((genre) => {
      const li = document.createElement("li");
      li.className = "mb-1";
      li.innerHTML = `
        <label class="custom-checkbox flex items-center">
          <input type="checkbox" />
          <span class="checkmark"></span>
          ${genre.name}
        </label>
      `;
      list.appendChild(li);
    });

    initializeAuthorDropdown();
  })
  .catch((error) => console.error("Error loading data:", error));

function initializeAuthorDropdown() {
  const authorSearchInput = document.getElementById("author-search-input");
  const authorDropdown = document.getElementById("author-dropdown");
  const selectedAuthorsContainer = document.getElementById(
    "selected-authors-container",
  );
  const dropdownItems = authorDropdown.querySelectorAll("[data-value]");
  let selectedAuthors = new Set();

  // Function to update highlights in dropdown
  const updateDropdownHighlights = () => {
    dropdownItems.forEach((item) => {
      const value = item.dataset.value;
      if (selectedAuthors.has(value)) {
        item.classList.add("bg-gray-200");
      } else {
        item.classList.remove("bg-gray-200");
      }
    });
  };

  // Function to render selected authors
  const renderSelectedAuthors = () => {
    Array.from(selectedAuthorsContainer.children).forEach((child) => {
      if (child.id !== "author-search-input") {
        child.remove();
      }
    });

    selectedAuthors.forEach((author) => {
      const authorChip = document.createElement("span");
      authorChip.className =
        "flex items-center bg-gray-200 text-gray-800 text-sm font-medium px-2.5 py-0.5 rounded-full";
      authorChip.innerHTML = `
        ${author}
        <button type="button" class="ml-1 inline-flex items-center p-0.5 text-sm text-gray-400 bg-transparent rounded-sm hover:bg-gray-200 hover:text-gray-900" data-author="${author}">
          <svg class="w-2 h-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
          </svg>
          <span class="sr-only">Remove author</span>
        </button>
      `;
      selectedAuthorsContainer.insertBefore(authorChip, authorSearchInput);
    });
    updateDropdownHighlights();
  };

  // Handle input focus to show dropdown
  authorSearchInput.addEventListener("focus", () => {
    authorDropdown.classList.remove("hidden");
  });

  // Handle input for filtering
  authorSearchInput.addEventListener("input", () => {
    const query = authorSearchInput.value.toLowerCase();
    dropdownItems.forEach((item) => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? "block" : "none";
    });
    authorDropdown.classList.remove("hidden");
  });

  // Handle clicks outside to hide dropdown
  document.addEventListener("click", (event) => {
    if (
      !selectedAuthorsContainer.contains(event.target) &&
      !authorDropdown.contains(event.target)
    ) {
      authorDropdown.classList.add("hidden");
    }
  });

  // Handle author selection from dropdown
  authorDropdown.addEventListener("click", (event) => {
    const selectedValue = event.target.dataset.value;
    if (selectedValue) {
      if (selectedAuthors.has(selectedValue)) {
        selectedAuthors.delete(selectedValue);
      } else {
        selectedAuthors.add(selectedValue);
      }
      authorSearchInput.value = "";
      renderSelectedAuthors();
      authorSearchInput.focus();
    }
  });

  // Handle removing selected author chip
  selectedAuthorsContainer.addEventListener("click", (event) => {
    if (event.target.closest("button")) {
      const authorToRemove = event.target.closest("button").dataset.author;
      selectedAuthors.delete(authorToRemove);
      renderSelectedAuthors();
      authorSearchInput.focus();
    }
  });

  // Initial render and highlights (without auto-focus)
  renderSelectedAuthors();
}
