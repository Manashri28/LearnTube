const API_URL = "http://localhost:5000";
const LIBRARY_KEY = "learntubeLearningLibrary";
const token = localStorage.getItem("token");

if(!token) {
window.location.href = "login.html";
}

const state = {
items: [],
filter: "all",
search: ""
};

const elements = {
    form: document.getElementById("contentForm"),
    input: document.getElementById("playlistInput"),
    message: document.getElementById("formMessage"),
    libraryGrid: document.getElementById("libraryGrid"),
    emptyState: document.getElementById("emptyState"),
    search: document.getElementById("librarySearch"),
    filterTabs: document.getElementById("filterTabs"),
    heroTitle: document.getElementById("heroTitle"),
    heroSubtitle: document.getElementById("heroSubtitle"),
    heroThumbnail: document.getElementById("heroThumbnail"),
    heroProgressText: document.getElementById("heroProgressText"),
    heroProgressFill: document.getElementById("heroProgressFill"),
    resumeBtn: document.getElementById("resumeBtn"),

    deleteModal: document.getElementById("deleteModal"),
    deleteModalText: document.getElementById("deleteModalText"),
    confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
    cancelDeleteBtn: document.getElementById("cancelDeleteBtn")
};



function loadLibrary() {
return loadLibraryFromMongo();
}

function saveLibrary() {
localStorage.setItem(LIBRARY_KEY, JSON.stringify(state.items));
}

function clearSessionAndRedirect() {
localStorage.removeItem("token");
localStorage.removeItem("user");
window.location.href = "login.html";
}

async function apiRequest(path, options = {}) {
const response = await fetch(`${API_URL}${path}`, {
...options,
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`,
...(options.headers || {})
}
});

const data = await response.json();

if(response.status === 401) {
clearSessionAndRedirect();
return null;
}

if(!response.ok) {
throw new Error(data.message || "Request failed.");
}

return data;
}

async function loadLibraryFromMongo() {
try {
const data = await apiRequest("/playlists/library");
state.items = data?.items || [];
saveLibrary();
} catch (error) {
try {
state.items = JSON.parse(localStorage.getItem(LIBRARY_KEY)) || [];
showMessage("Using local learning history until MongoDB is reachable.", "error");
} catch (storageError) {
state.items = [];
}
}
}

async function saveLearningItem(item) {
const data = await apiRequest("/playlists/library", {
method: "POST",
body: JSON.stringify(item)
});

return data.item;
}

async function updateLearningItem(item) {
const itemId = item.itemId || item.id || item.playlistId;
const data = await apiRequest(`/playlists/library/${encodeURIComponent(itemId)}`, {
method: "PATCH",
body: JSON.stringify(item)
});

return data.item;
}

async function deletePlaylist(itemId) {

    elements.deleteModal.classList.remove("hidden");

    const playlist = state.items.find(item => item.id === itemId);

    elements.deleteModalText.textContent =
        `Are you sure you want to remove "${getDisplayTitle(playlist)}"?`;

    elements.cancelDeleteBtn.onclick = null;

    elements.confirmDeleteBtn.onclick = async () => {

        elements.deleteModal.classList.add("hidden");

        try {

            await apiRequest(
                `/playlists/library/${encodeURIComponent(itemId)}`,
                {
                    method: "DELETE"
                }
            );

            state.items = state.items.filter(
                item => item.id !== itemId
            );

            saveLibrary();

            render();

            showMessage(
                "Playlist removed successfully.",
                "success"
            );

        } catch (error) {

            showMessage(
                error.message,
                "error"
            );

        }

    };

}
function showMessage(message, type = "") {
elements.message.textContent = message;
elements.message.className = `form-message ${type}`;
}

function escapeHtml(value) {
return String(value || "")
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");
}

function createId(prefix = "item") {
return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDisplayTitle(item) {
return item?.displayTitle || item?.title || "Untitled Playlist";
}

function parseYouTubeUrl(value) {
let url;

try {
url = new URL(value);
} catch (error) {
throw new Error("Paste a valid YouTube video or playlist URL.");
}

const host = url.hostname.replace("www.", "");
const isYouTube = ["youtube.com", "m.youtube.com", "youtu.be"].includes(host);

if(!isYouTube) {
throw new Error("Only YouTube video and playlist URLs are supported.");
}

const playlistId = url.searchParams.get("list");
const videoId = host === "youtu.be"
? url.pathname.slice(1)
: url.searchParams.get("v");

if(playlistId) {
return {
type: "playlist",
playlistId,
videoId,
url: value
};
}

if(videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
return {
type: "video",
videoId,
url: `https://www.youtube.com/watch?v=${videoId}`
};
}

throw new Error("The URL does not include a valid YouTube video or playlist ID.");
}

async function fetchOEmbed(url) {
const response = await fetch(
`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
);

if(!response.ok) {
throw new Error("Could not fetch YouTube metadata.");
}

return response.json();
}

function thumbnailFromId(videoId) {
return videoId
? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
: "";
}

async function buildVideoItem(parsed) {
const metadata = await fetchOEmbed(parsed.url);

return {
id: createId("video"),
type: "video",
videoId: parsed.videoId,
title: metadata.title || "YouTube Video",
thumbnail: metadata.thumbnail_url || thumbnailFromId(parsed.videoId),
url: parsed.url,
duration: "YouTube video",
channel: metadata.author_name || "YouTube Channel",
progress: 0,
completed: false,
quizUnlocked: false,
completedAt: null,
createdAt: new Date().toISOString()
};
}

async function buildPlaylistItem(parsed) {
const playlistUrl = `https://www.youtube.com/playlist?list=${parsed.playlistId}`;
let videos = [];
let playlistTitle = "YouTube Playlist";
let channel = "YouTube Channel";
let playlistThumbnail = "";

try {
const response = await fetch(`${API_URL}/playlist?url=${encodeURIComponent(playlistUrl)}`);
if(response.ok) {
const data = await response.json();
videos = Array.isArray(data) ? data : data.videos || [];
playlistTitle = data.playlist?.title || playlistTitle;
channel = data.playlist?.channel || channel;
playlistThumbnail = data.playlist?.thumbnail || "";
}
} catch (error) {
videos = [];
}

const normalizedVideos = videos.map((video, index) => ({
    id: `${parsed.playlistId}_${video.videoId}`,
    videoId: video.videoId,
    title: video.title || `Playlist Video ${index + 1}`,
    thumbnail: video.thumbnail || "",
    duration: video.duration || "Lesson",
    completed: false,
    completedAt: null
}));

return {
id: createId("playlist"),
type: "playlist",
playlistId: parsed.playlistId,
videoId: parsed.videoId || "",
title: playlistTitle,
displayTitle: "",
thumbnail: playlistThumbnail || normalizedVideos[0]?.thumbnail || thumbnailFromId(parsed.videoId),
url: playlistUrl,
duration: `${normalizedVideos.length || "Multiple"} videos`,
channel,
totalVideos: normalizedVideos.length,
videos: normalizedVideos,
progress: 0,
completed: false,
quizUnlocked: false,
completedAt: null,
createdAt: new Date().toISOString()
};
}

async function addContent(event) {
event.preventDefault();

const value = elements.input.value.trim();

if(!value) {
showMessage("Paste a YouTube video or playlist URL to add content.", "error");
return;
}

try {
showMessage("Fetching YouTube metadata...");
const parsed = parseYouTubeUrl(value);

const duplicate = state.items.some((item) => {
if(parsed.type === "playlist") return item.playlistId === parsed.playlistId;
return item.videoId === parsed.videoId && item.type === "video";
});

if(duplicate) {
showMessage("This content already exists in your learning library.", "error");
return;
}

const item = parsed.type === "playlist"
? await buildPlaylistItem(parsed)
: await buildVideoItem(parsed);

const savedItem = await saveLearningItem(item);

state.items.unshift(savedItem);
saveLibrary();
elements.input.value = "";
showMessage("Added to your learning library.", "success");
render();
} catch (error) {
showMessage(error.message, "error");
}
}

function getFilteredItems() {
return state.items.filter((item) => {
const matchesSearch = `${getDisplayTitle(item)} ${item.title} ${item.channel}`.toLowerCase().includes(state.search);
const matchesFilter =
state.filter === "all" ||
(state.filter === "in-progress" && item.progress > 0 && !item.completed) ||
(state.filter === "completed" && item.completed) ||
(state.filter === "quiz-unlocked" && item.quizUnlocked);

return matchesSearch && matchesFilter;
});
}

function getStatusText(item) {
if(item.completed) return "Completed";
if(item.progress > 0) return "In Progress";
return "Not Started";
}

function updateHero() {
const current = state.items.find((item) => !item.completed) || state.items[0];

if(!current) {
elements.heroTitle.textContent = "Start Your Learning Journey";
elements.heroSubtitle.textContent = "Paste a YouTube video or playlist URL to begin.";
elements.heroProgressText.textContent = "0%";
elements.heroProgressFill.style.width = "0%";
elements.heroThumbnail.innerHTML = `<i class="fa-solid fa-play"></i>`;
elements.resumeBtn.disabled = true;
return;
}

elements.heroTitle.textContent = getDisplayTitle(current);
elements.heroSubtitle.textContent = `${current.channel} · ${current.duration}`;
elements.heroProgressText.textContent = `${current.progress}%`;
elements.heroProgressFill.style.width = `${current.progress}%`;
elements.heroThumbnail.innerHTML = current.thumbnail
? `<img src="${current.thumbnail}" alt="${getDisplayTitle(current)} thumbnail">`
: `<i class="fa-solid fa-play"></i>`;
elements.resumeBtn.disabled = false;
elements.resumeBtn.onclick = () => watchContent(current.id);
}

function animateCounter(element, target, suffix = "") {
const start = 0;
const duration = 650;
const startTime = performance.now();

function tick(now) {
const progress = Math.min((now - startTime) / duration, 1);
const value = Math.round(start + (target - start) * progress);
element.textContent = `${value}${suffix}`;

if(progress < 1) {
requestAnimationFrame(tick);
}
}

requestAnimationFrame(tick);
}

function updateMetrics() {
const videoUnits = state.items.reduce((sum, item) => {
return sum + (item.type === "playlist" ? Math.max(item.totalVideos || 0, 1) : 1);
}, 0);
const completed = state.items.reduce((sum, item) => {
if(item.type === "playlist") {
return sum + (item.videos || []).filter((video) => video.completed).length;
}
return sum + (item.completed ? 1 : 0);
}, 0);
const quizzes = state.items.filter((item) => item.quizUnlocked).length;
const progress = videoUnits ? Math.round((completed / videoUnits) * 100) : 0;

animateCounter(document.querySelector('[data-counter="videosAdded"]'), videoUnits);
animateCounter(document.querySelector('[data-counter="videosCompleted"]'), completed);
animateCounter(document.querySelector('[data-counter="quizzesUnlocked"]'), quizzes);
animateCounter(document.querySelector('[data-counter="learningProgress"]'), progress, "%");
}

function renderLibrary() {
const items = getFilteredItems();
elements.libraryGrid.innerHTML = "";
elements.emptyState.classList.toggle("show", !state.items.length);

if(!items.length && state.items.length) {
elements.libraryGrid.innerHTML = `
<section class="empty-state show card-panel">
    <i class="fa-solid fa-magnifying-glass"></i>
    <h2>No Matching Lessons</h2>
    <p>Try another search term or filter.</p>
</section>
`;
return;
}

items.forEach((item) => {
elements.libraryGrid.appendChild(createContentCard(item));
});
}

function createContentCard(item) {
const card = document.createElement("article");
card.className = "content-card";
card.dataset.id = item.id;
if(item.type === "playlist") {
card.dataset.playlistId = item.playlistId || item.itemId || item.id;
}

const isUnlocked = item.quizUnlocked;
const typeLabel = item.type === "playlist" ? "Playlist" : "Video";
const status = getStatusText(item);
const safeTitle = escapeHtml(getDisplayTitle(item));
const safeChannel = escapeHtml(item.channel);
const safeDuration = escapeHtml(item.duration);

card.innerHTML = `
<div class="card-media">
    ${item.thumbnail ? `<img src="${escapeHtml(item.thumbnail)}" alt="${safeTitle} thumbnail">` : `<div class="media-fallback"><i class="fa-solid fa-play"></i></div>`}
    <span class="type-badge">${typeLabel}</span>
    <span class="status-badge ${isUnlocked ? "unlocked" : ""}">${isUnlocked ? "Quiz Unlocked" : status}</span>
</div>

<div class="card-body">
    <h3>${safeTitle}</h3>
    <div class="metadata">
        <span><i class="fa-solid fa-user"></i>${safeChannel}</span>
        <span><i class="fa-regular fa-clock"></i>${safeDuration}</span>
        ${item.type === "playlist" ? `<span><i class="fa-solid fa-list"></i>${item.totalVideos || 0} videos</span>` : ""}
    </div>

    <div class="progress-row">
        <span>Progress</span>
        <strong>${item.progress}%</strong>
    </div>
    <div class="progress-box">
        <div class="progress-fill" style="width:${item.progress}%"></div>
    </div>

    <div class="card-actions">
        <button class="btn quiz-btn ${isUnlocked ? "" : "locked"}" data-action="quiz">
            <i class="fa-solid ${isUnlocked ? "fa-wand-magic-sparkles" : "fa-lock"}"></i>
            Take AI Quiz
        </button>
        <button class="btn danger" data-action="delete">
          <i class="fa-solid fa-trash"></i>
          Remove Playlist
        </button>
    </div>

    <p class="unlock-message ${isUnlocked ? "unlocked" : ""}">
        <i class="fa-solid ${isUnlocked ? "fa-lock-open" : "fa-lock"}"></i>
        ${isUnlocked ? "Quiz Unlocked" : "Complete this video to unlock quiz"}
    </p>

</div>
`;

card.addEventListener("click", (event) => {
const actionButton = event.target.closest("[data-action]");
if(!actionButton) {
if(item.type === "playlist") {
window.location.href = `playlist-details.html?playlistId=${encodeURIComponent(item.playlistId || item.itemId || item.id)}`;
}
return;
}

const action = actionButton.dataset.action;

if(action === "delete") {
    deletePlaylist(item.id);
}
if(action === "quiz") {
if(item.quizUnlocked) {
openQuiz(item);
} else {
showMessage("Complete this video to unlock quiz.", "error");
}
}
});

return card;
}

function createPlaylistVideos(item) {
const wrapper = document.createElement("div");
wrapper.className = "playlist-videos";

if(!item.videos?.length) {
wrapper.innerHTML = `
<div class="playlist-video">
    <span class="tiny-thumb"><i class="fa-solid fa-list"></i></span>
    <div>
        <h4>Playlist videos will appear when metadata is available.</h4>
        <p>Saved as a playlist item.</p>
    </div>
    <span class="video-status">Not Started</span>
</div>
`;
return wrapper;
}

item.videos.forEach((video) => {
const row = document.createElement("div");
row.className = "playlist-video";
const safeTitle = escapeHtml(video.title);
const safeDuration = escapeHtml(video.duration);
row.innerHTML = `
${video.thumbnail ? `<img src="${escapeHtml(video.thumbnail)}" alt="${safeTitle} thumbnail">` : `<span class="tiny-thumb"><i class="fa-solid fa-play"></i></span>`}
<div>
    <h4>${safeTitle}</h4>
    <p>${safeDuration}</p>
</div>
<div class="video-actions">

    <button
        class="btn secondary watch-video-btn"
        data-action="watch-video"
        data-video-id="${video.videoId}">
        <i class="fa-solid fa-play"></i>
        Watch
    </button>

    <button
        class="btn secondary complete-video-btn"
        data-action="complete-video"
        data-video-id="${video.videoId}">
        <i class="fa-solid fa-circle-check"></i>
        ${video.completed ? "Completed" : "Mark Complete"}
    </button>

</div>
`;
wrapper.appendChild(row);

const watchBtn = row.querySelector(".watch-video-btn");
const completeBtn = row.querySelector(".complete-video-btn");

watchBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    window.open(
        `https://www.youtube.com/watch?v=${video.videoId}`,
        "_blank"
    );
});

completeBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    if(video.completed) return;

    video.completed = true;
    video.completedAt = new Date().toISOString();

    updatePlaylistProgress(item);

    try {
        const savedItem = await updateLearningItem(item);
        Object.assign(item, savedItem);
    } catch(error) {
        showMessage(error.message, "error");
        return;
    }

    render();
});
});

return wrapper;
}

function togglePlaylist(card, button) {
const panel = card.querySelector(".playlist-videos");
const isOpen = panel.classList.toggle("open");
button.innerHTML = `<i class="fa-solid fa-chevron-${isOpen ? "up" : "down"}"></i>${isOpen ? "Hide" : "Show"} playlist videos`;
}

async function watchContent(itemId) {
const item = state.items.find((libraryItem) => libraryItem.id === itemId);
if(!item) return;

item.progress = Math.max(item.progress, item.completed ? 100 : 35);
item.lastActiveAt = new Date().toISOString();
if(item.type === "playlist" && item.videos?.length) {
item.videos[0].status = item.videos[0].completed ? "Completed" : "In Progress";
}

try {
const savedItem = await updateLearningItem(item);
Object.assign(item, savedItem);
} catch (error) {
showMessage(error.message, "error");
}

saveLibrary();
window.open(item.url, "_blank", "noopener,noreferrer");
render();
}

function updatePlaylistProgress(item) {
    if (!item.videos || !item.videos.length) {
        return;
    }

    const completedVideos = item.videos.filter(video => video.completed).length;

    item.progress = Math.round(
        (completedVideos / item.videos.length) * 100
    );

    item.completed = completedVideos === item.videos.length;

    item.quizUnlocked = item.completed;

    if (item.completed && !item.completedAt) {
        item.completedAt = new Date().toISOString();
    }
}

async function markComplete(itemId, card) {
const item = state.items.find((libraryItem) => libraryItem.id === itemId);
if(!item) return;

item.progress = 100;
item.completed = true;
item.quizUnlocked = true;
item.completedAt = new Date().toISOString();

if(item.type === "playlist" && item.videos?.length) {
item.videos = item.videos.map((video) => ({
...video,
status: "Completed",
completed: true
}));
}

try {
const savedItem = await updateLearningItem(item);
Object.assign(item, savedItem);
} catch (error) {
showMessage(error.message, "error");
return;
}

saveLibrary();
card.classList.add("complete-pop");
setTimeout(render, 350);
showMessage("Quiz Unlocked", "success");
}

function openQuiz(item) {
if(item.type === "playlist") {
const playlistId = item.playlistId || item.itemId || item.id;
window.location.href = `quiz.html?playlistId=${encodeURIComponent(playlistId)}`;
return;
}

window.location.href = "quiz.html";
}

function setFilter(filter) {
state.filter = filter;
document.querySelectorAll(".filter-tab").forEach((button) => {
button.classList.toggle("active", button.dataset.filter === filter);
});
renderLibrary();
}

function render() {
updateHero();
updateMetrics();
renderLibrary();
}

elements.form.addEventListener("submit", addContent);

elements.search.addEventListener("input", (event) => {
state.search = event.target.value.trim().toLowerCase();
renderLibrary();
});

elements.filterTabs.addEventListener("click", (event) => {
const button = event.target.closest(".filter-tab");
if(button) {
setFilter(button.dataset.filter);
}
});

elements.cancelDeleteBtn.addEventListener("click", () => {
    elements.deleteModal.classList.add("hidden");
});

elements.deleteModal.addEventListener("click", (event) => {
    if (event.target === elements.deleteModal) {
        elements.deleteModal.classList.add("hidden");
    }
});

async function init() {
await loadLibrary();
render();
}

init();
