// === habits.js (Interactive calendar with dashboard sync) ===

/* -------------------------
   Element selectors
   ------------------------- */
const addHabitBtn = document.getElementById("addHabitBtn");
const modalOverlay = document.getElementById("modalOverlay");
const editModalOverlay = document.getElementById("editModalOverlay");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const frequencySelect = document.getElementById("frequencySelect");
const daySelect = document.getElementById("daySelect");
const selectAll = document.getElementById("selectAll");
const habitForm = document.getElementById("habitForm");
const editHabitForm = document.getElementById("editHabitForm");
const habitsContainer = document.getElementById("habitsContainer");

const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const deleteMessage = document.getElementById("deleteMessage");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const closeDeleteModal = document.getElementById("closeDeleteModal");

let editIndex = null;
let habitToDelete = null;

const uiFilterSelect = document.querySelector(".filter-box select");
const uiSortSelect = document.querySelector(".sort-box select");
const uiSearchInput = document.querySelector(".search-bar input");

/* -------------------------
   Shared constants
   ------------------------- */
const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/* -------------------------
   Toast helper (matching screenshot)
   ------------------------- */
function createToastContainer() {
  if (!document.getElementById("toast")) {
    const toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.display = "none";
    toast.style.alignItems = "center";
    toast.style.background = "#D4F4DD";
    toast.style.borderRadius = "8px";
    toast.style.minWidth = "400px";
    toast.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
    toast.style.overflow = "hidden";
    toast.style.zIndex = "9999";
    toast.style.transition = "all 0.4s ease";
    toast.style.transform = "translateX(100%)";
    toast.style.opacity = "0";

    toast.innerHTML = `
      <div style="display:flex;align-items:stretch;width:100%;">
        <div style="background:#34A853;color:#fff;padding:20px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:24px;font-weight:bold;">✓</span>
        </div>
        <div style="flex:1;padding:20px 18px;display:flex;align-items:center;">
          <span id="toastMessage" style="font-size:15px;color:#1a1a1a;line-height:1.4;"></span>
        </div>
        <button id="toastClose" style="background:none;border:none;color:#5f6368;font-size:20px;cursor:pointer;padding:0 18px;display:flex;align-items:center;transition:color 0.2s;">✕</button>
      </div>
    `;

    document.body.appendChild(toast);

    document.getElementById("toastClose").addEventListener("click", () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => (toast.style.display = "none"), 400);
    });
  }
}

function showToast(message, timeout = 5000) {
  createToastContainer();
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toastMessage");

  msg.textContent = message;

  toast.style.display = "flex";
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(0)";
  }, 10);

  clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => (toast.style.display = "none"), 400);
  }, timeout);
}

/* -------------------------
   LocalStorage helpers with sync - ENHANCED for Dashboard
   ------------------------- */
function getHabits() {
  return JSON.parse(localStorage.getItem("habits")) || [];
}

function saveHabits(habits) {
  localStorage.setItem("habits", JSON.stringify(habits));
  localStorage.setItem("habitsSyncTrigger", Date.now().toString());
  
  // Calculate and save highest streak for dashboard
  updateDashboardStats(habits);
}

function updateDashboardStats(habits) {
  let highestStreak = 0;
  let totalHabits = habits.length;
  let activeHabits = 0;
  
  habits.forEach(habit => {
    const streak = computeStreak(habit.completedDates || [], habit);
    if (streak > highestStreak) {
      highestStreak = streak;
    }
    
    // Check if habit was completed today
    const todayIso = new Date().toISOString().split("T")[0];
    const completedToday = (habit.completedDates || []).some(d => d.split("T")[0] === todayIso);
    if (completedToday) {
      activeHabits++;
    }
  });
  
  // Save dashboard stats
  const dashboardStats = {
    highestStreak,
    totalHabits,
    activeHabits,
    lastUpdated: Date.now()
  };
  
  localStorage.setItem("dashboardStats", JSON.stringify(dashboardStats));
  console.log("📊 Dashboard stats updated:", dashboardStats);
}

/* -------------------------
   Get Rules from localStorage
   ------------------------- */
function getSavedRules() {
  return JSON.parse(localStorage.getItem("rules")) || [];
}

/* -------------------------
   Rule Evaluation Logic with FIXED AND/OR Support
   ------------------------- */
function evaluateCondition(habit, condition) {
  if (!condition || typeof condition !== 'object') {
    return false;
  }
  
  const { field, operator, value } = condition;
  
  if (!field || !operator) {
    return false;
  }
  
  if (value === undefined || value === null || value === "") {
    return false;
  }

  const fieldLower = String(field).toLowerCase().trim();
  const operatorLower = String(operator).toLowerCase().trim();

  let habitValue = null;
  let compareValue = null;
  let result = false;

  switch (fieldLower) {
    case "frequency":
      habitValue = (habit.frequency || "").toLowerCase().trim();
      compareValue = String(value).toLowerCase().trim();
      
      if (operatorLower.includes("equal")) {
        if (operatorLower.includes("not")) {
          result = habitValue !== compareValue;
        } else {
          result = habitValue === compareValue;
        }
      }
      break;
      
    case "streak":
      habitValue = computeStreak(habit.completedDates || [], habit);
      compareValue = parseInt(value, 10);
      
      if (isNaN(compareValue)) {
        return false;
      }
      
      if (operatorLower.includes("equal")) {
        if (operatorLower.includes("not")) {
          result = habitValue !== compareValue;
        } else if (operatorLower.includes("less") && operatorLower.includes("or")) {
          result = habitValue <= compareValue;
        } else if (operatorLower.includes("greater") && operatorLower.includes("or")) {
          result = habitValue >= compareValue;
        } else {
          result = habitValue === compareValue;
        }
      } else if (operatorLower.includes("less")) {
        result = habitValue < compareValue;
      } else if (operatorLower.includes("greater")) {
        result = habitValue > compareValue;
      }
      break;
      
    default:
      return false;
  }

  return result;
}

function getHighlightColorForHabit(habit) {
  const rules = getSavedRules();
  
  const habitRules = rules.filter(rule => 
    rule.applyTo === "Habit" && 
    rule.badge && 
    rule.badge.trim() !== "" &&
    rule.isActive !== false
  );

  for (const rule of habitRules) {
    if (!rule.conditions || rule.conditions.length === 0) {
      continue;
    }

    const logicalOperator = (rule.logicalOperator || rule.conditionType || "AND").toUpperCase().trim();
    let ruleMatches = false;

    switch (logicalOperator) {
      case "AND":
        ruleMatches = rule.conditions.every(condition => evaluateCondition(habit, condition));
        break;
        
      case "OR":
        ruleMatches = rule.conditions.some(condition => evaluateCondition(habit, condition));
        break;
        
      default:
        ruleMatches = rule.conditions.every(condition => evaluateCondition(habit, condition));
    }

    if (ruleMatches) {
      return rule.badge;
    }
  }

  return null;
}

/* -------------------------
   Modal toggles
   ------------------------- */
addHabitBtn && addHabitBtn.addEventListener("click", () => (modalOverlay.style.display = "flex"));
closeModal && closeModal.addEventListener("click", () => (modalOverlay.style.display = "none"));
cancelBtn && cancelBtn.addEventListener("click", () => (modalOverlay.style.display = "none"));
if (closeEditModal) closeEditModal.addEventListener("click", () => (editModalOverlay.style.display = "none"));
if (cancelEditBtn) cancelEditBtn.addEventListener("click", () => (editModalOverlay.style.display = "none"));

/* -------------------------
   Frequency logic (show days + weekly/custom behavior)
   ------------------------- */
if (frequencySelect) {
  frequencySelect.addEventListener("change", () => {
    const value = frequencySelect.value;
    const checkboxes = daySelect.querySelectorAll('input[type="checkbox"]:not(#selectAll)');

    if (value === "weekly" || value === "custom") daySelect.classList.remove("hidden");
    else daySelect.classList.add("hidden");

    checkboxes.forEach(cb => (cb.checked = false));
    if (selectAll) selectAll.checked = false;

    if (value === "weekly") {
      checkboxes.forEach(cb => {
        const newCb = cb.cloneNode(true);
        cb.parentNode.replaceChild(newCb, cb);
      });
      const singleCheckboxes = daySelect.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
      singleCheckboxes.forEach(cb => {
        cb.addEventListener("change", function () {
          if (this.checked) {
            singleCheckboxes.forEach(other => {
              if (other !== this) other.checked = false;
            });
          }
        });
      });
      if (selectAll && selectAll.parentElement) selectAll.parentElement.style.display = "none";
    } else if (value === "custom") {
      const multiCheckboxes = daySelect.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
      multiCheckboxes.forEach(cb => {
        const newCb = cb.cloneNode(true);
        cb.parentNode.replaceChild(newCb, cb);
      });
      if (selectAll && selectAll.parentElement) selectAll.parentElement.style.display = "";
    } else {
      if (selectAll && selectAll.parentElement) selectAll.parentElement.style.display = "none";
    }
  });
}

/* -------------------------
   Select all checkboxes
   ------------------------- */
if (selectAll) {
  selectAll.addEventListener("change", () => {
    const checkboxes = daySelect.querySelectorAll('input[type="checkbox"]:not(#selectAll)');
    checkboxes.forEach(cb => (cb.checked = selectAll.checked));
  });
}

/* -------------------------
   Empty state - ENHANCED with centered styling
   ------------------------- */
function updateEmptyState() {
  const savedHabits = getHabits();
  let emptyState = document.querySelector(".empty-state");
  
  if (savedHabits.length === 0) {
    if (!emptyState) {
      emptyState = document.createElement("div");
      emptyState.classList.add("empty-state");
      habitsContainer.appendChild(emptyState);
    }
    
    Object.assign(emptyState.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      textAlign: 'center',
      minHeight: '400px',
      width: '100%'
    });
    
    emptyState.innerHTML = `
      <i class="fa-solid fa-fire" style="
        font-size: 80px;
        color: #d0d0d0;
        margin-bottom: 24px;
        opacity: 0.6;
      "></i>
      <p style="
        font-size: 18px;
        color: #666;
        margin: 0;
        font-weight: 400;
        max-width: 400px;
        line-height: 1.5;
      ">No habits yet. Create your first habit to start building streaks!</p>
    `;
  } else {
    if (emptyState) {
      emptyState.remove();
    }
  }
}

/* -------------------------
   Utilities: next7 occurrences & streak
   ------------------------- */
function getNext7Occurrences(startDate, selectedDays) {
  const result = [];
  let current = new Date(startDate);

  if (!Array.isArray(selectedDays)) selectedDays = [];

  if (selectedDays.length === 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      result.push({
        iso: d.toISOString().split("T")[0],
        date: d.getDate(),
        day: WEEKDAY_NAMES[d.getDay()],
      });
    }
    return result;
  }

  while (result.length < 7) {
    const dayName = WEEKDAY_NAMES[current.getDay()];
    if (selectedDays.includes(dayName)) {
      result.push({
        iso: current.toISOString().split("T")[0],
        date: current.getDate(),
        day: dayName,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function computeStreak(completedDates = [], habit) {
  if (!Array.isArray(completedDates) || completedDates.length === 0) return 0;
  return completedDates.length;
}

/* -------------------------
   Toggle complete for specific date (clickable calendar)
   ------------------------- */
function toggleDateCompletion(habitIndex, dateIso) {
  const habits = getHabits();
  if (!habits[habitIndex]) return;
  
  const habit = habits[habitIndex];
  let arr = Array.isArray(habit.completedDates) ? [...habit.completedDates] : [];
  
  const already = arr.some(d => d.split("T")[0] === dateIso);
  
  if (already) {
    // Remove the date (green to inactive/red)
    arr = arr.filter(d => d.split("T")[0] !== dateIso);
    habits[habitIndex].completedDates = arr;
    saveHabits(habits);
    renderFilteredHabits();
    showToast("Date unmarked");
  } else {
    // Add the date (red/inactive to green)
    arr.push(dateIso);
    habits[habitIndex].completedDates = Array.from(new Set(arr.map(d => d.split("T")[0]))).sort((a, b) => new Date(b) - new Date(a));
    saveHabits(habits);
    renderFilteredHabits();
    showToast("Date marked complete!");
  }
}

/* -------------------------
   Mark Complete - marks all past and today dates up to today
   ------------------------- */
function markCompleteUpToToday(habitIndex) {
  const habits = getHabits();
  if (!habits[habitIndex]) return;
  
  const habit = habits[habitIndex];
  const todayIso = new Date().toISOString().split("T")[0];
  const creationDate = new Date(habit.createdAt || new Date());
  const selectedDays = (habit.selectedDays || []).map(s => String(s).toLowerCase());
  const freqLower = String(habit.frequency || "").toLowerCase();
  
  let arr = Array.isArray(habit.completedDates) ? [...habit.completedDates] : [];
  
  // Get all dates from creation to today
  const datesToMark = [];
  let current = new Date(creationDate);
  const today = new Date(todayIso + "T00:00:00");
  
  while (current <= today) {
    const currentIso = current.toISOString().split("T")[0];
    const dayName = WEEKDAY_NAMES[current.getDay()];
    
    // Check if this date should be marked based on frequency
    let shouldMark = false;
    if (freqLower === "daily") {
      shouldMark = true;
    } else if (freqLower === "weekly" || freqLower === "custom") {
      shouldMark = selectedDays.includes(dayName);
    }
    
    if (shouldMark) {
      datesToMark.push(currentIso);
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  // Add all dates to completed
  datesToMark.forEach(dateIso => {
    if (!arr.some(d => d.split("T")[0] === dateIso)) {
      arr.push(dateIso);
    }
  });
  
  habits[habitIndex].completedDates = Array.from(new Set(arr.map(d => d.split("T")[0]))).sort((a, b) => new Date(b) - new Date(a));
  saveHabits(habits);
  renderFilteredHabits();
  showToast("All dates up to today marked complete!");
}

/* -------------------------
   Render single habit card (with clickable calendar - NO CHANGES)
   ------------------------- */
function renderHabitCard(habit, originalIndex) {
  const card = document.createElement("div");
  card.classList.add("habit-card");

  const highlightColor = getHighlightColorForHabit(habit);

  if (highlightColor) {
    card.style.border = `3px solid ${highlightColor}`;
    card.style.boxShadow = `0 0 10px ${highlightColor}40`;
  }

  const creationDate = new Date(habit.createdAt || new Date());
  const selectedDays = (habit.selectedDays || []).map(s => String(s).toLowerCase());

  let next7;
  if ((habit.frequency || "").toLowerCase() === "daily") {
    next7 = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(creationDate);
      d.setDate(d.getDate() + i);
      next7.push({
        iso: d.toISOString().split("T")[0],
        date: d.getDate(),
        day: WEEKDAY_NAMES[d.getDay()],
      });
    }
  } else {
    next7 = getNext7Occurrences(creationDate, selectedDays);
  }

  const streak = computeStreak(habit.completedDates || [], habit);
  const todayIso = new Date().toISOString().split("T")[0];

  const daysHtml = next7
    .map(d => {
      const thisDayCompleted = (habit.completedDates || []).some(cd => cd.split("T")[0] === d.iso);
      let inlineStyle = "";

      const today = new Date();
      const dayDate = new Date(d.iso + "T00:00:00");
      const todayStart = new Date(today.toISOString().split("T")[0] + "T00:00:00");

      // ALL dates are clickable now
      if (thisDayCompleted) {
        // Completed - green
        inlineStyle = 'background:#2e8b57;color:#fff;cursor:pointer;';
      } else if (dayDate <= todayStart) {
        // Past or today, not completed - red
        inlineStyle = 'background:#ff4c4c;color:#fff;cursor:pointer;';
      } else {
        // Future date, not completed - inactive (gray)
        inlineStyle = 'background:#e0e0e0;color:#666;cursor:pointer;';
      }

      return `<div class="day-box clickable-day" data-date="${d.iso}" style="${inlineStyle}"><span class="date">${d.date}</span><span class="day">${d.day.slice(0,3).toUpperCase()}</span></div>`;
    })
    .join("");

  card.innerHTML = `
    <div class="habit-header">
      <div>
        <h4>${escapeHtml(habit.name)}</h4>
        <p>${escapeHtml(habit.desc || "No description provided.")}</p>
      </div>
      <div class="habit-actions">
        <img src="./assets/edit.svg" class="edit icon-svg" title="Edit Task" alt="Edit">
        <img src="./assets/delete.svg" class="delete icon-svg" title="Delete Task" alt="Delete">
        <button class="mark-complete" style="margin-left:12px;">
          Mark Complete
        </button>
      </div>
    </div>

    <div class="habit-meta">
      <span class="freq"><i class="fa-regular fa-calendar"></i> ${escapeHtml(habit.frequency)}</span>
      <span class="streak"><i class="fa-solid fa-fire"></i> ${streak} day streak</span>
      <p class="last7">Next 7 occurrences</p>
    </div>

    <div class="habit-days">
      ${daysHtml}
    </div>
  `;

  const deleteBtn = card.querySelector(".delete");
  const editBtn = card.querySelector(".edit");
  const markBtn = card.querySelector(".mark-complete");

  deleteBtn && deleteBtn.addEventListener("click", () => openDeleteModal(originalIndex));
  editBtn && editBtn.addEventListener("click", () => openEditHabitModal(originalIndex));
  
  // Mark complete button - always enabled for all frequencies
  markBtn && markBtn.addEventListener("click", () => {
    markCompleteUpToToday(originalIndex);
  });

  // Add click listeners to ALL day boxes (all are clickable now)
  const dayBoxes = card.querySelectorAll(".day-box.clickable-day");
  dayBoxes.forEach(box => {
    box.addEventListener("click", () => {
      const dateIso = box.getAttribute("data-date");
      if (dateIso) {
        toggleDateCompletion(originalIndex, dateIso);
      }
    });
  });

  habitsContainer.appendChild(card);
}

/* -------------------------
   Helper: escape HTML
   ------------------------- */
function escapeHtml(txt) {
  if (txt === null || txt === undefined) return "";
  return String(txt).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* -------------------------
   Search / Filter / Sort
   ------------------------- */
function normalizeFrequencyLabel(label) {
  if (!label) return "all";
  const t = String(label).trim().toLowerCase();
  if (t.includes("daily")) return "daily";
  if (t.includes("weekly")) return "weekly";
  if (t.includes("custom")) return "custom";
  return "all";
}

function parseSortMode(raw) {
  if (!raw) return "streak";
  const t = String(raw).trim().toLowerCase();
  if (t.includes("streak")) return "streak";
  if (t.includes("created")) return "created";
  if (t.includes("asc")) return "asc";
  if (t.includes("desc")) return "desc";
  return "streak";
}

function renderFilteredHabits() {
  const all = getHabits();
  let list = all.map((h, idx) => ({ h, idx }));

  const searchVal = uiSearchInput ? (uiSearchInput.value || "").trim().toLowerCase() : "";
  if (searchVal) {
    list = list.filter(({ h }) => (h.name || "").toLowerCase().includes(searchVal) || (h.desc || "").toLowerCase().includes(searchVal));
  }

  const freqRaw = uiFilterSelect ? (uiFilterSelect.value || uiFilterSelect.innerText) : "All Frequency";
  const freq = normalizeFrequencyLabel(freqRaw);
  if (freq !== "all") list = list.filter(({ h }) => (h.frequency || "").toLowerCase() === freq);

  const sortRaw = uiSortSelect ? (uiSortSelect.value || uiSortSelect.innerText) : "Streak";
  const sortMode = parseSortMode(sortRaw);

  if (sortMode === "streak") list.sort((a, b) => computeStreak(b.h.completedDates || [], b.h) - computeStreak(a.h.completedDates || [], a.h));
  else if (sortMode === "created") list.sort((a, b) => new Date(b.h.createdAt) - new Date(a.h.createdAt));
  else if (sortMode === "asc") list.sort((a, b) => (a.h.name || "").localeCompare(b.h.name || ""));
  else if (sortMode === "desc") list.sort((a, b) => (b.h.name || "").localeCompare(a.h.name || ""));

  habitsContainer.innerHTML = "";
  list.forEach(item => renderHabitCard(item.h, item.idx));
  updateEmptyState();
  
  // Update dashboard stats every time we render (to catch existing data)
  updateDashboardStats(all);
}

/* -------------------------
   Wire search/filter/sort events
   ------------------------- */
if (uiSearchInput) uiSearchInput.addEventListener("input", renderFilteredHabits);
if (uiFilterSelect) uiFilterSelect.addEventListener("change", renderFilteredHabits);
if (uiSortSelect) uiSortSelect.addEventListener("change", renderFilteredHabits);

/* -------------------------
   Add Habit logic
   ------------------------- */
if (habitForm) {
  habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = habitForm.querySelector("input[type='text']").value.trim();
    const desc = habitForm.querySelector("textarea").value.trim();
    const frequency = habitForm.querySelector("#frequencySelect").value;
    const checkedDays = Array.from(daySelect.querySelectorAll('input[type="checkbox"]:checked'))
      .filter(cb => cb.id !== "selectAll")
      .map(cb => cb.value.toLowerCase());

    if (!name || !frequency) {
      alert("Please fill all required fields!");
      return;
    }

    const habit = { name, desc, frequency, selectedDays: checkedDays, createdAt: new Date().toISOString(), completedDates: [] };
    const habits = getHabits();
    habits.push(habit);
    saveHabits(habits);

    renderFilteredHabits();
    modalOverlay.style.display = "none";
    habitForm.reset();
    daySelect.classList.add("hidden");

    showToast("Your habit has been saved successfully!");
  });
}

/* -------------------------
   Edit Habit logic
   ------------------------- */
function openEditHabitModal(originalIndex) {
  const habits = getHabits();
  const habit = habits[originalIndex];
  editIndex = originalIndex;
  if (!editModalOverlay) return;
  editModalOverlay.style.display = "flex";

  const titleEl = document.getElementById("editHabitTitle");
  if (titleEl) titleEl.textContent = "Edit Habit";

  editHabitForm.querySelector("input[type='text']").value = habit.name;
  editHabitForm.querySelector("textarea").value = habit.desc || "";
  const sel = editHabitForm.querySelector("#editFrequencySelect");
  if (sel) sel.value = habit.frequency || "";
}

if (editHabitForm) {
  editHabitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (editIndex === null || editIndex === undefined) return;

    const name = editHabitForm.querySelector("input[type='text']").value.trim();
    const desc = editHabitForm.querySelector("textarea").value.trim();
    const frequency = editHabitForm.querySelector("#editFrequencySelect").value;

    if (!name || !frequency) {
      alert("Please fill all required fields!");
      return;
    }

    const habits = getHabits();
    const existing = habits[editIndex] || {};
    habits[editIndex] = { ...existing, name, desc, frequency };
    saveHabits(habits);
    renderFilteredHabits();
    editModalOverlay.style.display = "none";
    editIndex = null;

    showToast("All set! your changes have been saved successfully!");
  });
}

/* -------------------------
   Delete confirmation logic
   ------------------------- */
function openDeleteModal(index) {
  habitToDelete = index;
  deleteMessage.innerHTML = `Are you sure you want to delete the <strong>${escapeHtml(getHabits()[index]?.name || "")}</strong>?`;
  if (deleteModalOverlay) deleteModalOverlay.style.display = "flex";
}
function closeDeleteModalFunc() {
  if (deleteModalOverlay) deleteModalOverlay.style.display = "none";
  habitToDelete = null;
}
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModalFunc);
if (closeDeleteModal) closeDeleteModal.addEventListener("click", closeDeleteModalFunc);
if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", () => {
  if (habitToDelete !== null && habitToDelete !== undefined) {
    const habits = getHabits();
    habits.splice(habitToDelete, 1);
    saveHabits(habits);
    renderFilteredHabits();
    showToast("Done! your habit has been removed");
  }
  closeDeleteModalFunc();
});

/* -------------------------
   Theme Toggle
   ------------------------- */
const themeToggle = document.getElementById("themeToggle");

if (themeToggle) {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.innerHTML = '<img src="./assets/sun.png" alt="Light Mode" style="width: 24px; height: 24px; background: none;">';
  } else {
    themeToggle.innerHTML = '<img src="./assets/moon.svg" alt="Dark Mode" style="width: 24px; height: 24px; background: none;">';
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("theme", "dark");
      themeToggle.innerHTML = '<img src="./assets/sun.png" alt="Light Mode" style="width: 24px; height: 24px; background: none;">';
    } else {
      localStorage.setItem("theme", "light");
      themeToggle.innerHTML = '<img src="./assets/moon.svg" alt="Dark Mode" style="width: 24px; height: 24px; background: none;">';
    }
  });
}

/* -------------------------
   Clear Filter Button
   ------------------------- */
const clearFilterBtn = document.querySelector('[data-clear-filter]');
if (clearFilterBtn) {
  clearFilterBtn.addEventListener('click', () => {
    if (uiSearchInput) {
      uiSearchInput.value = '';
    }
    
    if (uiFilterSelect) {
      uiFilterSelect.selectedIndex = 0;
    }
    
    if (uiSortSelect) {
      uiSortSelect.selectedIndex = 0;
    }
    
    renderFilteredHabits();
  });
}

/* -------------------------
   On load: render habits & update dashboard stats
   ------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  console.log('🚀 DOM Content Loaded');
  console.log('Habits Container:', habitsContainer);
  console.log('Saved Habits:', getHabits());
  
  try {
    renderFilteredHabits();
    localStorage.setItem("habitsSyncTrigger", Date.now().toString());
    
    // Update dashboard stats on load
    const habits = getHabits();
    updateDashboardStats(habits);
    
    console.log('✅ Initial render complete');
  } catch (error) {
    console.error('❌ Error during initial render:', error);
  }
});

/* -------------------------
   Listen for storage events (including rule updates)
   ------------------------- */
window.addEventListener("storage", (e) => {
  if (!e.key || e.key === "habits" || e.key === "habitsSyncTrigger" || e.key === "rules") {
    console.log('📦 Storage event detected, re-rendering');
    renderFilteredHabits();
  }
});

// Also listen for same-window storage updates (when rules are toggled on the rules page)
let lastRulesUpdate = localStorage.getItem("rules");
setInterval(() => {
  const currentRules = localStorage.getItem("rules");
  if (currentRules !== lastRulesUpdate) {
    lastRulesUpdate = currentRules;
    console.log('🔄 Rules changed, re-rendering habits');
    renderFilteredHabits();
  }
}, 500);

// Error handler
window.addEventListener('error', (e) => {
  console.error('💥 Global error:', e.error);
});