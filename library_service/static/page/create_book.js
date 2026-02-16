$(document).ready(() => {
  if (!window.canManage()) return;
  setTimeout(() => window.canManage, 100);

  let allAuthors = [];
  let allGenres = [];
  const selectedAuthors = new Map();
  const selectedGenres = new Map();

  const $form = $("#create-book-form");
  const $submitBtn = $("#submit-btn");
  const $submitText = $("#submit-text");
  const $titleInput = $("#book-title");
  const $descInput = $("#book-description");
  const $pagesInput = $("#book-page-count");
  const $loadingSpinner = $("#loading-spinner");
  const $successModal = $("#success-modal");

  Promise.all([Api.get("/api/authors"), Api.get("/api/genres")])
    .then(([authorsData, genresData]) => {
      allAuthors = authorsData.authors || [];
      allGenres = genresData.genres || [];
      initAuthors(allAuthors);
      initGenres(allGenres);
      initializeDropdownListeners();
      initAiAssistant();
    })
    .catch((err) => {
      console.error("Ошибка загрузки данных:", err);
      Utils.showToast(
        "Не удалось загрузить списки авторов или жанров",
        "error",
      );
    });

  $("#book-title").on("input", function () {
    $("#title-counter").text(`${this.value.length}/255`);
  });

  $("#book-description").on("input", function () {
    $("#desc-counter").text(`${this.value.length}/2000`);
  });

  function initAuthors(authors) {
    const $dropdown = $("#author-dropdown");
    $dropdown.empty();
    authors.forEach((author) => {
      $("<div>")
        .addClass(
          "p-2 hover:bg-gray-100 cursor-pointer author-item transition-colors text-sm",
        )
        .attr("data-id", author.id)
        .attr("data-name", author.name)
        .text(author.name)
        .appendTo($dropdown);
    });
  }

  function initGenres(genres) {
    const $dropdown = $("#genre-dropdown");
    $dropdown.empty();
    genres.forEach((genre) => {
      $("<div>")
        .addClass(
          "p-2 hover:bg-gray-100 cursor-pointer genre-item transition-colors text-sm",
        )
        .attr("data-id", genre.id)
        .attr("data-name", genre.name)
        .text(genre.name)
        .appendTo($dropdown);
    });
  }

  function renderAuthorChips() {
    const $container = $("#selected-authors-container");
    const $dropdown = $("#author-dropdown");

    $container.empty();

    selectedAuthors.forEach((name, id) => {
      $(`<span class="inline-flex items-center bg-gray-600 text-white text-sm font-medium px-2.5 pt-0.5 pb-1 rounded-full">
                ${Utils.escapeHtml(name)}
                <button type="button" class="remove-author mt-0.5 ml-2 inline-flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500 rounded-full w-4 h-4 transition-colors" data-id="${id}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </span>`).appendTo($container);
    });

    $dropdown.find(".author-item").each(function () {
      const id = parseInt($(this).data("id"));
      if (selectedAuthors.has(id)) {
        $(this)
          .addClass("bg-gray-200 text-gray-900 font-semibold")
          .removeClass("hover:bg-gray-100");
      } else {
        $(this)
          .removeClass("bg-gray-200 text-gray-900 font-semibold")
          .addClass("hover:bg-gray-100");
      }
    });
  }

  function renderGenreChips() {
    const $container = $("#selected-genres-container");
    const $dropdown = $("#genre-dropdown");

    $container.empty();

    selectedGenres.forEach((name, id) => {
      $(`<span class="inline-flex items-center bg-gray-600 text-white text-sm font-medium px-2.5 pt-0.5 pb-1 rounded-full">
                ${Utils.escapeHtml(name)}
                <button type="button" class="remove-genre mt-0.5 ml-2 inline-flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-500 rounded-full w-4 h-4 transition-colors" data-id="${id}">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </span>`).appendTo($container);
    });

    $dropdown.find(".genre-item").each(function () {
      const id = parseInt($(this).data("id"));
      if (selectedGenres.has(id)) {
        $(this)
          .addClass("bg-gray-200 text-gray-900 font-semibold")
          .removeClass("hover:bg-gray-100");
      } else {
        $(this)
          .removeClass("bg-gray-200 text-gray-900 font-semibold")
          .addClass("hover:bg-gray-100");
      }
    });
  }

  function initializeDropdownListeners() {
    const $authorInput = $("#author-search-input");
    const $authorDropdown = $("#author-dropdown");
    const $authorContainer = $("#selected-authors-container");

    $authorInput.on("focus", function () {
      $authorDropdown.removeClass("hidden");
    });

    $authorInput.on("input", function () {
      const val = $(this).val().toLowerCase();
      $authorDropdown.removeClass("hidden");
      $authorDropdown.find(".author-item").each(function () {
        const text = $(this).text().toLowerCase();
        $(this).toggle(text.includes(val));
      });
    });

    $authorDropdown.on("click", ".author-item", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      const name = $(this).data("name");

      if (selectedAuthors.has(id)) {
        selectedAuthors.delete(id);
      } else {
        selectedAuthors.set(id, name);
      }

      $authorInput.val("");
      $authorDropdown.find(".author-item").show();
      renderAuthorChips();
      $authorInput[0].focus();
    });

    $authorContainer.on("click", ".remove-author", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      selectedAuthors.delete(id);
      renderAuthorChips();
    });

    const $genreInput = $("#genre-search-input");
    const $genreDropdown = $("#genre-dropdown");
    const $genreContainer = $("#selected-genres-container");

    $genreInput.on("focus", function () {
      $genreDropdown.removeClass("hidden");
    });

    $genreInput.on("input", function () {
      const val = $(this).val().toLowerCase();
      $genreDropdown.removeClass("hidden");
      $genreDropdown.find(".genre-item").each(function () {
        const text = $(this).text().toLowerCase();
        $(this).toggle(text.includes(val));
      });
    });

    $genreDropdown.on("click", ".genre-item", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      const name = $(this).data("name");

      if (selectedGenres.has(id)) {
        selectedGenres.delete(id);
      } else {
        selectedGenres.set(id, name);
      }

      $genreInput.val("");
      $genreDropdown.find(".genre-item").show();
      renderGenreChips();
      $genreInput[0].focus();
    });

    $genreContainer.on("click", ".remove-genre", function (e) {
      e.stopPropagation();
      const id = parseInt($(this).data("id"));
      selectedGenres.delete(id);
      renderGenreChips();
    });

    $(document).on("click", function (e) {
      if (
        !$(e.target).closest(
          "#author-search-input, #author-dropdown, #selected-authors-container",
        ).length
      ) {
        $authorDropdown.addClass("hidden");
      }
      if (
        !$(e.target).closest(
          "#genre-search-input, #genre-dropdown, #selected-genres-container",
        ).length
      ) {
        $genreDropdown.addClass("hidden");
      }
    });
  }

  $form.on("submit", async function (e) {
    e.preventDefault();

    const title = $("#book-title").val().trim();
    const description = $("#book-description").val().trim();
    const pageCount = parseInt($("#book-page-count").val()) || null;

    if (!title) {
      Utils.showToast("Введите название книги", "error");
      return;
    }

    if (!pageCount) {
      Utils.showToast("Введите количество страниц", "error");
      return;
    }

    setLoading(true);

    try {
      const bookPayload = {
        title: title,
        description: description || null,
        page_count: pageCount,
      };

      const createdBook = await Api.post("/api/books/", bookPayload);

      const linkPromises = [];

      selectedAuthors.forEach((_, authorId) => {
        linkPromises.push(
          Api.post(
            `/api/relationships/author-book?author_id=${authorId}&book_id=${createdBook.id}`,
          ),
        );
      });

      selectedGenres.forEach((_, genreId) => {
        linkPromises.push(
          Api.post(
            `/api/relationships/genre-book?genre_id=${genreId}&book_id=${createdBook.id}`,
          ),
        );
      });

      if (linkPromises.length > 0) {
        await Promise.allSettled(linkPromises);
      }

      showSuccess(createdBook);
    } catch (error) {
      console.error("Ошибка создания:", error);

      let errorMsg = "Произошла ошибка при создании книги";
      if (error.responseJSON && error.responseJSON.detail) {
        errorMsg = error.responseJSON.detail;
      } else if (error.status === 401) {
        errorMsg = "Вы не авторизованы";
      } else if (error.status === 403) {
        errorMsg = "У вас недостаточно прав";
      }

      Utils.showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    $submitBtn.prop("disabled", isLoading);
    if (isLoading) {
      $submitText.text("Сохранение...");
      $loadingSpinner.removeClass("hidden");
    } else {
      $submitText.text("Создать книгу");
      $loadingSpinner.addClass("hidden");
    }
  }

  function showSuccess(book) {
    $("#modal-book-title").text(book.title);
    $("#modal-link-btn").attr("href", `/book/${book.id}`);
    $successModal.removeClass("hidden");
  }

  function resetForm() {
    $form[0].reset();
    selectedAuthors.clear();
    selectedGenres.clear();
    $("#selected-authors-container").empty();
    $("#selected-genres-container").empty();
    $("#title-counter").text("0/255");
    $("#desc-counter").text("0/2000");

    $("#author-dropdown .author-item")
      .removeClass("bg-gray-200 text-gray-900 font-semibold")
      .addClass("hover:bg-gray-100");
    $("#genre-dropdown .genre-item")
      .removeClass("bg-gray-200 text-gray-900 font-semibold")
      .addClass("hover:bg-gray-100");
  }

  $("#modal-close-btn").on("click", function () {
    $successModal.addClass("hidden");
    resetForm();
    window.scrollTo(0, 0);
  });

  $successModal.on("click", function (e) {
    if (e.target === this) {
      window.location.href = "/books";
    }
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && !$successModal.hasClass("hidden")) {
      window.location.href = "/books";
    }
  });

  function initAiAssistant() {
    const $aiLogo = $("#ai-logo");
    const $aiWidget = $("#ai-widget");
    const $aiInput = $("#ai-input");
    const $btnRun = $("#ai-btn-run");
    const $btnStop = $("#ai-btn-stop");
    const $logWrap = $("#ai-log-container");
    const $logEntries = $("#ai-log-entries");
    const $dot = $("#ai-status-dot");
    const $ping = $("#ai-status-ping");
    const $statusTxt = $("#ai-status-text");

    const AI_FIELD_TYPES = ["title", "description", "page_count"];
    const AI_FIELD_LABELS = {
      title: "Название",
      description: "Описание",
      page_count: "Кол-во страниц",
    };

    if ($aiLogo) {
      $aiLogo.on("click", () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }

        hideWidget();
        aiRunning = false;
        curThinkEl = null;
        curInfoEl = null;
        lastType = null;
        twQueues.clear();

        aiStatus("ready");
        connectWs();
      });
    }

    let ws = null;
    let aiRunning = false;
    let curThinkEl = null;
    let curInfoEl = null;
    let lastType = null;
    let idleTimer = null;

    const twQueues = new Map();

    function twEnqueue(el, text, scrollCb) {
      const raw = el instanceof $ ? el[0] : el;
      if (!raw) return;
      if (!twQueues.has(raw)) {
        twQueues.set(raw, { buffer: "", raf: null, scrollCb: null });
      }
      const q = twQueues.get(raw);
      q.buffer += text;
      if (scrollCb) q.scrollCb = scrollCb;
      if (!q.raf) twTick(raw);
    }

    function twFlush(el) {
      const raw = el instanceof $ ? el[0] : el;
      if (!raw) return;
      const q = twQueues.get(raw);
      if (!q) return;
      if (q.raf) cancelAnimationFrame(q.raf);
      raw.textContent += q.buffer;
      q.buffer = "";
      q.raf = null;
      twQueues.delete(raw);
    }

    function twTick(raw) {
      const q = twQueues.get(raw);
      if (!q || !q.buffer.length) {
        if (q) q.raf = null;
        return;
      }
      const n = Math.max(1, Math.ceil(q.buffer.length * 0.1));
      raw.textContent += q.buffer.substring(0, n);
      q.buffer = q.buffer.substring(n);
      if (q.scrollCb) q.scrollCb();
      scrollLog();
      if (q.buffer.length) {
        q.raf = requestAnimationFrame(() => twTick(raw));
      } else {
        q.raf = null;
      }
    }

    let twRafId = null;

    function startTwTick() {
      if (twRafId === null) {
        const tick = () => {
          twQueues.forEach((_, el) => twTick(el));
          twRafId = requestAnimationFrame(tick);
        };
        twRafId = requestAnimationFrame(tick);
      }
    }

    function stopTwTick() {
      if (twRafId !== null) {
        cancelAnimationFrame(twRafId);
        twRafId = null;
      }
    }

    function aiStatus(s) {
      if (s === "streaming") {
        $dot.removeClass("bg-gray-300 hidden").addClass("bg-green-500");
        $ping.removeClass("hidden");
        $statusTxt.text("Пишет…");
      } else if (s === "connected") {
        $dot.removeClass("bg-gray-300 hidden").addClass("bg-green-500");
        $ping.addClass("hidden");
        $statusTxt.text("Подключено");
      } else {
        $dot.removeClass("bg-green-500").addClass("bg-gray-300 hidden");
        $ping.addClass("hidden");
        $statusTxt.text("Готов");
      }
    }

    function setAiRunning(isRunning) {
      aiRunning = isRunning;

      $btnRun[0].classList.toggle("hidden", isRunning);
      $btnStop[0].classList.toggle("hidden", !isRunning);

      $aiInput.prop("disabled", isRunning);

      aiStatus(isRunning ? "streaming" : "ready");
    }

    function scrollLog() {
      const el = $logWrap[0];
      if (el) el.scrollTop = el.scrollHeight;
    }

    function resetIdle() {
      clearTimeout(idleTimer);
      if (aiRunning) {
        idleTimer = setTimeout(() => finishResponse(), 1500);
      }
    }

    function getFields() {
      return {
        title: $titleInput.val() || null,
        description: $descInput.val() || null,
        page_count: $pagesInput.val() ? parseInt($pagesInput.val(), 10) : null,
      };
    }

    function aiApplyField(type, value) {
      if (type === "title") {
        $titleInput.val(value === null ? "" : value).trigger("input");
      } else if (type === "description") {
        $descInput.val(value === null ? "" : value).trigger("input");
      } else if (type === "page_count") {
        $pagesInput.val(value === null ? "" : value).trigger("input");
      }
    }

    function addThinkBlock() {
      const id = "ai-t-" + Date.now();
      $logEntries.append(`
          <div class="border-b border-gray-100 bg-gray-50/50 fade-in" id="${id}">
            <div class="px-4 py-2 border-b border-gray-100/50 flex items-center gap-2 cursor-pointer select-none" data-toggle="${id}-b">
              <svg class="ai-t-spin animate-spin w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Думает</span>
              <svg class="w-3 h-3 text-gray-400 ml-auto transition-transform ai-t-chev" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </div>
            <div id="${id}-b" class="px-4 py-3 max-h-40 overflow-y-auto">
              <p class="ai-t-txt text-xs font-mono text-gray-500 leading-relaxed whitespace-pre-wrap typing-cursor"></p>
            </div>
          </div>
        `);
      $(`[data-toggle="${id}-b"]`).on("click", function () {
        $(`#${id}-b`).toggleClass("hidden");
        $(this).find(".ai-t-chev").toggleClass("rotate-180");
      });
      curThinkEl = $(`#${id}`);
      scrollLog();
    }

    function appendThink(text) {
      if (!curThinkEl) addThinkBlock();
      const p = curThinkEl.find(".ai-t-txt")[0];
      const sp = p ? p.parentElement : null;
      twEnqueue(p, text, () => {
        if (sp) sp.scrollTop = sp.scrollHeight;
      });
    }

    function endThink() {
      if (!curThinkEl) return;
      const p = curThinkEl.find(".ai-t-txt")[0];
      twFlush(p);
      curThinkEl.find(".ai-t-txt").removeClass("typing-cursor");
      curThinkEl.find(".ai-t-spin").removeClass("animate-spin").html(`
          <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        `);

      const id = curThinkEl.attr("id");
      if (id) {
        $(`#${id}-b`).addClass("hidden");
        curThinkEl.find(".ai-t-chev").addClass("rotate-180");
      }

      curThinkEl = null;
    }

    function addToolEntry(field, value) {
      const label = AI_FIELD_LABELS[field] || field;
      const disp =
        value === null
          ? '<span class="text-gray-400 italic">очищено</span>'
          : Utils.escapeHtml(String(value));
      $logEntries.append(`
          <div class="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3 fade-in bg-amber-50/50">
            <svg class="w-3.5 h-3.5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            <div class="text-xs text-gray-700">
              <span class="font-semibold text-amber-700">${label}</span>
              <span class="text-gray-400 mx-1">→</span>
              <span class="font-mono">${disp}</span>
            </div>
          </div>
        `);
      scrollLog();
    }

    function addInfoBlock() {
      const id = "ai-i-" + Date.now();
      $logEntries.append(`
          <div class="px-4 py-4 bg-white fade-in" id="${id}">
            <div class="flex gap-3">
              <div class="mt-0.5 flex-shrink-0">
                <svg class="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
              </div>
              <div class="ai-i-txt text-sm text-gray-800 leading-6 font-medium typing-cursor"></div>
            </div>
          </div>
        `);
      curInfoEl = $(`#${id}`);
      scrollLog();
    }

    function appendInfo(text) {
      if (!curInfoEl) addInfoBlock();
      const el = curInfoEl.find(".ai-i-txt")[0];
      twEnqueue(el, text);
    }

    function endInfo() {
      if (!curInfoEl) return;
      const el = curInfoEl.find(".ai-i-txt")[0];
      twFlush(el);
      curInfoEl.find(".ai-i-txt").removeClass("typing-cursor");
      curInfoEl = null;
    }

    function addPromptSep(text) {
      $logEntries.append(`
          <div class="px-4 py-3 bg-gray-50 border-b border-t border-gray-100 fade-in">
            <div class="flex items-center gap-3">
              <div class="mt-0.5 flex-shrink-0">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <span class="text-sm text-gray-800 leading-6 font-medium truncate">${Utils.escapeHtml(text)}</span>
            </div>
          </div>
        `);
      scrollLog();
    }

    function hideWidget() {
      $aiWidget.addClass("hidden");
      $logWrap.addClass("hidden");
      $logEntries.empty();
      curThinkEl = null;
      curInfoEl = null;
      lastType = null;
      twQueues.forEach((q) => {
        if (q.raf) cancelAnimationFrame(q.raf);
      });
      twQueues.clear();
    }

    function finishResponse() {
      endThink();
      endInfo();
      setAiRunning(false);
    }

    function handleMsg(raw) {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch (e) {
        return;
      }

      const { type, value } = msg;

      if (type === "end") {
        finishResponse();
        return;
      }

      if (type === "thinking") {
        if (lastType !== "thinking") {
          endThink();
          endInfo();
          curThinkEl = null;
        }
        appendThink(value);
        lastType = "thinking";
        return;
      }

      if (AI_FIELD_TYPES.includes(type)) {
        endThink();
        aiApplyField(type, value);
        addToolEntry(type, value);
        lastType = "tool";
        return;
      }

      if (type === "info") {
        if (lastType !== "info") {
          endThink();
          endInfo();
          curInfoEl = null;
        }
        appendInfo(value);
        lastType = "info";
        return;
      }
    }

    function connectWs() {
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      )
        return;

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";

      const token = StorageHelper.get("access_token");
      if (!token) {
        Utils.showToast("Вы не авторизованы", "error");
        return;
      }

      ws = new WebSocket(
        `${proto}//${window.location.host}/api/llm/book?token=${token}`,
      );

      ws.onopen = () => {
        aiStatus("connected");
        $aiWidget.removeClass("hidden");
      };

      ws.onclose = (e) => {
        const wasRunning = aiRunning;
        ws = null;

        if (wasRunning) {
          finishResponse();
        }

        if (e.code === 1011 || e.code === 1006) {
          hideWidget();
        } else if (e.code !== 1000 && e.reason) {
          Utils.showToast(e.reason, "error");
        }

        aiStatus("ready");
      };

      ws.onerror = () => {
        Utils.showToast("Ошибка WebSocket соединения", "error");
      };

      ws.onmessage = (e) => handleMsg(e.data);
    }

    function doSend(prompt) {
      setAiRunning(true);
      lastType = null;
      curThinkEl = null;
      curInfoEl = null;
      $logWrap.removeClass("hidden");
      addPromptSep(prompt);
      try {
        ws.send(JSON.stringify({ prompt, fields: getFields() }));
      } catch (e) {
        console.error("Failed to send AI prompt", e);
        finishResponse();
      }
      $aiInput.val("");
    }

    function sendPrompt(prompt) {
      if (!prompt) {
        $aiInput[0].focus();
        return;
      }

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWs();
        let waited = 0;
        const iv = setInterval(() => {
          waited += 50;
          if (ws && ws.readyState === WebSocket.OPEN) {
            clearInterval(iv);
            doSend(prompt);
          } else if (waited >= 5000) {
            clearInterval(iv);
            Utils.showToast("Не удалось подключиться", "error");
            setAiRunning(false);
          }
        }, 50);
        return;
      }

      doSend(prompt);
    }

    $btnRun.on("click", () => {
      const p = $aiInput.val().trim();
      if (!p) {
        $aiInput.addClass("placeholder-red-400");
        setTimeout(() => $aiInput.removeClass("placeholder-red-400"), 500);
        $aiInput[0].focus();
        return;
      }
      sendPrompt(p);
    });

    $aiInput.on("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (!aiRunning) $btnRun.trigger("click");
      }
    });

    $aiInput.on("input", () => {
      $aiInput.removeClass("placeholder-red-400");
    });

    $btnStop.on("click", () => {
      if (ws) {
        ws.close();
        ws = null;
      }
      finishResponse();
    });

    connectWs();
  }
});
