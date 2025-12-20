$(function () {
  const $guestLink = $("#guest-link");
  const $userBtn = $("#user-btn");
  const $userDropdown = $("#user-dropdown");
  const $userArrow = $("#user-arrow");
  const $userAvatar = $("#user-avatar");
  const $dropdownName = $("#dropdown-name");
  const $dropdownUsername = $("#dropdown-username");
  const $dropdownEmail = $("#dropdown-email");
  const $logoutBtn = $("#logout-btn");
  const $menuContainer = $("#user-menu-area");

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
    if (isDropdownOpen && !$(e.target).closest("#user-menu-area").length) {
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
    if (typeof sha256 === "undefined") {
      console.warn("sha256 library not loaded yet");
      return;
    }

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

        if (window.location.pathname === "/auth") {
          window.location.href = "/";
        }
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        showGuest();
      });
  }
});
