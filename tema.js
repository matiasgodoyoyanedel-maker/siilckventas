(function () {
  const THEMES = ["clasico", "aurora", "neon", "esmeralda", "nova"];
  const DEFAULT_THEME = "clasico";
  const particles = [];
  const blobs = [];
  const streaks = [];
  let canvasRef = null;
  let ctxRef = null;
  let animating = false;
  let overlayEl = null;
  let gridEl = null;
  let scanEl = null;
  let t = 0;

  function currentTheme() {
    const stored = localStorage.getItem("sv_tematica");
    return THEMES.indexOf(stored) >= 0 ? stored : DEFAULT_THEME;
  }

  function ensureOverlay() {
    if (!overlayEl) {
      overlayEl = document.createElement("div");
      overlayEl.className = "sv-theme-overlay";
      overlayEl.setAttribute("aria-hidden", "true");
      document.body.prepend(overlayEl);
    }
    if (!gridEl) {
      gridEl = document.createElement("div");
      gridEl.className = "sv-theme-grid";
      gridEl.setAttribute("aria-hidden", "true");
      document.body.prepend(gridEl);
    }
    if (!scanEl) {
      scanEl = document.createElement("div");
      scanEl.className = "sv-theme-scan";
      scanEl.setAttribute("aria-hidden", "true");
      document.body.prepend(scanEl);
    }
    if (!document.querySelector(".sv-theme-orb")) {
      for (let i = 1; i <= 3; i++) {
        const orb = document.createElement("div");
        orb.className = "sv-theme-orb sv-theme-orb-" + i;
        orb.setAttribute("aria-hidden", "true");
        document.body.prepend(orb);
      }
    }
  }

  function apply(nombre) {
    const theme = THEMES.indexOf(nombre) >= 0 ? nombre : DEFAULT_THEME;
    document.documentElement.setAttribute("data-sv-theme", theme);
    localStorage.setItem("sv_tematica", theme);
    ensureOverlay();
    if (canvasRef) seedParticles();
  }

  function seedParticles() {
    if (!canvasRef) return;
    canvasRef.width = window.innerWidth;
    canvasRef.height = window.innerHeight;
    particles.length = 0;
    blobs.length = 0;
    streaks.length = 0;
    const count = Math.min(140, Math.floor((canvasRef.width * canvasRef.height) / 14000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvasRef.width,
        y: Math.random() * canvasRef.height,
        size: Math.random() * 2.4 + 0.3,
        alpha: Math.random(),
        speed: Math.random() * 0.02 + 0.004,
        drift: (Math.random() - 0.5) * 0.35,
        rise: Math.random() * 0.28 + 0.05,
        gold: Math.random() > 0.4
      });
    }
    for (let i = 0; i < 4; i++) {
      blobs.push({
        x: Math.random() * canvasRef.width,
        y: Math.random() * canvasRef.height,
        r: 140 + Math.random() * 180,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.18,
        gold: i % 2 === 0,
        a: 0.2 + Math.random() * 0.12
      });
    }
    for (let i = 0; i < 3; i++) {
      streaks.push({
        x: Math.random() * canvasRef.width,
        y: Math.random() * canvasRef.height * 0.5,
        len: 80 + Math.random() * 120,
        speed: 4 + Math.random() * 5,
        wait: Math.random() * 180
      });
    }
  }

  function draw() {
    if (!ctxRef || !canvasRef) return;
    const w = canvasRef.width;
    const h = canvasRef.height;
    t += 1;
    ctxRef.clearRect(0, 0, w, h);
    const styles = getComputedStyle(document.documentElement);

    const glowA = (styles.getPropertyValue("--sv-glow-a") || "168, 85, 247").trim();
    const glowB = (styles.getPropertyValue("--sv-glow-b") || "251, 191, 36").trim();

    blobs.forEach(function (b) {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < -b.r) b.x = w + b.r;
      if (b.x > w + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = h + b.r;
      if (b.y > h + b.r) b.y = -b.r;
      const grd = ctxRef.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      const col = b.gold ? glowB : glowA;
      grd.addColorStop(0, "rgba(" + col + "," + b.a + ")");
      grd.addColorStop(1, "rgba(" + col + ",0)");
      ctxRef.fillStyle = grd;
      ctxRef.beginPath();
      ctxRef.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctxRef.fill();
    });

    particles.forEach(function (p) {
      p.alpha += p.speed;
      if (p.alpha > 1 || p.alpha < 0.12) p.speed *= -1;
      p.x += p.drift;
      p.y -= p.rise;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      const color = p.gold ? glowB : glowA;
      ctxRef.fillStyle = "rgba(" + color + "," + p.alpha + ")";
      ctxRef.beginPath();
      ctxRef.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctxRef.fill();
    });

    streaks.forEach(function (s) {
      if (s.wait > 0) {
        s.wait -= 1;
        return;
      }
      s.x += s.speed;
      s.y += s.speed * 0.35;
      ctxRef.strokeStyle = "rgba(255,255,255,0.35)";
      ctxRef.lineWidth = 1.2;
      ctxRef.beginPath();
      ctxRef.moveTo(s.x, s.y);
      ctxRef.lineTo(s.x - s.len, s.y - s.len * 0.35);
      ctxRef.stroke();
      if (s.x > w + 40 || s.y > h + 40) {
        s.x = Math.random() * w * 0.7;
        s.y = Math.random() * h * 0.35;
        s.wait = 90 + Math.random() * 200;
      }
    });

    requestAnimationFrame(draw);
  }

  function bindCanvas(canvas) {
    if (!canvas) {
      canvas = document.getElementById("canvas-bg");
    }
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "canvas-bg";
      canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;background:transparent";
      document.body.prepend(canvas);
    }
    canvas.style.background = "transparent";
    canvasRef = canvas;
    ctxRef = canvas.getContext("2d");
    seedParticles();
    if (!animating) {
      animating = true;
      draw();
    }
  }

  function listenConfig() {
    let tries = 0;
    const timer = setInterval(function () {
      tries += 1;
      if (window.firebase && firebase.apps && firebase.apps.length) {
        clearInterval(timer);
        try {
          firebase.firestore().collection("configuracion").doc("global").onSnapshot(function (doc) {
            if (doc.exists && doc.data().tematica) apply(doc.data().tematica);
          });
        } catch (e) {}
      }
      if (tries > 40) clearInterval(timer);
    }, 400);
  }

  window.SiilckTema = {
    apply: apply,
    bindCanvas: bindCanvas,
    initCanvas: function (canvas) { bindCanvas(canvas); },
    current: currentTheme,
    themes: THEMES.slice()
  };

  document.addEventListener("DOMContentLoaded", function () {
    apply(currentTheme());
    bindCanvas(document.getElementById("canvas-bg"));
    listenConfig();
    if (!document.querySelector("script[data-sv-social]")) {
      const s = document.createElement("script");
      s.src = "social.js?v=3";
      s.setAttribute("data-sv-social", "1");
      document.body.appendChild(s);
    }
  });

  window.addEventListener("resize", function () {
    if (canvasRef) seedParticles();
  });
})();
