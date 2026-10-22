(function () {
  const inSubfolder = window.location.pathname.includes('/Assets/');
  const base = inSubfolder ? '../' : '';

  const navLinks = [
    { href: 'index.html', label: 'Home' },
    { href: 'About.html', label: 'About' },
    { href: 'Graphics.html', label: 'Graphics' },
    { href: 'Vid.html', label: 'Video Editing' },
    { href: 'Assets.html', label: 'Assets' },
    { href: 'Clients.html', label: 'Clients' },
    { href: 'Reviews.html', label: 'Reviews' },
    { href: 'Tutorials.html', label: 'Tutorials' },
  ];

  const currentPage = document.body.getAttribute('data-page') || '';

  const headerHTML = `
<nav class="gt-navbar">
  <a href="${base}index.html" class="gt-logo">
    <span class="gt-logo-symbol">✦</span> GT EDITS
  </a>
  <div class="navnav">
    <a href="${base}index.html" class="gt-nav${currentPage === 'Home' ? ' active' : ''}">Home</a>
    <a href="${base}Graphics.html" class="gt-nav${currentPage === 'Graphics' ? ' active' : ''}">Graphics</a>
    <a href="${base}Vid.html" class="gt-nav${currentPage === 'Video Editing' ? ' active' : ''}">Video Editing</a>
    <a href="${base}Clients.html" class="gt-nav${currentPage === 'Clients' ? ' active' : ''}">Clients</a>
    <a href="${base}Reviews.html" class="gt-nav${currentPage === 'Reviews' ? ' active' : ''}">Reviews</a>
    <a href="${base}About.html" class="gt-nav${currentPage === 'About' ? ' active' : ''}">About</a>
  </div>
  <a href="https://www.instagram.com/gt._.edits/" target="_blank" rel="noopener noreferrer" class="gt-nav-cta">Start A Project</a>

  <button class="gt-hamburger" id="gt-open-menu" aria-label="Open menu">
    <span></span>
    <span></span>
  </button>
</nav>

<div class="gt-overlay" id="gt-overlay"></div>

<div class="gt-mobile-menu" id="gt-mobile-menu" role="dialog" aria-label="Navigation menu">
  <button class="gt-mobile-close" id="gt-close-menu" aria-label="Close menu">×</button>
  ${navLinks.map(link => {
    const isActive = link.label === currentPage;
    return `<a href="${base}${link.href}"${isActive ? ' aria-current="page" class="active"' : ''}>${link.label}</a>`;
  }).join('\n  ')}
  <a href="https://www.instagram.com/gt._.edits/" target="_blank" rel="noopener noreferrer" class="gt-mobile-contact">Start A Project →</a>
</div>`;

  const footerHTML = `
<footer class="gt-footer">
  <div class="gt-footer-top">
    <a href="${base}index.html" class="gt-footer-logo">
      <span class="gt-logo-symbol">✦</span> GT EDITS
    </a>
    <nav class="gt-footer-links" aria-label="Footer navigation">
      <a href="${base}About.html">About</a>
      <a href="${base}Graphics.html">Graphics</a>
      <a href="${base}Vid.html">Videos</a>
      <a href="${base}Clients.html">Clients</a>
      <a href="${base}Reviews.html">Reviews</a>
      <a href="${base}Assets.html">Assets</a>
      <a href="${base}Tutorials.html">Tutorials</a>
    </nav>
    <div class="gt-footer-social">
      <a href="https://x.com/GTTanishq22" target="_blank" rel="noopener noreferrer" aria-label="Twitter/X">
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
        </svg>
      </a>
      <a href="https://www.instagram.com/gt._.edits/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01" />
        </svg>
      </a>
      <a href="https://www.linkedin.com/in/tanishq-mehta-51055127b/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      </a>
    </div>
  </div>
  <p class="gt-footer-copy">© <span id="gt-year">${new Date().getFullYear()}</span> GT Edits — Tanishq Mehta. All rights reserved.</p>
</footer>`;

  const headerPlaceholder = document.getElementById('gt-header');
  if (headerPlaceholder) headerPlaceholder.outerHTML = headerHTML;

  const footerPlaceholder = document.getElementById('gt-footer');
  if (footerPlaceholder) footerPlaceholder.outerHTML = footerHTML;

  const yearEl = document.getElementById('gt-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const openBtn = document.getElementById('gt-open-menu');
  const closeBtn = document.getElementById('gt-close-menu');
  const menu = document.getElementById('gt-mobile-menu');
  const overlay = document.getElementById('gt-overlay');

  function openMenu() {
    menu.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    menu.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (openBtn && closeBtn && menu && overlay) {
    openBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
  }

  // ── Theme Toggle ──
  const html = document.documentElement;
  const themeBtn = document.getElementById('gt-theme-toggle');

  // Apply saved preference immediately (before paint)
  if (localStorage.getItem('gt-theme') === 'dark') {
    html.setAttribute('data-theme', 'dark');
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = html.getAttribute('data-theme') === 'dark';
      if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('gt-theme', 'light');
      } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('gt-theme', 'dark');
      }
    });
  }
})();
