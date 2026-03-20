/**
 * carousel.js
 * ─────────────────────────────────────────────
 * • กดลูกศร  → เลื่อนซ้าย / ขวา
 * • กด dot   → กระโดดไปสไลด์นั้น
 * • Auto-play ทุก 2 วินาที (หยุดเมื่อ hover)
 * ─────────────────────────────────────────────
 */

(function () {
  const track   = document.querySelector('.Carousel-track');
  const slides  = document.querySelectorAll('.Carousel-slide');
  const dots    = document.querySelectorAll('.Carousel-dot');
  const btnPrev = document.querySelector('.ArrowPrev');
  const btnNext = document.querySelector('.ArrowNext');

  if (!track || slides.length === 0) return;

  let current   = 0;
  const total   = slides.length;
  let autoTimer = null;

  /* ── เลื่อนไปสไลด์ที่ index ── */
  function goTo(index) {
    // วนรอบ
    current = (index + total) % total;

    // เลื่อน track
    track.style.transform = `translateX(-${current * 100}%)`;

    // อัปเดต dots
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  /* ── ลูกศร ── */
  btnPrev.addEventListener('click', () => goTo(current - 1));
  btnNext.addEventListener('click', () => goTo(current + 1));

  /* ── Dots ── */
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  /* ── Auto-play ── */
  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), 2000);
  }

  function stopAuto() {
    clearInterval(autoTimer);
  }

  // หยุดเมื่อ hover
  const section = document.querySelector('.BodySection');
  section.addEventListener('mouseenter', stopAuto);
  section.addEventListener('mouseleave', startAuto);

  // เริ่ม auto-play ทันที
  startAuto();

  /* ── Swipe บนมือถือ ── */
  let startX = 0;

  section.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  section.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? current + 1 : current - 1);
    }
  }, { passive: true });

})();