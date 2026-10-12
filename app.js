(() => {
  "use strict";

  const STORAGE_KEY = "studyspace-tracker-v1";
  const palette = {
    violet: { bg: "#f0edff", fg: "#7767e9" },
    blue: { bg: "#e9f4ff", fg: "#4695e7" },
    green: { bg: "#e5f9f0", fg: "#39b989" },
    orange: { bg: "#fff1e5", fg: "#ed9b4e" },
    pink: { bg: "#ffeaf3", fg: "#e66ca1" }
  };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const todayISO = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  };
  const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const starterData = {
    courses: [
      { id: "c-python", name: "Python Programming", category: "Programming", progress: 65, color: "violet" },
      { id: "c-cloud", name: "Cloud Computing", category: "Cloud Computing", progress: 35, color: "blue" },
      { id: "c-dsa", name: "Data Structures", category: "Computer Science", progress: 50, color: "green" },
      { id: "c-japanese", name: "Japanese N5", category: "Language", progress: 75, color: "pink" }
    ],
    tasks: [
      { id: "t-arrays", title: "Revise arrays and strings", courseId: "c-dsa", due: "", priority: "High", notes: "Review the important examples.", completed: false },
      { id: "t-python", title: "Practice Python functions", courseId: "c-python", due: "", priority: "Medium", notes: "", completed: false },
      { id: "t-cloud", title: "Read cloud service models", courseId: "c-cloud", due: "", priority: "Low", notes: "", completed: true },
      { id: "t-japanese", title: "Revise lesson vocabulary", courseId: "c-japanese", due: "", priority: "Medium", notes: "", completed: false }
    ]
  };
  starterData.tasks.forEach((task, i) => {
    const due = new Date();
    due.setDate(due.getDate() + [1, 2, -1, 4][i]);
    due.setMinutes(due.getMinutes() - due.getTimezoneOffset());
    task.due = due.toISOString().slice(0, 10);
  });

  let state = loadState();
  let toastTimer;

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.courses) && Array.isArray(parsed.tasks)) return parsed;
      }
    } catch (error) {
      console.warn("Could not load saved tracker data:", error);
    }
    return structuredClone(starterData);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("Could not save data in this browser.");
      console.error(error);
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function formatDate(value) {
    if (!value) return "No date";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "No date";
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function courseById(id) {
    return state.courses.find((course) => course.id === id);
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  }

  function colorStyle(color) {
    const chosen = palette[color] || palette.violet;
    return `background:${chosen.bg};color:${chosen.fg}`;
  }

  function progressColor(color) {
    return (palette[color] || palette.violet).fg;
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function renderStats() {
    const total = state.tasks.length;
    const completed = state.tasks.filter((task) => task.completed).length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    $("#totalCourses").textContent = state.courses.length;
    $("#totalTasks").textContent = total;
    $("#completedTasks").textContent = completed;
    $("#overallProgress").textContent = `${progress}%`;
    $("#overallProgressBar").style.width = `${progress}%`;
  }

  function courseMiniHTML(course) {
    return `<div class="mini-course">
      <div class="course-symbol" style="${colorStyle(course.color)}">${escapeHTML(initials(course.name))}</div>
      <div><span class="mini-course-name">${escapeHTML(course.name)}</span><span class="mini-course-meta">${escapeHTML(course.category)}</span>
        <div class="mini-course-progress"><span style="width:${course.progress}%;background:${progressColor(course.color)}"></span></div>
      </div><span class="mini-percent">${course.progress}%</span>
    </div>`;
  }

  function taskItemHTML(task) {
    const course = courseById(task.courseId);
    return `<div class="task-item">
      <input class="task-check" type="checkbox" data-toggle-task="${escapeHTML(task.id)}" aria-label="Mark ${escapeHTML(task.title)} complete" ${task.completed ? "checked" : ""}>
      <div class="task-item-content"><span class="task-item-title ${task.completed ? "done" : ""}">${escapeHTML(task.title)}</span>
        <span class="task-item-meta">${escapeHTML(course?.name || "Course removed")} · ${escapeHTML(formatDate(task.due))}</span>
      </div><span class="priority ${escapeHTML(task.priority)}">${escapeHTML(task.priority)}</span>
    </div>`;
  }

  function renderDashboard() {
    $("#dashboardCourses").innerHTML = state.courses.length
      ? state.courses.slice(0, 4).map(courseMiniHTML).join("")
      : emptyMessage("No courses yet", "Add a course to start learning.");
    const upcoming = [...state.tasks].filter((task) => !task.completed)
      .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")).slice(0, 4);
    $("#dashboardTasks").innerHTML = upcoming.length
      ? upcoming.map(taskItemHTML).join("")
      : emptyMessage("You're all caught up!", "Add a task when you're ready for the next step.");
  }

  function emptyMessage(title, description) {
    return `<div class="empty-state"><span>✦</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p></div>`;
  }

  function renderCourses() {
    const query = $("#courseSearch").value.trim().toLowerCase();
    const courses = state.courses.filter((course) =>
      `${course.name} ${course.category}`.toLowerCase().includes(query)
    );
    $("#courseCount").textContent = `${courses.length} course${courses.length === 1 ? "" : "s"}`;
    $("#allCourses").innerHTML = courses.length ? courses.map((course) => `
      <article class="course-card">
        <div class="course-card-top">
          <div class="course-symbol" style="${colorStyle(course.color)}">${escapeHTML(initials(course.name))}</div>
          <div class="card-actions">
            <button class="small-action" data-edit-course="${escapeHTML(course.id)}" aria-label="Edit ${escapeHTML(course.name)}" title="Edit course">✎</button>
            <button class="small-action" data-delete-course="${escapeHTML(course.id)}" aria-label="Delete ${escapeHTML(course.name)}" title="Delete course">×</button>
          </div>
        </div>
        <h3>${escapeHTML(course.name)}</h3><span class="course-category">${escapeHTML(course.category)}</span>
        <div class="course-card-progress"><span>Course progress</span><strong>${course.progress}%</strong></div>
        <div class="progress-track"><span style="width:${course.progress}%;background:${progressColor(course.color)}"></span></div>
        <div class="course-card-bottom"><span>${state.tasks.filter((task) => task.courseId === course.id && task.completed).length} tasks completed</span><span class="course-status">${course.progress === 100 ? "Completed" : "In progress"}</span></div>
      </article>`).join("") : emptyMessage("No matching courses", "Try another search or add a new course.");
  }

  function renderTaskTable() {
    const query = $("#taskSearch").value.trim().toLowerCase();
    const status = $("#taskFilter").value;
    const priority = $("#priorityFilter").value;
    const tasks = [...state.tasks].filter((task) => {
      const course = courseById(task.courseId);
      const matchesQuery = `${task.title} ${course?.name || ""} ${task.notes || ""}`.toLowerCase().includes(query);
      const matchesStatus = status === "all" || (status === "completed" ? task.completed : !task.completed);
      const matchesPriority = priority === "all" || task.priority === priority;
      return matchesQuery && matchesStatus && matchesPriority;
    }).sort((a, b) => Number(a.completed) - Number(b.completed) || (a.due || "9999").localeCompare(b.due || "9999"));

    $("#taskTableBody").innerHTML = tasks.map((task) => {
      const course = courseById(task.courseId);
      const overdue = !task.completed && task.due && task.due < todayISO();
      return `<tr>
        <td><div class="table-task"><input class="task-check" type="checkbox" data-toggle-task="${escapeHTML(task.id)}" aria-label="Mark ${escapeHTML(task.title)} complete" ${task.completed ? "checked" : ""}><span class="table-task-title ${task.completed ? "done" : ""}" title="${escapeHTML(task.notes || task.title)}">${escapeHTML(task.title)}</span></div></td>
        <td><span class="course-chip">${escapeHTML(course?.name || "Course removed")}</span></td>
        <td class="${overdue ? "due-overdue" : ""}">${escapeHTML(formatDate(task.due))}${overdue ? " · Overdue" : ""}</td>
        <td><span class="priority ${escapeHTML(task.priority)}">${escapeHTML(task.priority)}</span></td>
        <td><span class="status-pill ${task.completed ? "completed" : "pending"}">${task.completed ? "Completed" : "Pending"}</span></td>
        <td><div class="card-actions"><button class="small-action" data-edit-task="${escapeHTML(task.id)}" aria-label="Edit ${escapeHTML(task.title)}" title="Edit task">✎</button><button class="small-action" data-delete-task="${escapeHTML(task.id)}" aria-label="Delete ${escapeHTML(task.title)}" title="Delete task">×</button></div></td>
      </tr>`;
    }).join("");
    $("#emptyTasks").classList.toggle("hidden", tasks.length > 0);
    $(".task-table-wrap").classList.toggle("hidden", tasks.length === 0);
  }

  function renderCourseOptions(selectedId = "") {
    const select = $("#taskCourse");
    select.innerHTML = state.courses.map((course) =>
      `<option value="${escapeHTML(course.id)}" ${course.id === selectedId ? "selected" : ""}>${escapeHTML(course.name)}</option>`
    ).join("");
    if (!state.courses.length) select.innerHTML = '<option value="">Add a course first</option>';
    select.disabled = !state.courses.length;
  }

  function renderAll() {
    renderStats();
    renderDashboard();
    renderCourses();
    renderTaskTable();
  }

  function openCourseDialog(course = null) {
    $("#courseForm").reset();
    $("#courseId").value = course?.id || "";
    $("#courseDialogTitle").textContent = course ? "Edit course" : "Add a course";
    $("#courseName").value = course?.name || "";
    $("#courseCategory").value = course?.category || "Programming";
    $("#courseProgress").value = course?.progress ?? 0;
    $("#progressValue").textContent = `${$("#courseProgress").value}%`;
    $("#courseColor").value = course?.color || "violet";
    $("#courseDialog").showModal();
    $("#courseName").focus();
  }

  function openTaskDialog(task = null) {
    if (!state.courses.length) {
      showToast("Add a course before creating a task.");
      navigate("courses");
      openCourseDialog();
      return;
    }
    $("#taskForm").reset();
    $("#taskId").value = task?.id || "";
    $("#taskDialogTitle").textContent = task ? "Edit study task" : "Add a study task";
    $("#taskTitle").value = task?.title || "";
    renderCourseOptions(task?.courseId || state.courses[0].id);
    $("#taskDue").value = task?.due || todayISO();
    $("#taskPriority").value = task?.priority || "Medium";
    $("#taskNotes").value = task?.notes || "";
    $("#taskDialog").showModal();
    $("#taskTitle").focus();
  }

  function navigate(view) {
    const validViews = ["dashboard", "courses", "tasks"];
    if (!validViews.includes(view)) view = "dashboard";
    $$(".view").forEach((element) => element.classList.remove("active-view"));
    $(`#${view}View`).classList.add("active-view");
    $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === view));
    $("#pageLabel").textContent = view === "dashboard" ? "Dashboard" : view === "courses" ? "My Courses" : "Study Tasks";
    $("#sidebar").classList.remove("open");
    window.location.hash = view;
    renderAll();
  }

  function deleteCourse(id) {
    const course = courseById(id);
    if (!course) return;
    const linkedTasks = state.tasks.filter((task) => task.courseId === id).length;
    const message = linkedTasks
      ? `Delete "${course.name}" and its ${linkedTasks} linked task(s)?`
      : `Delete "${course.name}"?`;
    if (!window.confirm(message)) return;
    state.courses = state.courses.filter((item) => item.id !== id);
    state.tasks = state.tasks.filter((task) => task.courseId !== id);
    saveState();
    renderAll();
    showToast("Course deleted.");
  }

  function deleteTask(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task || !window.confirm(`Delete "${task.title}"?`)) return;
    state.tasks = state.tasks.filter((item) => item.id !== id);
    saveState();
    renderAll();
    showToast("Task deleted.");
  }

  $("#todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const hour = new Date().getHours();
  $("#greeting").textContent = `${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}! 👋`;

  // Navigation and quick actions
  $$(".nav-link").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    navigate(link.dataset.view);
  }));
  $$("[data-go]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.go)));
  $("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#addCourseButton").addEventListener("click", () => openCourseDialog());
  $("#addTaskButton").addEventListener("click", () => openTaskDialog());
  $("#quickAddTask").addEventListener("click", () => openTaskDialog());
  $("#courseSearch").addEventListener("input", renderCourses);
  $("#taskSearch").addEventListener("input", renderTaskTable);
  $("#taskFilter").addEventListener("change", renderTaskTable);
  $("#priorityFilter").addEventListener("change", renderTaskTable);
  $("#courseProgress").addEventListener("input", () => { $("#progressValue").textContent = `${$("#courseProgress").value}%`; });

  // Dialog close buttons
  $$(".close-dialog, .cancel-dialog").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  $$(".modal").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));

  // Course form create/update
  $("#courseForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = $("#courseId").value;
    const course = {
      id: id || makeId(),
      name: $("#courseName").value.trim(),
      category: $("#courseCategory").value,
      progress: Number($("#courseProgress").value),
      color: $("#courseColor").value
    };
    if (!course.name) return;
    if (id) state.courses = state.courses.map((item) => item.id === id ? course : item);
    else state.courses.push(course);
    saveState();
    $("#courseDialog").close();
    renderAll();
    showToast(id ? "Course updated!" : "Course added!");
  });

  // Task form create/update
  $("#taskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.courses.length) return showToast("Add a course first.");
    const id = $("#taskId").value;
    const oldTask = state.tasks.find((item) => item.id === id);
    const task = {
      id: id || makeId(),
      title: $("#taskTitle").value.trim(),
      courseId: $("#taskCourse").value,
      due: $("#taskDue").value,
      priority: $("#taskPriority").value,
      notes: $("#taskNotes").value.trim(),
      completed: oldTask?.completed || false
    };
    if (!task.title || !task.courseId) return;
    if (id) state.tasks = state.tasks.map((item) => item.id === id ? task : item);
    else state.tasks.push(task);
    saveState();
    $("#taskDialog").close();
    renderAll();
    showToast(id ? "Task updated!" : "Task added!");
  });

  // Event delegation for dynamically rendered controls
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.editCourse) openCourseDialog(courseById(target.dataset.editCourse));
    if (target.dataset.deleteCourse) deleteCourse(target.dataset.deleteCourse);
    if (target.dataset.editTask) openTaskDialog(state.tasks.find((task) => task.id === target.dataset.editTask));
    if (target.dataset.deleteTask) deleteTask(target.dataset.deleteTask);
  });

  document.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-toggle-task]");
    if (!checkbox) return;
    const task = state.tasks.find((item) => item.id === checkbox.dataset.toggleTask);
    if (!task) return;
    task.completed = checkbox.checked;
    saveState();
    renderAll();
    showToast(task.completed ? "Nice work — task completed!" : "Task marked as pending.");
  });

  // Support loading a section directly with #dashboard, #courses, or #tasks.
  const initialView = window.location.hash.replace("#", "");
  navigate(["dashboard", "courses", "tasks"].includes(initialView) ? initialView : "dashboard");
})();
