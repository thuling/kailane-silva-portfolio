(() => {
  // 1. Escala exata da Capa 1920x1080 no desktop (> 780px); no celular usa layout retrato nativo
  const heroFrame = document.getElementById('hero-canvas-frame');
  const MOBILE_HERO_BP = 780;

  const updateHeroScale = () => {
    if (!heroFrame) return;
    if (window.innerWidth <= MOBILE_HERO_BP) {
      heroFrame.style.removeProperty('--hero-scale');
      return;
    }
    const width = heroFrame.clientWidth;
    if (width > 0) {
      heroFrame.style.setProperty('--hero-scale', String(width / 1920));
    }
  };

  updateHeroScale();
  window.addEventListener('resize', updateHeroScale, { passive: true });

  if (heroFrame && 'ResizeObserver' in window) {
    const ro = new ResizeObserver(updateHeroScale);
    ro.observe(heroFrame);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const prefersMotion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    // 2. Parallax suave com o movimento do mouse na Capa (apenas desktop com ponteiro fino)
    const parallaxLayers = Array.from(document.querySelectorAll('[data-parallax-depth]'));
    if (heroFrame && parallaxLayers.length > 0 && prefersMotion && hasFinePointer) {
      heroFrame.addEventListener('pointermove', (event) => {
        if (window.innerWidth <= MOBILE_HERO_BP || document.body.classList.contains('is-motion-paused')) return;
        const rect = heroFrame.getBoundingClientRect();
        const relX = (event.clientX - rect.left) / rect.width - 0.5;
        const relY = (event.clientY - rect.top) / rect.height - 0.5;

        parallaxLayers.forEach((layer) => {
          const depth = Number(layer.getAttribute('data-parallax-depth')) || 0.5;
          layer.style.setProperty('--px', `${(relX * -28 * depth).toFixed(2)}px`);
          layer.style.setProperty('--py', `${(relY * -18 * depth).toFixed(2)}px`);
        });
      });

      heroFrame.addEventListener('pointerleave', () => {
        parallaxLayers.forEach((layer) => {
          layer.style.setProperty('--px', '0px');
          layer.style.setProperty('--py', '0px');
        });
      });
    }

    // 3. Botão acessível para pausar/retomar animações contínuas (WCAG 2.2.2)
    const motionBtn = document.getElementById('motion-toggle-btn');
    if (motionBtn) {
      motionBtn.addEventListener('click', () => {
        const paused = document.body.classList.toggle('is-motion-paused');
        motionBtn.textContent = paused ? 'Ativar movimento' : 'Pausar movimento';
      });
    }

    // 4. Fallback da barra de progresso de rolagem para navegadores sem animation-timeline: scroll()
    const scrollProgress = document.getElementById('scroll-progress');
    if (scrollProgress && prefersMotion && !CSS.supports('animation-timeline', 'scroll()')) {
      const updateProgress = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const pct = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
        scrollProgress.style.transform = `scaleX(${pct})`;
      };
      updateProgress();
      window.addEventListener('scroll', updateProgress, { passive: true });
    }

    // 5. Fallback de Scroll-Reveal via IntersectionObserver quando view() não é suportado
    if (
      prefersMotion &&
      !CSS.supports('(animation-timeline: view()) and (animation-range: entry)')
    ) {
      const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right, .reveal-scale');
      revealEls.forEach((el) => el.classList.add('io-pending'));

      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('io-visible');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );

      revealEls.forEach((el) => revealObserver.observe(el));
    }

    // 6. Estado do cabeçalho ao rolar + Scroll-Spy de seção ativa
    const siteHeader = document.getElementById('site-header');
    const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));
    const watchedSections = navLinks
      .map((link) => document.getElementById(link.getAttribute('data-nav-link')))
      .filter(Boolean);

    const onScrollHeader = () => {
      if (siteHeader) {
        siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
      }
    };
    onScrollHeader();
    window.addEventListener('scroll', onScrollHeader, { passive: true });

    if (watchedSections.length > 0 && 'IntersectionObserver' in window) {
      const spyObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              navLinks.forEach((link) => {
                link.classList.toggle('is-active', link.getAttribute('data-nav-link') === id);
              });
            }
          });
        },
        { rootMargin: '-35% 0px -55% 0px' }
      );
      watchedSections.forEach((sec) => spyObserver.observe(sec));
    }

    // 7. Menu mobile acessível (Escape, clique fora e redimensionamento)
    const navToggle = document.getElementById('nav-toggle');
    const navToggleLabel = navToggle ? navToggle.querySelector('.nav-toggle-label') : null;
    const primaryNav = document.getElementById('primary-nav');

    const setMenuOpen = (open) => {
      if (!navToggle || !primaryNav) return;
      primaryNav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
      if (navToggleLabel) {
        navToggleLabel.textContent = open ? 'Fechar' : 'Menu';
      }
    };

    if (navToggle && primaryNav) {
      navToggle.addEventListener('click', () => {
        setMenuOpen(!primaryNav.classList.contains('is-open'));
      });

      primaryNav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setMenuOpen(false));
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && primaryNav.classList.contains('is-open')) {
          setMenuOpen(false);
          navToggle.focus();
        }
      });

      document.addEventListener('click', (event) => {
        if (
          primaryNav.classList.contains('is-open') &&
          siteHeader &&
          !siteHeader.contains(event.target)
        ) {
          setMenuOpen(false);
        }
      });

      window.addEventListener(
        'resize',
        () => {
          if (window.innerWidth > 860 && primaryNav.classList.contains('is-open')) {
            setMenuOpen(false);
          }
        },
        { passive: true }
      );
    }

    // 8. Lightbox nativo (<dialog closedby="any">) com fallback obrigatório de backdrop
    const dialog = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const zoomButtons = document.querySelectorAll('.media-zoom-btn');

    if (dialog && lightboxImg && lightboxTitle) {
      zoomButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const src = btn.getAttribute('data-lightbox-src');
          const title = btn.getAttribute('data-lightbox-title') || 'Visualização do Projeto';
          const img = btn.querySelector('img');
          const alt = img ? img.getAttribute('alt') : title;

          if (src) {
            lightboxImg.setAttribute('src', src);
            lightboxImg.setAttribute('alt', alt || title);
            lightboxTitle.textContent = title;
            dialog.showModal();
          }
        });
      });

      if (!('closedBy' in HTMLDialogElement.prototype)) {
        dialog.addEventListener('click', (event) => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isDialogContent = (
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width
          );
          if (isDialogContent) return;
          dialog.close();
        });
      }
    }

    // 9. Coordenação dos 3 vídeos Reels (reproduzir um pausa os outros)
    const videos = Array.from(document.querySelectorAll('.canva-reel-video'));
    videos.forEach((video, idx) => {
      video.addEventListener('play', () => {
        videos.forEach((other, otherIdx) => {
          if (otherIdx !== idx && !other.paused) {
            other.pause();
          }
        });
      });
    });
  });
})();
