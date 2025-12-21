$(document).ready(() => {
  if (!window.canManage) return;
  setTimeout(() => window.canManage, 100);

  const $form = $("#create-author-form");
  const $nameInput = $("#author-name");
  const $submitBtn = $("#submit-btn");
  const $submitText = $("#submit-text");
  const $loadingSpinner = $("#loading-spinner");
  const $successModal = $("#success-modal");

  $nameInput.on("input", function () {
    $("#name-counter").text(`${this.value.length}/255`);
  });

  $form.on("submit", async function (e) {
    e.preventDefault();

    const name = $nameInput.val().trim();

    if (!name) {
      Utils.showToast("Введите имя автора", "error");
      return;
    }

    setLoading(true);

    try {
      const author = await Api.post("/api/authors/", { name });
      showSuccess(author);
    } catch (error) {
      console.error("Ошибка создания:", error);

      let errorMsg = "Произошла ошибка при создании автора";
      if (error.responseJSON && error.responseJSON.detail) {
        errorMsg = error.responseJSON.detail;
      } else if (error.status === 401) {
        errorMsg = "Вы не авторизованы";
      } else if (error.status === 403) {
        errorMsg = "У вас недостаточно прав";
      } else if (error.status === 409) {
        errorMsg = "Автор с таким именем уже существует";
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
      $submitText.text("Создать автора");
      $loadingSpinner.addClass("hidden");
    }
  }

  function showSuccess(author) {
    $("#modal-author-name").text(author.name);
    $successModal.removeClass("hidden");
  }

  function resetForm() {
    $form[0].reset();
    $("#name-counter").text("0/255");
  }

  $("#modal-close-btn").on("click", function () {
    $successModal.addClass("hidden");
    resetForm();
    $nameInput[0].focus();
  });

  $successModal.on("click", function (e) {
    if (e.target === this) {
      window.location.href = "/authors";
    }
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape" && !$successModal.hasClass("hidden")) {
      window.location.href = "/authors";
    }
  });
});
