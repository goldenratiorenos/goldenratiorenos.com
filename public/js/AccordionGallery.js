/**
 * AccordionGallery Component (from React Bits)
 * Vanilla JS + GSAP Implementation
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['gsap'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('gsap'));
  } else {
    root.AccordionGallery = factory(root.gsap);
  }
})(typeof self !== 'undefined' ? self : this, function (gsap) {
  'use strict';

  function createAccordionGallery(container, options) {
    if (!container) return null;

    const opts = Object.assign({
      items: [],
      defaultIndex: 2,
      accentColor: '#D97706',
      overlayColor: '#0C0A09',
      textColor: '#FAFAF9',
      height: 460,
      gap: 12,
      radius: 16,
      expandRatio: 0.52,
      orientation: 'horizontal',
      duration: 0.6,
      ease: 'power3.out',
      parallax: 0.5,
      tilt: 8,
      stagger: 0.06,
      trigger: 'hover',
      showLabels: true,
      grayscale: true,
      className: '',
      onPanelClick: null
    }, options);

    const count = opts.items.length;
    if (count === 0) return null;

    let active = Math.min(Math.max(opts.defaultIndex, 0), count - 1);
    let tl = null;
    let firstRun = true;
    let mediaSize = 320;
    const vertical = opts.orientation === 'vertical';

    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    // Render HTML structure
    container.innerHTML = '';
    const rootEl = document.createElement('div');
    rootEl.className = `accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${opts.className ? ` ${opts.className}` : ''}`;
    rootEl.setAttribute('role', 'list');
    rootEl.setAttribute('aria-label', 'Image accordion gallery');
    rootEl.style.setProperty('--ag-accent', opts.accentColor);
    rootEl.style.setProperty('--ag-overlay', opts.overlayColor);
    rootEl.style.setProperty('--ag-text', opts.textColor);
    rootEl.style.setProperty('--ag-gap', `${opts.gap}px`);
    rootEl.style.setProperty('--ag-radius', `${opts.radius}px`);
    rootEl.style.height = vertical ? `${Math.round(opts.height * 1.6)}px` : `${opts.height}px`;

    const panelEls = [];
    const mediaEls = [];
    const barEls = [];
    const textEls = [];

    opts.items.forEach((item, i) => {
      const isActive = i === active;
      const Tag = item.link ? 'a' : 'div';
      const panel = document.createElement(Tag);
      panel.className = `ag-panel${isActive ? ' ag-panel--active' : ''}`;
      panel.style.borderRadius = `${opts.radius}px`;
      panel.setAttribute('role', 'listitem');
      panel.setAttribute('tabindex', '0');
      if (item.link) panel.href = item.link;
      if (isActive) panel.setAttribute('aria-current', 'true');
      if (item.label) panel.setAttribute('aria-label', item.label);
      if (item.projectId) panel.setAttribute('data-project-id', item.projectId);
      if (item.id) panel.setAttribute('data-id', item.id);

      const frame = document.createElement('span');
      frame.className = 'ag-panel__frame';

      const media = document.createElement('span');
      media.className = 'ag-panel__media';

      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.alt || item.label || '';
      img.draggable = false;

      media.appendChild(img);
      frame.appendChild(media);

      const overlay = document.createElement('span');
      overlay.className = 'ag-panel__overlay';
      overlay.setAttribute('aria-hidden', 'true');
      frame.appendChild(overlay);

      panel.appendChild(frame);

      let bar = null;
      let text = null;

      if (opts.showLabels && item.label) {
        const labelWrap = document.createElement('span');
        labelWrap.className = 'ag-panel__label';
        labelWrap.setAttribute('aria-hidden', 'true');

        bar = document.createElement('span');
        bar.className = 'ag-panel__bar';

        text = document.createElement('span');
        text.className = 'ag-panel__text';
        text.textContent = item.label;

        labelWrap.appendChild(bar);
        labelWrap.appendChild(text);
        panel.appendChild(labelWrap);
      }

      panelEls.push(panel);
      mediaEls.push(media);
      barEls.push(bar);
      textEls.push(text);

      // Event Handlers
      panel.addEventListener('mouseenter', () => {
        if (opts.trigger === 'hover') setActive(i);
      });

      panel.addEventListener('click', (e) => {
        if (i !== active) {
          e.preventDefault();
          setActive(i);
        } else if (typeof opts.onPanelClick === 'function') {
          opts.onPanelClick(item, i, e);
        }
      });

      panel.addEventListener('focus', () => {
        setActive(i);
      });

      panel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setActive((active + 1) % count);
          panelEls[(active + 1) % count]?.focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setActive((active - 1 + count) % count);
          panelEls[(active - 1 + count) % count]?.focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (typeof opts.onPanelClick === 'function') {
            e.preventDefault();
            opts.onPanelClick(item, i, e);
          }
        }
      });

      rootEl.appendChild(panel);
    });

    container.appendChild(rootEl);

    function applyLayout(animate) {
      if (!panelEls.length) return;

      const r = Math.min(Math.max(opts.expandRatio, 0.2), 0.9);
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;

      if (tl) tl.kill();
      const dur = animate && !prefersReduced && typeof gsap !== 'undefined' ? opts.duration : 0;
      
      if (typeof gsap !== 'undefined') {
        const newTl = gsap.timeline();

        panelEls.forEach((panel, i) => {
          if (!panel) return;
          const isActive = i === active;
          const media = mediaEls[i];
          const bar = barEls[i];
          const text = textEls[i];

          if (isActive) {
            panel.classList.add('ag-panel--active');
            panel.setAttribute('aria-current', 'true');
          } else {
            panel.classList.remove('ag-panel--active');
            panel.removeAttribute('aria-current');
          }

          const rot = isActive ? 0 : i < active ? opts.tilt : -opts.tilt;
          const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot };

          newTl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease: opts.ease }, 0);

          if (media) {
            const drift = Math.max(-1.5, Math.min(1.5, active - i));
            const shift = drift * opts.parallax * mediaSize * 0.06;
            const gray = opts.grayscale ? (isActive ? 0 : 1) : 0;
            newTl.to(
              media,
              {
                xPercent: -50,
                yPercent: -50,
                x: vertical ? 0 : isActive ? 0 : shift,
                y: vertical ? (isActive ? 0 : shift) : 0,
                '--ag-gray': gray,
                '--ag-dim': isActive ? 0 : 0.35,
                duration: dur,
                ease: opts.ease
              },
              0
            );
          }

          if (opts.showLabels && bar && text) {
            if (isActive) {
              newTl.to([bar, text], { opacity: 1, x: 0, duration: dur, ease: opts.ease, stagger: prefersReduced ? 0 : opts.stagger }, 0);
            } else {
              newTl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease: opts.ease }, 0);
            }
          }
        });

        tl = newTl;
      } else {
        // Fallback without GSAP
        panelEls.forEach((panel, i) => {
          const isActive = i === active;
          panel.style.flexGrow = isActive ? grow : '1';
          if (mediaEls[i]) {
            mediaEls[i].style.filter = isActive || !opts.grayscale ? 'grayscale(0)' : 'grayscale(1)';
          }
          if (barEls[i]) barEls[i].style.opacity = isActive ? '1' : '0';
          if (textEls[i]) textEls[i].style.opacity = isActive ? '1' : '0';
        });
      }
    }

    function measure() {
      const rect = rootEl.getBoundingClientRect();
      const total = vertical ? rect.height : rect.width;
      const usable = Math.max(total - opts.gap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(opts.expandRatio, 0.2), 0.9) * 1.22);
      mediaSize = size;
      rootEl.style.setProperty('--ag-media-size', `${size}px`);
      applyLayout(!firstRun);
    }

    function setActive(index) {
      if (index === active && !firstRun) return;
      active = index;
      applyLayout(true);
    }

    measure();
    firstRun = false;

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(rootEl);
    } else {
      window.addEventListener('resize', measure);
    }

    return {
      setActive,
      getActive: () => active,
      destroy: () => {
        if (tl) tl.kill();
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener('resize', measure);
        container.innerHTML = '';
      }
    };
  }

  return createAccordionGallery;
});
