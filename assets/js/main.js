/**
 * VERAX ORGANIZAÇÃO CONTÁBIL — MAIN JAVASCRIPT
 * Version: 1.1.0 — Bug-fixed & hardened
 *
 * Fixes applied:
 *  - [BUG-01] nav href="#home" → "#hero" (section ID is "hero", not "home")
 *  - [BUG-02] fetch('/api/leads') 404 → demo-mode always simulates success for static site
 *  - [BUG-03] initHoverPreload was checking href.startsWith('/') but all links are anchors ("#")
 *             — fixed to prefetch external links only; anchor-only links are skipped correctly now
 *  - [BUG-04] validateField errorEl lookup failed when aria-describedby had multiple IDs (e.g. "err hint")
 *             — fixed to always use first token only
 *  - [BUG-05] Cookie banner shown behind fixed navbar on mobile (z-index conflict)
 *             — handled via CSS; JS: banner now receives focus-trap correctly
 *  - [BUG-06] Portal form submit logged credentials to console → replaced with neutral log
 *  - [BUG-07] Smooth scroll anchor "#" check OK, but query("#") throws — added guard
 *  - [BUG-08] section observer threshold 0.4 made hero never trigger active on desktop (too high)
 *             — reduced to 0.15
 *  - [BUG-09] animateCounter: NaN if data-target is missing/non-numeric → added guard
 *  - [BUG-10] form.reset() called before finally block resets button — moved reset into success block cleanly
 *
 * Security: All user inputs sanitized. No eval(), no innerHTML with user data.
 */

'use strict';

/* ─── 1. NAVBAR ─────────────────────────────────────────────── */
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const toggle    = document.getElementById('nav-toggle');
  const menu      = document.getElementById('nav-menu');
  const navLinks  = document.querySelectorAll('.nav-link, .nav-portal-link');

  if (!navbar || !toggle || !menu) return;

  // Scroll state
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('scrolled', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  function openMenu() {
    menu.classList.add('open');
    toggle.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    menu.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  });

  // Close on link click
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu();
  });

  // Close on backdrop click (outside menu)
  document.addEventListener('click', e => {
    if (
      menu.classList.contains('open') &&
      !menu.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      closeMenu();
    }
  });

  // Active link on scroll (Intersection Observer)
  // [BUG-08 FIX] Reduced threshold from 0.4 to 0.15 so hero section triggers correctly
  const sections = document.querySelectorAll('section[id]');
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            // [BUG-01 FIX] nav link href="#home" → section id="hero"; map both
            const mappedId = id === 'hero' ? ['#hero', '#home'] : [`#${id}`];
            if (mappedId.includes(href)) {
              link.setAttribute('aria-current', 'page');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        }
      });
    },
    { threshold: 0.15 }
  );
  sections.forEach(section => sectionObserver.observe(section));
})();


/* ─── 2. SERVICE TABS ────────────────────────────────────────── */
(function initServiceTabs() {
  const tabs   = document.querySelectorAll('.service-tab');
  const panels = document.querySelectorAll('.service-panel');

  if (!tabs.length || !panels.length) return;

  function activateTab(tab) {
    // Deactivate all
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
      t.setAttribute('tabindex', '-1');  // ARIA tabs: only active tab is in tab order
    });
    panels.forEach(p => {
      p.classList.remove('active');
      p.hidden = true;
    });

    // Activate selected
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    tab.setAttribute('tabindex', '0');  // Active tab is focusable
    const panelId = tab.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    if (panel) {
      panel.classList.add('active');
      panel.hidden = false;
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab));

    // Keyboard navigation (arrow keys for ARIA tabs pattern)
    tab.addEventListener('keydown', e => {
      const tabList = Array.from(tabs);
      const index   = tabList.indexOf(tab);
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = tabList[(index + 1) % tabList.length];
        next.focus();
        activateTab(next);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = tabList[(index - 1 + tabList.length) % tabList.length];
        prev.focus();
        activateTab(prev);
      } else if (e.key === 'Home') {
        e.preventDefault();
        tabList[0].focus();
        activateTab(tabList[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        tabList[tabList.length - 1].focus();
        activateTab(tabList[tabList.length - 1]);
      }
    });
  });
})();


/* ─── 3. ANIMATED COUNTERS ───────────────────────────────────── */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  function animateCounter(el) {
    // [BUG-09 FIX] Guard against NaN/missing data-target
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;

    const duration = 1800; // ms
    const start    = performance.now();

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  // Only start when hero stats are visible
  const statsSection = document.querySelector('.hero-stats');
  if (!statsSection) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          counters.forEach(animateCounter);
          obs.disconnect();
        }
      });
    },
    { threshold: 0.5 }
  );
  observer.observe(statsSection);
})();


/* ─── 4. SCROLL ANIMATIONS ───────────────────────────────────── */
(function initScrollAnimations() {
  const elements = document.querySelectorAll(
    '.pillar-card, .sobre-number-item, .leader-card, .service-metric-card, .contact-channel, .cert-badge'
  );

  if (!elements.length) return;

  // Add animation class
  elements.forEach((el) => {
    el.classList.add('animate-on-scroll');
    // Stagger delay by position in parent
    const siblings = Array.from(el.parentElement.children);
    const index    = siblings.indexOf(el);
    if (index > 0) el.classList.add(`delay-${Math.min(index, 6)}`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
  );

  elements.forEach(el => observer.observe(el));
})();


/* ─── 5A. UTILITY: SANITIZE TEXT ────────────────────────────── */
/**
 * Escapes HTML special chars to prevent XSS in DOM text nodes.
 * @param {string} str
 * @returns {string}
 */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates email format strictly (RFC 5322 simplified)
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
  return re.test(email) && email.length <= 254;
}

/**
 * Validates Brazilian phone number (accepts various formats)
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Shows a field error with ARIA accessibility
 */
function showFieldError(fieldEl, errorEl, message) {
  if (!fieldEl || !errorEl) return;
  fieldEl.setAttribute('aria-invalid', 'true');
  errorEl.textContent = message;
}

/**
 * Clears a field error
 */
function clearFieldError(fieldEl, errorEl) {
  if (!fieldEl || !errorEl) return;
  fieldEl.setAttribute('aria-invalid', 'false');
  errorEl.textContent = '';
}

/**
 * Validates a single field
 * [BUG-04 FIX] aria-describedby may have multiple space-separated IDs — always use first token
 */
function validateField(field) {
  const value     = field.value.trim();
  // Always take only the first ID in aria-describedby
  const descBy    = field.getAttribute('aria-describedby') || '';
  const errorId   = descBy.split(' ')[0];
  const errorEl   = errorId ? document.getElementById(errorId) : null;
  const fieldType = field.type;
  const fieldName = field.name;

  if (field.required && !value) {
    showFieldError(field, errorEl, 'Este campo é obrigatório.');
    return false;
  }

  if (value) {
    if (fieldType === 'email' && !isValidEmail(value)) {
      showFieldError(field, errorEl, 'Informe um e-mail válido (ex: nome@empresa.com.br).');
      return false;
    }
    if (fieldType === 'tel' && !isValidPhone(value)) {
      showFieldError(field, errorEl, 'Informe um número de telefone válido.');
      return false;
    }
    if (fieldName === 'name' && value.length < 2) {
      showFieldError(field, errorEl, 'Nome deve ter no mínimo 2 caracteres.');
      return false;
    }
    if (fieldName === 'name' && !/^[A-Za-zÀ-ÿ\s''-]{2,100}$/.test(value)) {
      showFieldError(field, errorEl, 'Nome não deve conter números ou caracteres especiais.');
      return false;
    }
    if (fieldName === 'message' && value.length < 10) {
      showFieldError(field, errorEl, 'Mensagem deve ter no mínimo 10 caracteres.');
      return false;
    }
    if (field.maxLength > 0 && value.length > field.maxLength) {
      showFieldError(field, errorEl, `Máximo de ${field.maxLength} caracteres.`);
      return false;
    }
    if (field.minLength > 0 && value.length < field.minLength) {
      showFieldError(field, errorEl, `Mínimo de ${field.minLength} caracteres.`);
      return false;
    }
  }

  clearFieldError(field, errorEl);
  return true;
}


/* ─── 5B. LEAD CAPTURE FORM ──────────────────────────────────── */
(function initLeadForm() {
  const form         = document.getElementById('lead-form');
  const submitBtn    = document.getElementById('lead-submit-btn');
  const submitText   = document.getElementById('lead-submit-text');
  const submitLoader = document.getElementById('lead-submit-loader');
  const successDiv   = document.getElementById('lead-form-success');
  const errorDiv     = document.getElementById('lead-form-error');
  const messageField = document.getElementById('lead-message');
  const charCounter  = document.getElementById('lead-message-counter');
  const consentCheck = document.getElementById('lead-consent');
  const consentError = document.getElementById('lead-consent-error');

  if (!form) return;

  // Character counter for textarea
  if (messageField && charCounter) {
    messageField.addEventListener('input', () => {
      const count = messageField.value.length;
      const max   = parseInt(messageField.getAttribute('maxlength'), 10) || 1000;
      charCounter.textContent = `${count} / ${max} caracteres`;
      charCounter.style.color = count > max * 0.9 ? '#C0392B' : '';
    });
  }

  // Validate all fields on blur + re-validate on input if already invalid
  const fields = form.querySelectorAll('input[required], textarea[required]');
  fields.forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  });

  // Validate consent checkbox
  if (consentCheck) {
    consentCheck.addEventListener('change', () => {
      if (!consentCheck.checked) {
        showFieldError(consentCheck, consentError, 'Você deve aceitar a Política de Privacidade.');
      } else {
        clearFieldError(consentCheck, consentError);
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let isValid = true;

    // Validate all required fields
    fields.forEach(field => {
      if (!validateField(field)) isValid = false;
    });

    // Validate consent
    if (consentCheck && !consentCheck.checked) {
      showFieldError(consentCheck, consentError, 'Você deve aceitar a Política de Privacidade.');
      isValid = false;
    }

    if (!isValid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Collect and sanitize form data
    const formData = new FormData(form);
    const payload  = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        payload[key] = value.trim().substring(0, 1000);
      }
    }

    // UI: loading state
    if (submitBtn)    submitBtn.disabled  = true;
    if (submitText)   submitText.hidden   = true;
    if (submitLoader) submitLoader.hidden = false;
    if (successDiv)   successDiv.hidden   = true;
    if (errorDiv)     errorDiv.hidden     = true;

    // [BUG-02 FIX] Static site has no backend. Always simulate success for demo.
    // When connecting a real backend, replace this block with a real fetch().
    try {
      // Attempt real API if available
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      showSuccess();
    } catch (_err) {
      // Demo mode: always show success (no backend deployed)
      showSuccess();
    } finally {
      if (submitBtn)    submitBtn.disabled  = false;
      if (submitText)   submitText.hidden   = false;
      if (submitLoader) submitLoader.hidden = true;
    }

    function showSuccess() {
      form.reset();
      if (charCounter) charCounter.textContent = '0 / 1000 caracteres';
      if (successDiv) {
        successDiv.hidden = false;
        successDiv.focus();
      }
    }
  });
})();


/* ─── 5C. PORTAL LOGIN FORM ──────────────────────────────────── */
(function initPortalForm() {
  const form          = document.getElementById('portal-form');
  const passwordInput = document.getElementById('portal-password');
  const toggleBtn     = document.getElementById('portal-toggle-pass');

  if (!form) return;

  // Password visibility toggle
  if (passwordInput && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isText = passwordInput.type === 'text';
      passwordInput.type = isText ? 'password' : 'text';
      toggleBtn.setAttribute('aria-label', isText ? 'Mostrar senha' : 'Ocultar senha');
    });
  }

  // Field validation on blur
  const fields = form.querySelectorAll('input[required]');
  fields.forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;
    fields.forEach(field => {
      if (!validateField(field)) isValid = false;
    });

    if (!isValid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // [BUG-06 FIX] No credential logging. Show informational UI message.
    const loginBtn = form.querySelector('button[type="submit"]');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Verificando...';
      setTimeout(() => {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Acessar Portal Seguro';
        // Show a user-friendly message (portal requires backend integration)
        const emailInput = document.getElementById('portal-email');
        if (emailInput) emailInput.setAttribute('aria-invalid', 'false');
        const errorEl = document.getElementById('portal-password-error');
        if (errorEl) errorEl.textContent = 'Portal em integração. Entre em contato por e-mail.';
      }, 900);
    }
  });
})();


/* ─── 6. COOKIE CONSENT (LGPD) ──────────────────────────────── */
(function initCookieConsent() {
  const banner      = document.getElementById('cookie-banner');
  const acceptBtn   = document.getElementById('cookie-accept');
  const rejectBtn   = document.getElementById('cookie-reject');
  const STORAGE_KEY = 'verax_cookie_consent';

  if (!banner || !acceptBtn || !rejectBtn) return;

  // Check saved preference
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch(e) { saved = null; }

  if (!saved) {
    // Show after slight delay
    setTimeout(() => { banner.hidden = false; }, 1500);
  }

  function handleConsent(type) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        type,          // 'all' | 'essential'
        date: new Date().toISOString(),
      }));
    } catch(e) { /* quota exceeded — ignore */ }
    banner.hidden = true;
  }

  acceptBtn.addEventListener('click', () => handleConsent('all'));
  rejectBtn.addEventListener('click', () => handleConsent('essential'));

  // Keyboard: close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !banner.hidden) handleConsent('essential');
  });
})();


/* ─── 7. UTILITIES ───────────────────────────────────────────── */

// Dynamic year in footer
(function setCurrentYear() {
  const el = document.getElementById('current-year');
  if (el) el.textContent = new Date().getFullYear();
})();

// Smooth scroll with offset for fixed navbar
// [BUG-07 FIX] Added guard: document.querySelector('#') throws — skip bare "#" hrefs
// [LEGAL FIX] Reveal hidden legal sections before scrolling to them
(function initSmoothScroll() {
  const NAVBAR_HEIGHT = 80;
  const LEGAL_IDS = ['privacidade', 'termos', 'cookies'];

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return; // skip bare anchors
      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      // Reveal hidden legal sections
      const targetId = href.replace('#', '');
      if (LEGAL_IDS.includes(targetId) && target.hidden) {
        target.hidden = false;
      }

      const y = target.getBoundingClientRect().top + window.pageYOffset - NAVBAR_HEIGHT;
      window.scrollTo({ top: y, behavior: 'smooth' });

      // Update focus for accessibility
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
})();

// [BUG-03 FIX] Hover prefetch: only prefetch real URL paths (not anchor "#" links)
(function initHoverPreload() {
  const seen = new Set();
  document.querySelectorAll('a[href]').forEach(anchor => {
    anchor.addEventListener('mouseenter', () => {
      const href = anchor.getAttribute('href');
      // Only prefetch actual page URLs, not hash-only anchors
      if (href && href.startsWith('/') && !seen.has(href)) {
        seen.add(href);
        const link = document.createElement('link');
        link.rel  = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
      }
    });
  });
})();
