const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

document.addEventListener('DOMContentLoaded', () => {
    initAnalytics();
    initMenu();
    initReveal();
    initIntentLinks();
    initContactForm();
    initFeaturedTool();
    initSiteShare();
    initVentureCarousel();
});

function trackEvent(name, properties = {}) {
    if (!window.posthog || typeof window.posthog.capture !== 'function') return;
    window.posthog.capture(name, properties);
}

function initAnalytics() {
    initSectionTracking();
    initLinkTracking();
}

function initSectionTracking() {
    const sections = $$('main section[id], main section.hero');
    if (!sections.length) return;

    const seen = new Set();

    const emitSectionView = (node) => {
        const sectionId = node.id || 'hero';
        if (seen.has(sectionId)) return;
        seen.add(sectionId);
        trackEvent('section_view', {
            page_type: 'home',
            section_id: sectionId,
            section_name: getSectionName(sectionId)
        });
    };

    if (!('IntersectionObserver' in window)) {
        sections.forEach(emitSectionView);
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
                emitSectionView(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: [0.35] });

    sections.forEach((node) => observer.observe(node));
}

function initLinkTracking() {
    $$('a[href]').forEach((link) => {
        link.addEventListener('click', () => {
            const href = link.getAttribute('href') || '';
            const explicitName = link.dataset.analyticsName?.trim();
            const label = explicitName || link.textContent.trim().replace(/\s+/g, ' ');
            const isExternal = /^https?:\/\//.test(href);
            const section = link.closest('section[id], section.hero');
            const sectionId = section?.id || (link.closest('.hero') ? 'hero' : 'unknown');
            const baseProps = {
                href,
                label,
                page_type: 'home',
                section_id: sectionId,
                section_name: getSectionName(sectionId),
                target_name: getTrackingName(link, href)
            };

            if (href.startsWith('mailto:')) {
                trackEvent('contact_email_click', baseProps);
                return;
            }

            if (link.closest('.hero__actions')) {
                trackEvent('cta_click', {
                    ...baseProps,
                    placement: 'hero'
                });
                return;
            }

            if (link.closest('.site-nav')) {
                trackEvent('nav_click', baseProps);
                return;
            }

            if (link.closest('.destination-card')) {
                trackEvent('destination_click', baseProps);
                return;
            }

            if (link.closest('.venture-panel') || link.closest('.hero-media') || /tasteofgascony\.com/.test(href)) {
                trackEvent('venture_click', baseProps);
                return;
            }

            if (isExternal) {
                trackEvent('outbound_link_click', baseProps);
            }
        });
    });
}

function getSectionName(sectionId) {
    const names = {
        hero: 'Hero',
        capabilities: 'Capabilities',
        destinations: 'Destinations',
        ventures: 'Ventures',
        proof: 'Proof',
        manifesto: 'Life After AI',
        contact: 'Contact'
    };

    return names[sectionId] || 'Unknown';
}

function getTrackingName(link, href) {
    const explicit = link.dataset.analyticsName || link.getAttribute('aria-label');
    if (explicit) return explicit.trim();

    if (link.closest('.venture-panel') || link.closest('.hero-media') || /tasteofgascony\.com/.test(href)) {
        return 'Taste of Gascony';
    }

    return simplifyLabel(link.textContent) || simplifyHref(href);
}

function simplifyLabel(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .slice(0, 6)
        .join(' ');
}

function simplifyHref(href) {
    if (/aitools\.disruptiveexperience\.com/.test(href)) return 'AI Tools';
    if (/pacman\.disruptiveexperience\.com/.test(href)) return 'Pacman';
    if (/pawel\.disruptiveexperience\.com/.test(href)) return 'Pawel';
    if (/archives\.disruptiveexperience\.com/.test(href)) return 'Archives';
    if (/pavotu\.disruptiveexperience\.com/.test(href)) return 'Pavotu';
    if (/tasteofgascony\.com/.test(href)) return 'Taste of Gascony';
    return href || 'Unknown';
}

function initFeaturedTool() {
    const card = $('#featuredToolCard');
    const toolLink = $('#featuredToolLink');
    const githubLink = $('#featuredToolGithub');
    const meta = $('#featuredToolMeta');
    const name = $('#featuredToolName');
    const description = $('#featuredToolDescription');
    const rotation = $('#featuredToolRotation');
    const githubLabel = $('#featuredToolGithubLabel');

    if (!card || !toolLink || !githubLink || !meta || !name || !description || !rotation || !githubLabel) return;

    const INDEX_URL = 'https://raw.githubusercontent.com/ptulin/autoaiforge/main/generated_tools/tools_index.json';
    const fallbackHref = 'https://aitools.disruptiveexperience.com';
    const fallbackGithubHref = 'https://github.com/ptulin/autoaiforge';

    const setFallback = () => {
        card.dataset.analyticsName = 'Featured AI Tool fallback';
        toolLink.href = fallbackHref;
        toolLink.dataset.analyticsName = 'Featured AI Tool fallback';
        githubLink.href = fallbackGithubHref;
        meta.textContent = 'AutoAIForge tools';
        name.textContent = 'Browse the tools directory';
        description.textContent = 'See the latest AI tools, experiments, and downloadable builds published through the tools stream.';
        rotation.textContent = 'Updates daily from the public tools feed';
        githubLabel.textContent = 'github.com/ptulin/autoaiforge';
    };

    const getDayIndex = (length) => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const day = Math.floor(diff / 86400000);
        return day % length;
    };

    const formatGithubLabel = (value) => {
        if (!value) return 'AutoAIForge source repo';
        try {
            const { pathname } = new URL(value);
            const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
            const repo = segments.slice(0, 2).join('/');
            const toolSlug = segments.at(-1)?.replace(/[_-]/g, ' ');
            if (repo && toolSlug) {
                return `${toolSlug} in ${repo}`;
            }
            if (repo) {
                return `Source in ${repo}`;
            }
            return 'AutoAIForge source repo';
        } catch {
            return 'AutoAIForge source repo';
        }
    };

    fetch(INDEX_URL)
        .then((response) => {
            if (!response.ok) throw new Error(`Failed to load tools index: ${response.status}`);
            return response.json();
        })
        .then((payload) => {
            const tools = Array.isArray(payload?.tools) ? payload.tools.filter((tool) => tool?.tests_passed) : [];
            if (!tools.length) {
                setFallback();
                return;
            }

            const tool = tools[getDayIndex(tools.length)];
            const href = `https://aitools.disruptiveexperience.com/tool/${encodeURIComponent(tool.date)}/${encodeURIComponent(tool.tool_name)}`;
            const githubHref = tool.github_url || fallbackGithubHref;

            card.dataset.analyticsName = tool.display_name || tool.tool_name || 'Featured AI Tool';
            toolLink.href = href;
            toolLink.dataset.analyticsName = tool.display_name || tool.tool_name || 'Featured AI Tool';
            githubLink.href = githubHref;
            githubLink.dataset.analyticsName = `${tool.display_name || tool.tool_name || 'Featured tool'} GitHub`;
            meta.textContent = `${tool.topic || 'AI tool'} / ${tool.date || 'Today'}`;
            name.textContent = tool.display_name || tool.tool_name || 'Featured tool';
            description.textContent = tool.description || 'Open the latest featured AI tool from AutoAIForge.';
            rotation.textContent = tool.generated ? `Generated ${new Date(tool.generated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Updates daily from the tools feed';
            githubLabel.textContent = formatGithubLabel(githubHref);
        })
        .catch(() => {
            setFallback();
        });
}

function initSiteShare() {
    const copySiteLink = $('#copySiteLink');
    if (!copySiteLink) return;

    copySiteLink.addEventListener('click', async () => {
        const url = 'https://disruptiveexperience.com';
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
                copySiteLink.textContent = 'Link copied';
                trackEvent('share_click', {
                    page_type: 'home',
                    section_id: 'hero',
                    section_name: 'Hero',
                    method: 'copy_link',
                    href: url
                });
                window.setTimeout(() => {
                    copySiteLink.textContent = 'Copy site link';
                }, 2200);
                return;
            }
        } catch {
            // Fall through to a prompt when clipboard permissions fail.
        }

        window.prompt('Copy this site link:', url);
    });
}

function initVentureCarousel() {
    const carousel = $('#ventureCarousel');
    if (!carousel) return;

    const slides = $$('.venture-carousel__slide', carousel);
    const dots = $$('.venture-carousel__dot', carousel);
    if (!slides.length || slides.length !== dots.length) return;

    let current = 0;
    let timerId;

    const setActive = (index) => {
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle('is-active', slideIndex === current);
        });
        dots.forEach((dot, dotIndex) => {
            dot.classList.toggle('is-active', dotIndex === current);
            dot.setAttribute('aria-pressed', String(dotIndex === current));
        });
    };

    const start = () => {
        window.clearInterval(timerId);
        timerId = window.setInterval(() => {
            setActive(current + 1);
        }, 4200);
    };

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            setActive(index);
            start();
            trackEvent('venture_carousel_click', {
                page_type: 'home',
                section_id: 'ventures',
                section_name: 'Ventures',
                slide_index: index
            });
        });
    });

    carousel.addEventListener('mouseenter', () => window.clearInterval(timerId));
    carousel.addEventListener('mouseleave', start);

    setActive(0);
    start();
}

function initMenu() {
    const toggle = $('#menuToggle');
    const menu = $('#siteMenu');

    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    $$('#siteMenu a').forEach((link) => {
        link.addEventListener('click', () => {
            menu.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        });
    });
}

function initReveal() {
    const nodes = $$('[data-reveal]');
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
        nodes.forEach((node) => node.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    nodes.forEach((node) => observer.observe(node));
}

function initIntentLinks() {
    const interestInput = $('#interest');
    if (!interestInput) return;

    $$('[data-interest]').forEach((link) => {
        link.addEventListener('click', () => {
            const value = link.getAttribute('data-interest');
            if (value) interestInput.value = value;
        });
    });
}

function initContactForm() {
    const form = $('#contactForm');
    if (!form) return;

    const success = $('#formSuccess');
    const submitButton = $('.submit-button', form);
    const interestField = $('#interest', form);
    const requiredFields = ['name', 'email', 'interest', 'message'].map((name) => $(`[name="${name}"]`, form));
    let formStarted = false;

    const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const showError = (input, message) => {
        const group = input.closest('.form-group');
        const error = $('.form-error', group);
        if (group) group.classList.add('error');
        if (error) error.textContent = message;
    };

    const clearError = (input) => {
        const group = input.closest('.form-group');
        const error = $('.form-error', group);
        if (group) group.classList.remove('error');
        if (error) error.textContent = '';
    };

    const validateField = (input) => {
        if (!input) return true;

        const value = input.value.trim();
        clearError(input);

        if (input.hasAttribute('required') && !value) {
            showError(input, 'This field is required.');
            return false;
        }

        if (input.name === 'email' && value && !validateEmail(value)) {
            showError(input, 'Please enter a valid email address.');
            return false;
        }

        if (input.name === 'message' && value.length < 12) {
            showError(input, 'Please share a bit more context.');
            return false;
        }

        return true;
    };

    requiredFields.forEach((input) => {
        if (!input) return;
        input.addEventListener('focus', () => {
            if (formStarted) return;
            formStarted = true;
            trackEvent('form_started', {
                form_id: 'contactForm'
            });
        }, { once: true });
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if (input.closest('.form-group')?.classList.contains('error')) {
                validateField(input);
            }
        });
    });

    if (interestField) {
        interestField.addEventListener('change', () => {
            trackEvent('interest_selected', {
                interest: interestField.value || 'unknown'
            });
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        success.classList.remove('show');
        success.textContent = '';

        const isValid = requiredFields.every((input) => validateField(input));
        if (!isValid) {
            const firstInvalid = $('.form-group.error input, .form-group.error select, .form-group.error textarea', form);
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());

        submitButton.disabled = true;
        submitButton.classList.add('loading');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Unable to submit');
            }

            trackEvent('form_submit_success', {
                form_id: 'contactForm',
                interest: String(payload.interest || 'unknown'),
                company_provided: Boolean(String(payload.company || '').trim())
            });
            success.textContent = 'Thanks. Your inquiry is in and we will get back to you shortly.';
            success.classList.add('show');
            form.reset();
        } catch (error) {
            trackEvent('form_submit_error', {
                form_id: 'contactForm',
                interest: String(payload.interest || 'unknown'),
                error_message: error instanceof Error ? error.message : 'unknown_error'
            });
            success.textContent = 'There was a problem sending your message. Please email contact@disruptiveexperience.com directly.';
            success.classList.add('show');
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
        }
    });
}
