/* =====================================================
   Ali Madani Contractor — Main JavaScript
   Features: sticky nav, mobile menu, scroll reveals,
   dynamic portfolio grid & project cards, lightbox modal,
   form validation & submission
   ===================================================== */

(function () {
  'use strict';

  /* -------------------------------------------------------
     1. Sticky Header
  ------------------------------------------------------- */
  const header = document.querySelector('.site-header');

  function onScroll() {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  if (header) {
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------------
     2. Mobile Navigation Toggle
  ------------------------------------------------------- */
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu   = document.querySelector('.nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isExpanded));
      navMenu.classList.toggle('is-open');
    });

    navMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navToggle.setAttribute('aria-expanded', 'false');
        navMenu.classList.remove('is-open');
      });
    });
  }

  /* -------------------------------------------------------
     3. Scroll Reveal Animations
  ------------------------------------------------------- */
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  /* -------------------------------------------------------
     4. Portfolio System (Refactored for Dynamic API)
  ------------------------------------------------------- */
  
  // State Management Variables
  let currentFilter = 'all';
  let visibleCount = 8;
  let filteredProjects = [];
  let activeProjectImages = [];
  let currentImageIndex = 0;
  let lastActiveElement = null;

  // DOM Elements
  const gridContainer = document.getElementById('portfolio-grid');
  const loadMoreBtn   = document.getElementById('load-more') || document.getElementById('load-more-btn');
  const filterBtns    = document.querySelectorAll('.filter-btn');
  
  // Lightbox DOM Elements
  const lightbox          = document.getElementById('portfolio-lightbox');
  const lightboxImg       = document.getElementById('lightbox-img');
  const lightboxTitle     = document.getElementById('lightbox-title');
  const lightboxCategory  = document.getElementById('lightbox-category');
  const lightboxDesc      = document.getElementById('lightbox-desc');
  const lightboxClose     = document.getElementById('lightbox-close');
  const lightboxPrev      = document.getElementById('lightbox-prev');
  const lightboxNext      = document.getElementById('lightbox-next');

  // Render Portfolio Grid Function
  function renderPortfolio(resetPagination = false) {
    if (!gridContainer) return;
    if (resetPagination) {
      visibleCount = 8;
    }

    const portfolioList = (typeof PORTFOLIO_IMAGES !== 'undefined' && Array.isArray(PORTFOLIO_IMAGES))
      ? PORTFOLIO_IMAGES
      : [];

    // Filter projects matching current filter
    const filteredProjects = portfolioList.filter(proj => 
      currentFilter === 'all' || proj.category === currentFilter
    );

    // Slice for pagination
    const itemsToRender = filteredProjects.slice(0, visibleCount);

    // Generate HTML using accessible <button> tags
    gridContainer.innerHTML = itemsToRender.map(item => {
      const coverImgObj = (item.images && item.images.length > 0) ? (item.images.find(img => img.file === item.coverImage) || item.images[0]) : null;
      const imgSrc = coverImgObj ? `img/${coverImgObj.filename.replace(/ /g, '%20')}` : (item.filename ? `img/${item.filename.replace(/ /g, '%20')}` : 'img/portfolio_kitchen.png');
      
      return `
      <button class="portfolio-item" data-id="${item.id}" data-project-id="${item.projectId || item.id}" data-category="${item.category}" type="button" aria-haspopup="dialog" aria-label="View gallery for ${escapeHtml(item.title)}">
        <figure class="portfolio-figure">
          <img src="${imgSrc}" alt="${escapeHtml(item.title)}">
          <figcaption class="portfolio-details">
            <span class="project-category">${escapeHtml(item.category)}</span>
            <h3 class="project-title">${escapeHtml(item.title)}</h3>
            <p class="project-desc">${escapeHtml(item.description)}</p>
          </figcaption>
        </figure>
      </button>
      `;
    }).join('');

    // Toggle "Load More" button visibility
    if (loadMoreBtn) {
      if (visibleCount >= filteredProjects.length) {
        loadMoreBtn.classList.add('hidden');
      } else {
        loadMoreBtn.classList.remove('hidden');
      }
    }

    // Attach click listeners to new grid cards to open Lightbox
    gridContainer.querySelectorAll('.portfolio-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        openLightbox(id, item.dataset.projectId);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Category Filter Buttons Listener
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      currentFilter = btn.dataset.filter;
      renderPortfolio(true); // Reset to page 1
    });
  });

  // "Load More" Click Listener
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      const spinner = loadMoreBtn.querySelector('.btn-spinner');
      if (spinner) spinner.classList.remove('hidden');
      
      setTimeout(() => {
        visibleCount += 8;
        renderPortfolio(false);
        if (spinner) spinner.classList.add('hidden');
        
        const newlyAppendedIndex = visibleCount - 8;
        const items = gridContainer.querySelectorAll('.portfolio-item');
        if (items[newlyAppendedIndex]) {
          items[newlyAppendedIndex].focus();
        }
      }, 250);
    });
  }

  // Lightbox Event Handling
  function openLightbox(id, projectId) {
    if (!lightbox) return;
    const portfolioList = (typeof PORTFOLIO_IMAGES !== 'undefined' && Array.isArray(PORTFOLIO_IMAGES))
      ? PORTFOLIO_IMAGES
      : [];

    const project = portfolioList.find(p => String(p.id) === String(id) || (projectId && String(p.projectId) === String(projectId)));
    if (!project) return;

    activeProjectImages = (project.images && project.images.length > 0) ? project.images : [
      { filename: project.coverImage || project.filename || 'portfolio_kitchen.png', title: project.title, description: project.description, category: project.category }
    ];

    currentImageIndex = activeProjectImages.findIndex(img => img.file === project.coverImage);
    if (currentImageIndex === -1) currentImageIndex = 0;

    lastActiveElement = document.activeElement;

    updateLightboxContent();

    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
    
    setTimeout(() => {
      if (lightboxClose) lightboxClose.focus();
    }, 50);

    document.body.style.overflow = 'hidden';
  }

  function updateLightboxContent() {
    const imgData = activeProjectImages[currentImageIndex];
    if (!imgData) return;

    if (lightboxImg) {
      lightboxImg.src = `img/${imgData.filename.replace(/ /g, '%20')}`;
      lightboxImg.alt = imgData.alt || imgData.title || '';
    }
    if (lightboxTitle) lightboxTitle.textContent = imgData.title || '';
    if (lightboxCategory) lightboxCategory.textContent = imgData.category || '';
    if (lightboxDesc) {
      if (activeProjectImages.length > 1) {
        lightboxDesc.innerHTML = `<strong>${currentImageIndex + 1} / ${activeProjectImages.length}</strong> &mdash; ${escapeHtml(imgData.description)}`;
      } else {
        lightboxDesc.textContent = imgData.description;
      }
    }
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (lastActiveElement) {
      lastActiveElement.focus();
    }
  }

  function nextImage() {
    if (activeProjectImages.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % activeProjectImages.length;
    updateLightboxContent();
  }

  function prevImage() {
    if (activeProjectImages.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + activeProjectImages.length) % activeProjectImages.length;
    updateLightboxContent();
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxNext) lightboxNext.addEventListener('click', nextImage);
  if (lightboxPrev) lightboxPrev.addEventListener('click', prevImage);

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-content-wrapper')) {
        closeLightbox();
      }
    });
  }

  // Keyboard Navigation & Focus Trap inside Lightbox
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeLightbox();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      nextImage();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      prevImage();
      e.preventDefault();
    }

    if (e.key === 'Tab') {
      const focusable = Array.from(
        lightbox.querySelectorAll('button, [tabindex="0"]')
      ).filter(el => el.offsetParent !== null);

      if (focusable.length === 0) return;
      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
        }
      }
    }
  });

  // AccordionGallery Featured Interactive Showcase
  let accordionInstance = null;
  function initFeaturedAccordion() {
    const root = document.getElementById('accordion-gallery-root');
    if (!root || typeof AccordionGallery !== 'function') return;

    const portfolioList = (typeof PORTFOLIO_IMAGES !== 'undefined' && Array.isArray(PORTFOLIO_IMAGES))
      ? PORTFOLIO_IMAGES
      : [];

    if (!portfolioList.length) return;

    const featuredTitles = [
      "Modern Oak & Quartz Kitchen",
      "Backlit Ledgestone Fireplace Suite",
      "Elevated Cedar Deck & Patio Stairs",
      "Modern Marble Freestanding Bath",
      "Madani Estate Backyard Pavilion",
      "Wide-Plank Oak Master Suite"
    ];

    let featuredItems = [];
    featuredTitles.forEach(title => {
      const match = portfolioList.find(p => p.title === title || p.id === title || p.folderName === title);
      if (match) {
        const coverImgObj = (match.images && match.images.length > 0)
          ? (match.images.find(img => img.file === match.coverImage) || match.images[0])
          : null;
        const imgSrc = coverImgObj
          ? `img/${coverImgObj.filename.replace(/ /g, '%20')}`
          : (match.filename ? `img/${match.filename.replace(/ /g, '%20')}` : 'img/portfolio_kitchen.png');

        featuredItems.push({
          image: imgSrc,
          label: match.title,
          alt: match.title,
          id: match.id,
          projectId: match.projectId || match.id
        });
      }
    });

    if (featuredItems.length < 3) {
      featuredItems = portfolioList.slice(0, 5).map(match => {
        const coverImgObj = (match.images && match.images.length > 0)
          ? (match.images.find(img => img.file === match.coverImage) || match.images[0])
          : null;
        const imgSrc = coverImgObj
          ? `img/${coverImgObj.filename.replace(/ /g, '%20')}`
          : (match.filename ? `img/${match.filename.replace(/ /g, '%20')}` : 'img/portfolio_kitchen.png');

        return {
          image: imgSrc,
          label: match.title,
          alt: match.title,
          id: match.id,
          projectId: match.projectId || match.id
        };
      });
    }

    if (accordionInstance && typeof accordionInstance.destroy === 'function') {
      accordionInstance.destroy();
    }

    accordionInstance = AccordionGallery(root, {
      items: featuredItems,
      defaultIndex: 2,
      accentColor: '#D97706',
      overlayColor: '#0C0A09',
      textColor: '#FAFAF9',
      height: 480,
      gap: 12,
      radius: 16,
      expandRatio: 0.52,
      trigger: 'hover',
      duration: 0.6,
      ease: 'power3.out',
      parallax: 0.5,
      tilt: 8,
      showLabels: true,
      grayscale: true,
      onPanelClick: (item) => {
        openLightbox(item.id, item.projectId);
      }
    });
  }

  // Synchronous initial render using window.PORTFOLIO_IMAGES
  renderPortfolio(true);
  initFeaturedAccordion();

  // Asynchronous update from backend API if available
  fetch('/api/projects')
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        window.PORTFOLIO_IMAGES = data;
        renderPortfolio(false);
        initFeaturedAccordion();
      }
    })
    .catch(err => console.log('API refresh fallback:', err.message));

  /* -------------------------------------------------------
     5. Contact Form Validation & Submission
  ------------------------------------------------------- */
  const form         = document.getElementById('contact-form');
  const submitBtn    = document.getElementById('submit-btn');
  const feedbackBox  = document.getElementById('form-feedback');
  const captchaQuestionEl = document.getElementById('captcha-question');
  const captchaAnswerEl   = document.getElementById('captcha-answer');
  const captchaErrorEl    = document.getElementById('captcha-error');
  const captchaRefreshBtn = document.getElementById('captcha-refresh-btn');

  let currentCaptchaResult = null;

  function generateCaptcha() {
    if (!captchaQuestionEl) return;
    const num1 = Math.floor(Math.random() * 8) + 2;
    const num2 = Math.floor(Math.random() * 8) + 1;
    const isAddition = Math.random() > 0.3;

    if (isAddition) {
      currentCaptchaResult = num1 + num2;
      captchaQuestionEl.textContent = `${num1} + ${num2} = ?`;
    } else {
      const bigger = Math.max(num1, num2) + 2;
      const smaller = Math.min(num1, num2);
      currentCaptchaResult = bigger - smaller;
      captchaQuestionEl.textContent = `${bigger} − ${smaller} = ?`;
    }

    if (captchaAnswerEl) {
      captchaAnswerEl.value = '';
      captchaAnswerEl.classList.remove('error');
    }
    if (captchaErrorEl) captchaErrorEl.textContent = '';
  }

  generateCaptcha();

  if (captchaRefreshBtn) {
    captchaRefreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      generateCaptcha();
      if (captchaAnswerEl) captchaAnswerEl.focus();
    });
  }

  if (form && submitBtn && feedbackBox) {
    const btnText    = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');

    const fields = {
      name:           { el: document.getElementById('name'),           err: document.getElementById('name-error')           },
      email:          { el: document.getElementById('email'),          err: document.getElementById('email-error')          },
      phone:          { el: document.getElementById('phone'),          err: document.getElementById('phone-error')          },
      projectDetails: { el: document.getElementById('projectDetails'), err: document.getElementById('projectDetails-error') },
    };

    function isValidEmail(val) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }

    function isValidPhone(val) {
      return /^[\d\s\-\+\(\)\.]{7,20}$/.test(val.trim());
    }

    function validateField(name) {
      if (name === 'captcha') {
        if (!captchaAnswerEl) return true;
        const val = captchaAnswerEl.value.trim();
        if (!val) {
          captchaAnswerEl.classList.add('error');
          if (captchaErrorEl) captchaErrorEl.textContent = 'Please solve the security check.';
          return false;
        }
        if (parseInt(val, 10) !== currentCaptchaResult) {
          captchaAnswerEl.classList.add('error');
          if (captchaErrorEl) captchaErrorEl.textContent = 'Incorrect answer. Please try again.';
          return false;
        }
        captchaAnswerEl.classList.remove('error');
        if (captchaErrorEl) captchaErrorEl.textContent = '';
        return true;
      }

      if (!fields[name] || !fields[name].el) return true;
      const { el, err } = fields[name];
      const val = el.value.trim();
      let msg = '';

      if (name === 'name' && !val) {
        msg = 'Please enter your full name.';
      } else if (name === 'email') {
        if (!val) msg = 'Please enter your email address.';
        else if (!isValidEmail(val)) msg = 'Please enter a valid email (e.g. name@email.com).';
      } else if (name === 'phone') {
        if (!val) msg = 'Please enter your phone number.';
        else if (!isValidPhone(val)) msg = 'Please enter a valid phone number.';
      } else if (name === 'projectDetails' && !val) {
        msg = 'Please describe your project.';
      }

      if (msg) {
        el.classList.add('error');
        if (err) err.textContent = msg;
        return false;
      } else {
        el.classList.remove('error');
        if (err) err.textContent = '';
        return true;
      }
    }

    Object.keys(fields).forEach((name) => {
      if (fields[name] && fields[name].el) {
        fields[name].el.addEventListener('blur', () => validateField(name));
        fields[name].el.addEventListener('input', () => {
          if (fields[name].el.classList.contains('error')) {
            validateField(name);
          }
        });
      }
    });

    if (captchaAnswerEl) {
      captchaAnswerEl.addEventListener('blur', () => validateField('captcha'));
      captchaAnswerEl.addEventListener('input', () => {
        if (captchaAnswerEl.classList.contains('error')) {
          validateField('captcha');
        }
      });
    }

    function showFeedback(type, msg) {
      feedbackBox.classList.remove('hidden', 'success', 'error-msg');
      feedbackBox.classList.add(type);
      feedbackBox.textContent = msg;
      feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function setLoading(loading) {
      if (loading) {
        if (btnText) btnText.textContent = 'Sending…';
        if (btnSpinner) btnSpinner.classList.remove('hidden');
        submitBtn.disabled = true;
      } else {
        if (btnText) btnText.textContent = 'Submit Request';
        if (btnSpinner) btnSpinner.classList.add('hidden');
        submitBtn.disabled = false;
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedbackBox.classList.add('hidden');

      const isCaptchaValid = validateField('captcha');
      const valid = Object.keys(fields).map(validateField).every(Boolean) && isCaptchaValid;
      if (!valid) {
        const firstError = form.querySelector('.error');
        if (firstError) firstError.focus();
        return;
      }

      setLoading(true);

      const payload = {
        name:           fields.name.el.value.trim(),
        email:          fields.email.el.value.trim(),
        phone:          fields.phone.el.value.trim(),
        projectDetails: fields.projectDetails.el.value.trim(),
        recipient:      'narminbm@gmail.com',
      };

      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      try {
        let success = false;

        // 1. If running locally with Node/Express backend, post to API
        if (isLocalHost) {
          try {
            const res = await fetch('/api/contact', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify(payload),
            });

            if (res.ok) {
              const data = await res.json();
              if (data && data.success) success = true;
            }
          } catch (apiErr) {
            console.log('Local API error, attempting fallback:', apiErr);
          }
        }

        // 2. Netlify Production Submission (or fallback)
        if (!success) {
          const formData = new FormData(form);
          if (!formData.get('form-name')) {
            formData.append('form-name', 'contact');
          }
          const encodedBody = new URLSearchParams(formData).toString();

          const netlifyRes = await fetch('/', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    encodedBody,
          });

          if (netlifyRes.ok || netlifyRes.status === 200 || netlifyRes.status === 303) {
            success = true;
          }
        }

        if (success) {
          showFeedback('success', '✓ Thank you! Your request has been received. Our team will review your project and contact you at ' + payload.email + ' within 24–48 hours.');
          form.reset();
          generateCaptcha();
        } else {
          showFeedback('error-msg', 'Submission could not be completed. Please try again.');
        }
      } catch (err) {
        showFeedback('error-msg', 'Network error. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    });
  }

  /* -------------------------------------------------------
     6. Active nav link based on scroll position
  ------------------------------------------------------- */
  const sections  = document.querySelectorAll('main section[id]');
  const navLinks  = document.querySelectorAll('.nav-menu a[href^="#"]');

  if (sections.length > 0 && navLinks.length > 0) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((link) => {
              link.classList.toggle(
                'nav-active',
                link.getAttribute('href') === `#${entry.target.id}`
              );
            });
          }
        });
      },
      { threshold: 0.4 }
    );

    sections.forEach((s) => navObserver.observe(s));
  }

  const style = document.createElement('style');
  style.textContent = `
    .nav-menu a.nav-active {
      color: var(--color-gold) !important;
    }
  `;
  document.head.appendChild(style);

})();
