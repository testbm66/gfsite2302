/**
 * GreenFox Energy - Main Website JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const mobileNav = document.getElementById('mobileNav');
  
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      
      // Animate hamburger
      navToggle.classList.toggle('is-active', isOpen);
    });
    
    // Close mobile nav when clicking a link
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('is-open');
        navToggle.classList.remove('is-active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
  
  // Update year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Header scroll effect
  const header = document.querySelector('.header');
  if (header) {
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll > 100) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
      
      lastScroll = currentScroll;
    });
  }
  
  // Logo Carousel: infinite loop + tooltips
  initLogoCarousel();

  // Intersection Observer for fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe elements with animation classes
  document.querySelectorAll('.service-card, .testimonial, .value').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  // Scroll-pinned process section animation
  initProcessScroll();
});

function initLogoCarousel() {
  const track = document.querySelector('.logo-carousel__track');
  const tooltip = document.querySelector('.logo-carousel__tooltip');
  if (!track) return;

  const originalSlides = Array.from(track.querySelectorAll('.logo-carousel__slide'));
  if (!originalSlides.length) return;

  const clonesNeeded = 3;
  for (let i = 0; i < clonesNeeded; i++) {
    originalSlides.forEach(slide => {
      track.appendChild(slide.cloneNode(true));
    });
  }

  const totalSets = clonesNeeded + 1;
  const offsetPercent = (100 / totalSets);
  track.style.setProperty('--carousel-offset', '-' + offsetPercent + '%');

  const baseDuration = 40;
  track.style.setProperty('--carousel-duration', (baseDuration * totalSets / 2) + 's');

  track.classList.add('is-scrolling');

  if (!tooltip) return;

  const allSlides = track.querySelectorAll('.logo-carousel__slide');

  allSlides.forEach(slide => {
    const text = slide.getAttribute('data-tooltip');
    if (!text) return;

    slide.addEventListener('mouseenter', () => {
      tooltip.textContent = text;
      tooltip.classList.add('is-visible');
    });

    slide.addEventListener('mouseleave', () => {
      tooltip.classList.remove('is-visible');
    });

    slide.addEventListener('mousemove', (e) => {
      const offsetX = 16;
      const offsetY = 16;
      let x = e.clientX + offsetX;
      let y = e.clientY + offsetY;

      const tipWidth = tooltip.offsetWidth;
      const tipHeight = tooltip.offsetHeight;

      if (x + tipWidth > window.innerWidth - 8) {
        x = e.clientX - tipWidth - offsetX;
      }
      if (y + tipHeight > window.innerHeight - 8) {
        y = e.clientY - tipHeight - offsetY;
      }

      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    });
  });
}

function initProcessScroll() {
  const wrapper = document.getElementById('processWrapper');
  if (!wrapper) return;

  if (window.innerWidth <= 768) return;

  const sun = wrapper.querySelector('.process__sun');
  const glow = wrapper.querySelector('.process__glow');

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  function update() {
    const rect = wrapper.getBoundingClientRect();
    const wrapperHeight = wrapper.offsetHeight;
    const viewportH = window.innerHeight;
    const scrolled = -rect.top;
    const scrollRange = wrapperHeight - viewportH;
    const progress = Math.max(0, Math.min(1, scrolled / scrollRange));

    const sunProgress = Math.min(1, progress);
    const sunY = 100 - (sunProgress * 350);
    sun.style.transform = 'translateY(' + sunY + '%)';
    glow.style.opacity = Math.min(1, sunProgress * 1.2);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

// Add CSS for animations dynamically
const style = document.createElement('style');
style.textContent = `
  .fade-in {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }
  
  .fade-in.is-visible {
    opacity: 1;
    transform: translateY(0);
  }
  
  .header.is-scrolled {
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  }
  
  .header__toggle.is-active span:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }
  
  .header__toggle.is-active span:nth-child(2) {
    opacity: 0;
  }
  
  .header__toggle.is-active span:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }
`;
document.head.appendChild(style);
