/**
 * TaskFlow Pro — Main Application
 * Developer: راغب علي | Telegram: @xd_8z
 * © 2024 TaskFlow Pro. All rights reserved.
 */

// ══════════════════════════════════════════════════════════
//  APP STATE
// ══════════════════════════════════════════════════════════
const state = {
  user: null,
  tasks: [],
  projects: [],
  currentFilter: 'all',
  currentPage: 'home',
  editingTaskId: null,
  selectedColor: '#6C63FF',
  selectedPriority: 'high',
  darkMode: true,
  lang: 'ar',
};

// ══════════════════════════════════════════════════════════
//  LOCALSTORAGE HELPERS
// ══════════════════════════════════════════════════════════
const store = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
function init() {
  state.tasks    = store.get('tasks', []);
  state.projects = store.get('projects', [
    { id: 'p1', name: 'شخصي', color: '#6C63FF' },
    { id: 'p2', name: 'عمل',  color: '#10B981' },
  ]);
  state.darkMode = store.get('darkMode', true);
  state.lang     = store.get('lang', 'ar');

  applyTheme();
  applyLang();

  // Wait for splash then show app
  setTimeout(() => {
    hideSplash();
    const savedUser = store.get('user', null);
    if (savedUser) {
      state.user = savedUser;
      showApp();
    } else {
      showAuth();
    }
  }, 2400);

  startReminderCheck();
}

// ══════════════════════════════════════════════════════════
//  THEME & LANGUAGE
// ══════════════════════════════════════════════════════════
function applyTheme() {
  document.body.classList.toggle('dark-mode',  state.darkMode);
  document.body.classList.toggle('light-mode', !state.darkMode);
  const t = document.getElementById('dark-mode-toggle');
  if (t) t.checked = state.darkMode;
}

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  store.set('darkMode', state.darkMode);
  applyTheme();
  showToast(state.darkMode ? '🌙 الوضع الليلي' : '☀️ الوضع النهاري', 'info');
}

function applyLang() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir  = state.lang === 'ar' ? 'rtl' : 'ltr';
}

function switchLang(lang) {
  state.lang = lang;
  store.set('lang', lang);
  applyLang();
  showToast(lang === 'ar' ? '🌍 تم التغيير للعربية' : '🌍 Language changed to English', 'info');
}

// ══════════════════════════════════════════════════════════
//  SCREENS
// ══════════════════════════════════════════════════════════
function hideSplash() {
  const s = document.getElementById('splash-screen');
  if (!s) return;
  s.style.opacity    = '0';
  s.style.transition = 'opacity .4s';
  setTimeout(() => s.remove(), 400);
}

function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
}

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateUserUI();
  renderAll();
}

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'))
  );
  document.getElementById('login-form').classList.toggle('hidden',    tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

function togglePass(id) {
  const i = document.getElementById(id);
  i.type = i.type === 'password' ? 'text' : 'password';
}

async function loginEmail() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('يرجى ملء جميع الحقول', 'error'); return; }

  if (window._auth) {
    try {
      const result = await window._signInWithEmailAndPassword(window._auth, email, pass);
      const u = result.user;
      await saveUserToFirestore(u.uid, { email: u.email, name: u.displayName || email.split('@')[0] });
      completeLogin({ uid: u.uid, email: u.email, name: u.displayName || email.split('@')[0], avatar: u.photoURL || '' });
    } catch (e) {
      showToast('خطأ: ' + translateFirebaseError(e.code), 'error');
    }
  } else {
    // Fallback (demo mode)
    completeLogin({ uid: 'local_' + Date.now(), email, name: email.split('@')[0], avatar: '' });
  }
}

async function registerEmail() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  if (!name || !email || !pass) { showToast('يرجى ملء جميع الحقول', 'error'); return; }
  if (pass.length < 6) { showToast('كلمة المرور 6 أحرف على الأقل', 'error'); return; }

  if (window._auth) {
    try {
      const result = await window._createUserWithEmailAndPassword(window._auth, email, pass);
      const u = result.user;
      await saveUserToFirestore(u.uid, { email, name });
      completeLogin({ uid: u.uid, email, name, avatar: '' });
    } catch (e) {
      showToast('خطأ: ' + translateFirebaseError(e.code), 'error');
    }
  } else {
    completeLogin({ uid: 'local_' + Date.now(), email, name, avatar: '' });
  }
}

async function loginGoogle() {
  if (window._auth) {
    try {
      const provider = new window._GoogleAuthProvider();
      const result   = await window._signInWithPopup(window._auth, provider);
      const u = result.user;
      await saveUserToFirestore(u.uid, { email: u.email, name: u.displayName, avatar: u.photoURL });
      completeLogin({ uid: u.uid, email: u.email, name: u.displayName, avatar: u.photoURL || '' });
    } catch (e) {
      showToast('خطأ في تسجيل الدخول بـ Google: ' + translateFirebaseError(e.code), 'error');
    }
  } else {
    showToast('Firebase غير متاح حالياً', 'error');
  }
}

function loginFacebook() {
  completeLogin({ uid: 'fb_' + Date.now(), email: 'user@facebook.com', name: 'مستخدم Facebook', avatar: '' });
}

function loginDemo() {
  completeLogin({ uid: 'demo_' + Date.now(), email: 'demo@taskflow.pro', name: 'المستخدم التجريبي', avatar: '' });
}

function completeLogin(user) {
  state.user = user;
  store.set('user', user);
  showToast('✅ مرحباً ' + user.name + '!', 'success');
  showApp();
}

async function logout() {
  if (window._auth && window._signOut) {
    try { await window._signOut(window._auth); } catch (e) {}
  }
  state.user = null;
  store.set('user', null);
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  showToast('👋 تم تسجيل الخروج', 'info');
}

// ══════════════════════════════════════════════════════════
//  USER UI
// ══════════════════════════════════════════════════════════
function updateUserUI() {
  if (!state.user) return;
  const { name, email, avatar } = state.user;
  const initial = (name || 'U').charAt(0).toUpperCase();

  document.getElementById('user-initial').textContent = initial;
  if (avatar) document.getElementById('user-avatar').src = avatar;

  document.getElementById('sidebar-name').textContent          = name  || 'المستخدم';
  document.getElementById('sidebar-email').textContent         = email || '';
  document.getElementById('sidebar-avatar-initial').textContent = initial;
  if (avatar) document.getElementById('sidebar-avatar-img').src = avatar;

  document.getElementById('set-name').textContent  = name  || 'الاسم';
  document.getElementById('set-email').textContent = email || 'البريد';

  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'صباح الخير ☀️' : hour < 17 ? 'مساء الخير 🌤' : 'مساء النور 🌙';
  document.getElementById('greeting-time').textContent = greet;
  document.getElementById('greeting-name').textContent = 'مرحباً، ' + (name || 'صديقي').split(' ')[0] + '!';

  const quotes = [
    'كل يوم هو فرصة جديدة للتفوق.',
    'الانضباط يصنع الفرق.',
    'ابدأ بالمهمة الأصعب أولاً.',
    'الإنتاجية ليست صدفة، هي قرار.',
    'خطوة صغيرة كل يوم = نتيجة كبيرة.',
    'وقتك هو أثمن ما تملك.',
  ];
  document.getElementById('daily-quote').textContent = quotes[new Date().getDay() % quotes.length];
}

// ══════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════
function navigate(page) {
  state.currentPage = page;
  closeSidebar();

  document.querySelectorAll('.page').forEach(p => { p.classList.add('hidden'); p.classList.remove('active'); });
  const target = document.getElementById('page-' + page);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); }

  document.querySelectorAll('.bnav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const navMap = { home:0, today:1, upcoming:2, completed:3, dashboard:4 };
  const items  = document.querySelectorAll('.sidebar-nav .nav-item');
  if (navMap[page] !== undefined && items[navMap[page]]) items[navMap[page]].classList.add('active');

  const titles = { home:'مهامي', today:'مهام اليوم', upcoming:'المهام القادمة', completed:'المكتملة', dashboard:'الإنتاجية', settings:'الإعدادات', about:'عن المطور' };
  document.getElementById('page-title').textContent = titles[page] || page;

  if      (page === 'home')      renderHome();
  else if (page === 'today')     renderTodayPage();
  else if (page === 'upcoming')  renderUpcomingPage();
  else if (page === 'completed') renderCompletedPage();
  else if (page === 'dashboard') renderDashboard();
  else if (page === 'settings')  renderSettings();
}

// ══════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ══════════════════════════════════════════════════════════
//  SEARCH
// ══════════════════════════════════════════════════════════
function openSearch() {
  document.getElementById('search-bar').classList.add('open');
  document.getElementById('search-input').focus();
}
function closeSearch() {
  document.getElementById('search-bar').classList.remove('open');
  document.getElementById('search-input').value = '';
  renderHome();
}
function searchTasks() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  if (!q) { renderHome(); return; }
  const filtered = state.tasks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.notes || '').toLowerCase().includes(q) ||
    (t.tags  || []).some(tag => tag.toLowerCase().includes(q))
  );
  renderTasksList(filtered, 'tasks-list');
  updateTasksCount(filtered.length);
}

// ══════════════════════════════════════════════════════════
//  FILTER
// ══════════════════════════════════════════════════════════
function setFilter(filter, btn) {
  state.currentFilter = filter;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderHome();
}

function getFilteredTasks() {
  const today = formatDate(new Date());
  switch (state.currentFilter) {
    case 'today':     return state.tasks.filter(t => t.date === today && !t.completed);
    case 'high':      return state.tasks.filter(t => t.priority === 'high'   && !t.completed);
    case 'medium':    return state.tasks.filter(t => t.priority === 'medium' && !t.completed);
    case 'low':       return state.tasks.filter(t => t.priority === 'low'    && !t.completed);
    case 'completed': return state.tasks.filter(t => t.completed);
    default:          return [...state.tasks];
  }
}

// ══════════════════════════════════════════════════════════
//  RENDER
// ══════════════════════════════════════════════════════════
function renderAll() {
  renderHome();
  renderSidebarProjects();
  updateTodayCount();
}

function renderHome() {
  const tasks = getFilteredTasks();
  renderTasksList(tasks, 'tasks-list');
  updateStats();
  updateProgress();
  updateTasksCount(tasks.length);
  renderSidebarProjects();
}

function updateStats() {
  document.getElementById('stats-done').textContent    = state.tasks.filter(t =>  t.completed).length;
  document.getElementById('stats-pending').textContent = state.tasks.filter(t => !t.completed).length;
}

function updateProgress() {
  const today = formatDate(new Date());
  const all   = state.tasks.filter(t => t.date === today || !t.date);
  const done  = all.filter(t => t.completed).length;
  const pct   = all.length === 0 ? 0 : Math.round((done / all.length) * 100);
  document.getElementById('progress-fill').style.width    = pct + '%';
  document.getElementById('progress-percent').textContent = pct + '%';
}

function updateTasksCount(n) {
  document.getElementById('tasks-count').textContent = n + ' مهمة';
}

function updateTodayCount() {
  const today = formatDate(new Date());
  const count = state.tasks.filter(t => t.date === today && !t.completed).length;
  document.getElementById('today-count').textContent = count || '';
}

function renderTasksList(tasks, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const empty = document.getElementById('empty-state');

  if (tasks.length === 0) {
    container.innerHTML = '';
    if (empty && containerId === 'tasks-list') empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  const order = { high:0, medium:1, low:2 };
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.priority  !== b.priority)  return (order[a.priority]||1) - (order[b.priority]||1);
    if (a.date && b.date) return new Date(a.date) - new Date(b.date);
    return 0;
  });

  container.innerHTML = sorted.map(renderTaskCard).join('');
}

function renderTaskCard(task) {
  const today = formatDate(new Date());
  let dateClass = '', dateLabel = '';
  if (task.date) {
    if      (task.date < today) { dateClass = 'overdue'; dateLabel = '⚠ متأخرة'; }
    else if (task.date === today) { dateClass = 'today'; dateLabel = '📅 اليوم'; }
    else { dateLabel = '📅 ' + task.date; }
    if (task.time) dateLabel += ' ' + task.time;
  }
  const project = state.projects.find(p => p.id === task.projectId);
  const priLabel = task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'منخفض';

  return `
    <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''}" id="tc-${task.id}">
      <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
      <div class="task-body">
        <div class="task-title">${escHtml(task.title)}</div>
        ${task.notes ? `<div class="task-notes-preview">${escHtml(task.notes)}</div>` : ''}
        <div class="task-meta">
          <span class="priority-badge ${task.priority}">${priLabel}</span>
          ${dateLabel ? `<span class="task-date ${dateClass}">${dateLabel}</span>` : ''}
          ${project ? `<span class="task-tag" style="background:${project.color}22;color:${project.color}">${escHtml(project.name)}</span>` : ''}
          ${(task.tags||[]).map(t=>`<span class="task-tag">${escHtml(t)}</span>`).join('')}
          ${task.reminder ? '<span class="task-date">🔔</span>' : ''}
          ${task.repeat   ? '<span class="task-date">🔄</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit"   onclick="openEditTask('${task.id}')">✏</button>
        <button class="task-action-btn delete" onclick="deleteTask('${task.id}')">🗑</button>
      </div>
    </div>`;
}

function renderTodayPage() {
  const today = formatDate(new Date());
  const tasks = state.tasks.filter(t => t.date === today);
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('ar-EG', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  renderTasksList(tasks, 'today-tasks');
  document.getElementById('today-empty').classList.toggle('hidden', tasks.length > 0);
}

function renderUpcomingPage() {
  const today = formatDate(new Date());
  const tasks = state.tasks.filter(t => t.date && t.date > today && !t.completed);
  tasks.sort((a,b) => new Date(a.date) - new Date(b.date));
  renderTasksList(tasks, 'upcoming-tasks');
  document.getElementById('upcoming-empty').classList.toggle('hidden', tasks.length > 0);
}

function renderCompletedPage() {
  const tasks = state.tasks.filter(t => t.completed);
  renderTasksList(tasks, 'completed-tasks');
  document.getElementById('completed-empty').classList.toggle('hidden', tasks.length > 0);
}

function renderDashboard() {
  const total     = state.tasks.length;
  const completed = state.tasks.filter(t =>  t.completed).length;
  const pending   = state.tasks.filter(t => !t.completed).length;
  const rate      = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById('d-completed').textContent = completed;
  document.getElementById('d-pending').textContent   = pending;
  document.getElementById('d-rate').textContent      = rate + '%';
  document.getElementById('d-streak').textContent    = Math.min(completed, 30);

  renderWeeklyChart();
  renderPriorityDist();
}

function renderWeeklyChart() {
  const days = ['أح','إث','ثل','أر','خم','جم','سب'];
  const now  = new Date();
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d  = new Date(now); d.setDate(d.getDate() - i);
    const ds = formatDate(d);
    data.push({ day: days[d.getDay()], count: state.tasks.filter(t => t.completedAt && t.completedAt.startsWith(ds)).length });
  }
  const max = Math.max(...data.map(d => d.count), 1);
  document.getElementById('weekly-chart').innerHTML = data.map(d => `
    <div class="bar-item">
      <div class="bar-fill" style="height:${Math.max((d.count/max)*70,4)}px"></div>
      <span class="bar-label">${d.day}</span>
    </div>`).join('');
}

function renderPriorityDist() {
  const high  = state.tasks.filter(t => t.priority === 'high').length;
  const med   = state.tasks.filter(t => t.priority === 'medium').length;
  const low   = state.tasks.filter(t => t.priority === 'low').length;
  const total = Math.max(state.tasks.length, 1);
  document.getElementById('priority-dist').innerHTML = `
    <div class="dist-row"><span class="dist-label" style="color:var(--high)">عاجل</span><div class="dist-track"><div class="dist-fill" style="width:${(high/total)*100}%;background:var(--high)"></div></div><span class="dist-count">${high}</span></div>
    <div class="dist-row"><span class="dist-label" style="color:var(--medium)">متوسط</span><div class="dist-track"><div class="dist-fill" style="width:${(med/total)*100}%;background:var(--medium)"></div></div><span class="dist-count">${med}</span></div>
    <div class="dist-row"><span class="dist-label" style="color:var(--low)">منخفض</span><div class="dist-track"><div class="dist-fill" style="width:${(low/total)*100}%;background:var(--low)"></div></div><span class="dist-count">${low}</span></div>`;
}

function renderSettings() {
  document.getElementById('dark-mode-toggle').checked = state.darkMode;
  if (state.user) {
    document.getElementById('set-name').textContent  = state.user.name  || 'الاسم';
    document.getElementById('set-email').textContent = state.user.email || 'البريد';
  }
}

function renderSidebarProjects() {
  const container = document.getElementById('sidebar-projects');
  if (!container) return;
  container.innerHTML = state.projects.map(p => {
    const count = state.tasks.filter(t => t.projectId === p.id && !t.completed).length;
    return `<button class="project-nav-item" onclick="filterByProject('${p.id}')">
      <span class="project-dot" style="background:${p.color}"></span>
      <span>${escHtml(p.name)}</span>
      ${count > 0 ? `<span class="nav-badge" style="margin-right:auto;background:${p.color}">${count}</span>` : ''}
    </button>`;
  }).join('');
}

function filterByProject(id) {
  closeSidebar(); navigate('home');
  const proj = state.projects.find(p => p.id === id);
  if (!proj) return;
  document.getElementById('page-title').textContent = proj.name;
  const filtered = state.tasks.filter(t => t.projectId === id);
  renderTasksList(filtered, 'tasks-list');
  updateTasksCount(filtered.length);
}

// ══════════════════════════════════════════════════════════
//  ADD / EDIT TASK
// ══════════════════════════════════════════════════════════
function openAddTask() {
  state.editingTaskId = null;
  document.getElementById('task-modal-title').textContent = 'مهمة جديدة';
  document.getElementById('task-title-input').value = '';
  document.getElementById('task-notes-input').value = '';
  document.getElementById('task-date').value         = formatDate(new Date());
  document.getElementById('task-time').value         = '';
  document.getElementById('task-reminder').value     = '';
  document.getElementById('task-repeat').value       = '';
  document.getElementById('task-tags').value         = '';
  state.selectedPriority = 'high';
  document.querySelectorAll('.pri-btn').forEach(b => b.classList.toggle('active', b.dataset.p === 'high'));
  updateProjectSelect();
  openModal('add-task-modal');
}

function openEditTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  state.editingTaskId = id;
  document.getElementById('task-modal-title').textContent = 'تعديل المهمة';
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-notes-input').value = task.notes || '';
  document.getElementById('task-date').value         = task.date     || '';
  document.getElementById('task-time').value         = task.time     || '';
  document.getElementById('task-reminder').value     = task.reminder || '';
  document.getElementById('task-repeat').value       = task.repeat   || '';
  document.getElementById('task-tags').value         = (task.tags || []).join(', ');
  state.selectedPriority = task.priority || 'high';
  document.querySelectorAll('.pri-btn').forEach(b => b.classList.toggle('active', b.dataset.p === task.priority));
  updateProjectSelect(task.projectId);
  openModal('add-task-modal');
}

function updateProjectSelect(selected = '') {
  document.getElementById('task-project').innerHTML =
    '<option value="">بدون مشروع</option>' +
    state.projects.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${escHtml(p.name)}</option>`).join('');
}

function closeAddTask() { closeModal('add-task-modal'); }

function saveTask() {
  const title = document.getElementById('task-title-input').value.trim();
  if (!title) { showToast('يرجى إدخال عنوان المهمة', 'error'); return; }

  const tags = document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const data = {
    title,
    notes:     document.getElementById('task-notes-input').value.trim(),
    priority:  state.selectedPriority || 'medium',
    date:      document.getElementById('task-date').value,
    time:      document.getElementById('task-time').value,
    reminder:  document.getElementById('task-reminder').value,
    repeat:    document.getElementById('task-repeat').value,
    projectId: document.getElementById('task-project').value,
    tags,
    completed: false,
  };

  if (state.editingTaskId) {
    const idx = state.tasks.findIndex(t => t.id === state.editingTaskId);
    if (idx !== -1) { state.tasks[idx] = { ...state.tasks[idx], ...data }; showToast('✅ تم تعديل المهمة', 'success'); }
  } else {
    const newTask = { ...data, id: 'task_' + Date.now(), createdAt: new Date().toISOString() };
    state.tasks.unshift(newTask);
    showToast('✅ تمت إضافة المهمة', 'success');
    scheduleReminder(newTask);
  }

  saveTasks();
  closeModal('add-task-modal');
  renderAll();
}

function setPriority(p, btn) {
  state.selectedPriority = p;
  document.querySelectorAll('.pri-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ══════════════════════════════════════════════════════════
//  TASK ACTIONS
// ══════════════════════════════════════════════════════════
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.completed   = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  if (task.completed) showToast('🎉 أحسنت! مهمة مكتملة', 'success');
  saveTasks();
  renderAll();
  if (state.currentPage !== 'home') navigate(state.currentPage);
}

function deleteTask(id) {
  const idx  = state.tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  const card = document.getElementById('tc-' + id);
  if (card) {
    card.style.transition = 'all .25s';
    card.style.opacity    = '0';
    card.style.transform  = 'translateX(50px) scale(.95)';
    setTimeout(() => {
      state.tasks.splice(idx, 1);
      saveTasks(); renderAll();
      if (state.currentPage !== 'home') navigate(state.currentPage);
    }, 250);
  }
  showToast('🗑 تم حذف المهمة', 'warning');
}

function clearAllTasks() {
  if (!confirm('هل أنت متأكد من حذف جميع المهام؟')) return;
  state.tasks = []; saveTasks(); renderAll();
  showToast('🗑 تم حذف جميع المهام', 'warning');
}

function exportData() {
  const blob = new Blob([JSON.stringify({ tasks: state.tasks, projects: state.projects }, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = 'taskflow-backup.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('📤 تم تصدير البيانات', 'success');
}

function saveTasks() { store.set('tasks', state.tasks); }

// ══════════════════════════════════════════════════════════
//  PROJECTS
// ══════════════════════════════════════════════════════════
function openAddProject() {
  closeSidebar();
  state.selectedColor = '#6C63FF';
  document.getElementById('project-name-input').value = '';
  document.querySelectorAll('.color-opt').forEach(b => b.classList.toggle('active', b.dataset.c === '#6C63FF'));
  const m = document.getElementById('add-project-modal');
  m.style.display = 'flex';
  m.classList.add('open', 'center');
}

function closeAddProject() {
  const m = document.getElementById('add-project-modal');
  m.classList.remove('open');
  setTimeout(() => { m.style.display = 'none'; }, 300);
}

function saveProject() {
  const name = document.getElementById('project-name-input').value.trim();
  if (!name) { showToast('يرجى إدخال اسم المشروع', 'error'); return; }
  state.projects.push({ id: 'p_' + Date.now(), name, color: state.selectedColor });
  store.set('projects', state.projects);
  closeAddProject();
  renderSidebarProjects();
  showToast('✅ تم إنشاء المشروع', 'success');
}

function selectColor(c, btn) {
  state.selectedColor = c;
  document.querySelectorAll('.color-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ══════════════════════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════════════════════
function openProfile() { navigate('settings'); }
function openEditProfile() {
  const name = prompt('الاسم الجديد:', state.user?.name || '');
  if (name && name.trim()) {
    state.user.name = name.trim();
    store.set('user', state.user);
    updateUserUI(); renderSettings();
    showToast('✅ تم تحديث الاسم', 'success');
  }
}

// ══════════════════════════════════════════════════════════
//  REMINDERS & NOTIFICATIONS
// ══════════════════════════════════════════════════════════
async function requestNotifications() {
  if (!('Notification' in window)) { showToast('متصفحك لا يدعم الإشعارات', 'error'); return; }
  const perm = await Notification.requestPermission();
  document.getElementById('notif-toggle').checked = perm === 'granted';
  showToast(perm === 'granted' ? '🔔 تم تفعيل الإشعارات' : '🔕 تم رفض الإشعارات', perm === 'granted' ? 'success' : 'warning');
}

function scheduleReminder(task) {
  if (!task.date || !task.reminder) return;
  const dt   = new Date(`${task.date}T${task.time || '09:00'}`);
  const fire = dt - parseInt(task.reminder) * 60000;
  if (fire > Date.now()) setTimeout(() => sendReminder(task), fire - Date.now());
}

function sendReminder(task) {
  document.getElementById('notif-body').textContent = 'تذكير: ' + task.title;
  document.getElementById('notif-popup').classList.remove('hidden');
  if (Notification.permission === 'granted') new Notification('TaskFlow Pro', { body: task.title });
  showToast('🔔 تذكير: ' + task.title, 'info');
}

function closeNotif() { document.getElementById('notif-popup').classList.add('hidden'); }

function startReminderCheck() {
  setInterval(() => {
    const now = new Date();
    state.tasks.filter(t => !t.completed && t.date && t.time).forEach(task => {
      const diff = new Date(`${task.date}T${task.time}`) - now;
      if (diff > 0 && diff <= 60000) sendReminder(task);
    });
  }, 60000);
}

// ══════════════════════════════════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════════════════════════════════
function openModal(id) {
  const m = document.getElementById(id);
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const m = document.getElementById(id);
  m.classList.remove('open');
  setTimeout(() => { m.style.display = 'none'; document.body.style.overflow = ''; }, 300);
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    setTimeout(() => { e.target.style.display = 'none'; document.body.style.overflow = ''; }, 300);
  }
});

// ══════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════
function showToast(msg, type = 'info', duration = 3000) {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, duration);
}

// ══════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════
function formatDate(d) { return d.toISOString().split('T')[0]; }
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════════
//  FIREBASE HELPERS
// ══════════════════════════════════════════════════════════
async function saveUserToFirestore(uid, data) {
  if (!window._db || !window._doc || !window._setDoc) return;
  try {
    await window._setDoc(window._doc(window._db, 'users', uid), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) { console.log('Firestore:', e.message); }
}

function translateFirebaseError(code) {
  const map = {
    'auth/user-not-found':        'البريد غير مسجّل',
    'auth/wrong-password':        'كلمة المرور خاطئة',
    'auth/invalid-credential':    'البريد أو كلمة المرور خاطئة',
    'auth/email-already-in-use':  'البريد مسجّل مسبقاً',
    'auth/invalid-email':         'البريد غير صحيح',
    'auth/weak-password':         'كلمة المرور ضعيفة',
    'auth/popup-closed-by-user':  'تم إغلاق نافذة تسجيل الدخول',
    'auth/network-request-failed':'تحقق من الاتصال بالإنترنت',
  };
  return map[code] || 'حدث خطأ، حاول مجدداً';
}

// ══════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      setTimeout(() => { m.style.display = 'none'; document.body.style.overflow = ''; }, 300);
    });
    closeSidebar();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openAddTask(); }
});

// ══════════════════════════════════════════════════════════
//  PWA
// ══════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

// ══════════════════════════════════════════════════════════
//  BOOT — wait for DOM
// ══════════════════════════════════════════════════════════
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * TaskFlow Pro | Developer: راغب علي | Telegram: @xd_8z
 * © 2024 All Rights Reserved
 */
