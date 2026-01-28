const API_KEY = "19d3ffae668d341ff2afcf54bbe3aea1";

const grid = document.getElementById("weather-grid");
const input = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const suggestionsEl = document.getElementById("suggestions");

// Modal elements
const modalOverlay = document.getElementById("modal-overlay");
const modalClose = document.getElementById("modal-close");
const modalTitle = document.getElementById("modal-title");
const modalSub = document.getElementById("modal-sub");
const modalTemp = document.getElementById("modal-temp");
const modalDesc = document.getElementById("modal-desc");
const modalFeels = document.getElementById("modal-feels");
const modalMinMax = document.getElementById("modal-minmax");
const modalHumidity = document.getElementById("modal-humidity");
const modalWind = document.getElementById("modal-wind");
const modalPressure = document.getElementById("modal-pressure");
const modalSun = document.getElementById("modal-sun");

// Default cities (nur beim allerersten Besuch)
const defaultCities = ["Heilbronn", "Schwaigern", "Ansbach"];

// Storage Key
const STORAGE_KEY = "weather_saved_cities_v1";

/* ---------------- THEME ---------------- */

const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;

const savedTheme = localStorage.getItem("theme") || "light";
if (savedTheme === "dark") {
    body.classList.add("dark-mode");
    themeToggle.checked = true;
}

themeToggle.addEventListener("change", () => {
    body.classList.toggle("dark-mode");
    localStorage.setItem(
        "theme",
        body.classList.contains("dark-mode") ? "dark" : "light"
    );
});

/* ---------------- STORAGE HELPERS ---------------- */

function loadSavedCities() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed;
    } catch {
        return null;
    }
}

function saveCities(cities) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
}

function normalizeCityName(city) {
    return city.trim().replace(/\s+/g, " ");
}

function getCityKey(city) {
    return normalizeCityName(city).toLowerCase();
}

/* ---------------- WEATHER API ---------------- */

async function fetchWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&lang=de&appid=${API_KEY}`;
    const response = await fetch(url);
    return await response.json();
}

function cardExists(city) {
    const key = getCityKey(city);
    return Boolean(grid.querySelector(`.weather-card[data-city-key="${CSS.escape(key)}"]`));
}

function getCitiesFromDOM() {
    const cards = Array.from(grid.querySelectorAll(".weather-card"));
    return cards.map(c => c.dataset.cityName).filter(Boolean);
}

function persistFromDOM() {
    saveCities(getCitiesFromDOM());
}

function addCardToDOM(data, cityOriginalInput) {
    const cityName = data.name || cityOriginalInput;
    const cityKey = getCityKey(cityName);

    // Duplikate vermeiden
    if (grid.querySelector(`.weather-card[data-city-key="${CSS.escape(cityKey)}"]`)) return;

    const card = document.createElement("div");
    card.className = "weather-card";
    card.dataset.cityKey = cityKey;
    card.dataset.cityName = cityName;

    card.innerHTML = `
        <button class="remove-btn" aria-label="Remove city">X</button>
        <h2>${cityName}</h2>
        <div class="temp">${Math.round(data.main.temp)}°C</div>
        <div class="desc">${data.weather[0].description}</div>
    `;

    // Remove handler
    const removeBtn = card.querySelector(".remove-btn");
    removeBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // wichtig: Card-Click nicht triggern
        removeCity(cityName);
    });

    // Details handler (Card klick)
    card.addEventListener("click", () => {
        openDetails(cityName);
    });

    grid.prepend(card);
}

async function addCity(cityInput) {
    const city = normalizeCityName(cityInput);
    if (!city) return;

    if (cardExists(city)) return;

    try {
        const data = await fetchWeather(city);

        if (data.cod !== 200) {
            console.log("City not found:", data);
            return;
        }

        addCardToDOM(data, city);
        persistFromDOM();
    } catch (err) {
        console.error(err);
    }
}

function removeCity(cityName) {
    const key = getCityKey(cityName);
    const card = grid.querySelector(`.weather-card[data-city-key="${CSS.escape(key)}"]`);
    if (card) {
        card.remove();
        persistFromDOM();
    }
}

/* ---------------- DETAILS MODAL ---------------- */

function formatTimeFromUnix(unixSeconds, tzOffsetSeconds) {
    // OpenWeather liefert "timezone" Offset in Sekunden zur UTC
    const ms = (unixSeconds + tzOffsetSeconds) * 1000;
    const d = new Date(ms);
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

async function openDetails(cityName) {
    try {
        const data = await fetchWeather(cityName);
        if (data.cod !== 200) return;

        const country = data.sys?.country ? data.sys.country : "";
        const tz = typeof data.timezone === "number" ? data.timezone : 0;

        modalTitle.textContent = data.name || cityName;
        modalSub.textContent = country ? `${country} • Click outside to close` : `Click outside to close`;

        modalTemp.textContent = `${Math.round(data.main.temp)}°C`;
        modalDesc.textContent = data.weather?.[0]?.description ?? "—";

        modalFeels.textContent = `${Math.round(data.main.feels_like)}°C`;
        modalMinMax.textContent = `${Math.round(data.main.temp_min)}°C / ${Math.round(data.main.temp_max)}°C`;
        modalHumidity.textContent = `${data.main.humidity}%`;
        modalWind.textContent = `${Math.round(data.wind.speed)} m/s`;
        modalPressure.textContent = `${data.main.pressure} hPa`;

        const sunrise = data.sys?.sunrise ? formatTimeFromUnix(data.sys.sunrise, tz) : "—";
        const sunset = data.sys?.sunset ? formatTimeFromUnix(data.sys.sunset, tz) : "—";
        modalSun.textContent = `${sunrise} / ${sunset}`;

        modalOverlay.style.display = "flex";
        modalOverlay.setAttribute("aria-hidden", "false");
    } catch (err) {
        console.error(err);
    }
}

function closeModal() {
    modalOverlay.style.display = "none";
    modalOverlay.setAttribute("aria-hidden", "true");
}

modalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

/* ---------------- SEARCH SUGGESTIONS (Geocoding API) ---------------- */

let suggestionController = null;
let activeSuggestionIndex = -1;

function hideSuggestions() {
    suggestionsEl.style.display = "none";
    suggestionsEl.innerHTML = "";
    activeSuggestionIndex = -1;
}

function showSuggestions(items) {
    suggestionsEl.innerHTML = "";

    items.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.dataset.index = String(idx);

        const parts = [item.name];
        if (item.state) parts.push(item.state);
        if (item.country) parts.push(item.country);

        div.textContent = parts.join(", ");

        div.addEventListener("mousedown", (e) => {
            // mousedown statt click: damit es vor blur feuert
            e.preventDefault();
            input.value = item.name;
            hideSuggestions();
            addCity(item.name);
            input.value = "";
        });

        suggestionsEl.appendChild(div);
    });

    suggestionsEl.style.display = items.length ? "block" : "none";
}

function setActiveSuggestion(index) {
    const children = Array.from(suggestionsEl.querySelectorAll(".suggestion-item"));
    children.forEach(el => el.classList.remove("active"));
    if (index >= 0 && index < children.length) {
        children[index].classList.add("active");
        activeSuggestionIndex = index;
    }
}

async function fetchCitySuggestions(query) {
    const q = normalizeCityName(query);
    if (q.length < 2) {
        hideSuggestions();
        return;
    }

    if (suggestionController) suggestionController.abort();
    suggestionController = new AbortController();

    try {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${API_KEY}`;
        const res = await fetch(url, { signal: suggestionController.signal });
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) {
            hideSuggestions();
            return;
        }

        // Deduplicate nach "name,country,state"
        const seen = new Set();
        const cleaned = [];
        for (const item of data) {
            const key = `${item.name}|${item.country || ""}|${item.state || ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            cleaned.push(item);
        }

        showSuggestions(cleaned);
    } catch (err) {
        if (err.name !== "AbortError") console.error(err);
    }
}

function debounce(fn, delay = 250) {
    let t = null;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}

const debouncedSuggest = debounce(fetchCitySuggestions, 250);

input.addEventListener("input", () => {
    debouncedSuggest(input.value);
});

input.addEventListener("keydown", (e) => {
    const items = Array.from(suggestionsEl.querySelectorAll(".suggestion-item"));
    if (!items.length) {
        if (e.key === "Enter") {
            const value = input.value;
            input.value = "";
            addCity(value);
        }
        return;
    }

    if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(activeSuggestionIndex + 1, items.length - 1);
        setActiveSuggestion(next);
    }

    if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(activeSuggestionIndex - 1, 0);
        setActiveSuggestion(prev);
    }

    if (e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
            const chosen = items[activeSuggestionIndex].textContent;
            // wir nehmen nur den Stadtnamen (vor erstem Komma)
            const name = chosen.split(",")[0].trim();
            hideSuggestions();
            addCity(name);
            input.value = "";
        } else {
            const value = input.value;
            input.value = "";
            addCity(value);
        }
    }

    if (e.key === "Escape") {
        hideSuggestions();
    }
});

input.addEventListener("blur", () => {
    // kleinen Tick, damit mousedown noch greifen kann
    setTimeout(hideSuggestions, 120);
});

/* ---------------- UI EVENTS ---------------- */

searchBtn.addEventListener("click", () => {
    const value = input.value;
    input.value = "";
    hideSuggestions();
    addCity(value);
});

/* ---------------- INITIAL LOAD ---------------- */

(async function init() {
    const saved = loadSavedCities();
    const citiesToLoad = (saved && saved.length > 0) ? saved : defaultCities;

    for (const city of citiesToLoad) {
        await addCity(city);
    }
})();
