$(document).ready(() => {
  if (!window.canManage()) return;
  setTimeout(() => window.canManage, 100);

  const $form = $("#create-genre-form");
  const $nameInput = $("#genre-name");
  const $submitBtn = $("#submit-btn");
  const $submitText = $("#submit-text");
  const $loadingSpinner = $("#loading-spinner");
  const $successModal = $("#success-modal");

  $nameInput.on("input", function () {
    $("#name-counter").text(`${this.value.length}/100`);
  });

  $form.on("submit", async function (e) {
    e.preventDefault();

    const name = $nameInput.val().trim();

    if (!name) {
      Utils.showToast("Введите название жанра", "error");
      return;
    }

    setLoading(true);

    try {
      const genre = await Api.post("/api/genres/", { name });
      showSuccess(genre);
    } catch (error) {
      console.error("Ошибка создания:", error);

      let errorMsg = "Произошла ошибка при создании жанра";
      if (error.responseJSON && error.responseJSON.detail) {
        errorMsg = error.responseJSON.detail;
      } else if (error.status === 401) {
        errorMsg = "Вы не авторизованы";
      } else if (error.status === 403) {
        errorMsg = "У вас недостаточно прав";
      } else if (error.status === 409) {
        errorMsg = "Жанр с таким названием уже существует";
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
      $submitText.text("Создать жанр");
      $loadingSpinner.addClass("hidden");
    }
  }

  function showSuccess(genre) {
    $("#modal-genre-name").text(genre.name);
    $successModal.removeClass("hidden");
  }

  function resetForm() {
    $form[0].reset();
    $("#name-counter").text("0/100");
  }

  $("#modal-close-btn").on("click", function () {
    $successModal.addClass("hidden");
    resetForm();
    $nameInput[0].focus();
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
});
