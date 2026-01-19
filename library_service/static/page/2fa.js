$(async () => {
  let secretKey = "";

  try {
    const data = await Api.get("/api/auth/2fa");
    secretKey = data.secret;
    $("#secret-code-display").text(secretKey);

    const config = {
      cellSize: 10,
      radius: 4,
      strokeWidth: 1.5,
      color: "#374151",
      arcDur: 500,
      arcDelayStep: 10,
      fillDur: 300,
      fillDelayStep: 10,
      squareDur: 800,
      shrinkDur: 300,
      moveDur: 800,
      shrinkFactor: 0.9,
      moveFactor: 0.3,
    };

    const grid = decodeBitmapToGrid(data.bitmap_b64, data.size, data.padding);
    const svgHTML = AnimationLib.generateSVG(grid, config);

    const $container = $("#qr-container");
    $container.find(".loader").remove();
    $container.prepend(svgHTML);

    AnimationLib.animateCircles(grid, config);
  } catch (e) {
    console.error(e);
    Utils.showToast("Ошибка загрузки данных 2FA", "error");
    $("#qr-container").html(
      '<div class="text-red-500 text-sm">Ошибка загрузки</div>',
    );
  }

  $("#secret-copy-btn").on("click", function () {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey).then(() => {
      Utils.showToast("Код скопирован", "success");
    });
  });

  const $inputs = $(".totp-digit");
  const $submitBtn = $("#verify-btn");
  const $msg = $("#form-message");

  let digits = $inputs.map((_, el) => $(el).val()).get();
  while (digits.length < 6) digits.push("");

  function updateDigitsState() {
    digits = $inputs.map((_, el) => $(el).val()).get();
  }

  function checkCompletion() {
    updateDigitsState();
    const isComplete = digits.every((d) => d.length === 1);
    if (isComplete) {
      $submitBtn.prop("disabled", false);
      $msg.text("").removeClass("text-red-600 text-green-600");
    } else {
      $submitBtn.prop("disabled", true);
    }
    return isComplete;
  }

  function getTargetFocusIndex() {
    const firstEmptyIndex = digits.findIndex((d) => d === "");
    return firstEmptyIndex === -1 ? 5 : firstEmptyIndex;
  }

  $inputs.on("focus click", function (e) {
    const targetIndex = getTargetFocusIndex();
    const currentIndex = $(this).data("index");

    if (currentIndex !== targetIndex) {
      e.preventDefault();
      setTimeout(() => {
        $inputs.eq(targetIndex).trigger("focus");
        const val = $inputs.eq(targetIndex).val();
        $inputs.eq(targetIndex).val("").val(val);
      }, 0);
    }
  });

  $inputs.on("input", function (e) {
    const index = parseInt($(this).data("index"));
    const val = $(this).val();
    const numericVal = val.replace(/\D/g, "");

    if (!numericVal) {
      $(this).val("");
      digits[index] = "";
      return;
    }

    const digit = numericVal.slice(-1);
    $(this).val(digit);
    digits[index] = digit;

    const targetIndex = getTargetFocusIndex();
    $inputs.eq(targetIndex).trigger("focus");

    checkCompletion();
  });

  $inputs.on("keydown", function (e) {
    const index = parseInt($(this).data("index"));

    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();

      const currentVal = $(this).val();

      if (currentVal) {
        $(this).val("");
        digits[index] = "";
      } else {
        if (index > 0) {
          const prevIndex = index - 1;
          $inputs.eq(prevIndex).val("");
          digits[prevIndex] = "";
          $inputs.eq(prevIndex).trigger("focus");
        }
      }
      checkCompletion();
      return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
    }
  });

  $inputs.on("paste", function (e) {
    e.preventDefault();
    const clipboardData =
      (e.originalEvent || e).clipboardData || window.clipboardData;
    const pastedData = clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (pastedData) {
      let charIdx = 0;
      let startIndex = 0;
      if (pastedData.length === 6) {
        startIndex = 0;
      } else {
        startIndex = digits.findIndex((d) => d === "");
        if (startIndex === -1) startIndex = 0;
      }

      for (let i = startIndex; i < 6 && charIdx < pastedData.length; i++) {
        digits[i] = pastedData[charIdx];
        $inputs.eq(i).val(pastedData[charIdx]);
        charIdx++;
      }

      checkCompletion();

      const nextFocus = getTargetFocusIndex();
      $inputs.eq(nextFocus).trigger("focus");
    }
  });

  $("#totp-form").on("submit", async function (e) {
    e.preventDefault();
    if (!checkCompletion()) return;

    const code = digits.join("");
    $submitBtn.prop("disabled", true).text("Проверка...");
    $msg.text("").attr("class", "mb-4 text-center text-sm min-h-[20px]");

    try {
      await Api.post("/api/auth/2fa/enable", {
        data: {
          code: code,
        },
        secret: secretKey,
      });

      $msg.text("Код принят!").addClass("text-green-600");
      Utils.showToast("2FA успешно активирована", "success");

      setTimeout(() => {
        window.location.href = "/profile";
      }, 1000);
    } catch (err) {
      const errorText = err.message || "Неверный код";
      $msg.text(errorText).addClass("text-red-600");
      $submitBtn.prop("disabled", false).text("Подтвердить");
    }
  });

  checkCompletion();
});

function decodeBitmapToGrid(b64Data, size, padding) {
  const binaryString = atob(b64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const grid = [];
  let bitIndex = 0;
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      const bytePos = Math.floor(bitIndex / 8);
      const bitPos = 7 - (bitIndex % 8);
      if (bytePos < bytes.length) {
        const bit = (bytes[bytePos] >> bitPos) & 1;
        row.push(bit === 0);
      } else {
        row.push(false);
      }
      bitIndex++;
    }
    grid.push(row);
  }
  return grid;
}

const AnimationLib = {
  generateSVG(grid, config) {
    const { cellSize, radius, strokeWidth, color } = config;
    const width = grid[0].length * cellSize;
    const height = grid.length * cellSize;

    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="mx-auto block" style="transition: all 0.5s ease;">`;
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cx = col * cellSize + cellSize / 2;
        const cy = row * cellSize + cellSize / 2;

        const circumference = 2 * Math.PI * radius;
        const isClockwise = (row + col) % 2 === 0;
        const initialOffset = isClockwise ? circumference : -circumference;

        const squareX = cx - radius;
        const squareY = cy - radius;
        const squareSize = 2 * radius;

        svg += `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" rx="${radius}" ry="${radius}" fill="${color}" opacity="0" id="square_${row}_${col}"></rect>`;
        svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${circumference}" stroke-dashoffset="${initialOffset}" id="circle_${row}_${col}"></circle>`;
        if (grid[row][col]) {
          svg += `<circle cx="${cx}" cy="${cy}" r="0" fill="${color}" id="inner_${row}_${col}"></circle>`;
        }
      }
    }
    svg += "</svg>";
    return svg;
  },

  animateCircles(grid, config) {
    const {
      radius,
      cellSize,
      arcDur,
      arcDelayStep,
      fillDur,
      fillDelayStep,
      squareDur,
      shrinkDur,
      moveDur,
      shrinkFactor,
      moveFactor,
    } = config;

    const rows = grid.length;
    const cols = grid[0].length;
    const centerRow = Math.floor(rows / 2);
    const centerCol = Math.floor(cols / 2);
    const centerX = centerCol * cellSize + cellSize / 2 - radius;
    const centerY = centerRow * cellSize + cellSize / 2 - radius;

    const elements = [];
    for (let row = 0; row < rows; row++) {
      elements[row] = [];
      for (let col = 0; col < cols; col++) {
        elements[row][col] = {
          circle: document.getElementById(`circle_${row}_${col}`),
          square: document.getElementById(`square_${row}_${col}`),
          inner: grid[row][col]
            ? document.getElementById(`inner_${row}_${col}`)
            : null,
        };
      }
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const { circle } = elements[row][col];
        if (circle) {
          const isClockwise = (row + col) % 2 === 0;
          setTimeout(
            () => {
              this.rafAnimate(
                circle,
                "stroke-dashoffset",
                isClockwise ? 2 * Math.PI * radius : -2 * Math.PI * radius,
                0,
                arcDur,
              );
            },
            (row + col) * arcDelayStep,
          );
        }
      }
    }

    const maxDelayFirst = (rows + cols - 2) * arcDelayStep;

    setTimeout(() => {
      let maxDist = 0;
      const fills = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c]) {
            const d = Math.sqrt((r - centerRow) ** 2 + (c - centerCol) ** 2);
            fills.push({ r, c, delay: d * fillDelayStep });
            maxDist = Math.max(maxDist, d);
          }
        }
      }

      fills.forEach(({ r, c, delay }) => {
        const { inner } = elements[r][c];
        if (inner) {
          setTimeout(() => {
            this.rafAnimate(inner, "r", 0, radius, fillDur);
          }, delay);
        }
      });

      setTimeout(
        () => {
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const { circle, square, inner } = elements[r][c];
              if (grid[r][c]) {
                this.rafMorphToSquare(circle, square, inner, radius, squareDur);
              } else {
                this.rafFadeOut(circle, squareDur);
                if (square) square.remove();
              }
            }
          }

          setTimeout(() => {
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                if (grid[r][c]) {
                  this.rafShrink(
                    elements[r][c].square,
                    2 * radius,
                    2 * radius * shrinkFactor,
                    shrinkDur,
                  );
                }
              }
            }

            setTimeout(() => {
              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                  if (grid[r][c]) {
                    const sq = elements[r][c].square;
                    const cX = parseFloat(sq.getAttribute("x"));
                    const cY = parseFloat(sq.getAttribute("y"));
                    const tX = cX + (centerX - cX) * moveFactor;
                    const tY = cY + (centerY - cY) * moveFactor;
                    this.rafMove(sq, cX, cY, tX, tY, moveDur);
                  }
                }
              }

              setTimeout(() => {
                const svg = document.querySelector("#qr-container svg");
                if (svg) {
                  svg.style.borderRadius = "10%";
                  svg.style.border = "5px black dotted";
                }
              }, moveDur);
            }, shrinkDur);
          }, squareDur);
        },
        maxDist * fillDelayStep + fillDur,
      );
    }, maxDelayFirst + arcDur);
  },

  rafAnimate(el, attr, from, to, dur) {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.setAttribute(attr, from + (to - from) * p);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
  rafMorphToSquare(circle, square, inner, radius, dur) {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const r = radius * (1 - p);
      square.setAttribute("rx", r);
      square.setAttribute("ry", r);
      square.setAttribute("opacity", p);
      circle.setAttribute("opacity", 1 - p);
      if (p < 1) requestAnimationFrame(step);
      else {
        circle.remove();
        if (inner) inner.remove();
        square.removeAttribute("opacity");
      }
    };
    requestAnimationFrame(step);
  },
  rafFadeOut(el, dur) {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.setAttribute("opacity", 1 - p);
      if (p < 1) requestAnimationFrame(step);
      else el.remove();
    };
    requestAnimationFrame(step);
  },
  rafShrink(el, fromS, toS, dur) {
    const start = performance.now();
    const diff = fromS - toS;
    const ox = parseFloat(el.getAttribute("x"));
    const oy = parseFloat(el.getAttribute("y"));
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const cur = fromS - diff * p;
      const off = (fromS - cur) / 2;
      el.setAttribute("width", cur);
      el.setAttribute("height", cur);
      el.setAttribute("x", ox + off);
      el.setAttribute("y", oy + off);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
  rafMove(el, fx, fy, tx, ty, dur) {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.setAttribute("x", fx + (tx - fx) * ease);
      el.setAttribute("y", fy + (ty - fy) * ease);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },
};
