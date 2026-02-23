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

function initProcessScroll() {
  const wrapper = document.getElementById('processWrapper');
  if (!wrapper) return;

  if (window.innerWidth <= 768) return;

  const sun = wrapper.querySelector('.process__sun');
  const glow = wrapper.querySelector('.process__glow');
  const sectionHeader = wrapper.querySelector('.section-header');
  const stage = wrapper.querySelector('.process__stage');
  const steps = wrapper.querySelectorAll('.process__step');
  const previewAbove = wrapper.querySelector('.process__preview-above');
  const previewBelow = wrapper.querySelector('.process__preview-below');
  const totalSteps = steps.length;
  let lastActiveIndex = -1;

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

    const sunPhaseEnd = 0.15;
    const cardsStart = sunPhaseEnd;
    const cardsEnd = 0.95;

    const sunProgress = Math.min(1, progress / sunPhaseEnd);
    const sunY = 100 - (sunProgress * 350);
    sun.style.transform = 'translateY(' + sunY + '%)';
    glow.style.opacity = Math.min(1, sunProgress * 1.2);

    // Fade out header between 12% and 20%
    var headerFadeStart = 0.12;
    var headerFadeEnd = 0.20;
    if (progress <= headerFadeStart) {
      sectionHeader.style.opacity = '1';
      sectionHeader.style.transform = 'translateY(0)';
      stage.style.transform = 'translateY(0)';
    } else if (progress >= headerFadeEnd) {
      sectionHeader.style.opacity = '0';
      sectionHeader.style.transform = 'translateY(-30px)';
      sectionHeader.style.pointerEvents = 'none';
      stage.style.transform = 'translateY(-80px)';
    } else {
      var headerP = (progress - headerFadeStart) / (headerFadeEnd - headerFadeStart);
      sectionHeader.style.opacity = String(1 - headerP);
      sectionHeader.style.transform = 'translateY(' + (-30 * headerP) + 'px)';
      sectionHeader.style.pointerEvents = headerP > 0.5 ? 'none' : 'auto';
      stage.style.transform = 'translateY(' + (-80 * headerP) + 'px)';
    }

    // Cards: progress cardsStart -> cardsEnd
    const cardProgress = Math.max(0, Math.min(1, (progress - cardsStart) / (cardsEnd - cardsStart)));
    const activeIndex = Math.min(totalSteps - 1, Math.floor(cardProgress * totalSteps));

    if (activeIndex !== lastActiveIndex) {
      steps.forEach((step, i) => {
        step.classList.remove('is-active');
        step.classList.remove('is-exiting');
      });
      if (lastActiveIndex >= 0 && lastActiveIndex < totalSteps) {
        steps[lastActiveIndex].classList.add('is-exiting');
      }
      steps[activeIndex].classList.add('is-active');

      // Rolodex: show preview card above if there are cards before
      if (activeIndex > 0) {
        previewAbove.classList.add('is-visible');
      } else {
        previewAbove.classList.remove('is-visible');
      }

      // Rolodex: show preview card below if there are cards after
      if (activeIndex < totalSteps - 1) {
        previewBelow.classList.add('is-visible');
      } else {
        previewBelow.classList.remove('is-visible');
      }

      lastActiveIndex = activeIndex;
    }
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
