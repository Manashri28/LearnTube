const API_URL = "http://localhost:5000";
const token = localStorage.getItem("token");

if(!token) {
window.location.href = "login.html";
}

const params = new URLSearchParams(window.location.search);
const playlistId = params.get("playlistId");

const state = {
playlist: null,
isSaving: false
};

const elements = {
statusPanel: document.getElementById("statusPanel"),
playlistHero: document.getElementById("playlistHero"),
thumbnail: document.getElementById("playlistThumbnail"),
title: document.getElementById("playlistTitle"),
channel: document.getElementById("playlistChannel"),
videoCount: document.getElementById("videoCount"),
progressValue: document.getElementById("progressValue"),
progressText: document.getElementById("progressText"),
progressFill: document.getElementById("progressFill"),
continueBtn: document.getElementById("continueBtn"),
quizBtn: document.getElementById("quizBtn"),
videosList: document.getElementById("videosList")
};

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

function showStatus(message) {
elements.statusPanel.textContent = message;
elements.statusPanel.classList.toggle("hidden", !message);
}

function escapeHtml(value) {
return String(value || "")
.replace(/&/g, "&amp;")
.replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
.replace(/"/g, "&quot;")
.replace(/'/g, "&#039;");
}

function getVideos() {
return Array.isArray(state.playlist?.videos) ? state.playlist.videos : [];
}

function getDisplayTitle(item) {
return item?.displayTitle || item?.title || "Untitled Playlist";
}

function getProgress() {
const videos = getVideos();

if(!videos.length) {
return state.playlist?.completed ? 100 : 0;
}

const completedVideos = videos.filter((video) => video.completed).length;
return Math.round((completedVideos / videos.length) * 100);
}

function getVideoUrl(video) {
if(video.url) {
return video.url;
}

return `https://www.youtube.com/watch?v=${video.videoId}`;
}

function getVideoStatus(video) {
if(video.completed) {
return "Completed";
}

return video.status || "Not Started";
}

function syncPlaylistProgress() {
const videos = getVideos();
const progress = getProgress();
const completed = videos.length > 0 && progress === 100;

state.playlist.progress = progress;
state.playlist.completed = completed;
state.playlist.quizUnlocked = completed;

if(completed && !state.playlist.completedAt) {
state.playlist.completedAt = new Date().toISOString();
}
}

async function loadPlaylist() {
if(!playlistId) {
throw new Error("Missing playlistId in the page URL.");
}

const data = await apiRequest(`/playlists/library/${encodeURIComponent(playlistId)}`);
state.playlist = data.playlist;
syncPlaylistProgress();
}

async function savePlaylist() {
syncPlaylistProgress();

const itemId = state.playlist.itemId || state.playlist.id || state.playlist.playlistId;
const data = await apiRequest(`/playlists/library/${encodeURIComponent(itemId)}`, {
method: "PATCH",
body: JSON.stringify(state.playlist)
});

state.playlist = data.item;
syncPlaylistProgress();
}

function renderHero() {
const playlist = state.playlist;
const videos = getVideos();
const progress = getProgress();
const firstIncomplete = videos.find((video) => !video.completed);
const isCompleted = progress === 100;

elements.title.textContent = getDisplayTitle(playlist);
elements.channel.textContent = playlist.channel || "YouTube Channel";
elements.videoCount.textContent = videos.length || playlist.totalVideos || 0;
elements.progressValue.textContent = `${progress}%`;
elements.progressText.textContent = `${progress}%`;
elements.progressFill.style.width = `${progress}%`;

elements.thumbnail.innerHTML = playlist.thumbnail
? `<img src="${escapeHtml(playlist.thumbnail)}" alt="${escapeHtml(getDisplayTitle(playlist))} thumbnail">`
: `<i class="fa-solid fa-play"></i>`;

elements.continueBtn.classList.toggle("hidden", isCompleted);
elements.quizBtn.classList.toggle("hidden", !isCompleted);
elements.continueBtn.disabled = !firstIncomplete || isCompleted;
}

function renderVideos() {
const videos = getVideos();
elements.videosList.innerHTML = "";

if(!videos.length) {
elements.videosList.innerHTML = `
<div class="empty-copy card-panel">
    No videos were saved for this playlist yet.
</div>
`;
return;
}

videos.forEach((video, index) => {
const row = document.createElement("article");
row.className = "video-row";
row.dataset.videoId = video.videoId || "";
row.dataset.index = index;

const safeTitle = escapeHtml(video.title || `Playlist Video ${index + 1}`);
const safeDuration = escapeHtml(video.duration || "Lesson");
const completed = video.completed === true;
const status = getVideoStatus(video);

row.innerHTML = `
${video.thumbnail ? `<img class="video-thumb" src="${escapeHtml(video.thumbnail)}" alt="${safeTitle} thumbnail">` : `<div class="video-thumb thumb-fallback"><i class="fa-solid fa-play"></i></div>`}

<div class="video-copy">
    <h3>${safeTitle}</h3>
    <div class="video-meta">
        <span><i class="fa-regular fa-clock"></i> ${safeDuration}</span>
        <span class="completion-badge ${completed ? "completed" : ""}">
            <i class="fa-solid ${completed ? "fa-circle-check" : "fa-circle"}"></i>
            ${escapeHtml(status)}
        </span>
    </div>
</div>

<div class="video-actions">
    <button class="btn ${completed ? "success" : "secondary"}" data-action="complete" data-index="${index}" ${completed ? "disabled" : ""}>
        <i class="fa-solid fa-circle-check"></i>
        ${completed ? "Completed" : "Mark Complete"}
    </button>
</div>
`;

elements.videosList.appendChild(row);
});
}

function render() {
renderHero();
renderVideos();
}

function watchVideo(video) {
window.open(getVideoUrl(video), "_blank", "noopener,noreferrer");
}

function playRowPress(row) {
row.classList.add("row-pressed");

return new Promise((resolve) => {
setTimeout(() => {
row.classList.remove("row-pressed");
resolve();
}, 120);
});
}

async function openVideoRow(index) {
if(state.isSaving) return;

const video = getVideos()[index];

if(!video) {
return;
}

if(!video.completed && (!video.status || video.status === "Not Started")) {
state.isSaving = true;
showStatus("");
video.status = "In Progress";
render();

try {
await savePlaylist();
render();
} catch (error) {
video.status = "Not Started";
render();
showStatus(error.message);
state.isSaving = false;
return;
}

state.isSaving = false;
}

watchVideo(video);
}

async function markVideoComplete(index) {
if(state.isSaving) return;

const videos = getVideos();
const video = videos[index];

if(!video || video.completed) {
return;
}

state.isSaving = true;
showStatus("");

video.completed = true;
video.completedAt = new Date().toISOString();
syncPlaylistProgress();
render();

try {
await savePlaylist();
render();
} catch (error) {
video.completed = false;
video.completedAt = null;
syncPlaylistProgress();
render();
showStatus(error.message);
} finally {
state.isSaving = false;
}
}

elements.continueBtn.addEventListener("click", () => {
const firstIncomplete = getVideos().find((video) => !video.completed);

if(firstIncomplete) {
watchVideo(firstIncomplete);
}
});

elements.quizBtn.addEventListener("click", () => {
const currentPlaylistId =
state.playlist?.playlistId ||
state.playlist?.itemId ||
state.playlist?.id ||
playlistId;

if(currentPlaylistId) {
window.location.href = `quiz.html?playlistId=${encodeURIComponent(currentPlaylistId)}`;
}
});

elements.videosList.addEventListener("click", (event) => {
const button = event.target.closest("[data-action]");
if(button) {
const index = Number(button.dataset.index);

if(button.dataset.action === "complete") {
event.stopPropagation();
markVideoComplete(index);
}

return;
}

const row = event.target.closest(".video-row");
if(!row) return;

playRowPress(row).then(() => {
openVideoRow(Number(row.dataset.index));
});
});

async function init() {
try {
await loadPlaylist();
render();
} catch (error) {
showStatus(error.message);
elements.playlistHero.classList.add("hidden");
elements.videosList.innerHTML = "";
}
}

init();
