"use strict";

const STORAGE_KEY = "home_dashboard_v1";
const WEATHER_REFRESH_MS = 15 * 60 * 1000;

const WMO = {
  0: ["☀️", "Klar"],
  1: ["🌤️", "Meist klar"],
  2: ["⛅", "Teilweise bewölkt"],
  3: ["☁️", "Bedeckt"],
  45: ["🌫️", "Nebel"],
  48: ["🌫️", "Reifnebel"],
  51: ["🌦️", "Leichter Nieselregen"],
  53: ["🌦️", "Nieselregen"],
  55: ["🌧️", "Starker Nieselregen"],
  56: ["🌧️", "Gefrierender Nieselregen"],
  57: ["🌧️", "Gefrierender Nieselregen"],
  61: ["🌦️", "Leichter Regen"],
  63: ["🌧️", "Regen"],
  65: ["🌧️", "Starker Regen"],
  66: ["🌧️", "Gefrierender Regen"],
  67: ["🌧️", "Gefrierender Regen"],
  71: ["🌨️", "Leichter Schneefall"],
  73: ["🌨️", "Schneefall"],
  75: ["❄️", "Starker Schneefall"],
  77: ["❄️", "Schneegriesel"],
  80: ["🌦️", "Leichte Regenschauer"],
  81: ["🌧️", "Regenschauer"],
  82: ["⛈️", "Heftige Regenschauer"],
  85: ["🌨️", "Schneeschauer"],
  86: ["❄️", "Starke Schneeschauer"],
  95: ["⛈️", "Gewitter"],
  96: ["⛈️", "Gewitter mit Hagel"],
  99: ["⛈️", "Schweres Gewitter mit Hagel"],
};

function wmoInfo(code) {
  return WMO[code] || ["🌡️", "Unbekannt"];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- State ----------

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Konnte gespeicherte Daten nicht laden", e);
  }
  return {
    lists: [
      {
        id: uid(),
        name: "Tägliche Aufgaben",
        items: [
          { id: uid(), text: "Küche aufräumen", done: false, recurring: true, lastDone: null },
          { id: uid(), text: "Pflanzen gießen", done: false, recurring: true, lastDone: null },
        ],
      },
      {
        id: uid(),
        name: "Einkaufsliste",
        items: [
          { id: uid(), text: "Milch", done: false, recurring: false, lastDone: null },
        ],
      },
    ],
    weatherLocations: [],
  };
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- Daily reset for recurring items ----------

function applyDailyReset() {
  const today = todayStr();
  let changed = false;
  for (const list of state.lists) {
    for (const item of list.items) {
      if (item.recurring && item.done && item.lastDone !== today) {
        item.done = false;
        changed = true;
      }
    }
  }
  if (changed) saveState();
  return changed;
}

// ---------- Clock ----------

const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  document.getElementById("dateline").textContent =
    `${dayNames[now.getDay()]}, ${now.getDate()}. ${monthNames[now.getMonth()]}`;
}

let lastDay = new Date().getDate();
function clockTick() {
  updateClock();
  const nowDay = new Date().getDate();
  if (nowDay !== lastDay) {
    lastDay = nowDay;
    if (applyDailyReset()) renderLists();
  }
}

// ---------- Lists rendering ----------

const listsGrid = document.getElementById("listsGrid");
const listCardTemplate = document.getElementById("listCardTemplate");
const listItemTemplate = document.getElementById("listItemTemplate");

function renderLists() {
  listsGrid.innerHTML = "";
  for (const list of state.lists) {
    listsGrid.appendChild(buildListCard(list));
  }
}

function buildListCard(list) {
  const node = listCardTemplate.content.firstElementChild.cloneNode(true);
  const nameInput = node.querySelector(".list-name-input");
  const deleteBtn = node.querySelector(".delete-list-btn");
  const itemList = node.querySelector(".item-list");
  const addForm = node.querySelector(".add-item-form");
  const addInput = node.querySelector(".add-item-input");

  nameInput.value = list.name;
  nameInput.addEventListener("change", () => {
    list.name = nameInput.value.trim() || list.name;
    saveState();
  });

  deleteBtn.addEventListener("click", () => {
    if (confirm(`Liste "${list.name}" wirklich löschen?`)) {
      state.lists = state.lists.filter((l) => l.id !== list.id);
      saveState();
      renderLists();
    }
  });

  for (const item of list.items) {
    itemList.appendChild(buildListItem(list, item));
  }
  if (list.items.length === 0) {
    const hint = document.createElement("li");
    hint.className = "empty-hint";
    hint.textContent = "Noch keine Einträge";
    itemList.appendChild(hint);
  }

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = addInput.value.trim();
    if (!text) return;
    list.items.push({ id: uid(), text, done: false, recurring: false, lastDone: null });
    addInput.value = "";
    saveState();
    renderLists();
  });

  return node;
}

function buildListItem(list, item) {
  const node = listItemTemplate.content.firstElementChild.cloneNode(true);
  const checkbox = node.querySelector(".item-checkbox");
  const text = node.querySelector(".item-text");
  const recurringBtn = node.querySelector(".recurring-toggle");
  const deleteBtn = node.querySelector(".delete-item-btn");

  text.textContent = item.text;
  checkbox.checked = item.done;
  node.classList.toggle("done", item.done);
  node.classList.toggle("recurring", item.recurring);

  checkbox.addEventListener("change", () => {
    item.done = checkbox.checked;
    item.lastDone = item.done ? todayStr() : item.lastDone;
    node.classList.toggle("done", item.done);
    saveState();
  });

  recurringBtn.addEventListener("click", () => {
    item.recurring = !item.recurring;
    node.classList.toggle("recurring", item.recurring);
    saveState();
  });

  deleteBtn.addEventListener("click", () => {
    list.items = list.items.filter((i) => i.id !== item.id);
    saveState();
    renderLists();
  });

  return node;
}

// ---------- New list dialog ----------

const listDialog = document.getElementById("listDialog");
const newListForm = document.getElementById("newListForm");
const newListName = document.getElementById("newListName");

document.getElementById("addListBtn").addEventListener("click", () => {
  newListName.value = "";
  listDialog.showModal();
  setTimeout(() => newListName.focus(), 50);
});

document.getElementById("cancelNewList").addEventListener("click", () => {
  listDialog.close();
});

newListForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = newListName.value.trim();
  if (!name) return;
  state.lists.push({ id: uid(), name, items: [] });
  saveState();
  renderLists();
  listDialog.close();
});

// ---------- Edit mode ----------

const editModeBtn = document.getElementById("editModeBtn");
editModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("edit-mode");
  editModeBtn.classList.toggle("active");
});

// ---------- Weather ----------

const weatherRow = document.getElementById("weatherRow");
const weatherCardTemplate = document.getElementById("weatherCardTemplate");
const weatherCache = {}; // locationId -> { data, fetchedAt }

function renderWeather() {
  weatherRow.innerHTML = "";
  for (const loc of state.weatherLocations) {
    weatherRow.appendChild(buildWeatherCard(loc));
    fetchWeather(loc);
  }
}

function buildWeatherCard(loc) {
  const node = weatherCardTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.locId = loc.id;
  node.querySelector(".weather-loc-name").textContent = loc.name;
  node.querySelector(".weather-icon").textContent = "…";
  node.querySelector(".weather-temp").textContent = "";
  node.querySelector(".weather-desc").textContent = "Lädt…";

  node.querySelector(".remove-location-btn").addEventListener("click", () => {
    state.weatherLocations = state.weatherLocations.filter((l) => l.id !== loc.id);
    delete weatherCache[loc.id];
    saveState();
    renderWeather();
  });

  return node;
}

async function fetchWeather(loc) {
  const cached = weatherCache[loc.id];
  if (cached && Date.now() - cached.fetchedAt < WEATHER_REFRESH_MS) {
    paintWeatherCard(loc, cached.data);
    return;
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Wetter-Abfrage fehlgeschlagen");
    const data = await res.json();
    weatherCache[loc.id] = { data, fetchedAt: Date.now() };
    paintWeatherCard(loc, data);
  } catch (err) {
    console.warn("Wetterfehler für", loc.name, err);
    const card = weatherRow.querySelector(`[data-loc-id="${loc.id}"]`);
    if (card) card.querySelector(".weather-desc").textContent = "Nicht verfügbar";
  }
}

function paintWeatherCard(loc, data) {
  const card = weatherRow.querySelector(`[data-loc-id="${loc.id}"]`);
  if (!card) return;
  const code = data.current?.weather_code;
  const [icon, desc] = wmoInfo(code);
  card.querySelector(".weather-icon").textContent = icon;
  card.querySelector(".weather-temp").textContent =
    data.current?.temperature_2m !== undefined ? `${Math.round(data.current.temperature_2m)}°` : "–";
  card.querySelector(".weather-desc").textContent = desc;
  const max = data.daily?.temperature_2m_max?.[0];
  const min = data.daily?.temperature_2m_min?.[0];
  if (max !== undefined && min !== undefined) {
    card.querySelector(".weather-minmax").textContent = `${Math.round(min)}° / ${Math.round(max)}°`;
  }
}

// ---------- Add location dialog ----------

const locationDialog = document.getElementById("locationDialog");
const locationSearchInput = document.getElementById("locationSearchInput");
const locationResults = document.getElementById("locationResults");
let searchDebounce = null;

document.getElementById("addLocationBtn").addEventListener("click", () => {
  locationSearchInput.value = "";
  locationResults.innerHTML = "";
  locationDialog.showModal();
  setTimeout(() => locationSearchInput.focus(), 50);
});

document.getElementById("closeLocationDialog").addEventListener("click", () => {
  locationDialog.close();
});

locationSearchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const q = locationSearchInput.value.trim();
  if (q.length < 2) {
    locationResults.innerHTML = "";
    return;
  }
  searchDebounce = setTimeout(() => searchLocation(q), 350);
});

async function searchLocation(query) {
  locationResults.innerHTML = `<div class="empty-hint">Suche…</div>`;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=de&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    locationResults.innerHTML = "";
    if (!data.results || data.results.length === 0) {
      locationResults.innerHTML = `<div class="empty-hint">Keine Ergebnisse</div>`;
      return;
    }
    for (const r of data.results) {
      const div = document.createElement("div");
      div.className = "location-result";
      const parts = [r.admin1, r.country].filter(Boolean).join(", ");
      div.innerHTML = `<div>${r.name}</div><div class="location-result-sub">${parts}</div>`;
      div.addEventListener("click", () => {
        state.weatherLocations.push({
          id: uid(),
          name: r.name,
          lat: r.latitude,
          lon: r.longitude,
        });
        saveState();
        renderWeather();
        locationDialog.close();
      });
      locationResults.appendChild(div);
    }
  } catch (err) {
    locationResults.innerHTML = `<div class="empty-hint">Suche fehlgeschlagen</div>`;
  }
}

// ---------- Init ----------

applyDailyReset();
renderLists();
renderWeather();
updateClock();
setInterval(clockTick, 1000 * 15);
setInterval(() => {
  for (const loc of state.weatherLocations) fetchWeather(loc);
}, WEATHER_REFRESH_MS);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (applyDailyReset()) renderLists();
    for (const loc of state.weatherLocations) fetchWeather(loc);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((e) => console.warn("SW nicht registriert", e));
  });
}
