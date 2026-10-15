(function () {
  const THEMES = ["aurora", "clasico", "neon", "esmeralda"];
  const DEFAULT_THEME = "aurora";
  const particles = [];
  let canvasRef = null;
  let ctxRef = null;
  let animating = false;
  let overlayEl = null;
  let gridEl = null;

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
    const count = Math.min(110, Math.floor((canvasRef.width * canvasRef.height) / 18000));
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvasRef.width,
        y: Math.random() * canvasRef.height,
        size: Math.random() * 2.2 + 0.4,
        alpha: Math.random(),
        speed: Math.random() * 0.018 + 0.003,
        drift: (Math.random() - 0.5) * 0.25,
        rise: Math.random() * 0.18 + 0.04,
        gold: Math.random() > 0.45
      });
    }
  }

  function draw() {
    if (!ctxRef || !canvasRef) return;
    const w = canvasRef.width;
    const h = canvasRef.height;
    ctxRef.clearRect(0, 0, w, h);
    const styles = getComputedStyle(document.documentElement);
    const bg = (styles.getPropertyValue("--sv-bg") || "#070b14").trim();
    ctxRef.fillStyle = bg;
    ctxRef.fillRect(0, 0, w, h);

    const glowA = (styles.getPropertyValue("--sv-glow-a") || "56, 189, 248").trim();
    const glowB = (styles.getPropertyValue("--sv-glow-b") || "234, 179, 8").trim();

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

    requestAnimationFrame(draw);
  }

  function bindCanvas(canvas) {
    if (!canvas) {
      canvas = document.getElementById("canvas-bg");
    }
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "canvas-bg";
      canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none";
      document.body.prepend(canvas);
    }
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
  });

  window.addEventListener("resize", function () {
    if (canvasRef) seedParticles();
  });
})();
