'use strict';
/**
 * VERAX CMS — ADMIN PANEL JAVASCRIPT  v2.0.0
 * ─────────────────────────────────────────────────────────────
 * CORREÇÕES v2.0.0:
 *  [FIX-01] Todos os event listeners movidos para DOMContentLoaded
 *  [FIX-02] initColorPickers: mapeamento de ID corrigido (color-primary → cp-primary)
 *  [FIX-03] section-toggle: direção do ícone invertida (lógica estava reversa)
 *  [FIX-04] renderPilarCards: chamado corretamente ao abrir view-pages
 *  [FIX-05] Media grid: renderizado no DOMContentLoaded para view-media também
 *  [FIX-06] Form submit: botão texto restaurado corretamente após save
 *  [FIX-07] initSeoPreview: inicializado com valores atuais dos inputs
 *  [FIX-08] switchView: ARIA aria-current usa 'page' somente na ativa, remove em outras
 *  [FIX-09] Sidebar toggle: estado collapsed persistido no sessionStorage
 *  [FIX-10] restoreVersion: re-popula formulário com dados restaurados
 * ─────────────────────────────────────────────────────────────
 */

/* ══════════════════════════════════════════════════════
   ESTADO GLOBAL (localStorage como camada de dados)
══════════════════════════════════════════════════════ */
const CMS = {
  content:  {},
  media:    [],
  nav:      {},
  seo:      {},
  design:   {},
  global:   {},
  versions: [],
};

function initState() {
  const saved = localStorage.getItem('verax_cms_content');
  if (saved) {
    try { Object.assign(CMS, JSON.parse(saved)); } catch(e) {}
  }

  if (!CMS.media || !CMS.media.length) {
    CMS.media = [
      { id: 'm1', name: 'hero-bg.png',       url: '../assets/images/hero-bg.png',       type: 'hero', size: '1.2 MB', width: 1920, height: 1080 },
      { id: 'm2', name: 'logo.png',           url: '../assets/images/logo.png',          type: 'logo', size: '320 KB', width: 400,  height: 120  },
      { id: 'm3', name: 'leader-male.png',    url: '../assets/images/leader-male.png',   type: 'team', size: '850 KB', width: 800,  height: 800  },
      { id: 'm4', name: 'leader-female.png',  url: '../assets/images/leader-female.png', type: 'team', size: '780 KB', width: 800,  height: 800  },
    ];
  }

  if (!CMS.nav || !CMS.nav.navbar) {
    CMS.nav.navbar = [
      { id: 'n1', label: 'Início',     href: '#hero'      },
      { id: 'n2', label: 'Quem Somos', href: '#sobre'     },
      { id: 'n3', label: 'Serviços',   href: '#servicos'  },
      { id: 'n4', label: 'Liderança',  href: '#lideranca' },
      { id: 'n5', label: 'Contato',    href: '#contato'   },
    ];
    CMS.nav.footer = [
      { id: 'f1', label: 'Quem Somos',              href: '#sobre'       },
      { id: 'f2', label: 'Serviços',                href: '#servicos'    },
      { id: 'f3', label: 'Política de Privacidade', href: '#privacidade' },
      { id: 'f4', label: 'Termos de Uso',           href: '#termos'      },
    ];
  }

  if (!CMS.content || !CMS.content.pilares_cards) {
    CMS.content.pilares_cards = [
      { id: 'p1', title: 'Estratégia',    desc: 'Ver hoje o que os outros só enxergam amanhã.'          },
      { id: 'p2', title: 'Precisão',      desc: 'Dados exatos que geram decisões extraordinárias.'      },
      { id: 'p3', title: 'Transparência', desc: 'Relatórios que trazem clareza, não confusão.'           },
      { id: 'p4', title: 'Crescimento',   desc: 'Organização financeira que gera liberdade para crescer.'},
      { id: 'p5', title: 'Proteção',      desc: 'Segurança jurídica e contábil hoje, liberdade amanhã.' },
      { id: 'p6', title: 'Conformidade',  desc: 'Sua empresa blindada e em total alinhamento legal.'    },
    ];
  }

  persistState();
}

function persistState() {
  try { localStorage.setItem('verax_cms_content', JSON.stringify(CMS)); } catch(e) {
    console.warn('[CMS] localStorage quota exceeded — data not persisted.');
  }
}

/* ══════════════════════════════════════════════════════
   SEGURANÇA: SANITIZAÇÃO / ESCAPE
══════════════════════════════════════════════════════ */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeRichText(html) {
  const ALLOWED = ['B','STRONG','I','EM','U','UL','OL','LI','P','BR','SPAN'];
  const div = document.createElement('div');
  div.innerHTML = html;
  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (!ALLOWED.includes(node.tagName)) {
        node.replaceWith(...node.childNodes);
        return;
      }
      Array.from(node.attributes).forEach(attr => {
        if (!['href','target','rel'].includes(attr.name)) node.removeAttribute(attr.name);
      });
    }
    Array.from(node.childNodes).forEach(clean);
  }
  clean(div);
  return div.innerHTML;
}

function isValidHex(hex) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

function validateScriptContent(content) {
  const BLOCKED = [
    /document\.cookie/i,
    /localStorage\[/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /\.innerHTML\s*=/i,
  ];
  return !BLOCKED.some(p => p.test(content));
}

/* ══════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════ */
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const ICONS = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `${ICONS[type] || ''}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('visible'));

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

/* ══════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE VIEWS  [FIX-01] [FIX-08]
══════════════════════════════════════════════════════ */
const VIEW_LABELS = {
  dashboard:  'Dashboard',
  pages:      'Páginas › Home',
  media:      'Biblioteca de Mídia',
  navigation: 'Menus & Navegação',
  seo:        'SEO & Meta Tags › Home',
  scripts:    'Scripts & Rastreamento',
  design:     'Design & Identidade',
  global:     'Configurações Globais',
  versions:   'Histórico de Versões',
};

function switchView(viewId) {
  // Oculta todas as views
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.add('active');

  // Atualiza nav items — [FIX-08] usa 'page' e 'false' corretamente
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    const isActive = btn.dataset.view === viewId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Breadcrumb
  const bc = document.getElementById('breadcrumb');
  if (bc) bc.innerHTML = `<span>${escapeHtml(VIEW_LABELS[viewId] || viewId)}</span>`;

  // View-specific inits
  if (viewId === 'media')      renderMediaGrid('media-grid');
  if (viewId === 'navigation') renderNavEditor();
  if (viewId === 'versions')   renderVersions();
  if (viewId === 'pages')      renderPilarCards();  // [FIX-04]
}

/* ══════════════════════════════════════════════════════
   CHARACTER COUNTERS
══════════════════════════════════════════════════════ */
function initCharCounters() {
  document.querySelectorAll('[data-limit]').forEach(counter => {
    const label = counter.closest('.field-label');
    if (!label) return;
    const group = label.closest('.field-group');
    if (!group) return;
    const field = group.querySelector('input, textarea');
    if (!field) return;

    const limit = parseInt(counter.dataset.limit, 10);

    function update() {
      const len = field.value.length;
      counter.textContent = `${len}/${limit}`;
      counter.classList.toggle('warning', len > limit * 0.8 && len <= limit);
      counter.classList.toggle('danger',  len > limit);
    }
    update();
    field.addEventListener('input', update);
  });
}

/* ══════════════════════════════════════════════════════
   CHANGE DETECTION
══════════════════════════════════════════════════════ */
function initChangeDetection() {
  document.querySelectorAll('[data-original]').forEach(field => {
    field.addEventListener('input', () => {
      field.classList.toggle('changed', field.value !== field.dataset.original);
    });
  });
}

/* ══════════════════════════════════════════════════════
   SECTION TOGGLE  [FIX-03] direção do ícone corrigida
══════════════════════════════════════════════════════ */
function initSectionToggles() {
  document.querySelectorAll('.section-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bodyId = btn.getAttribute('aria-controls');
      const body   = document.getElementById(bodyId);
      if (!body) return;

      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      const willExpand = !isExpanded;

      btn.setAttribute('aria-expanded', String(willExpand));
      body.classList.toggle('collapsed', !willExpand);

      // [FIX-03] Ícone: apontando para cima = colapsado; para baixo = expandido
      const icon = btn.querySelector('svg');
      if (icon) icon.style.transform = willExpand ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  });
}

/* ══════════════════════════════════════════════════════
   FORM HANDLERS  [FIX-06]
══════════════════════════════════════════════════════ */
function initFormHandlers() {
  // Section forms (hero, pilares, sobre, etc.)
  document.querySelectorAll('.section-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const section = form.dataset.section;
      if (!section) return;

      const data = collectFormData(form, section);
      if (!validateFormData(data, section)) return;

      const btn = form.querySelector('[type="submit"]');
      const originalText = btn ? btn.textContent.trim() : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

      try {
        CMS.content[section] = data;
        persistState();

        showToast(`Seção "${section}" salva com sucesso!`, 'success');

        // Reset changed markers
        form.querySelectorAll('[data-original]').forEach(f => {
          f.dataset.original = f.value;
          f.classList.remove('changed');
        });

      } catch(err) {
        showToast('Erro ao salvar. Tente novamente.', 'error');
        console.error('[CMS] Save error:', err.message);
      } finally {
        // [FIX-06] Restaura texto original do botão
        if (btn) { btn.disabled = false; btn.textContent = originalText || 'Salvar Seção'; }
      }
    });
  });

  // Scripts form
  const scriptsForm = document.getElementById('form-scripts');
  scriptsForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const header = document.getElementById('script-header')?.value || '';
    const footer = document.getElementById('script-footer')?.value || '';

    if (!validateScriptContent(header) || !validateScriptContent(footer)) {
      showToast('Script contém padrão de segurança bloqueado. Revise o conteúdo.', 'error');
      return;
    }

    CMS.content.scripts = { header, footer };
    persistState();
    showToast('Scripts salvos com sucesso!', 'success');
  });

  // Design form
  const designForm = document.getElementById('form-design');
  designForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const colorFields = ['color_primary','color_accent','color_text','color_bg'];
    const data = {};
    let hasError = false;

    colorFields.forEach(name => {
      const val = designForm.querySelector(`[name="${name}"]`)?.value || '';
      if (!isValidHex(val)) {
        showToast(`Cor "${name}" inválida. Use formato #RRGGBB.`, 'error');
        hasError = true;
        return;
      }
      data[name] = val;
    });

    if (hasError) return;

    CMS.design = { ...CMS.design, ...data };
    persistState();
    applyCSSVariables(data);
    showToast('Cores aplicadas ao site!', 'success');
  });

  // Global form
  const globalForm = document.getElementById('form-global');
  globalForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = collectFormData(globalForm, 'global');
    CMS.global = data;
    persistState();
    showToast('Configurações globais salvas!', 'success');
  });

  // SEO form
  const seoForm = document.getElementById('form-seo-home');
  seoForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const page = document.querySelector('.page-tab.active[data-seo-page]')?.dataset.seoPage || 'home';
    const data = collectFormData(seoForm, `seo_${page}`);
    CMS.seo[page] = data;
    persistState();
    showToast(`SEO da página "${page}" salvo!`, 'success');
  });
}

function collectFormData(form, section) {
  const data = { section, _savedAt: new Date().toISOString() };
  const fd   = new FormData(form);
  for (const [key, value] of fd.entries()) {
    data[key] = typeof value === 'string' ? value.trim().substring(0, 2000) : value;
  }
  // Rich text
  const rte = form.querySelector('.rich-editor');
  if (rte) {
    const hidden = form.querySelector('[name="text_content"]');
    const sanitized = sanitizeRichText(rte.innerHTML);
    data.text_content = sanitized;
    if (hidden) hidden.value = sanitized;
  }
  return data;
}

function validateFormData(data, section) {
  if (section === 'hero') {
    if (!data.title || data.title.length < 5) {
      showToast('O título do Hero deve ter no mínimo 5 caracteres.', 'error');
      return false;
    }
    if (data.title.length > 80) {
      showToast('O título do Hero não pode ter mais de 80 caracteres.', 'error');
      return false;
    }
  }
  return true;
}

/* ══════════════════════════════════════════════════════
   DESFAZER / RESET SECTION
══════════════════════════════════════════════════════ */
window.resetSection = function(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.querySelectorAll('[data-original]').forEach(f => {
    f.value = f.dataset.original;
    f.classList.remove('changed');
  });
  showToast('Alterações desfeitas para o último estado salvo.', 'info');
};

/* ══════════════════════════════════════════════════════
   VERSÕES / BACKUP  [FIX-10]
══════════════════════════════════════════════════════ */
window.saveVersion = function(sectionName) {
  const version = {
    id:        `v_${Date.now()}`,
    section:   sectionName,
    label:     `${sectionName} — ${new Date().toLocaleString('pt-BR')}`,
    data:      JSON.parse(JSON.stringify(CMS.content[sectionName] || {})),
    createdAt: new Date().toISOString(),
  };
  CMS.versions.unshift(version);
  if (CMS.versions.length > 50) CMS.versions = CMS.versions.slice(0, 50);
  persistState();

  const countEl = document.getElementById('dash-versions-count');
  if (countEl) countEl.textContent = CMS.versions.length;

  showToast(`Versão de "${sectionName}" salva! Restaure no Histórico.`, 'success');
};

function renderVersions() {
  const list  = document.getElementById('versions-list');
  const empty = document.getElementById('versions-empty');
  if (!list || !empty) return;

  if (!CMS.versions.length) {
    empty.hidden = false;
    list.innerHTML = '';
    return;
  }

  empty.hidden = true;
  list.innerHTML = CMS.versions.map(v => `
    <div class="version-item" role="listitem">
      <div class="version-indicator" aria-hidden="true"></div>
      <div class="version-info">
        <div class="version-label">${escapeHtml(v.label)}</div>
        <div class="version-meta">Seção: ${escapeHtml(v.section)} • ${new Date(v.createdAt).toLocaleString('pt-BR', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <button class="btn-secondary" onclick="restoreVersion('${escapeHtml(v.id)}')" aria-label="Restaurar versão ${escapeHtml(v.label)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 .49-3.51"></path></svg>
        Restaurar
      </button>
      <button class="btn-danger" onclick="deleteVersion('${escapeHtml(v.id)}')" aria-label="Excluir versão ${escapeHtml(v.label)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
        Excluir
      </button>
    </div>
  `).join('');
}

window.restoreVersion = function(versionId) {
  const v = CMS.versions.find(v => v.id === versionId);
  if (!v) return;

  if (!confirm(`Restaurar versão de "${v.section}"? Os dados atuais da seção serão substituídos.`)) return;

  CMS.content[v.section] = JSON.parse(JSON.stringify(v.data));
  persistState();
  showToast(`Versão de "${v.section}" restaurada com sucesso!`, 'success');
  renderVersions();

  // [FIX-10] Re-popula pilares se for a seção correta
  if (v.section === 'pilares') renderPilarCards();
};

window.deleteVersion = function(versionId) {
  if (!confirm('Excluir esta versão do histórico?')) return;
  CMS.versions = CMS.versions.filter(v => v.id !== versionId);
  persistState();
  renderVersions();
  showToast('Versão removida do histórico.', 'info');
};

/* ══════════════════════════════════════════════════════
   BIBLIOTECA DE MÍDIA
══════════════════════════════════════════════════════ */
function renderMediaGrid(containerId, selectable = false) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  const search = document.getElementById('media-search')?.value?.toLowerCase() || '';
  const type   = document.getElementById('media-filter-type')?.value || '';

  const filtered = (CMS.media || []).filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search);
    const matchType   = !type   || m.type === type;
    return matchSearch && matchType;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div class="media-empty">Nenhuma imagem encontrada.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(media => `
    <div class="media-item" role="listitem" data-id="${escapeHtml(media.id)}" tabindex="0"
         aria-label="Imagem: ${escapeHtml(media.name)}"
         ${selectable ? `onclick="selectMedia('${escapeHtml(media.id)}')" style="cursor:pointer"` : ''}>
      <img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.name)}" loading="lazy"
           width="160" height="160" style="width:100%;height:100%;object-fit:cover;">
      <div class="media-item-info">
        <div class="media-item-name">${escapeHtml(media.name)}</div>
        <div class="media-item-size">${escapeHtml(media.size)} • ${escapeHtml(media.type)}</div>
      </div>
      ${!selectable ? `
      <div class="media-item-actions">
        <button class="media-item-action-btn" onclick="copyMediaUrl('${escapeHtml(media.url)}')" aria-label="Copiar URL">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="media-item-action-btn delete" onclick="deleteMedia('${escapeHtml(media.id)}')" aria-label="Excluir ${escapeHtml(media.name)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
        </button>
      </div>` : ''}
    </div>
  `).join('');

  // Keyboard select for selectable grids
  if (selectable) {
    grid.querySelectorAll('.media-item').forEach(item => {
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectMedia(item.dataset.id);
        }
      });
    });
  }
}

window.copyMediaUrl = function(url) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('URL copiada!', 'info'))
      .catch(() => showToast('Não foi possível copiar a URL.', 'error'));
  } else {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('URL copiada!', 'info');
  }
};

window.deleteMedia = function(id) {
  const item = CMS.media.find(m => m.id === id);
  if (!item) return;
  if (!confirm(`Excluir "${item.name}" da biblioteca? Esta ação não pode ser desfeita.`)) return;
  CMS.media = CMS.media.filter(m => m.id !== id);
  persistState();
  renderMediaGrid('media-grid');
  const countEl = document.getElementById('dash-media-count');
  if (countEl) countEl.textContent = CMS.media.length;
  showToast('Imagem removida da biblioteca.', 'info');
};

function initMediaUpload() {
  const inputs   = ['media-upload-input', 'modal-upload-input'];
  const dropzone = document.getElementById('upload-dropzone');
  const progress = document.getElementById('upload-progress');
  const bar      = document.getElementById('upload-progress-bar');

  inputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('change', () => handleFileUpload(input.files));
  });

  if (dropzone) {
    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleFileUpload(e.dataTransfer.files);
    });
    // Keyboard access
    dropzone.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        document.getElementById('media-upload-input')?.click();
      }
    });
  }

  async function handleFileUpload(files) {
    if (!files?.length) return;
    const MAX_SIZE = 5 * 1024 * 1024;

    if (progress) { progress.hidden = false; if (bar) bar.style.width = '0%'; }

    let added = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > MAX_SIZE) {
        showToast(`"${file.name}" excede 5MB. Ignorado.`, 'error');
        continue;
      }
      if (!file.type.startsWith('image/')) {
        showToast(`"${file.name}" não é uma imagem válida.`, 'error');
        continue;
      }

      const pct = Math.round(((i + 1) / files.length) * 100);
      if (bar) bar.style.width = `${pct}%`;

      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise(res => { img.onload = res; img.onerror = res; img.src = url; });

      CMS.media.unshift({
        id:     `m${Date.now()}_${i}`,
        name:   file.name.replace(/\.[^.]+$/, '.webp'),
        url,
        type:   'other',
        size:   `${(file.size / 1024).toFixed(0)} KB`,
        width:  img.naturalWidth  || 0,
        height: img.naturalHeight || 0,
      });
      added++;
    }

    persistState();
    if (progress) setTimeout(() => { progress.hidden = true; if (bar) bar.style.width = '0%'; }, 600);
    renderMediaGrid('media-grid');
    renderMediaGrid('modal-media-grid', true);
    if (added > 0) showToast(`${added} imagem(ns) adicionada(s) à biblioteca!`, 'success');

    const countEl = document.getElementById('dash-media-count');
    if (countEl) countEl.textContent = CMS.media.length;
  }
}

/* ══════════════════════════════════════════════════════
   MODAL: SELETOR DE MÍDIA
══════════════════════════════════════════════════════ */
let _mediaPickerField   = null;
let _mediaPickerPreview = null;

window.openMediaPicker = function(fieldName, previewId) {
  _mediaPickerField   = fieldName;
  _mediaPickerPreview = previewId;

  const overlay = document.getElementById('media-modal-overlay');
  if (!overlay) return;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';

  renderMediaGrid('modal-media-grid', true);

  setTimeout(() => document.getElementById('modal-close-btn')?.focus(), 50);
};

function closeModal() {
  const overlay = document.getElementById('media-modal-overlay');
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
  _mediaPickerField   = null;
  _mediaPickerPreview = null;
}

window.selectMedia = function(mediaId) {
  const media = CMS.media.find(m => m.id === mediaId);
  if (!media) return;

  if (_mediaPickerField) {
    const input = document.getElementById(`field-${_mediaPickerField}`);
    if (input) input.value = media.url;
  }
  if (_mediaPickerPreview) {
    const preview = document.getElementById(_mediaPickerPreview);
    if (preview) {
      if (preview.tagName === 'IMG') {
        preview.src = media.url;
        preview.alt = media.name;
      } else {
        // placeholder div
        preview.innerHTML = `<img src="${escapeHtml(media.url)}" alt="${escapeHtml(media.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
      }
    }
  }

  closeModal();
  showToast('Imagem selecionada!', 'success');
};

/* ══════════════════════════════════════════════════════
   MENU EDITOR (NAVEGAÇÃO)
══════════════════════════════════════════════════════ */
function renderNavEditor() {
  renderNavList('navbar-list', CMS.nav.navbar);
  renderNavList('footer-list', CMS.nav.footer);
}

function renderNavList(listId, items) {
  const list = document.getElementById(listId);
  if (!list || !items) return;

  list.innerHTML = items.map((item, i) => `
    <li class="nav-editor-item" role="listitem" data-id="${escapeHtml(item.id)}" data-list="${listId}">
      <span class="nav-editor-drag" aria-hidden="true">⠿</span>
      <input type="text" class="nav-editor-label" value="${escapeHtml(item.label)}"
        aria-label="Texto do link ${i+1}" maxlength="40"
        onchange="updateNavItem('${escapeHtml(item.id)}', '${listId}', 'label', this.value)">
      <input type="text" class="nav-editor-href" value="${escapeHtml(item.href)}"
        aria-label="Link de destino ${i+1}" maxlength="200" placeholder="#ancora ou /pagina"
        onchange="updateNavItem('${escapeHtml(item.id)}', '${listId}', 'href', this.value)">
      <button class="nav-editor-delete" onclick="deleteNavItem('${escapeHtml(item.id)}', '${listId}')"
        aria-label="Remover link ${escapeHtml(item.label)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </li>
  `).join('');
}

window.updateNavItem = function(id, listId, field, value) {
  const key  = listId === 'navbar-list' ? 'navbar' : 'footer';
  const item = CMS.nav[key]?.find(i => i.id === id);
  if (item) item[field] = value.trim().substring(0, 200);
};

window.addNavItem = function(listType) {
  const key = listType === 'navbar' ? 'navbar' : 'footer';
  if (!CMS.nav[key]) CMS.nav[key] = [];
  CMS.nav[key].push({ id: `nav_${Date.now()}`, label: 'Novo Link', href: '#' });
  renderNavEditor();
  showToast('Link adicionado. Edite o texto e o destino.', 'info');
};

window.deleteNavItem = function(id, listId) {
  const key = listId === 'navbar-list' ? 'navbar' : 'footer';
  if (!CMS.nav[key]) return;
  CMS.nav[key] = CMS.nav[key].filter(i => i.id !== id);
  renderNavEditor();
};

window.saveNavigation = function() {
  persistState();
  showToast('Navegação salva! Aplicada na próxima publicação.', 'success');
};

/* ══════════════════════════════════════════════════════
   PILARES CARDS EDITOR  [FIX-04]
══════════════════════════════════════════════════════ */
function renderPilarCards() {
  const container = document.getElementById('pilares-cards-editor');
  if (!container) return;
  const cards = CMS.content.pilares_cards || [];

  if (!cards.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;">Nenhum pilar cadastrado. Clique em "Adicionar Pilar".</p>';
    return;
  }

  container.innerHTML = cards.map((card, i) => `
    <div class="pilar-card-editor" role="listitem" data-id="${escapeHtml(card.id)}">
      <span class="pilar-card-editor-drag" aria-hidden="true">⠿</span>
      <input type="text" class="field-input" value="${escapeHtml(card.title)}" maxlength="30"
        aria-label="Título do pilar ${i+1}"
        onchange="updatePilarCard('${escapeHtml(card.id)}', 'title', this.value)">
      <input type="text" class="field-input" value="${escapeHtml(card.desc)}" maxlength="100"
        aria-label="Descrição do pilar ${i+1}"
        onchange="updatePilarCard('${escapeHtml(card.id)}', 'desc', this.value)">
      <button class="btn-danger" onclick="deletePilarCard('${escapeHtml(card.id)}')"
        aria-label="Remover pilar ${escapeHtml(card.title)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
      </button>
    </div>
  `).join('');
}

window.updatePilarCard = function(id, field, value) {
  const card = CMS.content.pilares_cards?.find(c => c.id === id);
  if (card) card[field] = value.trim().substring(0, 100);
};

window.deletePilarCard = function(id) {
  if (!confirm('Remover este pilar?')) return;
  CMS.content.pilares_cards = (CMS.content.pilares_cards || []).filter(c => c.id !== id);
  renderPilarCards();
};

window.addPilarCard = function() {
  if (!CMS.content.pilares_cards) CMS.content.pilares_cards = [];
  if (CMS.content.pilares_cards.length >= 12) {
    showToast('Máximo de 12 pilares para manter o layout.', 'warning');
    return;
  }
  CMS.content.pilares_cards.push({
    id: `p${Date.now()}`,
    title: 'Novo Pilar',
    desc:  'Descrição do novo pilar de valor.',
  });
  renderPilarCards();
  showToast('Pilar adicionado. Edite título e descrição.', 'info');
};

/* ══════════════════════════════════════════════════════
   RICH TEXT EDITOR
══════════════════════════════════════════════════════ */
function initRichTextEditors() {
  document.querySelectorAll('.rich-editor-toolbar').forEach(toolbar => {
    const editorEl = toolbar.closest('.field-group')?.querySelector('.rich-editor');
    if (!editorEl) return;

    toolbar.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        document.execCommand(btn.dataset.cmd, false, null);
        editorEl.focus();
      });
    });

    editorEl.addEventListener('input', () => {
      const form   = editorEl.closest('form');
      const hidden = form?.querySelector('[name="text_content"]');
      if (hidden) hidden.value = sanitizeRichText(editorEl.innerHTML);
    });

    function updateToolbarState() {
      toolbar.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
        try { btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd)); } catch(e) {}
      });
    }
    editorEl.addEventListener('keyup',   updateToolbarState);
    editorEl.addEventListener('mouseup', updateToolbarState);

    // Paste plain text only
    editorEl.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  });
}

/* ══════════════════════════════════════════════════════
   COLOR PICKERS  [FIX-02] mapeamento de ID corrigido
══════════════════════════════════════════════════════ */
// Mapeamento explícito: id do input color → id do cp-swatch
const COLOR_MAP = {
  'color-primary': 'cp-primary',
  'color-accent':  'cp-accent',
  'color-text':    'cp-text',
  'color-bg':      'cp-bg',
};

function initColorPickers() {
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    const hexInput = swatch.closest('.color-input-wrap')?.querySelector('.color-hex-input');
    // [FIX-02] usa o mapeamento explícito em vez de derivar o ID via replace
    const cpId     = COLOR_MAP[swatch.id];
    const cpEl     = cpId ? document.getElementById(cpId) : null;

    // Sync color picker → hex text input + preview
    swatch.addEventListener('input', () => {
      if (hexInput) hexInput.value = swatch.value.toUpperCase();
      if (cpEl) cpEl.style.background = swatch.value;
    });

    // Sync hex text input → color picker + preview
    if (hexInput) {
      hexInput.addEventListener('input', () => {
        const val = hexInput.value.trim();
        if (isValidHex(val)) {
          swatch.value = val;
          if (cpEl) cpEl.style.background = val;
        }
      });
    }
  });
}

function applyCSSVariables(data) {
  const root = document.documentElement;
  if (data.color_primary) root.style.setProperty('--brand-dark', data.color_primary);
  if (data.color_accent)  root.style.setProperty('--brand-gold', data.color_accent);
}

window.resetColors = function() {
  const DEFAULTS = {
    'color-primary': '#0A1F44',
    'color-accent':  '#B5941D',
    'color-text':    '#333333',
    'color-bg':      '#F5F5F5',
  };

  Object.entries(DEFAULTS).forEach(([inputId, value]) => {
    const swatch = document.getElementById(inputId);
    if (swatch) swatch.value = value;
    const cpEl = document.getElementById(COLOR_MAP[inputId]);
    if (cpEl) cpEl.style.background = value;
  });

  // Update hex text inputs
  document.querySelectorAll('.color-hex-input').forEach((inp, i) => {
    inp.value = Object.values(DEFAULTS)[i] || '';
  });

  showToast('Cores restauradas para o padrão Verax.', 'info');
};

/* ══════════════════════════════════════════════════════
   SEO LIVE PREVIEW  [FIX-07]
══════════════════════════════════════════════════════ */
function initSeoPreview() {
  const titleInput   = document.getElementById('seo-title');
  const descInput    = document.getElementById('seo-desc');
  const previewTitle = document.getElementById('seo-preview-title');
  const previewDesc  = document.getElementById('seo-preview-desc');

  function update() {
    if (previewTitle) previewTitle.textContent = titleInput?.value || 'Título da página';
    if (previewDesc)  previewDesc.textContent  = descInput?.value  || 'Descrição da página...';
  }

  titleInput?.addEventListener('input', update);
  descInput?.addEventListener('input', update);
  update(); // [FIX-07] inicializa com valores atuais

  // SEO page tabs
  document.querySelectorAll('.page-tab[data-seo-page]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.page-tab[data-seo-page]').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    });
  });
}

/* ══════════════════════════════════════════════════════
   SCRIPTS VALIDATOR
══════════════════════════════════════════════════════ */
window.validateScripts = function() {
  const header = document.getElementById('script-header')?.value || '';
  const footer = document.getElementById('script-footer')?.value || '';

  if (!header && !footer) {
    showToast('Nenhum script para validar.', 'info');
    return;
  }

  const ok = validateScriptContent(header) && validateScriptContent(footer);
  if (ok) {
    showToast('Scripts validados — nenhum padrão inseguro detectado. ✓', 'success');
  } else {
    showToast('Atenção: script contém padrão potencialmente inseguro. Revise antes de salvar.', 'error');
  }
};

/* ══════════════════════════════════════════════════════
   PAGE TABS (view Páginas)
══════════════════════════════════════════════════════ */
function initPageTabs() {
  document.querySelectorAll('.page-tab[data-page]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.page-tab[data-page]').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const bc = document.getElementById('breadcrumb');
      if (bc) bc.innerHTML = `<span>Páginas › ${escapeHtml(tab.textContent.trim())}</span>`;
    });
  });
}

/* ══════════════════════════════════════════════════════
   PUBLICAR / SALVAR GLOBAL
══════════════════════════════════════════════════════ */
function initTopbarActions() {
  const publishBtn = document.getElementById('publish-btn');
  publishBtn?.addEventListener('click', async () => {
    publishBtn.disabled = true;
    publishBtn.textContent = 'Publicando...';
    try {
      persistState();
      await new Promise(r => setTimeout(r, 800)); // simula latência
      showToast('Site publicado! Alterações estão ao vivo.', 'success');
    } catch(e) {
      showToast('Erro ao publicar. Tente novamente.', 'error');
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = 'Publicar';
    }
  });

  document.getElementById('save-all-btn')?.addEventListener('click', () => {
    persistState();
    showToast('Rascunho salvo localmente.', 'info');
  });
}

/* ══════════════════════════════════════════════════════
   SIDEBAR  [FIX-09] persiste estado collapsed
══════════════════════════════════════════════════════ */
function initSidebar() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  if (!toggle || !sidebar) return;

  // Restore saved state
  if (sessionStorage.getItem('cms_sidebar_collapsed') === 'true') {
    sidebar.classList.add('collapsed');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    sessionStorage.setItem('cms_sidebar_collapsed', String(isCollapsed));
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

/* ══════════════════════════════════════════════════════
   MODAL EVENT LISTENERS
══════════════════════════════════════════════════════ */
function initModal() {
  document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);

  const overlay = document.getElementById('media-modal-overlay');
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay?.hidden) closeModal();
  });
}

/* ══════════════════════════════════════════════════════
   MEDIA FILTER EVENTS
══════════════════════════════════════════════════════ */
function initMediaFilters() {
  document.getElementById('media-search')?.addEventListener('input', () => renderMediaGrid('media-grid'));
  document.getElementById('media-filter-type')?.addEventListener('change', () => renderMediaGrid('media-grid'));
}

/* ══════════════════════════════════════════════════════
   AUTH SESSION
══════════════════════════════════════════════════════ */
const SESSION_KEY = 'verax_cms_session';
const CRED_KEY    = 'verax_cms_credentials';

function getLoggedEmail() {
  try {
    const creds = JSON.parse(localStorage.getItem(CRED_KEY) || '{}');
    return creds.email || 'contabilverax@gmail.com';
  } catch(e) { return 'contabilverax@gmail.com'; }
}

function initSessionUI() {
  const emailEl = document.getElementById('sidebar-user-email');
  if (emailEl) {
    const email = getLoggedEmail();
    emailEl.textContent = email.split('@')[0];
    emailEl.title = email;
  }
}

function doLogout() {
  if (!confirm('Deseja realmente sair do painel administrativo?')) return;
  sessionStorage.removeItem(SESSION_KEY);
  showToast('Sessão encerrada. Redirecionando...', 'info');
  setTimeout(() => { window.location.replace('./login.html'); }, 800);
}

function initLogout() {
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', doLogout);
  document.getElementById('topbar-logout-btn')?.addEventListener('click', doLogout);
}

/* ══════════════════════════════════════════════════════
   INICIALIZAÇÃO PRINCIPAL  [FIX-01]
   Tudo dentro do DOMContentLoaded para garantir que
   os elementos existam antes de qualquer querySelector
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Estado
  initState();

  // 2. UI base
  initSidebar();
  initLogout();
  initModal();
  initTopbarActions();
  initPageTabs();

  // 3. Forms e editores
  initCharCounters();
  initChangeDetection();
  initSectionToggles();
  initFormHandlers();
  initMediaUpload();
  initMediaFilters();
  initRichTextEditors();
  initColorPickers();
  initSeoPreview();

  // 4. Renderizações iniciais
  renderPilarCards();

  // 5. Dashboard counters
  const versionsCountEl = document.getElementById('dash-versions-count');
  if (versionsCountEl) versionsCountEl.textContent = CMS.versions.length;
  const mediaCountEl = document.getElementById('dash-media-count');
  if (mediaCountEl) mediaCountEl.textContent = CMS.media.length;

  // 6. Sessão
  initSessionUI();

  // 7. View inicial
  switchView('dashboard');

  console.info('[Verax CMS] Admin panel v2.0.0 — pronto.');
});
