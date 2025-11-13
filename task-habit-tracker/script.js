// === script.js (replace file) ===

// === Status Overview Chart ===
const statusCtx = document.getElementById("statusChart").getContext("2d");

window.statusChart = new Chart(statusCtx, {
  type: "doughnut",
  data: {
    labels: ["Todo", "In Progress", "Completed", "Overdue"],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ["#b2bec3", "#0984e3", "#00b894", "#e74c3c"],
        borderWidth: 0,
        cutout: "70%",
      },
    ],
  },
  options: {
    plugins: {
      legend: {
        position: "right",
        align: "center",
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 15,
          color: "#555",
          font: { size: 13 },
        },
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed;
            return `${label}: ${value} task${value > 1 ? "s" : ""}`;
          },
        },
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 10,
        cornerRadius: 8,
      },
    },
    layout: { padding: 10 },
  },
});

// === Trend Chart with Sharp Edges ===
const trendCtx = document.getElementById("trendChart").getContext("2d");
const trendChart = new Chart(trendCtx, {
  type: "line",
  data: {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Completed",
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#0984e3",
        backgroundColor: "#0984e3",
        tension: 0, // Set to 0 for sharp edges (no curve)
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2,
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context) {
            return `Completed: ${context.parsed.y} habit${context.parsed.y > 1 ? "s" : ""}`;
          },
        },
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { ticks: { color: "#555" }, grid: { color: "#eee" } },
      y: {
        beginAtZero: true,
        ticks: { color: "#555" },
        grid: { color: "#eee" },
        title: { display: true, text: "Completed :" },
      },
    },
  },
});

// === Dark Mode Toggle ===
// === THEME TOGGLE WITH SVG IMAGES ===
const themeToggle = document.getElementById("theme-toggle");

if (themeToggle) {
  // Set initial icon based on saved theme preference
  if (document.body.classList.contains("dark-mode")) {
    themeToggle.innerHTML = '<img src="./assets/sun.svg" alt="Light Mode" style="width: 24px; height: 24px; background: none;">';
  } else {
    themeToggle.innerHTML = '<img src="./assets/moon.svg" alt="Dark Mode" style="width: 24px; height: 24px; background: none;">';
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
      // Switch to sun icon in dark mode
      themeToggle.innerHTML = '<img src="./assets/sun.png" alt="Light Mode" style="width: 24px; height: 24px; background: none;">';
      
      // Update chart colors for dark mode
      if (typeof statusChart !== 'undefined') {
        statusChart.options.plugins.legend.labels.color = "#ddd";
        statusChart.update();
      }
      
      if (typeof trendChart !== 'undefined') {
        trendChart.options.scales.x.ticks.color = "#ddd";
        trendChart.options.scales.y.ticks.color = "#ddd";
        trendChart.options.scales.x.grid.color = "#333";
        trendChart.options.scales.y.grid.color = "#333";
        trendChart.update();
      }
    } else {
      // Switch to moon icon in light mode
      themeToggle.innerHTML = '<img src="./assets/moon.svg" alt="Dark Mode" style="width: 24px; height: 24px; background: none;">';
      
      // Update chart colors for light mode
      if (typeof statusChart !== 'undefined') {
        statusChart.options.plugins.legend.labels.color = "#555";
        statusChart.update();
      }
      
      if (typeof trendChart !== 'undefined') {
        trendChart.options.scales.x.ticks.color = "#555";
        trendChart.options.scales.y.ticks.color = "#555";
        trendChart.options.scales.x.grid.color = "#eee";
        trendChart.options.scales.y.grid.color = "#eee";
        trendChart.update();
      }
    }
  });
}

// === Navigation Click Handler ===
document.querySelectorAll("nav ul li").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll("nav ul li").forEach((li) => li.classList.remove("active"));
    item.classList.add("active");
    const targetPage = item.getAttribute("data-link");
    if (targetPage) {
      window.location.href = targetPage;
    }
  });
});

// === Dashboard and Status Chart Updater ===
function updateDashboardAndStatusChart() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  const completedCard = document.querySelector(".card.completed .count");
  const overdueCard = document.querySelector(".card.overdue .count");

  const today = new Date().toISOString().split("T")[0];

  const todo = tasks.filter(t => t.status === "Todo").length;
  const inProgress = tasks.filter(t => t.status === "In Progress").length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const overdue = tasks.filter(t => {
    const dateField = t.dueDate || t.due || t.deadline;
    if (!dateField || t.status === "Completed") return false;
    const dueDate = new Date(dateField).toISOString().split("T")[0];
    return dueDate < today;
  }).length;

  if (completedCard) completedCard.textContent = completed;
  if (overdueCard) overdueCard.textContent = overdue;

  if (window.statusChart) {
    window.statusChart.data.datasets[0].data = [todo, inProgress, completed, overdue];
    window.statusChart.update();
  }

  updateHabitsDashboard();
}

// === Update Habits Dashboard (Active & Longest streak & Trend) ===
function updateHabitsDashboard() {
  // read habits
  const habits = JSON.parse(localStorage.getItem("habits")) || [];

  // Active habits count: number of habits (you can change definition if needed)
  const activeEl = document.querySelector(".card.active .count"); // matches index.html
  if (activeEl) activeEl.textContent = habits.length;

  // Longest streak: max of computeStreak() across all habits
  const longestEl = document.querySelector(".card.streak .count"); // matches index.html
  const streaks = habits.map(h => computeStreak(h.completedDates || []));
  const longest = streaks.length > 0 ? Math.max(...streaks) : 0;
  if (longestEl) longestEl.textContent = longest;

  // Update trendChart: compute completions per last-7-days
  const last7Days = getLast7Days(new Date());
  const dailyCompletions = last7Days.map(day => {
    return habits.reduce((sum, habit) => {
      const dates = habit.completedDates || [];
      return sum + (dates.some(d => d.split("T")[0] === day.iso) ? 1 : 0);
    }, 0);
  });

  trendChart.data.labels = last7Days.map(d => d.day);
  trendChart.data.datasets[0].data = dailyCompletions;
  trendChart.update();
}

// Helper: get last 7 days (same format used in habits)
function getLast7Days(fromDate) {
  const days = [];
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() - i);
    days.push({
      iso: d.toISOString().split("T")[0],
      day: names[d.getDay()],
    });
  }
  return days;
}

// computeStreak copied from habits.js (keeps consistent)
function computeStreak(completedDates = []) {
  if (!Array.isArray(completedDates) || completedDates.length === 0) return 0;
  const set = new Set(completedDates.map(d => d.split("T")[0]));
  let streak = 0;
  const today = new Date();
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    if (set.has(iso)) streak++;
    else break;
  }
  return streak;
}

// Auto update on load
document.addEventListener("DOMContentLoaded", updateDashboardAndStatusChart);

// When localStorage changes in another tab / page, update dashboard
window.addEventListener("storage", (e) => {
  // react to habits changes (either key 'habits' or our trigger)
  if (!e.key || e.key === "habits" || e.key === "habitsSyncTrigger") {
    updateDashboardAndStatusChart();
  }
});