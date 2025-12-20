$(document).ready(() => {
    const pathParts = window.location.pathname.split("/");
    const bookId = pathParts[pathParts.length - 1];

    if (!bookId || isNaN(bookId)) {
        showErrorState("Некорректный ID книги");
        return;
    }

    loadBook(bookId);

    function loadBook(id) {
        showLoadingState();

        fetch(`/api/books/${id}`)
        .then((response) => {
            if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Книга не найдена");
            }
            throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((book) => {
            renderBook(book);
            renderAuthors(book.authors);
            renderGenres(book.genres);
            document.title = `LiB - ${book.title}`;
        })
        .catch((error) => {
            console.error("Error loading book:", error);
            showErrorState(error.message);
        });
    }

    function renderBook(book) {
        const $card = $("#book-card");
        const authorsText = book.authors.map((a) => a.name).join(", ") || "Автор неизвестен";

        $card.html(`
        <div class="flex flex-col md:flex-row items-start">
            <!-- Иконка книги -->
            <div class="w-32 h-40 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center mb-4 md:mb-0 md:mr-6 flex-shrink-0 shadow-md">
            <svg class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            </div>
            
            <!-- Информация о книге -->
            <div class="flex-1">
            <div class="flex items-start justify-between mb-2">
                <h1 class="text-3xl font-bold text-gray-900">${escapeHtml(book.title)}</h1>
                <span class="text-sm text-gray-500 ml-4">ID: ${book.id}</span>
            </div>
            
            <p class="text-lg text-gray-600 mb-4">
                ${escapeHtml(authorsText)}
            </p>
            
            <div class="prose prose-gray max-w-none mb-6">
                <p class="text-gray-700 leading-relaxed">
                ${escapeHtml(book.description || "Описание отсутствует")}
                </p>
            </div>

            <!-- Кнопка назад -->
            <a href="/books" class="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Вернуться к списку книг
            </a>
            </div>
        </div>
        `);
    }

    function renderAuthors(authors) {
        const $container = $("#authors-container");
        const $section = $("#authors-section");
        $container.empty();

        if (!authors || authors.length === 0) {
            $section.hide();
            return;
        }

        const $grid = $('<div class="flex flex-wrap gap-3"></div>');

        authors.forEach((author) => {
        const firstLetter = author.name.charAt(0).toUpperCase();

        const $authorCard = $(`
            <a href="/author/${author.id}" class="flex items-center bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors duration-200 border border-gray-200">
            <div class="w-10 h-10 bg-gray-500 text-white rounded-full flex items-center justify-center text-lg font-bold mr-3">
                ${firstLetter}
            </div>
            <span class="text-gray-900 font-medium">${escapeHtml(author.name)}</span>
            <svg class="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            </a>
        `);

        $grid.append($authorCard);
        });

        $container.append($grid);
    }

    function renderGenres(genres) {
        const $container = $("#genres-container");
        const $section = $("#genres-section");
        $container.empty();

        if (!genres || genres.length === 0) {
        $section.hide();
        return;
        }

        const $grid = $('<div class="flex flex-wrap gap-2"></div>');

        genres.forEach((genre) => {
        const $genreTag = $(`
            <a href="/books?genre_id=${genre.id}" class="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full transition-colors duration-200">
            <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
            </svg>
            ${escapeHtml(genre.name)}
            </a>
        `);

        $grid.append($genreTag);
        });

        $container.append($grid);
    }

    function showLoadingState() {
        const $bookCard = $("#book-card");
        const $authorsContainer = $("#authors-container");
        const $genresContainer = $("#genres-container");

        $bookCard.html(`
        <div class="flex flex-col md:flex-row items-start animate-pulse">
            <div class="w-32 h-40 bg-gray-200 rounded-lg mb-4 md:mb-0 md:mr-6"></div>
            <div class="flex-1">
            <div class="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div class="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div class="space-y-2 mb-6">
                <div class="h-4 bg-gray-200 rounded w-full"></div>
                <div class="h-4 bg-gray-200 rounded w-full"></div>
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
        </div>
        `);

        $authorsContainer.html(`
        <div class="flex gap-3 animate-pulse">
            <div class="flex items-center bg-gray-100 rounded-lg p-3">
            <div class="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
            <div class="h-5 bg-gray-200 rounded w-24"></div>
            </div>
        </div>
        `);

        $genresContainer.html(`
        <div class="flex gap-2 animate-pulse">
            <div class="h-10 bg-gray-200 rounded-full w-24"></div>
            <div class="h-10 bg-gray-200 rounded-full w-32"></div>
        </div>
        `);
    }

    function showErrorState(message) {
        const $bookCard = $("#book-card");
        const $authorsSection = $("#authors-section");
        const $genresSection = $("#genres-section");

        $authorsSection.hide();
        $genresSection.hide();

        $bookCard.html(`
        <div class="text-center py-8">
            <svg class="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <h3 class="text-xl font-medium text-gray-900 mb-2">${escapeHtml(message)}</h3>
            <p class="text-gray-500 mb-6">Не удалось загрузить информацию о книге</p>
            <div class="flex justify-center gap-4">
            <button id="retry-btn" class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                Попробовать снова
            </button>
            <a href="/books" class="bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                К списку книг
            </a>
            </div>
        </div>
        `);

        $("#retry-btn").on("click", function () {
        $authorsSection.show();
        $genresSection.show();
        loadBook(bookId);
        });
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