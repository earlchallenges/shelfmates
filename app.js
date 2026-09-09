/* Shelfmates — friends' favorite books by genre.
   Built from Michael's blueprint (2026-09-08). Single-page app on Supabase. */
(function () {
  "use strict";
  const CFG = window.SHELFMATES_CONFIG || {};
  const EMAIL_DOMAIN = "@shelfmates.app";
  const DEFAULT_CATEGORIES = ["Fantasy", "Science Fiction", "Mystery & Thriller", "Romance", "Non-fiction", "Kids & Family"];
  const MAX_PER_CATEGORY = 10;

  // ---------- badges ----------
  const BADGES = [
    { key: "first_shelf",  name: "First Shelf",          icon: "📚", how: "Set up your profile and add your first book." },
    { key: "first_friend", name: "Bookworm Buddy",       icon: "🤝", how: "Make your first friend." },
    { key: "five_friends", name: "Book Club",            icon: "☕", how: "Have 5 friends." },
    { key: "fresh_month",  name: "Fresh Shelf",          icon: "🗓️", how: "Update your shelf in the first week of a month." },
    { key: "streak_3",     name: "Three Months Running", icon: "🔥", how: "Update your shelf three months in a row." },
    { key: "excited",      name: "Can't Wait",           icon: "✨", how: "Mark a book you're most excited about." },
    { key: "curator",      name: "Curator",              icon: "🏷️", how: "Create your own category." },
    { key: "full_shelf",   name: "Full Shelf",           icon: "🏆", how: "Fill a category with all 10 books." },
    { key: "rec_giver",    name: "Recommender",          icon: "💬", how: "Recommend 3 books to other readers." },
    { key: "took_a_rec",   name: "Took a Rec",           icon: "✅", how: "Read a book a friend recommended." },
  ];
  // What more badges unlock (Michael: "the more badges you get ... the more options")
  const ACCENTS = [
    { key: "green", name: "Bookcloth green", hex: "#2E6E4E", need: 0 },
    { key: "rose",  name: "Rose",            hex: "#B3556A", need: 1 },
    { key: "gold",  name: "Gold leaf",       hex: "#B8891B", need: 2 },
    { key: "plum",  name: "Plum",            hex: "#6B4C8A", need: 3 },
    { key: "ocean", name: "Ocean",           hex: "#2A6F8F", need: 5 },
    { key: "ink",   name: "Ink",             hex: "#1C2320", need: 7 },
  ];
  const AVATARS = [
    { set: "Letters", need: 0, items: null }, // initial letter, always available
    { set: "Readers", need: 3, items: ["📖", "🧙", "🔍", "🚀", "🐉", "🌙"] },
    { set: "Creatures", need: 5, items: ["🦉", "🦊", "🐢", "🐈", "🦋", "🐝"] },
    { set: "Rare", need: 7, items: ["👑", "🗝️", "🕯️", "🧭", "⚔️", "🎩"] },
  ];

  // ---------- state ----------
  let sb = null, session = null, me = null, friends = [], pendingIn = [], pendingOut = [], notices = [];
  let draft = null; // editable copy of my shelf
  let dirty = false;
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
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const monthKey = (d = new Date()) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  const monthName = (k) => { const [y, m] = k.split("-"); return new Date(+y, +m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" }); };
  const ago = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago"; if (s < 86400 * 30) return Math.floor(s / 86400) + "d ago";
    return new Date(iso).toLocaleDateString();
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const bookCount = (p) => (p.categories || []).reduce((n, c) => n + (c.books || []).length, 0);
  const badgeCount = (p) => (p.badges || []).length;
  const hasBadge = (p, k) => (p.badges || []).some(b => b.key === k);

  const toastQ = [];
  function toast(msg, cls = "") {
    toastQ.push([msg, cls]); if (toast._busy) return; toast._busy = true;
    (function next() {
      const item = toastQ.shift(); const t = $("#toast");
      if (!item) { t.hidden = true; toast._busy = false; return; }
      t.textContent = item[0]; t.className = "toast " + item[1]; t.hidden = false;
      setTimeout(() => { t.hidden = true; setTimeout(next, 250); }, 2600);
    })();
  }
  function applyTheme() {
    document.documentElement.dataset.accent = me?.accent || "green";
  }

  // ---------- auth ----------
  async function signUp(username, password, displayName) {
    username = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error("Username: 3 to 20 letters, numbers, or underscores.");
    if (password.length < 6) throw new Error("Password needs at least 6 characters.");
    const { data, error } = await sb.auth.signUp({ email: username + EMAIL_DOMAIN, password });
    if (error) throw new Error(/already/i.test(error.message) ? "That username is taken." : error.message);
    if (!data.session) throw new Error("Sign-up worked but no session came back. Ask Joseph to turn off email confirmation in Supabase.");
    session = data.session;
    const profile = { id: session.user.id, username, display_name: displayName.trim() || username, avatar: username[0].toUpperCase(),
      categories: DEFAULT_CATEGORIES.map(name => ({ name, custom: false, books: [] })) };
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
  async function loadMe() {
    const { data, error } = await sb.from("profiles").select("*").eq("id", session.user.id).single();
    if (error) throw error;
    me = data; draft = clone({ categories: me.categories, recommendations: me.recommendations }); dirty = false; applyTheme();
  }
  async function loadFriends() {
    const { data, error } = await sb.from("friendships").select("*, r:profiles!friendships_requester_fkey(id,username,display_name,avatar,accent,categories,recommendations,badges,updated_at), a:profiles!friendships_addressee_fkey(id,username,display_name,avatar,accent,categories,recommendations,badges,updated_at)");
    if (error) throw error;
    friends = []; pendingIn = []; pendingOut = [];
    for (const f of data) {
      const other = f.requester === me.id ? f.a : f.r;
      if (f.status === "accepted") friends.push({ ...other, fid: f.id });
      else if (f.addressee === me.id) pendingIn.push({ ...other, fid: f.id });
      else pendingOut.push({ ...other, fid: f.id });
    }
    friends.sort((x, y) => new Date(y.updated_at) - new Date(x.updated_at));
  }
  async function loadNotices() {
    const { data } = await sb.from("notices").select("*, actor:profiles!notices_actor_id_fkey(username,display_name,avatar)").eq("user_id", me.id).order("created_at", { ascending: false }).limit(30);
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
    const newBadges = computeBadges(me, friends.length);
    const earned = newBadges.filter(b => !hasBadge(before, b.key));
    me.badges = newBadges; me.updated_at = new Date().toISOString();
    const { error } = await sb.from("profiles").update({ ...patch, badges: me.badges, updated_at: me.updated_at }).eq("id", me.id);
    if (error) { Object.assign(me, before); throw error; }
    applyTheme();
    for (const b of earned) { const def = BADGES.find(x => x.key === b.key); toast(`${def.icon} Badge earned: ${def.name}`, "badge-toast"); }
    if (announce && friends.length) await notify(friends.map(f => f.id), "shelf", "updated their shelf");
    return earned;
  }
  async function checkBadges() {
    const fresh = computeBadges(me, friends.length);
    if (fresh.length !== (me.badges || []).length) await saveProfile({});
  }
  function computeBadges(p, friendCount) {
    const have = clone(p.badges || []);
    const add = (key) => { if (!have.some(b => b.key === key)) have.push({ key, at: new Date().toISOString() }); };
    const books = bookCount(p);
    if (p.display_name && books >= 1) add("first_shelf");
    if (friendCount >= 1) add("first_friend");
    if (friendCount >= 5) add("five_friends");
    if ((p.categories || []).some(c => (c.books || []).some(b => b.excited))) add("excited");
    if ((p.categories || []).some(c => c.custom)) add("curator");
    if ((p.categories || []).some(c => (c.books || []).length >= MAX_PER_CATEGORY)) add("full_shelf");
    if ((p.recommendations || []).length >= 3) add("rec_giver");
    if ((p.recs_read || []).length >= 1) add("took_a_rec");
    const months = p.months_updated || [];
    if (months.length && p._freshThisMonth) add("fresh_month");
    // streak: three consecutive months ending in the latest
    const sorted = [...new Set(months)].sort();
    let streak = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
      const [y1, m1] = sorted[i].split("-").map(Number), [y0, m0] = sorted[i - 1].split("-").map(Number);
      if (y1 * 12 + m1 - (y0 * 12 + m0) === 1) streak++; else break;
    }
    if (streak >= 3) add("streak_3");
    return have;
  }
  async function saveShelf() {
    const mk = monthKey(); const months = [...new Set([...(me.months_updated || []), mk])];
    const dayOfMonth = new Date().getDate();
    me._freshThisMonth = dayOfMonth <= 7;
    await saveProfile({ categories: draft.categories, recommendations: draft.recommendations, months_updated: months }, { announce: true });
    delete me._freshThisMonth;
    // private history snapshot for this month
    await sb.from("history").upsert({ user_id: me.id, month: mk, snapshot: { categories: draft.categories, recommendations: draft.recommendations } }, { onConflict: "user_id,month" });
    dirty = false; toast("Shelf saved. Your friends will get a notice.");
  }

  // ---------- routing ----------
  const routes = {
    "": pageAuth, "/": pageAuth, "/shelf": pageShelf, "/friends": pageFriends, "/badges": pageBadges, "/card": pageCard, "/profile": pageProfile, "/history": pageHistory,
  };
  function route() {
    const h = location.hash.replace(/^#/, "") || "/";
    if (h.startsWith("/u/")) return { fn: pageCard, arg: h.slice(3) };
    return { fn: routes[h] || pageShelf, key: h };
  }
  async function render() {
    const main = $("#main"); const r = route();
    document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("active", "#" + r.key === a.getAttribute("href")));
    if (!session) { $("#nav").hidden = true; $("#topbar-right").hidden = true; fill(main, pageAuth()); return; }
    if (!me) { fill(main, el("div", { class: "loading" }, "Opening your shelf…")); try { await loadMe(); await loadFriends(); await loadNotices(); await checkBadges(); } catch (e) { fill(main, el("div", { class: "loading" }, "Couldn't load your profile: " + e.message)); return; } }
    $("#nav").hidden = false; $("#topbar-right").hidden = false;
    fill($("#me-chip"), avatarEl(me), el("span", { class: "nm" }, me.display_name));
    if (r.key === "/" || r.key === "") { location.hash = "#/shelf"; return; }
    fill(main, await r.fn(r.arg));
    window.scrollTo(0, 0);
  }
  function avatarEl(p, size = "") {
    const isEmoji = p.avatar && p.avatar.length > 1;
    const a = el("span", { class: "avatar " + size, style: isEmoji ? "background:var(--surface-2)" : "" }, p.avatar || "?");
    if (p.accent && p.accent !== "green") a.style.background = isEmoji ? "" : (ACCENTS.find(x => x.key === p.accent)?.hex || "");
    return a;
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
      const form = el("form", { onsubmit: async (e) => {
        e.preventDefault(); err.textContent = ""; const b = form.querySelector("button[type=submit]"); b.disabled = true;
        try { if (mode === "login") await signIn(user.value, pass.value); else await signUp(user.value, pass.value, name.value); await loadMe(); await loadFriends(); await loadNotices(); location.hash = "#/shelf"; render(); }
        catch (ex) { err.textContent = ex.message; b.disabled = false; }
      } },
        el("div", { class: "field" }, el("label", {}, "Username"), user),
        mode === "signup" ? el("div", { class: "field" }, el("label", {}, "Your name"), name) : null,
        el("div", { class: "field" }, el("label", {}, "Password"), pass,
          mode === "signup" ? el("div", { class: "warn setup-note" }, el("b", {}, "Write your password down. "), "There's no reset by email. If you lose it, ask Joseph.") : null),
        err,
        el("button", { class: "btn primary", type: "submit" }, mode === "login" ? "Open my shelf" : "Create my profile"),
      );
      fill(wrap, 
        el("h1", {}, mode === "login" ? "Welcome back." : "Start your shelf."),
        el("p", { class: "lede" }, mode === "login" ? "See what your friends are reading and what they can't wait to start." : "A username and a password. That's the whole sign-up. You get your first badge for setting it up."),
        form,
        el("div", { class: "switch" }, mode === "login" ? "New here? " : "Already have a shelf? ",
          el("button", { onclick: () => { mode = mode === "login" ? "signup" : "login"; draw(); } }, mode === "login" ? "Create a profile" : "Log in")),
      );
    };
    draw(); return wrap;
  }

  async function pageShelf() {
    const page = el("div", { class: "stack" });
    const head = el("div", { class: "page-head" },
      el("div", {}, el("div", { class: "eyebrow" }, monthName(monthKey())), el("h1", {}, "My Shelf"),
        el("p", { class: "sub" }, "Your favorite 0 to 10 books in each category, ranked. Star the one you're most excited about. Save when you're done.")),
      el("button", { class: "btn", onclick: addCategory }, "+ New category"));
    const shelf = el("div", { class: "shelf" });
    const recs = el("div", { class: "card" });
    const saveBar = el("div", { class: "sticky-save" });
    page.append(head, shelf, recs, saveBar);
    function markDirty() { dirty = true; drawSave(); }
    function drawSave() {
      fill(saveBar, 
        dirty ? el("span", { class: "dirty-note" }, "Unsaved changes") : null,
        dirty ? el("button", { class: "btn ghost", onclick: () => { draft = clone({ categories: me.categories, recommendations: me.recommendations }); dirty = false; drawAll(); } }, "Discard") : null,
        el("button", { class: "btn primary", disabled: !dirty, onclick: async (e) => { e.target.disabled = true; try { await saveShelf(); drawAll(); } catch (ex) { toast("Save failed: " + ex.message); e.target.disabled = false; } } }, "Save shelf"),
      );
    }
    function addCategory() {
      const name = prompt("Name your category (e.g. Church books, Audiobooks, Graphic novels):");
      if (!name || !name.trim()) return;
      draft.categories.push({ name: name.trim().slice(0, 40), custom: true, books: [] }); markDirty(); drawShelf();
    }
    function drawShelf() {
      fill(shelf, ...draft.categories.map((cat, ci) => {
        const books = cat.books || (cat.books = []);
        const list = el("ul", { class: "books" });
        if (!books.length) list.append(el("li", { class: "empty-books" }, "Nothing here yet. Add a book below."));
        books.forEach((b, bi) => {
          list.append(el("li", { class: "book" },
            el("span", { class: "rank" + (bi === 0 ? " top" : "") }, bi + 1),
            el("div", {}, el("div", { class: "title" }, b.title, b.excited ? el("span", { class: "excited" }, "Most excited") : null), b.author ? el("div", { class: "author" }, b.author) : null),
            el("div", { class: "tools" },
              el("button", { class: "icon-btn star" + (b.excited ? " on" : ""), title: "Most excited about this one", onclick: () => { const was = b.excited; books.forEach(x => x.excited = false); b.excited = !was; markDirty(); drawShelf(); } }, "★"),
              el("button", { class: "icon-btn", title: "Move up", disabled: bi === 0, onclick: () => { [books[bi - 1], books[bi]] = [books[bi], books[bi - 1]]; markDirty(); drawShelf(); } }, "↑"),
              el("button", { class: "icon-btn", title: "Move down", disabled: bi === books.length - 1, onclick: () => { [books[bi + 1], books[bi]] = [books[bi], books[bi + 1]]; markDirty(); drawShelf(); } }, "↓"),
              el("button", { class: "icon-btn", title: "Remove", onclick: () => { books.splice(bi, 1); markDirty(); drawShelf(); } }, "✕"),
            )));
        });
        const t = el("input", { class: "input", placeholder: "Book title" }), a = el("input", { class: "input", placeholder: "Author (optional)" });
        const addRow = el("form", { class: "add-book", onsubmit: (e) => { e.preventDefault(); if (!t.value.trim()) return; if (books.length >= MAX_PER_CATEGORY) { toast("That category is full at 10. Remove one to add another."); return; } books.push({ title: t.value.trim(), author: a.value.trim(), excited: false }); markDirty(); drawShelf(); } },
          t, a, el("button", { class: "btn sm", type: "submit" }, "Add"));
        return el("section", { class: "category" },
          el("div", { class: "category-head" }, el("h2", {}, cat.name), cat.custom ? el("span", { class: "custom-tag" }, "Yours") : null,
            el("span", { class: "count" + (books.length >= MAX_PER_CATEGORY ? " full" : "") }, books.length >= MAX_PER_CATEGORY ? "Full · 10 of 10" : `${books.length} of ${MAX_PER_CATEGORY}`),
            cat.custom ? el("button", { class: "icon-btn", title: "Remove category", onclick: () => { if (confirm(`Remove "${cat.name}" and its books?`)) { draft.categories.splice(ci, 1); markDirty(); drawShelf(); } } }, "✕") : null),
          list, books.length < MAX_PER_CATEGORY ? addRow : null);
      }));
    }
    function drawRecs() {
      const list = draft.recommendations || (draft.recommendations = []);
      const t = el("input", { class: "input", placeholder: "Book title" }), a = el("input", { class: "input", placeholder: "Author" }), n = el("input", { class: "input", placeholder: "Why should they read it?" });
      fill(recs, 
        el("div", { class: "eyebrow" }, "For other readers"),
        el("h2", {}, "My recommendations"),
        el("p", { class: "muted small" }, "Books you'd hand to a friend. Friends can mark one as read and you both get credit."),
        el("div", { class: "sep" }),
        ...list.map((r, i) => el("div", { class: "rec" }, el("div", {}, el("div", { class: "title" }, r.title, r.author ? el("small", { class: "muted" }, " · " + r.author) : null), r.note ? el("div", { class: "note" }, r.note) : null),
          el("button", { class: "icon-btn", title: "Remove", onclick: () => { list.splice(i, 1); markDirty(); drawRecs(); } }, "✕"))),
        el("form", { class: "add-book", style: "grid-template-columns:1fr 1fr 2fr auto;border-top:none;padding:12px 0 0", onsubmit: (e) => { e.preventDefault(); if (!t.value.trim()) return; list.push({ id: uid(), title: t.value.trim(), author: a.value.trim(), note: n.value.trim() }); markDirty(); drawRecs(); } }, t, a, n, el("button", { class: "btn sm", type: "submit" }, "Add")),
      );
    }
    function drawAll() { drawShelf(); drawRecs(); drawSave(); }
    drawAll();
    return page;
  }

  async function pageFriends() {
    await loadFriends();
    const page = el("div", { class: "stack" });
    const search = el("input", { class: "input", placeholder: "Friend's username", autocapitalize: "none" });
    const addForm = el("form", { class: "input-row", onsubmit: async (e) => {
      e.preventDefault(); const u = search.value.trim().toLowerCase(); if (!u) return;
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
      el("button", { class: "btn sm primary", style: "margin-left:auto", onclick: async () => { await sb.from("friendships").update({ status: "accepted" }).eq("id", p.fid); await notify([p.id], "friend_accepted", "accepted your friend request"); await loadFriends(); await saveProfile({}); page.replaceWith(await pageFriends()); } }, "Accept"),
      el("button", { class: "btn sm ghost", onclick: async () => { await sb.from("friendships").delete().eq("id", p.fid); page.replaceWith(await pageFriends()); } }, "Ignore")))));
    if (pendingOut.length) page.append(el("p", { class: "muted small" }, "Waiting on: " + pendingOut.map(p => p.display_name).join(", ")));
    if (!friends.length) page.append(el("div", { class: "card", style: "text-align:center;padding:40px" }, el("h2", {}, "No friends yet"), el("p", { class: "muted" }, "Add one above. Your first friend earns you a badge.")));
    else page.append(el("div", { class: "friend-list" }, ...friends.map(friendCard)));
    return page;
  }
  function friendCard(p) {
    const excited = []; (p.categories || []).forEach(c => (c.books || []).forEach(b => { if (b.excited) excited.push({ cat: c.name, ...b }); }));
    const tops = (p.categories || []).filter(c => (c.books || []).length).slice(0, 4).map(c => ({ cat: c.name, ...c.books[0] }));
    const fresh = (Date.now() - new Date(p.updated_at).getTime()) < 7 * 86400e3;
    return el("a", { class: "card friend", href: "#/u/" + p.username },
      el("div", { class: "friend-top" }, avatarEl(p, "lg"), el("div", {}, el("div", { class: "name" }, p.display_name), el("div", { class: "handle" }, "@" + p.username + " · " + badgeCount(p) + " badges"),
        el("div", { class: "updated-ago" + (fresh ? " fresh" : "") }, "Updated " + ago(p.updated_at)))),
      excited[0] ? el("div", { class: "pick", style: "background:var(--rose-soft)" }, el("span", { class: "cat", style: "color:var(--rose)" }, "Most excited about"), el("span", { class: "t" }, excited[0].title), excited[0].author ? el("span", { class: "a" }, excited[0].author) : null) : null,
      ...tops.map(t => el("div", { class: "pick" }, el("span", { class: "cat" }, "#1 " + t.cat), el("span", { class: "t" }, t.title), t.author ? el("span", { class: "a" }, t.author) : null)),
      !tops.length ? el("p", { class: "muted small" }, "Hasn't added books yet.") : null,
      el("span", { class: "more" }, "See full card →"));
  }

  async function pageBadges() {
    const page = el("div", { class: "stack" });
    const n = badgeCount(me); const next = ACCENTS.concat(AVATARS.map(a => ({ name: a.set + " avatars", need: a.need }))).filter(x => x.need > n).sort((a, b) => a.need - b.need)[0];
    page.append(el("div", { class: "page-head" }, el("div", {}, el("h1", {}, "Badges"), el("p", { class: "sub" }, `${n} of ${BADGES.length} earned. ` + (next ? `Next unlock at ${next.need}: ${next.name}.` : "You've unlocked everything.")))));
    page.append(el("div", { class: "progress" }, el("i", { style: `width:${(n / BADGES.length) * 100}%` })));
    page.append(el("div", { class: "badge-grid" }, ...BADGES.map(b => { const got = (me.badges || []).find(x => x.key === b.key); return el("div", { class: "badge" + (got ? "" : " locked") }, el("div", { class: "medal" }, b.icon), el("div", {}, el("div", { class: "bname" }, b.name), el("div", { class: "bhow" }, b.how), got ? el("div", { class: "bwhen" }, "Earned " + new Date(got.at).toLocaleDateString()) : null)); })));
    page.append(el("div", { class: "card" }, el("div", { class: "eyebrow" }, "What badges unlock"), el("div", { style: "height:8px" }), el("ul", { class: "unlock-list" },
      ...ACCENTS.filter(a => a.need).map(a => el("li", { class: n >= a.need ? "done" : "" }, el("span", {}, a.name + " accent"), el("span", {}, n >= a.need ? "Unlocked" : a.need + " badges"))),
      ...AVATARS.filter(a => a.need).map(a => el("li", { class: n >= a.need ? "done" : "" }, el("span", {}, a.set + " avatars"), el("span", {}, n >= a.need ? "Unlocked" : a.need + " badges"))))));
    return page;
  }

  async function pageCard(username) {
    let p = me;
    if (username && username !== me.username) {
      const { data } = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
      if (!data) return el("div", { class: "loading" }, "No shelf at @" + username + ".");
      p = data;
    }
    const mine = p.id === me.id;
    const isFriend = friends.some(f => f.id === p.id);
    const excited = []; (p.categories || []).forEach(c => (c.books || []).forEach(b => { if (b.excited) excited.push({ cat: c.name, ...b }); }));
    const cats = (p.categories || []).filter(c => (c.books || []).length);
    const hex = ACCENTS.find(a => a.key === p.accent)?.hex || ACCENTS[0].hex;
    const card = el("div", { class: "share-card", id: "share-card", style: `--c:${hex}` },
      el("div", { class: "top" }, avatarEl(p, "xl"), el("div", {}, el("div", { class: "nm" }, p.display_name), el("div", { class: "hd" }, "@" + p.username))),
      p.tagline ? el("div", { class: "tag" }, "“" + p.tagline + "”") : null,
      el("div", { class: "stats" }, el("div", { class: "stat" }, el("b", {}, bookCount(p)), el("span", {}, "Books")), el("div", { class: "stat" }, el("b", {}, cats.length), el("span", {}, "Shelves")), el("div", { class: "stat" }, el("b", {}, badgeCount(p)), el("span", {}, "Badges"))),
      el("div", { class: "card-list" },
        excited[0] ? el("div", { class: "cl" }, el("span", { class: "k", style: "color:var(--rose)" }, "Can't wait"), el("span", { class: "v" }, excited[0].title, excited[0].author ? el("small", {}, " · " + excited[0].author) : null)) : null,
        ...cats.map(c => el("div", { class: "cl" }, el("span", { class: "k" }, c.name), el("span", { class: "v" }, c.books[0].title, c.books[0].author ? el("small", {}, " · " + c.books[0].author) : null, c.books.length > 1 ? el("small", {}, ` +${c.books.length - 1} more`) : null)))),
      (p.badges || []).length ? el("div", { style: "margin-top:14px;font-size:1.2rem;letter-spacing:.1em" }, (p.badges || []).map(b => BADGES.find(x => x.key === b.key)?.icon || "").join(" ")) : null,
      el("div", { class: "card-foot" }, el("span", {}, "Shelfmates"), el("span", {}, "Updated " + ago(p.updated_at))));
    const page = el("div", { class: "stack" },
      el("div", { class: "page-head" }, el("div", {}, el("h1", {}, mine ? "My Card" : p.display_name + "'s card"), el("p", { class: "sub" }, mine ? "Your stats and top books in one card. Send the link to a friend, or download it as a picture." : "Top book from each of their shelves."))),
      card,
      el("div", { class: "card-actions" },
        el("button", { class: "btn", onclick: () => { const link = location.origin + location.pathname + "#/u/" + p.username; navigator.clipboard?.writeText(link).then(() => toast("Link copied.")).catch(() => prompt("Copy this link:", link)); } }, "Copy link"),
        el("button", { class: "btn", onclick: () => downloadCard(p, hex) }, "Download picture"),
        !mine && !isFriend ? el("button", { class: "btn primary", onclick: async () => { const { error } = await sb.from("friendships").insert({ requester: me.id, addressee: p.id }); if (error) toast("Request already sent."); else { await notify([p.id], "friend_request", "wants to be your friend"); toast("Friend request sent."); } } }, "Add friend") : null));
    // Full shelves + recommendations below the card (friends only, per Michael: history stays private)
    if (mine || isFriend) {
      page.append(el("div", { class: "eyebrow", style: "margin-top:10px" }, mine ? "Everything on my shelf" : "Everything on their shelf"));
      page.append(...cats.map(c => el("section", { class: "category" }, el("div", { class: "category-head" }, el("h2", {}, c.name), el("span", { class: "count" }, c.books.length + " of 10")),
        el("ul", { class: "books" }, ...c.books.map((b, i) => el("li", { class: "book" }, el("span", { class: "rank" + (i === 0 ? " top" : "") }, i + 1), el("div", {}, el("div", { class: "title" }, b.title, b.excited ? el("span", { class: "excited" }, "Most excited") : null), b.author ? el("div", { class: "author" }, b.author) : null), el("span")))))));
      const recs = p.recommendations || [];
      if (recs.length) page.append(el("div", { class: "card" }, el("div", { class: "eyebrow" }, mine ? "My recommendations" : p.display_name + " recommends"), el("div", { class: "sep" }),
        ...recs.map(r => { const key = p.username + ":" + r.id; const read = (me.recs_read || []).includes(key); return el("div", { class: "rec" }, el("div", {}, el("div", { class: "title" }, r.title, r.author ? el("small", { class: "muted" }, " · " + r.author) : null), r.note ? el("div", { class: "note" }, r.note) : null),
          mine ? null : el("button", { class: "btn sm" + (read ? " ghost" : ""), onclick: async (e) => { if (read) return; const list = [...(me.recs_read || []), key]; await saveProfile({ recs_read: list }); await notify([p.id], "rec_read", `read your recommendation "${r.title}"`); e.target.textContent = "Read ✓"; e.target.classList.add("ghost"); toast("Nice. That counts toward a badge."); } }, read ? "Read ✓" : "I read it")); })));
    }
    return page;
  }
  function downloadCard(p, hex) {
    const W = 900, H = 1200, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
    const dark = matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
    x.fillStyle = dark ? "#1D2321" : "#FFFFFF"; x.fillRect(0, 0, W, H); x.fillStyle = hex; x.fillRect(0, 0, W, 22);
    const ink = dark ? "#EEF0EC" : "#1C2320", muted = dark ? "#9AA59F" : "#5F6B66";
    x.fillStyle = hex; x.beginPath(); x.arc(110, 140, 60, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#fff"; x.font = "700 56px Fraunces, Georgia, serif"; x.textAlign = "center"; x.fillText(p.avatar || "?", 110, 160); x.textAlign = "left";
    x.fillStyle = ink; x.font = "700 54px Fraunces, Georgia, serif"; x.fillText(p.display_name, 200, 130);
    x.fillStyle = muted; x.font = "400 30px 'Source Sans 3', Arial, sans-serif"; x.fillText("@" + p.username, 200, 172);
    let y = 250; if (p.tagline) { x.font = "italic 30px 'Source Sans 3', Arial"; x.fillStyle = muted; x.fillText("“" + p.tagline + "”", 60, y); y += 50; }
    const cats = (p.categories || []).filter(c => (c.books || []).length);
    const stats = [[bookCount(p), "BOOKS"], [cats.length, "SHELVES"], [badgeCount(p), "BADGES"]];
    stats.forEach((s, i) => { const sx = 60 + i * 270; x.fillStyle = dark ? "#242B28" : "#EFEEE8"; roundRect(x, sx, y, 240, 110, 18); x.fillStyle = ink; x.font = "700 60px Fraunces, Georgia, serif"; x.fillText(String(s[0]), sx + 24, y + 68); x.fillStyle = muted; x.font = "700 20px 'Source Sans 3', Arial"; x.fillText(s[1], sx + 24, y + 96); });
    y += 160;
    const excited = []; (p.categories || []).forEach(c => (c.books || []).forEach(b => { if (b.excited) excited.push(b); }));
    const line = (k, v, kc) => { x.fillStyle = kc; x.font = "700 20px 'Source Sans 3', Arial"; x.fillText(k.toUpperCase(), 60, y); x.fillStyle = ink; x.font = "600 34px Fraunces, Georgia, serif"; x.fillText(fit(x, v, 780), 60, y + 42); y += 92; };
    if (excited[0]) line("Can't wait", excited[0].title + (excited[0].author ? " · " + excited[0].author : ""), "#B3556A");
    cats.slice(0, 7).forEach(c => line(c.name, c.books[0].title + (c.books[0].author ? " · " + c.books[0].author : ""), hex));
    x.fillStyle = muted; x.font = "400 24px 'Source Sans 3', Arial"; x.fillText("Shelfmates", 60, H - 50);
    const a = document.createElement("a"); a.download = p.username + "-shelfmates.png"; a.href = c.toDataURL("image/png"); a.click();
    function roundRect(ctx, X, Y, w, h, r) { ctx.beginPath(); ctx.moveTo(X + r, Y); ctx.arcTo(X + w, Y, X + w, Y + h, r); ctx.arcTo(X + w, Y + h, X, Y + h, r); ctx.arcTo(X, Y + h, X, Y, r); ctx.arcTo(X, Y, X + w, Y, r); ctx.closePath(); ctx.fill(); }
    function fit(ctx, s, max) { while (ctx.measureText(s).width > max && s.length > 3) s = s.slice(0, -2); return s.length < String(s).length ? s + "…" : s; }
  }

  async function pageProfile() {
    const n = badgeCount(me);
    const name = el("input", { class: "input", value: me.display_name }), tag = el("input", { class: "input", value: me.tagline || "", placeholder: "One line about you as a reader", maxlength: 80 });
    let accent = me.accent || "green", avatar = me.avatar;
    const sw = el("div", { class: "swatches" }), av = el("div", { class: "stack" });
    const drawSw = () => fill(sw, ...ACCENTS.map(a => el("button", { class: "swatch" + (a.key === accent ? " on" : "") + (n < a.need ? " locked" : ""), style: `background:${a.hex}`, title: n < a.need ? `${a.name} — unlocks at ${a.need} badges` : a.name, onclick: () => { if (n < a.need) { toast(`${a.name} unlocks at ${a.need} badges.`); return; } accent = a.key; document.documentElement.dataset.accent = accent; drawSw(); } })));
    const drawAv = () => fill(av, ...AVATARS.map(set => el("div", {}, el("div", { class: "eyebrow" }, set.set + (n < set.need ? ` · unlocks at ${set.need} badges` : "")), el("div", { style: "height:6px" }), el("div", { class: "avatars" },
      ...(set.items || [me.username[0].toUpperCase(), (me.display_name || "?")[0].toUpperCase()]).filter((v, i, arr) => arr.indexOf(v) === i).map(it => el("button", { class: "av-opt" + (it === avatar ? " on" : "") + (n < set.need ? " locked" : ""), onclick: () => { if (n < set.need) return; avatar = it; drawAv(); } }, it))))));
    drawSw(); drawAv();
    return el("div", { class: "stack" },
      el("div", { class: "page-head" }, el("div", {}, el("h1", {}, "My profile"), el("p", { class: "sub" }, "A little customizing. More badges, more choices."))),
      el("div", { class: "card stack" },
        el("div", { class: "field" }, el("label", {}, "Name"), name),
        el("div", { class: "field" }, el("label", {}, "Tagline"), tag),
        el("div", { class: "field" }, el("label", {}, "Accent color"), sw),
        el("div", { class: "field" }, el("label", {}, "Avatar"), av),
        el("div", { class: "row" }, el("button", { class: "btn primary", onclick: async () => { try { await saveProfile({ display_name: name.value.trim() || me.username, tagline: tag.value.trim(), accent, avatar }); toast("Profile saved."); render(); } catch (e) { toast("Couldn't save: " + e.message); } } }, "Save profile"),
          el("a", { class: "btn ghost", href: "#/history" }, "My history"), el("button", { class: "btn ghost danger", style: "margin-left:auto", onclick: signOut }, "Log out"))),
      el("p", { class: "hint" }, "Username: @" + me.username + ". Usernames can't be changed."));
  }

  async function pageHistory() {
    const { data } = await sb.from("history").select("month,snapshot,created_at").eq("user_id", me.id).order("month", { ascending: false });
    const rows = data || [];
    return el("div", { class: "stack" },
      el("div", { class: "page-head" }, el("div", {}, el("h1", {}, "My history"), el("p", { class: "sub" }, "A snapshot of your shelf for every month you saved it. Only you can see this."))),
      el("div", { class: "card" }, rows.length ? rows.map(r => { const cats = (r.snapshot.categories || []).filter(c => (c.books || []).length); return el("div", { class: "history-month" }, el("div", { class: "m" }, monthName(r.month)), ...cats.map(c => el("div", { class: "l" }, el("b", {}, c.name + ": "), c.books.map(b => b.title).join(", ")))); }) : el("p", { class: "muted" }, "Save your shelf once and this month will show up here.")));
  }

  // ---------- notices panel ----------
  function toggleNotices() {
    const box = $("#notices"); if (!box.hidden) { box.hidden = true; return; }
    fill(box, el("div", { class: "nh" }, "Notices", el("button", { class: "btn sm ghost", onclick: async () => { await sb.from("notices").update({ read: true }).eq("user_id", me.id).eq("read", false); await loadNotices(); toggleNotices(); toggleNotices(); } }, "Mark all read")),
      ...(notices.length ? notices.map(n => el("a", { class: "notice" + (n.read ? "" : " unread"), href: "#/" + (n.kind === "shelf" || n.kind === "rec_read" ? "u/" + (n.actor?.username || "") : "friends"), onclick: () => { box.hidden = true; } },
        el("div", {}, el("b", {}, n.actor?.display_name || "Someone"), " " + n.detail, el("div", { class: "when" }, ago(n.created_at))))) : [el("div", { class: "notice muted" }, "Nothing yet. When a friend updates their shelf, it shows up here.")]));
    box.hidden = false;
    sb.from("notices").update({ read: true }).eq("user_id", me.id).eq("read", false).then(loadNotices);
  }

  // ---------- boot ----------
  async function boot() {
    if (!CFG.SUPABASE_URL || CFG.SUPABASE_URL.startsWith("PASTE")) { fill($("#main"), el("div", { class: "loading" }, "Not connected yet. Fill in config.js with the Supabase URL and anon key.")); return; }
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    const { data } = await sb.auth.getSession(); session = data.session;
    $("#bell").addEventListener("click", toggleNotices);
    document.addEventListener("click", (e) => { const box = $("#notices"); if (!box.hidden && !box.contains(e.target) && !$("#bell").contains(e.target)) box.hidden = true; });
    window.addEventListener("hashchange", () => { if (dirty && !location.hash.startsWith("#/shelf") && !confirm("You have unsaved shelf changes. Leave anyway?")) { location.hash = "#/shelf"; return; } render(); });
    window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
    sb.auth.onAuthStateChange((_evt, s) => { session = s; if (!s) { me = null; render(); } });
    await render();
    // live notices: refresh the bell every minute
    setInterval(() => { if (me) loadNotices(); }, 60000);
  }
  boot();
})();
