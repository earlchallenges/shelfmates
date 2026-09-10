/* Shelfmates v2 — friends' favorite books by genre, with coins, pets, levels, banners, covers, series, and 200+ badges.
   Built from Michael's blueprint (2026-09-08). Single-page app on Supabase. */
(function () {
  "use strict";
  const CFG = window.SHELFMATES_CONFIG || {};
  const EMAIL_DOMAIN = "@shelfmates.app";
  const DEFAULT_CATEGORIES = ["Fantasy", "Science Fiction", "Mystery & Thriller", "Romance", "Non-fiction", "Kids & Family"];
  const MAX_PER_CATEGORY = 10;
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MONTH_ICONS = ["❄️","💘","🍀","🌷","🌼","☀️","🎆","🌻","🍂","🎃","🦃","🎄"];

  // ---------- content ratings (Michael: say if a book has much swearing or is explicit) ----------
  const CONTENT = [
    { key: "", label: "Not rated", short: "" },
    { key: "clean", label: "Clean", short: "Clean" },
    { key: "mild", label: "Some swearing", short: "Some swearing" },
    { key: "heavy", label: "Lots of swearing", short: "Lots of swearing" },
    { key: "explicit", label: "Explicit", short: "Explicit" },
  ];
  const contentOf = (k) => CONTENT.find(c => c.key === (k || "")) || CONTENT[0];
  const contentPill = (k) => { const c = contentOf(k); return c.key ? el("span", { class: "content " + c.key, title: "Content: " + c.label }, c.short) : null; };
  const LEVELS = [["", "?"], ["none", "None"], ["mild", "Mild"], ["medium", "Medium"], ["high", "High"]];
  const CONTENT_AXES = [["content", "Language", CONTENT.map(c => [c.key, c.key ? c.label : "?"])], ["spice", "Spice", LEVELS], ["violence", "Violence", LEVELS]];
  // one compact button that opens three little toggles: language, spice, violence
  function contentSelect(item, onChange) {
    const has = item.content || item.spice || item.violence;
    const btn = el("button", { class: "content-sel" + (has ? " set" : ""), type: "button", title: "Language, spice and violence" }, has ? "⚠︎ Content" : "Content?");
    const pop = el("div", { class: "content-pop", hidden: true, onclick: (e) => e.stopPropagation() },
      ...CONTENT_AXES.map(([field, label, opts]) => el("label", { class: "content-axis" }, el("span", {}, label), el("select", { onchange: (e) => { item[field] = e.target.value; onChange(field, e.target.value); btn.textContent = (item.content || item.spice || item.violence) ? "⚠︎ Content" : "Content?"; btn.classList.toggle("set", !!(item.content || item.spice || item.violence)); } }, ...opts.map(([v, l]) => el("option", { value: v, selected: (item[field] || "") === v }, l))))),
      el("div", { class: "muted small", style: "padding:4px 2px 0" }, "Helps friends decide. Only shown when set."));
    btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); document.querySelectorAll(".content-pop").forEach(x => { if (x !== pop) x.hidden = true; }); pop.hidden = !pop.hidden; });
    return el("span", { class: "content-wrap" }, btn, pop);
  }
  document.addEventListener("click", () => document.querySelectorAll(".content-pop").forEach(x => x.hidden = true));
  const levelPill = (field, label, v) => v && v !== "none" ? el("span", { class: "content " + (v === "high" ? "heavy" : v === "medium" ? "mild" : "clean"), title: label + ": " + v }, label + ": " + v) : (v === "none" ? el("span", { class: "content clean", title: label + ": none" }, "No " + label.toLowerCase()) : null);
  const contentPills = (item) => [contentPill(item.content), levelPill("spice", "Spice", item.spice), levelPill("violence", "Violence", item.violence)];
  const NOTE_KINDS = [["quote", "Quote"], ["note", "Note"], ["thought", "Thought"], ["journal", "Journal entry"]];
  const HELP_EMAIL = "joseph4freedom@gmail.com";

  // ---------- economy ----------
  const REWARD = {
    book:    { coins: 5,  xp: 10,  label: "new book" },
    save:    { coins: 10, xp: 25,  label: "shelf saved" },
    month:   { coins: 30, xp: 50,  label: "first save this month" },
    badge:   { coins: 20, xp: 60,  label: "badge" },
    friend:  { coins: 15, xp: 30,  label: "new friend" },
    recRead: { coins: 15, xp: 30,  label: "read a recommendation" },
    visit:   { coins: 2,  xp: 5,   label: "daily visit" },
    cover:   { coins: 3,  xp: 5,   label: "cover added" },
    checkin: { coins: 8,  xp: 20,  label: "read today" },
    progress:{ coins: 2,  xp: 5,   label: "progress update" },
    finish:  { coins: 20, xp: 40,  label: "finished a book" },
    goalEasy:{ coins: 15, xp: 30,  label: "easy goal" },
    goalMed: { coins: 40, xp: 80,  label: "medium goal" },
    goalHard:{ coins: 100, xp: 200, label: "difficult goal" },
  };
  const levelOf = (xp) => Math.min(99, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
  const xpForLevel = (l) => 100 * (l - 1) * (l - 1);
  const LEVEL_TITLES = [[1,"Newcomer"],[2,"Apprentice"],[5,"Page Turner"],[10,"Bookish"],[15,"Well Read"],[20,"Scholar"],[25,"Sage"],[30,"Lorekeeper"],[40,"Grand Reader"],[50,"Legend"]];
  const levelTitle = (l) => LEVEL_TITLES.filter(t => l >= t[0]).pop()[1];

  // ---------- pets ----------
  const PETS = [
    { key: "owl",    name: "Owl",      stages: ["🥚","🐤","🦉","🦉"], cost: 0 },
    { key: "cat",    name: "Cat",      stages: ["🥚","🐱","🐈","🐈‍⬛"], cost: 100 },
    { key: "dragon", name: "Dragon",   stages: ["🥚","🦎","🐲","🐉"], cost: 250 },
    { key: "fox",    name: "Fox",      stages: ["🥚","🦊","🦊","🦊"], cost: 100 },
    { key: "turtle", name: "Turtle",   stages: ["🥚","🐢","🐢","🐢"], cost: 100 },
    { key: "worm",   name: "Bookworm", stages: ["🥚","🐛","🦋","🦋"], cost: 0 },
    { key: "phoenix", name: "Phoenix", stages: ["🥚","🐣","🦅","🐦‍🔥"], cost: 0, needBooks: 100 },
  ];
  const booksRead = (p) => (p.reading_log || []).length;
  const PET_FEED_COST = 10, PET_FEED_XP = 25;
  const petLevelOf = (xp) => Math.min(50, Math.floor(Math.sqrt(Math.max(0, xp) / 30)) + 1);
  const petXpFor = (l) => 30 * (l - 1) * (l - 1);
  const petStage = (level) => level < 3 ? 0 : level < 10 ? 1 : level < 25 ? 2 : 3;
  const PET_STAGE_NAMES = ["Egg", "Hatchling", "Companion", "Legend"];
  const PET_MAX_LEVEL = 50;
  const petIsLegend = (pet) => !!pet && petStage(petLevelOf(pet.xp || 0)) === 3;
  const myPets = () => (me.pets = me.pets || []);
  const setActivePet = (id) => { const p = myPets().find(x => x.id === id) || null; me.pet = p ? { ...p } : null; };
  const petEmoji = (pet) => { const d = PETS.find(p => p.key === pet?.type); return d ? d.stages[petStage(petLevelOf(pet.xp || 0))] : ""; };

  // ---------- banners (the thing that changes with badges/coins) ----------
  const BANNERS = [
    { key: "plain",   name: "Plain",        need: 0,  cost: 0,   color: "#2E6E4E", css: "linear-gradient(135deg,#2E6E4E,#3F8A66)" },
    { key: "dusk",    name: "Dusk",         need: 2,  cost: 0,   color: "#6B4C8A", css: "linear-gradient(135deg,#3B2A52,#6B4C8A 60%,#B3556A)" },
    { key: "library", name: "Old Library",  need: 4,  cost: 0,   color: "#7A4B2A", css: "repeating-linear-gradient(90deg,#5B3A22 0 18px,#7A4B2A 18px 30px,#9B6B3F 30px 36px,#4A2E1A 36px 52px)" },
    { key: "forest",  name: "Forest",       need: 0,  cost: 50,  color: "#1F4D3A", css: "linear-gradient(160deg,#0F2E22,#1F4D3A 50%,#3E7A5A)" },
    { key: "ocean",   name: "Ocean",        need: 0,  cost: 80,  color: "#2A6F8F", css: "linear-gradient(135deg,#123B52,#2A6F8F 55%,#7FC0DD)" },
    { key: "gold",    name: "Gold Leaf",    need: 8,  cost: 0,   color: "#B8891B", css: "linear-gradient(135deg,#8A6412,#D4A93A 45%,#F1D17A 55%,#B8891B)" },
    { key: "stars",   name: "Night Sky",    need: 0,  cost: 150, color: "#1B2340", css: "radial-gradient(circle at 20% 30%,#fff 0 1px,transparent 2px),radial-gradient(circle at 70% 60%,#fff 0 1px,transparent 2px),radial-gradient(circle at 45% 80%,#fff 0 1px,transparent 2px),radial-gradient(circle at 85% 20%,#fff 0 1.5px,transparent 2.5px),linear-gradient(135deg,#0E1230,#1B2340 60%,#2A3A6B)" },
    { key: "roses",   name: "Rose Garden",  need: 12, cost: 0,   color: "#B3556A", css: "radial-gradient(circle at 15% 40%,#E08A9C 0 10px,transparent 11px),radial-gradient(circle at 60% 70%,#E08A9C 0 8px,transparent 9px),radial-gradient(circle at 85% 30%,#E08A9C 0 12px,transparent 13px),linear-gradient(135deg,#7A2E40,#B3556A)" },
    { key: "ink",     name: "Ink & Paper",  need: 0,  cost: 200, color: "#1C2320", css: "repeating-linear-gradient(0deg,#1C2320 0 14px,#2A3330 14px 16px)" },
    { key: "aurora",  name: "Aurora",       need: 20, cost: 0,   color: "#3E9A8C", css: "linear-gradient(120deg,#0B2540,#1E6E6E 35%,#63B58F 55%,#B99AD6 80%,#0B2540)" },
    { key: "sunrise", name: "Sunrise",      need: 0,  cost: 300, color: "#D9793A", css: "linear-gradient(180deg,#F1C27D,#D9793A 55%,#7A3E5A)" },
    { key: "royal",   name: "Royal",        need: 40, cost: 0,   color: "#5A2D82", css: "repeating-linear-gradient(45deg,#3B1E5A 0 10px,#5A2D82 10px 20px),linear-gradient(#5A2D82,#5A2D82)" },
  ];
  // ---------- avatar frames (earned by character level; ring around the picture, separate from the banner) ----------
  const FRAMES = [
    { key: "none",      name: "No frame",        level: 1,  desc: "Plain and simple." },
    { key: "line",      name: "Thin Line",       level: 2,  desc: "A single clean ring in your accent color." },
    { key: "bronze",    name: "Bronze Ring",     level: 3,  desc: "Warm hammered bronze. Your first metal." },
    { key: "silver",    name: "Silver Ring",     level: 5,  desc: "Brushed silver with a soft inner highlight." },
    { key: "gold",      name: "Gold Ring",       level: 7,  desc: "Polished gold that catches the light." },
    { key: "ember",     name: "Ember",           level: 10, desc: "Smoldering orange and red with a faint glow." },
    { key: "sapphire",  name: "Sapphire",        level: 12, desc: "Deep blue stone with a bright facet." },
    { key: "emerald",   name: "Emerald",         level: 15, desc: "Two green rings, one bright and one dark." },
    { key: "amethyst",  name: "Amethyst",        level: 18, desc: "Purple crystal with a slow breathing glow." },
    { key: "rosegold",  name: "Rose Gold",       level: 20, desc: "Pink-gold with a pearl inner edge." },
    { key: "laurel",    name: "Ivory Laurel",    level: 22, desc: "A dotted ivory wreath, like a book prize." },
    { key: "midnight",  name: "Midnight",        level: 25, desc: "Ink-dark ring scattered with tiny stars." },
    { key: "dragon",    name: "Dragonfire",      level: 30, desc: "Red and gold flames licking the edge." },
    { key: "platinum",  name: "Platinum",        level: 32, desc: "Cool white metal, heavy and rare." },
    { key: "ocean",     name: "Ocean Glass",     level: 35, desc: "Sea-glass teal with a wave of light." },
    { key: "sunburst",  name: "Sunburst",        level: 38, desc: "Rays of gold shooting out in every direction." },
    { key: "crown",     name: "Crimson Crown",   level: 40, desc: "Royal red with gold points around the rim." },
    { key: "frost",     name: "Frost",           level: 42, desc: "Pale ice with a crystalline shimmer." },
    { key: "obsidian",  name: "Obsidian",        level: 45, desc: "Black glass with a razor-thin gold edge." },
    { key: "prism",     name: "Prismatic",       level: 48, desc: "Every color at once, turning slowly." },
    { key: "celestial", name: "Celestial",       level: 50, desc: "Deep space, a ring of stars, and a bright halo." },
    { key: "mythic",    name: "Mythic",          level: 60, desc: "Violet fire and gold. Very few will ever see it." },
    { key: "eternal",   name: "Eternal",         level: 75, desc: "White gold light that never stops moving." },
  ];
  const frameOf = (p) => FRAMES.find(f => f.key === (p.frame || "none")) || FRAMES[0];

  // ---------- 200+ more banners, generated from themes (the 12 originals above stay exactly as they are) ----------
  const BANNER_THEMES = [
    { theme: "Classic", colors: ["#2E6E4E","#3F8A66","#1F4D3A","#B8891B","#6B4C8A","#B3556A","#2A6F8F","#1C2320","#7A4B2A","#D9793A","#5A2D82","#3E9A8C"],
      names: ["Bookcloth Red","Linen","Leather Spine","Marbled Endpaper","Gilt Edge","Foxed Pages","Vellum","Deckle Edge","Reading Lamp","First Edition","Slipcase","Bookplate","Ribbon Marker","Dust Jacket","Card Catalog","Reading Nook","Quill & Ink","Pressed Flower","Old Atlas","Almanac","Chapter One","Epilogue"] },
    { theme: "Forest", colors: ["#0F2E22","#1F4D3A","#3E7A5A","#6B8F3A","#A3B86C","#4A2E1A","#7A4B2A","#C9A96E","#2E4A2E","#8FB996","#5B3A22","#DDE8C6"],
      names: ["Pine Hollow","Mossbank","Fern Gully","Birch Grove","Old Oak","Redwood","Canopy","Undergrowth","Morning Dew","Mushroom Ring","Cedar Smoke","Wildflower Meadow","Willow Creek","Maple Turn","Acorn","Bramble","Fireflies","Foxglove","Mistwood","Timberline","Riverbend","Hollow Log"] },
    { theme: "Elements", colors: ["#C2410C","#F59E0B","#DC2626","#0E7490","#67E8F9","#1E3A8A","#78716C","#44403C","#E7E5E4","#84CC16","#F97316","#0EA5E9"],
      names: ["Ember Glow","Wildfire","Lava Flow","Tidepool","Deep Current","Rainfall","Granite","Slate","Sandstone","Gale","Thunderhead","Lightning Strike","Frostbite","Glacier","Hot Spring","Volcanic Glass","Riptide","Sirocco","Monsoon","Bedrock","Cinder","Whirlpool"] },
    { theme: "Magic", colors: ["#4C1D95","#7C3AED","#A78BFA","#F1D17A","#1E1B4B","#D946EF","#0F172A","#FDE68A","#312E81","#C084FC","#831843","#22D3EE"],
      names: ["Arcane Tome","Rune Circle","Moon Ritual","Crystal Ball","Enchanted Ink","Witch's Brew","Phoenix Feather","Dragon Scale","Fairy Ring","Sorcerer's Cloak","Spellbound","Wizard's Tower","Mana Well","Star Chart","Potion Shelf","Cursed Page","Unicorn Mane","Griffin Wing","Glowing Sigil","Portal","Midnight Coven","Elven Script"] },
    { theme: "Science", colors: ["#0EA5E9","#0369A1","#22C55E","#14532D","#F59E0B","#111827","#E5E7EB","#6366F1","#A855F7","#EF4444","#06B6D4","#F3F4F6"],
      names: ["Graph Paper","Petri Dish","Double Helix","Circuit Board","Periodic Table","Lab Bench","Bunsen Flame","Microscope","Blueprint","Orbital","Isotope","Beaker Green","Neuron","Telescope","Wavelength","Vector Field","Fossil Bed","Magnet","Prism Split","Binary","Quantum Foam","Radar"] },
    { theme: "Sky & Space", colors: ["#0B1026","#1B2340","#2A3A6B","#F1C27D","#7FC0DD","#F5F5F5","#5B21B6","#0E7490","#FB7185","#FDE68A","#1E293B","#38BDF8"],
      names: ["Nebula","Comet Tail","Milky Way","Lunar Sea","Solar Flare","Twilight","Dawn Chorus","Cirrus","Thunder Sky","Saturn Rings","Eclipse","Northern Star","Meteor Shower","Blue Hour","Golden Hour","Stratosphere","Orion's Belt","Red Planet","Ice Moon","Supernova","Zenith","Horizon Line"] },
    { theme: "Seasons", colors: ["#F97316","#B45309","#7C2D12","#FDE68A","#84CC16","#FB7185","#E0F2FE","#0EA5E9","#FFFFFF","#65A30D","#F5D0FE","#9A3412"],
      names: ["Harvest","Pumpkin Patch","First Frost","Snow Day","Cherry Blossom","Spring Rain","Summer Porch","Fireworks","Lemonade","Autumn Walk","Cider Press","Winter Cabin","Tulip Field","Sunflower","Hayride","Icicle","Candlelight","Beach Day","Maple Syrup","Cocoa","Sprout","Golden Leaf"] },
    { theme: "Cozy", colors: ["#7A4B2A","#C9A96E","#F3E9D2","#8B5E3C","#5B3A22","#B3556A","#D4A373","#A98467","#6C584C","#F0EAD2","#DDA15E","#BC6C25"],
      names: ["Fireside","Wool Blanket","Tea Steam","Rainy Window","Quilt","Rocking Chair","Bread Crust","Cinnamon","Cabin Lamp","Sunday Morning","Knit Sweater","Warm Toast","Porch Swing","Old Radio","Coffee Ring","Patchwork","Candle Wax","Slippers","Woodstove","Bookshop Bell","Honey Jar","Attic Light"] },
    { theme: "Ocean", colors: ["#0B2540","#123B52","#2A6F8F","#7FC0DD","#CFFAFE","#0E7490","#F5E6C8","#2DD4BF","#14B8A6","#164E63","#A5F3FC","#FDE68A"],
      names: ["Kelp Forest","Coral Reef","Lighthouse","Sea Foam","Driftwood","Tide Chart","Abyss","Pearl","Shipwreck","Sailcloth","Harbor Light","Whale Song","Salt Air","Marina","Blue Lagoon","Nautilus","Moonlit Bay","Undertow","Sandbar","Mermaid Scale","Storm Surge","Anchor"] },
    { theme: "Metals & Gems", colors: ["#8A6412","#F1D17A","#C0C4CC","#E2E8F0","#B87333","#1E3A8A","#93C5FD","#065F46","#34D399","#7F1D1D","#F87171","#4C1D95"],
      names: ["Brass","Copper Patina","Pewter","Chrome","Ruby","Sapphire Cut","Emerald Cut","Onyx","Opal","Garnet","Topaz","Jade","Amber Resin","Moonstone","Tiger's Eye","Silver Leaf","Rose Quartz","Lapis","Turquoise","Black Pearl","Diamond Dust","Bronze Age"] },
  ];
  function bannerCss(style, c) {
    const [a, b, d, e] = c;
    switch (style % 8) {
      case 0: return `linear-gradient(135deg,${a},${b} 60%,${d})`;
      case 1: return `linear-gradient(160deg,${a},${b} 50%,${d})`;
      case 2: return `repeating-linear-gradient(90deg,${a} 0 18px,${b} 18px 30px,${d} 30px 36px,${e} 36px 52px)`;
      case 3: return `radial-gradient(circle at 20% 30%,${e} 0 2px,transparent 3px),radial-gradient(circle at 70% 60%,${e} 0 2px,transparent 3px),radial-gradient(circle at 45% 80%,${e} 0 1.5px,transparent 2.5px),radial-gradient(circle at 85% 20%,${e} 0 2px,transparent 3px),linear-gradient(135deg,${a},${b})`;
      case 4: return `repeating-linear-gradient(45deg,${a} 0 10px,${b} 10px 20px),linear-gradient(${b},${b})`;
      case 5: return `radial-gradient(circle at 15% 40%,${d} 0 10px,transparent 11px),radial-gradient(circle at 60% 70%,${d} 0 8px,transparent 9px),radial-gradient(circle at 85% 30%,${d} 0 12px,transparent 13px),linear-gradient(135deg,${a},${b})`;
      case 6: return `repeating-linear-gradient(0deg,${a} 0 14px,${b} 14px 16px)`;
      default: return `linear-gradient(120deg,${a},${b} 35%,${d} 55%,${e} 80%,${a})`;
    }
  }
  (function buildBanners() {
    let n = 0;
    for (const t of BANNER_THEMES) {
      t.names.forEach((name, i) => {
        n++; const c = [t.colors[(i * 5) % 12], t.colors[(i * 7 + 3) % 12], t.colors[(i * 3 + 6) % 12], t.colors[(i * 11 + 9) % 12]];
        // every third one is earned with badges (1 up to 150); the rest are bought, mostly for a reasonable price, a few very expensive
        let need = 0, cost = 0;
        if (n % 3 === 0) need = Math.min(150, 1 + Math.round(((n / 3) % 40) * 3.9));
        else if (n % 11 === 0) cost = 1000 + (n % 4) * 500;
        else cost = 40 + (n % 9) * 30;
        BANNERS.push({ key: (t.theme + "-" + name).toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, theme: t.theme, need, cost, color: c[0], css: bannerCss(i, c) });
      });
    }
  })();
  const bannerThemeOf = (b) => b.theme || "Classic";
  const ACCENTS = [
    { key: "green", name: "Bookcloth green", hex: "#2E6E4E", need: 0 },
    { key: "rose",  name: "Rose",            hex: "#B3556A", need: 1 },
    { key: "gold",  name: "Gold leaf",       hex: "#B8891B", need: 2 },
    { key: "plum",  name: "Plum",            hex: "#6B4C8A", need: 3 },
    { key: "ocean", name: "Ocean",           hex: "#2A6F8F", need: 5 },
    { key: "ink",   name: "Ink",             hex: "#1C2320", need: 7 },
  ];
  const AVATAR_SETS = [
    { set: "Letters",   need: 0, items: null },
    { set: "Readers",   need: 3, items: ["📖", "🧙", "🔍", "🚀", "🐉", "🌙"] },
    { set: "Creatures", need: 5, items: ["🦉", "🦊", "🐢", "🐈", "🦋", "🐝"] },
    { set: "Rare",      need: 7, items: ["👑", "🗝️", "🕯️", "🧭", "⚔️", "🎩"] },
  ];

  // ---------- badges (200+) ----------
  const BADGES = [];
  function tierBadges(prefix, icon, names, thresholds, metric, howFn) {
    thresholds.forEach((n, i) => BADGES.push({ key: `${prefix}_${n}`, name: names[i], icon, metric, need: n, how: howFn(n) }));
  }
  tierBadges("books", "📚", ["First Shelf","Five Alive","Ten Titles","Quarter Century","Fifty Favorites","Century Shelf","Book Hoarder","Two Hundred Tales"], [1,5,10,25,50,100,150,200], "books", n => `Have ${n} book${n>1?"s":""} on your shelves.`);
  tierBadges("friends", "🤝", ["Bookworm Buddy","Trio","Book Club","Reading Circle","Library Card"], [1,3,5,10,20], "friends", n => `Have ${n} friend${n>1?"s":""}.`);
  tierBadges("streak", "🔥", ["Back Again","Three Months Running","Half-Year Habit","Year of Reading","Two-Year Streak"], [2,3,6,12,24], "streak", n => `Save your shelf ${n} months in a row.`);
  tierBadges("recs", "💬", ["First Rec","Recommender","Trusted Taste","Book Whisperer","Critic"], [1,3,5,10,25], "recsGiven", n => `Recommend ${n} book${n>1?"s":""} to other readers.`);
  tierBadges("read", "✅", ["Took a Rec","Open Minded","Good Listener","Rec Machine","Read Them All"], [1,3,5,10,25], "recsRead", n => `Read ${n} friend recommendation${n>1?"s":""}.`);
  tierBadges("custom", "🏷️", ["Curator","Organizer","Archivist","Master Cataloger"], [1,3,5,10], "custom", n => `Create ${n} categor${n>1?"ies":"y"} of your own.`);
  tierBadges("full", "🏆", ["Full Shelf","Triple Stack","Five Full","Wall of Books"], [1,3,5,10], "full", n => `Fill ${n} categor${n>1?"ies":"y"} with all 10 books.`);
  tierBadges("series", "📖", ["Series Starter","Binge Reader","Saga Fan","Epic Collector"], [1,5,10,25], "series", n => `Mark ${n} entr${n>1?"ies":"y"} as a series.`);
  tierBadges("covers", "🖼️", ["Cover Story","Gallery","Picture Perfect","Art Shelf","Illustrated"], [1,5,10,25,50], "covers", n => `Add ${n} book cover picture${n>1?"s":""}.`);
  tierBadges("excited", "✨", ["Can't Wait","Hype Train","Always Excited"], [1,5,10], "excited", n => `Mark ${n} book${n>1?"s":""} you're most excited about (one per category).`);
  tierBadges("level", "⭐", ["Apprentice","Page Turner","Bookish","Well Read","Scholar","Sage","Lorekeeper","Grand Reader","Legend"], [2,5,10,15,20,25,30,40,50], "level", n => `Reach level ${n}.`);
  tierBadges("pet", "🐾", ["Hatched","Growing Up","Best Friend","Loyal Companion","Grown","Legendary Pet","Mythic Pet"], [2,5,10,15,20,30,50], "petLevel", n => `Raise your pet to level ${n}.`);
  tierBadges("coins", "🪙", ["Pocket Change","Piggy Bank","Treasure","Vault","Dragon's Hoard"], [100,500,1000,5000,10000], "coinsEarned", n => `Earn ${n.toLocaleString()} coins in total.`);
  tierBadges("visits", "📅", ["Regular","Weekly Reader","Monthly Regular","Hundred Days","Year Round"], [3,7,30,100,365], "visits", n => `Open Shelfmates on ${n} different days.`);
  tierBadges("vstreak", "🌅", ["Three in a Row","Week Streak","Fortnight","Month Straight"], [3,7,14,30], "visitStreak", n => `Visit ${n} days in a row.`);
  tierBadges("fresh", "🗓️", ["Fresh Shelf","Early Bird","On Time","Clockwork"], [1,3,6,12], "freshMonths", n => `Save your shelf in the first week of ${n} month${n>1?"s":""}.`);
  tierBadges("finished", "📕", ["Finished One","Five Down","Ten Finished","Twenty-Five","Half a Hundred","Hundred Club","Two Hundred","Five Hundred","A Thousand"], [1,5,10,25,50,100,200,500,1000], "finished", n => `Log ${n} finished book${n>1?"s":""} in My Books.`);
  tierBadges("notes", "✍️", ["First Note","Note Taker","Scribbler","Commonplace Book","Marginalia Master"], [1,5,25,100,250], "notes", n => `Write ${n} quote${n>1?"s":""}, note${n>1?"s":""} or journal entr${n>1?"ies":"y"}.`);
  tierBadges("quotes", "❝", ["Quotable","Collector of Lines","Anthology"], [1,10,50], "quotes", n => `Save ${n} quote${n>1?"s":""}.`);
  tierBadges("goals", "🎯", ["Goal Setter","Follow Through","Habit Builder","Unstoppable"], [1,5,15,40], "goalsDone", n => `Finish ${n} goal${n>1?"s":""} you set for yourself.`);
  tierBadges("hard", "🧗", ["Hard Mode","Mountain Climber"], [1,5], "hardGoals", n => `Finish ${n} goal${n>1?"s":""} you marked difficult.`);
  tierBadges("bookmarks", "📑", ["First Bookmark","Bookmark Drawer","Bookmark Collector","Full Set"], [1,10,25,42], "bookmarks", n => `Collect ${n} bookmark${n>1?"s":""}.`);
  tierBadges("tbr", "🔖", ["Next Up","Stacked","Tower of Books"], [1,5,15], "tbr", n => `Keep ${n} book${n>1?"s":""} on your To Be Read list.`);
  tierBadges("checkin", "☀️", ["Read Today","Reading Week","Thirty Days","Hundred Days of Reading","A Year of Pages"], [1,7,30,100,365], "checkins", n => `Check in "I read today" on ${n} day${n>1?"s":""}.`);
  tierBadges("rstreak", "🔥", ["Three Days Straight","Seven Straight","Thirty Straight"], [3,7,30], "readStreak", n => `Read ${n} days in a row.`);
  BADGES.push({ key: "phoenix_owner", name: "Rise Again", icon: "🐦‍🔥", metric: "phoenix", need: 1, how: "Adopt the Phoenix after reading 100 books." });
  BADGES.push({ key: "photo", name: "Say Cheese", icon: "📷", metric: "photo", need: 1, how: "Add a profile picture." });
  BADGES.push({ key: "banner", name: "New Look", icon: "🎏", metric: "banner", need: 1, how: "Change your banner." });
  BADGES.push({ key: "adopted", name: "Adopted", icon: "🐣", metric: "pet", need: 1, how: "Adopt a pet." });
  BADGES.push({ key: "tagline", name: "Has a Tagline", icon: "✍️", metric: "tagline", need: 1, how: "Write a tagline on your profile." });
  // one unique badge for every month, Sept 2026 through Dec 2036
  for (let y = 2026; y <= 2036; y++) for (let m = 1; m <= 12; m++) {
    if (y === 2026 && m < 9) continue;
    const mk = `${y}-${String(m).padStart(2, "0")}`;
    BADGES.push({ key: `month_${mk}`, name: `${MONTH_NAMES[m - 1]} ${y}`, icon: MONTH_ICONS[m - 1], metric: "month", month: mk, need: 1, how: `Save your shelf during ${MONTH_NAMES[m - 1]} ${y}.`, monthly: true });
  }
  const BADGE_BY_KEY = Object.fromEntries(BADGES.map(b => [b.key, b]));

  // ---------- goals & bookmarks ----------
  const GOAL_LEVELS = { easy: { name: "Easy", reward: "goalEasy" }, medium: { name: "Medium", reward: "goalMed" }, hard: { name: "Difficult", reward: "goalHard" } };
  // Each bookmark: key, name, tier, css background, tassel color, charm, optional glow color (difficult), plus a hint for the book of bookmarks.
  const BOOKMARKS = [
    // easy — 16
    { key: "linen",    name: "Linen Stripe",  tier: "easy", css: "repeating-linear-gradient(90deg,#F3E9D2 0 6px,#E4D3B0 6px 8px)", tassel: "#B8891B", charm: "" },
    { key: "meadow",   name: "Meadow Dots",   tier: "easy", css: "radial-gradient(circle at 30% 20%,#fff 0 2px,transparent 3px),radial-gradient(circle at 70% 60%,#fff 0 2px,transparent 3px),radial-gradient(circle at 40% 85%,#fff 0 2px,transparent 3px),#7FB77E", tassel: "#3E7A5A", charm: "🌼" },
    { key: "plane",    name: "Paper Plane",   tier: "easy", css: "linear-gradient(180deg,#DCEBFA,#B5D4F4)", tassel: "#378ADD", charm: "✈️" },
    { key: "sunny",    name: "Sunny Side",    tier: "easy", css: "linear-gradient(180deg,#FDE68A,#F59E0B)", tassel: "#B45309", charm: "☀️" },
    { key: "ticket",   name: "Blue Ticket",   tier: "easy", css: "repeating-linear-gradient(0deg,#2A6F8F 0 10px,#3E86A8 10px 20px)", tassel: "#F1D17A", charm: "🎟️" },
    { key: "mint",     name: "Mint Chevron",  tier: "easy", css: "repeating-linear-gradient(135deg,#9FE1CB 0 8px,#E1F5EE 8px 16px)", tassel: "#0F6E56", charm: "" },
    { key: "peach",    name: "Peach Wave",    tier: "easy", css: "radial-gradient(circle at 50% 0,#F5C4B3 0 18px,transparent 19px),radial-gradient(circle at 50% 40px,#F5C4B3 0 18px,transparent 19px),radial-gradient(circle at 50% 80px,#F5C4B3 0 18px,transparent 19px),#FAECE7", tassel: "#D85A30", charm: "🍑" },
    { key: "libcard",  name: "Library Card",  tier: "easy", css: "repeating-linear-gradient(0deg,#FFFDF7 0 12px,#D3D1C7 12px 13px)", tassel: "#888780", charm: "📇" },
    { key: "polka",    name: "Polka",         tier: "easy", css: "radial-gradient(circle,#fff 0 3px,transparent 4px) 0 0/14px 14px,#D4537E", tassel: "#993556", charm: "" },
    { key: "sky",      name: "Sky Ribbon",    tier: "easy", css: "linear-gradient(180deg,#85B7EB,#E6F1FB)", tassel: "#185FA5", charm: "☁️" },
    { key: "leaf",     name: "Autumn Leaf",   tier: "easy", css: "linear-gradient(180deg,#F59E0B,#B45309 60%,#7C2D12)", tassel: "#7C2D12", charm: "🍂" },
    { key: "seafoam",  name: "Seafoam",       tier: "easy", css: "linear-gradient(180deg,#CFFAFE,#5DCAA5)", tassel: "#0F6E56", charm: "🐚" },
    { key: "gingham",  name: "Gingham",       tier: "easy", css: "repeating-linear-gradient(0deg,rgba(216,90,48,.35) 0 8px,transparent 8px 16px),repeating-linear-gradient(90deg,rgba(216,90,48,.35) 0 8px,transparent 8px 16px),#FFF8F4", tassel: "#D85A30", charm: "" },
    { key: "lemonade", name: "Lemonade",      tier: "easy", css: "repeating-linear-gradient(0deg,#FDE68A 0 14px,#FFFFFF 14px 28px)", tassel: "#EF9F27", charm: "🍋" },
    { key: "gridpaper",name: "Grid Paper",    tier: "easy", css: "repeating-linear-gradient(0deg,#B5D4F4 0 1px,transparent 1px 10px),repeating-linear-gradient(90deg,#B5D4F4 0 1px,transparent 1px 10px),#fff", tassel: "#378ADD", charm: "✏️" },
    { key: "cocoa",    name: "Cocoa",         tier: "easy", css: "linear-gradient(180deg,#8B5E3C,#5B3A22)", tassel: "#F3E9D2", charm: "☕" },
    // medium — 12
    { key: "inkgold",  name: "Ink & Gold",    tier: "medium", css: "linear-gradient(180deg,#1C2320 0 70%,#B8891B 70% 74%,#1C2320 74% 86%,#B8891B 86% 90%,#1C2320 90%)", tassel: "#F1D17A", charm: "🖋️" },
    { key: "nightstr", name: "Night Stripe",  tier: "medium", css: "repeating-linear-gradient(45deg,#1B2340 0 10px,#2A3A6B 10px 20px)", tassel: "#7FC0DD", charm: "🌙" },
    { key: "fern",     name: "Fern Frond",    tier: "medium", css: "repeating-linear-gradient(-45deg,#1F4D3A 0 6px,#3E7A5A 6px 8px,#1F4D3A 8px 14px)", tassel: "#A3B86C", charm: "🌿" },
    { key: "maplines", name: "Map Lines",     tier: "medium", css: "repeating-radial-gradient(circle at 30% 30%,#C9A96E 0 2px,#F3E9D2 2px 12px)", tassel: "#7A4B2A", charm: "🧭" },
    { key: "rosevine", name: "Rose Vine",     tier: "medium", css: "radial-gradient(circle at 25% 20%,#E08A9C 0 5px,transparent 6px),radial-gradient(circle at 70% 50%,#E08A9C 0 5px,transparent 6px),radial-gradient(circle at 35% 80%,#E08A9C 0 5px,transparent 6px),linear-gradient(180deg,#4A1B28,#7A2E40)", tassel: "#E08A9C", charm: "🌹" },
    { key: "copper",   name: "Copper Chevron",tier: "medium", css: "repeating-linear-gradient(135deg,#B87333 0 8px,#D69A5A 8px 12px,#7A4A1F 12px 20px)", tassel: "#F3D9B8", charm: "" },
    { key: "deepsea",  name: "Deep Sea",      tier: "medium", css: "linear-gradient(180deg,#0B2540,#123B52 50%,#2A6F8F)", tassel: "#A5F3FC", charm: "🐋" },
    { key: "amberw",   name: "Amber Waves",   tier: "medium", css: "repeating-radial-gradient(circle at 50% 120%,#D4A93A 0 8px,#8A6412 8px 16px)", tassel: "#FFE9A8", charm: "🌾" },
    { key: "plumdam",  name: "Plum Damask",   tier: "medium", css: "radial-gradient(circle at 50% 50%,#B99AD6 0 4px,transparent 5px) 0 0/18px 18px,#4C1D95", tassel: "#F1D17A", charm: "" },
    { key: "plaid",    name: "Forest Plaid",  tier: "medium", css: "repeating-linear-gradient(0deg,rgba(0,0,0,.25) 0 6px,transparent 6px 18px),repeating-linear-gradient(90deg,rgba(0,0,0,.25) 0 6px,transparent 6px 18px),#2E6E4E", tassel: "#F1D17A", charm: "🦌" },
    { key: "lantern",  name: "Lantern",       tier: "medium", css: "radial-gradient(circle at 50% 30%,#FDE68A 0 12px,#F59E0B 13px 20px,#7C2D12 21px)", tassel: "#F59E0B", charm: "🏮" },
    { key: "marble",   name: "Marble",        tier: "medium", css: "linear-gradient(120deg,#F8FAFC 0 30%,#CBD5E1 32% 34%,#F8FAFC 36% 60%,#94A3B8 62% 63%,#F8FAFC 65%)", tassel: "#64748B", charm: "🏛️" },
    // difficult — 10, all glow
    { key: "gilded",   name: "Gilded Edge",   tier: "hard", css: "linear-gradient(90deg,#F1D17A 0 4px,#1C2320 4px calc(100% - 4px),#F1D17A calc(100% - 4px))", tassel: "#F1D17A", charm: "👑", glow: "#F1D17A" },
    { key: "dscale",   name: "Dragon Scale",  tier: "hard", css: "radial-gradient(circle at 50% 0,#DC2626 0 7px,transparent 8px) 0 0/16px 12px,radial-gradient(circle at 0 0,#7F1D1D 0 7px,transparent 8px) 8px 6px/16px 12px,#991B1B", tassel: "#F59E0B", charm: "🐉", glow: "#F97316" },
    { key: "auroram",  name: "Aurora Ribbon", tier: "hard", css: "linear-gradient(180deg,#0B2540,#1E6E6E 35%,#63B58F 55%,#B99AD6 80%,#0B2540)", tassel: "#63B58F", charm: "✨", glow: "#63B58F" },
    { key: "starfall", name: "Starfall",      tier: "hard", css: "radial-gradient(circle at 20% 15%,#fff 0 1.5px,transparent 2.5px),radial-gradient(circle at 70% 35%,#fff 0 1.5px,transparent 2.5px),radial-gradient(circle at 40% 60%,#fff 0 1px,transparent 2px),radial-gradient(circle at 80% 85%,#fff 0 1.5px,transparent 2.5px),linear-gradient(180deg,#0E1230,#2A3A6B)", tassel: "#fff", charm: "🌠", glow: "#93C5FD" },
    { key: "emberg",   name: "Ember Glow",    tier: "hard", css: "linear-gradient(180deg,#F59E0B,#DC2626 60%,#450A0A)", tassel: "#F59E0B", charm: "🔥", glow: "#F97316" },
    { key: "frostc",   name: "Frost Crystal", tier: "hard", css: "repeating-linear-gradient(60deg,#DBEAFE 0 6px,#fff 6px 12px),repeating-linear-gradient(-60deg,rgba(191,219,254,.6) 0 6px,transparent 6px 12px)", tassel: "#93C5FD", charm: "❄️", glow: "#BFDBFE" },
    { key: "velvet",   name: "Royal Velvet",  tier: "hard", css: "linear-gradient(90deg,#3B1E5A,#5A2D82 50%,#3B1E5A)", tassel: "#F1D17A", charm: "👑", glow: "#B99AD6" },
    { key: "phfeather",name: "Phoenix Feather",tier: "hard", css: "linear-gradient(180deg,#FDE68A,#F97316 40%,#DC2626 70%,#7F1D1D)", tassel: "#FDE68A", charm: "🐦‍🔥", glow: "#FDE68A" },
    { key: "nebula",   name: "Nebula",        tier: "hard", css: "radial-gradient(circle at 30% 30%,#D946EF 0 10px,transparent 30px),radial-gradient(circle at 70% 70%,#22D3EE 0 10px,transparent 30px),linear-gradient(180deg,#1E1B4B,#0F172A)", tassel: "#22D3EE", charm: "🪐", glow: "#D946EF" },
    { key: "obsgold",  name: "Obsidian Gold", tier: "hard", css: "repeating-linear-gradient(0deg,#050505 0 16px,#F1D17A 16px 17px)", tassel: "#F1D17A", charm: "💎", glow: "#F1D17A" },
    // legendary — earned by patterns of goals, not picked
    { key: "threemoons", name: "Three Moons",     tier: "legend", css: "radial-gradient(circle at 50% 18%,#FDE68A 0 7px,transparent 8px),radial-gradient(circle at 50% 50%,#FDE68A 0 7px,transparent 8px),radial-gradient(circle at 50% 82%,#FDE68A 0 7px,transparent 8px),linear-gradient(180deg,#0B1026,#1B2340)", tassel: "#FDE68A", charm: "🌙", glow: "#FDE68A", how: "Finish a difficult goal in three different months." },
    { key: "marathon",   name: "Marathon",        tier: "legend", css: "repeating-linear-gradient(0deg,#B3556A 0 8px,#F7E3E8 8px 10px,#2A6F8F 10px 18px,#F7E3E8 18px 20px)", tassel: "#F1D17A", charm: "🏅", glow: "#F1D17A", how: "Finish 25 goals in total." },
    { key: "discipline", name: "Quiet Discipline",tier: "legend", css: "linear-gradient(180deg,#F3E9D2,#C9A96E)", tassel: "#5B3A22", charm: "🕯️", glow: "#F3E9D2", how: "Finish at least one goal in six different months." },
    { key: "mcrown",     name: "Mountain Crown",  tier: "legend", css: "linear-gradient(180deg,#E2E8F0 0 30%,#94A3B8 30% 55%,#1E293B 55%)", tassel: "#F1D17A", charm: "🏔️", glow: "#E2E8F0", how: "Finish ten difficult goals." },
  ];
  const BOOKMARK_BY = Object.fromEntries(BOOKMARKS.map(b => [b.key, b]));
  const TIER_NAMES = { easy: "Easy", medium: "Medium", hard: "Difficult", legend: "Legendary" };
  const myBookmarks = () => { const st = stats(me); return st.bookmarks || (st.bookmarks = []); };
  function bookmarkEl(def, size = "", extra = {}) {
    const b = el("div", { class: "bm " + size + (def.glow ? " glow" : "") + (extra.locked ? " locked" : ""), style: `--bmbg:${def.css};--tassel:${def.tassel};--glow:${def.glow || "transparent"}`, title: def.name },
      el("div", { class: "bm-body" }, def.charm ? el("span", { class: "bm-charm" }, def.charm) : null), el("div", { class: "bm-tassel" }));
    return b;
  }
  const bookmarkForTitle = (p, title) => { const t = (title || "").trim().toLowerCase(); const x = (p.tbr || []).find(b => b.reading && b.bookmark && (b.title || "").trim().toLowerCase() === t); return x && BOOKMARK_BY[x.bookmark] ? BOOKMARK_BY[x.bookmark] : null; };
  // If a book already has cover art somewhere on your shelves, lists, or the shared index, carry it over.
  function inheritCover(entry) {
    const t = (entry.title || "").trim().toLowerCase(); if (!t) return entry;
    const pools = [...allBooks(me), ...(me.recommendations || []), ...(me.tbr || []), ...(me.reading_log || [])];
    const hit = pools.find(x => x !== entry && (x.title || "").trim().toLowerCase() === t && x.cover) || (titleIndex || []).find(x => (x.title || "").toLowerCase() === t && x.cover);
    if (hit) { if (!entry.cover) entry.cover = hit.cover; if (!entry.author && hit.author) entry.author = hit.author; if (!entry.kind && hit.kind) entry.kind = hit.kind; }
    return entry;
  }
  const readingOf = (p, title) => { const t = (title || "").trim().toLowerCase(); return (p.tbr || []).find(b => b.reading && (b.title || "").trim().toLowerCase() === t) || null; };
  const readingPill = (p, item) => { const r = readingOf(p, item.title); return r ? el("span", { class: "reading-pill", title: "Reading now" }, "📖 " + (r.progress || 0) + "%") : null; };
  const coverWithBookmark = (p, item, editable, onChange) => { const bm = bookmarkForTitle(p, item.title); return bm ? el("span", { class: "cover-wrap" }, coverEl(item, editable, onChange), bookmarkEl(bm, "xs")) : coverEl(item, editable, onChange); };
  function goalMonths(goals, level) { return new Set(goals.filter(g => g.done && (!level || g.level === level)).map(g => (g.doneAt || "").slice(0, 7))); }
  // how many designs in a tier you may choose from right now
  function choicesFor(tier, goals) {
    const d = goals.filter(g => g.done); const easy = d.filter(g => g.level === "easy").length, med = d.filter(g => g.level === "medium").length, hard = d.filter(g => g.level === "hard").length;
    if (tier === "easy") return Math.min(16, 1 + easy + med);          // 2 choices on your first easy goal, one more per easy or medium after
    if (tier === "medium") return Math.min(12, 1 + med + hard);        // 2 on the first medium, one more per medium or difficult
    return Math.min(10, 1 + hard);                                     // 2 on the first difficult, one more per difficult
  }
  function legendUnlocks(goals) {
    const d = goals.filter(g => g.done); const out = [];
    if (goalMonths(goals, "hard").size >= 3) out.push("threemoons");
    if (d.length >= 25) out.push("marathon");
    if (goalMonths(goals).size >= 6) out.push("discipline");
    if (d.filter(g => g.level === "hard").length >= 10) out.push("mcrown");
    return out;
  }
  // pick-a-bookmark window after finishing a goal
  function pickBookmark(tier, onDone) {
    const goals = me.goals || []; const owned = new Set(myBookmarks());
    const pool = BOOKMARKS.filter(b => b.tier === tier); const n = choicesFor(tier, goals);
    const choices = pool.slice(0, n).filter(b => !owned.has(b.key));
    const overlay = el("div", { class: "crop-overlay" });
    if (!choices.length) { fill(overlay, el("div", { class: "crop-panel" }, el("h2", {}, "All " + TIER_NAMES[tier].toLowerCase() + " bookmarks collected"), el("p", { class: "muted" }, "Nothing new to pick this time. Keep going for the next tier and the legendary ones."), el("div", { class: "row", style: "justify-content:flex-end" }, el("button", { class: "btn primary", onclick: () => { overlay.remove(); onDone(null); } }, "Okay")))); document.body.append(overlay); return; }
    fill(overlay, el("div", { class: "crop-panel bm-pick" },
      el("div", { class: "eyebrow" }, TIER_NAMES[tier] + " goal finished"), el("h2", {}, "Pick a bookmark"),
      el("p", { class: "muted small" }, `You can choose from ${choices.length} right now. Finish more goals to unlock more designs to choose from.`),
      el("div", { class: "bm-choices" }, ...choices.map(b => el("button", { class: "bm-choice", onclick: async () => { myBookmarks().push(b.key); await saveProfile({ stats: me.stats }); overlay.remove(); toast(`🔖 ${b.name} added to your bookmarks`, "badge-toast"); onDone(b); } }, bookmarkEl(b, "md"), el("b", {}, b.name)))),
      el("p", { class: "muted small", style: "margin-top:6px" }, tier === "hard" ? "Difficult bookmarks glow." : "")));
    document.body.append(overlay);
  }
  // the little book you flip through
  function openBookmarkBook() {
    const owned = new Set(myBookmarks()); const goals = me.goals || [];
    const overlay = el("div", { class: "crop-overlay", onclick: (e) => { if (e.target === overlay) overlay.remove(); } });
    const book = el("div", { class: "bm-book", style: "--bookbg:" + bannerOf(me).css });
    const readingBooks = () => (me.tbr || []).filter(x => x.reading);
    function draw() {
      const section = (tier) => { const pool = BOOKMARKS.filter(b => b.tier === tier); const n = tier === "legend" ? pool.length : choicesFor(tier, goals); const have = pool.filter(b => owned.has(b.key)).length;
        return el("div", { class: "bm-section" }, el("div", { class: "bm-sec-head" }, el("span", { class: "bm-page-title" }, TIER_NAMES[tier]), el("span", { class: "bm-sec-count" }, `${have} / ${pool.length}`)),
          el("div", { class: "bm-sec-hint" }, tier === "easy" ? "Easy goals. Each easy or medium goal unlocks one more design to pick from." : tier === "medium" ? "Medium goals. Medium and difficult goals unlock more." : tier === "hard" ? "Difficult goals only. They glow." : "Never picked. Earned by patterns of goals over months."),
          el("div", { class: "bm-slots" }, ...pool.map((b, i) => slot(b, i < n)))); };
      fill(book, el("div", { class: "bm-page left" }, section("easy"), section("medium")), el("div", { class: "bm-page right" }, section("hard"), section("legend"),
        el("div", { class: "bm-legend" }, el("span", { class: "lg has" }, "yours"), el("span", { class: "lg open" }, "?  next pick"), el("span", { class: "lg far" }, "🔒 unlock later"), el("span", { class: "muted small" }, " · click one you own to put it in a book"))));
    }
    function slot(b, unlocked) {
      const has = owned.has(b.key);
      const sl = el("div", { class: "bm-slot" + (has ? " has" : unlocked ? " open" : " far"), title: has ? b.name + " · click to put it in a book" : b.how ? b.how : unlocked ? b.name + " · pick it after your next " + TIER_NAMES[b.tier].toLowerCase() + " goal" : "Finish more goals to unlock this design" },
        has ? bookmarkEl(b, "sm") : el("div", { class: "bm-ghost" }, unlocked ? "?" : "🔒"), el("small", {}, has ? b.name : b.how ? b.name : "?"));
      if (has) sl.addEventListener("click", () => useBookmark(b));
      return sl;
    }
    function useBookmark(b) {
      const rb = readingBooks(); if (!rb.length) { toast("Start reading a book on your list first, then set this bookmark in it."); return; }
      const menu = el("div", { class: "crop-panel", style: "max-width:420px" }, el("h2", {}, "Put " + b.name + " in…"), ...rb.map(x => el("button", { class: "btn", style: "display:flex;width:100%;margin-top:8px;justify-content:flex-start", onclick: async () => { x.bookmark = b.key; await saveProfile({ tbr: me.tbr }); m2.remove(); overlay.remove(); toast(`🔖 ${b.name} is in "${x.title}"`); if (typeof window.__redrawTbr === "function") window.__redrawTbr(); } }, x.title)), el("button", { class: "btn ghost", style: "margin-top:10px", onclick: () => m2.remove() }, "Cancel"));
      const m2 = el("div", { class: "crop-overlay", onclick: (e) => { if (e.target === m2) m2.remove(); } }, menu); document.body.append(m2);
    }
    fill(overlay, el("div", { class: "bm-book-wrap" }, el("div", { class: "bm-book-title", style: "background:" + bannerOf(me).css }, el("span", {}, (me.display_name || me.username) + "'s bookmarks"), el("span", { class: "small" }, `${myBookmarks().length} of ${BOOKMARKS.length}`)), book, el("button", { class: "icon-btn bm-close", onclick: () => overlay.remove() }, "✕"))); document.body.append(overlay); draw();
  }

  // ---------- state & helpers ----------
  let sb = null, session = null, me = null, friends = [], pendingIn = [], pendingOut = [], notices = [];
  let draft = null, dirty = false;
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, "");
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return n;
  };
  const fill = (node, ...kids) => { node.replaceChildren(...kids.flat().filter(k => k != null).map(k => k.nodeType ? k : document.createTextNode(String(k)))); return node; };
  const monthKey = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  const dayKey = (d = new Date()) => monthKey(d) + "-" + String(d.getDate()).padStart(2, "0");
  const monthName = (k) => { const [y, m] = k.split("-"); return MONTH_NAMES[+m - 1] + " " + y; };
  const ago = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago"; if (s < 86400 * 30) return Math.floor(s / 86400) + "d ago";
    return new Date(iso).toLocaleDateString();
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const allBooks = (p) => (p.categories || []).flatMap(c => c.books || []);
  const bookCount = (p) => allBooks(p).length;
  const badgeCount = (p) => (p.badges || []).length;
  const hasBadge = (p, k) => (p.badges || []).some(b => b.key === k);
  const stats = (p) => p.stats || (p.stats = {});

  const toastQ = [];
  function toast(msg, cls = "") {
    toastQ.push([msg, cls]); if (toast._busy) return; toast._busy = true;
    (function next() {
      const item = toastQ.shift(); const t = $("#toast");
      if (!item) { t.hidden = true; toast._busy = false; return; }
      t.textContent = item[0]; t.className = "toast " + item[1]; t.hidden = false;
      setTimeout(() => { t.hidden = true; setTimeout(next, 250); }, 2400);
    })();
  }
  function applyTheme() { document.documentElement.dataset.accent = me?.accent || "green"; }
  const bannerOf = (p) => BANNERS.find(b => b.key === (p.banner || "plain")) || BANNERS[0];
  const ownsBanner = (p, b) => b.need === 0 && b.cost === 0 || (b.need && badgeCount(p) >= b.need) || (stats(p).owned_banners || []).includes(b.key);

  // ---------- metrics & badges ----------
  function metrics(p, friendCount) {
    const cats = p.categories || [], recs = p.recommendations || [], months = [...new Set(p.months_updated || [])].sort();
    let streak = months.length ? 1 : 0;
    for (let i = months.length - 1; i > 0; i--) {
      const [y1, m1] = months[i].split("-").map(Number), [y0, m0] = months[i - 1].split("-").map(Number);
      if (y1 * 12 + m1 - (y0 * 12 + m0) === 1) streak++; else break;
    }
    const st = stats(p);
    return {
      books: bookCount(p), friends: friendCount, streak,
      recsGiven: recs.length, recsRead: (p.recs_read || []).length,
      custom: cats.filter(c => c.custom).length, full: cats.filter(c => (c.books || []).length >= MAX_PER_CATEGORY).length,
      series: allBooks(p).filter(b => b.kind === "series").length + recs.filter(r => r.kind === "series").length,
      covers: allBooks(p).filter(b => b.cover).length, excited: allBooks(p).filter(b => b.excited).length,
      level: levelOf(p.xp || 0), petLevel: Math.max(0, ...((p.pets && p.pets.length ? p.pets : (p.pet ? [p.pet] : [])).map(x => petLevelOf(x.xp || 0)))), coinsEarned: p.coins_earned || 0,
      visits: st.visits || 0, visitStreak: st.visit_streak || 0, freshMonths: (st.fresh_months || []).length,
      finished: booksRead(p), notes: st.notes_written || 0, quotes: st.quotes_written || 0,
      tbr: (p.tbr || []).length, checkins: st.checkins || 0, readStreak: st.read_streak_best || 0,
      goalsDone: (p.goals || []).filter(g => g.done).length, hardGoals: (p.goals || []).filter(g => g.done && g.level === "hard").length, bookmarks: (st.bookmarks || []).length,
      phoenix: (p.pets || []).some(x => x.type === "phoenix") ? 1 : 0,
      photo: p.photo_url ? 1 : 0, banner: p.banner && p.banner !== "plain" ? 1 : 0, pet: (p.pets && p.pets.length) || p.pet ? 1 : 0, tagline: p.tagline ? 1 : 0,
      months,
    };
  }
  function computeBadges(p, friendCount) {
    const have = clone(p.badges || []); const m = metrics(p, friendCount);
    for (const b of BADGES) {
      if (have.some(x => x.key === b.key)) continue;
      const ok = b.monthly ? m.months.includes(b.month) : (m[b.metric] || 0) >= b.need;
      if (ok) have.push({ key: b.key, at: new Date().toISOString() });
    }
    return have;
  }
  function progressOf(b, m) { return b.monthly ? (m.months.includes(b.month) ? 1 : 0) : Math.min(1, (m[b.metric] || 0) / b.need); }

  // ---------- rewards ----------
  function award(kind, times = 1) {
    const r = REWARD[kind]; if (!r || times <= 0) return;
    const before = levelOf(me.xp || 0);
    me.coins = (me.coins || 0) + r.coins * times; me.coins_earned = (me.coins_earned || 0) + r.coins * times; me.xp = (me.xp || 0) + r.xp * times;
    award._sum = award._sum || { coins: 0, xp: 0 }; award._sum.coins += r.coins * times; award._sum.xp += r.xp * times;
    const after = levelOf(me.xp);
    if (after > before) { toast(`⭐ Level ${after}: ${levelTitle(after)}`, "badge-toast"); const fr = FRAMES.filter(f => f.level > before && f.level <= after); for (const f of fr) toast(`🖼️ New frame unlocked: ${f.name}`, "badge-toast"); }
  }
  function flushAwardToast() { const s = award._sum; award._sum = null; if (s && (s.coins || s.xp)) toast(`+${s.coins} coins · +${s.xp} XP`); updateTopbar(); }

  // ---------- auth ----------
  async function signUp(username, password, displayName, agreed) {
    username = username.trim().toLowerCase();
    if (!agreed) throw new Error("Please check the box to agree to the terms.");
    if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error("Username: 3 to 20 letters, numbers, or underscores.");
    if (password.length < 6) throw new Error("Password needs at least 6 characters.");
    const { data, error } = await sb.auth.signUp({ email: username + EMAIL_DOMAIN, password });
    if (error) throw new Error(/already|registered/i.test(error.message) ? "That username is taken." : error.message);
    if (!data.session) throw new Error("Sign-up worked but no session came back. Ask Joseph to check the Supabase email setting.");
    session = data.session;
    const profile = { id: session.user.id, username, display_name: displayName.trim() || username, avatar: username[0].toUpperCase(),
      categories: DEFAULT_CATEGORIES.map(name => ({ name, custom: false, books: [] })), coins: 20, coins_earned: 20, xp: 0, stats: {}, agreed_terms_at: new Date().toISOString() };
    const { error: e2 } = await sb.from("profiles").insert(profile);
    if (e2) throw new Error(e2.message);
  }
  async function signIn(username, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email: username.trim().toLowerCase() + EMAIL_DOMAIN, password });
    if (error) throw new Error("Wrong username or password.");
    session = data.session;
  }
  async function signOut() { await sb.auth.signOut(); session = null; me = null; location.hash = "#/"; render(); }

  // ---------- data ----------
  const PROFILE_PUBLIC = "id,username,display_name,tagline,avatar,accent,photo_url,banner,frame,xp,pet,categories,recommendations,badges,reading_log,tbr,show_reading,updated_at";
  async function loadMe() {
    const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
    if (error) throw error;
    me = data; me.stats = me.stats || {}; draft = clone({ categories: me.categories, recommendations: me.recommendations }); dirty = false; applyTheme();
  }
  async function loadFriends() {
    const { data, error } = await sb.from("friendships").select(`*, r:profiles!friendships_requester_fkey(${PROFILE_PUBLIC}), a:profiles!friendships_addressee_fkey(${PROFILE_PUBLIC})`);
    if (error) throw error;
    friends = []; pendingIn = []; pendingOut = [];
    for (const f of data) {
      const other = f.requester === me.id ? f.a : f.r; if (!other) continue;
      if (f.status === "accepted") friends.push({ ...other, fid: f.id });
      else if (f.addressee === me.id) pendingIn.push({ ...other, fid: f.id });
      else pendingOut.push({ ...other, fid: f.id });
    }
    friends.sort((x, y) => new Date(y.updated_at) - new Date(x.updated_at));
  }
  async function loadNotices() {
    const { data } = await sb.from("notices").select("*, actor:profiles!notices_actor_id_fkey(username,display_name,avatar,photo_url)").eq("user_id", me.id).order("created_at", { ascending: false }).limit(40);
    notices = data || [];
    $("#bell-dot").hidden = !notices.some(n => !n.read);
  }
  async function notify(userIds, kind, detail) {
    if (!userIds.length) return;
    await sb.from("notices").insert(userIds.map(u => ({ user_id: u, actor_id: me.id, kind, detail })));
  }
  async function saveProfile(patch, { announce = false } = {}) {
    const before = clone(me);
    Object.assign(me, patch);
    // badges can unlock more badges (coins tier, level tier), so settle in a few passes
    let earned = [];
    for (let i = 0; i < 3; i++) {
      const fresh = computeBadges(me, friends.length);
      const newOnes = fresh.filter(b => !hasBadge(me, b.key));
      if (!newOnes.length) break;
      me.badges = fresh; earned.push(...newOnes); award("badge", newOnes.length);
    }
    me.updated_at = new Date().toISOString();
    const row = { ...patch, badges: me.badges, coins: me.coins, coins_earned: me.coins_earned, xp: me.xp, stats: me.stats, updated_at: me.updated_at };
    const { error } = await sb.from("profiles").update(row).eq("id", me.id);
    if (error) { Object.assign(me, before); throw error; }
    applyTheme();
    for (const b of earned) { const def = BADGE_BY_KEY[b.key]; if (def) toast(`${def.icon} Badge: ${def.name}`, "badge-toast"); }
    flushAwardToast();
    if (announce && friends.length) await notify(friends.map(f => f.id), "shelf", "updated their shelf");
    return earned;
  }
  async function checkBadges() { const fresh = computeBadges(me, friends.length); if (fresh.length !== (me.badges || []).length) await saveProfile({}); }

  async function saveShelf() {
    const mk = monthKey(), today = dayKey(); const st = stats(me);
    // Coins only for titles you've never been paid for, so adding and removing the same book over and over earns nothing.
    const paid = new Set(st.rewarded_titles || []);
    const fresh = [...new Set(allBooks(draft).map(b => (b.title || "").trim().toLowerCase()).filter(t => t && !paid.has(t)))];
    award("book", fresh.length); st.rewarded_titles = [...paid, ...fresh].slice(-2000);
    // Covers: only pay for a higher cover count than ever before.
    const coverCount = allBooks(draft).filter(b => b.cover).length; const paidCovers = st.covers_rewarded || 0;
    if (coverCount > paidCovers) { award("cover", coverCount - paidCovers); st.covers_rewarded = coverCount; }
    // The save bonus and pet growth happen once a day, no matter how many times you save.
    if (st.last_save_reward_day !== today) { award("save"); st.last_save_reward_day = today; const ap = me.pet && myPets().find(x => x.id === me.pet.id); if (ap) { ap.xp = (ap.xp || 0) + 5; setActivePet(ap.id); } }
    const months = [...new Set([...(me.months_updated || []), mk])];
    if (!(me.months_updated || []).includes(mk)) {
      award("month");
      if (new Date().getDate() <= 7) st.fresh_months = [...new Set([...(st.fresh_months || []), mk])];
    }
    st.books_added = (st.books_added || 0) + fresh.length;
    // Friend notices: at most 3 per day from you, and no friend hears from you more than twice a day.
    let targets = [];
    if (friends.length) {
      if (st.shelf_notice_day !== today) { st.shelf_notice_day = today; st.shelf_notice_count = 0; }
      if ((st.shelf_notice_count || 0) < 3) {
        const since = new Date(); since.setHours(0, 0, 0, 0);
        const { data } = await sb.from("notices").select("user_id").eq("actor_id", me.id).eq("kind", "shelf").gte("created_at", since.toISOString());
        const counts = {}; (data || []).forEach(n => { counts[n.user_id] = (counts[n.user_id] || 0) + 1; });
        targets = friends.filter(f => (counts[f.id] || 0) < 2).map(f => f.id);
        if (targets.length) st.shelf_notice_count = (st.shelf_notice_count || 0) + 1;
      }
    }
    await saveProfile({ categories: draft.categories, recommendations: draft.recommendations, months_updated: months, pet: me.pet, pets: myPets(), stats: st });
    if (targets.length) await notify(targets, "shelf", "updated their shelf");
    await sb.from("history").upsert({ user_id: me.id, month: mk, snapshot: { categories: draft.categories, recommendations: draft.recommendations } }, { onConflict: "user_id,month" });
    dirty = false; toast(targets.length ? "Shelf saved. Your friends will get a notice." : "Shelf saved.");
    if (titleIndex) loadTitles();
  }

  async function checkInToday() {
    const st = stats(me); const today = dayKey();
    if (st.last_checkin === today) { toast("Already checked in today. Nice."); return false; }
    const y = new Date(); y.setDate(y.getDate() - 1);
    st.read_streak = st.last_checkin === dayKey(y) ? (st.read_streak || 0) + 1 : 1;
    st.read_streak_best = Math.max(st.read_streak_best || 0, st.read_streak);
    st.checkins = (st.checkins || 0) + 1; st.last_checkin = today;
    award("checkin");
    const ap = me.pet && myPets().find(x => x.id === me.pet.id); if (ap) { ap.xp = (ap.xp || 0) + 10; setActivePet(ap.id); }
    await saveProfile({ stats: st, pet: me.pet, pets: myPets() });
    toast(`☀️ Read today · ${st.read_streak} day streak`);
    return true;
  }

  // daily visit + first-of-month reminder
  async function dailyTouch() {
    const st = stats(me); const today = dayKey(); let changed = false;
    if (st.last_visit !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      st.visit_streak = st.last_visit === dayKey(y) ? (st.visit_streak || 0) + 1 : 1;
      st.visits = (st.visits || 0) + 1; st.last_visit = today; award("visit"); changed = true;
    }
    const mk = monthKey(); let patch = { stats: st };
    if (me.last_reminded_month !== mk) {
      const mn = monthName(mk);
      await notify([me.id], "month", `New month! Save your shelf during ${mn} to earn the ${mn} badge and ${REWARD.month.coins} coins.`);
      patch.last_reminded_month = mk; changed = true;
    }
    if (changed) await saveProfile(patch);
  }

  // ---------- images ----------
  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); c.toBlob(b => b ? resolve(b) : reject(new Error("Couldn't read that image.")), "image/jpeg", 0.85);
      };
      img.onerror = () => reject(new Error("That file isn't an image.")); img.src = url;
    });
  }
  async function uploadImage(file, kind, max) {
    const blob = await resizeImage(file, max);
    const path = `${me.id}/${kind}-${uid()}.jpg`;
    const { error } = await sb.storage.from("images").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(error.message);
    return sb.storage.from("images").getPublicUrl(path).data.publicUrl;
  }
  // Crop box with four draggable corners; drag the middle to move it. Returns a JPEG blob of the chosen area.
  function cropImage(file, { aspect = 0, title = "Adjust the picture" } = {}) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        const overlay = el("div", { class: "crop-overlay" });
        const vw = window.innerWidth || document.documentElement.clientWidth || 600, vh = window.innerHeight || document.documentElement.clientHeight || 700; const maxW = Math.max(240, Math.min(vw - 32, 720)), maxH = Math.max(200, Math.min(vh - 190, 560));
        const sc = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const W = Math.round(img.naturalWidth * sc), H = Math.round(img.naturalHeight * sc);
        const stage = el("div", { class: "crop-stage", style: `width:${W}px;height:${H}px` }, el("img", { src: url, alt: "", draggable: false }));
        const box = el("div", { class: "crop-box" }, ...["nw", "ne", "sw", "se"].map(c => el("span", { class: "crop-h " + c, "data-c": c })));
        stage.append(box);
        // start with a centered box
        let bw = W * 0.8, bh = aspect ? bw / aspect : H * 0.8; if (bh > H * 0.9) { bh = H * 0.9; bw = aspect ? bh * aspect : bw; }
        let r = { x: (W - bw) / 2, y: (H - bh) / 2, w: bw, h: bh };
        const MIN = 24;
        const apply = () => { r.w = Math.max(MIN, Math.min(r.w, W)); r.h = Math.max(MIN, Math.min(r.h, H)); r.x = Math.max(0, Math.min(r.x, W - r.w)); r.y = Math.max(0, Math.min(r.y, H - r.h)); Object.assign(box.style, { left: r.x + "px", top: r.y + "px", width: r.w + "px", height: r.h + "px" }); };
        apply();
        let drag = null;
        box.addEventListener("pointerdown", (e) => { e.preventDefault(); try { box.setPointerCapture(e.pointerId); } catch (_) {} drag = { corner: e.target.dataset.c || null, sx: e.clientX, sy: e.clientY, start: { ...r } }; });
        box.addEventListener("pointermove", (e) => {
          if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; const s0 = drag.start;
          if (!drag.corner) { r.x = s0.x + dx; r.y = s0.y + dy; apply(); return; }
          let x = s0.x, y = s0.y, w = s0.w, h = s0.h;
          if (drag.corner.includes("e")) w = s0.w + dx; if (drag.corner.includes("s")) h = s0.h + dy;
          if (drag.corner.includes("w")) { x = s0.x + dx; w = s0.w - dx; } if (drag.corner.includes("n")) { y = s0.y + dy; h = s0.h - dy; }
          if (aspect) { const nw = Math.max(w, h * aspect); const nh = nw / aspect; if (drag.corner.includes("w")) x = s0.x + s0.w - nw; if (drag.corner.includes("n")) y = s0.y + s0.h - nh; w = nw; h = nh; }
          if (w < MIN) { if (drag.corner.includes("w")) x = s0.x + s0.w - MIN; w = MIN; } if (h < MIN) { if (drag.corner.includes("n")) y = s0.y + s0.h - MIN; h = MIN; }
          r = { x, y, w, h }; apply();
        });
        box.addEventListener("pointerup", () => { drag = null; }); box.addEventListener("pointercancel", () => { drag = null; });
        const done = (ok) => { overlay.remove(); URL.revokeObjectURL(url); if (!ok) return reject(new Error("cancelled"));
          const c = document.createElement("canvas"); const k = 1 / sc; const outW = Math.round(r.w * k), outH = Math.round(r.h * k); const lim = Math.min(1, 1200 / Math.max(outW, outH));
          c.width = Math.round(outW * lim); c.height = Math.round(outH * lim);
          c.getContext("2d").drawImage(img, r.x * k, r.y * k, outW, outH, 0, 0, c.width, c.height);
          c.toBlob(b => b ? resolve(b) : reject(new Error("Couldn't crop that image.")), "image/jpeg", 0.88); };
        fill(overlay, el("div", { class: "crop-panel" }, el("div", { class: "crop-title" }, title, el("span", { class: "muted small" }, " · drag the corners, or drag the middle to move")), stage,
          el("div", { class: "row", style: "justify-content:flex-end;margin-top:12px" }, el("button", { class: "btn ghost", onclick: () => done(false) }, "Cancel"), el("button", { class: "btn", onclick: () => { r = { x: 0, y: 0, w: W, h: H }; if (aspect) { if (W / H > aspect) { r.w = H * aspect; r.x = (W - r.w) / 2; } else { r.h = W / aspect; r.y = (H - r.h) / 2; } } apply(); } }, "Whole picture"), el("button", { class: "btn primary", onclick: () => done(true) }, "Use this"))));
        document.body.append(overlay);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That file isn't an image.")); };
      img.src = url;
    });
  }
  // pick a file, then crop it. cb gets the cropped blob. Nothing happens if the person cancels.
  function pickAndCrop(opts, cb) { pickImage(async (f) => { try { cb(await cropImage(f, opts)); } catch (e) { if (e.message !== "cancelled") toast(e.message); } }); }
  function pickImage(cb) {
    const inp = el("input", { type: "file", accept: "image/*", style: "display:none", onchange: () => { if (inp.files[0]) cb(inp.files[0]); inp.remove(); } });
    document.body.append(inp); inp.click();
  }

  // ---------- fully evolved pet parade (short, once per profile visit) ----------
  function petParade(pet) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const em = petEmoji(pet); const layer = el("div", { class: "parade" });
    layer.append(el("div", { class: "parade-pet" }, em), ...Array.from({ length: 7 }, (_, i) => el("span", { class: "parade-spark", style: `--i:${i}` }, ["✨", "⭐", "💫"][i % 3])), el("div", { class: "parade-name" }, pet.name));
    document.body.append(layer); setTimeout(() => layer.remove(), 3200);
  }

  // ---------- shared title suggestions ----------
  let titleIndex = null;
  async function loadTitles() {
    try { const { data } = await sb.rpc("all_titles"); titleIndex = data || []; } catch (e) { titleIndex = []; }
  }
  function attachSuggest(input, onPick) {
    const box = el("ul", { class: "suggest", hidden: true });
    input.parentNode.insertBefore(box, input.nextSibling);
    const hide = () => { box.hidden = true; };
    input.addEventListener("input", () => {
      const q = input.value.trim().toLowerCase();
      if (!q || !titleIndex) { hide(); return; }
      // sensitive on purpose: one letter shows every title starting with it, then titles with a word starting with it, then anything containing it
      const lc = (t) => t.title.toLowerCase();
      const starts = titleIndex.filter(t => lc(t).startsWith(q));
      const words = titleIndex.filter(t => !lc(t).startsWith(q) && lc(t).split(/\s+/).some(w => w.startsWith(q)));
      const inside = titleIndex.filter(t => !lc(t).startsWith(q) && !lc(t).split(/\s+/).some(w => w.startsWith(q)) && lc(t).includes(q));
      const hits = [...starts, ...words, ...inside].slice(0, 8);
      if (!hits.length) { hide(); return; }
      fill(box, ...hits.map(t => el("li", { onmousedown: (e) => { e.preventDefault(); onPick(t); hide(); } },
        t.cover ? el("img", { src: t.cover, alt: "" }) : el("span", { class: "cover-ph" }, "📕"),
        el("span", {}, el("b", {}, t.title), t.author ? el("small", {}, " · " + t.author) : null, el("small", { class: "muted" }, t.kind === "series" ? " · series" : "", ` · ${t.uses} shelf${t.uses === 1 ? "" : "ves"}`)))));
      box.hidden = false;
    });
    input.addEventListener("blur", () => setTimeout(hide, 150));
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  }

  // ---------- routing ----------
  const routes = { "": pageAuth, "/": pageAuth, "/shelf": pageShelf, "/friends": pageFriends, "/badges": pageBadges, "/card": pageCard, "/profile": pageProfile, "/history": pageHistory, "/books": pageBooks, "/terms": pageTerms };
  function route() {
    const h = location.hash.replace(/^#/, "") || "/";
    if (h.startsWith("/u/")) return { fn: pageCard, arg: h.slice(3), key: h };
    return { fn: routes[h] || pageShelf, key: h };
  }
  function updateTopbar() {
    if (!me) return;
    fill($("#me-chip"), avatarEl(me), el("span", { class: "nm" }, me.display_name));
    fill($("#coins"), "🪙 ", el("b", {}, (me.coins || 0).toLocaleString()), el("span", { class: "lvl" }, " · Lv " + levelOf(me.xp || 0)));
  }
  async function render() {
    const main = $("#main"); const r = route();
    document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("active", "#" + r.key === a.getAttribute("href")));
    if (!session) { $("#nav").hidden = true; $("#topbar-right").hidden = true; fill(main, r.key === "/terms" ? pageTerms() : pageAuth()); return; }
    if (!me) {
      fill(main, el("div", { class: "loading" }, "Opening your shelf…"));
      try { await loadMe(); await loadFriends(); await checkBadges(); await dailyTouch(); await loadNotices(); }
      catch (e) { fill(main, el("div", { class: "loading" }, "Couldn't load your profile: " + e.message)); return; }
    }
    $("#nav").hidden = false; $("#topbar-right").hidden = false; updateTopbar();
    if (r.key === "/" || r.key === "") { location.hash = "#/shelf"; return; }
    fill(main, await r.fn(r.arg));
    window.scrollTo(0, 0);
  }
  function avatarEl(p, size = "", frameKey) {
    let a;
    if (p.photo_url) a = el("span", { class: "avatar photo " + size }, el("img", { src: p.photo_url, alt: "" }));
    else {
      const isEmoji = p.avatar && p.avatar.length > 1;
      a = el("span", { class: "avatar " + size, style: isEmoji ? "background:var(--surface-2)" : "" }, p.avatar || "?");
      if (!isEmoji && p.accent && p.accent !== "green") a.style.background = ACCENTS.find(x => x.key === p.accent)?.hex || "";
    }
    const fk = frameKey || p.frame || "none";
    return fk === "none" ? a : el("span", { class: "av-frame fr-" + fk + " " + size }, a);
  }
  const bannerEl = (p, cls = "") => el("div", { class: "banner " + cls, style: "background:" + bannerOf(p).css });
  const kindPill = (item, editable, onToggle) => el("button", { class: "kind " + (item.kind === "series" ? "series" : "book"), title: editable ? "Click to switch between book and series" : "", disabled: !editable, onclick: (e) => { e.preventDefault(); if (editable) onToggle(); } }, item.kind === "series" ? "Series" : "Book");
  function coverEl(b, editable, onChange) {
    const c = el("span", { class: "cover" + (editable ? " editable" : ""), title: editable ? "Add a cover picture" : "" }, b.cover ? el("img", { src: b.cover, alt: "" }) : el("span", { class: "cover-ph" }, "📕"));
    if (editable) c.addEventListener("click", () => pickAndCrop({ title: "Adjust the cover" }, async (blob) => { try { c.classList.add("busy"); const url = await uploadImage(blob, "cover", 500); onChange(url); } catch (e) { toast(e.message); } finally { c.classList.remove("busy"); } }));
    return c;
  }

  // ---------- pages ----------
  function pageAuth() {
    let mode = "login";
    const wrap = el("div", { class: "auth" });
    const draw = () => {
      const err = el("div", { class: "error" });
      const user = el("input", { class: "input", placeholder: "username", autocomplete: "username", autocapitalize: "none" });
      const pass = el("input", { class: "input", type: "password", placeholder: "password", autocomplete: mode === "login" ? "current-password" : "new-password" });
      const name = el("input", { class: "input", placeholder: "What friends call you (e.g. Michael)" });
      const agree = el("input", { type: "checkbox", id: "agree" });
      const form = el("form", { onsubmit: async (e) => {
        e.preventDefault(); err.textContent = ""; const b = form.querySelector("button[type=submit]"); b.disabled = true;
        try { if (mode === "login") await signIn(user.value, pass.value); else await signUp(user.value, pass.value, name.value, agree.checked); me = null; location.hash = "#/shelf"; await render(); }
        catch (ex) { err.textContent = ex.message; b.disabled = false; }
      } },
        el("div", { class: "field" }, el("label", {}, "Username"), user),
        mode === "signup" ? el("div", { class: "field" }, el("label", {}, "Your name"), name) : null,
        el("div", { class: "field" }, el("label", {}, "Password"), pass,
          mode === "signup" ? el("div", { class: "warn setup-note" }, el("b", {}, "Write your password down. "), "There's no reset by email. If you lose it, email Joseph at ", el("a", { href: "mailto:" + HELP_EMAIL }, HELP_EMAIL), " and he'll reset it.") : null),
        mode === "signup" ? el("label", { class: "agree-row", for: "agree" }, agree, el("span", {}, "I agree to the ", el("a", { href: "#/terms", target: "_blank" }, "terms"), ". Short version: only real books, and be decent.")) : null,
        mode === "login" ? el("p", { class: "hint" }, "Forgot your password? Email Joseph at ", el("a", { href: "mailto:" + HELP_EMAIL }, HELP_EMAIL), " and he'll reset it.") : null,
        err,
        el("button", { class: "btn primary", type: "submit" }, mode === "login" ? "Open my shelf" : "Create my profile"),
      );
      fill(wrap,
        el("h1", {}, mode === "login" ? "Welcome back." : "Start your shelf."),
        el("p", { class: "lede" }, mode === "login" ? "See what your friends are reading, raise your pet, and collect this month's badge." : "A username and a password. That's the whole sign-up. You start with 20 coins and a badge waiting."),
        form,
        el("div", { class: "switch" }, mode === "login" ? "New here? " : "Already have a shelf? ",
          el("button", { onclick: () => { mode = mode === "login" ? "signup" : "login"; draw(); } }, mode === "login" ? "Create a profile" : "Log in")),
      );
    };
    draw(); return wrap;
  }

  async function pageShelf() {
    if (!titleIndex) await loadTitles();
    const page = el("div", { class: "stack" });
    const mk = monthKey(); const monthDone = (me.months_updated || []).includes(mk);
    page.append(el("div", { class: "page-head" },
      el("div", {}, el("div", { class: "eyebrow" }, monthName(mk)), el("h1", {}, "My Shelf"),
        el("p", { class: "sub" }, "Your favorite 0 to 10 books or series in each category, ranked. Star the one you're most excited about. Save when you're done.")),
      el("button", { class: "btn", onclick: addCategory }, "+ New category")));
    if (!monthDone) page.append(el("div", { class: "month-callout" }, el("span", { class: "mi" }, MONTH_ICONS[new Date().getMonth()]), el("div", {}, el("b", {}, monthName(mk) + " badge is up for grabs."), el("div", { class: "small muted" }, `Save your shelf this month to earn it, plus ${REWARD.month.coins} coins and ${REWARD.month.xp} XP.`))));
    const shelf = el("div", { class: "shelf" }), recs = el("div", { class: "card" }), saveBar = el("div", { class: "sticky-save" });
    page.append(shelf, recs, saveBar);
    function markDirty() { dirty = true; drawSave(); }
    function drawSave() {
      fill(saveBar,
        dirty ? el("span", { class: "dirty-note" }, "Unsaved changes") : null,
        dirty ? el("button", { class: "btn ghost", onclick: () => { draft = clone({ categories: me.categories, recommendations: me.recommendations }); dirty = false; drawAll(); } }, "Discard") : null,
        el("button", { class: "btn primary", disabled: !dirty, onclick: async (e) => { e.target.disabled = true; try { await saveShelf(); drawAll(); } catch (ex) { toast("Save failed: " + ex.message); e.target.disabled = false; } } }, "Save shelf"));
    }
    function addCategory() {
      const name = prompt("Name your category (e.g. Church books, Audiobooks, Graphic novels):");
      if (!name || !name.trim()) return;
      draft.categories.push({ name: name.trim().slice(0, 40), custom: true, books: [] }); markDirty(); drawShelf();
    }
    function addRowFor(books, onAdd, placeholder = "Title") {
      let kind = "book", pendingFile = null, pendingCover = null;
      const t = el("input", { class: "input", placeholder }), a = el("input", { class: "input", placeholder: "Author (optional)" });
      const setKind = (k) => { kind = k; kindBtn.textContent = kind === "book" ? "Book" : "Series"; kindBtn.classList.toggle("series", kind === "series"); };
      const kindBtn = el("button", { class: "kind-toggle", type: "button", onclick: () => setKind(kind === "book" ? "series" : "book") }, "Book");
      const picBtn = el("button", { class: "btn sm pic-btn", type: "button", title: "Attach a cover picture", onclick: () => pickAndCrop({ title: "Adjust the cover" }, (blob) => { pendingFile = blob; pendingCover = null; picBtn.textContent = "📷 ✓"; picBtn.classList.add("has-pic"); }) }, "📷");
      const wrap = el("div", { class: "suggest-wrap" }, t);
      attachSuggest(t, (hit) => { t.value = hit.title; if (hit.author && !a.value) a.value = hit.author; setKind(hit.kind === "series" ? "series" : "book"); if (hit.cover) { pendingCover = hit.cover; pendingFile = null; picBtn.textContent = "📷 ✓"; picBtn.classList.add("has-pic"); } });
      const addBtn = el("button", { class: "btn sm", type: "submit" }, "Add");
      return el("form", { class: "add-book", onsubmit: async (e) => {
        e.preventDefault(); if (!t.value.trim()) return;
        let cover = pendingCover;
        if (pendingFile) { addBtn.disabled = true; addBtn.textContent = "Uploading…"; try { cover = await uploadImage(pendingFile, "cover", 500); } catch (ex) { toast("Picture didn't upload: " + ex.message); } addBtn.disabled = false; addBtn.textContent = "Add"; }
        onAdd({ title: t.value.trim(), author: a.value.trim(), kind, cover: cover || undefined });
      } }, wrap, a, el("div", { class: "row", style: "gap:6px" }, kindBtn, picBtn, addBtn));
    }
    function drawShelf() {
      fill(shelf, ...draft.categories.map((cat, ci) => {
        const books = cat.books || (cat.books = []);
        const list = el("ul", { class: "books" });
        if (!books.length) list.append(el("li", { class: "empty-books" }, "Nothing here yet. Add a book or series below."));
        books.forEach((b, bi) => {
          list.append(el("li", { class: "book" },
            el("span", { class: "rank" + (bi === 0 ? " top" : "") }, bi + 1),
            coverWithBookmark(me, b, true, (url) => { b.cover = url; markDirty(); drawShelf(); }),
            el("div", { class: "bmeta" }, el("div", { class: "title" }, b.title, b.excited ? el("span", { class: "excited" }, "Most excited") : null, readingPill(me, b)),
              el("div", { class: "author" }, kindPill(b, true, () => { b.kind = b.kind === "series" ? "book" : "series"; markDirty(); drawShelf(); }), contentSelect(b, () => markDirty()), b.author ? " " + b.author : "")),
            el("div", { class: "tools" },
              el("button", { class: "icon-btn", title: "Quotes, notes and journal for this book", onclick: () => openNotes(b.title, b.author) }, "📝"),
              el("button", { class: "icon-btn star" + (b.excited ? " on" : ""), title: "Most excited about this one", onclick: () => { const was = b.excited; books.forEach(x => x.excited = false); b.excited = !was; markDirty(); drawShelf(); } }, "★"),
              el("button", { class: "icon-btn", title: "Move up", disabled: bi === 0, onclick: () => { [books[bi - 1], books[bi]] = [books[bi], books[bi - 1]]; markDirty(); drawShelf(); } }, "↑"),
              el("button", { class: "icon-btn", title: "Move down", disabled: bi === books.length - 1, onclick: () => { [books[bi + 1], books[bi]] = [books[bi], books[bi + 1]]; markDirty(); drawShelf(); } }, "↓"),
              el("button", { class: "icon-btn", title: "Remove", onclick: () => { books.splice(bi, 1); markDirty(); drawShelf(); } }, "✕"))));
        });
        return el("section", { class: "category" },
          el("div", { class: "category-head" }, el("h2", {}, cat.name), cat.custom ? el("span", { class: "custom-tag" }, "Yours") : null,
            el("span", { class: "count" + (books.length >= MAX_PER_CATEGORY ? " full" : "") }, books.length >= MAX_PER_CATEGORY ? "Full · 10 of 10" : `${books.length} of ${MAX_PER_CATEGORY}`),
            cat.custom ? el("button", { class: "icon-btn", title: "Remove category", onclick: () => { if (confirm(`Remove "${cat.name}" and its books?`)) { draft.categories.splice(ci, 1); markDirty(); drawShelf(); } } }, "✕") : null),
          list, books.length < MAX_PER_CATEGORY ? addRowFor(books, (b) => { books.push(inheritCover({ ...b, excited: false })); markDirty(); drawShelf(); }, "Book or series title") : null);
      }));
    }
    function drawRecs() {
      const list = draft.recommendations || (draft.recommendations = []);
      const t = el("input", { class: "input", placeholder: "Title" }), a = el("input", { class: "input", placeholder: "Author" }), n = el("input", { class: "input", placeholder: "Why should they read it?" });
      let kind = "book", pendingFile = null, pendingCover = null;
      const setKind = (k) => { kind = k; kindBtn.textContent = kind === "book" ? "Book" : "Series"; kindBtn.classList.toggle("series", kind === "series"); };
      const kindBtn = el("button", { class: "kind-toggle", type: "button", onclick: () => setKind(kind === "book" ? "series" : "book") }, "Book");
      const picBtn = el("button", { class: "btn sm pic-btn", type: "button", title: "Attach a cover picture", onclick: () => pickAndCrop({ title: "Adjust the cover" }, (blob) => { pendingFile = blob; pendingCover = null; picBtn.textContent = "📷 ✓"; picBtn.classList.add("has-pic"); }) }, "📷");
      const twrap = el("div", { class: "suggest-wrap" }, t);
      attachSuggest(t, (hit) => { t.value = hit.title; if (hit.author && !a.value) a.value = hit.author; setKind(hit.kind === "series" ? "series" : "book"); if (hit.cover) { pendingCover = hit.cover; pendingFile = null; picBtn.textContent = "📷 ✓"; picBtn.classList.add("has-pic"); } });
      const addBtn = el("button", { class: "btn sm", type: "submit" }, "Add");
      fill(recs,
        el("div", { class: "eyebrow" }, "For other readers"), el("h2", {}, "My recommendations"),
        el("p", { class: "muted small" }, `Up to ${MAX_PER_CATEGORY}. Friends can mark one as read and you both earn coins.`), el("div", { class: "sep" }),
        ...list.map((r, i) => el("div", { class: "rec" }, coverEl(r, true, (url) => { r.cover = url; markDirty(); drawRecs(); }), el("div", {}, el("div", { class: "title" }, r.title, r.author ? el("small", { class: "muted" }, " · " + r.author) : null), el("div", { class: "row", style: "gap:6px;margin-top:2px" }, kindPill(r, true, () => { r.kind = r.kind === "series" ? "book" : "series"; markDirty(); drawRecs(); }), contentSelect(r, () => markDirty()), r.note ? el("span", { class: "note" }, r.note) : null)),
          el("button", { class: "icon-btn", title: "Remove", onclick: () => { list.splice(i, 1); markDirty(); drawRecs(); } }, "✕"))),
        list.length < MAX_PER_CATEGORY ? el("form", { class: "add-book rec-add", onsubmit: async (e) => { e.preventDefault(); if (!t.value.trim()) return; let cover = pendingCover; if (pendingFile) { addBtn.disabled = true; addBtn.textContent = "Uploading…"; try { cover = await uploadImage(pendingFile, "cover", 500); } catch (ex) { toast("Picture didn't upload: " + ex.message); } } list.push({ id: uid(), title: t.value.trim(), author: a.value.trim(), note: n.value.trim(), kind, cover: cover || undefined }); markDirty(); drawRecs(); } }, twrap, a, n, el("div", { class: "row", style: "gap:6px" }, kindBtn, picBtn, addBtn)) : el("p", { class: "muted small" }, "That's 10. Remove one to add another."));
    }
    function drawAll() { drawShelf(); drawRecs(); drawSave(); }
    drawAll(); return page;
  }

  async function pageFriends() {
    await loadFriends();
    const page = el("div", { class: "stack" });
    const search = el("input", { class: "input", placeholder: "Friend's username", autocapitalize: "none" });
    const addForm = el("form", { class: "input-row", onsubmit: async (e) => {
      e.preventDefault(); const u = search.value.trim().toLowerCase().replace(/^@/, ""); if (!u) return;
      const { data: p } = await sb.from("profiles").select("id,username").eq("username", u).maybeSingle();
      if (!p) { toast("No one with that username yet."); return; }
      if (p.id === me.id) { toast("That's you."); return; }
      const { error } = await sb.from("friendships").insert({ requester: me.id, addressee: p.id });
      if (error) { toast(/duplicate/i.test(error.message) ? "You already sent that request." : error.message); return; }
      await notify([p.id], "friend_request", "wants to be your friend");
      search.value = ""; toast("Request sent."); page.replaceWith(await pageFriends());
    } }, search, el("button", { class: "btn primary", type: "submit" }, "Add friend"));
    page.append(el("div", { class: "page-head" }, el("div", {}, el("h1", {}, "Friends"), el("p", { class: "sub" }, "What everyone's reading, and the book each friend is most excited about."))),
      el("div", { class: "card" }, el("div", { class: "eyebrow" }, "Add a friend"), el("div", { style: "height:8px" }), addForm, el("p", { class: "hint", style: "margin-top:8px" }, "Your username is ", el("b", {}, me.username), ". Tell friends to add you, or add them.")));
    if (pendingIn.length) page.append(el("div", { class: "card" }, el("div", { class: "eyebrow" }, "Wants to be your friend"), ...pendingIn.map(p => el("div", { class: "row", style: "padding:10px 0" }, avatarEl(p), el("b", {}, p.display_name), el("span", { class: "muted" }, "@" + p.username),
      el("button", { class: "btn sm primary", style: "margin-left:auto", onclick: async () => { await sb.from("friendships").update({ status: "accepted" }).eq("id", p.fid); await notify([p.id], "friend_accepted", "accepted your friend request"); await loadFriends(); { const st = stats(me); st.rewarded_friends = st.rewarded_friends || []; if (!st.rewarded_friends.includes(p.id)) { award("friend"); st.rewarded_friends.push(p.id); } } await saveProfile({ stats: me.stats }); page.replaceWith(await pageFriends()); } }, "Accept"),
      el("button", { class: "btn sm ghost", onclick: async () => { await sb.from("friendships").delete().eq("id", p.fid); page.replaceWith(await pageFriends()); } }, "Ignore")))));
    if (pendingOut.length) page.append(el("p", { class: "muted small" }, "Waiting on: " + pendingOut.map(p => p.display_name).join(", ")));
    if (!friends.length) page.append(el("div", { class: "card", style: "text-align:center;padding:40px" }, el("h2", {}, "No friends yet"), el("p", { class: "muted" }, "Add one above. Your first friend earns you a badge and coins.")));
    else page.append(el("div", { class: "friend-list" }, ...friends.map(friendCard)));
    return page;
  }
  function friendCard(p) {
    const excited = allBooks(p).find(b => b.excited);
    const tops = (p.categories || []).filter(c => (c.books || []).length).slice(0, 3).map(c => ({ cat: c.name, ...c.books[0] }));
    const fresh = (Date.now() - new Date(p.updated_at).getTime()) < 7 * 86400e3;
    return el("a", { class: "card friend", href: "#/u/" + p.username },
      bannerEl(p, "strip"),
      el("div", { class: "friend-top" }, avatarEl(p, "lg"), el("div", {}, el("div", { class: "name" }, p.display_name), el("div", { class: "handle" }, "@" + p.username + " · Lv " + levelOf(p.xp || 0) + (p.pet ? " · " + petEmoji(p.pet) + " Lv " + petLevelOf(p.pet.xp || 0) : "")),
        el("div", { class: "updated-ago" + (fresh ? " fresh" : "") }, badgeCount(p) + " badges · updated " + ago(p.updated_at)))),
      excited ? el("div", { class: "pick", style: "background:var(--rose-soft)" }, el("span", { class: "cat", style: "color:var(--rose)" }, "Most excited about"), el("span", { class: "t" }, excited.title), excited.author ? el("span", { class: "a" }, excited.author) : null) : null,
      ...tops.map(t => el("div", { class: "pick" }, el("span", { class: "cat" }, "#1 " + t.cat + (t.kind === "series" ? " · series" : "")), el("span", { class: "t" }, t.title, ...contentPills(t), p.show_reading !== false ? readingPill(p, t) : null, p.show_reading !== false && bookmarkForTitle(p, t.title) ? el("span", { class: "pick-bm" }, bookmarkEl(bookmarkForTitle(p, t.title), "xs")) : null), t.author ? el("span", { class: "a" }, t.author) : null)),
      !tops.length ? el("p", { class: "muted small" }, "Hasn't added books yet.") : null,
      el("span", { class: "more" }, "See full card →"));
  }

  async function pageBadges() {
    const m = metrics(me, friends.length); const n = badgeCount(me); const total = BADGES.length;
    const ach = BADGES.filter(b => !b.monthly); const earnedKeys = new Set((me.badges || []).map(b => b.key));
    const nextUnlock = [...ACCENTS.map(a => ({ name: a.name + " accent", need: a.need })), ...BANNERS.filter(b => b.need).map(b => ({ name: b.name + " banner", need: b.need })), ...AVATAR_SETS.filter(a => a.need).map(a => ({ name: a.set + " avatars", need: a.need }))].filter(x => x.need > n).sort((a, b) => a.need - b.need)[0];
    const nextFrame = FRAMES.find(f => f.level > levelOf(me.xp || 0));
    const page = el("div", { class: "stack" });
    page.append(el("div", { class: "page-head" }, el("div", {}, el("h1", {}, "Badges"), el("p", { class: "sub" }, `${n} of ${total} earned. ` + (nextUnlock ? `Next unlock at ${nextUnlock.need}: ${nextUnlock.name}.` : "You've unlocked everything.") + (nextFrame ? ` Next frame at level ${nextFrame.level}: ${nextFrame.name}.` : "")))));
    page.append(el("div", { class: "progress" }, el("i", { style: `width:${(n / total) * 100}%` })));
    // monthly
    const mk = monthKey(); const monthDone = m.months.includes(mk); const cur = BADGE_BY_KEY["month_" + mk];
    const earnedMonthly = BADGES.filter(b => b.monthly && earnedKeys.has(b.key));
    page.append(el("div", { class: "card" }, el("div", { class: "eyebrow" }, "This month"),
      el("div", { class: "row", style: "margin-top:8px" }, el("div", { class: "medal big" + (monthDone ? "" : " off") }, cur ? cur.icon : "🗓️"), el("div", {}, el("b", {}, cur ? cur.name : monthName(mk)), el("div", { class: "muted small" }, monthDone ? "Earned. See you next month." : "Save your shelf any time this month to earn it. A different badge every month, through 2036."))),
      earnedMonthly.length ? el("div", { class: "month-grid" }, ...earnedMonthly.map(b => el("div", { class: "month-badge", title: b.name }, el("span", {}, b.icon), el("small", {}, b.name.replace(/(\w{3})\w* (\d{4})/, "$1 $2"))))) : null));
    // achievements, earned first then by progress
    const sorted = [...ach].sort((a, b) => (earnedKeys.has(b.key) - earnedKeys.has(a.key)) || (progressOf(b, m) - progressOf(a, m)));
    page.append(el("div", { class: "eyebrow" }, `Achievements · ${ach.filter(b => earnedKeys.has(b.key)).length} of ${ach.length}`));
    page.append(el("div", { class: "badge-grid" }, ...sorted.map(b => { const got = (me.badges || []).find(x => x.key === b.key); const pr = progressOf(b, m);
      return el("div", { class: "badge" + (got ? "" : " locked") }, el("div", { class: "medal" }, b.icon), el("div", { style: "flex:1;min-width:0" }, el("div", { class: "bname" }, b.name), el("div", { class: "bhow" }, b.how),
        got ? el("div", { class: "bwhen" }, "Earned " + new Date(got.at).toLocaleDateString()) : el("div", { class: "mini-progress" }, el("i", { style: `width:${pr * 100}%` }), el("span", {}, b.monthly ? "" : `${Math.min(m[b.metric] || 0, b.need)}/${b.need}`)))); })));
    return page;
  }

  async function pageCard(username) {
    let p = me;
    if (username && username !== me.username) {
      const { data } = await sb.from("profiles").select(PROFILE_PUBLIC).eq("username", username).maybeSingle();
      if (!data) return el("div", { class: "loading" }, "No shelf at @" + username + ".");
      p = data;
    }
    const mine = p.id === me.id, isFriend = friends.some(f => f.id === p.id);
    const excited = allBooks(p).find(b => b.excited); const cats = (p.categories || []).filter(c => (c.books || []).length);
    const bn = bannerOf(p); const lvl = levelOf(p.xp || 0);
    const card = el("div", { class: "share-card", id: "share-card", style: `--c:${bn.color}` },
      bannerEl(p, "card-banner"),
      el("div", { class: "top" }, avatarEl(p, "xl"), el("div", {}, el("div", { class: "nm" }, p.display_name), el("div", { class: "hd" }, "@" + p.username), el("div", { class: "lvl-pill" }, "⭐ Lv " + lvl + " · " + levelTitle(lvl)))),
      p.tagline ? el("div", { class: "tag" }, "“" + p.tagline + "”") : null,
      el("div", { class: "stats" }, el("div", { class: "stat" }, el("b", {}, bookCount(p)), el("span", {}, "Books")), el("div", { class: "stat" }, el("b", {}, badgeCount(p)), el("span", {}, "Badges")),
        el("div", { class: "stat" }, el("b", {}, p.pet ? petEmoji(p.pet) : "—"), el("span", {}, p.pet ? p.pet.name + " Lv " + petLevelOf(p.pet.xp || 0) : "No pet"))),
      el("div", { class: "card-list" },
        excited ? el("div", { class: "cl" }, el("span", { class: "k", style: "color:var(--rose)" }, "Can't wait"), el("span", { class: "v" }, excited.title, excited.author ? el("small", {}, " · " + excited.author) : null)) : null,
        ...cats.map(c => el("div", { class: "cl" }, el("span", { class: "k" }, c.name), el("span", { class: "v" }, c.books[0].title, c.books[0].kind === "series" ? el("small", {}, " (series)") : null, c.books[0].author ? el("small", {}, " · " + c.books[0].author) : null, c.books.length > 1 ? el("small", {}, ` +${c.books.length - 1} more`) : null)))),
      (p.badges || []).length ? el("div", { class: "badge-row" }, (p.badges || []).slice(-14).map(b => BADGE_BY_KEY[b.key]?.icon || "").join(" ")) : null,
      el("div", { class: "card-foot" }, el("span", {}, "Shelfmates"), el("span", {}, "Updated " + ago(p.updated_at))));
    const page = el("div", { class: "stack" },
      el("div", { class: "page-head" }, el("div", {}, el("h1", {}, mine ? "My Card" : p.display_name + "'s card"), el("p", { class: "sub" }, mine ? "Your stats and top books in one card. Send the link to a friend, or download it as a picture." : "Top pick from each of their shelves."))),
      card,
      el("div", { class: "card-actions" },
        el("button", { class: "btn", onclick: () => { const link = location.origin + location.pathname + "#/u/" + p.username; navigator.clipboard?.writeText(link).then(() => toast("Link copied.")).catch(() => prompt("Copy this link:", link)); } }, "Copy link"),
        el("button", { class: "btn", onclick: () => downloadCard(p) }, "Download picture"),
        !mine && !isFriend ? el("button", { class: "btn primary", onclick: async () => { const { error } = await sb.from("friendships").insert({ requester: me.id, addressee: p.id }); if (error) toast("Request already sent."); else { await notify([p.id], "friend_request", "wants to be your friend"); toast("Friend request sent."); } } }, "Add friend") : null));
    if (mine || isFriend) {
      page.append(el("div", { class: "eyebrow", style: "margin-top:10px" }, mine ? "Everything on my shelf" : "Everything on their shelf"));
      page.append(...cats.map(c => el("section", { class: "category" }, el("div", { class: "category-head" }, el("h2", {}, c.name), el("span", { class: "count" }, c.books.length + " of 10")),
        el("ul", { class: "books" }, ...c.books.map((b, i) => el("li", { class: "book" }, el("span", { class: "rank" + (i === 0 ? " top" : "") }, i + 1), (mine || p.show_reading !== false) ? coverWithBookmark(p, b, false) : coverEl(b, false), el("div", { class: "bmeta" }, el("div", { class: "title" }, b.title, b.excited ? el("span", { class: "excited" }, "Most excited") : null, (mine || p.show_reading !== false) ? readingPill(p, b) : null), el("div", { class: "author" }, kindPill(b, false), ...contentPills(b), b.author ? " " + b.author : "")), el("span")))))));
      // reading log + public notes
      const log = p.reading_log || []; const yr = new Date().getFullYear(); const thisYear = log.filter(x => (x.finished || "").startsWith(String(yr)));
      const nowReading = (p.tbr || []).filter(x => x.reading);
      if (nowReading.length && (mine || p.show_reading !== false)) page.append(el("div", { class: "card" }, el("div", { class: "eyebrow" }, mine ? "Reading now" : p.display_name + " is reading"),
        ...nowReading.map(x => el("div", { class: "row", style: "margin-top:8px;gap:12px" }, coverEl(x, false), el("div", { style: "flex:1;min-width:160px" }, el("div", { class: "title", style: "font-family:var(--display);font-weight:600" }, x.title, x.author ? el("small", { class: "muted" }, " · " + x.author) : null), el("div", { class: "progress", style: "margin-top:6px" }, el("i", { style: `width:${x.progress || 0}%` })), el("div", { class: "muted small" }, (x.progress || 0) + "% through"))))));
      if (log.length) page.append(el("div", { class: "card" }, el("div", { class: "eyebrow" }, mine ? "My books" : p.display_name + "'s books"), el("h2", {}, `${thisYear.length} read in ${yr}`, el("small", { class: "muted" }, ` · ${log.length} all time`)),
        el("div", { class: "log-mini" }, ...thisYear.slice(0, 12).map(x => el("span", { class: "log-chip" }, x.title, ...contentPills(x))), thisYear.length > 12 ? el("span", { class: "muted small" }, `+${thisYear.length - 12} more`) : null)));
      const { data: pub } = await sb.from("notes").select("id,book_title,book_author,kind,body,public,created_at").eq("user_id", p.id).eq("public", true).order("created_at", { ascending: false }).limit(50);
      if (pub && pub.length) page.append(el("div", { class: "card" }, el("div", { class: "eyebrow" }, mine ? "My public quotes & notes" : p.display_name + "'s quotes & notes"), el("div", { class: "sep" }),
        ...pub.map(n => el("div", { class: "note-row" }, el("div", { class: "note-kind" }, NOTE_KINDS.find(k => k[0] === n.kind)?.[1] || "Note"), el("div", { class: "note-body" + (n.kind === "quote" ? " quote" : "") }, n.body), el("div", { class: "note-meta" }, n.book_title + (n.book_author ? " · " + n.book_author : "") + " · " + new Date(n.created_at).toLocaleDateString())))));
      const recsList = p.recommendations || [];
      if (recsList.length) page.append(el("div", { class: "card" }, el("div", { class: "eyebrow" }, mine ? "My recommendations" : p.display_name + " recommends"), el("div", { class: "sep" }),
        ...recsList.map(r => { const key = p.username + ":" + r.id; const read = (me.recs_read || []).includes(key); return el("div", { class: "rec" }, coverEl(r, false), el("div", {}, el("div", { class: "title" }, r.title, r.author ? el("small", { class: "muted" }, " · " + r.author) : null), el("div", { class: "row", style: "gap:6px;margin-top:2px" }, kindPill(r, false), r.note ? el("span", { class: "note" }, r.note) : null)),
          mine ? null : el("button", { class: "btn sm" + (read ? " ghost" : ""), onclick: async (e) => { if (read) return; award("recRead"); await saveProfile({ recs_read: [...(me.recs_read || []), key] }); await notify([p.id], "rec_read", `read your recommendation "${r.title}"`); e.target.textContent = "Read ✓"; e.target.classList.add("ghost"); } }, read ? "Read ✓" : "I read it")); })));
    }
    return page;
  }
  function downloadCard(p) {
    const W = 900, H = 1240, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    const dark = matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
    const bn = bannerOf(p), ink = dark ? "#EEF0EC" : "#1C2320", muted = dark ? "#9AA59F" : "#5F6B66";
    x.fillStyle = dark ? "#1D2321" : "#FFFFFF"; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, bn.color); g.addColorStop(1, shade(bn.color, 40)); x.fillStyle = g; x.fillRect(0, 0, W, 150);
    const finish = () => {
      x.fillStyle = ink; x.font = "700 54px Fraunces, Georgia, serif"; x.fillText(p.display_name, 230, 215);
      x.fillStyle = muted; x.font = "400 30px 'Source Sans 3', Arial, sans-serif"; x.fillText("@" + p.username + "  ·  Lv " + levelOf(p.xp || 0) + " " + levelTitle(levelOf(p.xp || 0)), 230, 258);
      let y = 330; if (p.tagline) { x.font = "italic 30px 'Source Sans 3', Arial"; x.fillStyle = muted; x.fillText("“" + p.tagline + "”", 60, y); y += 50; }
      const cats = (p.categories || []).filter(cc => (cc.books || []).length);
      const st = [[bookCount(p), "BOOKS"], [badgeCount(p), "BADGES"], [p.pet ? petEmoji(p.pet) + " " + petLevelOf(p.pet.xp || 0) : "—", p.pet ? "PET LEVEL" : "NO PET"]];
      st.forEach((s, i) => { const sx = 60 + i * 270; x.fillStyle = dark ? "#242B28" : "#EFEEE8"; roundRect(x, sx, y, 240, 110, 18); x.fillStyle = ink; x.font = "700 56px Fraunces, Georgia, serif"; x.fillText(String(s[0]), sx + 24, y + 68); x.fillStyle = muted; x.font = "700 20px 'Source Sans 3', Arial"; x.fillText(s[1], sx + 24, y + 96); });
      y += 160;
      const ex = allBooks(p).find(b => b.excited);
      const line = (k, v, kc) => { x.fillStyle = kc; x.font = "700 20px 'Source Sans 3', Arial"; x.fillText(k.toUpperCase(), 60, y); x.fillStyle = ink; x.font = "600 34px Fraunces, Georgia, serif"; x.fillText(fit(x, v, 780), 60, y + 42); y += 92; };
      if (ex) line("Can't wait", ex.title + (ex.author ? " · " + ex.author : ""), "#B3556A");
      cats.slice(0, 7).forEach(cc => line(cc.name + (cc.books[0].kind === "series" ? " (series)" : ""), cc.books[0].title + (cc.books[0].author ? " · " + cc.books[0].author : ""), bn.color));
      x.fillStyle = muted; x.font = "400 24px 'Source Sans 3', Arial"; x.fillText("Shelfmates", 60, H - 50);
      const a = document.createElement("a"); a.download = p.username + "-shelfmates.png"; a.href = c.toDataURL("image/png"); a.click();
    };
    // avatar circle
    x.save(); x.beginPath(); x.arc(140, 150, 80, 0, Math.PI * 2); x.closePath(); x.fillStyle = dark ? "#1D2321" : "#fff"; x.fill(); x.clip();
    if (p.photo_url) { const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => { x.drawImage(img, 60, 70, 160, 160); x.restore(); finish(); }; img.onerror = () => { x.restore(); drawLetter(); finish(); }; img.src = p.photo_url; return; }
    x.restore(); drawLetter(); finish();
    function drawLetter() { x.fillStyle = bn.color; x.beginPath(); x.arc(140, 150, 76, 0, Math.PI * 2); x.fill(); x.fillStyle = "#fff"; x.font = "700 70px Fraunces, Georgia, serif"; x.textAlign = "center"; x.fillText(p.avatar || "?", 140, 176); x.textAlign = "left"; }
    function roundRect(ctx, X, Y, w, h, r) { ctx.beginPath(); ctx.moveTo(X + r, Y); ctx.arcTo(X + w, Y, X + w, Y + h, r); ctx.arcTo(X + w, Y + h, X, Y + h, r); ctx.arcTo(X, Y + h, X, Y, r); ctx.arcTo(X, Y, X + w, Y, r); ctx.closePath(); ctx.fill(); }
    function fit(ctx, s, max) { let t = s; while (ctx.measureText(t).width > max && t.length > 3) t = t.slice(0, -2); return t.length < s.length ? t + "…" : t; }
    function shade(hex, amt) { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, (n >> 16) + amt), g2 = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt); return `rgb(${r},${g2},${b})`; }
  }

  async function pageProfile() {
    const n = badgeCount(me);
    const name = el("input", { class: "input", value: me.display_name }), tag = el("input", { class: "input", value: me.tagline || "", placeholder: "One line about you as a reader", maxlength: 80 });
    let accent = me.accent || "green", avatar = me.avatar, banner = me.banner || "plain", frame = me.frame || "none";
    const showReading = el("input", { type: "checkbox", checked: me.show_reading !== false });
    const page = el("div", { class: "stack" });
    const myLevel = levelOf(me.xp || 0);
    const frGrid = el("div", { class: "frame-grid" });
    const drawFrames = () => fill(frGrid, ...FRAMES.map(f => { const ok = myLevel >= f.level; return el("button", { class: "frame-opt" + (f.key === frame ? " on" : "") + (ok ? "" : " locked"), title: f.desc, onclick: () => { if (!ok) { toast(`${f.name} unlocks at level ${f.level}.`); return; } frame = f.key; drawFrames(); } },
      avatarEl(me, "lg", f.key), el("div", { class: "bn-name" }, f.name), el("small", { class: "muted" }, ok ? (f.key === frame ? "Selected" : "Unlocked") : "Level " + f.level)); }));
    drawFrames();
    // --- character & pet ---
    const lvl = levelOf(me.xp || 0), nextXp = xpForLevel(lvl + 1), curXp = xpForLevel(lvl), pct = Math.min(100, ((me.xp - curXp) / (nextXp - curXp)) * 100);
    const charCard = el("div", { class: "card char" },
      el("div", { class: "eyebrow" }, "Your character"),
      el("div", { class: "row", style: "margin-top:6px;align-items:flex-start" }, avatarEl(me, "xl"),
        el("div", { style: "flex:1;min-width:200px" }, el("div", { class: "lvl-line" }, el("b", {}, "Level " + lvl), el("span", { class: "muted" }, " · " + levelTitle(lvl)), el("span", { class: "coin-big" }, "🪙 " + (me.coins || 0).toLocaleString())),
          el("div", { class: "progress" }, el("i", { style: `width:${pct}%` })), el("div", { class: "muted small" }, `${me.xp || 0} XP · ${nextXp - (me.xp || 0)} to level ${lvl + 1}`),
          el("p", { class: "muted small", style: "margin-top:6px" }, "Earn XP and coins by adding books, saving your shelf each month, making friends, reading recommendations, and collecting badges. Spend coins on your pet and banners."))));
    const petCard = el("div", { class: "card" });
    async function savePets() { await saveProfile({ pet: me.pet, pets: myPets() }); drawPet(); updateTopbar(); }
    function petRow(pet) {
      const pt = PETS.find(p => p.key === pet.type) || PETS[0]; const pl = petLevelOf(pet.xp || 0), stage = petStage(pl);
      const next = petXpFor(Math.min(PET_MAX_LEVEL, pl + 1)), cur = petXpFor(pl), ppct = pl >= PET_MAX_LEVEL ? 100 : Math.min(100, ((pet.xp - cur) / (next - cur)) * 100);
      const active = me.pet && me.pet.id === pet.id;
      return el("div", { class: "pet-row" + (active ? " active" : "") },
        el("div", { class: "pet-big" }, pt.stages[stage]),
        el("div", { style: "flex:1;min-width:200px" },
          el("div", { class: "lvl-line" }, el("b", {}, pet.name), el("span", { class: "muted" }, ` · ${pt.name} · ${PET_STAGE_NAMES[stage]} · Lv ${pl}`), active ? el("span", { class: "active-tag" }, "On your profile") : null),
          el("div", { class: "progress pet" }, el("i", { style: `width:${ppct}%` })),
          el("div", { class: "muted small" }, pl >= PET_MAX_LEVEL ? "Max level." : `${pet.xp || 0} XP · ${next - (pet.xp || 0)} to level ${pl + 1}` + (stage < 3 ? ` · next stage at Lv ${[3, 10, 25][stage]}` : " · fully evolved")),
          el("div", { class: "row", style: "margin-top:10px" },
            el("button", { class: "btn sm primary", disabled: (me.coins || 0) < PET_FEED_COST || pl >= PET_MAX_LEVEL, onclick: async (e) => { e.target.disabled = true; me.coins -= PET_FEED_COST; pet.xp = (pet.xp || 0) + PET_FEED_XP; if (active) setActivePet(pet.id); try { await savePets(); if (petLevelOf(pet.xp) > pl) toast(`${pt.stages[petStage(petLevelOf(pet.xp))]} ${pet.name} reached level ${petLevelOf(pet.xp)}!`, "badge-toast"); } catch (ex) { toast(ex.message); } } }, `Feed · ${PET_FEED_COST} coins`),
            active ? null : el("button", { class: "btn sm", onclick: async () => { setActivePet(pet.id); await savePets(); } }, "Put on profile"),
            el("button", { class: "btn sm ghost", onclick: async () => { const nm = prompt("Rename your pet:", pet.name); if (!nm) return; pet.name = nm.trim().slice(0, 20); if (active) setActivePet(pet.id); await savePets(); } }, "Rename"),
            el("button", { class: "btn sm ghost danger", onclick: async () => { if (!confirm("Release " + pet.name + "? Their levels are gone for good.")) return; me.pets = myPets().filter(x => x.id !== pet.id); if (active) setActivePet(me.pets[0]?.id); await savePets(); } }, "Release"))));
    }
    function drawPet() {
      const pets = myPets(); const firstFree = pets.length === 0;
      fill(petCard, el("div", { class: "eyebrow" }, pets.length ? "Your pets" : "Adopt a pet"),
        pets.length ? el("p", { class: "muted small" }, "You can keep as many as you like, but only one goes on your profile. It grows every time you save your shelf, and any pet grows when you feed it coins.") : el("p", { class: "muted small" }, "Your pet grows every time you save your shelf, and faster when you feed it coins. The first one is free."),
        ...pets.map(petRow),
        el("div", { class: "eyebrow", style: "margin-top:14px" }, pets.length ? "Adopt another" : "Choose one"),
        el("div", { class: "pet-choices" }, ...PETS.map(pt => { const cost = firstFree ? 0 : Math.max(100, pt.cost); const locked = pt.needBooks && booksRead(me) < pt.needBooks; return el("button", { class: "pet-choice" + (locked ? " locked" : ""), title: locked ? `Unlocks after ${pt.needBooks} books in My Books (${booksRead(me)} so far)` : "", onclick: async () => { if (locked) { toast(`The ${pt.name} hatches after ${pt.needBooks} finished books. You're at ${booksRead(me)}.`); return; } const nm = prompt(`Name your ${pt.name.toLowerCase()}:`, pt.name); if (nm == null) return; if (cost && (me.coins || 0) < cost) { toast(`Needs ${cost} coins. You have ${me.coins || 0}.`); return; } me.coins = (me.coins || 0) - cost; const np = { id: uid(), type: pt.key, name: nm.trim().slice(0, 20) || pt.name, xp: 0 }; myPets().push(np); if (!me.pet) setActivePet(np.id); try { await savePets(); } catch (e) { toast(e.message); } } }, el("span", { class: "pe" }, locked ? "🔒" : pt.stages[2]), el("b", {}, pt.name), el("small", {}, locked ? `${pt.needBooks} books` : (pt.needBooks ? "Earned!" : cost ? cost + " coins" : "Free"))); })));
    }
    drawPet();
    if (petIsLegend(me.pet)) petParade(me.pet);
    // --- look ---
    const sw = el("div", { class: "swatches" }), av = el("div", { class: "stack" }), bnGrid = el("div", { class: "banner-grid" });
    const drawSw = () => fill(sw, ...ACCENTS.map(a => el("button", { class: "swatch" + (a.key === accent ? " on" : "") + (n < a.need ? " locked" : ""), style: `background:${a.hex}`, title: n < a.need ? `${a.name} — unlocks at ${a.need} badges` : a.name, onclick: () => { if (n < a.need) { toast(`${a.name} unlocks at ${a.need} badges.`); return; } accent = a.key; document.documentElement.dataset.accent = accent; drawSw(); } })));
    const drawAv = () => fill(av, ...AVATAR_SETS.map(set => el("div", {}, el("div", { class: "eyebrow" }, set.set + (n < set.need ? ` · unlocks at ${set.need} badges` : "")), el("div", { style: "height:6px" }), el("div", { class: "avatars" },
      ...(set.items || [me.username[0].toUpperCase(), (me.display_name || "?")[0].toUpperCase()]).filter((v, i, arr) => arr.indexOf(v) === i).map(it => el("button", { class: "av-opt" + (it === avatar ? " on" : "") + (n < set.need ? " locked" : ""), onclick: () => { if (n < set.need) return; avatar = it; drawAv(); } }, it))))));
    let bannerFilter = "All";
    const themeSel = el("select", { class: "input", style: "width:auto", onchange: () => { bannerFilter = themeSel.value; drawBanners(); } }, ...["All", "Owned", ...BANNER_THEMES.map(t => t.theme)].map(t => el("option", { value: t }, t)));
    const drawBanners = () => fill(bnGrid, ...BANNERS.filter(b => bannerFilter === "All" || (bannerFilter === "Owned" ? ownsBanner(me, b) : bannerThemeOf(b) === bannerFilter)).map(b => { const owned = ownsBanner(me, b); const canBuy = !owned && b.cost && (me.coins || 0) >= b.cost;
      return el("button", { class: "banner-opt" + (b.key === banner ? " on" : "") + (owned ? "" : " locked"), onclick: async () => {
        if (owned) { banner = b.key; drawBanners(); return; }
        if (b.cost) { if (!canBuy) { toast(`${b.name} costs ${b.cost} coins. You have ${me.coins || 0}.`); return; } if (!confirm(`Buy the ${b.name} banner for ${b.cost} coins?`)) return; me.coins -= b.cost; const st = stats(me); st.owned_banners = [...(st.owned_banners || []), b.key]; banner = b.key; await saveProfile({ banner, stats: st }); drawBanners(); updateTopbar(); toast("Bought. Looking sharp."); }
        else toast(`${b.name} unlocks at ${b.need} badges.`);
      } }, el("div", { class: "banner-preview", style: "background:" + b.css }), el("div", { class: "bn-name" }, b.name), el("small", { class: "muted" }, owned ? (b.key === banner ? "Selected" : "Owned") : b.cost ? `🪙 ${b.cost}` : `${b.need} badges`)); }));
    drawSw(); drawAv(); drawBanners();
    const photoRow = el("div", { class: "row" }, avatarEl(me, "lg"),
      el("button", { class: "btn sm", onclick: () => pickAndCrop({ aspect: 1, title: "Adjust your picture" }, async (blob) => { try { toast("Uploading…"); const url = await uploadImage(blob, "photo", 512); await saveProfile({ photo_url: url }); updateTopbar(); page.replaceWith(await pageProfile()); } catch (e) { toast("Upload failed: " + e.message); } }) }, me.photo_url ? "Change picture" : "Add a picture"),
      me.photo_url ? el("button", { class: "btn sm ghost", onclick: async () => { await saveProfile({ photo_url: null }); updateTopbar(); page.replaceWith(await pageProfile()); } }, "Remove") : null);
    page.append(
      el("div", { class: "page-head" }, el("div", {}, el("h1", {}, "My profile"), el("p", { class: "sub" }, "Your character, your pet, and your look. More badges and coins, more choices."))),
      charCard, petCard,
      el("div", { class: "card stack" },
        el("div", { class: "field" }, el("label", {}, "Profile picture"), photoRow, el("div", { class: "hint" }, "Your picture stays yours. Badges and coins change the banner behind it, not the picture.")),
        el("div", { class: "field" }, el("label", {}, "Frame"), el("div", { class: "hint" }, "A ring around your picture. Earned by level. " + FRAMES.filter(f => f.level > myLevel).length + " still to earn."), frGrid),
        el("div", { class: "field" }, el("label", {}, "Banner"), el("div", { class: "row" }, themeSel, el("span", { class: "hint" }, `${BANNERS.length} banners · ${BANNERS.filter(b => ownsBanner(me, b)).length} yours · scroll sideways`)), bnGrid),
        el("div", { class: "field" }, el("label", { class: "row", style: "gap:8px;cursor:pointer" }, showReading, "Show friends what I'm reading now and how far I am"), el("div", { class: "hint" }, "Turn it off and only you see your progress.")),
        el("div", { class: "field" }, el("label", {}, "Name"), name),
        el("div", { class: "field" }, el("label", {}, "Tagline"), tag),
        el("div", { class: "field" }, el("label", {}, "Accent color"), sw),
        el("div", { class: "field" }, el("label", {}, "Avatar (used when there's no picture)"), av),
        el("div", { class: "row" }, el("button", { class: "btn primary", onclick: async () => { try { await saveProfile({ display_name: name.value.trim() || me.username, tagline: tag.value.trim(), accent, avatar, banner, frame, show_reading: showReading.checked }); toast("Profile saved."); render(); } catch (e) { toast("Couldn't save: " + e.message); } } }, "Save profile"),
          el("a", { class: "btn ghost", href: "#/history" }, "My history"), el("button", { class: "btn ghost danger", style: "margin-left:auto", onclick: signOut }, "Log out"))),
      el("p", { class: "hint" }, "Username: @" + me.username + ". Usernames can't be changed."));
    return page;
  }

  async function pageHistory() {
    const { data } = await sb.from("history").select("month,snapshot,created_at").eq("user_id", me.id).order("month", { ascending: false });
    const rows = data || [];
    return el("div", { class: "stack" },
      el("div", { class: "page-head" }, el("div", {}, el("h1", {}, "My history"), el("p", { class: "sub" }, "A snapshot of your shelf for every month you saved it. Only you can see this."))),
      el("div", { class: "card" }, rows.length ? rows.map(r => { const cats = (r.snapshot.categories || []).filter(c => (c.books || []).length); return el("div", { class: "history-month" }, el("div", { class: "m" }, monthName(r.month)), ...cats.map(c => el("div", { class: "l" }, el("b", {}, c.name + ": "), c.books.map(b => b.title).join(", ")))); }) : el("p", { class: "muted" }, "Save your shelf once and this month will show up here.")));
  }

  // ---------- quotes, notes, thoughts, journal (per book; each entry public or private) ----------
  function openNotes(title, author) {
    const overlay = el("div", { class: "crop-overlay", onclick: (e) => { if (e.target === overlay) overlay.remove(); } });
    const list = el("div", { class: "stack", style: "gap:10px" });
    const kindSel = el("select", { class: "input", style: "width:auto" }, ...NOTE_KINDS.map(k => el("option", { value: k[0] }, k[1])));
    const body = el("textarea", { class: "input", rows: 4, placeholder: "A quote you loved, a thought, or a journal entry about this book…" });
    const pub = el("input", { type: "checkbox" });
    async function load() {
      const { data } = await sb.from("notes").select("*").eq("user_id", me.id).ilike("book_title", title).order("created_at", { ascending: false });
      fill(list, ...(data || []).map(n => el("div", { class: "note-row" },
        el("div", { class: "row", style: "gap:8px" }, el("span", { class: "note-kind" }, NOTE_KINDS.find(k => k[0] === n.kind)?.[1] || "Note"), el("span", { class: "muted small" }, new Date(n.created_at).toLocaleDateString()),
          el("label", { class: "pub-toggle" + (n.public ? " on" : ""), title: n.public ? "Friends can see this" : "Only you can see this" }, el("input", { type: "checkbox", checked: n.public, onchange: async (e) => { await sb.from("notes").update({ public: e.target.checked, updated_at: new Date().toISOString() }).eq("id", n.id); load(); } }), n.public ? "Public" : "Private"),
          el("button", { class: "icon-btn", title: "Delete", style: "margin-left:auto", onclick: async () => { if (confirm("Delete this entry?")) { await sb.from("notes").delete().eq("id", n.id); load(); } } }, "✕")),
        el("div", { class: "note-body" + (n.kind === "quote" ? " quote" : "") }, n.body))),
        !(data || []).length ? el("p", { class: "muted small" }, "Nothing written yet. Everything starts private.") : null);
    }
    fill(overlay, el("div", { class: "crop-panel notes-panel" },
      el("div", { class: "row", style: "justify-content:space-between" }, el("div", {}, el("div", { class: "eyebrow" }, "Quotes, notes & journal"), el("h2", {}, title), author ? el("div", { class: "muted small" }, author) : null), el("button", { class: "icon-btn", onclick: () => overlay.remove() }, "✕")),
      el("form", { class: "stack", style: "gap:8px;margin:12px 0", onsubmit: async (e) => { e.preventDefault(); if (!body.value.trim()) return; const { error } = await sb.from("notes").insert({ user_id: me.id, book_title: title, book_author: author || "", kind: kindSel.value, body: body.value.trim(), public: pub.checked }); if (error) { toast(error.message); return; } const st = stats(me); st.notes_written = (st.notes_written || 0) + 1; if (kindSel.value === "quote") st.quotes_written = (st.quotes_written || 0) + 1; body.value = ""; pub.checked = false; load(); toast("Saved."); saveProfile({ stats: st }).catch(() => {}); } },
        el("div", { class: "row" }, kindSel, el("label", { class: "row", style: "gap:6px;margin-left:auto" }, pub, "Friends can see this")), body, el("div", { class: "row", style: "justify-content:flex-end" }, el("button", { class: "btn primary sm", type: "submit" }, "Add"))),
      el("div", { class: "sep" }), list));
    document.body.append(overlay); load();
  }

  // ---------- My Books: everything you read, by year (Tiffany's request) ----------
  async function pageBooks() {
    if (!titleIndex) await loadTitles();
    const page = el("div", { class: "stack" });
    const log = me.reading_log || (me.reading_log = []);
    const years = [...new Set(log.map(x => (x.finished || "").slice(0, 4)).filter(Boolean))].sort().reverse();
    const cur = String(new Date().getFullYear()); if (!years.includes(cur)) years.unshift(cur);
    let year = years[0];
    const tabs = el("div", { class: "year-tabs" }), listBox = el("div", { class: "stack" }), stats = el("div", { class: "stats", style: "margin:0" });
    async function save(msg) { await saveProfile({ reading_log: me.reading_log }); if (msg) toast(msg); drawAll(); if (titleIndex) loadTitles(); }
    function drawTabs() { fill(tabs, ...years.map(y => el("button", { class: "year-tab" + (y === year ? " on" : ""), onclick: () => { year = y; drawAll(); } }, y, el("small", {}, log.filter(x => (x.finished || "").startsWith(y)).length)))); }
    function drawStats() { const inYear = log.filter(x => (x.finished || "").startsWith(year)); const months = new Set(inYear.map(x => x.finished.slice(0, 7))).size;
      fill(stats, el("div", { class: "stat" }, el("b", {}, inYear.length), el("span", {}, "Read in " + year)), el("div", { class: "stat" }, el("b", {}, log.length), el("span", {}, "All time")), el("div", { class: "stat" }, el("b", {}, months ? (inYear.length / months).toFixed(1) : "0"), el("span", {}, "Per month"))); }
    function drawList() {
      log.forEach(inheritCover);
      const rows = log.map((x, i) => ({ x, i })).filter(r => (r.x.finished || "").startsWith(year)).sort((a, b) => (b.x.finished || "").localeCompare(a.x.finished || ""));
      fill(listBox, rows.length ? el("ul", { class: "books" }, ...rows.map(({ x, i }) => el("li", { class: "book log-row" },
        el("span", { class: "log-date" }, x.finished ? new Date(x.finished + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"),
        coverEl(x, true, (url) => { x.cover = url; save(); }),
        el("div", { class: "bmeta" }, el("div", { class: "title" }, x.title), el("div", { class: "author" }, kindPill(x, true, () => { x.kind = x.kind === "series" ? "book" : "series"; save(); }), contentSelect(x, () => save()), x.author ? " " + x.author : "")),
        el("div", { class: "tools" },
          el("button", { class: "icon-btn", title: "Quotes, notes and journal", onclick: () => openNotes(x.title, x.author) }, "📝"),
          el("button", { class: "icon-btn", title: "Change date finished", onclick: () => { const d = prompt("Date finished (YYYY-MM-DD):", x.finished || dayKey()); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) { x.finished = d; save(); } } }, "📅"),
          el("button", { class: "icon-btn", title: "Remove", onclick: () => { if (confirm(`Remove "${x.title}" from your books?`)) { log.splice(i, 1); save("Removed."); } } }, "✕"))))) :
        el("div", { class: "empty-books" }, `Nothing logged for ${year} yet. Add the books you finished below.`));
    }
    function drawAll() { drawTabs(); drawStats(); drawList(); }
    // add form
    let kind = "book", pendingFile = null, pendingCover = null;
    const t = el("input", { class: "input", placeholder: "Book you finished" }), a = el("input", { class: "input", placeholder: "Author (optional)" }), d = el("input", { class: "input", type: "date", value: dayKey() });
    const setKind = (k) => { kind = k; kindBtn.textContent = kind === "book" ? "Book" : "Series"; kindBtn.classList.toggle("series", kind === "series"); };
    const kindBtn = el("button", { class: "kind-toggle", type: "button", onclick: () => setKind(kind === "book" ? "series" : "book") }, "Book");
    const contentSel = el("select", { class: "input", style: "width:auto" }, ...CONTENT.map(c => el("option", { value: c.key }, c.key ? c.label : "Content?")));
    const picBtn = el("button", { class: "btn sm pic-btn", type: "button", title: "Attach a cover picture", onclick: () => pickAndCrop({ title: "Adjust the cover" }, (blob) => { pendingFile = blob; pendingCover = null; picBtn.textContent = "📷 ✓"; picBtn.classList.add("has-pic"); }) }, "📷");
    const twrap = el("div", { class: "suggest-wrap" }, t);
    attachSuggest(t, (hit) => { t.value = hit.title; if (hit.author && !a.value) a.value = hit.author; setKind(hit.kind === "series" ? "series" : "book"); if (hit.cover) { pendingCover = hit.cover; pendingFile = null; picBtn.textContent = "📷 ✓"; picBtn.classList.add("has-pic"); } });
    const addBtn = el("button", { class: "btn sm primary", type: "submit" }, "Add to my books");
    const form = el("form", { class: "add-book log-add", onsubmit: async (e) => { e.preventDefault(); if (!t.value.trim()) return; let cover = pendingCover; if (pendingFile) { addBtn.disabled = true; addBtn.textContent = "Uploading…"; try { cover = await uploadImage(pendingFile, "cover", 500); } catch (ex) { toast("Picture didn't upload: " + ex.message); } addBtn.disabled = false; addBtn.textContent = "Add to my books"; }
      log.push(inheritCover({ id: uid(), title: t.value.trim(), author: a.value.trim(), kind, content: contentSel.value, finished: d.value || dayKey(), cover: cover || undefined }));
      const y = (d.value || dayKey()).slice(0, 4); if (!years.includes(y)) { years.push(y); years.sort().reverse(); } year = y;
      t.value = ""; a.value = ""; pendingFile = pendingCover = null; picBtn.textContent = "📷"; picBtn.classList.remove("has-pic"); contentSel.value = ""; setKind("book");
      await save("Added. Nice one."); } },
      twrap, a, el("div", { class: "row", style: "gap:6px;flex-wrap:wrap" }, d, kindBtn, contentSel, picBtn, addBtn));
    // ----- Goals (earn bookmarks) -----
    const goals = me.goals || (me.goals = []);
    const goalsBox = el("div", { class: "card" });
    async function finishGoal(g) {
      g.done = true; g.doneAt = new Date().toISOString(); award(GOAL_LEVELS[g.level].reward);
      const ap = me.pet && myPets().find(z => z.id === me.pet.id); if (ap) { ap.xp = (ap.xp || 0) + (g.level === "hard" ? 40 : g.level === "medium" ? 20 : 10); setActivePet(ap.id); }
      const before = new Set(myBookmarks()); const legends = legendUnlocks(me.goals).filter(k => !before.has(k)); legends.forEach(k => myBookmarks().push(k));
      await saveProfile({ goals: me.goals, stats: me.stats, pet: me.pet, pets: myPets() }); updateTopbar();
      legends.forEach(k => toast(`🏆 Legendary bookmark: ${BOOKMARK_BY[k].name}`, "badge-toast"));
      pickBookmark(g.level, () => drawGoals());
      drawGoals();
    }
    function drawGoals() {
      const open = goals.filter(g => !g.done), done = goals.filter(g => g.done).slice(-6).reverse(); const nBm = myBookmarks().length;
      const txt = el("input", { class: "input", placeholder: "e.g. Finish two books this month, read 20 minutes a day, try a new genre" }); const lvl = el("select", { class: "input", style: "width:auto" }, ...Object.entries(GOAL_LEVELS).map(([k, v]) => el("option", { value: k }, v.name)));
      fill(goalsBox,
        el("div", { class: "row", style: "justify-content:space-between;align-items:flex-start;gap:12px" }, el("div", {}, el("div", { class: "eyebrow" }, "Goals & bookmarks"), el("h2", {}, open.length ? `${open.length} open goal${open.length > 1 ? "s" : ""}` : "Set a goal")), el("button", { class: "btn sm", onclick: openBookmarkBook }, `📖 My bookmarks · ${nBm}`)),
        el("p", { class: "muted small" }, "Set your own reading goals and mark them easy, medium, or difficult. Finishing one pays coins and XP and lets you pick a bookmark. Bookmarks only come from goals. Difficult ones glow."),
        ...open.map(g => el("div", { class: "goal-row" }, el("span", { class: "goal-lvl " + g.level }, GOAL_LEVELS[g.level].name), el("span", { class: "goal-text" }, g.text),
          el("div", { class: "row", style: "gap:4px;margin-left:auto" }, el("button", { class: "btn sm primary", onclick: () => finishGoal(g) }, "Done ✓"), el("button", { class: "icon-btn", title: "Remove", onclick: async () => { goals.splice(goals.indexOf(g), 1); await saveProfile({ goals: me.goals }); drawGoals(); } }, "✕")))),
        el("form", { class: "row", style: "margin-top:10px;flex-wrap:wrap", onsubmit: async (e) => { e.preventDefault(); if (!txt.value.trim()) return; goals.push({ id: uid(), text: txt.value.trim().slice(0, 120), level: lvl.value, done: false, created: new Date().toISOString() }); await saveProfile({ goals: me.goals }); drawGoals(); } }, el("div", { style: "flex:1;min-width:220px" }, txt), lvl, el("button", { class: "btn sm", type: "submit" }, "Add goal")),
        done.length ? el("div", { style: "margin-top:12px" }, el("div", { class: "eyebrow" }, "Finished"), ...done.map(g => el("div", { class: "goal-row done" }, el("span", { class: "goal-lvl " + g.level }, GOAL_LEVELS[g.level].name), el("span", { class: "goal-text" }, g.text), el("span", { class: "muted small", style: "margin-left:auto" }, new Date(g.doneAt).toLocaleDateString())))) : null);
    }
    drawGoals();

    // ----- To Be Read + reading now -----
    const tbr = me.tbr || (me.tbr = []);
    const tbrBox = el("div", { class: "card" });
    async function saveTbr(msg) { await saveProfile({ tbr: me.tbr }); if (msg) toast(msg); drawTbr(); }
    function drawTbr() {
      tbr.forEach(inheritCover);
      const st = me.stats || (me.stats = {}); const today = dayKey();
      const reading = tbr.filter(x => x.reading), queue = tbr.filter(x => !x.reading);
      const t2 = el("input", { class: "input", placeholder: "A book you want to read next" }), a2 = el("input", { class: "input", placeholder: "Author (optional)" });
      const w2 = el("div", { class: "suggest-wrap" }, t2); attachSuggest(t2, (hit) => { t2.value = hit.title; if (hit.author && !a2.value) a2.value = hit.author; });
      const row = (x) => el("li", { class: "book log-row tbr-row" + (x.reading ? " reading" : "") },
        el("span", { class: "log-date" }, x.reading ? "NOW" : "NEXT"),
        el("span", { class: "cover-wrap" }, coverEl(x, true, (url) => { x.cover = url; saveTbr(); }), x.reading && x.bookmark && BOOKMARK_BY[x.bookmark] ? bookmarkEl(BOOKMARK_BY[x.bookmark], "xs") : null),
        el("div", { class: "bmeta" }, el("div", { class: "title" }, x.title), el("div", { class: "author" }, x.author || ""),
          x.reading ? el("div", { class: "prog-row" }, el("input", { type: "range", min: 0, max: 100, step: 5, value: x.progress || 0, class: "prog", onchange: async (e) => { x.progress = +e.target.value; if (st.last_progress_day !== today) { st.last_progress_day = today; award("progress"); } await saveProfile({ tbr: me.tbr, stats: st }); drawTbr(); } }), el("span", { class: "prog-pct" }, (x.progress || 0) + "%")) : null),
        el("div", { class: "tools" },
          x.reading ? el("button", { class: "icon-btn", title: x.bookmark ? "Change bookmark" : "Set a bookmark in this book", onclick: () => { const own = myBookmarks(); if (!own.length) { toast("Finish a goal to earn your first bookmark."); return; } const m = el("div", { class: "crop-overlay", onclick: (e) => { if (e.target === m) m.remove(); } }, el("div", { class: "crop-panel" }, el("h2", {}, "Bookmark for " + x.title), el("div", { class: "bm-choices" }, ...own.map(k => BOOKMARK_BY[k]).filter(Boolean).map(b => el("button", { class: "bm-choice" + (x.bookmark === b.key ? " on" : ""), onclick: async () => { x.bookmark = b.key; await saveProfile({ tbr: me.tbr }); m.remove(); drawTbr(); } }, bookmarkEl(b, "md"), el("b", {}, b.name))), x.bookmark ? el("button", { class: "bm-choice", onclick: async () => { delete x.bookmark; await saveProfile({ tbr: me.tbr }); m.remove(); drawTbr(); } }, el("div", { class: "bm-ghost" }, "—"), el("b", {}, "None")) : null))); document.body.append(m); } }, "🔖") : null,
          x.reading ? el("button", { class: "btn sm primary", onclick: async () => { const i = tbr.indexOf(x); tbr.splice(i, 1); (me.reading_log = me.reading_log || []).push({ id: uid(), title: x.title, author: x.author || "", kind: x.kind || "book", content: x.content, spice: x.spice, violence: x.violence, finished: today, cover: x.cover }); award("finish"); const ap = me.pet && myPets().find(z => z.id === me.pet.id); if (ap) { ap.xp = (ap.xp || 0) + 15; setActivePet(ap.id); } await saveProfile({ tbr: me.tbr, reading_log: me.reading_log, pet: me.pet, pets: myPets() }); toast("Finished! Added to " + today.slice(0, 4) + "."); drawAll(); drawTbr(); if (titleIndex) loadTitles(); } }, "Finished it ✓") : el("button", { class: "btn sm", onclick: () => { x.reading = true; x.progress = x.progress || 0; saveTbr("Reading now. Slide the bar as you go."); } }, "Start reading"),
          el("button", { class: "icon-btn", title: "Quotes, notes and journal", onclick: () => openNotes(x.title, x.author) }, "📝"),
          el("button", { class: "icon-btn", title: "Remove", onclick: () => { tbr.splice(tbr.indexOf(x), 1); saveTbr("Removed."); } }, "✕")));
      fill(tbrBox,
        el("div", { class: "row", style: "justify-content:space-between;align-items:flex-start;gap:12px" },
          el("div", {}, el("div", { class: "eyebrow" }, "Reading now & to be read"), el("h2", {}, reading.length ? `Reading ${reading.length} · ${queue.length} up next` : `${queue.length} up next`)),
          el("button", { class: "btn sm" + (st.last_checkin === today ? " ghost" : " primary"), onclick: async () => { if (await checkInToday()) drawTbr(); } }, st.last_checkin === today ? `☀️ Read today · ${st.read_streak || 1} day streak` : "☀️ I read today")),
        el("p", { class: "muted small" }, "Check in on days you read to grow your pet and build a streak. Slide the bar to show how far you are. Friends see what you're reading only if you allow it on your profile."),
        (reading.length || queue.length) ? el("ul", { class: "books" }, ...reading.map(row), ...queue.map(row)) : el("div", { class: "empty-books" }, "Nothing lined up. Add the next book you want to read."),
        el("form", { class: "add-book", style: "border-top:none;padding:10px 0 0", onsubmit: (e) => { e.preventDefault(); if (!t2.value.trim()) return; tbr.push(inheritCover({ id: uid(), title: t2.value.trim(), author: a2.value.trim(), kind: "book", progress: 0, reading: false, added: today })); saveTbr("Added to your list."); } }, w2, a2, el("button", { class: "btn sm", type: "submit" }, "Add to list")));
    }
    drawTbr(); window.__redrawTbr = drawTbr;
    page.append(el("div", { class: "page-head" }, el("div", {}, el("div", { class: "eyebrow" }, "Reading record"), el("h1", {}, "My Books"), el("p", { class: "sub" }, "What you're reading, what's next, and every book you finish, kept by year. Tap 📝 on any book for quotes, notes, thoughts and journal entries. Each entry is private unless you make it public."))),
      tbrBox, goalsBox, stats, tabs, listBox, el("div", { class: "card" }, el("div", { class: "eyebrow" }, "Finished a book you didn't list?"), el("div", { style: "height:8px" }), form));
    drawAll(); return page;
  }

  // ---------- terms ----------
  function pageTerms() {
    return el("div", { class: "stack prose" },
      el("div", { class: "page-head" }, el("div", {}, el("div", { class: "eyebrow" }, "The fine print"), el("h1", {}, "Terms & agreement"), el("p", { class: "sub" }, "Shelfmates is a small site made by family for friends. These are the house rules."))),
      el("div", { class: "card stack" },
        el("p", {}, el("b", {}, "1. Books only. "), "Shelves, recommendations, covers, notes and pictures are for real books, audiobooks and series. Uploading random pictures, spam, or anything that isn't about books isn't allowed."),
        el("p", {}, el("b", {}, "2. Be decent. "), "No harassment, no hateful or sexual content, nothing illegal. Mark books that have a lot of swearing or explicit content so friends can decide for themselves."),
        el("p", {}, el("b", {}, "3. Don't mess with the app. "), "No bots, scripts, coin farming, fake accounts, or trying to get into other people's data."),
        el("p", {}, el("b", {}, "4. We can close accounts. "), "If someone breaks these rules, Joseph or Michael can remove content or terminate the account, with or without warning."),
        el("p", {}, el("b", {}, "5. Your stuff. "), "You own what you write. Public notes and your card can be seen by anyone signed in; private notes and your history are only visible to you. Passwords can't be reset by email, so write yours down. Lost it? Email ", el("a", { href: "mailto:" + HELP_EMAIL }, HELP_EMAIL), "."),
        el("p", {}, el("b", {}, "6. No promises. "), "This is a hobby project. It might go down, change, or lose data. We'll do our best, but there's no guarantee."),
        el("p", { class: "muted small" }, "Last updated September 9, 2026.")),
      session ? el("a", { class: "btn", href: "#/shelf" }, "Back to my shelf") : el("a", { class: "btn", href: "#/" }, "Back to sign in"));
  }

  // ---------- notices panel ----------
  function toggleNotices() {
    const box = $("#notices"); if (!box.hidden) { box.hidden = true; return; }
    fill(box, el("div", { class: "nh" }, "Notices", el("button", { class: "btn sm ghost", onclick: async () => { await sb.from("notices").update({ read: true }).eq("user_id", me.id).eq("read", false); await loadNotices(); box.hidden = true; toggleNotices(); } }, "Mark all read")),
      ...(notices.length ? notices.map(n => { const self = n.kind === "month"; return el("a", { class: "notice" + (n.read ? "" : " unread"), href: "#/" + (self ? "shelf" : (n.kind === "shelf" || n.kind === "rec_read" ? "u/" + (n.actor?.username || "") : "friends")), onclick: () => { box.hidden = true; } },
        el("span", { class: "nicon" }, self ? "🗓️" : n.kind === "shelf" ? "📚" : n.kind === "rec_read" ? "✅" : "🤝"),
        el("div", {}, self ? null : el("b", {}, n.actor?.display_name || "Someone"), (self ? "" : " ") + n.detail, el("div", { class: "when" }, ago(n.created_at)))); }) : [el("div", { class: "notice muted" }, "Nothing yet. When a friend updates their shelf, it shows up here.")]));
    box.hidden = false;
    sb.from("notices").update({ read: true }).eq("user_id", me.id).eq("read", false).then(loadNotices);
  }

  // ---------- boot ----------
  async function boot() {
    if (!CFG.SUPABASE_URL || CFG.SUPABASE_URL.startsWith("PASTE")) { fill($("#main"), el("div", { class: "loading" }, "Not connected yet. Fill in config.js with the Supabase URL and key.")); return; }
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    const { data } = await sb.auth.getSession(); session = data.session;
    $("#bell").addEventListener("click", toggleNotices);
    document.addEventListener("click", (e) => { const box = $("#notices"); if (!box.hidden && !box.contains(e.target) && !$("#bell").contains(e.target)) box.hidden = true; });
    window.addEventListener("hashchange", () => { if (dirty && !location.hash.startsWith("#/shelf") && !confirm("You have unsaved shelf changes. Leave anyway?")) { location.hash = "#/shelf"; return; } render(); });
    window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
    sb.auth.onAuthStateChange((_evt, s) => { session = s; if (!s) { me = null; render(); } });
    await render();
    setInterval(() => { if (me) loadNotices(); }, 60000);
  }
  window.__shelfmates = { cropImage, petParade };
  boot();
})();
