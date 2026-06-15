'use strict';
/**
 * VERAX CMS — ADMIN PANEL JAVASCRIPT
 * Módulos: Views, Forms, Media Library, Nav Editor,
 *          Rich Text, Color Sync, Versions, Toast, Modal
 */

/* ══════════════════════════════════════════════════════
   ESTADO GLOBAL (simula banco de dados localStorage)
══════════════════════════════════════════════════════ */
const CMS = {
  content: {},    // conteúdo das seções
  media: [],      // biblioteca de mídias
  nav: {},        // menus
  seo: {},        // SEO por página
  design: {},     // cores e logos
  global: {},     // configs globais
  versions: [],   // histórico de versões
};

// Inicializa estado a partir do localStorage
function initState() {
  const saved = localStorage.getItem('verax_cms_content');
  if (saved) {
    try { Object.assign(CMS, JSON.parse(saved)); } catch(e) {}
  }

  // Estado padrão se vazio
  if (!CMS.media.length) {
    CMS.media = [
      { id: 'm1', name: 'hero-bg.png',        url: '../assets/images/hero-bg.png',       type: 'hero',  size: '1.2 MB', width: 1920, height: 1080 },
      { id: 'm2', name: 'logo.png',           url: '../assets/images/logo.png',          type: 'logo',  size: '320 KB', width: 400,  height: 120  },
      { id: 'm3', name: 'leader-male.png',    url: '../assets/images/leader-male.png',   type: 'team',  size: '850 KB', width: 800,  height: 800  },
      { id: 'm4', name: 'leader-female.png',  url: '../assets/images/leader-female.png', type: 'team',  size: '780 KB', width: 800,  height: 800  },
    ];
  }

  if (!CMS.nav.navbar) {
    CMS.nav.navbar = [
      { id: 'n1', label: 'Início',      href: '#hero' },
      { id: 'n2', label: 'Quem Somos',  href: '#sobre' },
      { id: 'n3', label: 'Serviços',    href: '#servicos' },
      { id: 'n4', label: 'Liderança',   href: '#lideranca' },
      { id: 'n5', label: 'Contato',     href: '#contato' },
    ];
    CMS.nav.footer = [
      { id: 'f1', label: 'Quem Somos',              href: '#sobre' },
      { id: 'f2', label: 'Serviços',                href: '#servicos' },
      { id: 'f3', label: 'Política de Privacidade', href: '#privacidade' },
      { id: 'f4', label: 'Termos de Uso',           href: '#termos' },
    ];
  }

  if (!CMS.content.pilares_cards) {
    CMS.content.pilares_cards = [
      { id: 'p1', title: 'Estratégia',    desc: 'Ver hoje o que os outros só enxergam amanhã.' },
      { id: 'p2', title: 'Precisão',      desc: 'Dados exatos que geram decisões extraordinárias.' },
      { id: 'p3', title: 'Transparência', desc: 'Relatórios que trazem clareza, não confusão.' },
      { id: 'p4', title: 'Crescimento',   desc: 'Organização financeira que gera liberdade para crescer.' },
      { id: 'p5', title: 'Proteção',      desc: 'Segurança jurídica e contábil hoje, liberdade amanhã.' },
      { id: 'p6', title: 'Conformidade',  desc: 'Sua empresa blindada e em total alinhamento legal.' },
    ];
  }

  persistState();
}

function persistState() {
  try { localStorage.setItem('verax_cms_content', JSON.stringify(CMS)); } catch(e) {}
}

/* ══════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE VIEWS
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
  // Views
  document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.add('active');

  // Nav items
  document.querySelectorAll('.nav-item').forEach(btn => {
    const isActive = btn.dataset.view === viewId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Breadcrumb
  const bc = document.getElementById('breadcrumb');
  if (bc) bc.innerHTML = `<span>${VIEW_LABELS[viewId] || viewId}</span>`;

  // View-specific init
  if (viewId === 'media')      renderMediaGrid('media-grid');
  if (viewId === 'navigation') renderNavEditor();
  if (viewId === 'versions')   renderVersions();
  if (viewId === 'pages')      renderPilarCards();
}

// Wire nav buttons
document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Sidebar toggle
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('admin-sidebar');
sidebarToggle?.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  const expanded = !sidebar.classList.contains('collapsed');
  sidebarToggle.setAttribute('aria-expanded', expanded);
});

/* ══════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════════════════════ */
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `${icons[type] || ''}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════════════════════
   SECURITY: SANITIZAÇÃO / ESCAPE
══════════════════════════════════════════════════════ */
/**
 * Escapa HTML para prevenir XSS em inserções de texto.
 * NUNCA usar innerHTML com dados do usuário — sempre escapeHtml() primeiro.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitiza Rich Text retornado pelo contenteditable.
 * Remove tags não permitidas, mantém: b, i, u, ul, ol, li, p, br.
 */
function sanitizeRichText(html) {
  const allowed = ['B','STRONG','I','EM','U','UL','OL','LI','P','BR','SPAN'];
  const div = document.createElement('div');
  div.innerHTML = html;

  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (!allowed.includes(node.tagName)) {
        // Replace with text content
        node.replaceWith(...node.childNodes);
        return;
      }
      // Remove all attributes except safe ones
      Array.from(node.attributes).forEach(attr => {
        if (!['href', 'target', 'rel'].includes(attr.name)) {
          node.removeAttribute(attr.name);
        }
      });
    }
    Array.from(node.childNodes).forEach(clean);
  }
  clean(div);
  return div.innerHTML;
}

/**
 * Valida se o valor de cor hex é seguro.
 */
function isValidHex(hex) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

/**
 * Sanitiza scripts antes de salvar — bloqueia padrões perigosos.
 * Permite apenas tags <script src="..."> de domínios conhecidos e código inline básico.
 */
function validateScriptContent(content) {
  const DANGEROUS_PATTERNS = [
    /document\.cookie/i,
    /localStorage\[/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /\.innerHTML\s*=/i,
    /fetch\s*\(['"]\s*(?!https:\/\/(www\.)?(?:google|googletagmanager|meta|facebook|hotjar|clarity))/i,
  ];
  return !DANGEROUS_PATTERNS.some(p => p.test(content));
}

/* ══════════════════════════════════════════════════════
   CHARACTER COUNTERS
══════════════════════════════════════════════════════ */
function initCharCounters() {
  document.querySelectorAll('[data-limit]').forEach(counter => {
    // Find the associated input/textarea
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
   CHANGE DETECTION (marca campos modificados)
══════════════════════════════════════════════════════ */
function initChangeDetection() {
  document.querySelectorAll('[data-original]').forEach(field => {
    field.addEventListener('input', () => {
      field.classList.toggle('changed', field.value !== field.dataset.original);
    });
  });
}

/* ══════════════════════════════════════════════════════
   SECTION TOGGLE (expand/collapse)
══════════════════════════════════════════════════════ */
function initSectionToggles() {
  document.querySelectorAll('.section-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bodyId = btn.getAttribute('aria-controls');
      const body   = document.getElementById(bodyId);
      if (!body) return;

      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !isExpanded);
      body.classList.toggle('collapsed', isExpanded);

      // Rotate icon
      const icon = btn.querySelector('svg');
      if (icon) icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    });
  });
}

/* ══════════════════════════════════════════════════════
   FORM SUBMIT HANDLERS
══════════════════════════════════════════════════════ */
function initFormHandlers() {
  document.querySelectorAll('.section-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const section = form.dataset.section;
      const data    = collectFormData(form, section);

      if (!validateFormData(data, section)) return;

      const btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

      try {
        // Persist to local state + localStorage
        CMS.content[section] = data;
        persistState();

        // --- BACKEND INTEGRATION POINT ---
        // await fetch(`/api/cms/sections/${section}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        //   body: JSON.stringify(data),
        // });

        showToast(`Seção "${section}" salva com sucesso!`, 'success');

        // Update changed markers
        form.querySelectorAll('[data-original]').forEach(f => {
          f.dataset.original = f.value;
          f.classList.remove('changed');
        });

      } catch(err) {
        showToast('Erro ao salvar. Verifique a conexão.', 'error');
        console.error('[CMS] Save error:', err.message);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Salvar Seção'; }
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
      showToast('Script contém padrão de segurança bloqueado. Verifique o conteúdo.', 'error');
      return;
    }

    CMS.content.scripts = { header, footer };
    persistState();
    showToast('Scripts salvos e serão aplicados na próxima publicação.', 'success');
  });

  // Design form
  const designForm = document.getElementById('form-design');
  designForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {};
    ['color_primary','color_accent','color_text','color_bg'].forEach(name => {
      const val = designForm.querySelector(`[name="${name}"]`)?.value || '';
      if (!isValidHex(val)) {
        showToast(`Cor "${name}" inválida. Use formato #RRGGBB.`, 'error');
        return;
      }
      data[name] = val;
    });

    CMS.design = { ...CMS.design, ...data };
    persistState();
    applyCSSVariables(data);
    showToast('Cores aplicadas ao site com sucesso!', 'success');
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
    showToast('SEO salvo para esta página!', 'success');
  });
}

function collectFormData(form, section) {
  const data = { section, _savedAt: new Date().toISOString() };
  const fd   = new FormData(form);
  for (const [key, value] of fd.entries()) {
    data[key] = typeof value === 'string' ? value.trim().substring(0, 2000) : value;
  }
  // Rich text (contenteditable)
  const rte = form.querySelector('.rich-editor');
  if (rte) {
    const hiddenInput = form.querySelector('[name="text_content"]');
    const sanitized   = sanitizeRichText(rte.innerHTML);
    data.text_content = sanitized;
    if (hiddenInput) hiddenInput.value = sanitized;
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
   DESFAZER (RESET SECTION)
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
   VERSÕES / BACKUP
══════════════════════════════════════════════════════ */
window.saveVersion = function(sectionName) {
  const version = {
    id:        `v_${Date.now()}`,
    section:   sectionName,
    label:     `${sectionName} — ${new Date().toLocaleString('pt-BR')}`,
    data:      JSON.parse(JSON.stringify(CMS.content[sectionName] || {})),
    createdAt: new Date().toISOString(),
  };
  CMS.versions.unshift(version); // newest first
  if (CMS.versions.length > 50) CMS.versions = CMS.versions.slice(0, 50); // max 50
  persistState();

  const countEl = document.getElementById('dash-versions-count');
  if (countEl) countEl.textContent = CMS.versions.length;

  showToast(`Versão de "${sectionName}" salva! Você pode restaurá-la no histórico.`, 'success');
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
        <div class="version-meta">Seção: ${escapeHtml(v.section)} • ${new Date(v.createdAt).toLocaleDateString('pt-BR', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
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
  CMS.content[v.section] = v.data;
  persistState();
  showToast(`Versão de "${v.section}" restaurada com sucesso!`, 'success');
  renderVersions();
};

window.deleteVersion = function(versionId) {
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

  const filtered = CMS.media.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search);
    const matchType   = !type || m.type === type;
    return matchSearch && matchType;
  });

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);font-size:0.8rem;">Nenhuma imagem encontrada.</div>`;
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
        <button class="media-item-action-btn" onclick="copyMediaUrl('${escapeHtml(media.url)}')" aria-label="Copiar URL da imagem">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="media-item-action-btn delete" onclick="deleteMedia('${escapeHtml(media.id)}')" aria-label="Excluir imagem ${escapeHtml(media.name)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
        </button>
      </div>` : ''}
    </div>
  `).join('');
}

window.copyMediaUrl = function(url) {
  navigator.clipboard?.writeText(url).then(() => showToast('URL copiada para a área de transferência!', 'info'));
};

window.deleteMedia = function(id) {
  if (!confirm('Excluir esta imagem da biblioteca? Esta ação não pode ser desfeita.')) return;
  CMS.media = CMS.media.filter(m => m.id !== id);
  persistState();
  renderMediaGrid('media-grid');
  const countEl = document.getElementById('dash-media-count');
  if (countEl) countEl.textContent = CMS.media.length;
  showToast('Imagem removida da biblioteca.', 'info');
};

// Upload handler (simula conversão WebP + compressão)
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

  // Drag & Drop
  if (dropzone) {
    dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      handleFileUpload(e.dataTransfer.files);
    });
  }

  async function handleFileUpload(files) {
    if (!files?.length) return;
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (progress) { progress.hidden = false; bar.style.width = '0%'; }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate
      if (file.size > MAX_SIZE) {
        showToast(`"${file.name}" excede 5MB. Upload ignorado.`, 'error');
        continue;
      }
      if (!file.type.startsWith('image/')) {
        showToast(`"${file.name}" não é uma imagem válida.`, 'error');
        continue;
      }

      // Simulate upload progress
      const pct = Math.round(((i + 1) / files.length) * 100);
      if (bar) bar.style.width = `${pct}%`;

      // Create object URL (in production, this would be a server URL after WebP conversion)
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = url; });

      const mediaItem = {
        id:     `m${Date.now()}_${i}`,
        name:   file.name.replace(/\.[^.]+$/, '.webp'), // simulate WebP conversion
        url,
        type:   'other',
        size:   `${(file.size / 1024).toFixed(0)} KB`,
        width:  img.naturalWidth,
        height: img.naturalHeight,
      };
      CMS.media.unshift(mediaItem);
    }

    persistState();
    if (progress) setTimeout(() => { progress.hidden = true; bar.style.width = '0%'; }, 500);
    renderMediaGrid('media-grid');
    renderMediaGrid('modal-media-grid', true);
    showToast(`${files.length} imagem(ns) adicionada(s) à biblioteca.`, 'success');

    const countEl = document.getElementById('dash-media-count');
    if (countEl) countEl.textContent = CMS.media.length;
  }
}

// Media filter events
document.getElementById('media-search')?.addEventListener('input', () => renderMediaGrid('media-grid'));
document.getElementById('media-filter-type')?.addEventListener('change', () => renderMediaGrid('media-grid'));

/* ══════════════════════════════════════════════════════
   MEDIA PICKER MODAL
══════════════════════════════════════════════════════ */
let _mediaPickerField   = null; // field name to write to
let _mediaPickerPreview = null; // preview img element ID

window.openMediaPicker = function(fieldName, previewId) {
  _mediaPickerField   = fieldName;
  _mediaPickerPreview = previewId;

  const overlay = document.getElementById('media-modal-overlay');
  overlay.hidden = false;
  overlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';

  renderMediaGrid('modal-media-grid', true);

  // Focus trap
  setTimeout(() => {
    document.getElementById('modal-close-btn')?.focus();
  }, 50);
};

function closeModal() {
  const overlay = document.getElementById('media-modal-overlay');
  overlay.hidden = true;
  document.body.style.overflow = '';
  _mediaPickerField   = null;
  _mediaPickerPreview = null;
}

window.selectMedia = function(mediaId) {
  const media = CMS.media.find(m => m.id === mediaId);
  if (!media) return;

  // Update hidden input
  if (_mediaPickerField) {
    const input = document.getElementById(`field-${_mediaPickerField}`);
    if (input) input.value = media.url;
  }
  // Update preview
  if (_mediaPickerPreview) {
    const preview = document.getElementById(_mediaPickerPreview);
    if (preview && preview.tagName === 'IMG') {
      preview.src = media.url;
      preview.alt = media.name;
    }
  }

  closeModal();
  showToast('Imagem selecionada com sucesso!', 'success');
};

document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
document.getElementById('media-modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('media-modal-overlay')) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('media-modal-overlay')?.hidden) closeModal();
});

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
  const key  = listType === 'navbar' ? 'navbar' : 'footer';
  const id   = `nav_${Date.now()}`;
  CMS.nav[key].push({ id, label: 'Novo Link', href: '#' });
  renderNavEditor();
  showToast('Link adicionado. Edite o texto e o destino.', 'info');
};

window.deleteNavItem = function(id, listId) {
  const key = listId === 'navbar-list' ? 'navbar' : 'footer';
  CMS.nav[key] = CMS.nav[key].filter(i => i.id !== id);
  renderNavEditor();
};

window.saveNavigation = function() {
  persistState();
  showToast('Navegação salva! Será aplicada na próxima publicação.', 'success');
};

/* ══════════════════════════════════════════════════════
   PILARES CARDS EDITOR
══════════════════════════════════════════════════════ */
function renderPilarCards() {
  const container = document.getElementById('pilares-cards-editor');
  if (!container) return;
  const cards = CMS.content.pilares_cards || [];

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
  CMS.content.pilares_cards = (CMS.content.pilares_cards || []).filter(c => c.id !== id);
  renderPilarCards();
};

window.addPilarCard = function() {
  if (!CMS.content.pilares_cards) CMS.content.pilares_cards = [];
  if (CMS.content.pilares_cards.length >= 12) {
    showToast('Máximo de 12 pilares permitido para manter o layout.', 'warning');
    return;
  }
  CMS.content.pilares_cards.push({
    id: `p${Date.now()}`,
    title: 'Novo Pilar',
    desc: 'Descrição do novo pilar de valor.',
  });
  renderPilarCards();
  showToast('Pilar adicionado. Edite título e descrição.', 'info');
};

/* ══════════════════════════════════════════════════════
   RICH TEXT EDITOR (minimal contenteditable)
══════════════════════════════════════════════════════ */
function initRichTextEditors() {
  document.querySelectorAll('.rich-editor-toolbar').forEach(toolbar => {
    const editorId = toolbar.closest('.field-group')?.querySelector('.rich-editor')?.id;
    const editor   = editorId ? document.getElementById(editorId) : null;
    if (!editor) return;

    toolbar.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent blur
        document.execCommand(btn.dataset.cmd, false, null);
        editor.focus();
      });
    });

    // Sync to hidden input on input
    editor.addEventListener('input', () => {
      const form   = editor.closest('form');
      const hidden = form?.querySelector('[name="text_content"]');
      if (hidden) hidden.value = sanitizeRichText(editor.innerHTML);
    });

    // Update toolbar active states
    editor.addEventListener('keyup', updateToolbarState);
    editor.addEventListener('mouseup', updateToolbarState);

    function updateToolbarState() {
      toolbar.querySelectorAll('.rte-btn[data-cmd]').forEach(btn => {
        try { btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd)); } catch(e) {}
      });
    }

    // Prevent pasting of rich HTML from outside (security)
    editor.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  });
}

/* ══════════════════════════════════════════════════════
   COLOR DESIGN TOKENS
══════════════════════════════════════════════════════ */
function initColorPickers() {
  // Sync color picker <-> hex input
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    const hexInput = swatch.closest('.color-input-wrap')?.querySelector('.color-hex-input');
    const cpId     = swatch.id;
    const cpEl     = document.getElementById(`cp-${cpId.replace('color-', '')}`);

    swatch.addEventListener('input', () => {
      if (hexInput) hexInput.value = swatch.value.toUpperCase();
      if (cpEl) cpEl.style.background = swatch.value;
    });

    if (hexInput) {
      hexInput.addEventListener('input', () => {
        const val = hexInput.value;
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

  // In production: inject a <style> tag into the public site's <head>
  // with the CSS variables, or update a CSS file via API
}

window.resetColors = function() {
  document.getElementById('color-primary').value = '#0A1F44';
  document.getElementById('color-accent').value  = '#B5941D';
  document.getElementById('color-text').value    = '#333333';
  document.getElementById('color-bg').value      = '#F5F5F5';
  ['cp-primary','cp-accent','cp-text','cp-bg'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = ['#0A1F44','#B5941D','#333333','#F5F5F5'][i];
  });
  document.querySelectorAll('.color-hex-input').forEach((inp, i) => {
    inp.value = ['#0A1F44','#B5941D','#333333','#F5F5F5'][i];
  });
  showToast('Cores restauradas para o padrão Verax.', 'info');
};

/* ══════════════════════════════════════════════════════
   SEO LIVE PREVIEW
══════════════════════════════════════════════════════ */
function initSeoPreview() {
  const titleInput = document.getElementById('seo-title');
  const descInput  = document.getElementById('seo-desc');
  const previewTitle = document.getElementById('seo-preview-title');
  const previewDesc  = document.getElementById('seo-preview-desc');

  function update() {
    if (titleInput && previewTitle) previewTitle.textContent = titleInput.value || 'Título da página';
    if (descInput  && previewDesc)  previewDesc.textContent  = descInput.value  || 'Descrição da página...';
  }

  titleInput?.addEventListener('input', update);
  descInput?.addEventListener('input', update);

  // SEO page tabs
  document.querySelectorAll('.page-tab[data-seo-page]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.page-tab[data-seo-page]').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
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

  const allClear = validateScriptContent(header) && validateScriptContent(footer);
  if (allClear) {
    showToast('Scripts validados — nenhum padrão de segurança detectado. ✓', 'success');
  } else {
    showToast('Atenção: script contém padrão potencialmente inseguro. Revise antes de salvar.', 'error');
  }
};

/* ══════════════════════════════════════════════════════
   PUBLICAR (Global Save + Deploy)
══════════════════════════════════════════════════════ */
document.getElementById('publish-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('publish-btn');
  btn.disabled = true;
  btn.textContent = 'Publicando...';

  try {
    persistState();
    // --- BACKEND INTEGRATION ---
    // await fetch('/api/cms/publish', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    showToast('Site publicado com sucesso! Alterações estão ao vivo.', 'success');
  } catch(e) {
    showToast('Erro ao publicar. Tente novamente.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publicar';
  }
});

document.getElementById('save-all-btn')?.addEventListener('click', () => {
  persistState();
  showToast('Rascunho salvo localmente.', 'info');
});

/* ══════════════════════════════════════════════════════
   PAGE TABS (Páginas view)
══════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════
   INICIALIZAÇÃO
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initState();
  initCharCounters();
  initChangeDetection();
  initSectionToggles();
  initFormHandlers();
  initMediaUpload();
  initRichTextEditors();
  initColorPickers();
  initSeoPreview();
  renderPilarCards();

  // Update dashboard count
  const countEl = document.getElementById('dash-versions-count');
  if (countEl) countEl.textContent = CMS.versions.length;
  const mediaCountEl = document.getElementById('dash-media-count');
  if (mediaCountEl) mediaCountEl.textContent = CMS.media.length;

  // Display logged-in email
  initSessionUI();

  // Start on dashboard
  switchView('dashboard');

  console.info('[Verax CMS] Admin panel initialized. Version 1.0.0');
});

/* ══════════════════════════════════════════════════════
   AUTH SESSION MODULE
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
  // Show email in sidebar
  const emailEl = document.getElementById('sidebar-user-email');
  if (emailEl) {
    const email = getLoggedEmail();
    // Show only the part before @ for space reasons
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

// Wire logout buttons
document.getElementById('sidebar-logout-btn')?.addEventListener('click', doLogout);
document.getElementById('topbar-logout-btn')?.addEventListener('click', doLogout);
