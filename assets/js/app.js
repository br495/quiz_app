const i18n = {
  ar: {
    'nav.lang': 'عربي',
    'nav.theme': 'ليلي',
    'nav.smart': 'اختبار ذكي',
    'sections.title': 'الأقسام',
    'sections.reload': 'تحديث',
    'sections.choose': 'اختر الأقسام',
    'sections.hint': 'اختر مجموعة أو أكثر، المجموعات الفرعية ستظهر عند اختيار المجموعة.',
    'sections.subchoose': 'اختر المجموعات الفرعية',
    'sections.mode': 'نوع الاختبار',
    'sections.modeStandard': 'عادي',
    'sections.modeSmart': 'ذكي',
    'sections.start': 'بدء الاختبار',
    'sections.reviewBox': 'صندوق المراجعة',
    'questions.placeholder': 'ابدأ الاختبار لعرض الأسئلة.',
    'questions.flag': 'إضافة للصندوق',
    'questions.prev': 'السابق',
    'questions.next': 'التالي',
    'analysis.title': 'التحليلات',
    'analysis.reset': 'إعادة الإحصائيات',
    'analysis.attempts': 'محاولات',
    'analysis.accuracy': 'دقة',
    'analysis.reviewed': 'في صندوق المراجعة',
    'results.title': 'نتائج الاختبار',
    'results.close': 'إغلاق',
    'review.title': 'صندوق المراجعة',
    'toast.title': 'تنبيه',
    'questions.finish': 'إنهاء',
    'questions.marked': 'تمت إضافة السؤال إلى صندوق المراجعة',
    'questions.saved': 'تم حفظ إجابتك',
    'questions.noSelection': 'اختر قسماً واحداً على الأقل للبدء'
  },
  en: {
    'nav.lang': 'English',
    'nav.theme': 'Dark',
    'nav.smart': 'Smart test',
    'sections.title': 'Sections',
    'sections.reload': 'Reload',
    'sections.choose': 'Choose sections',
    'sections.hint': 'Pick one or more groups. Sub-groups appear after choosing a group.',
    'sections.subchoose': 'Choose sub groups',
    'sections.mode': 'Test type',
    'sections.modeStandard': 'Standard',
    'sections.modeSmart': 'Smart',
    'sections.start': 'Start',
    'sections.reviewBox': 'Review box',
    'questions.placeholder': 'Start a test to view questions.',
    'questions.flag': 'Add to box',
    'questions.prev': 'Previous',
    'questions.next': 'Next',
    'analysis.title': 'Analytics',
    'analysis.reset': 'Reset stats',
    'analysis.attempts': 'Attempts',
    'analysis.accuracy': 'Accuracy',
    'analysis.reviewed': 'In review box',
    'results.title': 'Test results',
    'results.close': 'Close',
    'review.title': 'Review box',
    'toast.title': 'Notice',
    'questions.finish': 'Finish',
    'questions.marked': 'Question added to review box',
    'questions.saved': 'Answer saved',
    'questions.noSelection': 'Select at least one group to start'
  }
};

const state = {
  questions: [],
  filtered: [],
  currentIndex: 0,
  selections: {},
  language: localStorage.getItem('qa_lang') || 'ar',
  theme: localStorage.getItem('qa_theme') || 'light',
  reviewBox: JSON.parse(localStorage.getItem('qa_review_box') || '[]'),
  attempts: JSON.parse(localStorage.getItem('qa_attempts') || '[]'),
  sync: JSON.parse(localStorage.getItem('qa_sync') || '{}'),
  syncConfig: null,
  cache: new Map()
};

const dom = {
  groupSelect: document.getElementById('groupSelect'),
  subGroupSelect: document.getElementById('subGroupSelect'),
  subGroupWrapper: document.getElementById('subGroupWrapper'),
  startBtn: document.getElementById('startBtn'),
  smartTestBtn: document.getElementById('smartTestBtn'),
  reloadGroups: document.getElementById('reloadGroups'),
  questionArea: document.getElementById('questionArea'),
  groupBadge: document.getElementById('groupBadge'),
  subGroupBadge: document.getElementById('subGroupBadge'),
  progressText: document.getElementById('progressText'),
  nextBtn: document.getElementById('nextBtn'),
  prevBtn: document.getElementById('prevBtn'),
  flagBtn: document.getElementById('flagBtn'),
  resultBody: document.getElementById('resultBody'),
  resultModal: new bootstrap.Modal(document.getElementById('resultModal')),
  reviewModal: new bootstrap.Modal(document.getElementById('reviewModal')),
  reviewBody: document.getElementById('reviewBody'),
  reviewBoxBtn: document.getElementById('reviewBoxBtn'),
  statAttempts: document.getElementById('statAttempts'),
  statAccuracy: document.getElementById('statAccuracy'),
  statReviewed: document.getElementById('statReviewed'),
  groupStats: document.getElementById('groupStats'),
  resetStats: document.getElementById('resetStats'),
  themeToggle: document.getElementById('themeToggle'),
  langToggle: document.getElementById('langToggle'),
  toast: new bootstrap.Toast(document.getElementById('statusToast'), { delay: 2800 }),
  toastBody: document.getElementById('toastBody'),
  toastTime: document.getElementById('toastTime'),
  modeSelect: document.getElementById('modeSelect'),
  flagAlert: document.getElementById('flagAlert'),
  syncInfo: document.getElementById('syncInfo')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  applyTheme(state.theme);
  applyLanguage(state.language);
  loadQuestions();
  loadSyncConfig();
  bindEvents();
  refreshAnalytics();
}

function bindEvents() {
  dom.reloadGroups.addEventListener('click', () => populateGroups(state.questions));
  dom.groupSelect.addEventListener('change', handleGroupChange);
  dom.startBtn.addEventListener('click', () => startTest(dom.modeSelect.value));
  dom.smartTestBtn.addEventListener('click', () => startTest('smart'));
  dom.nextBtn.addEventListener('click', () => moveQuestion(1));
  dom.prevBtn.addEventListener('click', () => moveQuestion(-1));
  dom.flagBtn.addEventListener('click', addToReviewBox);
  dom.reviewBoxBtn?.addEventListener('click', showReviewBox);
  dom.resetStats.addEventListener('click', resetStats);
  dom.themeToggle.addEventListener('change', () => toggleTheme(dom.themeToggle.checked));
  dom.langToggle.addEventListener('change', () => toggleLanguage(dom.langToggle.checked));
}

function loadQuestions() {
  fetch('data/questions.json')
    .then(r => r.json())
    .then(data => {
      state.questions = data.map(q => ({
        ...q,
        choices: q.choices && q.choices.length ? q.choices : ['A', 'B', 'C', 'D'],
        sub_group: q.sub_group || null
      }));
      populateGroups(state.questions);
    })
    .catch(() => showToast('Failed to load questions file.'));
}

function loadSyncConfig() {
  fetch('data/sync_config.json')
    .then(r => r.json())
    .then(cfg => {
      state.syncConfig = cfg;
      if (!state.sync.enabled && cfg.default_enabled) {
        state.sync.enabled = true;
      }
      updateSyncInfo();
    })
    .catch(() => {
      dom.syncInfo.textContent = 'Sync config unavailable.';
    });
}

function populateGroups(list) {
  const groups = [...new Set(list.map(q => q.group))];
  dom.groupSelect.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join('');
}

function handleGroupChange() {
  const selected = Array.from(dom.groupSelect.selectedOptions).map(o => o.value);
  const subGroups = [...new Set(state.questions
    .filter(q => selected.includes(q.group) && q.sub_group)
    .map(q => q.sub_group))];
  if (subGroups.length) {
    dom.subGroupWrapper.classList.remove('d-none');
    dom.subGroupSelect.innerHTML = subGroups.map(s => `<option value="${s}">${s}</option>`).join('');
  } else {
    dom.subGroupWrapper.classList.add('d-none');
    dom.subGroupSelect.innerHTML = '';
  }
}

function startTest(mode = 'standard') {
  const selectedGroups = Array.from(dom.groupSelect.selectedOptions).map(o => o.value);
  const selectedSubGroups = Array.from(dom.subGroupSelect.selectedOptions).map(o => o.value);
  if (!selectedGroups.length) {
    showToast(t('questions.noSelection'));
    return;
  }
  const pool = state.questions.filter(q => selectedGroups.includes(q.group) && (!selectedSubGroups.length || !q.sub_group || selectedSubGroups.includes(q.sub_group)));
  state.filtered = mode === 'smart' ? pickSmartQuestions(pool) : [...pool];
  state.currentIndex = 0;
  state.selections = {};
  dom.prevBtn.disabled = true;
  dom.nextBtn.disabled = state.filtered.length === 0;
  renderQuestion();
  preloadImages(state.filtered);
}

function pickSmartQuestions(pool) {
  const attempts = state.attempts;
  const wrongCount = new Map();
  const answered = new Set();
  attempts.forEach(a => {
    a.details.forEach(d => {
      answered.add(d.path);
      if (!d.isCorrect) {
        wrongCount.set(d.path, (wrongCount.get(d.path) || 0) + 1);
      }
    });
  });
  const weighted = pool
    .map(q => ({ q, weight: (wrongCount.get(q.path) || 0) + (answered.has(q.path) ? 0 : 2) }))
    .sort((a, b) => b.weight - a.weight);
  return weighted.slice(0, Math.min(weighted.length, 20)).map(w => w.q);
}

function renderQuestion() {
  const q = state.filtered[state.currentIndex];
  if (!q) {
    dom.questionArea.innerHTML = `<p class="text-muted">${t('questions.placeholder')}</p>`;
    return;
  }
  dom.groupBadge.textContent = q.group;
  dom.subGroupBadge.textContent = q.sub_group || '';
  dom.subGroupBadge.classList.toggle('d-none', !q.sub_group);
  dom.progressText.textContent = `${state.currentIndex + 1}/${state.filtered.length}`;
  const selected = state.selections[q.path];

  const optionsHtml = q.choices.map((choice, idx) => {
    const key = String.fromCharCode(65 + idx);
    const checked = selected === key ? 'checked' : '';
    return `<div class="form-check">
      <input class="form-check-input" type="radio" name="choice" id="opt-${idx}" value="${key}" ${checked}>
      <label class="form-check-label" for="opt-${idx}"><strong>${key}.</strong> ${choice}</label>
    </div>`;
  }).join('');

  dom.questionArea.innerHTML = `
    <div class="d-flex align-items-center mb-3 gap-2">
      <div class="flex-grow-1">
        <img src="${q.path}" alt="Question image" class="img-fluid rounded border">
      </div>
    </div>
    <div class="options-grid">${optionsHtml}</div>
  `;

  dom.questionArea.querySelectorAll('input[name="choice"]').forEach(input => {
    input.addEventListener('change', (e) => {
      state.selections[q.path] = e.target.value;
      showToast(t('questions.saved'));
    });
  });

  dom.prevBtn.disabled = state.currentIndex === 0;
  dom.nextBtn.disabled = false;
  dom.nextBtn.textContent = state.currentIndex === state.filtered.length - 1 ? t('questions.finish') : t('questions.next');
}

function moveQuestion(step) {
  if (state.currentIndex + step >= state.filtered.length) {
    showResults();
    return;
  }
  state.currentIndex = Math.max(0, Math.min(state.filtered.length - 1, state.currentIndex + step));
  renderQuestion();
}

function showResults() {
  const details = state.filtered.map(q => {
    const selected = state.selections[q.path];
    const isCorrect = selected === q.correct;
    return { ...q, selected, isCorrect };
  });
  const correctCount = details.filter(d => d.isCorrect).length;
  const percent = state.filtered.length ? Math.round((correctCount / state.filtered.length) * 100) : 0;
  const attempt = {
    date: new Date().toISOString(),
    total: state.filtered.length,
    correct: correctCount,
    percent,
    details
  };
  state.attempts.push(attempt);
  localStorage.setItem('qa_attempts', JSON.stringify(state.attempts));

  const cards = details.map((d, idx) => `
    <div class="card mb-3 ${d.isCorrect ? 'border-success' : 'border-danger'}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">${t('sections.title')} ${idx + 1}</h6>
          <span class="badge ${d.isCorrect ? 'text-bg-success' : 'text-bg-danger'}">${d.isCorrect ? '✓' : '✗'}</span>
        </div>
        <p class="text-muted mb-1">${d.group}${d.sub_group ? ' / ' + d.sub_group : ''}</p>
        <img src="${d.path}" class="img-fluid rounded mb-2" alt="question image">
        <p class="mb-0"><strong>${t('questions.saved')}:</strong> ${d.selected || '-'}</p>
        <p class="mb-0"><strong>Correct:</strong> ${d.correct}</p>
      </div>
    </div>`).join('');

  dom.resultBody.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div>
        <div class="fs-4 fw-bold">${percent}%</div>
        <div class="text-muted">${correctCount}/${state.filtered.length}</div>
      </div>
      <button class="btn btn-outline-warning" id="addWrongToReview">${t('questions.flag')}</button>
    </div>
    ${cards}`;

  dom.resultBody.querySelector('#addWrongToReview').addEventListener('click', () => {
    details.filter(d => !d.isCorrect).forEach(d => pushToReview(d));
    showToast(t('questions.marked'));
    refreshAnalytics();
  });

  dom.resultModal.show();
  refreshAnalytics();
}

function addToReviewBox() {
  const q = state.filtered[state.currentIndex];
  if (!q) return;
  pushToReview({ ...q, selected: state.selections[q.path] });
  showToast(t('questions.marked'));
  refreshAnalytics();
}

function pushToReview(entry) {
  if (state.reviewBox.find(r => r.path === entry.path)) return;
  state.reviewBox.push({ ...entry, addedAt: new Date().toISOString() });
  localStorage.setItem('qa_review_box', JSON.stringify(state.reviewBox));
}

function showReviewBox() {
  if (!state.reviewBox.length) {
    dom.reviewBody.innerHTML = `<p class="text-muted mb-0">${t('questions.placeholder')}</p>`;
  } else {
    dom.reviewBody.innerHTML = state.reviewBox.map(r => `
      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            <span>${r.group}${r.sub_group ? ' / ' + r.sub_group : ''}</span>
            <small class="text-muted">${new Date(r.addedAt).toLocaleString()}</small>
          </div>
          <img src="${r.path}" class="img-fluid rounded my-2" alt="question image">
          <div class="small">${t('questions.saved')}: ${r.selected || '-'}</div>
          <div class="small">Correct: ${r.correct || '-'}</div>
        </div>
      </div>`).join('');
  }
  dom.reviewModal.show();
}

function refreshAnalytics() {
  const totalAttempts = state.attempts.length;
  const totalQuestions = state.attempts.reduce((acc, a) => acc + a.total, 0);
  const totalCorrect = state.attempts.reduce((acc, a) => acc + a.correct, 0);
  const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  dom.statAttempts.textContent = totalAttempts;
  dom.statAccuracy.textContent = `${accuracy}%`;
  dom.statReviewed.textContent = state.reviewBox.length;

  const groups = {};
  state.attempts.forEach(a => {
    a.details.forEach(d => {
      const key = d.group;
      groups[key] = groups[key] || { total: 0, correct: 0 };
      groups[key].total += 1;
      groups[key].correct += d.isCorrect ? 1 : 0;
    });
  });

  dom.groupStats.innerHTML = Object.entries(groups).map(([g, stats]) => {
    const percent = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    return `<div class="col-md-4">
      <div class="p-3 border rounded">
        <div class="fw-bold">${g}</div>
        <div class="text-muted small">${percent}% (${stats.correct}/${stats.total})</div>
      </div>
    </div>`;
  }).join('');
}

function updateSyncInfo() {
  if (!dom.syncInfo) return;
  if (!state.syncConfig) {
    dom.syncInfo.textContent = '...';
    return;
  }
  const enabled = state.sync.enabled;
  const account = state.sync.account || state.syncConfig.placeholder_account;
  dom.syncInfo.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <div class="fw-semibold">${enabled ? 'المزامنة مفعلة' : 'المزامنة متوقفة'}</div>
        <div class="text-muted">${account ? account : 'حساب مطلوب'}</div>
      </div>
      <button class="btn btn-sm ${enabled ? 'btn-outline-danger' : 'btn-outline-success'}" id="toggleSync">${enabled ? 'إيقاف' : 'تفعيل'}</button>
    </div>`;
  document.getElementById('toggleSync').addEventListener('click', () => {
    state.sync.enabled = !state.sync.enabled;
    localStorage.setItem('qa_sync', JSON.stringify(state.sync));
    updateSyncInfo();
  });
}

function resetStats() {
  state.attempts = [];
  localStorage.removeItem('qa_attempts');
  refreshAnalytics();
}

function preloadImages(list) {
  list.slice(0, 5).forEach(q => {
    if (state.cache.has(q.path)) return;
    const img = new Image();
    img.src = q.path;
    state.cache.set(q.path, true);
  });
}

function applyLanguage(lang) {
  state.language = lang;
  localStorage.setItem('qa_lang', lang);
  const isArabic = lang === 'ar';
  document.body.classList.toggle('ltr', !isArabic);
  document.documentElement.lang = isArabic ? 'ar' : 'en';
  document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  dom.langToggle.checked = lang === 'en';
  Object.entries(i18n[lang]).forEach(([key, value]) => {
    document.querySelectorAll(`[data-i18n="${key}"]`).forEach(el => el.textContent = value);
  });
  renderQuestion();
}

function toggleLanguage(checked) {
  applyLanguage(checked ? 'en' : 'ar');
}

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('qa_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  dom.themeToggle.checked = theme === 'dark';
}

function toggleTheme(checked) {
  applyTheme(checked ? 'dark' : 'light');
}

function t(key) {
  return i18n[state.language][key] || key;
}

function showToast(msg) {
  dom.toastBody.textContent = msg;
  dom.toastTime.textContent = new Date().toLocaleTimeString();
  dom.toast.show();
}
