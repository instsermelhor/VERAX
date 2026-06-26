/**
 * VERAX CMS LOADER — v1.0.0
 * ─────────────────────────────────────────────────────────────────────
 * Camada de integração entre o Painel Administrativo (admin/) e o Site
 * Principal (index.html).
 *
 * COMO FUNCIONA:
 *  1. Ao carregar a página, lê os dados de `verax_cms_content` no
 *     localStorage (salvos pelo admin/assets/js/admin.js).
 *  2. Aplica os dados dinamicamente ao DOM do site principal.
 *  3. Escuta o evento `storage` para atualização em tempo real quando
 *     o administrador publica alterações no painel (outra aba).
 *  4. Expõe `window.VeraxCMS` para uso por main.js e futuras integrações.
 *
 * ADICIONAR NOVAS INTEGRAÇÕES:
 *  - Adicione uma função `apply<Secao>(data)` abaixo.
 *  - Chame-a dentro de `applyAll(data)`.
 *  - No HTML, adicione `data-cms="<chave>"` nos elementos alvo.
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

(function VeraxCMSLoader() {

  /* ══════════════════════════════════════════════════════════════════
     CONSTANTES
  ══════════════════════════════════════════════════════════════════ */
  const STORAGE_KEY    = 'verax_cms_content';
  const PUBLISH_KEY    = 'verax_cms_published';
  const SESSION_KEY    = 'verax_cms_session';
  const ADMIN_PATH     = 'admin/';

  /* ══════════════════════════════════════════════════════════════════
     UTILIDADES
  ══════════════════════════════════════════════════════════════════ */

  /**
   * Define texto seguro em um elemento (evita XSS).
   * @param {Element} el
   * @param {string}  text
   */
  function setText(el, text) {
    if (!el || typeof text !== 'string') return;
    el.textContent = text;
  }

  /**
   * Define atributo em um elemento com segurança.
   * @param {Element} el
   * @param {string}  attr
   * @param {string}  value
   */
  function setAttr(el, attr, value) {
    if (!el || !attr || typeof value !== 'string') return;
    el.setAttribute(attr, value);
  }

  /**
   * Lê dados do localStorage com fallback seguro.
   * @returns {Object} dados do CMS ou {}
   */
  function readCMSData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw) || {};
    } catch (e) {
      console.warn('[VeraxCMS Loader] Erro ao ler dados do CMS:', e.message);
      return {};
    }
  }

  /**
   * Verifica se há uma sessão de admin ativa (para exibir link admin no site).
   * @returns {boolean}
   */
  function hasAdminSession() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      return !!(session && (Date.now() - session.ts) < 8 * 60 * 60 * 1000);
    } catch (e) {
      return false;
    }
  }


  /* ══════════════════════════════════════════════════════════════════
     APLICADORES POR SEÇÃO
  ══════════════════════════════════════════════════════════════════ */

  /**
   * Aplica cores do design system como CSS custom properties no :root.
   * @param {Object} design - CMS.design
   */
  function applyDesign(design) {
    if (!design) return;
    const root = document.documentElement;

    const colorMap = {
      'color-primary':    '--color-navy',
      'color-secondary':  '--color-gold',
      'color-bg':         '--color-bg',
      'color-text':       '--color-text',
      'color-accent':     '--color-accent',
    };

    Object.entries(colorMap).forEach(([cmsKey, cssVar]) => {
      const val = design[cmsKey];
      if (val && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
        root.style.setProperty(cssVar, val);
      }
    });
  }

  /**
   * Aplica SEO dinâmico: title e meta description.
   * @param {Object} seo - CMS.seo
   */
  function applySEO(seo) {
    if (!seo) return;

    if (seo.title) {
      document.title = seo.title;
    }

    if (seo.description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', seo.description);
    }

    if (seo.og_title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) setAttr(ogTitle, 'content', seo.og_title);
    }

    if (seo.og_description) {
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) setAttr(ogDesc, 'content', seo.og_description);
    }
  }

  /**
   * Aplica dados da seção Hero.
   * @param {Object} content - CMS.content
   */
  function applyHero(content) {
    if (!content) return;

    // Título principal (h1#hero-heading)
    const heroTitle = document.getElementById('hero-heading');
    if (heroTitle && content.hero_title) {
      // Preserva a tag <em> se o conteúdo contiver marcador *texto*
      const raw = content.hero_title;
      // Sanitiza: apenas permite <em> e <br>
      const safe = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\\n/g, '<br>');
      heroTitle.innerHTML = safe;
    }

    // Subtítulo
    const heroSub = document.querySelector('.hero-subtitle');
    if (heroSub && content.hero_subtitle) {
      const safe = content.hero_subtitle
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\\n/g, '<br>');
      heroSub.innerHTML = safe;
    }

    // CTA primário (texto do botão)
    const ctaPrimaryEl = document.querySelector('#hero-cta-primary span');
    if (ctaPrimaryEl && content.hero_cta_primary_text) {
      setText(ctaPrimaryEl, content.hero_cta_primary_text);
    }

    // Eyebrow text
    const eyebrowEl = document.querySelector('.hero-eyebrow-text');
    if (eyebrowEl && content.hero_eyebrow) {
      setText(eyebrowEl, content.hero_eyebrow);
    }

    // Stats
    const statsMap = [
      { selector: '.stat-item:nth-child(1) .stat-number', key: 'stat1_value', targetKey: 'stat1_target' },
      { selector: '.stat-item:nth-child(1) .stat-label',  key: 'stat1_label' },
      { selector: '.stat-item:nth-child(3) .stat-number', key: 'stat2_value', targetKey: 'stat2_target' },
      { selector: '.stat-item:nth-child(3) .stat-label',  key: 'stat2_label' },
      { selector: '.stat-item:nth-child(5) .stat-number', key: 'stat3_value', targetKey: 'stat3_target' },
      { selector: '.stat-item:nth-child(5) .stat-label',  key: 'stat3_label' },
    ];

    const heroStats = document.querySelector('.hero-stats');
    if (heroStats) {
      statsMap.forEach(({ selector, key, targetKey }) => {
        const el = heroStats.querySelector(selector);
        if (!el) return;
        if (content[key]) {
          setText(el, content[key]);
          if (targetKey && content[targetKey]) {
            el.dataset.target = content[targetKey];
          }
        }
      });
    }
  }

  /**
   * Aplica dados da seção Quem Somos.
   * @param {Object} content - CMS.content
   */
  function applySobre(content) {
    if (!content) return;

    const headingEl = document.getElementById('sobre-heading');
    if (headingEl && content.sobre_title) setText(headingEl, content.sobre_title);

    const texts = document.querySelectorAll('#sobre .sobre-text');
    if (texts.length >= 1 && content.sobre_p1) setText(texts[0], content.sobre_p1);
    if (texts.length >= 2 && content.sobre_p2) setText(texts[1], content.sobre_p2);

    const quoteEl = document.querySelector('#sobre .quote-text');
    if (quoteEl && content.sobre_quote) setText(quoteEl, `"${content.sobre_quote}"`);

    // Números de destaque
    const numItems = document.querySelectorAll('.sobre-number-item');
    const numData = [
      { valueKey: 'sobre_num1_value', labelKey: 'sobre_num1_label' },
      { valueKey: 'sobre_num2_value', labelKey: 'sobre_num2_label' },
      { valueKey: 'sobre_num3_value', labelKey: 'sobre_num3_label' },
      { valueKey: 'sobre_num4_value', labelKey: 'sobre_num4_label' },
    ];
    numItems.forEach((item, i) => {
      if (!numData[i]) return;
      const bigNum = item.querySelector('.big-number');
      const label  = item.querySelector('.number-label');
      if (bigNum && content[numData[i].valueKey]) setText(bigNum, content[numData[i].valueKey]);
      if (label  && content[numData[i].labelKey])  setText(label,  content[numData[i].labelKey]);
    });
  }

  /**
   * Aplica dados dos Pilares.
   * @param {Object} content - CMS.content
   */
  function applyPilares(content) {
    if (!content || !Array.isArray(content.pilares_cards)) return;

    const grid = document.querySelector('.pillars-grid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.pillar-card');
    content.pilares_cards.forEach((pilar, i) => {
      const card = cards[i];
      if (!card) return;
      const titleEl = card.querySelector('.pillar-title');
      const descEl  = card.querySelector('.pillar-desc');
      if (titleEl && pilar.title) setText(titleEl, pilar.title);
      if (descEl  && pilar.desc)  setText(descEl,  pilar.desc);
    });
  }

  /**
   * Aplica dados do nav (menu principal).
   * @param {Object} nav - CMS.nav
   */
  function applyNav(nav) {
    if (!nav || !Array.isArray(nav.navbar)) return;

    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return;

    // Atualiza os links existentes (não reconstrói para preservar eventos e SVGs)
    const navLinks = navMenu.querySelectorAll('.nav-link');
    nav.navbar.forEach((item, i) => {
      const link = navLinks[i];
      if (!link) return;
      if (item.label) setText(link, item.label);
      if (item.href)  setAttr(link, 'href', item.href);
    });
  }

  /**
   * Aplica dados do footer.
   * @param {Object} content - CMS.content
   * @param {Object} globalData - CMS.global
   */
  function applyFooter(content, globalData) {
    if (!content && !globalData) return;

    // Texto de copyright / empresa
    const footerCompany = document.querySelector('.footer-company-name');
    if (footerCompany && globalData && globalData.company_name) {
      setText(footerCompany, globalData.company_name);
    }

    // Endereço
    const addressEl = document.querySelector('.footer-address');
    if (addressEl && globalData && globalData.address) {
      setText(addressEl, globalData.address);
    }

    // Telefone
    const phoneEl = document.querySelector('.footer-phone');
    if (phoneEl && globalData && globalData.phone) {
      setText(phoneEl, globalData.phone);
    }

    // E-mail
    const emailEl = document.querySelector('.footer-email');
    if (emailEl && globalData && globalData.email) {
      setText(emailEl, globalData.email);
      const emailLink = emailEl.closest('a');
      if (emailLink) setAttr(emailLink, 'href', `mailto:${globalData.email}`);
    }
  }

  /**
   * Aplica dados da seção de Contato.
   * @param {Object} content - CMS.content
   * @param {Object} globalData - CMS.global
   */
  function applyContato(content, globalData) {
    if (!content && !globalData) return;

    // Título da seção
    const contatoHeading = document.getElementById('contato-heading');
    if (contatoHeading && content && content.contato_title) {
      setText(contatoHeading, content.contato_title);
    }

    // Canais de contato (email, phone, whatsapp)
    if (globalData) {
      const phoneChannels = document.querySelectorAll('.contact-channel[data-type="phone"] .channel-value');
      phoneChannels.forEach(el => {
        if (globalData.phone) setText(el, globalData.phone);
      });

      const emailChannels = document.querySelectorAll('.contact-channel[data-type="email"] .channel-value');
      emailChannels.forEach(el => {
        if (globalData.email) setText(el, globalData.email);
      });
    }
  }

  /**
   * Exibe/oculta o link de acesso admin no site (visível apenas se logado).
   */
  function applyAdminLink() {
    const existingLink = document.getElementById('site-admin-access-link');
    if (hasAdminSession()) {
      if (!existingLink) {
        // Cria botão flutuante de acesso ao admin
        const adminBtn = document.createElement('a');
        adminBtn.id        = 'site-admin-access-link';
        adminBtn.href      = ADMIN_PATH;
        adminBtn.title     = 'Acessar Painel Administrativo';
        adminBtn.setAttribute('aria-label', 'Acessar painel administrativo Verax CMS');
        adminBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span>Admin</span>
        `;
        document.body.appendChild(adminBtn);

        // Estilo inline mínimo (não depende de CSS externo)
        adminBtn.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: #0A1F44;
          color: #B5941D;
          border: 1.5px solid #B5941D;
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        `;

        adminBtn.addEventListener('mouseenter', () => {
          adminBtn.style.background = '#B5941D';
          adminBtn.style.color = '#0A1F44';
        });
        adminBtn.addEventListener('mouseleave', () => {
          adminBtn.style.background = '#0A1F44';
          adminBtn.style.color = '#B5941D';
        });
      }
    } else {
      // Remove o botão se não há sessão
      if (existingLink) existingLink.remove();
    }
  }


  /* ══════════════════════════════════════════════════════════════════
     FUNÇÃO PRINCIPAL: APLICA TUDO
  ══════════════════════════════════════════════════════════════════ */

  /**
   * Lê os dados do CMS e aplica ao site.
   * Pode ser chamada múltiplas vezes (idempotente).
   */
  function applyAll() {
    const data = readCMSData();

    applyDesign(data.design);
    applySEO(data.seo);
    applyHero(data.content);
    applySobre(data.content);
    applyPilares(data.content);
    applyNav(data.nav);
    applyFooter(data.content, data.global);
    applyContato(data.content, data.global);
    applyAdminLink();
  }


  /* ══════════════════════════════════════════════════════════════════
     EVENTO DE PUBLICAÇÃO (TEMPO REAL)
  ══════════════════════════════════════════════════════════════════ */

  /**
   * Escuta mudanças no localStorage (publicações do admin em outra aba).
   */
  window.addEventListener('storage', (e) => {
    if (e.key === PUBLISH_KEY || e.key === STORAGE_KEY) {
      applyAll();
      console.info('[VeraxCMS Loader] Conteúdo atualizado via publicação do admin.');
    }
  });


  /* ══════════════════════════════════════════════════════════════════
     API PÚBLICA: window.VeraxCMS
  ══════════════════════════════════════════════════════════════════ */

  /**
   * Expõe API para uso por main.js e futuras integrações.
   */
  window.VeraxCMS = {
    /**
     * Aplica todos os dados do CMS ao site. Pode ser chamada externamente.
     */
    applyToSite: applyAll,

    /**
     * Retorna os dados brutos do CMS do localStorage.
     * @returns {Object}
     */
    getData: readCMSData,

    /**
     * Retorna um campo específico do conteúdo CMS.
     * @param {string} section - 'content' | 'seo' | 'nav' | 'design' | 'global'
     * @param {string} key
     * @returns {*}
     */
    get: function(section, key) {
      const data = readCMSData();
      if (!data[section]) return undefined;
      return key ? data[section][key] : data[section];
    },

    /**
     * Verifica se há sessão admin ativa.
     * @returns {boolean}
     */
    isAdminLoggedIn: hasAdminSession,

    /**
     * Força reaplicação de uma seção específica.
     * @param {'design'|'seo'|'hero'|'sobre'|'pilares'|'nav'|'footer'|'contato'} section
     */
    applySection: function(section) {
      const data = readCMSData();
      switch (section) {
        case 'design':  applyDesign(data.design);              break;
        case 'seo':     applySEO(data.seo);                    break;
        case 'hero':    applyHero(data.content);               break;
        case 'sobre':   applySobre(data.content);              break;
        case 'pilares': applyPilares(data.content);            break;
        case 'nav':     applyNav(data.nav);                    break;
        case 'footer':  applyFooter(data.content, data.global);break;
        case 'contato': applyContato(data.content, data.global);break;
        default: applyAll();
      }
    },

    /** Versão do loader */
    version: '1.0.0',
  };


  /* ══════════════════════════════════════════════════════════════════
     INICIALIZAÇÃO
  ══════════════════════════════════════════════════════════════════ */

  // Aguarda o DOM estar pronto antes de aplicar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll);
  } else {
    // DOM já carregado (script defer/async pode cair aqui)
    applyAll();
  }

  console.info('[VeraxCMS Loader] v1.0.0 — integração CMS ↔ Site inicializada.');

})();
