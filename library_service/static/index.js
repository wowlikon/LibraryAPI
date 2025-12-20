const $svg = $("#bookSvg");
const NS = "http://www.w3.org/2000/svg";

const svgWidth = 200;
const svgHeight = 250;
const lineCount = 5;
const lineDelay = 16;
const bookWidth = 120;
const bookHeight = 180;
const bookX = (svgWidth - bookWidth) / 2;
const bookY = (svgHeight - bookHeight) / 2;
const desiredLineSpacing = 8;
const baseLineWidth = 2;
const maxLineWidth = 10;
const maxLineHeight = bookHeight - 24;
const innerPaddingX = 10;
const appearStagger = 8;

let lineSpacing;
if (lineCount > 1) {
  const maxSpan = Math.max(0, bookWidth - maxLineWidth - 2 * innerPaddingX);
  const wishSpan = desiredLineSpacing * (lineCount - 1);
  const realSpan = Math.min(wishSpan, maxSpan);
  lineSpacing = realSpan / (lineCount - 1);
} else {
  lineSpacing = 0;
}
const linesSpan = lineSpacing * (lineCount - 1);

const rightBase = bookX + bookWidth - innerPaddingX - maxLineWidth;
const lineStartX = rightBase - linesSpan;

const leftLimit = bookX + innerPaddingX;

let phase = 0;
let time = 0;

const baseAppearDuration = 40;
const appearDuration = baseAppearDuration + (lineCount - 1) * appearStagger;

const baseFlipDuration = 120;
const flipDuration = baseFlipDuration + (lineCount - 1) * lineDelay;

const baseDisappearDuration = 40;
const disappearDuration =
  baseDisappearDuration + (lineCount - 1) * appearStagger;

const pauseDuration = 30;

const book = document.createElementNS(NS, "rect");
$(book)
  .attr("x", bookX)
  .attr("y", bookY)
  .attr("width", bookWidth)
  .attr("height", bookHeight)
  .attr("fill", "#374151")
  .attr("rx", "4");
$svg.append(book);

const lines = [];
for (let i = 0; i < lineCount; i++) {
  const line = document.createElementNS(NS, "rect");
  $(line).attr("fill", "#ffffff").attr("rx", "1");
  $svg.append(line);

  const baseX = lineStartX + i * lineSpacing;
  const targetX = leftLimit + i * lineSpacing;
  const moveDistance = baseX - targetX;

  lines.push({
    el: $(line),
    baseX,
    targetX,
    moveDistance,
    currentX: baseX,
    width: baseLineWidth,
    height: 0,
  });
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInQuad(t) {
  return t * t;
}

function updateLine(line) {
  const $el = line.el;
  const centerY = bookY + bookHeight / 2;

  $el
    .attr("x", line.currentX)
    .attr("y", centerY - line.height / 2)
    .attr("width", line.width)
    .attr("height", Math.max(0, line.height));
}

function animateBook() {
  time++;

  if (phase === 0) {
    for (let i = 0; i < lineCount; i++) {
      const delay = (lineCount - 1 - i) * appearStagger;
      const localTime = Math.max(0, time - delay);
      const progress = Math.min(1, localTime / baseAppearDuration);
      const easedProgress = easeOutQuad(progress);

      lines[i].height = maxLineHeight * easedProgress;
      lines[i].currentX = lines[i].baseX;
      lines[i].width = baseLineWidth;
      updateLine(lines[i]);
    }

    if (time >= appearDuration) {
      phase = 1;
      time = 0;
    }
  } else if (phase === 1) {
    for (let i = 0; i < lineCount; i++) {
      const delay = i * lineDelay;
      const localTime = Math.max(0, time - delay);
      const progress = Math.min(1, localTime / baseFlipDuration);

      const moveProgress = easeInOutQuad(progress);
      lines[i].currentX = lines[i].baseX - lines[i].moveDistance * moveProgress;

      const widthProgress =
        progress < 0.5
          ? easeOutQuad(progress * 2)
          : 1 - easeInQuad((progress - 0.5) * 2);

      lines[i].width =
        baseLineWidth + (maxLineWidth - baseLineWidth) * widthProgress;

      updateLine(lines[i]);
    }

    if (time >= flipDuration) {
      phase = 2;
      time = 0;
    }
  } else if (phase === 2) {
    for (let i = 0; i < lineCount; i++) {
      const delay = (lineCount - 1 - i) * appearStagger;
      const localTime = Math.max(0, time - delay);
      const progress = Math.min(1, localTime / baseDisappearDuration);
      const easedProgress = easeInQuad(progress);

      lines[i].height = maxLineHeight * (1 - easedProgress);
      updateLine(lines[i]);
    }

    if (time >= disappearDuration + pauseDuration) {
      phase = 0;
      time = 0;
      for (let i = 0; i < lineCount; i++) {
        lines[i].currentX = lines[i].baseX;
        lines[i].width = baseLineWidth;
        lines[i].height = 0;
      }
    }
  }

  requestAnimationFrame(animateBook);
}

animateBook();

function animateCounter($element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * easedProgress);

    $element.text(current.toLocaleString("ru-RU"));

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      $element.text(target.toLocaleString("ru-RU"));
    }
  }

  requestAnimationFrame(update);
}

async function loadStats() {
  try {
    const response = await fetch("/api/stats");
    if (!response.ok) {
      throw new Error("Ошибка загрузки статистики");
    }

    const stats = await response.json();

    setTimeout(() => {
      const $booksEl = $("#stat-books");
      const $authorsEl = $("#stat-authors");
      const $genresEl = $("#stat-genres");
      const $usersEl = $("#stat-users");

      if ($booksEl.length) {
        animateCounter($booksEl, stats.books, 1500);
      }

      setTimeout(() => {
        if ($authorsEl.length) {
          animateCounter($authorsEl, stats.authors, 1500);
        }
      }, 150);

      setTimeout(() => {
        if ($genresEl.length) {
          animateCounter($genresEl, stats.genres, 1500);
        }
      }, 300);

      setTimeout(() => {
        if ($usersEl.length) {
          animateCounter($usersEl, stats.users, 1500);
        }
      }, 450);
    }, 500);
  } catch (error) {
    console.error("Ошибка загрузки статистики:", error);

    $("#stat-books").text("—");
    $("#stat-authors").text("—");
    $("#stat-genres").text("—");
    $("#stat-users").text("—");
  }
}

function observeStatCards() {
  const $cards = $(".stat-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            $(entry.target)
              .addClass("animate-fade-in")
              .css({
                opacity: "1",
                transform: "translateY(0)",
              });
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  $cards.each((index, card) => {
    $(card).css({
      opacity: "0",
      transform: "translateY(20px)",
      transition: "opacity 0.5s ease, transform 0.5s ease",
    });
    observer.observe(card);
  });
}

$(document).ready(() => {
  loadStats();
  observeStatCards();

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
