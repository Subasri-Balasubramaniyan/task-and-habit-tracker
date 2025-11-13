// === Select elements ===
const addTaskBtn = document.getElementById("addTaskBtn");
const modalOverlay = document.getElementById("modalOverlay");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const rulesData = JSON.parse(localStorage.getItem("rules")) || [];
console.log("Rules fetched", rulesData);

// === Filter & Sort selectors ===
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const sortBy = document.getElementById("sortBy");

let editTaskId = null; // Track task being edited

// === Toast Notification Function ===
// === Toast Notification Function ===
function showToast(message, type = "success") {
  // Remove any existing toasts first
  const existingToast = document.querySelector(".toast-notification");
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === "success" ? "#D4F4DD" : type === "error" ? "#FEE2E2" : "#DBEAFE"};
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    min-width: 400px;
    max-width: 500px;
  `;

  // Set icon based on type
  let icon = "";
  if (type === "success") {
    icon = '<div style="width: 48px; height: 48px; background: #22C55E; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>';
  } else if (type === "error") {
    icon = '<div style="width: 48px; height: 48px; background: #EF4444; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="white" stroke-width="3" stroke-linecap="round"/></svg></div>';
  } else if (type === "info") {
    icon = '<div style="width: 48px; height: 48px; background: #3B82F6; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="1.5" fill="white"/><path d="M12 8V12" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg></div>';
  }

  toast.innerHTML = `
    ${icon}
    <span style="flex: 1; color: #1F2937; font-size: 15px; font-weight: 400; line-height: 1.5;">${message}</span>
    <button style="background: none; border: none; cursor: pointer; padding: 4px; color: #6B7280; font-size: 24px; line-height: 1; font-weight: 300;" onclick="this.parentElement.remove()">×</button>
  `;

  // Add animation keyframes if not already present
  if (!document.getElementById("toast-animations")) {
    const style = document.createElement("style");
    style.id = "toast-animations";
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
      .toast-notification.hiding {
        animation: slideOut 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
// === Apply Rules to Tasks (Updated with AND/OR support) ===

function getDateFromRelativeTerm(term) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const termLower = term?.toLowerCase().trim();
  
  switch (termLower) {
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return formatDate(yesterday);
    
    case 'today':
      return formatDate(today);
    
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return formatDate(tomorrow);
    
    default:
      return term;
  }
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(dateValue) {
  if (!dateValue) {
    return null;
  }
  
  const dateStr = String(dateValue).trim();
  
  // Check if it's a relative term
  const lowerDate = dateStr.toLowerCase();
  if (lowerDate === 'yesterday' || lowerDate === 'today' || lowerDate === 'tomorrow') {
    return getDateFromRelativeTerm(dateStr);
  }
  
  // Check if already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try to parse as actual date
  const date = new Date(dateStr);
  
  // Check if valid date
  if (isNaN(date.getTime())) {
    return null;
  }
  
  // Return in YYYY-MM-DD format
  return formatDate(date);
}

function checkCondition(task, condition) {
  const fieldLower = condition.field?.toLowerCase().replace(/\s+/g, '');
  const conditionValue = condition.value?.trim();
  
  // Map text operators to symbols
  let operator = condition.operator || 'equals to';
  const operatorMap = {
    'equals to': '=',
    'not equal to': '!=',
    'less than': '<',
    'greater than': '>',
    'less than or equal to': '<=',
    'greater than or equal to': '>='
  };
  
  const operatorLower = operator.toLowerCase();
  operator = operatorMap[operatorLower] || operator;
  
  // Try to get the task value using multiple possible field names
  let taskValue;
  
  // Check if it's a date field (handles "Due date", "duedate", "due_date", etc.)
  if (fieldLower === 'duedate' || fieldLower === 'due_date' || fieldLower === 'due') {
    taskValue = task.dueDate || task.duedate || task.due_date || task.due || task['Due date'] || task['due date'];
  } 
  // Check if it's priority field
  else if (fieldLower === 'priority') {
    taskValue = task.priority || task.Priority || task.PRIORITY;
  }
  // Check if it's status field
  else if (fieldLower === 'status') {
    taskValue = task.status || task.Status || task.STATUS;
  }
  // For other fields, try exact match first, then variations
  else {
    taskValue = task[condition.field] || task[fieldLower] || task[condition.field.toLowerCase()];
  }
  
  // Handle null/undefined
  if (taskValue === undefined || taskValue === null) {
    return false;
  }
  
  if (conditionValue === undefined || conditionValue === null) {
    return false;
  }
  
  // Special handling for date fields
  if (fieldLower === 'duedate' || fieldLower === 'due_date' || fieldLower === 'due') {
    // Normalize both dates for making comparisons
    const normalizedTaskDate = normalizeDate(taskValue);
    const normalizedConditionDate = normalizeDate(conditionValue);
    
    // Both must be valid for comparison
    if (!normalizedTaskDate || !normalizedConditionDate) {
      return false;
    }
    
    // Compare dates based on operator
    switch (operator) {
      case '<':
        return normalizedTaskDate < normalizedConditionDate;
      case '<=':
        return normalizedTaskDate <= normalizedConditionDate;
      case '>':
        return normalizedTaskDate > normalizedConditionDate;
      case '>=':
        return normalizedTaskDate >= normalizedConditionDate;
      case '=':
      case '==':
      default:
        return normalizedTaskDate === normalizedConditionDate;
    }
  }
  
  // For other fields, use case-insensitive string comparison
  const taskValueStr = String(taskValue).toLowerCase().trim();
  const conditionValueStr = String(conditionValue).toLowerCase().trim();
  
  return taskValueStr === conditionValueStr;
}

function evaluateConditions(task, conditions, logic) {
  switch (logic) {
    case "AND":
      return conditions.every(cond => checkCondition(task, cond));
    
    case "OR":
      return conditions.some(cond => checkCondition(task, cond));
    
    default:
      return conditions.every(cond => checkCondition(task, cond));
  }
}

function applyRulesToTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const rules = JSON.parse(localStorage.getItem("rules")) || [];
  
  tasks.forEach((task) => {
    task.ruleBadge = null;
    
    rules.forEach((rule) => {
      // Skip if rule is not active (check isActive property, default to true if not set)
      if (rule.isActive === false) {
        return;
      }
      
      if (rule.applyTo !== "Task") {
        return;
      }
      
      if (!rule.conditions || rule.conditions.length === 0) {
        return;
      }
      // Checks which operators is used beacuse different rules stored their logical operator under different property names
      const logic = (
        rule.conditionType || rule.logic || rule.conditionLogic || 
        rule.logicOperator || rule.operator || rule.matchType || 
        rule.match || "AND"
      ).toUpperCase();
      
      const conditionMet = evaluateConditions(task, rule.conditions, logic);
      
      if (conditionMet) {
        task.ruleBadge = rule.badge;
      }
    });
  });
  
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Test function to debug a specific task and rule
function debugTaskRule(taskIndex, ruleIndex) {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const rules = JSON.parse(localStorage.getItem("rules")) || [];
  
  const task = tasks[taskIndex];
  const rule = rules[ruleIndex];
  
  if (!task) {
    console.error(`Task at index ${taskIndex} not found`);
    return;
  }
  
  if (!rule) {
    console.error(`Rule at index ${ruleIndex} not found`);
    return;
  }
  
  console.log("🔬 DEBUG MODE");
  console.log("Task:", task);
  console.log("Rule:", rule);
  
  const logic = (rule.conditionType || rule.logic || "AND").toUpperCase();
  const result = evaluateConditions(task, rule.conditions, logic);
  
  console.log("\nFinal result:", result);
}

// === Listen for storage changes from Rules page ===
window.addEventListener('storage', (e) => {
  if (e.key === 'tasks' || e.key === 'rules') {
    console.log('Storage changed, reloading tasks...');
    loadTasks();
  }
});

// === Show modal (for Add) ===
addTaskBtn.addEventListener("click", () => {
  editTaskId = null; // reset edit mode
  modalOverlay.style.display = "flex";
  document.getElementById("modalTitle").textContent = "Add task";
  taskForm.reset();
});

// === Close modal ===
closeModal.addEventListener("click", closeModalForm);
cancelBtn.addEventListener("click", closeModalForm);

function closeModalForm() {
  modalOverlay.style.display = "none";
  taskForm.reset();
  editTaskId = null;
}

// === Load tasks from localStorage ===
document.addEventListener("DOMContentLoaded", loadTasks);

function loadTasks() {
  applyRulesToTasks(); // Apply rules before rendering
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  renderTasks(tasks);
}

// === Save or Update Task ===
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("taskTitle").value.trim();
  const desc = document.getElementById("taskDesc").value.trim();
  const due = document.getElementById("taskDue").value;
  const priority = document.getElementById("taskPriority").value;
  const status = document.getElementById("taskStatus").value;

  if (!title || !priority || !due) {
    showToast("Please fill in all required fields.", "error");
    return;
  }

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  if (editTaskId) {
    // === Update existing task ===
    const index = tasks.findIndex((t) => t.id === editTaskId);
    if (index !== -1) {
      tasks[index].title = title;
      tasks[index].desc = desc;
      tasks[index].due = due;
      tasks[index].priority = priority;
      tasks[index].status = status;
    }
    editTaskId = null;
    showToast("All set! Your changes have been saved successfully!", "success");
  } else {
    // === Add new task ===
    const task = {
      id: Date.now(),
      title,
      desc,
      due,
      priority,
      status,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
    showToast("Success! Your task has been created.", "success");
  }

  localStorage.setItem("tasks", JSON.stringify(tasks));
  window.dispatchEvent(new Event("storage"));
  applyRulesToTasks(); // Apply rules after saving
  renderTasks(tasks);
  
  closeModalForm();
});

// Render tasks
function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-clipboard"></i>
        <p>No tasks found. Create your first task to get started!</p>
      </div>
    `;
    return;
  }

  tasks.forEach((task, index) => {
    const taskCard = document.createElement("div");
    taskCard.classList.add("task-card");

    // === Priority flag SVG and background colors (Updated) ===
  let priorityBg = "";
let flagColor = "";
let priorityTextColor = "";

if (task.priority === "High") {
  priorityBg = "#D4183D";
  flagColor = "#FFFFFF";
  priorityTextColor = "#FFFFFF";
} else if (task.priority === "Medium") {
  priorityBg = "#D78905";
  flagColor = "#FFFFFF";
  priorityTextColor = "#FFFFFF";
} else {
  priorityBg = "#3B82F6";
  flagColor = "#FFFFFF";
  priorityTextColor = "#FFFFFF";
}
    
    console.log("Rule badge", task);
    
    const badgeHTML = task.ruleBadge
      ? `<span class="task-badge" style="
          background:lightgrey;
          color:black;
          padding:3px 8px;
          border-radius:8px;
          font-size:12px;
          font-weight:600;
          margin-left:6px;
        ">${task.ruleBadge}</span>`
      : "";

   taskCard.innerHTML = `
      <div class="task-header">
       <span class="drag-icon"><i class="fa-solid fa-grip-vertical"></i></span>
        <h3 class="task-title" style="margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${task.status === 'Completed' ? 'text-decoration: line-through; color: gray; opacity: 0.7;' : ''}">
      ${task.title}
</h3>

        <div class="task-actions">
          <img src="./assets/up.svg" class="move-up icon-svg" title="Move Up" alt="Move Up">
          <img src="./assets/down.svg" class="move-down icon-svg" title="Move Down" alt="Move Down">
          <img src="./assets/edit.svg" class="edit icon-svg" title="Edit Task" alt="Edit">
          <img src="./assets/delete.svg" class="delete icon-svg" title="Delete Task" alt="Delete">
        </div>
      </div>

      <p class="desc" style="margin-top: 0; padding-top: 0;">${task.desc || ""}</p>

      <div class="task-meta">
        <span class="priority" style="background:${priorityBg}; padding: 6px 12px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
          <img src="./assets/flag.svg" alt="flag" style="width: 16px; height: 16px; filter: brightness(0) saturate(100%) opacity(1); color: ${flagColor};" />
          <span style="color: ${priorityTextColor}; font-weight: 500; font-size: 14px;">${task.priority}</span>
        </span>
        <span class="due" style="display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-regular fa-calendar"></i> ${task.due}
          ${badgeHTML}
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
        <span style="color: #666; font-size: 14px; font-weight: 500;">Status</span>
        <select class="status-dropdown">
          <option ${task.status === "Todo" ? "selected" : ""}>Todo</option>
          <option ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option ${task.status === "Completed" ? "selected" : ""}>Completed</option>
        </select>
      </div>

      <div class="subtasks-container">
        <div class="subtask-header">
          <i class="fa-solid fa-chevron-right toggle-subtasks"></i>
          <span>Subtasks (${task.subtasks.length})</span>
        </div>

        <div class="subtasks-content" style="display:none;">
          <ul class="subtask-list">
            ${
              task.subtasks.length
                ? task.subtasks
                    .map(
                      (s, i) => `
                <li style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <input type="checkbox" ${s.done ? "checked" : ""} data-index="${i}" data-id="${task.id}">
                    <span class="${s.done ? "done" : ""}" style="${s.done ? "text-decoration:line-through; color:gray;" : ""}">
                      ${s.text}
                    </span>
                  </div>
                  <div class="subtask-actions" style="display:flex; gap:10px;">
                    <img src="./assets/edit.svg" class="edit-subtask icon-svg" data-id="${task.id}" data-index="${i}" style="cursor:pointer; width:16px; height:16px;" alt="Edit">
                    <img src="./assets/delete.svg" class="delete-subtask icon-svg" data-id="${task.id}" data-index="${i}" style="cursor:pointer; width:16px; height:16px;" alt="Delete">
                  </div>
                </li>`
                    )
                    .join("")
                : "<p class='no-subtasks' style='color:#888; margin:0;'>No subtasks</p>"
            }
          </ul>

          <div class="add-subtask" style="display:flex; gap:6px; margin-top:8px;">
            <input type="text" placeholder="Add subtask..." data-id="${task.id}" style="flex:1; padding:6px;">
            <button class="add-subtask-btn" data-id="${task.id}" style="padding:6px 10px;">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // === Task main actions ===
    taskCard.querySelector(".delete").addEventListener("click", () => deleteTask(task.id));
    taskCard.querySelector(".edit").addEventListener("click", () => openEditModal(task));
    const statusSelect = taskCard.querySelector(".status-dropdown");
    statusSelect.addEventListener("change", (e) => updateTaskStatus(task.id, e.target.value));

    // === Move Up / Down functionality ===
    const moveUpBtn = taskCard.querySelector(".move-up");
    const moveDownBtn = taskCard.querySelector(".move-down");

    moveUpBtn.addEventListener("click", () => moveTask(task.id, "up"));
    moveDownBtn.addEventListener("click", () => moveTask(task.id, "down"));

    // === Subtasks ===
    const addBtn = taskCard.querySelector(".add-subtask-btn");
    const subtaskInput = taskCard.querySelector(".add-subtask input");
    addBtn.addEventListener("click", () => {
      const text = subtaskInput.value.trim();
      if (text) {
        addSubtask(task.id, text);
        subtaskInput.value = "";
      }
    });

    taskCard.querySelectorAll(".subtask-list input[type='checkbox']").forEach((cb) => {
      cb.addEventListener("change", (e) => toggleSubtaskDone(task.id, e.target.dataset.index));
    });

    // === Edit/Delete Subtask ===
    taskCard.querySelectorAll(".edit-subtask").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = Number(e.target.dataset.id);
        const index = Number(e.target.dataset.index);
        editSubtask(id, index);
      });
    });

    taskCard.querySelectorAll(".delete-subtask").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = Number(e.target.dataset.id);
        const index = Number(e.target.dataset.index);
        deleteSubtask(id, index);
      });
    });

    // === Toggle subtasks visibility ===
    const toggleBtn = taskCard.querySelector(".toggle-subtasks");
    const subtaskContent = taskCard.querySelector(".subtasks-content");
    toggleBtn.addEventListener("click", () => {
      const visible = subtaskContent.style.display === "block";
      subtaskContent.style.display = visible ? "none" : "block";
      toggleBtn.classList.toggle("fa-chevron-right", visible);
      toggleBtn.classList.toggle("fa-chevron-down", !visible);
    });

    taskList.appendChild(taskCard);
  });
  
  enableDragAndDrop(); // Enable drag and drop after rendering
}

// === Edit Subtask ===
function editSubtask(taskId, subIndex) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const oldText = task.subtasks[subIndex].text;
  const newText = prompt("Edit subtask:", oldText);

  if (newText !== null && newText.trim() !== "") {
    task.subtasks[subIndex].text = newText.trim();
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage"));
    renderTasks(tasks);
    showToast("Subtask updated successfully!", "success");
  }
}

// === Delete Subtask ===
function deleteSubtask(taskId, subIndex) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  if (confirm("Are you sure you want to delete this subtask?")) {
    task.subtasks.splice(subIndex, 1);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage"));
    renderTasks(tasks);
    showToast("Subtask deleted successfully!", "success");
  }
}

function moveTask(taskId, direction) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return;

  if (direction === "up" && index > 0) {
    [tasks[index - 1], tasks[index]] = [tasks[index], tasks[index - 1]];
  } else if (direction === "down" && index < tasks.length - 1) {
    [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
  } else {
    return;
  }

  // Save to localStorage
  localStorage.setItem("tasks", JSON.stringify(tasks));
  window.dispatchEvent(new Event("storage"));
  
  // Re-render immediately
  renderTasks(tasks);
  showToast(`Task moved ${direction}!`, "info");
}

// === Open Edit Modal ===
function openEditModal(task) {
  editingTaskId = task.id;
  editModalOverlay.style.display = "flex";

  document.getElementById("editTaskTitle").value = task.title;
  document.getElementById("editTaskDesc").value = task.desc;
  document.getElementById("editTaskDue").value = task.due;
  document.getElementById("editTaskPriority").value = task.priority;
  document.getElementById("editTaskStatus").value = task.status;
}

// === Delete Task ===
function deleteTask(id) {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === id);

  if (!task) return;

  taskToDeleteId = id;
  deleteMessage.innerHTML = `Are you sure you want to delete the <strong>${task.title}</strong> task?`;
  deleteModalOverlay.style.display = "flex";
}

// === Update Task Status ===
function updateTaskStatus(id, newStatus) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.status = newStatus;
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage")); 
    showToast(`Task status updated to ${newStatus}!`, "success");
  }

  // Re-render immediately
  renderTasks(tasks);
}

// === Add Subtask ===
function addSubtask(id, text) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.subtasks.push({ text, done: false });
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage"));
    applyFilters();
    showToast("Subtask added successfully!", "success");
  }
}

// === Toggle Subtask Completion ===
function toggleSubtaskDone(id, index) {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const task = tasks.find((t) => t.id === id);
  if (task && task.subtasks[index]) {
    task.subtasks[index].done = !task.subtasks[index].done;
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage"));
    applyFilters();
    showToast("Subtask status updated!", "info");
  }
}

// === Search Tasks (title + description) ===
searchInput.addEventListener("input", applyFilters);

// === Filters & Sorting ===
statusFilter.addEventListener("change", applyFilters);
priorityFilter.addEventListener("change", applyFilters);
sortBy.addEventListener("change", applyFilters);

function applyFilters() {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  const statusVal = statusFilter.value;
  const priorityVal = priorityFilter.value;
  const searchVal = searchInput.value.toLowerCase();
  const sortVal = sortBy.value;

  // Filter (search in both title and description)
  tasks = tasks.filter((t) => {
    const matchesStatus = statusVal === "all" || t.status === statusVal;
    const matchesPriority = priorityVal === "all" || t.priority === priorityVal;
    const matchesSearch = t.title.toLowerCase().includes(searchVal) || 
                          (t.desc && t.desc.toLowerCase().includes(searchVal));
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Sort
  if (sortVal === "dueDate") {
    tasks.sort((a, b) => new Date(a.due) - new Date(b.due));
  } else if (sortVal === "priority") {
    const priorityOrder = { High: 1, Medium: 2, Low: 3 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  } else {
    tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  renderTasks(tasks);
}

// === Clear Filter Function ===
function clearFilters() {
  // Reset all filters to default
  statusFilter.value = "all";
  priorityFilter.value = "all";
  sortBy.value = "createdAt";
  searchInput.value = "";
  
  // Reapply filters (which will now show all tasks)
  applyFilters();
  
  // Show toast notification
  // showToast("✨ Filters cleared! Showing all tasks.", "info");
}

// === Add Clear Filter Button Event Listener ===
document.addEventListener("DOMContentLoaded", () => {
  // Find or create clear filter button
  const clearFilterBtn = document.querySelector('.clear-filter-btn') || 
                         document.querySelector('[onclick*="clear"]') ||
                         document.querySelector('button:contains("Clear")');
  
  // If button exists in HTML, add event listener
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", clearFilters);
  }
  
  // Alternative: Add clear filter functionality to any element with data-clear-filter attribute
  document.querySelectorAll('[data-clear-filter]').forEach(btn => {
    btn.addEventListener("click", clearFilters);
  });
});

// === Edit Modal Elements ===
const editModalOverlay = document.getElementById("editModalOverlay");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editTaskForm = document.getElementById("editTaskForm");

let editingTaskId = null;

// === Close Edit Modal ===
closeEditModal.addEventListener("click", closeEditModalForm);
cancelEditBtn.addEventListener("click", closeEditModalForm);

function closeEditModalForm() {
  editModalOverlay.style.display = "none";
  editTaskForm.reset();
  editingTaskId = null;
}

// === Save Edited Task ===
editTaskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const updatedTask = {
    title: document.getElementById("editTaskTitle").value.trim(),
    desc: document.getElementById("editTaskDesc").value.trim(),
    due: document.getElementById("editTaskDue").value,
    priority: document.getElementById("editTaskPriority").value,
    status: document.getElementById("editTaskStatus").value,
  };

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const index = tasks.findIndex((t) => t.id === editingTaskId);

  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updatedTask };
    localStorage.setItem("tasks", JSON.stringify(tasks));
    window.dispatchEvent(new Event("storage"));
    applyRulesToTasks(); // Apply rules after editing
    showToast("All set! Your changes have been saved successfully!", "success");
  }

  closeEditModalForm();
  applyFilters();
});

// === DARK MODE TOGGLE WITH IMAGES ===
const darkModeToggle = document.getElementById("darkModeToggle");
const body = document.body;

// Load previous preference
if (localStorage.getItem("darkMode") === "enabled") {
  body.classList.add("dark-mode");
  darkModeToggle.innerHTML = '<img src="./assets/sun.png" alt="Light Mode" style="width: 24px; height: 24px; background: none;">';
} else {
  darkModeToggle.innerHTML = '<img src="./assets/moon.svg" alt="Dark Mode" style="width: 24px; height: 24px; background: none;">';
}

// Toggle on click
darkModeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");

  if (body.classList.contains("dark-mode")) {
    localStorage.setItem("darkMode", "enabled");
    darkModeToggle.innerHTML = '<img src="./assets/sun.png" alt="Light Mode" style="width: 24px; height: 24px; background: none;">';
  } else {
    localStorage.setItem("darkMode", "disabled");
    darkModeToggle.innerHTML = '<img src="./assets/moon.svg" alt="Dark Mode" style="width: 24px; height: 24px; background: none;">';
  }
});

// === Delete Confirmation Modal Elements ===
const deleteModalOverlay = document.getElementById("deleteModalOverlay");
const deleteMessage = document.getElementById("deleteMessage");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const closeDeleteModal = document.getElementById("closeDeleteModal");

let taskToDeleteId = null;

// === Confirm Delete ===
confirmDeleteBtn.addEventListener("click", () => {
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const taskToDelete = tasks.find((task) => task.id === taskToDeleteId);
  const taskTitle = taskToDelete ? taskToDelete.title : "Task";
  
  tasks = tasks.filter((task) => task.id !== taskToDeleteId);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  window.dispatchEvent(new Event("storage"));
  
  deleteModalOverlay.style.display = "none";
  taskToDeleteId = null;
  applyFilters();
  showToast(`Done! "${taskTitle}" has been removed.`, "success");
});

// === Cancel Delete ===
cancelDeleteBtn.addEventListener("click", () => {
  deleteModalOverlay.style.display = "none";
  taskToDeleteId = null;
});

// === Close Delete Modal with X button ===
if (closeDeleteModal) {
  closeDeleteModal.addEventListener("click", () => {
    deleteModalOverlay.style.display = "none";
    taskToDeleteId = null;
  });
}

// === DRAG & DROP FUNCTIONALITY ===
function enableDragAndDrop() {
  const taskCards = document.querySelectorAll(".task-card");
  const taskList = document.getElementById("taskList");

  taskCards.forEach((card) => {
    const dragIcon = card.querySelector(".drag-icon");

    // Enable dragging only when clicking the drag icon
    dragIcon.addEventListener("mousedown", () => {
      card.setAttribute("draggable", "true");
    });

    dragIcon.addEventListener("mouseup", () => {
      card.removeAttribute("draggable");
    });

    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      saveTaskOrder(); // Save order after dragging ends
      showToast("Task order updated!", "info");
    });
  });

  taskList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const draggingCard = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(taskList, e.clientY);
    if (afterElement == null) {
      taskList.appendChild(draggingCard);
    } else {
      taskList.insertBefore(draggingCard, afterElement);
    }
  });
}

// Helper to find the position where to drop
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".task-card:not(.dragging)")];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

// Save new order to localStorage after drag
function saveTaskOrder() {
  const cards = document.querySelectorAll(".task-card");
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  // Rebuild array in new order
  const reordered = [];
  cards.forEach((card) => {
    const titleElement = card.querySelector(".task-title");
    // Remove badge HTML from title text
    const titleText = titleElement.childNodes[0].textContent.trim();
    const match = tasks.find((t) => t.title === titleText);
    if (match) reordered.push(match);
  });

  localStorage.setItem("tasks", JSON.stringify(reordered));
}

// === DASHBOARD & STATUS CHART AUTO-UPDATE ===
window.addEventListener("storage", updateDashboardStats);

function updateDashboardStats() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const inProgress = tasks.filter(t => t.status === "In Progress").length;
  const todo = tasks.filter(t => t.status === "Todo").length;

  // Update number counters
  const totalTasksEl = document.getElementById("totalTasksCount");
  const completedTasksEl = document.getElementById("completedTasksCount");
  const inProgressTasksEl = document.getElementById("inProgressTasksCount");
  const todoTasksEl = document.getElementById("todoTasksCount");

  if (totalTasksEl) totalTasksEl.textContent = totalTasks;
  if (completedTasksEl) completedTasksEl.textContent = completed;
  if (inProgressTasksEl) inProgressTasksEl.textContent = inProgress;
  if (todoTasksEl) todoTasksEl.textContent = todo;

  // Update status overview chart (if it exists)
  if (window.statusChart) {
    window.statusChart.data.datasets[0].data = [todo, inProgress, completed];
    window.statusChart.update();
  }
}

// Run once on load
document.addEventListener("DOMContentLoaded", updateDashboardStats);

window.addEventListener("DOMContentLoaded", () => {
  const badgeSection = document.getElementById("badgeSection");
  if (!badgeSection) return;
  
  const badges = JSON.parse(localStorage.getItem("badges")) || [];

  if (badges.length > 0) {
    badges.forEach(badgeText => {
      const badgeEl = document.createElement("span");
      badgeEl.classList.add("badge");
      badgeEl.textContent = badgeText;
      badgeSection.appendChild(badgeEl);
    });
  }
});
