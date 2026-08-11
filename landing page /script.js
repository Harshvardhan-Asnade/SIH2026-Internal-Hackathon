document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Initialize Ultra-Smooth Lenis Scroll
  const lenis = new Lenis({
    duration: 1.8,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.5,
    lerp: 0.07,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Sync Lenis with GSAP ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // --- Navbar Scroll Logic ---
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      navbar.classList.remove('bg-dark/40', 'text-white');
      navbar.classList.add('bg-off-white/85', 'text-dark', 'shadow-xl');
    } else {
      navbar.classList.add('bg-dark/40', 'text-white');
      navbar.classList.remove('bg-off-white/85', 'text-dark', 'shadow-xl');
    }
  });

  // --- Hero GSAP Animations ---
  const tlHero = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tlHero.fromTo('#hero-title-1', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, delay: 0.2 })
        .fromTo('#hero-title-2', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0 }, '-=0.6')
        .fromTo('#hero-desc', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, '-=0.6')
        .fromTo('#hero-cta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, '-=0.5');

  // --- Philosophy GSAP Animations ---
  gsap.fromTo('#philosophy-text-1', 
    { opacity: 0, y: 30 }, 
    { opacity: 1, y: 0, duration: 1, scrollTrigger: { trigger: '#philosophy', start: 'top 70%' } }
  );
  gsap.fromTo('#philosophy-text-2', 
    { opacity: 0, y: 40 }, 
    { opacity: 1, y: 0, duration: 1.2, delay: 0.3, scrollTrigger: { trigger: '#philosophy', start: 'top 65%' } }
  );

  // --- Features: Diagnostic Shuffler ---
  const initialCards = [
    { id: '01', title: '0.38ms Edge Inference', subtitle: 'Zero-Buffer Optical Tokenization', metric: '0.38 ms', badge: 'LATENCY OPTIMIZED', status: 'VERIFIED' },
    { id: '02', title: '100Gbps Fibre Pipeline', subtitle: 'Hardware Accelerated Frame Parser', metric: '100 Gbps', badge: 'THROUGHPUT HIGH', status: 'STABLE' },
    { id: '03', title: 'Neural Motion Vectoring', subtitle: 'Autonomous Object Tracking Mesh', metric: '99.98 %', badge: 'PRECISION TARGET', status: 'LOCKED' },
  ];
  let cards = [...initialCards];
  const shufflerContainer = document.getElementById('shuffler-container');

  function renderCards() {
    shufflerContainer.innerHTML = '';
    cards.forEach((card, index) => {
      const isTop = index === 0;
      const isMiddle = index === 1;
      
      let classes = 'absolute w-full p-6 rounded-2xl border shuffler-card cursor-pointer shadow-lg ';
      if (isTop) classes += 'bg-dark text-white border-signal-red z-30 translate-y-0 scale-100 opacity-100';
      else if (isMiddle) classes += 'bg-paper text-dark border-dark/20 z-20 translate-y-4 scale-95 opacity-80';
      else classes += 'bg-off-white text-dark/50 border-dark/10 z-10 translate-y-8 scale-90 opacity-60';

      let badgeClasses = 'font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded ';
      badgeClasses += isTop ? 'bg-signal-red text-white' : 'bg-dark/10 text-dark';

      const cardEl = document.createElement('div');
      cardEl.className = classes;
      cardEl.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <span class="font-mono text-xs opacity-60">CARD #${card.id}</span>
          <span class="${badgeClasses}">${card.badge}</span>
        </div>
        <div class="font-sans font-bold text-lg mb-1">${card.title}</div>
        <div class="font-sans text-xs opacity-70 mb-4">${card.subtitle}</div>
        <div class="flex items-baseline justify-between border-t border-current/10 pt-3">
          <span class="font-mono text-2xl font-bold text-signal-red">${card.metric}</span>
          <span class="font-mono text-[10px] uppercase tracking-wider">${card.status}</span>
        </div>
      `;
      shufflerContainer.appendChild(cardEl);
    });
  }

  function cycleCards() {
    const first = cards.shift();
    cards.push(first);
    renderCards();
  }

  renderCards();
  shufflerContainer.addEventListener('click', cycleCards);
  document.getElementById('cycle-cards-btn').addEventListener('click', cycleCards);
  setInterval(cycleCards, 3200);


  // --- Features: Telemetry Typewriter ---
  const logs = [
    '[05:32:01] PQC-NTRU 4096-bit handshake locked across Sector 09 corridor.',
    '[05:32:03] Anti-tamper telemetry verified. 0 frame drops across 14,820 cameras.',
    '[05:32:06] Autonomous neural threat vector clear: 0 intrusion anomalies.',
    '[05:32:09] Edge Node #842-A sync complete. Hardware security module intact.',
  ];
  let logIndex = 0;
  let charIndex = 0;
  let isTyping = true;
  const typewriterText = document.getElementById('typewriter-text');

  function typeLog() {
    const currentFullText = logs[logIndex];
    if (charIndex < currentFullText.length) {
      typewriterText.textContent += currentFullText[charIndex];
      charIndex++;
      setTimeout(typeLog, 35);
    } else {
      setTimeout(() => {
        typewriterText.textContent = '';
        charIndex = 0;
        logIndex = (logIndex + 1) % logs.length;
        typeLog();
      }, 2500);
    }
  }
  typeLog();

  // --- Features: Cursor Protocol Scheduler ---
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  let activeDay = 2; // Wednesday
  const schedulerDays = document.getElementById('scheduler-days');
  const schedulerBtn = document.getElementById('scheduler-btn');
  const schedulerCursor = document.getElementById('scheduler-cursor');
  const schedulerStatus = document.getElementById('scheduler-status');

  function renderSchedulerDays() {
    schedulerDays.innerHTML = '';
    days.forEach((day, idx) => {
      const isActive = idx === activeDay;
      const btn = document.createElement('button');
      btn.className = `py-3 rounded-lg text-[10px] font-mono font-bold transition-all flex flex-col items-center gap-1 ${isActive ? 'bg-signal-red text-white shadow-md scale-105' : 'bg-white text-dark/70 hover:bg-dark/10'}`;
      btn.innerHTML = `<span>${day}</span>${isActive ? `<i data-lucide="check" class="w-3 h-3 text-white"></i>` : ''}`;
      
      btn.addEventListener('click', () => {
        activeDay = idx;
        renderSchedulerDays();
        lucide.createIcons();
      });
      schedulerDays.appendChild(btn);
    });
    lucide.createIcons();
  }
  renderSchedulerDays();

  let scheduleStep = 0;
  setInterval(() => {
    if (scheduleStep === 0) {
      schedulerCursor.style.left = '70%';
      schedulerCursor.style.top = '35%';
      schedulerCursor.style.transform = 'scale(1)';
      scheduleStep = 1;
    } else if (scheduleStep === 1) {
      schedulerCursor.style.transform = 'scale(0.85)';
      activeDay = 4;
      renderSchedulerDays();
      scheduleStep = 2;
    } else if (scheduleStep === 2) {
      schedulerCursor.style.left = '80%';
      schedulerCursor.style.top = '80%';
      schedulerCursor.style.transform = 'scale(1)';
      scheduleStep = 3;
    } else if (scheduleStep === 3) {
      schedulerCursor.style.transform = 'scale(0.85)';
      schedulerStatus.textContent = 'PROTOCOL SAVED';
      schedulerBtn.classList.remove('hover:bg-signal-red');
      schedulerBtn.classList.add('scale-95');
      scheduleStep = 4;
    } else {
      schedulerCursor.style.left = '35%';
      schedulerCursor.style.top = '35%';
      schedulerCursor.style.transform = 'scale(1)';
      activeDay = 2;
      renderSchedulerDays();
      schedulerStatus.textContent = 'STANDBY';
      schedulerBtn.classList.add('hover:bg-signal-red');
      schedulerBtn.classList.remove('scale-95');
      scheduleStep = 0;
    }
  }, 1800);


  // --- Modal Logic ---
  const modal = document.getElementById('consultation-modal');
  const openBtns = [document.getElementById('nav-consultation-btn'), document.getElementById('hero-consultation-btn')];
  const closeBtn = document.getElementById('close-modal-btn');
  const modalForm = document.getElementById('modal-form');
  const modalSuccess = document.getElementById('modal-success');

  openBtns.forEach(btn => btn?.addEventListener('click', () => {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }));

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  });

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    modalForm.classList.add('hidden');
    modalSuccess.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
      modalForm.classList.remove('hidden');
      modalSuccess.classList.add('hidden');
      modalForm.reset();
    }, 3000);
  });

  // --- ClickSpark Canvas Logic ---
  const sparkCanvas = document.getElementById('clickspark-canvas');
  const sparkCtx = sparkCanvas.getContext('2d');
  const sparkContainer = document.getElementById('clickspark-container');

  function resizeSparkCanvas() {
    sparkCanvas.width = sparkContainer.clientWidth;
    sparkCanvas.height = sparkContainer.clientHeight;
  }
  resizeSparkCanvas();
  window.addEventListener('resize', resizeSparkCanvas);

  let sparks = [];
  let sparkAnimId = null;

  function drawSparks() {
    sparkCtx.clearRect(0, 0, sparkCanvas.width, sparkCanvas.height);
    const now = performance.now();
    const duration = 400;
    const sparkRadius = 20;
    const sparkSize = 10;
    const sparkColor = '#E63B2E';

    sparks = sparks.filter(spark => {
      const elapsed = now - spark.startTime;
      if (elapsed >= duration) return false;

      const progress = elapsed / duration;
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRadius = easeOut * sparkRadius;
      const opacity = 1 - progress;

      sparkCtx.save();
      sparkCtx.strokeStyle = sparkColor;
      sparkCtx.lineWidth = Math.max(1, (1 - progress) * (sparkSize / 2));
      sparkCtx.globalAlpha = opacity;

      const x1 = spark.x + Math.cos(spark.angle) * (currentRadius * 0.3);
      const y1 = spark.y + Math.sin(spark.angle) * (currentRadius * 0.3);
      const x2 = spark.x + Math.cos(spark.angle) * currentRadius;
      const y2 = spark.y + Math.sin(spark.angle) * currentRadius;

      sparkCtx.beginPath();
      sparkCtx.moveTo(x1, y1);
      sparkCtx.lineTo(x2, y2);
      sparkCtx.stroke();

      sparkCtx.fillStyle = sparkColor;
      sparkCtx.beginPath();
      sparkCtx.arc(x2, y2, Math.max(1, (1 - progress) * (sparkSize / 3)), 0, Math.PI * 2);
      sparkCtx.fill();

      sparkCtx.restore();
      return true;
    });

    if (sparks.length > 0) {
      sparkAnimId = requestAnimationFrame(drawSparks);
    } else {
      sparkAnimId = null;
    }
  }

  document.addEventListener('click', (e) => {
    const rect = sparkCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    const sparkCount = 8;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (2 * Math.PI * i) / sparkCount + (Math.random() * 0.2 - 0.1);
      sparks.push({ x, y, angle, startTime: now });
    }

    if (!sparkAnimId) {
      sparkAnimId = requestAnimationFrame(drawSparks);
    }
  });

});
