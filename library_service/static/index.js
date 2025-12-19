const svg = document.getElementById("bookSvg");
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
book.setAttribute("x", bookX);
book.setAttribute("y", bookY);
book.setAttribute("width", bookWidth);
book.setAttribute("height", bookHeight);
book.setAttribute("fill", "#374151");
book.setAttribute("rx", "4");
svg.appendChild(book);

const lines = [];
for (let i = 0; i < lineCount; i++) {
  const line = document.createElementNS(NS, "rect");
  line.setAttribute("fill", "#ffffff");
  line.setAttribute("rx", "1");
  svg.appendChild(line);

  const baseX = lineStartX + i * lineSpacing;
  const targetX = leftLimit + i * lineSpacing;
  const moveDistance = baseX - targetX;

  lines.push({
    el: line,
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
  const el = line.el;
  const centerY = bookY + bookHeight / 2;

  el.setAttribute("x", line.currentX);
  el.setAttribute("y", centerY - line.height / 2);
  el.setAttribute("width", line.width);
  el.setAttribute("height", Math.max(0, line.height));
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

function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * easedProgress);

    element.textContent = current.toLocaleString("ru-RU");

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target.toLocaleString("ru-RU");
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
      const booksEl = document.getElementById("stat-books");
      const authorsEl = document.getElementById("stat-authors");
      const genresEl = document.getElementById("stat-genres");
      const usersEl = document.getElementById("stat-users");

      if (booksEl) {
        animateCounter(booksEl, stats.books, 1500);
      }

      setTimeout(() => {
        if (authorsEl) {
          animateCounter(authorsEl, stats.authors, 1500);
        }
      }, 150);

      setTimeout(() => {
        if (genresEl) {
          animateCounter(genresEl, stats.genres, 1500);
        }
      }, 300);

      setTimeout(() => {
        if (usersEl) {
          animateCounter(usersEl, stats.users, 1500);
        }
      }, 450);
    }, 500);
  } catch (error) {
    console.error("Ошибка загрузки статистики:", error);

    document.getElementById("stat-books").textContent = "—";
    document.getElementById("stat-authors").textContent = "—";
    document.getElementById("stat-genres").textContent = "—";
    document.getElementById("stat-users").textContent = "—";
  }
}

function observeStatCards() {
  const cards = document.querySelectorAll(".stat-card");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add("animate-fade-in");
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  cards.forEach((card) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(20px)";
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    observer.observe(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  observeStatCards();
});
