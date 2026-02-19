/* ============================================
   DISRUPTIVE EXPERIENCE V2 - Enhanced JavaScript
   Modern, performant, accessible interactions
   ============================================ */

(function() {
    'use strict';

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    const $ = (selector, context = document) => context.querySelector(selector);
    const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    const throttle = (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    // ============================================
    // LOADER
    // ============================================
    const initLoader = () => {
        const loader = $('#loader');
        if (!loader) return;

        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 500);
            }, 500);
        });
    };

    // ============================================
    // NAVIGATION
    // ============================================
    const initNavigation = () => {
        const navbar = $('#navbar');
        const mobileToggle = $('#mobileMenuToggle');
        const navMenu = $('#navMenu');
        const navLinks = $$('.nav-link');

        // Mobile menu toggle
        if (mobileToggle && navMenu) {
            mobileToggle.addEventListener('click', () => {
                mobileToggle.classList.toggle('active');
                navMenu.classList.toggle('active');
                mobileToggle.setAttribute('aria-expanded', 
                    mobileToggle.classList.contains('active') ? 'true' : 'false'
                );
            });

            // Close menu when clicking a link
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    mobileToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                });
            });

            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                    mobileToggle.classList.remove('active');
                    navMenu.classList.remove('active');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Navbar scroll effect
        const handleScroll = throttle(() => {
            if (window.scrollY > 50) {
                navbar?.classList.add('scrolled');
            } else {
                navbar?.classList.remove('scrolled');
            }
        }, 100);

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        // Smooth scroll for anchor links
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const target = $(href);
                    if (target) {
                        const offset = navbar ? navbar.offsetHeight : 0;
                        const targetPosition = target.offsetTop - offset;
                        window.scrollTo({
                            top: targetPosition,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    };

    // ============================================
    // SCROLL ANIMATIONS (AOS)
    // ============================================
    const initScrollAnimations = () => {
        const elements = $$('[data-aos]');
        if (elements.length === 0) return;

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = entry.target.dataset.aosDelay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('aos-animate');
                    }, delay);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        elements.forEach(el => observer.observe(el));
    };

    // ============================================
    // HERO STATS COUNTER
    // ============================================
    const initStatsCounter = () => {
        const statNumbers = $$('.stat-number[data-count]');
        if (statNumbers.length === 0) return;

        const animateCounter = (element) => {
            const target = parseInt(element.dataset.count);
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    element.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    element.textContent = target;
                }
            };

            updateCounter();
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statNumbers.forEach(stat => observer.observe(stat));
    };

    // ============================================
    // WORK FILTER
    // ============================================
    const initWorkFilter = () => {
        const filterButtons = $$('.filter-btn');
        const workItems = $$('.work-item');

        if (filterButtons.length === 0 || workItems.length === 0) return;

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;

                // Update active state
                filterButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-selected', 'false');
                });
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');

                // Filter items
                workItems.forEach((item, index) => {
                    const category = item.dataset.category;
                    const shouldShow = filter === 'all' || category === filter;

                    if (shouldShow) {
                        item.classList.remove('hidden');
                        item.style.animationDelay = `${index * 50}ms`;
                        item.style.opacity = '0';
                        setTimeout(() => {
                            item.style.opacity = '1';
                        }, 50);
                    } else {
                        item.classList.add('hidden');
                    }
                });
            });
        });
    };

    // ============================================
    // CONTACT FORM VALIDATION
    // ============================================
    const initContactForm = () => {
        const form = $('#contactForm');
        if (!form) return;

        const nameInput = $('#name');
        const emailInput = $('#email');
        const messageInput = $('#message');
        const submitButton = form.querySelector('.submit-button');
        const formSuccess = $('#formSuccess');

        const validateEmail = (email) => {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        };

        const showError = (input, message) => {
            const formGroup = input.closest('.form-group');
            const errorElement = formGroup.querySelector('.form-error');
            
            formGroup.classList.add('error');
            input.setAttribute('aria-invalid', 'true');
            if (errorElement) {
                errorElement.textContent = message;
            }
        };

        const clearError = (input) => {
            const formGroup = input.closest('.form-group');
            const errorElement = formGroup.querySelector('.form-error');
            
            formGroup.classList.remove('error');
            input.setAttribute('aria-invalid', 'false');
            if (errorElement) {
                errorElement.textContent = '';
            }
        };

        const validateField = (input) => {
            const value = input.value.trim();
            const fieldName = input.name;

            clearError(input);

            if (input.hasAttribute('required') && !value) {
                showError(input, `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`);
                return false;
            }

            if (fieldName === 'email' && value && !validateEmail(value)) {
                showError(input, 'Please enter a valid email address');
                return false;
            }

            if (fieldName === 'message' && value.length < 10) {
                showError(input, 'Message must be at least 10 characters');
                return false;
            }

            return true;
        };

        // Real-time validation
        [nameInput, emailInput, messageInput].forEach(input => {
            if (input) {
                input.addEventListener('blur', () => validateField(input));
                input.addEventListener('input', () => {
                    if (input.closest('.form-group').classList.contains('error')) {
                        validateField(input);
                    }
                });
            }
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate all fields
            const isValid = [nameInput, emailInput, messageInput]
                .every(input => input ? validateField(input) : true);

            if (!isValid) {
                // Focus first invalid field
                const firstError = form.querySelector('.form-group.error input, .form-group.error textarea');
                if (firstError) {
                    firstError.focus();
                }
                return;
            }

            // Show loading state
            submitButton.disabled = true;
            submitButton.classList.add('loading');
            formSuccess.classList.remove('show');

            // Simulate form submission (replace with actual API call)
            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Success
                formSuccess.textContent = 'Thank you! Your message has been sent. We\'ll get back to you soon.';
                formSuccess.classList.add('show');
                form.reset();
                
                // Reset button
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.classList.remove('loading');
                }, 2000);
            } catch (error) {
                formSuccess.textContent = 'Sorry, there was an error sending your message. Please try again.';
                formSuccess.classList.add('show');
                submitButton.disabled = false;
                submitButton.classList.remove('loading');
            }
        });
    };

    // ============================================
    // PARALLAX EFFECTS
    // ============================================
    const initParallax = () => {
        const parallaxElements = $$('[data-parallax]');
        if (parallaxElements.length === 0) return;

        const handleScroll = throttle(() => {
            const scrolled = window.pageYOffset;
            parallaxElements.forEach(element => {
                const speed = parseFloat(element.dataset.parallax) || 0.5;
                const yPos = -(scrolled * speed);
                element.style.transform = `translateY(${yPos}px)`;
            });
        }, 16);

        window.addEventListener('scroll', handleScroll);
    };

    // ============================================
    // LAZY LOADING IMAGES
    // ============================================
    const initLazyLoading = () => {
        if ('loading' in HTMLImageElement.prototype) {
            // Native lazy loading supported
            const images = $$('img[loading="lazy"]');
            images.forEach(img => {
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });
            });
        } else {
            // Fallback for browsers without native support
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                        }
                        imageObserver.unobserve(img);
                    }
                });
            });

            $$('img[data-src]').forEach(img => imageObserver.observe(img));
        }
    };

    // ============================================
    // PERFORMANCE OPTIMIZATIONS
    // ============================================
    const initPerformance = () => {
        // Preload critical resources
        const preloadLinks = $$('link[rel="preload"]');
        preloadLinks.forEach(link => {
            const href = link.href;
            if (link.as === 'style') {
                const stylesheet = document.createElement('link');
                stylesheet.rel = 'stylesheet';
                stylesheet.href = href;
                document.head.appendChild(stylesheet);
            }
        });

        // Optimize scroll performance
        let ticking = false;
        const optimizedScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // Scroll-dependent code here
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', optimizedScroll, { passive: true });
    };

    // ============================================
    // KEYBOARD NAVIGATION
    // ============================================
    const initKeyboardNav = () => {
        // Skip to main content
        const skipLink = document.createElement('a');
        skipLink.href = '#hero';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Tab navigation enhancement
        const focusableElements = $$('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        focusableElements.forEach(element => {
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && element.tagName !== 'BUTTON' && element.tagName !== 'A') {
                    element.click();
                }
            });
        });
    };

    // ============================================
    // INITIALIZATION
    // ============================================
    const init = () => {
        // Core functionality
        initLoader();
        initNavigation();
        initScrollAnimations();
        initStatsCounter();
        initWorkFilter();
        initContactForm();
        
        // Enhancements
        initParallax();
        initLazyLoading();
        initPerformance();
        initKeyboardNav();

        // Log initialization
        console.log('🚀 Disruptive Experience V2 initialized');
    };

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API for external use
    window.DisruptiveExperience = {
        version: '2.0.0',
        init
    };

})();
