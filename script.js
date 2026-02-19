/**
 * Disruptive Experience — AI-style site
 * Scroll reveals, parallax, form validation, mobile menu
 */
(function () {
    'use strict';

    const $ = (s, ctx = document) => ctx.querySelector(s);
    const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

    // ----- Scroll reveal -----
    const revealEls = $$('.reveal');
    const observerOptions = { threshold: 0.12, rootMargin: '0px 0px -40px 0px' };
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    revealEls.forEach((el) => revealObserver.observe(el));

    // ----- Header scroll -----
    const header = $('#header');
    const onScroll = () => {
        if (window.scrollY > 60) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ----- Mobile menu -----
    const menuBtn = $('#menuBtn');
    const mobileNav = $('#mobileNav');
    if (menuBtn && mobileNav) {
        menuBtn.addEventListener('click', () => {
            const open = !mobileNav.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', String(!open));
        });
        $$('.mobile-nav a').forEach((link) => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('open');
                menuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // ----- Smooth scroll for anchor links -----
    $$('a[href^="#"]').forEach((a) => {
        const id = a.getAttribute('href');
        if (id === '#') return;
        a.addEventListener('click', (e) => {
            const target = $(id);
            if (target) {
                e.preventDefault();
                const y = target.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: y - 80, behavior: 'smooth' });
            }
        });
    });

    // ----- Work filter pills (filter horizontal scroll cards by category) -----
    const track = $('#workTrack');
    const pills = $$('.filter-pill');
    if (track && pills.length) {
        pills.forEach((pill) => {
            pill.addEventListener('click', () => {
                pills.forEach((p) => p.classList.remove('active'));
                pill.classList.add('active');
                const filter = pill.dataset.filter;
                $$('.work-card', track).forEach((card) => {
                    const cat = card.dataset.category;
                    const show = filter === 'all' || cat === filter;
                    card.style.display = show ? 'flex' : 'none';
                });
            });
        });
    }

    // ----- Contact form -----
    const form = $('#contactForm');
    if (form) {
        const nameInput = $('#name');
        const emailInput = $('#email');
        const messageInput = $('#message');
        const nameError = $('#nameError');
        const emailError = $('#emailError');
        const messageError = $('#messageError');
        const formSuccess = $('#formSuccess');

        const validate = () => {
            let valid = true;
            [nameError, emailError, messageError].forEach((el) => {
                if (el) el.textContent = '';
            });
            $$('.form-row').forEach((row) => row.classList.remove('error'));

            if (!nameInput.value.trim()) {
                if (nameError) nameError.textContent = 'Name is required';
                nameInput.closest('.form-row')?.classList.add('error');
                valid = false;
            }
            const emailVal = emailInput.value.trim();
            if (!emailVal) {
                if (emailError) emailError.textContent = 'Email is required';
                emailInput.closest('.form-row')?.classList.add('error');
                valid = false;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
                if (emailError) emailError.textContent = 'Please enter a valid email';
                emailInput.closest('.form-row')?.classList.add('error');
                valid = false;
            }
            if (!messageInput.value.trim()) {
                if (messageError) messageError.textContent = 'Message is required';
                messageInput.closest('.form-row')?.classList.add('error');
                valid = false;
            }
            return valid;
        };

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            formSuccess.classList.remove('show');
            if (!validate()) return;

            const btn = form.querySelector('.btn-submit');
            const origText = btn?.textContent;
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Sending…';
            }

            setTimeout(() => {
                if (formSuccess) {
                    formSuccess.textContent = 'Thanks! We’ll get back to you soon.';
                    formSuccess.classList.add('show');
                }
                form.reset();
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = origText || 'Send message';
                }
            }, 1200);
        });
    }

    // ----- Parallax on orbs (optional: subtle movement on scroll) -----
    const orbs = $$('.gradient-orb');
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            orbs.forEach((orb, i) => {
                const speed = 0.03 + (i * 0.01);
                orb.style.transform = `translateY(${y * speed * 0.5}px)`;
            });
            ticking = false;
        });
    }, { passive: true });
})();
