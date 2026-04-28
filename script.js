/* script.js — interactive behaviors for the homepage
 *
 * Responsibilities:
 *  - Toggle CSS `--kitchen-scale` for fullscreen-like layouts
 *  - Click-to-open toggle behavior for cupboard, stove, sink (mobile-first)
 *  - Initialize GSAP Draggable for decorative eggs and skill items when available
 *  - Small helpers and accessibility (aria-expanded) updates
 *
 * Notes:
 *  - `open` class on containers is the single source of truth for open state.
 *  - Subtitle links are intercepted on first tap to open overlays on mobile.
 */
const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.Draggable !== 'undefined';

/* ==================================================
    SECTION 1: GLOBAL VIEWPORT SCALE HANDLER
    - Maintains `--kitchen-scale` based on fullscreen-like state
    ================================================== */

// Toggle a CSS variable `--kitchen-scale` based on fullscreen-like state.
// This IIFE contains a small heuristic to decide when the page feels "fullscreen"
// (either via the Fullscreen API or by the browser UI being hidden such as F11).
(function(){
	const root = document.documentElement;
	const FULL_SCALE = 1;
	const SMALL_SCALE = 0.5;
	const THRESHOLD_PX = 8; // tolerance when comparing innerHeight to screen height

    function isFullscreenLike(){
        // Prefer the Fullscreen API result when available — it's explicit.
        if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement) return true;

        // Fallback heuristic: if the viewport innerHeight is close to the screen height
        // (this indicates the browser chrome is hidden, e.g., user pressed F11).
        const ih = window.innerHeight;
        const sh = window.screen ? (window.screen.height || window.screen.availHeight) : null;
        if (sh && Math.abs(sh - ih) <= THRESHOLD_PX) return true;

        return false;
    }

	function updateKitchenScale(){
		const scale = isFullscreenLike() ? FULL_SCALE : SMALL_SCALE;
		root.style.setProperty('--kitchen-scale', scale);
	}

	window.addEventListener('resize', updateKitchenScale);
	document.addEventListener('fullscreenchange', updateKitchenScale);
	document.addEventListener('webkitfullscreenchange', updateKitchenScale);
	document.addEventListener('mozfullscreenchange', updateKitchenScale);
	document.addEventListener('DOMContentLoaded', updateKitchenScale);
	updateKitchenScale();
})();

/* ==================================================
    SECTION 2: HOME PAGE INTERACTION TOGGLES
    - Handles cupboard/sink/stove open-close behavior
    ================================================== */

// Click-to-open behavior for cupboard, sink, and stove.
(function () {
    function closeAll() {
        document.querySelectorAll('#cupboard.open, #sink.open, .stove-link.open').forEach(el => el.classList.remove('open'));
        document.querySelectorAll('.subtitle-link').forEach(a => a.setAttribute('aria-expanded', 'false'));
    }

    // Subtitle links should navigate immediately.
    // The container itself still toggles the open/closed artwork state.
    function onSubtitleClick(e) {
        const link = e.currentTarget;
        const container = link.closest('.stove-link, #cupboard, #sink');
        if (!container) return;
        link.setAttribute('aria-expanded', 'true');
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.subtitle-link').forEach(link => {
            link.setAttribute('aria-expanded', 'false');
            link.addEventListener('click', onSubtitleClick);
        });

        // Close when clicking/tapping outside the interactive containers
        document.addEventListener('click', function (e) {
            if (!e.target.closest('#cupboard, #sink, .stove-link')) {
                closeAll();
            }
        });

        // Allow Escape to close
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeAll();
        });
    });
    
    // Also allow clicking the container/image to open — clicking again will close it.
    document.addEventListener('DOMContentLoaded', function () {
        // Allow clicking the container itself to toggle open/closed.
        // We ignore clicks that come from the subtitle link (they are handled above).
        document.querySelectorAll('.stove-link, #cupboard, #sink').forEach(container => {
            container.addEventListener('click', function (e) {
                if (e.target.closest('.subtitle-link')) return; // subtitle link handled separately

                // If the container is currently open, a click on the overlay should close it.
                if (container.classList.contains('open')) {
                    container.classList.remove('open');
                    const link = container.querySelector('.subtitle-link');
                    if (link) link.setAttribute('aria-expanded', 'false');
                    return;
                }

                // Otherwise open this container (and close any others).
                closeAll();
                container.classList.add('open');
                const link = container.querySelector('.subtitle-link');
                if (link) link.setAttribute('aria-expanded', 'true');
            });
        });
    });
})();

/* ==================================================
    SECTION 3: ABOUT QUICK MENU
    - Toggles the menu icon dropdown on About-style headers
    ================================================== */
function initAboutQuickMenu() {
    const menuWrap = document.querySelector('.about-menu-wrap');
    const menuButton = document.querySelector('.about-menu-button');
    const quickMenu = document.querySelector('.about-quick-menu');

    if (!menuWrap || !menuButton || !quickMenu) return;

    function setOpen(isOpen) {
        menuWrap.classList.toggle('is-open', isOpen);
        menuButton.setAttribute('aria-expanded', String(isOpen));
        quickMenu.hidden = !isOpen;
    }

    setOpen(false);

    menuButton.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!menuWrap.classList.contains('is-open'));
    });

    quickMenu.querySelectorAll('.about-quick-menu-button').forEach((button) => {
        button.addEventListener('click', function () {
            setOpen(false);
        });
    });

    document.addEventListener('click', function (e) {
        if (!menuWrap.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (!menuWrap.classList.contains('is-open')) return;
        setOpen(false);
        menuButton.focus();
    });
}

/* ==================================================
    SECTION 4: CONTACT PAGE PAN TOGGLE
    - Toggles the socials illustration between default and clicked states
    ================================================== */
function initContactPanToggle() {
    const panButton = document.querySelector('[data-contact-pan]');
    if (!panButton) return;

    panButton.addEventListener('click', function () {
        const isActive = panButton.classList.toggle('is-active');
        panButton.setAttribute('aria-pressed', String(isActive));
    });
}

/* ==================================================
    SECTION 5: WORKS PAGE LIGHTBOX
    - Builds source list from gallery tiles
    - Handles fullscreen open/close/navigation
    ================================================== */
function initWorksLightbox() {
    if (!document.body.classList.contains('works-page')) return;

    const lightbox = document.querySelector('.works-lightbox');
    const lightboxImage = document.querySelector('.works-lightbox__image');
    const prevButton = document.querySelector('.works-lightbox__nav--prev');
    const nextButton = document.querySelector('.works-lightbox__nav--next');

    if (!lightbox || !lightboxImage || !prevButton || !nextButton) return;

    lightboxImage.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    lightboxImage.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    function parseBackgroundImageUrl(backgroundImage) {
        if (!backgroundImage || backgroundImage === 'none') return '';
        const match = backgroundImage.match(/url\((['"]?)(.*?)\1\)/i);
        return match ? match[2] : '';
    }

    function labelFromWorkItem(item) {
        const explicitLabel = item.dataset.lightboxAlt || item.getAttribute('aria-label');
        if (explicitLabel) return explicitLabel;

        const imageClass = Array.from(item.classList).find((className) => className.startsWith('img-'));
        if (!imageClass) return 'Artwork image';

        return imageClass
            .replace(/^img-/, '')
            .replace(/[-_]+/g, ' ')
            .trim();
    }

    const items = [];

    document.querySelectorAll('.works-card img').forEach((image) => {
        const src = image.currentSrc || image.src || '';
        if (!src) return;

        const trigger = image.closest('.works-card') || image;
        items.push({
            src,
            alt: image.alt || 'Artwork image',
            trigger
        });
    });

    document.querySelectorAll('.work-item').forEach((item) => {
        const src = parseBackgroundImageUrl(getComputedStyle(item).backgroundImage);
        if (!src) return;

        items.push({
            src,
            alt: labelFromWorkItem(item),
            trigger: item
        });
    });

    if (items.length === 0) return;

    let currentIndex = 0;
    let lastTrigger = null;
    const imageSizeCache = new Map();
    let currentImageSize = null;

    function getElementTarget(target) {
        if (target instanceof Element) return target;
        return target && target.parentElement ? target.parentElement : null;
    }

    function loadImageSize(src) {
        if (!src) return Promise.resolve(null);
        if (imageSizeCache.has(src)) return Promise.resolve(imageSizeCache.get(src));

        return new Promise((resolve) => {
            const probe = new Image();

            function finish(size) {
                imageSizeCache.set(src, size);
                resolve(size);
            }

            probe.addEventListener('load', () => {
                finish({
                    width: probe.naturalWidth || 0,
                    height: probe.naturalHeight || 0
                });
            }, { once: true });

            probe.addEventListener('error', () => {
                finish(null);
            }, { once: true });

            probe.src = src;
        });
    }

    function applyImageBoxSize(size) {
        if (!size || !size.width || !size.height) {
            lightboxImage.style.width = '';
            lightboxImage.style.height = '';
            return;
        }

        const isTabletViewport = window.innerWidth >= 768 && window.innerWidth <= 1024;
        const maxWidth = isTabletViewport
            ? window.innerWidth * 0.96
            : Math.min(window.innerWidth * 0.84, 1180);
        const maxHeight = window.innerHeight * 0.84;
        const imageRatio = size.width / size.height;
        const boxRatio = maxWidth / maxHeight;

        let width = maxWidth;
        let height = maxHeight;

        if (imageRatio > boxRatio) {
            height = width / imageRatio;
        } else {
            width = height * imageRatio;
        }

        lightboxImage.style.width = `${Math.max(1, width)}px`;
        lightboxImage.style.height = `${Math.max(1, height)}px`;
    }

    function renderCurrentImage() {
        const item = items[currentIndex];
        const src = item.src || '';
        const safeSrc = String(item.src || '').replace(/"/g, '\\"');
        lightboxImage.style.backgroundImage = safeSrc ? `url("${safeSrc}")` : 'none';
        lightboxImage.setAttribute('aria-label', item.alt || 'Artwork image');
        lightbox.setAttribute('aria-label', item.alt || 'Digital art image viewer');

        currentImageSize = null;
        applyImageBoxSize(null);
        loadImageSize(src).then((size) => {
            const activeSrc = items[currentIndex] && items[currentIndex].src;
            if (activeSrc !== src) return;
            currentImageSize = size;
            applyImageBoxSize(size);
        });
    }

    function openLightbox(index, trigger) {
        currentIndex = (index + items.length) % items.length;
        lastTrigger = trigger || document.activeElement;
        renderCurrentImage();
        lightbox.hidden = false;
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
        requestAnimationFrame(() => prevButton.focus());
    }

    function closeLightbox() {
        if (lightbox.hidden) return;
        lightbox.hidden = true;
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('lightbox-open');

        if (lastTrigger && typeof lastTrigger.focus === 'function') {
            lastTrigger.focus();
        }
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % items.length;
        renderCurrentImage();
    }

    function showPrevious() {
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        renderCurrentImage();
    }

    items.forEach((item, index) => {
        const trigger = item.trigger;
        if (!trigger) return;

        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('role', 'button');
        trigger.setAttribute('aria-label', `Open ${item.alt || 'image'}`);

        trigger.addEventListener('click', () => {
            openLightbox(index, trigger);
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            openLightbox(index, trigger);
        });
    });

    prevButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showPrevious();
    });

    nextButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showNext();
    });
    function shouldCloseFromEvent(e) {
        // 1. Nếu click trúng nút Next hoặc Prev -> kh dong
        if (e.target.closest('.works-lightbox__nav')) {
            return false;
        }

        // 2. Nếu click trúng cái ảnh (hoặc cái shell bao quanh ảnh) -> kh dong
        if (e.target.closest('.works-lightbox__shell') || e.target.closest('.works-lightbox__image')) {
            return false;
        }

        // 3. Tất cả các trường hợp còn lại (click vào khoảng trống nền đen) -> dong
        return true;
    }

    //==============================================================
    // Fix clicakble backgroudn in fullscreen overlay mode - mobile & tablet
    //==============================================================
    function handleLightboxInteraction(e) {
        // 1. Ngăn chặn sự kiện lan xuống các element bên dưới (QUAN TRỌNG NHẤT)
        e.stopPropagation();

        // 2. Kiểm tra xem người dùng có đang chạm vào nút điều hướng hoặc ảnh không
        const isNav = e.target.closest('.works-lightbox__nav');
        const isImage = e.target.closest('.works-lightbox__image') || e.target.closest('.works-lightbox__shell');

        if (isNav || isImage) {
            // Nếu chạm trúng nút hoặc ảnh -> KHÔNG làm gì cả, để các hàm khác xử lý
            return;
        }

        // 3. Nếu chạm vào bất kỳ chỗ nào khác (tức là vùng nền đen) -> ĐÓNG LIGHTBOX
        closeLightbox();
    }

    // Lắng nghe cả 'pointerdown' để chặn ngay khi vừa chạm tay (dành cho Mobile)
    // và 'click' để đảm bảo hoạt động trên Desktop
    lightbox.addEventListener('pointerdown', handleLightboxInteraction);
    lightbox.addEventListener('click', handleLightboxInteraction);


    window.addEventListener('resize', () => {
        if (lightbox.hidden) return;
        applyImageBoxSize(currentImageSize);
    });

    document.addEventListener('keydown', (e) => {
        if (lightbox.hidden) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeLightbox();
            return;
        }

        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            showPrevious();
            return;
        }

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            showNext();
        }
    });
}

/* ==================================================
    SECTION 5: ABOUT PORTRAIT INTERACTION
    - Keeps hover-like toggling on click/tap and keyboard
    ================================================== */
function initAboutPortraitSwap() {
    const portrait = document.querySelector('.about-portrait');
    if (!portrait) return;

    portrait.classList.remove('is-hovered');
    portrait.setAttribute('tabindex', '0');

    function togglePortraitState() {
        portrait.classList.toggle('is-hovered');
    }

    portrait.addEventListener('click', function (e) {
        e.preventDefault();
        togglePortraitState();
    });

    portrait.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        togglePortraitState();
    });

    document.addEventListener('click', function (e) {
        if (portrait.contains(e.target)) return;
        portrait.classList.remove('is-hovered');
    });
}

/* ==================================================
    SECTION 7: ABOUT PAGE INTRO ANIMATION
    - Dedicated timeline for About layout only
    ================================================== */
function initAboutPageAnimations() {
    if (!document.body.classList.contains('about-page')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const heroCopy = document.querySelector('[data-about-animate="copy"]');
    const portrait = document.querySelector('[data-about-animate="portrait"]');
    const skillTrack = document.querySelector('[data-about-animate="skills"]');
    const extraColumns = document.querySelectorAll('.about-extra-column');
    const headerChildren = document.querySelectorAll('.about-header > *');

    const intro = gsap.timeline({
        defaults: {
            duration: 0.6,
            ease: 'power2.out'
        }
    });

    intro
        .from(headerChildren, { y: -18, opacity: 0, stagger: 0.08 })
        .from(heroCopy, { x: -26, opacity: 0 }, '-=0.25')
        .from(portrait, { x: 30, opacity: 0, scale: 0.95 }, '-=0.45')
        .from(skillTrack, { y: 28, opacity: 0 }, '-=0.15')
        .from(extraColumns, { y: 24, opacity: 0, stagger: 0.12 }, '-=0.15');
}

/* ==================================================
    SECTION 8: LOAD ANIMATIONS
    - data-animate
    -fade-up, fade-down, fade-left, fade-right
    ================================================== */
function initOtherPagesLoadAnimations() {
    if (document.body.classList.contains('about-page')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const headerChildren = Array.from(document.querySelectorAll('header > *')).filter((el) => !el.hidden);
    const footerChildren = Array.from(document.querySelectorAll('footer > *')).filter((el) => !el.hidden);
    const timeline = gsap.timeline({
        defaults: {
            duration: 0.58,
            ease: 'power2.out'
        }
    });

    if (document.body.classList.contains('index-page')) {
        const backgroundLayer = document.querySelector('.background-layer');
        const subtitleLinks = document.querySelectorAll('.subtitle-link');
        const homeTitle = document.querySelector('.home-title');

        if (backgroundLayer) {
            timeline.from(backgroundLayer, { opacity: 0, y: 20, scale: 0.98 });
        }

        if (homeTitle) {
            timeline.from(homeTitle, { opacity: 0, y: 26 }, '-=0.25');
        }

        if (subtitleLinks.length) {
            timeline.from(subtitleLinks, { opacity: 0, y: 16, stagger: 0.08 }, '-=0.35');
        }

        if (footerChildren.length) {
            timeline.from(footerChildren, { opacity: 0, y: 14, stagger: 0.08 }, '-=0.2');
        }
        return;
    }

    if (document.body.classList.contains('works-page')) {
        const tabs = document.querySelectorAll('.works-type');
        const sideNote = document.querySelector('.works-side-note');
        const galleryColumns = document.querySelectorAll('.gallery-col');

        if (headerChildren.length) {
            timeline.from(headerChildren, { y: -18, opacity: 0, stagger: 0.08 });
        }

        if (tabs.length) {
            timeline.from(tabs, { y: 20, opacity: 0, stagger: 0.09 }, '-=0.25');
        }

        if (sideNote) {
            timeline.from(sideNote, { y: 18, opacity: 0 }, '-=0.28');
        }

        if (galleryColumns.length) {
            timeline.from(galleryColumns, { y: 30, opacity: 0, stagger: 0.12 }, '-=0.2');
        }

        if (footerChildren.length) {
            timeline.from(footerChildren, { y: 14, opacity: 0, stagger: 0.08 }, '-=0.2');
        }
        return;
    }

    const mainChildren = Array.from(document.querySelectorAll('main > *')).filter((el) => !el.hidden);

    if (headerChildren.length) {
        timeline.from(headerChildren, { y: -18, opacity: 0, stagger: 0.08 });
    }

    if (mainChildren.length) {
        timeline.from(mainChildren, { y: 24, opacity: 0, stagger: 0.12 }, '-=0.24');
    }

    if (footerChildren.length) {
        timeline.from(footerChildren, { y: 14, opacity: 0, stagger: 0.08 }, '-=0.2');
    }
}
/* ==================================================
CHO GALLERY THOI
================================================== */
    function animateGallery() {
    // 1. CHỈ tìm các element có [data-animate] nằm TRONG .works-gallery
    const gallery = document.querySelector('.works-gallery');
    
    // Nếu không tìm thấy gallery (ở các trang khác) thì dừng luôn, không làm gì cả
    if (!gallery) return;

    const elements = gallery.querySelectorAll('[data-animate]');
    if (elements.length === 0) return;

    const tl = gsap.timeline({
        defaults: {
            duration: 0.8,
            ease: "power3.out"
        }
    });

    elements.forEach((el, index) => {
        const type = el.getAttribute('data-animate') || 'fade-up';
        
        let startVars = { opacity: 0, x: 0, y: 0, scale: 1 };

        // Xử lý hướng bay
        if (type.includes('up') || type.includes('u')) startVars.y = 50;
        else if (type.includes('down')) startVars.y = -50;
        else if (type.includes('left')) startVars.x = 50;
        else if (type.includes('right')) startVars.x = -50;

        // 2. Dùng fromTo để đảm bảo an toàn cho Grid/Flexbox
        tl.fromTo(el, 
            startVars, 
            { opacity: 1, x: 0, y: 0, scale: 1 }, 
            index * 0.1 
        );
    });
}

// Gọi hàm khi trang load xong
document.addEventListener('DOMContentLoaded', animateGallery);
/* ==================================================
    SECTION 9: ABOUT SKILLS DRAG-SORTER
    - Draggable reorder behavior for skill bottles
    ================================================== */
function initAboutSkillSorter() {
    const track = document.querySelector('.about-skills-track');
    if (!track) return;

    const items = Array.from(track.querySelectorAll('.skill-item'));
    if (items.length < 2) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = {
        order: [...items],
        slots: new Map(),
        activeItem: null
    };
    const draggers = [];
    let isInitialized = false;

    const tweenDuration = prefersReducedMotion ? 0 : 0.35;
    const mobileSkillsLayoutQuery = window.matchMedia('(max-width: 767px)');

    function useMobileSkillsLayout() {
        return mobileSkillsLayoutQuery.matches;
    }

    function resolveCssLengthToPx(value, fallback = 16) {
        if (!value) return fallback;

        const probe = document.createElement('div');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.pointerEvents = 'none';
        probe.style.width = value;

        track.appendChild(probe);
        const px = probe.getBoundingClientRect().width;
        probe.remove();

        return Number.isFinite(px) && px > 0 ? px : fallback;
    }

    function getTrackGap() {
        const styles = getComputedStyle(track);
        const rawGap = styles.getPropertyValue('--about-skill-gap').trim() || styles.columnGap || styles.gap || '16px';
        return resolveCssLengthToPx(rawGap, 16) * 1.05;
    }

    function computeAvailableGap(totalWidth, widths, preferredGap) {
        const parentWidth = track.parentElement ? track.parentElement.clientWidth : track.clientWidth;
        const minGap = 8;

        if (!parentWidth) return preferredGap;
        if (totalWidth <= parentWidth) return preferredGap;

        const fittedGap = (parentWidth - widths) / Math.max(1, items.length - 1);
        return Math.max(minGap, Math.min(preferredGap, fittedGap));
    }

    function assignSlots(slots, trackWidth, trackHeight) {
        state.slots.clear();

        slots.forEach(({ item, x, y, width, height }, index) => {
            state.slots.set(item, {
                x,
                y,
                width,
                height,
                index
            });
            item.dataset.slotIndex = String(index);
        });

        track.style.width = `${trackWidth}px`;
        track.style.height = `${trackHeight}px`;
    }

    function measureLinearLayout(sizes) {
        const preferredGap = getTrackGap();
        const widths = sizes.reduce((total, { width }) => total + width, 0);
        const gap = computeAvailableGap(widths + (preferredGap * (sizes.length - 1)), widths, preferredGap);
        const maxHeight = sizes.reduce((max, { height }) => Math.max(max, height), 0);
        let currentX = 0;

        const slots = sizes.map(({ item, width, height }, index) => {
            const slot = {
                item,
                width,
                height,
                x: currentX,
                y: maxHeight - height
            };

            currentX += width + (index === sizes.length - 1 ? 0 : gap);
            return slot;
        });

        assignSlots(slots, currentX, maxHeight);
    }

    function measureMobileLayout(sizes) {
        if (sizes.length < 5) {
            measureLinearLayout(sizes);
            return;
        }

        const availableWidth = track.parentElement && track.parentElement.clientWidth
            ? track.parentElement.clientWidth
            : track.clientWidth;
        const totalBottomWidth = sizes
            .slice(2)
            .reduce((total, { width }) => total + width, 0);
        const trackWidth = Math.max(availableWidth, totalBottomWidth + 48);
        const topRow = sizes.slice(0, 2);
        const bottomRow = sizes.slice(2, 5);
        const topRowHeight = topRow.reduce((max, { height }) => Math.max(max, height), 0);
        const bottomRowHeight = bottomRow.reduce((max, { height }) => Math.max(max, height), 0);
        const rowGap = Math.max(16, Math.min(24, trackWidth * 0.055));
        const topCenters = [0.28, 0.72];
        const bottomCenters = [0.12, 0.5, 0.88];

        function clampSlotX(centerFactor, width) {
            const centeredX = (trackWidth * centerFactor) - (width / 2);
            return Math.max(0, Math.min(trackWidth - width, centeredX));
        }

        const slots = [];

        topRow.forEach(({ item, width, height }, index) => {
            slots.push({
                item,
                width,
                height,
                x: clampSlotX(topCenters[index], width),
                y: topRowHeight - height
            });
        });

        bottomRow.forEach(({ item, width, height }, index) => {
            slots.push({
                item,
                width,
                height,
                x: clampSlotX(bottomCenters[index], width),
                y: topRowHeight + rowGap + (bottomRowHeight - height)
            });
        });

        assignSlots(slots, trackWidth, topRowHeight + rowGap + bottomRowHeight);
    }

    function measureLayout() {
        track.style.width = '';
        track.style.height = '';

        const sizes = state.order.map((item) => {
            const { width, height } = item.getBoundingClientRect();
            return { item, width, height };
        });

        if (useMobileSkillsLayout()) {
            measureMobileLayout(sizes);
            return;
        }

        measureLinearLayout(sizes);
    }

    function moveItemToIndex(currentIndex, nextIndex) {
        if (currentIndex === nextIndex) return;

        const [draggedItem] = state.order.splice(currentIndex, 1);
        state.order.splice(nextIndex, 0, draggedItem);
        refreshLayout(true);
    }

    function findNearestSlotIndex(dragger) {
        const draggedItem = dragger.target;
        const draggedSlot = state.slots.get(draggedItem);
        const draggedWidth = draggedSlot ? draggedSlot.width : draggedItem.getBoundingClientRect().width;
        const draggedHeight = draggedSlot ? draggedSlot.height : draggedItem.getBoundingClientRect().height;
        const draggedCenterX = dragger.x + (draggedWidth / 2);
        const draggedCenterY = dragger.y + (draggedHeight / 2);
        let nearestIndex = state.order.indexOf(draggedItem);
        let nearestDistance = Number.POSITIVE_INFINITY;

        state.order.forEach((item, index) => {
            const slot = state.slots.get(item);
            if (!slot) return;

            const slotCenterX = slot.x + (slot.width / 2);
            const slotCenterY = slot.y + (slot.height / 2);
            const distance = Math.hypot(draggedCenterX - slotCenterX, draggedCenterY - slotCenterY);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        return nearestIndex;
    }

    function moveItems(animate = false) {
        state.order.forEach((item) => {
            if (item === state.activeItem) return;

            const slot = state.slots.get(item);
            if (!slot) return;

            const vars = {
                x: slot.x,
                y: slot.y,
                overwrite: 'auto'
            };

            if (animate && tweenDuration > 0) {
                gsap.to(item, {
                    ...vars,
                    duration: tweenDuration,
                    ease: 'power2.inOut'
                });
                return;
            }

            gsap.set(item, vars);
        });
    }

    function refreshLayout(animate = false) {
        measureLayout();
        moveItems(animate);
        draggers.forEach((dragger) => dragger.applyBounds(track));
    }

    function handleSwap(dragger) {
        const draggedItem = dragger.target;
        const currentIndex = state.order.indexOf(draggedItem);
        if (currentIndex === -1) return;

        moveItemToIndex(currentIndex, findNearestSlotIndex(dragger));
    }

    function createDraggers() {
        if (isInitialized) return;

        items.forEach((item) => {
            const [dragger] = Draggable.create(item, {
                type: 'x,y',
                bounds: track,
                zIndexBoost: false,
                onPress: function() {
                    state.activeItem = item;
                    item.classList.add('is-dragging');
                    gsap.killTweensOf(item);
                    gsap.set(item, { zIndex: 30 });
                    gsap.to(item, {
                        scale: prefersReducedMotion ? 1 : 1.04,
                        duration: prefersReducedMotion ? 0 : 0.18,
                        ease: 'power2.out',
                        overwrite: 'auto'
                    });
                },
                onDrag: function() {
                    handleSwap(this);
                },
                onRelease: function() {
                    const slot = state.slots.get(item);
                    item.classList.remove('is-dragging');
                    state.activeItem = null;

                    if (!slot) return;

                    gsap.to(item, {
                        x: slot.x,
                        y: slot.y,
                        scale: 1,
                        duration: tweenDuration,
                        ease: 'power2.inOut',
                        overwrite: 'auto',
                        onComplete: () => gsap.set(item, { zIndex: 1 })
                    });
                }
            });
            draggers.push(dragger);
        });

        isInitialized = true;
    }

    function initSorter() {
        refreshLayout(false);
        createDraggers();
        requestAnimationFrame(() => refreshLayout(false));
    }

    let resizeFrame = null;
    window.addEventListener('resize', () => {
        if (state.activeItem) return;
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => refreshLayout(false));
    });

    if (document.readyState === 'complete') {
        initSorter();
        return;
    }

    window.addEventListener('load', initSorter, { once: true });
}

/* ==================================================
    SECTION 10: APP BOOTSTRAP
    - Initializes shared and page-specific features on DOM ready
    ================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initAboutQuickMenu();
    initContactPanToggle();
    initAboutPortraitSwap();
    initWorksLightbox();

    if (!hasGSAP) return;

    gsap.registerPlugin(Draggable);

    // Home-only decorative eggs become draggable when present.
    (function initEggDraggables() {
        const eggs = document.querySelectorAll('.home-egg');
        if (eggs.length === 0) return;
        Draggable.create(".home-egg", {
            type: "x,y",
            bounds: window,
            onPress: function() {
                gsap.to(this.target, { zIndex: 11, duration: 0.1 });
                this.target.style.cursor = 'grabbing';
            },
            onRelease: function() {
                gsap.to(this.target, { zIndex: 10, duration: 0.1 });
                this.target.style.cursor = 'grab';
            }
        });
    })();

    if (document.querySelector('#nut-trung')) {
        Draggable.create("#nut-trung", {
            type: "y",
            bounds: "#textbox-extracurriculars",
            onPress: function() { gsap.to(this.target, { scale: 1.1, duration: 0.2 }); },
            onRelease: function() {
                gsap.to(this.target, { y: 0, scale: 1, duration: 1.2, ease: "elastic.out(1, 0.5)" });
            }
        });
    }

    initAboutSkillSorter();
    initAboutPageAnimations();
    initOtherPagesLoadAnimations();
});


