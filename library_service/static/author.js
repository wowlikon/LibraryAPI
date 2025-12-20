$(document).ready(() => {
    const pathParts = window.location.pathname.split("/");
    const authorId = pathParts[pathParts.length - 1];
  
    if (!authorId || isNaN(authorId)) {
      showErrorState("Некорректный ID автора");
      return;
    }
  
    loadAuthor(authorId);
  
    function loadAuthor(id) {
      showLoadingState();
  
      fetch(`/api/authors/${id}`)
        .then((response) => {
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error("Автор не найден");
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((author) => {
          renderAuthor(author);
          renderBooks(author.books);
          document.title = `LiB - ${author.name}`;
        })
        .catch((error) => {
          console.error("Error loading author:", error);
          showErrorState(error.message);
        });
    }
  
    function renderAuthor(author) {
      const $card = $("#author-card");
      const firstLetter = author.name.charAt(0).toUpperCase();
      const booksCount = author.books ? author.books.length : 0;
      const booksWord = getWordForm(booksCount, ["книга", "книги", "книг"]);
  
      $card.html(`
        <div class="flex items-start">
          <!-- Аватар -->
          <div class="w-24 h-24 bg-gray-500 text-white rounded-full flex items-center justify-center text-4xl font-bold mr-6 flex-shrink-0">
            ${firstLetter}
          </div>
          
          <!-- Информация -->
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <h1 class="text-3xl font-bold text-gray-900">${escapeHtml(author.name)}</h1>
              <span class="text-sm text-gray-500">ID: ${author.id}</span>
            </div>
            
            <div class="flex items-center text-gray-600 mb-4">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              <span>${booksCount} ${booksWord} в библиотеке</span>
            </div>
  
            <!-- Кнопка назад -->
            <a href="/authors" class="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Вернуться к списку авторов
            </a>
          </div>
        </div>
      `);
    }
  
    function renderBooks(books) {
      const $container = $("#books-container");
      $container.empty();
  
      if (!books || books.length === 0) {
        $container.html(`
          <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            <p class="text-gray-500">У этого автора пока нет книг в библиотеке</p>
          </div>
        `);
        return;
      }
  
      const $grid = $('<div class="space-y-4"></div>');
  
      books.forEach((book) => {
        const $bookCard = $(`
          <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer book-card" data-id="${book.id}">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2">
                  ${escapeHtml(book.title)}
                </h3>
                <p class="text-gray-600 text-sm line-clamp-3">
                  ${escapeHtml(book.description || "Описание отсутствует")}
                </p>
              </div>
              <svg class="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        `);
  
        $grid.append($bookCard);
      });
  
      $container.append($grid);
  
      $container.off("click", ".book-card").on("click", ".book-card", function () {
        const bookId = $(this).data("id");
        window.location.href = `/book/${bookId}`;
      });
    }
  
    function showLoadingState() {
      const $authorCard = $("#author-card");
      const $booksContainer = $("#books-container");
  
      $authorCard.html(`
        <div class="flex items-start animate-pulse">
          <div class="w-24 h-24 bg-gray-200 rounded-full mr-6"></div>
          <div class="flex-1">
            <div class="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div class="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div class="h-4 bg-gray-200 rounded w-1/5"></div>
          </div>
        </div>
      `);
  
      $booksContainer.html(`
        <div class="space-y-4">
          ${Array(3)
            .fill()
            .map(
              () => `
            <div class="border border-gray-200 rounded-lg p-4 animate-pulse">
              <div class="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div class="h-4 bg-gray-200 rounded w-full mb-1"></div>
              <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          `
            )
            .join("")}
        </div>
      `);
    }
  
    function showErrorState(message) {
      const $authorCard = $("#author-card");
      const $booksSection = $("#books-section");
  
      $booksSection.hide();
  
      $authorCard.html(`
        <div class="text-center py-8">
          <svg class="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="text-xl font-medium text-gray-900 mb-2">${escapeHtml(message)}</h3>
          <p class="text-gray-500 mb-6">Не удалось загрузить информацию об авторе</p>
          <div class="flex justify-center gap-4">
            <button id="retry-btn" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
              Попробовать снова
            </button>
            <a href="/authors" class="bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
              К списку авторов
            </a>
          </div>
        </div>
      `);
  
      $("#retry-btn").on("click", function () {
        $booksSection.show();
        loadAuthor(authorId);
      });
    }
  
    function getWordForm(number, forms) {
      const cases = [2, 0, 1, 1, 1, 2];
      const index =
        number % 100 > 4 && number % 100 < 20
          ? 2
          : cases[Math.min(number % 10, 5)];
      return forms[index];
    }
  
    function escapeHtml(text) {
      if (!text) return "";
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
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