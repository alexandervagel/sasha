// ---------------- THEME (same as your site) ----------------
const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;

const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
    themeToggle.checked = true;
}

themeToggle.addEventListener('change', () => {
    body.classList.toggle('dark-mode');
    const theme = body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
});

// ---------------- COOKIE CLICKER ----------------
const STORAGE_KEY = "cookie_clicker_save_v1";

const cookiesEl = document.getElementById("cookies");
const cpsEl = document.getElementById("cps");
const cookieBtn = document.getElementById("cookie-btn");
const shopList = document.getElementById("shop-list");
const saveBtn = document.getElementById("save-btn");
const resetBtn = document.getElementById("reset-btn");

// Simple upgrades/buildings (no offline progress)
const upgrades = [
    { id: "cursor",  name: "Cursor",  desc: "+1 cookie / second",   baseCost: 15,   cps: 1 },
    { id: "grandma", name: "Grandma", desc: "+5 cookies / second",  baseCost: 100,  cps: 5 },
    { id: "farm",    name: "Farm",    desc: "+20 cookies / second", baseCost: 500,  cps: 20 },
    { id: "factory", name: "Factory", desc: "+75 cookies / second", baseCost: 2000, cps: 75 }
];

let state = {
    cookies: 0,
    owned: {
        cursor: 0,
        grandma: 0,
        farm: 0,
        factory: 0
    }
};

// DOM cache for shop (prevents hover jitter)
const shopUI = new Map(); // id -> { ownedEl, costEl, btn }

function formatNumber(n) {
    if (n < 1000) return String(Math.floor(n));
    return Math.floor(n).toLocaleString("en");
}

function getCps() {
    let total = 0;
    for (const u of upgrades) {
        total += (state.owned[u.id] || 0) * u.cps;
    }
    return total;
}

function getCost(u) {
    const count = state.owned[u.id] || 0;
    return Math.floor(u.baseCost * Math.pow(1.15, count));
}

// Build shop ONCE (no more innerHTML wipe every tick)
function buildShopOnce() {
    shopList.innerHTML = "";
    shopUI.clear();

    for (const u of upgrades) {
        const item = document.createElement("div");
        item.className = "shop-item";

        item.innerHTML = `
            <div>
                <div class="shop-title">${u.name}</div>
                <div class="shop-desc">${u.desc}</div>
                <div class="shop-meta">
                    <span>Owned: <strong class="owned">0</strong></span>
                    <span>Cost: <strong class="cost">0</strong></span>
                </div>
            </div>
            <button class="buy-btn" data-id="${u.id}">Buy</button>
        `;

        const ownedEl = item.querySelector(".owned");
        const costEl = item.querySelector(".cost");
        const btn = item.querySelector(".buy-btn");

        btn.addEventListener("click", () => buyUpgrade(u.id));

        shopUI.set(u.id, { ownedEl, costEl, btn });
        shopList.appendChild(item);
    }
}

function updateUI() {
    cookiesEl.textContent = formatNumber(state.cookies);
    cpsEl.textContent = formatNumber(getCps());

    for (const u of upgrades) {
        const ui = shopUI.get(u.id);
        if (!ui) continue;

        const owned = state.owned[u.id] || 0;
        const cost = getCost(u);
        const canBuy = state.cookies >= cost;

        ui.ownedEl.textContent = String(owned);
        ui.costEl.textContent = formatNumber(cost);
        ui.btn.disabled = !canBuy;
    }
}

function clickCookie() {
    state.cookies += 1;
    updateUI();
    save();
}

function buyUpgrade(id) {
    const u = upgrades.find(x => x.id === id);
    if (!u) return;

    const cost = getCost(u);
    if (state.cookies < cost) return;

    state.cookies -= cost;
    state.owned[id] = (state.owned[id] || 0) + 1;

    updateUI();
    save();
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;

        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return false;
        if (typeof parsed.cookies !== "number") return false;
        if (typeof parsed.owned !== "object" || parsed.owned === null) return false;

        state.cookies = parsed.cookies;

        for (const u of upgrades) {
            const v = parsed.owned[u.id];
            state.owned[u.id] = Number.isFinite(v) ? v : 0;
        }
        return true;
    } catch {
        return false;
    }
}

function resetGame() {
    if (!confirm("Reset your cookie clicker progress?")) return;

    state = {
        cookies: 0,
        owned: { cursor: 0, grandma: 0, farm: 0, factory: 0 }
    };
    save();
    updateUI();
}

// passive income tick (no offline)
setInterval(() => {
    const cps = getCps();
    if (cps <= 0) return;

    state.cookies += cps / 10; // 10 ticks per second
    updateUI();                // updates text/disabled only (no DOM rebuild)
}, 100);

// auto-save every 5 seconds
setInterval(() => {
    save();
}, 5000);

// UI hooks
cookieBtn.addEventListener("click", clickCookie);

saveBtn.addEventListener("click", () => {
    save();
    saveBtn.textContent = "Saved!";
    setTimeout(() => (saveBtn.textContent = "Save"), 700);
});

resetBtn.addEventListener("click", resetGame);

// init
buildShopOnce();
load();
updateUI();
