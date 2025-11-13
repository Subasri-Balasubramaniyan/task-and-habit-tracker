// === Select Elements ===
const addRuleBtn = document.getElementById("addRuleBtn");
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const addConditionBtn = document.getElementById("addConditionBtn");
const conditionsContainer = document.getElementById("conditionsContainer");
const ruleForm = document.getElementById("ruleForm");
const applyToDropdown = document.getElementById("applyToDropdown");
const logicDropdown = document.getElementById("logicDropdown");
const rulesSection = document.querySelector(".rules-section");
const modalHeaderTitle = document.querySelector(".modal-header h3");
const ruleSearchInput = document.querySelector(".search-box input");

// === State ===
let isEditing = false;
let editingRuleName = null;
let deleteModalOverlay = null;
let deleteTargetRule = null;

// === Show & Hide Modal ===
addRuleBtn.addEventListener("click", () => {
  isEditing = false;
  editingRuleName = null;
  modalHeaderTitle.textContent = "Add Rule";
  ruleForm.reset();
  modalOverlay.style.display = "flex";
});

closeModal.addEventListener("click", () => {
  modalOverlay.style.display = "none";
});

cancelBtn.addEventListener("click", () => {
  modalOverlay.style.display = "none";
});

// === Create Condition Row ===
function createConditionRow(type = "Task") {
  const conditionRow = document.createElement("div");
  conditionRow.classList.add("condition-row");

  const firstSelect = document.createElement("select");
  if (type === "Task") {
    firstSelect.innerHTML = `
      <option>Priority</option>
      <option>Status</option>
      <option>Due date</option>
    `;
  } else {
    firstSelect.innerHTML = `
      <option>Frequency</option>
      <option>Streak</option>
    `;
  }

  const secondSelect = document.createElement("select");
  secondSelect.innerHTML = `
    <option>equals to</option>
    <option>not equal to</option>
    <option>less than</option>
    <option>greater than</option>
  `;

  // Changed from <i> to <img> for delete icon
  const deleteIcon = document.createElement("img");
  deleteIcon.src = "./assets/delete.svg";
  deleteIcon.className = "delete-icon";
  deleteIcon.style.width = "20px";
  deleteIcon.style.height = "20px";
  deleteIcon.style.cursor = "pointer";
  deleteIcon.style.display = "none";
  deleteIcon.addEventListener("click", () => {
    conditionRow.remove();
    toggleDeleteIcons();
  });

  let thirdField = document.createElement("select");

  function updateThirdField() {
    const firstValue = firstSelect.value;
    const currentThird = conditionRow.querySelector(".third-field");
    const currentIcon = conditionRow.querySelector(".delete-icon");
    if (currentThird) currentThird.remove();
    if (currentIcon) currentIcon.remove();

    if (type === "Task") {
      thirdField = document.createElement("select");
      thirdField.classList.add("third-field");

      if (firstValue === "Priority") {
        thirdField.innerHTML = `
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        `;
      } else if (firstValue === "Status") {
        thirdField.innerHTML = `
          <option>Todo</option>
          <option>In Progress</option>
          <option>Completed</option>
        `;
      } else if (firstValue === "Due date") {
        thirdField.innerHTML = `
          <option>Yesterday</option>
          <option>Today</option>
          <option>Tomorrow</option>
        `;
      }

      conditionRow.appendChild(thirdField);
      conditionRow.appendChild(deleteIcon);
    } else if (type === "Habit") {
      if (firstValue === "Frequency") {
        thirdField = document.createElement("select");
        thirdField.classList.add("third-field");
        thirdField.innerHTML = `
          <option>Daily</option>
          <option>Weekly</option>
          <option>Custom</option>
        `;
        conditionRow.appendChild(thirdField);
        conditionRow.appendChild(deleteIcon);
      } else if (firstValue === "Streak") {
        thirdField = document.createElement("input");
        thirdField.type = "number";
        thirdField.placeholder = "Days";
        thirdField.classList.add("third-field");
        thirdField.style.width = "100px";
        conditionRow.appendChild(thirdField);
        conditionRow.appendChild(deleteIcon);
      }
    }
  }

  updateThirdField();
  firstSelect.addEventListener("change", updateThirdField);

  conditionRow.append(firstSelect, secondSelect);
  conditionRow.appendChild(thirdField);
  conditionRow.appendChild(deleteIcon);

  return conditionRow;
}

// === Add Condition ===
addConditionBtn.addEventListener("click", () => {
  const type = applyToDropdown.value === "Habit" ? "Habit" : "Task";
  const newCondition = createConditionRow(type);
  conditionsContainer.appendChild(newCondition);
  toggleDeleteIcons();
});

// === Delete Icon Visibility ===
function toggleDeleteIcons() {
  const allRows = document.querySelectorAll(".condition-row");
  allRows.forEach((row) => {
    const icon = row.querySelector(".delete-icon");
    icon.style.display = allRows.length > 1 ? "inline-block" : "none";
  });
}

// === Handle Apply To Change ===
applyToDropdown.addEventListener("change", () => {
  const type = applyToDropdown.value === "Habit" ? "Habit" : "Task";
  conditionsContainer.innerHTML = "";
  const firstRow = createConditionRow(type);
  conditionsContainer.appendChild(firstRow);
  toggleDeleteIcons();
});

// === Initialize Default Row ===
const firstRow = createConditionRow("Task");
conditionsContainer.innerHTML = "";
conditionsContainer.appendChild(firstRow);
toggleDeleteIcons();

// === Local Storage Helpers ===
function getSavedRules() {
  return JSON.parse(localStorage.getItem("rules")) || [];
}

function saveRulesToStorage(rules) {
  localStorage.setItem("rules", JSON.stringify(rules));
  console.log("Rules saved:", rules);
}

function saveRule(rule) {
  const rules = getSavedRules();
  rules.push(rule);
  saveRulesToStorage(rules);
}

function deleteRuleFromStorage(name) {
  const rules = getSavedRules().filter((rule) => rule.name !== name);
  saveRulesToStorage(rules);
}

function updateRuleInStorage(updatedRule) {
  const rules = getSavedRules().map((rule) =>
    rule.name === editingRuleName ? updatedRule : rule
  );
  saveRulesToStorage(rules);
}

// === Toggle Rule Active State ===
function toggleRuleActive(ruleName, isActive) {
  const rules = getSavedRules();
  const updatedRules = rules.map((rule) => {
    if (rule.name === ruleName) {
      return { ...rule, isActive: isActive };
    }
    return rule;
  });
  saveRulesToStorage(updatedRules);
  
  // Reapply rules to update tasks/habits
  if (typeof applyRulesToTasks === "function") {
    applyRulesToTasks();
    console.log("Rules applied to tasks");
  }
  if (typeof applyRulesToHabits === "function") {
    applyRulesToHabits();
    console.log("Rules applied to habits");
  }
  
  // Trigger storage event to update other pages
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'tasks',
    newValue: localStorage.getItem('tasks'),
    url: window.location.href,
    storageArea: localStorage
  }));
  
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'habits',
    newValue: localStorage.getItem('habits'),
    url: window.location.href,
    storageArea: localStorage
  }));
}

// === Delete Confirmation Modal ===
function createDeleteModal() {
  deleteModalOverlay = document.createElement("div");
  deleteModalOverlay.classList.add("delete-modal-overlay");
  deleteModalOverlay.innerHTML = `
    <div class="delete-modal">
      <div class="delete-header">
        <h3>Delete</h3>
        <span class="close-delete-modal">&times;</span>
      </div>
      <div class="delete-body">
        <p id="deleteMessage"></p>
      </div>
      <div class="delete-footer">
        <button class="cancel-delete">Cancel</button>
        <button class="confirm-delete">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(deleteModalOverlay);

  deleteModalOverlay
    .querySelector(".close-delete-modal")
    .addEventListener("click", closeDeleteModal);
  deleteModalOverlay
    .querySelector(".cancel-delete")
    .addEventListener("click", closeDeleteModal);
  deleteModalOverlay
    .querySelector(".confirm-delete")
    .addEventListener("click", confirmDeleteRule);
}

function openDeleteModal(rule) {
  if (!deleteModalOverlay) createDeleteModal();
  deleteTargetRule = rule;
  document.getElementById(
    "deleteMessage"
  ).innerHTML = `Are you sure you want to delete the <strong>${rule.name}</strong>?`;
  deleteModalOverlay.style.display = "flex";
}

function closeDeleteModal() {
  deleteModalOverlay.style.display = "none";
  deleteTargetRule = null;
}

function confirmDeleteRule() {
  if (deleteTargetRule) {
    deleteRuleFromStorage(deleteTargetRule.name);
    
    if (ruleSearchInput && ruleSearchInput.value.trim()) {
      performSearch(ruleSearchInput.value.trim());
    } else {
      displaySavedRules();
    }
    
    showToast("🗑️ Your item has been removed");
    
    // Reapply rules after deletion
    if (typeof applyRulesToTasks === "function") {
      applyRulesToTasks();
    }
    if (typeof applyRulesToHabits === "function") {
      applyRulesToHabits();
    }
  }
  closeDeleteModal();
}

// === Create Rule Card Helper ===
function createRuleCard(rule) {
  const ruleCard = document.createElement("div");
  ruleCard.classList.add("rule-card");
  
  // Check if rule is active (default to true if not set)
  const isActive = rule.isActive !== false;
  
  // Display logic type badge
  const logicBadge = rule.conditionType ? 
    `<span style="background:#e3f2fd; color:#1976d2; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:8px; font-weight:600;">${rule.conditionType}</span>` : '';
  
  ruleCard.innerHTML = `
    <div class="rule-info">
      <h4>${rule.name} 
        <span class="rule-tag ${rule.applyTo?.toLowerCase() || 'task'}">${rule.applyTo || 'Task'}</span>
        
      </h4>
      <p>${rule.description || ""}</p>
    </div>
    <div class="rule-actions">
      <button class="edit-btn"><img src="./assets/edit.svg"></button>
      <button class="delete-btn"><img src="./assets/delete.svg"></button>
      <label class="switch">
        <input type="checkbox" ${isActive ? 'checked' : ''}>
        <span class="slider"></span>
      </label>
    </div>
  `;

  const tag = ruleCard.querySelector(".rule-tag");
  tag.style.padding = "3px 10px";
  tag.style.borderRadius = "20px";
  tag.style.fontSize = "13px";
  tag.style.fontWeight = "600";
  tag.style.backgroundColor = rule.applyTo === "Task" ? "#f0f0f0" : "#e3f2fd";
  tag.style.color = "var(--text-color, #000)";
  tag.style.transition = "all 0.3s ease";

  if (document.body.classList.contains("dark-mode")) {
    tag.style.backgroundColor = rule.applyTo === "Task" ? "#333" : "#355C7D";
    tag.style.color = "#fff";
  }

  // FIXED: Correct button assignments
  ruleCard.querySelector(".edit-btn").addEventListener("click", () => {
    isEditing = true;
    editingRuleName = rule.name;
    modalHeaderTitle.textContent = "Edit Rule";
    modalOverlay.style.display = "flex";

    const inputs = ruleForm.querySelectorAll("input, textarea");
    inputs[0].value = rule.name;
    inputs[1].value = rule.description || "";
    
    applyToDropdown.value = rule.applyTo || "Task";
    
    if (logicDropdown && rule.conditionType) {
      logicDropdown.value = rule.conditionType;
    }
    
    const badgeInput = document.getElementById("badgeValue");
    if (badgeInput && rule.badge) {
      badgeInput.value = rule.badge;
    }
  });

  ruleCard.querySelector(".delete-btn").addEventListener("click", () => {
    openDeleteModal(rule);
  });

  // Add toggle event listener
  const toggleCheckbox = ruleCard.querySelector(".switch input[type='checkbox']");
  toggleCheckbox.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    toggleRuleActive(rule.name, isChecked);
  });

  return ruleCard;
}

// === Display Rules ===
function displaySavedRules() {
  rulesSection.innerHTML = "";
  const savedRules = getSavedRules();

  if (savedRules.length === 0) {
    rulesSection.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-sliders"></i>
        <p>No rules yet. Create automation rules to manage your tasks and habits</p>
      </div>`;
    return;
  }

  savedRules.forEach((rule) => {
    const ruleCard = createRuleCard(rule);
    rulesSection.appendChild(ruleCard);
  });
}

// === Handle Form Submit ===
ruleForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const ruleName = this.querySelector("input[type='text']").value.trim();
  const description = this.querySelector("textarea").value.trim();
  const applyTo = applyToDropdown.value;
  const conditionType = logicDropdown.value; // AND or OR
  const badgeValueInput = document.getElementById("badgeValue");
  const badgeValue = badgeValueInput ? badgeValueInput.value.trim() : "";
  
  if (!ruleName) {
    alert("Please enter a rule name");
    return;
  }
  
  // Collect all conditions
  const conditionRows = document.querySelectorAll(".condition-row");
  const conditions = Array.from(conditionRows).map((row) => {
    const [fieldEl, operatorEl, valueEl] = row.querySelectorAll("select, input");
    return {
      field: fieldEl ? fieldEl.value : "",
      operator: operatorEl ? operatorEl.value : "",
      value: valueEl ? valueEl.value : ""
    };
  });
  
  const newRule = { 
    name: ruleName, 
    description, 
    applyTo,
    conditionType,  // Captures AND/OR
    conditions,
    badge: badgeValue,
    isActive: true  // New rules are active by default
  };
  
  console.log("Rule created:", newRule);
  
  if (isEditing && editingRuleName) {
    // Preserve the active state when editing
    const existingRules = getSavedRules();
    const existingRule = existingRules.find(r => r.name === editingRuleName);
    if (existingRule && existingRule.isActive !== undefined) {
      newRule.isActive = existingRule.isActive;
    }
    
    updateRuleInStorage(newRule);
    isEditing = false;
    editingRuleName = null;
    showToast("✅ All set! Your changes have been saved successfully!");
  } else {
    saveRule(newRule);
    showToast("✅ Your rule has been saved successfully!");
  }

  modalOverlay.style.display = "none";
  this.reset();
  
  if (ruleSearchInput) {
    ruleSearchInput.value = "";
  }
  displaySavedRules();
  
  // Apply to tasks/habits immediately
  if (applyTo === "Task" && typeof applyRulesToTasks === "function") {
    applyRulesToTasks();
  }
  if (applyTo === "Habit" && typeof applyRulesToHabits === "function") {
    applyRulesToHabits();
  }
});

// === Rules Search ===
function performSearch(query) {
  const q = query.toLowerCase();
  const savedRules = getSavedRules();
  
  const filteredRules = savedRules.filter(rule => {
    const name = rule.name.toLowerCase();
    const desc = (rule.description || "").toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  rulesSection.innerHTML = "";

  if (filteredRules.length === 0) {
    rulesSection.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-sliders"></i>
        <p>No matching rules found</p>
      </div>`;
    return;
  }

  filteredRules.forEach((rule) => {
    const ruleCard = createRuleCard(rule);
    rulesSection.appendChild(ruleCard);
  });
}

if (ruleSearchInput) {
  ruleSearchInput.addEventListener("input", () => {
    const q = ruleSearchInput.value.trim();
    if (q === "") {
      displaySavedRules();
      return;
    }
    performSearch(q);
  });
}

// === Theme Toggle ===
const themeToggle = document.getElementById("themeToggle");
const body = document.body;

if (themeToggle) {
  // Set initial theme and icon based on localStorage
  if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark-mode");
    themeToggle.innerHTML = '<img src="./assets/sun.png" alt="Light Mode" style="width: 24px; height: 24px; background: none;">';
  } else {
    themeToggle.innerHTML = '<img src="./assets/moon.svg" alt="Dark Mode" style="width: 24px; height: 24px; background: none;">';
  }

  // Toggle theme on click
  themeToggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    
    if (body.classList.contains("dark-mode")) {
      // Switch to dark mode - show sun icon
      themeToggle.innerHTML = '<img src="./assets/sun.png" alt="Light Mode" style="width: 24px; height: 24px; background: none;">';
      localStorage.setItem("theme", "dark");
    } else {
      // Switch to light mode - show moon icon
      themeToggle.innerHTML = '<img src="./assets/moon.svg" alt="Dark Mode" style="width: 24px; height: 24px; background: none;">';
      localStorage.setItem("theme", "light");
    }
    
    // Refresh rules display if search is active
    if (typeof ruleSearchInput !== 'undefined' && ruleSearchInput && ruleSearchInput.value.trim()) {
      performSearch(ruleSearchInput.value.trim());
    } else if (typeof displaySavedRules === 'function') {
      displaySavedRules();
    }
  });
}

// === Toast Notification ===
function showToast(message = "Your rule has been saved successfully!") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.style.position = "fixed";
    toastContainer.style.top = "20px";
    toastContainer.style.right = "20px";
    toastContainer.style.zIndex = "9999";
    document.body.appendChild(toastContainer);
  }

  const isDark = document.body.classList.contains("dark-mode");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.background = isDark ? "#2e7d32" : "#e2f4ea";
  toast.style.color = isDark ? "#fff" : "#000";
  toast.style.borderLeft = isDark ? "6px solid #66bb6a" : "6px solid #37b37e";
  toast.style.padding = "12px 45px 12px 15px";
  toast.style.marginBottom = "10px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.justifyContent = "flex-start";
  toast.style.position = "relative";
  toast.style.fontSize = "15px";
  toast.style.fontWeight = "500";
  toast.style.minWidth = "320px";

  toast.innerHTML = `
    <span style="flex:1;">${message}</span>
    <span class="close-btn" 
          style="
            position:absolute;
            right:14px;
            top:50%;
            transform:translateY(-50%);
            cursor:pointer;
            font-size:18px;
            color:${isDark ? "#fff" : "#333"};
            line-height:1;
          ">&times;</span>
  `;

  toast.querySelector(".close-btn").addEventListener("click", () => toast.remove());
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// === Dark Mode Restore ===
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }
});

// === Dark Mode Toggle (Alternative) ===
const darkModeToggle = document.getElementById("darkModeToggle");
if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("darkMode", "enabled");
    } else {
      localStorage.setItem("darkMode", "disabled");
    }
  });
}

// === On Page Load ===
displaySavedRules();