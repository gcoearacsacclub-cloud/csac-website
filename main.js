/* ============================================
   CSAC Website - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // ── Preloader ──
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => { preloader?.classList.add('hidden'); document.body.classList.remove('no-scroll'); }, 1800);
  });
  document.body.classList.add('no-scroll');

  // ── Scroll Progress Bar ──
  const scrollProgress = document.getElementById('scroll-progress');
  const updateProgress = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.width = (window.scrollY / h * 100) + '%';
  };

  // ── Sticky Navbar ──
  const navbar = document.querySelector('.navbar');
  const handleScroll = () => {
    navbar?.classList.toggle('scrolled', window.scrollY > 60);
    const btn = document.getElementById('back-to-top');
    btn?.classList.toggle('visible', window.scrollY > 400);
    updateProgress();
    updateActiveNav();
  };
  window.addEventListener('scroll', handleScroll, { passive: true });

  // ── Theme Toggle ──
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    themeToggle.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });

  // ── Active nav link ──
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');
  function updateActiveNav() {
    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }

  // ── Mobile Menu ──
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu?.classList.toggle('open');
    document.body.classList.toggle('no-scroll');
  });
  mobileMenu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger?.classList.remove('active');
      mobileMenu?.classList.remove('open');
      document.body.classList.remove('no-scroll');
    });
  });


  // ── Back to Top ──
  document.getElementById('back-to-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Scroll Reveal ──
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-zoom');
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('active'); revealObs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach(el => revealObs.observe(el));

  // ── Typing Effect ──
  const typingEl = document.getElementById('typing-text');
  if (typingEl) {
    const text = typingEl.dataset.text || 'Empowering Future Civil Servants';
    let i = 0;
    typingEl.textContent = '';
    const typeChar = () => {
      if (i < text.length) { typingEl.textContent += text[i]; i++; setTimeout(typeChar, 60); }
    };
    setTimeout(typeChar, 1200);
  }

  // ── Counter Animation ──
  const counters = document.querySelectorAll('.counter-num');
  const counterObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseInt(e.target.dataset.target);
        const suffix = e.target.dataset.suffix || '';
        let current = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          current += step;
          if (current >= target) { current = target; clearInterval(timer); }
          e.target.textContent = current + suffix;
        }, 30);
        counterObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => counterObs.observe(el));

  // ── CSAC Week Expandable Cards (Event Delegation) ──
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.week-event-card');
    if (card) {
      document.querySelectorAll('.week-event-card.expanded').forEach(c => {
        if (c !== card) c.classList.remove('expanded');
      });
      card.classList.toggle('expanded');
    }
  });

  // ── Testimonials Carousel ──
  window.initTestimonialSlider = function() {
    const track = document.querySelector('.testimonial-track');
    const slides = document.querySelectorAll('.testimonial-slide');
    const dots = document.querySelectorAll('.slider-dot');
    if (!slides.length) return;
    let currentSlide = 0;

    function goToSlide(n) {
      currentSlide = n;
      if (track) track.style.transform = `translateX(-${n * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === n));
    }

    const prevBtn = document.querySelector('.slider-prev');
    const nextBtn = document.querySelector('.slider-next');

    if (prevBtn) {
      const newPrev = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrev, prevBtn);
      newPrev.addEventListener('click', () => {
        goToSlide(currentSlide > 0 ? currentSlide - 1 : slides.length - 1);
      });
    }
    if (nextBtn) {
      const newNext = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNext, nextBtn);
      newNext.addEventListener('click', () => {
        goToSlide(currentSlide < slides.length - 1 ? currentSlide + 1 : 0);
      });
    }

    dots.forEach((d, i) => {
      d.addEventListener('click', () => goToSlide(i));
    });

    if (window.testimonialAutoSlideTimer) clearInterval(window.testimonialAutoSlideTimer);
    if (slides.length > 1) {
      window.testimonialAutoSlideTimer = setInterval(() => goToSlide((currentSlide + 1) % slides.length), 5000);
    }
    goToSlide(0);
  };
  window.initTestimonialSlider();

  // ── Gallery Filter ──
  document.querySelectorAll('.gallery-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gallery-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category;
      document.querySelectorAll('.gallery-item').forEach(item => {
        const match = cat === 'all' || item.dataset.category === cat;
        item.style.display = match ? 'block' : 'none';
      });
    });
  });

  // ── Lightbox (Event Delegation) ──
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox?.querySelector('img');
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.gallery-item');
    if (item) {
      const src = item.querySelector('img')?.src;
      if (lightboxImg && src) {
        lightboxImg.src = src;
        lightbox.classList.add('open');
        document.body.classList.add('no-scroll');
      }
    }
  });

  document.querySelector('.lightbox-close')?.addEventListener('click', () => {
    lightbox?.classList.remove('open'); document.body.classList.remove('no-scroll');
  });
  lightbox?.addEventListener('click', (e) => {
    if (e.target === lightbox) { lightbox.classList.remove('open'); document.body.classList.remove('no-scroll'); }
  });

  // ── Form Submission ──
  document.getElementById('join-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-submit');
    btn.textContent = 'Submitted Successfully! ✓';
    btn.style.background = 'linear-gradient(135deg, #138808, #0E6B06)';
    setTimeout(() => { btn.textContent = 'Submit Application'; btn.style.background = ''; }, 3000);
  });

  // ── Hero Particles ──
  const particleContainer = document.querySelector('.hero-particles');
  if (particleContainer) {
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 6 + 's';
      p.style.animationDuration = (4 + Math.random() * 4) + 's';
      const colors = ['#D4A843', '#FF9933', '#138808', '#F0D68A'];
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      particleContainer.appendChild(p);
    }
  }

  // ── Staggered reveal for grids ──
  document.querySelectorAll('.exams-grid .exam-card, .features-grid .feature-card, .committee-grid-new .cmte-card, .counters-grid .counter-card, .members-grid .mbr-card').forEach((el, i) => {
    el.style.transitionDelay = (i * 0.06) + 's';
  });

  // ── Members Section Filtering and Search ──
  const membersSearch = document.getElementById('members-search');
  const filterBtns = document.querySelectorAll('.member-filter-btn');
  const noResultsMsg = document.getElementById('members-no-results');

  window.filterMembers = function filterMembers() {
    const searchTerm = membersSearch ? membersSearch.value.toLowerCase().trim() : '';
    const activeBtn = document.querySelector('.member-filter-btn.active');
    const activeDeptRaw = activeBtn ? (activeBtn.dataset.dept || 'all').toLowerCase().trim() : 'all';

    let visibleCount = 0;
    const currentMemberCards = document.querySelectorAll('.mbr-card');

    currentMemberCards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const dept = (card.dataset.dept || '').toLowerCase();

      const matchesSearch = name.includes(searchTerm);

      let matchesDept = false;
      if (activeDeptRaw === 'all') {
        matchesDept = true;
      } else if (['e&tc', 'entc', 'etc'].includes(activeDeptRaw)) {
        // Match E&TC, ENTC, ETC, Electronics, or Telecommunication in member department
        matchesDept = dept.includes('e&tc') || dept.includes('entc') || dept.includes('etc') || dept.includes('electronics') || dept.includes('telecommunication');
      } else {
        matchesDept = dept.includes(activeDeptRaw) || activeDeptRaw.includes(dept);
      }

      if (matchesSearch && matchesDept) {
        card.classList.remove('hidden-card');
        card.style.display = 'flex';
        card.classList.add('fade-in');
        visibleCount++;
      } else {
        card.classList.add('hidden-card');
        card.style.display = 'none';
        card.classList.remove('fade-in');
      }
    });

    if (noResultsMsg) {
      noResultsMsg.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  };

  // Event listener for search input
  if (membersSearch) {
    membersSearch.addEventListener('input', window.filterMembers);
  }

  // Event listeners for filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.filterMembers();
    });
  });

  // Initial calls
  handleScroll();
});