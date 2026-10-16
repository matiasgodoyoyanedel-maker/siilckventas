(function () {
  const GAMES = [
    { id: "valorant", nombre: "Valorant", corto: "VALORANT", categoria: "juego", query: "valorant", aliases: ["valorant", "valo"], icon: "fas fa-crosshairs", iconColor: "text-rose-400", tag: "DIAMANTE • SKINS", sub: "RADIANT", img: "img/games/valorant.jpg", fade: "" },
    { id: "freefire", nombre: "Free Fire", corto: "FREE FIRE", categoria: "juego", query: "free fire", aliases: ["free fire", "freefire"], icon: "fas fa-fire", iconColor: "text-orange-400", tag: "ELITE • EVOS", sub: "NIVEL 72", img: "img/games/freefire.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(255,80,0,.5), transparent 70%)" },
    { id: "fortnite", nombre: "Fortnite", corto: "FORTNITE", categoria: "juego", query: "fortnite", aliases: ["fortnite"], icon: "fas fa-gamepad", iconColor: "text-purple-400", tag: "RARAS • V-BUCKS", sub: "120+ SKINS", img: "img/games/fortnite.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(150,0,255,.5), transparent 70%)" },
    { id: "lol", nombre: "LOL", corto: "LOL", categoria: "juego", query: "league", aliases: ["league", "lol", "league of legends"], icon: "fas fa-bolt", iconColor: "text-amber-400", tag: "ALL CHAMPS", sub: "CHALLENGER", img: "img/games/lol.jpg", fade: "" },
    { id: "cod", nombre: "COD Warzone", corto: "COD / WARZONE", categoria: "juego", query: "call of duty", aliases: ["call of duty", "warzone", "cod"], icon: "fas fa-bullseye", iconColor: "text-sky-400", tag: "BUNDLES", sub: "DAMASCUS", img: "img/games/cod.jpg", fade: "" },
    { id: "steam", nombre: "Steam", corto: "STEAM", categoria: "juego", query: "steam", aliases: ["steam", "steam key"], icon: "fab fa-steam", iconColor: "text-sky-300", tag: "JUEGOS + WALLET", sub: "LIBRARY", img: "img/games/steam.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(0,150,255,.5), transparent 70%)" },
    { id: "cs2", nombre: "CS2 Cases", corto: "CS2", categoria: "juego", query: "cs2", aliases: ["cs2", "csgo", "counter-strike", "counter strike"], icon: "fas fa-box-open", iconColor: "text-yellow-200", tag: "KNIVES • SKINS", sub: "CASES", img: "img/games/cs2.jpg", fade: "" },
    { id: "roblox", nombre: "Roblox", corto: "ROBLOX", categoria: "juego", query: "roblox", aliases: ["roblox", "robux"], icon: "fas fa-cube", iconColor: "text-emerald-400", tag: "ROBUX • LIMITEDS", sub: "LIMITEDS", img: "img/games/roblox.jpg", fade: "" },
    { id: "minecraft", nombre: "Minecraft", corto: "MINECRAFT", categoria: "juego", query: "minecraft", aliases: ["minecraft"], icon: "fas fa-hammer", iconColor: "text-emerald-500", tag: "CAPES • RANKED", sub: "JAVA • BEDROCK", img: "img/games/minecraft.jpg", fade: "" },
    { id: "brawl", nombre: "Brawl Stars", corto: "BRAWL STARS", categoria: "juego", query: "brawl", aliases: ["brawl", "brawl stars"], icon: "fas fa-star", iconColor: "text-yellow-400", tag: "MAX • BRAWLERS", sub: "50K TROFEOS", img: "img/games/brawlstars.jpg", fade: "" },
    { id: "clashroyale", nombre: "Clash Royale", corto: "CLASH ROYALE", categoria: "juego", query: "clash royale", aliases: ["clash royale", "royale"], icon: "fas fa-chess-rook", iconColor: "text-amber-500", tag: "MAX • LEGENDARIAS", sub: "6000 COPAS", img: "img/games/clash.jpg", fade: "" },
    { id: "pubg", nombre: "PUBG Mobile", corto: "PUBG", categoria: "juego", query: "pubg", aliases: ["pubg", "pubg mobile"], icon: "fas fa-user-shield", iconColor: "text-yellow-500", tag: "MYTHIC • SKINS", sub: "CONQUEROR", img: "img/games/pubg.jpg", fade: "" },
    { id: "genshin", nombre: "Genshin Impact", corto: "GENSHIN", categoria: "juego", query: "genshin", aliases: ["genshin", "genshin impact"], icon: "fas fa-star", iconColor: "text-purple-300", tag: "5 STARS • AR 55", sub: "AR 55", img: "img/games/genshin.jpg", fade: "" },
    { id: "gta", nombre: "GTA V Online", corto: "GTA V", categoria: "juego", query: "gta", aliases: ["gta", "gta v", "gta 5"], icon: "fas fa-car", iconColor: "text-orange-400", tag: "ONLINE • DINERO", sub: "MILLONES", img: "img/games/gtav.jpg", fade: "" },
    { id: "clans", nombre: "Clash of Clans", corto: "CLASH OF CLANS", categoria: "juego", query: "clash of clans", aliases: ["clash of clans", "clans"], icon: "fas fa-shield-alt", iconColor: "text-yellow-300", tag: "TH 15 • MAX", sub: "ALDEA MAX", img: "img/games/clashofclans.jpg", fade: "" },
    { id: "eafc", nombre: "EA FC 24", corto: "EA FC 24", categoria: "juego", query: "ea fc", aliases: ["ea fc", "ea fc 24", "fifa", "fc 24"], icon: "fas fa-futbol", iconColor: "text-emerald-400", tag: "ULTIMATE TEAM", sub: "COINS", img: "img/games/eafc.jpg", fade: "" },
    { id: "netflix", nombre: "Netflix", corto: "NETFLIX", categoria: "stream", query: "netflix", aliases: ["netflix"], icon: "fas fa-film", iconColor: "text-red-500", tag: "4K UHD • 5 PERFILES", sub: "4K • PREMIUM", img: "img/games/netflix.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(229,9,20,.5), transparent 70%)" },
    { id: "hbo", nombre: "HBO Max", corto: "HBO MAX", categoria: "stream", query: "hbo", aliases: ["hbo", "hbo max"], icon: "fas fa-tv", iconColor: "text-violet-400", tag: "PREMIUM • 4K", sub: "MAX • 4K", img: "img/games/hbo.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(90,0,255,.5), transparent 70%)" },
    { id: "disney", nombre: "Disney+", corto: "DISNEY+", categoria: "stream", query: "disney", aliases: ["disney", "disney+", "star+"], icon: "fas fa-hat-wizard", iconColor: "text-blue-400", tag: "STAR+ • 4K", sub: "STAR+", img: "img/games/disney.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(0,99,229,.5), transparent 70%)" },
    { id: "prime", nombre: "Prime Video", corto: "PRIME VIDEO", categoria: "stream", query: "prime", aliases: ["prime", "prime video", "amazon"], icon: "fas fa-play-circle", iconColor: "text-sky-400", tag: "4K • PREMIUM", sub: "4K", img: "img/games/prime.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(0,168,225,.5), transparent 70%)" },
    { id: "spotify", nombre: "Spotify", corto: "SPOTIFY", categoria: "stream", query: "spotify", aliases: ["spotify"], icon: "fab fa-spotify", iconColor: "text-emerald-400", tag: "FAMILY • 1 AÑO", sub: "FAMILY", img: "img/games/spotify.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(29,185,84,.5), transparent 70%)" },
    { id: "youtube", nombre: "YouTube Premium", corto: "YOUTUBE PREMIUM", categoria: "stream", query: "youtube", aliases: ["youtube", "youtube premium"], icon: "fab fa-youtube", iconColor: "text-red-500", tag: "SIN ANUNCIOS", sub: "12 MESES", img: "img/games/youtube.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(255,0,0,.5), transparent 70%)" },
    { id: "crunchyroll", nombre: "Crunchyroll", corto: "CRUNCHYROLL", categoria: "stream", query: "crunchyroll", aliases: ["crunchyroll", "crunchy"], icon: "fas fa-dragon", iconColor: "text-orange-500", tag: "MEGA FAN • 4K", sub: "MEGA FAN", img: "img/games/crunchy.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(244,117,33,.5), transparent 70%)" },
    { id: "xbox", nombre: "Xbox Game Pass", corto: "GAME PASS", categoria: "stream", query: "xbox", aliases: ["xbox", "game pass", "gamepass"], icon: "fab fa-xbox", iconColor: "text-green-500", tag: "ULTIMATE • 12M", sub: "ULTIMATE", img: "img/games/xbox.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(16,124,16,.5), transparent 70%)" },
    { id: "canva", nombre: "Canva Pro", corto: "CANVA PRO", categoria: "stream", query: "canva", aliases: ["canva", "canva pro"], icon: "fas fa-palette", iconColor: "text-cyan-300", tag: "PRO • EQUIPOS", sub: "PRO", img: "img/games/canva.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(0,196,204,.5), transparent 70%)" },
    { id: "paramount", nombre: "Paramount+", corto: "PARAMOUNT+", categoria: "stream", query: "paramount", aliases: ["paramount", "paramount+"], icon: "fas fa-mountain", iconColor: "text-blue-300", tag: "PREMIUM • 4K", sub: "PREMIUM", img: "img/games/paramount.jpg", fade: "radial-gradient(circle at 50% 0%, rgba(0,102,255,.5), transparent 70%)" }
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function keys(g) {
    return [g.nombre, g.corto, g.query].concat(g.aliases || []).map(function (x) { return String(x).toLowerCase(); });
  }

  function cardHtml(g) {
    const stream = g.categoria === "stream" ? " stream" : "";
    const fade = g.fade ? ' style="background:' + esc(g.fade) + '"' : "";
    return '<a href="ventas.html?juego=' + encodeURIComponent(g.query) + '" class="game-card' + stream + '">' +
      '<span class="g-verified">VERIFICADA</span>' +
      '<div class="img-wrap"><img class="real" alt="" src="' + esc(g.img) + '" onerror="this.remove()">' +
      '<div class="fade"' + fade + '></div>' +
      '<div class="name"><b>' + esc(g.corto) + '</b><i>' + esc(g.sub) + '</i></div></div>' +
      '<div class="g-label"><b>' + esc(g.nombre) + '</b><span>' + esc(g.tag) + '</span></div></a>';
  }

  function buscar(q) {
    const s = String(q || "").trim().toLowerCase();
    const list = s ? GAMES.filter(function (g) { return keys(g).some(function (k) { return k.indexOf(s) !== -1; }); }) : GAMES.slice();
    return list.slice(0, 8);
  }

  function coincide(filtro, publicacion) {
    const f = String(filtro || "").trim().toLowerCase();
    if (!f) return true;
    const p = publicacion || {};
    const blob = ((p.titulo || "") + " " + (p.juego || "") + " " + (p.region || "")).toLowerCase();
    if (blob.indexOf(f) !== -1) return true;
    const related = GAMES.filter(function (g) {
      return keys(g).some(function (k) { return k === f || k.indexOf(f) === 0 || f.indexOf(k) === 0; });
    });
    return related.some(function (g) {
      return keys(g).some(function (k) { return k.length >= 3 && blob.indexOf(k) !== -1; });
    });
  }

  window.SIILCK_GAMES = GAMES;
  window.siilckEsc = esc;
  window.siilckCardHtml = cardHtml;
  window.siilckBuscarJuegos = buscar;
  window.siilckCoincidePublicacion = coincide;
})();
