/* ═══════════════════════════════════════════════════════
   SpaceClean — Landing Page JavaScript
   Particle starfield, scroll animations, counters
   ═══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    initNavbar();
    initHamburger();
    initScrollReveal();
    initCounters();
});

/* ── Particle Starfield ── */
function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let stars = [];
    let animationId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createStars() {
        stars = [];
        const count = Math.min(250, Math.floor((canvas.width * canvas.height) / 5000));
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 1.8 + 0.2,
                opacity: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.3 + 0.05,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2,
                color: getStarColor()
            });
        }
    }

    function getStarColor() {
        const colors = [
            '255, 255, 255',    // White
            '200, 220, 255',    // Blue-white
            '255, 240, 220',    // Warm white
            '0, 217, 255',      // Cyan (primary)
            '108, 92, 231',     // Purple (secondary)
        ];
        const weights = [50, 20, 15, 10, 5];
        const total = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * total;
        for (let i = 0; i < colors.length; i++) {
            random -= weights[i];
            if (random <= 0) return colors[i];
        }
        return colors[0];
    }

    function drawStars(time) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7;
            const opacity = star.opacity * twinkle;

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${star.color}, ${opacity})`;
            ctx.fill();

            // Glow for larger stars
            if (star.radius > 1.2) {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${star.color}, ${opacity * 0.1})`;
                ctx.fill();
            }

            // Move star
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = -5;
                star.x = Math.random() * canvas.width;
            }
        });

        // Occasional shooting star
        if (Math.random() < 0.001) {
            drawShootingStar(ctx, canvas);
        }

        animationId = requestAnimationFrame(() => drawStars(performance.now()));
    }

    function drawShootingStar(ctx, canvas) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.5;
        const length = Math.random() * 80 + 40;
        const angle = Math.PI / 4 + (Math.random() * 0.5 - 0.25);

        const gradient = ctx.createLinearGradient(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 217, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    resize();
    createStars();
    drawStars(performance.now());

    window.addEventListener('resize', () => {
        resize();
        createStars();
    });
}

/* ── Navbar Scroll Effect ── */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offset = navbar.offsetHeight;
                const position = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top: position, behavior: 'smooth' });

                // Close mobile menu
                document.getElementById('navLinks')?.classList.remove('show');
                document.getElementById('hamburger')?.classList.remove('active');
            }
        });
    });
}

/* ── Hamburger Menu ── */
function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (!hamburger || !navLinks) return;

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('show');
    });

    // Close menu on link click
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('show');
        });
    });
}

/* ── Scroll Reveal Animations ── */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
}

/* ── Animated Number Counters ── */
function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.dataset.count);
    const suffix = element.dataset.suffix || '';
    const duration = 2000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);

        if (target >= 1000) {
            element.textContent = current.toLocaleString() + '+' ;
        } else {
            element.textContent = current + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}
