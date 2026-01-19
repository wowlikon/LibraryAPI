$(document).ready(() => {
  if (!window.isAdmin()) {
    $(".container").html(
      '<div class="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100"><svg class="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg><h3 class="text-lg font-medium text-gray-900 mb-2">Доступ запрещён</h3><p class="text-gray-500 mb-4">Только администраторы могут просматривать аналитику</p><a href="/" class="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">На главную</a></div>',
    );
    return;
  }

  let loansChart = null;
  let returnsChart = null;
  let currentPeriod = 30;

  init();

  function init() {
    $("#period-select").on("change", function () {
      currentPeriod = parseInt($(this).val());
      loadAnalytics();
    });

    $("#refresh-btn").on("click", loadAnalytics);

    loadAnalytics();
  }

  async function loadAnalytics() {
    try {
      const data = await Api.get(`/api/loans/analytics?days=${currentPeriod}`);
      renderSummary(data.summary);
      renderCharts(data);
      renderTopBooks(data.top_books);
    } catch (error) {
      console.error("Failed to load analytics", error);
      Utils.showToast("Ошибка загрузки аналитики", "error");
    }
  }

  function renderSummary(summary) {
    $("#total-loans").text(summary.total_loans || 0);
    $("#active-loans").text(summary.active_loans || 0);
    $("#returned-loans").text(summary.returned_loans || 0);
    $("#overdue-loans").text(summary.overdue_loans || 0);
    $("#reserved-books").text(summary.reserved_books || 0);
    $("#borrowed-books").text(summary.borrowed_books || 0);
  }

  function renderCharts(data) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    const dates = [];
    const loansData = [];
    const returnsData = [];

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      dates.push(
        new Date(d).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
        }),
      );
      loansData.push(data.daily_loans[dateStr] || 0);
      returnsData.push(data.daily_returns[dateStr] || 0);
    }

    const loansCtx = document.getElementById("loans-chart");
    if (loansChart) {
      loansChart.destroy();
    }
    loansChart = new Chart(loansCtx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Выдачи",
            data: loansData,
            borderColor: "rgb(75, 85, 99)",
            backgroundColor: "rgba(75, 85, 99, 0.05)",
            borderWidth: 1.5,
            fill: true,
            tension: 0.3,
            pointRadius: 2.5,
            pointHoverRadius: 4,
            pointBackgroundColor: "rgb(75, 85, 99)",
            pointBorderColor: "#fff",
            pointBorderWidth: 1.5,
            pointStyle: "circle",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 10,
            titleFont: { size: 12, weight: "500" },
            bodyFont: { size: 11 },
            cornerRadius: 6,
            displayColors: false,
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            titleSpacing: 4,
            bodySpacing: 4,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.03)",
              drawBorder: false,
              lineWidth: 1,
            },
            ticks: {
              precision: 0,
              font: { size: 10 },
              color: "rgba(0, 0, 0, 0.4)",
              padding: 8,
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 0,
              minRotation: 0,
              font: { size: 10 },
              color: "rgba(0, 0, 0, 0.4)",
              padding: 8,
            },
          },
        },
      },
    });

    const returnsCtx = document.getElementById("returns-chart");
    if (returnsChart) {
      returnsChart.destroy();
    }
    returnsChart = new Chart(returnsCtx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Возвраты",
            data: returnsData,
            borderColor: "rgb(107, 114, 128)",
            backgroundColor: "rgba(107, 114, 128, 0.05)",
            borderWidth: 1.5,
            fill: true,
            tension: 0.3,
            pointRadius: 2.5,
            pointHoverRadius: 4,
            pointBackgroundColor: "rgb(107, 114, 128)",
            pointBorderColor: "#fff",
            pointBorderWidth: 1.5,
            pointStyle: "circle",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 10,
            titleFont: { size: 12, weight: "500" },
            bodyFont: { size: 11 },
            cornerRadius: 6,
            displayColors: false,
            borderColor: "rgba(255, 255, 255, 0.08)",
            borderWidth: 1,
            titleSpacing: 4,
            bodySpacing: 4,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.03)",
              drawBorder: false,
              lineWidth: 1,
            },
            ticks: {
              precision: 0,
              font: { size: 10 },
              color: "rgba(0, 0, 0, 0.4)",
              padding: 8,
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxRotation: 0,
              minRotation: 0,
              font: { size: 10 },
              color: "rgba(0, 0, 0, 0.4)",
              padding: 8,
            },
          },
        },
      },
    });
  }

  function renderTopBooks(topBooks) {
    const $container = $("#top-books-container");
    $container.empty();

    if (!topBooks || topBooks.length === 0) {
      $container.html(
        '<div class="text-center text-gray-500 py-8">Нет данных</div>',
      );
      return;
    }

    topBooks.forEach((book, index) => {
      const $item = $(`
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="w-7 h-7 bg-gray-600 text-white rounded-full flex items-center justify-center font-medium text-xs flex-shrink-0">
              ${index + 1}
            </div>
            <div class="flex-1 min-w-0">
              <a href="/book/${book.book_id}" class="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors block truncate">
                ${Utils.escapeHtml(book.title)}
              </a>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0 ml-3">
            <span class="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
              ${book.loan_count} ${book.loan_count === 1 ? "выдача" : book.loan_count < 5 ? "выдачи" : "выдач"}
            </span>
          </div>
        </div>
      `);
      $container.append($item);
    });
  }
});
