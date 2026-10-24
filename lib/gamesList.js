(function () {
  const GAMES = [
    { id: "valorant", nombre: "Valorant", corto: "VALORANT", categoria: "juego", query: "valorant", aliases: ["valorant", "valo"], icon: "fas fa-crosshairs", iconColor: "text-rose-400", tag: "DIAMANTE • SKINS", sub: "RADIANT", img: "img/games/valorant.webp", fade: "" },
    { id: "freefire", nombre: "Free Fire", corto: "FREE FIRE", categoria: "juego", query: "free fire", aliases: ["free fire", "freefire"], icon: "fas fa-fire", iconColor: "text-orange-400", tag: "ELITE • EVOS", sub: "NIVEL 72", img: "img/games/freefire.webp", fade: "radial-gradient(circle at 50% 0%, rgba(255,80,0,.5), transparent 70%)" },
    { id: "fortnite", nombre: "Fortnite", corto: "FORTNITE", categoria: "juego", query: "fortnite", aliases: ["fortnite"], icon: "fas fa-gamepad", iconColor: "text-purple-400", tag: "RARAS • V-BUCKS", sub: "120+ SKINS", img: "img/games/fortnite.webp", fade: "radial-gradient(circle at 50% 0%, rgba(150,0,255,.5), transparent 70%)" },
    { id: "lol", nombre: "LOL", corto: "LOL", categoria: "juego", query: "league", aliases: ["league", "lol", "league of legends"], icon: "fas fa-bolt", iconColor: "text-amber-400", tag: "ALL CHAMPS", sub: "CHALLENGER", img: "img/games/lol.webp", fade: "" },
    { id: "cod", nombre: "COD Warzone", corto: "COD / WARZONE", categoria: "juego", query: "call of duty", aliases: ["call of duty", "warzone", "cod"], icon: "fas fa-bullseye", iconColor: "text-sky-400", tag: "BUNDLES", sub: "DAMASCUS", img: "img/games/cod.webp", fade: "" },
    { id: "steam", nombre: "Steam", corto: "STEAM", categoria: "juego", query: "steam", aliases: ["steam", "steam key"], icon: "fab fa-steam", iconColor: "text-sky-300", tag: "JUEGOS + WALLET", sub: "LIBRARY", img: "img/games/steam.webp", fade: "radial-gradient(circle at 50% 0%, rgba(0,150,255,.5), transparent 70%)" },
    { id: "cs2", nombre: "CS2 Cases", corto: "CS2", categoria: "juego", query: "cs2", aliases: ["cs2", "csgo", "counter-strike", "counter strike"], icon: "fas fa-box-open", iconColor: "text-yellow-200", tag: "KNIVES • SKINS", sub: "CASES", img: "img/games/cs2.webp", fade: "" },
    { id: "roblox", nombre: "Roblox", corto: "ROBLOX", categoria: "juego", query: "roblox", aliases: ["roblox", "robux"], icon: "fas fa-cube", iconColor: "text-emerald-400", tag: "ROBUX • LIMITEDS", sub: "LIMITEDS", img: "img/games/roblox.webp", fade: "" },
    { id: "minecraft", nombre: "Minecraft", corto: "MINECRAFT", categoria: "juego", query: "minecraft", aliases: ["minecraft"], icon: "fas fa-hammer", iconColor: "text-emerald-500", tag: "CAPES • RANKED", sub: "JAVA • BEDROCK", img: "img/games/minecraft.webp", fade: "" },
    { id: "brawl", nombre: "Brawl Stars", corto: "BRAWL STARS", categoria: "juego", query: "brawl", aliases: ["brawl", "brawl stars"], icon: "fas fa-star", iconColor: "text-yellow-400", tag: "MAX • BRAWLERS", sub: "50K TROFEOS", img: "img/games/brawlstars.webp", fade: "" },
    { id: "clashroyale", nombre: "Clash Royale", corto: "CLASH ROYALE", categoria: "juego", query: "clash royale", aliases: ["clash royale", "royale"], icon: "fas fa-chess-rook", iconColor: "text-amber-500", tag: "MAX • LEGENDARIAS", sub: "6000 COPAS", img: "img/games/clash.webp", fade: "" },
    { id: "pubg", nombre: "PUBG Mobile", corto: "PUBG", categoria: "juego", query: "pubg", aliases: ["pubg", "pubg mobile"], icon: "fas fa-user-shield", iconColor: "text-yellow-500", tag: "MYTHIC • SKINS", sub: "CONQUEROR", img: "img/games/pubg.webp", fade: "" },
    { id: "genshin", nombre: "Genshin Impact", corto: "GENSHIN", categoria: "juego", query: "genshin", aliases: ["genshin", "genshin impact"], icon: "fas fa-star", iconColor: "text-purple-300", tag: "5 STARS • AR 55", sub: "AR 55", img: "img/games/genshin.webp", fade: "" },
    { id: "gta", nombre: "GTA V Online", corto: "GTA V", categoria: "juego", query: "gta", aliases: ["gta", "gta v", "gta 5"], icon: "fas fa-car", iconColor: "text-orange-400", tag: "ONLINE • DINERO", sub: "MILLONES", img: "img/games/gtav.webp", fade: "" },
    { id: "clans", nombre: "Clash of Clans", corto: "CLASH OF CLANS", categoria: "juego", query: "clash of clans", aliases: ["clash of clans", "clans"], icon: "fas fa-shield-alt", iconColor: "text-yellow-300", tag: "TH 15 • MAX", sub: "ALDEA MAX", img: "img/games/clashofclans.webp", fade: "" },
    { id: "eafc", nombre: "EA FC 24", corto: "EA FC 24", categoria: "juego", query: "ea fc", aliases: ["ea fc", "ea fc 24", "fifa", "fc 24"], icon: "fas fa-futbol", iconColor: "text-emerald-400", tag: "ULTIMATE TEAM", sub: "COINS", img: "img/games/eafc.webp", fade: "" },
    { id: "netflix", nombre: "Netflix", corto: "NETFLIX", categoria: "stream", query: "netflix", aliases: ["netflix"], icon: "fas fa-film", iconColor: "text-red-500", tag: "4K UHD • 5 PERFILES", sub: "4K • PREMIUM", img: "img/games/netflix.webp", fade: "radial-gradient(circle at 50% 0%, rgba(229,9,20,.5), transparent 70%)" },
    { id: "hbo", nombre: "HBO Max", corto: "HBO MAX", categoria: "stream", query: "hbo", aliases: ["hbo", "hbo max"], icon: "fas fa-tv", iconColor: "text-violet-400", tag: "PREMIUM • 4K", sub: "MAX • 4K", img: "img/games/hbo.webp", fade: "radial-gradient(circle at 50% 0%, rgba(90,0,255,.5), transparent 70%)" },
    { id: "disney", nombre: "Disney+", corto: "DISNEY+", categoria: "stream", query: "disney", aliases: ["disney", "disney+", "star+"], icon: "fas fa-hat-wizard", iconColor: "text-blue-400", tag: "STAR+ • 4K", sub: "STAR+", img: "img/games/disney.webp", fade: "radial-gradient(circle at 50% 0%, rgba(0,99,229,.5), transparent 70%)" },
    { id: "prime", nombre: "Prime Video", corto: "PRIME VIDEO", categoria: "stream", query: "prime", aliases: ["prime", "prime video", "amazon"], icon: "fas fa-play-circle", iconColor: "text-sky-400", tag: "4K • PREMIUM", sub: "4K", img: "img/games/prime.webp", fade: "radial-gradient(circle at 50% 0%, rgba(0,168,225,.5), transparent 70%)" },
    { id: "spotify", nombre: "Spotify", corto: "SPOTIFY", categoria: "stream", query: "spotify", aliases: ["spotify"], icon: "fab fa-spotify", iconColor: "text-emerald-400", tag: "FAMILY • 1 AÑO", sub: "FAMILY", img: "img/games/spotify.webp", fade: "radial-gradient(circle at 50% 0%, rgba(29,185,84,.5), transparent 70%)" },
    { id: "youtube", nombre: "YouTube Premium", corto: "YOUTUBE PREMIUM", categoria: "stream", query: "youtube", aliases: ["youtube", "youtube premium"], icon: "fab fa-youtube", iconColor: "text-red-500", tag: "SIN ANUNCIOS", sub: "12 MESES", img: "img/games/youtube.webp", fade: "radial-gradient(circle at 50% 0%, rgba(255,0,0,.5), transparent 70%)" },
    { id: "crunchyroll", nombre: "Crunchyroll", corto: "CRUNCHYROLL", categoria: "stream", query: "crunchyroll", aliases: ["crunchyroll", "crunchy"], icon: "fas fa-dragon", iconColor: "text-orange-500", tag: "MEGA FAN • 4K", sub: "MEGA FAN", img: "img/games/crunchy.webp", fade: "radial-gradient(circle at 50% 0%, rgba(244,117,33,.5), transparent 70%)" },
    { id: "xbox", nombre: "Xbox Game Pass", corto: "GAME PASS", categoria: "stream", query: "xbox", aliases: ["xbox", "game pass", "gamepass"], icon: "fab fa-xbox", iconColor: "text-green-500", tag: "ULTIMATE • 12M", sub: "ULTIMATE", img: "img/games/xbox.webp", fade: "radial-gradient(circle at 50% 0%, rgba(16,124,16,.5), transparent 70%)" },
    { id: "canva", nombre: "Canva Pro", corto: "CANVA PRO", categoria: "stream", query: "canva", aliases: ["canva", "canva pro"], icon: "fas fa-palette", iconColor: "text-cyan-300", tag: "PRO • EQUIPOS", sub: "PRO", img: "img/games/canva.webp", fade: "radial-gradient(circle at 50% 0%, rgba(0,196,204,.5), transparent 70%)" },
    { id: "capcut", nombre: "CapCut", corto: "CAPCUT", categoria: "stream", query: "capcut", aliases: ["capcut", "cap cut", "capcut pro"], icon: "fas fa-cut", iconColor: "text-cyan-300", tag: "PRO • SIN MARCA", sub: "PRO", img: "img/games/capcut.svg", fade: "radial-gradient(circle at 50% 0%, rgba(34,211,238,.5), transparent 70%)" },
    { id: "paramount", nombre: "Paramount+", corto: "PARAMOUNT+", categoria: "stream", query: "paramount", aliases: ["paramount", "paramount+"], icon: "fas fa-mountain", iconColor: "text-blue-300", tag: "PREMIUM • 4K", sub: "PREMIUM", img: "img/games/paramount.webp", fade: "radial-gradient(circle at 50% 0%, rgba(0,102,255,.5), transparent 70%)" },
    { id: "apex", nombre: "Apex Legends", corto: "APEX LEGENDS", categoria: "juego", query: "apex", aliases: ["apex", "apex legends"], icon: "fas fa-crosshairs", iconColor: "text-red-400", tag: "HEIRLOOMS • SKINS", sub: "PREDATOR", img: "img/games/apex.webp", fade: "radial-gradient(circle at 50% 0%, rgba(220,38,38,.5), transparent 70%)" },
    { id: "overwatch", nombre: "Overwatch 2", corto: "OVERWATCH 2", categoria: "juego", query: "overwatch", aliases: ["overwatch", "overwatch 2", "ow2"], icon: "fas fa-shield-alt", iconColor: "text-orange-400", tag: "BATTLE PASS • SKINS", sub: "GRANDMASTER", img: "img/games/overwatch.webp", fade: "radial-gradient(circle at 50% 0%, rgba(249,115,22,.5), transparent 70%)" },
    { id: "dota2", nombre: "Dota 2", corto: "DOTA 2", categoria: "juego", query: "dota 2", aliases: ["dota", "dota 2", "dota2"], icon: "fas fa-bolt", iconColor: "text-red-500", tag: "IMMORTALS • ARCANAS", sub: "IMMORTAL", img: "img/games/dota2.webp", fade: "radial-gradient(circle at 50% 0%, rgba(239,68,68,.5), transparent 70%)" },
    { id: "wow", nombre: "World of Warcraft", corto: "WOW", categoria: "juego", query: "world of warcraft", aliases: ["wow", "world of warcraft", "warcraft"], icon: "fas fa-hat-wizard", iconColor: "text-amber-500", tag: "GOLD • BOOST", sub: "LEVEL 80", img: "img/games/wow.webp", fade: "radial-gradient(circle at 50% 0%, rgba(245,158,11,.5), transparent 70%)" },
    { id: "codmobile", nombre: "COD Mobile", corto: "COD MOBILE", categoria: "juego", query: "call of duty mobile", aliases: ["call of duty mobile", "cod mobile", "codm"], icon: "fas fa-bullseye", iconColor: "text-sky-500", tag: "MYTHIC • CP", sub: "LEGENDARY", img: "img/games/codmobile.webp", fade: "radial-gradient(circle at 50% 0%, rgba(14,165,233,.5), transparent 70%)" },
    { id: "mlbb", nombre: "Mobile Legends", corto: "MOBILE LEGENDS", categoria: "juego", query: "mobile legends", aliases: ["mobile legends", "mlbb", "ml"], icon: "fas fa-bolt", iconColor: "text-blue-400", tag: "DIAMONDS • SKINS", sub: "MYTHIC GLORY", img: "img/games/wildrift.webp", fade: "radial-gradient(circle at 50% 0%, rgba(59,130,246,.5), transparent 70%)" },
    { id: "pokemon", nombre: "Pokémon GO", corto: "POKEMON GO", categoria: "juego", query: "pokemon go", aliases: ["pokemon", "pokemon go", "pogo"], icon: "fas fa-circle", iconColor: "text-yellow-400", tag: "SHINY • POKECOINS", sub: "LEVEL 50", img: "img/games/pokemon.webp", fade: "radial-gradient(circle at 50% 0%, rgba(250,204,21,.5), transparent 70%)" },
    { id: "rocketleague", nombre: "Rocket League", corto: "ROCKET LEAGUE", categoria: "juego", query: "rocket league", aliases: ["rocket league", "rl", "rocket"], icon: "fas fa-rocket", iconColor: "text-sky-400", tag: "CREDITS • ITEMS", sub: "SSL", img: "img/games/rocketleague.webp", fade: "radial-gradient(circle at 50% 0%, rgba(56,189,248,.5), transparent 70%)" },
    { id: "amongus", nombre: "Among Us", corto: "AMONG US", categoria: "juego", query: "among us", aliases: ["among us", "amongus"], icon: "fas fa-user-secret", iconColor: "text-rose-400", tag: "SKINS • PETS", sub: "CREWMATE", img: "img/games/amongus.webp", fade: "radial-gradient(circle at 50% 0%, rgba(244,63,94,.5), transparent 70%)" },
    { id: "fallguys", nombre: "Fall Guys", corto: "FALL GUYS", categoria: "juego", query: "fall guys", aliases: ["fall guys", "fallguys"], icon: "fas fa-running", iconColor: "text-pink-400", tag: "COSTUMES • CROWNS", sub: "SHOW", img: "img/games/fallguys.webp", fade: "radial-gradient(circle at 50% 0%, rgba(244,114,182,.5), transparent 70%)" },
    { id: "diablo", nombre: "Diablo IV", corto: "DIABLO IV", categoria: "juego", query: "diablo 4", aliases: ["diablo", "diablo 4", "diablo iv"], icon: "fas fa-skull", iconColor: "text-red-600", tag: "GOLD • ITEMS", sub: "TORMENT", img: "img/games/diablo.webp", fade: "radial-gradient(circle at 50% 0%, rgba(220,38,38,.5), transparent 70%)" },
    { id: "poe", nombre: "Path of Exile", corto: "PATH OF EXILE", categoria: "juego", query: "path of exile", aliases: ["path of exile", "poe", "poe 2"], icon: "fas fa-gem", iconColor: "text-amber-400", tag: "CURRENCY • ITEMS", sub: "ENDGAME", img: "img/games/poe.webp", fade: "radial-gradient(circle at 50% 0%, rgba(251,191,36,.5), transparent 70%)" },
    { id: "warframe", nombre: "Warframe", corto: "WARFRAME", categoria: "juego", query: "warframe", aliases: ["warframe"], icon: "fas fa-robot", iconColor: "text-cyan-400", tag: "PLATINUM • FRAMES", sub: "STEEL PATH", img: "img/games/warframe.webp", fade: "radial-gradient(circle at 50% 0%, rgba(34,211,238,.5), transparent 70%)" },
    { id: "rust", nombre: "Rust", corto: "RUST", categoria: "juego", query: "rust", aliases: ["rust", "rust game"], icon: "fas fa-wrench", iconColor: "text-orange-500", tag: "SKINS • ACCOUNTS", sub: "SOLO/DUO", img: "img/games/rust.webp", fade: "radial-gradient(circle at 50% 0%, rgba(249,115,22,.5), transparent 70%)" },
    { id: "r6", nombre: "Rainbow Six", corto: "RAINBOW SIX", categoria: "juego", query: "rainbow six", aliases: ["rainbow six", "r6", "rainbow six siege", "siege"], icon: "fas fa-user-shield", iconColor: "text-blue-500", tag: "SKINS • ELITE", sub: "CHAMPION", img: "img/games/r6.webp", fade: "radial-gradient(circle at 50% 0%, rgba(59,130,246,.5), transparent 70%)" },
    { id: "wildrift", nombre: "Wild Rift", corto: "WILD RIFT", categoria: "juego", query: "wild rift", aliases: ["wild rift", "wildrift", "lol wr"], icon: "fas fa-bolt", iconColor: "text-sky-400", tag: "CHAMPS • SKINS", sub: "CHALLENGER", img: "img/games/wildrift.webp", fade: "radial-gradient(circle at 50% 0%, rgba(56,189,248,.5), transparent 70%)" },
    { id: "hsr", nombre: "Honkai Star Rail", corto: "HONKAI STAR RAIL", categoria: "juego", query: "honkai star rail", aliases: ["honkai", "honkai star rail", "hsr", "star rail"], icon: "fas fa-star", iconColor: "text-purple-400", tag: "5 STAR • LIGHT CONES", sub: "EQUILIBRIUM 6", img: "img/games/hsr.webp", fade: "radial-gradient(circle at 50% 0%, rgba(168,85,247,.5), transparent 70%)" },
    { id: "wuwa", nombre: "Wuthering Waves", corto: "WUTHERING WAVES", categoria: "juego", query: "wuthering waves", aliases: ["wuthering waves", "wuwa", "waves"], icon: "fas fa-wind", iconColor: "text-cyan-300", tag: "5 STAR • WEAPONS", sub: "UNION LVL 50", img: "img/games/wuwa.webp", fade: "radial-gradient(circle at 50% 0%, rgba(103,232,249,.5), transparent 70%)" },
    { id: "zzz", nombre: "Zenless Zone Zero", corto: "ZENLESS ZONE ZERO", categoria: "juego", query: "zenless zone zero", aliases: ["zenless", "zenless zone zero", "zzz"], icon: "fas fa-bolt", iconColor: "text-yellow-300", tag: "S RANK • BANGBOO", sub: "INTER-KNOT", img: "img/games/zzz.webp", fade: "radial-gradient(circle at 50% 0%, rgba(253,224,71,.5), transparent 70%)" },
    { id: "tof", nombre: "Tower of Fantasy", corto: "TOWER OF FANTASY", categoria: "juego", query: "tower of fantasy", aliases: ["tower of fantasy", "tof"], icon: "fas fa-tower-observation", iconColor: "text-pink-400", tag: "SSR • MATRICES", sub: "VERSION 4", img: "img/games/tof.webp", fade: "radial-gradient(circle at 50% 0%, rgba(244,114,182,.5), transparent 70%)" },
    { id: "sf6", nombre: "Street Fighter 6", corto: "STREET FIGHTER 6", categoria: "juego", query: "street fighter 6", aliases: ["street fighter", "street fighter 6", "sf6"], icon: "fas fa-fist-raised", iconColor: "text-orange-400", tag: "FIGHT MONEY • COLORS", sub: "MASTER RANK", img: "img/games/sf6.webp", fade: "radial-gradient(circle at 50% 0%, rgba(249,115,22,.5), transparent 70%)" },
    { id: "tekken", nombre: "Tekken 8", corto: "TEKKEN 8", categoria: "juego", query: "tekken 8", aliases: ["tekken", "tekken 8", "tekken8"], icon: "fas fa-fist-raised", iconColor: "text-yellow-500", tag: "TEKKEN COINS • SKINS", sub: "TEKKEN GOD", img: "img/games/tekken.webp", fade: "radial-gradient(circle at 50% 0%, rgba(234,179,8,.5), transparent 70%)" },
    { id: "mk1", nombre: "Mortal Kombat 1", corto: "MORTAL KOMBAT 1", categoria: "juego", query: "mortal kombat 1", aliases: ["mortal kombat", "mortal kombat 1", "mk1", "mk 1"], icon: "fas fa-skull-crossbones", iconColor: "text-red-500", tag: "DRAGON KRISTALS", sub: "KOLLEKTION", img: "img/games/mk1.webp", fade: "radial-gradient(circle at 50% 0%, rgba(239,68,68,.5), transparent 70%)" },
    { id: "forza", nombre: "Forza Horizon 5", corto: "FORZA HORIZON 5", categoria: "juego", query: "forza horizon", aliases: ["forza", "forza horizon", "forza horizon 5"], icon: "fas fa-car", iconColor: "text-green-400", tag: "CARS • CREDITS", sub: "HORIZON 5", img: "img/games/forza.webp", fade: "radial-gradient(circle at 50% 0%, rgba(74,222,128,.5), transparent 70%)" },
    { id: "sims4", nombre: "The Sims 4", corto: "THE SIMS 4", categoria: "juego", query: "the sims 4", aliases: ["the sims", "the sims 4", "sims 4", "sims"], icon: "fas fa-users", iconColor: "text-emerald-300", tag: "DLC • SIMOLEONS", sub: "EXPANSION PACKS", img: "img/games/sims4.webp", fade: "radial-gradient(circle at 50% 0%, rgba(110,231,183,.5), transparent 70%)" },
    { id: "destiny2", nombre: "Destiny 2", corto: "DESTINY 2", categoria: "juego", query: "destiny 2", aliases: ["destiny", "destiny 2", "destiny2"], icon: "fas fa-globe", iconColor: "text-orange-300", tag: "SILVER • GEAR", sub: "LIGHTFALL", img: "img/games/destiny2.webp", fade: "radial-gradient(circle at 50% 0%, rgba(251,146,60,.5), transparent 70%)" },
    { id: "tft", nombre: "Teamfight Tactics", corto: "TFT", categoria: "juego", query: "teamfight tactics", aliases: ["tft", "teamfight tactics"], icon: "fas fa-chess", iconColor: "text-amber-300", tag: "LITTLE LEGENDS", sub: "CHALLENGER", img: "img/games/lol.webp", fade: "radial-gradient(circle at 50% 0%, rgba(252,211,77,.5), transparent 70%)" },
    { id: "hearthstone", nombre: "Hearthstone", corto: "HEARTHSTONE", categoria: "juego", query: "hearthstone", aliases: ["hearthstone", "hs"], icon: "fas fa-fire", iconColor: "text-orange-400", tag: "PACKS • DUST", sub: "LEGENDARY", img: "img/games/hearthstone.webp", fade: "radial-gradient(circle at 50% 0%, rgba(249,115,22,.5), transparent 70%)" },
    { id: "eldenring", nombre: "Elden Ring", corto: "ELDEN RING", categoria: "juego", query: "elden ring", aliases: ["elden ring", "elden"], icon: "fas fa-crown", iconColor: "text-amber-200", tag: "RUNES • ITEMS", sub: "NG+", img: "img/games/eldenring.webp", fade: "radial-gradient(circle at 50% 0%, rgba(254,243,199,.4), transparent 70%)" },
    { id: "ark", nombre: "ARK Survival", corto: "ARK SURVIVAL", categoria: "juego", query: "ark survival", aliases: ["ark", "ark survival", "ark evolved"], icon: "fas fa-dragon", iconColor: "text-emerald-500", tag: "DINOS • BP", sub: "ASCENDED", img: "img/games/ark.webp", fade: "radial-gradient(circle at 50% 0%, rgba(16,185,129,.5), transparent 70%)" },
    { id: "dbd", nombre: "Dead by Daylight", corto: "DEAD BY DAYLIGHT", categoria: "juego", query: "dead by daylight", aliases: ["dead by daylight", "dbd"], icon: "fas fa-skull", iconColor: "text-red-400", tag: "RIFT • SKINS", sub: "IRRIDESCENT", img: "img/games/dbd.webp", fade: "radial-gradient(circle at 50% 0%, rgba(248,113,113,.5), transparent 70%)" },
    { id: "nba2k", nombre: "NBA 2K24", corto: "NBA 2K24", categoria: "juego", query: "nba 2k", aliases: ["nba 2k", "nba 2k24", "nba2k"], icon: "fas fa-basketball-ball", iconColor: "text-orange-400", tag: "VC • MYTEAM", sub: "PINK DIAMOND", img: "img/games/nba2k.webp", fade: "radial-gradient(circle at 50% 0%, rgba(249,115,22,.5), transparent 70%)" },
    { id: "stardew", nombre: "Stardew Valley", corto: "STARDEW VALLEY", categoria: "juego", query: "stardew valley", aliases: ["stardew", "stardew valley"], icon: "fas fa-seedling", iconColor: "text-green-400", tag: "FARMS • ITEMS", sub: "YEAR 5", img: "img/games/stardew.webp", fade: "radial-gradient(circle at 50% 0%, rgba(74,222,128,.5), transparent 70%)" },
    { id: "terraria", nombre: "Terraria", corto: "TERRARIA", categoria: "juego", query: "terraria", aliases: ["terraria"], icon: "fas fa-tree", iconColor: "text-green-500", tag: "ITEMS • BOSSES", sub: "MASTER MODE", img: "img/games/terraria.webp", fade: "radial-gradient(circle at 50% 0%, rgba(34,197,94,.5), transparent 70%)" },
    { id: "baldursgate", nombre: "Baldur's Gate 3", corto: "BALDUR'S GATE 3", categoria: "juego", query: "baldurs gate 3", aliases: ["baldurs gate", "baldurs gate 3", "bg3"], icon: "fas fa-dragon", iconColor: "text-red-400", tag: "GOLD • ITEMS", sub: "TACTICIAN", img: "img/games/baldursgate.webp", fade: "radial-gradient(circle at 50% 0%, rgba(248,113,113,.5), transparent 70%)" },
    { id: "lostark", nombre: "Lost Ark", corto: "LOST ARK", categoria: "juego", query: "lost ark", aliases: ["lost ark", "lostark"], icon: "fas fa-anchor", iconColor: "text-amber-400", tag: "GOLD • GEAR", sub: "ILVL 1600", img: "img/games/lostark.webp", fade: "radial-gradient(circle at 50% 0%, rgba(251,191,36,.5), transparent 70%)" },
    { id: "mtga", nombre: "Magic Arena", corto: "MAGIC ARENA", categoria: "juego", query: "magic the gathering", aliases: ["magic", "magic arena", "mtg", "mtga", "magic the gathering"], icon: "fas fa-hat-wizard", iconColor: "text-violet-500", tag: "GEMS • PACKS", sub: "MYTHIC", img: "img/games/mtga.webp", fade: "radial-gradient(circle at 50% 0%, rgba(139,92,246,.5), transparent 70%)" },
    { id: "callofdutywarzonemobile", nombre: "Warzone Mobile", corto: "WARZONE MOBILE", categoria: "juego", query: "warzone mobile", aliases: ["warzone mobile", "wzm"], icon: "fas fa-bullseye", iconColor: "text-slate-400", tag: "CP • BUNDLES", sub: "VICTORY", img: "img/games/warzonemobile.webp", fade: "radial-gradient(circle at 50% 0%, rgba(148,163,184,.5), transparent 70%)" },
    { id: "arena breakout", nombre: "Arena Breakout", corto: "ARENA BREAKOUT", categoria: "juego", query: "arena breakout", aliases: ["arena breakout", "arena breakout infinite"], icon: "fas fa-bullseye", iconColor: "text-amber-600", tag: "KOA • GEAR", sub: "ELITE", img: "img/games/arenabreakout.webp", fade: "radial-gradient(circle at 50% 0%, rgba(217,119,6,.5), transparent 70%)" },
    { id: "hulu", nombre: "Hulu", corto: "HULU", categoria: "stream", query: "hulu", aliases: ["hulu"], icon: "fas fa-tv", iconColor: "text-green-500", tag: "NO ADS • 4K", sub: "NO ADS", img: "img/games/hulu.svg", fade: "radial-gradient(circle at 50% 0%, rgba(34,197,94,.5), transparent 70%)" },
    { id: "appletv", nombre: "Apple TV+", corto: "APPLE TV+", categoria: "stream", query: "apple tv", aliases: ["apple tv", "apple tv+", "appletv"], icon: "fab fa-apple", iconColor: "text-zinc-300", tag: "4K • ORIGINALS", sub: "4K", img: "img/games/appletv.svg", fade: "radial-gradient(circle at 50% 0%, rgba(228,228,231,.4), transparent 70%)" },
    { id: "peacock", nombre: "Peacock", corto: "PEACOCK", categoria: "stream", query: "peacock", aliases: ["peacock", "nbc peacock"], icon: "fas fa-feather", iconColor: "text-yellow-500", tag: "PREMIUM PLUS", sub: "4K • LIVE", img: "img/games/peacock.svg", fade: "radial-gradient(circle at 50% 0%, rgba(234,179,8,.5), transparent 70%)" },
    { id: "discovery", nombre: "Discovery+", corto: "DISCOVERY+", categoria: "stream", query: "discovery", aliases: ["discovery", "discovery+", "discovery plus"], icon: "fas fa-globe-americas", iconColor: "text-blue-400", tag: "PREMIUM • 4K", sub: "DOCUMENTALES", img: "img/games/discovery.svg", fade: "radial-gradient(circle at 50% 0%, rgba(59,130,246,.5), transparent 70%)" },
    { id: "starz", nombre: "Starz", corto: "STARZ", categoria: "stream", query: "starz", aliases: ["starz"], icon: "fas fa-star", iconColor: "text-zinc-200", tag: "PREMIUM • 4K", sub: "ORIGINALS", img: "img/games/starz.svg", fade: "radial-gradient(circle at 50% 0%, rgba(228,228,231,.4), transparent 70%)" },
    { id: "espn", nombre: "ESPN+", corto: "ESPN+", categoria: "stream", query: "espn", aliases: ["espn", "espn+", "espn plus"], icon: "fas fa-football-ball", iconColor: "text-red-600", tag: "LIVE • UFC", sub: "PPV", img: "img/games/espn.svg", fade: "radial-gradient(circle at 50% 0%, rgba(220,38,38,.5), transparent 70%)" },
    { id: "nbaleague", nombre: "NBA League Pass", corto: "NBA LEAGUE PASS", categoria: "stream", query: "nba league pass", aliases: ["nba league pass", "league pass", "nba pass"], icon: "fas fa-basketball-ball", iconColor: "text-orange-500", tag: "ALL TEAMS • 4K", sub: "PREMIUM", img: "img/games/nbaleague.svg", fade: "radial-gradient(circle at 50% 0%, rgba(249,115,22,.5), transparent 70%)" },
    { id: "nflpass", nombre: "NFL Game Pass", corto: "NFL GAME PASS", categoria: "stream", query: "nfl game pass", aliases: ["nfl", "nfl game pass", "nfl pass"], icon: "fas fa-football-ball", iconColor: "text-yellow-400", tag: "ALL GAMES • LIVE", sub: "PRO", img: "img/games/nflpass.svg", fade: "radial-gradient(circle at 50% 0%, rgba(250,204,21,.5), transparent 70%)" },
    { id: "twitch", nombre: "Twitch Turbo", corto: "TWITCH TURBO", categoria: "stream", query: "twitch", aliases: ["twitch", "twitch turbo", "twitch prime"], icon: "fab fa-twitch", iconColor: "text-purple-500", tag: "SIN ANUNCIOS", sub: "TURBO", img: "img/games/twitch.svg", fade: "radial-gradient(circle at 50% 0%, rgba(168,85,247,.5), transparent 70%)" },
    { id: "discord", nombre: "Discord Nitro", corto: "DISCORD NITRO", categoria: "stream", query: "discord nitro", aliases: ["discord", "discord nitro", "nitro"], icon: "fab fa-discord", iconColor: "text-indigo-400", tag: "FULL • 1 AÑO", sub: "NITRO FULL", img: "img/games/discord.svg", fade: "radial-gradient(circle at 50% 0%, rgba(129,140,248,.5), transparent 70%)" },
    { id: "chatgpt", nombre: "ChatGPT Plus", corto: "CHATGPT PLUS", categoria: "stream", query: "chatgpt", aliases: ["chatgpt", "chatgpt plus", "openai", "gpt plus"], icon: "fas fa-comments", iconColor: "text-emerald-400", tag: "GPT-4 • 1 AÑO", sub: "PLUS", img: "img/games/chatgpt.svg", fade: "radial-gradient(circle at 50% 0%, rgba(52,211,153,.5), transparent 70%)" },
    { id: "adobe", nombre: "Adobe CC", corto: "ADOBE CREATIVE CLOUD", categoria: "stream", query: "adobe creative cloud", aliases: ["adobe", "adobe cc", "creative cloud", "adobe creative"], icon: "fas fa-pen-nib", iconColor: "text-red-500", tag: "ALL APPS • PRO", sub: "CREATIVE CLOUD", img: "img/games/adobe.svg", fade: "radial-gradient(circle at 50% 0%, rgba(239,68,68,.5), transparent 70%)" },
    { id: "nordvpn", nombre: "NordVPN", corto: "NORDVPN", categoria: "stream", query: "nordvpn", aliases: ["nordvpn", "nord vpn"], icon: "fas fa-shield-alt", iconColor: "text-blue-500", tag: "2 AÑOS • PREMIUM", sub: "VPN", img: "img/games/nordvpn.svg", fade: "radial-gradient(circle at 50% 0%, rgba(59,130,246,.5), transparent 70%)" },
    { id: "applemusic", nombre: "Apple Music", corto: "APPLE MUSIC", categoria: "stream", query: "apple music", aliases: ["apple music", "applemusic"], icon: "fab fa-apple", iconColor: "text-pink-400", tag: "FAMILY • 1 AÑO", sub: "LOSSLESS", img: "img/games/applemusic.svg", fade: "radial-gradient(circle at 50% 0%, rgba(244,114,182,.5), transparent 70%)" },
    { id: "deezer", nombre: "Deezer", corto: "DEEZER", categoria: "stream", query: "deezer", aliases: ["deezer"], icon: "fas fa-music", iconColor: "text-purple-500", tag: "PREMIUM • HI-FI", sub: "HI-FI", img: "img/games/deezer.svg", fade: "radial-gradient(circle at 50% 0%, rgba(168,85,247,.5), transparent 70%)" },
    { id: "tidal", nombre: "Tidal", corto: "TIDAL", categoria: "stream", query: "tidal", aliases: ["tidal"], icon: "fas fa-music", iconColor: "text-cyan-400", tag: "HI-FI PLUS", sub: "MASTER", img: "img/games/tidal.svg", fade: "radial-gradient(circle at 50% 0%, rgba(34,211,238,.5), transparent 70%)" },
    { id: "audible", nombre: "Audible", corto: "AUDIBLE", categoria: "stream", query: "audible", aliases: ["audible", "audible plus"], icon: "fas fa-headphones", iconColor: "text-amber-500", tag: "PREMIUM PLUS", sub: "AUDIOBOOKS", img: "img/games/audible.svg", fade: "radial-gradient(circle at 50% 0%, rgba(245,158,11,.5), transparent 70%)" },
    { id: "telegram", nombre: "Telegram Premium", corto: "TELEGRAM PREMIUM", categoria: "stream", query: "telegram premium", aliases: ["telegram", "telegram premium"], icon: "fab fa-telegram", iconColor: "text-sky-400", tag: "PREMIUM • 1 AÑO", sub: "PREMIUM", img: "img/games/telegram.svg", fade: "radial-gradient(circle at 50% 0%, rgba(56,189,248,.5), transparent 70%)" },
    { id: "duolingo", nombre: "Duolingo Plus", corto: "DUOLINGO PLUS", categoria: "stream", query: "duolingo", aliases: ["duolingo", "duolingo plus", "duolingo max"], icon: "fas fa-graduation-cap", iconColor: "text-green-400", tag: "SUPER • SIN ANUNCIOS", sub: "SUPER", img: "img/games/duolingo.svg", fade: "radial-gradient(circle at 50% 0%, rgba(74,222,128,.5), transparent 70%)" },
    { id: "coursera", nombre: "Coursera Plus", corto: "COURSERA PLUS", categoria: "stream", query: "coursera", aliases: ["coursera", "coursera plus"], icon: "fas fa-graduation-cap", iconColor: "text-blue-500", tag: "CERTIFICADOS", sub: "PLUS", img: "img/games/coursera.svg", fade: "radial-gradient(circle at 50% 0%, rgba(59,130,246,.5), transparent 70%)" },
    { id: "linkedin", nombre: "LinkedIn Premium", corto: "LINKEDIN PREMIUM", categoria: "stream", query: "linkedin premium", aliases: ["linkedin", "linkedin premium"], icon: "fab fa-linkedin", iconColor: "text-blue-600", tag: "CAREER • JOBS", sub: "PREMIUM", img: "img/games/linkedin.svg", fade: "radial-gradient(circle at 50% 0%, rgba(37,99,235,.5), transparent 70%)" },
    { id: "nyt", nombre: "New York Times", corto: "NYT GAMES", categoria: "stream", query: "new york times", aliases: ["new york times", "nyt", "nyt games"], icon: "fas fa-newspaper", iconColor: "text-zinc-200", tag: "ALL ACCESS • GAMES", sub: "ALL ACCESS", img: "img/games/nyt.svg", fade: "radial-gradient(circle at 50% 0%, rgba(228,228,231,.4), transparent 70%)" },
    { id: "expressvpn", nombre: "ExpressVPN", corto: "EXPRESSVPN", categoria: "stream", query: "expressvpn", aliases: ["expressvpn", "express vpn"], icon: "fas fa-lock", iconColor: "text-red-400", tag: "12 MESES • PREMIUM", sub: "VPN", img: "img/games/expressvpn.svg", fade: "radial-gradient(circle at 50% 0%, rgba(248,113,113,.5), transparent 70%)" },
    { id: "max", nombre: "Max Streaming", corto: "MAX", categoria: "stream", query: "max streaming", aliases: ["max", "max streaming", "hbo max", "max hbomax"], icon: "fas fa-tv", iconColor: "text-violet-400", tag: "ULTIMATE • 4K", sub: "ULTIMATE", img: "img/games/hbo.webp", fade: "radial-gradient(circle at 50% 0%, rgba(139,92,246,.5), transparent 70%)" }
  ];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function keys(g) {
    return [g.nombre, g.corto, g.query].concat(g.aliases || []).map(function (x) { return String(x).toLowerCase(); });
  }

  function textoVerificada() {
    if (!window.SiilckSettings) return 'VERIFICADA';
    const v = SiilckSettings.t('verified');
    return !v || v === 'verified' ? 'VERIFICADA' : v;
  }

  function cardHtml(g) {
    const stream = g.categoria === "stream" ? " stream" : "";
    return '<a href="ventas.html?juego=' + encodeURIComponent(g.query) + '" class="game-card' + stream + '">' +
      '<span class="g-verified">' + esc(textoVerificada()) + '</span>' +
      '<div class="img-wrap"><div class="img-fallback"><i class="' + esc(g.icon) + ' ' + esc(g.iconColor) + '"></i></div><img class="real" alt="" loading="lazy" src="' + esc(g.img) + '" onerror="this.style.display=\'none\'">' +
      '<div class="fade"></div>' +
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

  function catalogoJuego(texto) {
    const blob = String(texto || "").trim().toLowerCase();
    if (!blob) return null;
    let i, g;
    for (i = 0; i < GAMES.length; i++) {
      g = GAMES[i];
      if (String(g.nombre).toLowerCase() === blob) return g;
    }
    let best = null;
    let bestLen = 0;
    for (i = 0; i < GAMES.length; i++) {
      g = GAMES[i];
      keys(g).forEach(function (k) {
        if (k.length >= 3 && blob.indexOf(k) !== -1 && k.length > bestLen) {
          best = g;
          bestLen = k.length;
        }
      });
    }
    return best;
  }

  function fotoCatalogo(publicacion) {
    const p = publicacion || {};
    const porJuego = catalogoJuego(p.juego);
    if (porJuego && porJuego.img) return porJuego.img;
    const porTitulo = catalogoJuego(String(p.juego || "") + " " + String(p.titulo || ""));
    if (porTitulo && porTitulo.img) return porTitulo.img;
    return p.foto || "";
  }

  window.SIILCK_GAMES = GAMES;
  window.siilckEsc = esc;
  window.siilckCardHtml = cardHtml;
  window.siilckBuscarJuegos = buscar;
  window.siilckCoincidePublicacion = coincide;
  window.siilckCatalogoJuego = catalogoJuego;
  window.siilckFotoCatalogo = fotoCatalogo;
})();
