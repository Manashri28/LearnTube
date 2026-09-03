const API_URL = "https://learntube-ei40.onrender.com";
const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);
const playlistId = params.get("playlistId");
const requestedVideoId = params.get("videoId");
const requestedIndex = Number(params.get("videoIndex"));
const state = {
playlist: null,
currentIndex: 0,
sessionId: null,
timerMinutes: 25,
timerSeconds: 1500,
timerInterval: null
};

const elements = {
status: document.getElementById("focusStatus"),
layout: document.getElementById("focusLayout"),
courseTitle: document.getElementById("courseTitle"),
courseChannel: document.getElementById("courseChannel"),
lessonThumbnail: document.getElementById("lessonThumbnail"),
lessonTitle: document.getElementById("lessonTitle"),
lessonCount: document.getElementById("lessonCount"),
progressText: document.getElementById("progressText"),
progressFill: document.getElementById("progressFill"),
startLecture: document.getElementById("startLectureBtn"),
quizLecture: document.getElementById("quizLectureBtn"),
nextLecture: document.getElementById("nextLectureBtn"),
finalQuiz: document.getElementById("finalQuizBtn"),
exit: document.getElementById("exitFocusBtn"),
timerDisplay: document.getElementById("timerDisplay"),
timerSelect: document.getElementById("timerSelect"),
timerMessage: document.getElementById("timerMessage")
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
elements.status.textContent = message;
elements.status.hidden = !message;
}

function getVideos() {
return Array.isArray(state.playlist?.videos) ? state.playlist.videos : [];
}

function getVideoUrl(video) {
return video.url || `https://www.youtube.com/watch?v=${video.videoId}`;
}

function getProgress() {
const videos = getVideos();
if(!videos.length) return 0;
return Math.round((videos.filter((video) => video.completed).length / videos.length) * 100);
}

function getCurrentVideo() {
return getVideos()[state.currentIndex];
}

function render() {
const playlist = state.playlist;
const videos = getVideos();
const video = getCurrentVideo();
const progress = getProgress();
const completed = progress === 100;

if(!video) {
showStatus("This playlist does not have a lecture available for Focus Mode.");
return;
}

elements.courseTitle.textContent = playlist.displayTitle || playlist.title || "LearnTube Playlist";
elements.courseChannel.textContent = playlist.channel || "YouTube Channel";
elements.lessonTitle.textContent = video.title || `Lecture ${state.currentIndex + 1}`;
elements.lessonCount.textContent = `${state.currentIndex + 1} / ${videos.length}`;
elements.progressText.textContent = `${progress}%`;
elements.progressFill.style.width = `${progress}%`;
elements.lessonThumbnail.replaceChildren();

if(video.thumbnail) {
const image = document.createElement("img");
image.src = video.thumbnail;
image.alt = `${video.title || "Lecture"} thumbnail`;
elements.lessonThumbnail.appendChild(image);
} else {
const icon = document.createElement("i");
icon.className = "fa-solid fa-play";
elements.lessonThumbnail.appendChild(icon);
}

elements.nextLecture.classList.toggle("hidden", state.currentIndex >= videos.length - 1);
elements.finalQuiz.classList.toggle("hidden", !completed);
}

function formatTimer(seconds) {
const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
const remaining = (seconds % 60).toString().padStart(2, "0");
return `${minutes}:${remaining}`;
}

function renderTimer() {
elements.timerDisplay.textContent = formatTimer(state.timerSeconds);
}

function startTimer() {
window.clearInterval(state.timerInterval);
state.timerInterval = window.setInterval(() => {
if(state.timerSeconds <= 0) {
window.clearInterval(state.timerInterval);
state.timerInterval = null;
elements.timerMessage.textContent = "Focus session complete. Take a short break or continue learning.";
return;
}

state.timerSeconds -= 1;
renderTimer();
}, 1000);
}

function resetTimer(minutes) {
state.timerMinutes = Number(minutes);
state.timerSeconds = state.timerMinutes * 60;
elements.timerMessage.textContent = "Your timer is a learning aid. Continue whenever you are ready.";
renderTimer();
startTimer();
}

async function startFocusSession() {
const video = getCurrentVideo();
if(!video) return;

try {
const data = await apiRequest("/focus-sessions", {
method: "POST",
body: JSON.stringify({
playlistId: state.playlist.playlistId || playlistId,
videoId: video.videoId
})
});
state.sessionId = data.session.id;
} catch (error) {
showStatus("Focus mode is available, but this session could not be synced.");
}
}

async function endFocusSession() {
window.clearInterval(state.timerInterval);
if(!state.sessionId) return;

try {
await apiRequest(`/focus-sessions/${encodeURIComponent(state.sessionId)}`, {
method: "PATCH"
});
} catch (error) {
return;
}
}

async function changeLecture(index) {
if(!getVideos()[index]) return;
await endFocusSession();
state.currentIndex = index;
state.sessionId = null;
render();
await startFocusSession();
}

elements.startLecture.addEventListener("click", () => {
const video = getCurrentVideo();
if(video) {
window.open(getVideoUrl(video), "_blank", "noopener,noreferrer");
}
});

elements.quizLecture.addEventListener("click", () => {
const video = getCurrentVideo();
if(video) {
window.location.href = `quiz.html?videoUrl=${encodeURIComponent(getVideoUrl(video))}`;
}
});

elements.finalQuiz.addEventListener("click", () => {
window.location.href = `quiz.html?playlistId=${encodeURIComponent(state.playlist.playlistId || playlistId)}`;
});

elements.nextLecture.addEventListener("click", () => {
changeLecture(state.currentIndex + 1);
});

elements.timerSelect.addEventListener("change", () => {
resetTimer(elements.timerSelect.value);
});

elements.exit.addEventListener("click", async () => {
await endFocusSession();
window.location.href = `playlist-details.html?playlistId=${encodeURIComponent(state.playlist.playlistId || playlistId)}`;
});

window.addEventListener("pagehide", () => {
if(state.sessionId) {
fetch(`${API_URL}/focus-sessions/${encodeURIComponent(state.sessionId)}`, {
method: "PATCH",
keepalive: true,
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`
}
});
}
});

async function init() {
if(!token) {
clearSessionAndRedirect();
return;
}

if(!playlistId) {
showStatus("A playlist is required to start Focus Mode.");
return;
}

try {
const data = await apiRequest(`/playlists/library/${encodeURIComponent(playlistId)}`);
state.playlist = data.playlist;
const videos = getVideos();
const matchingIndex = requestedVideoId
? videos.findIndex((video) => String(video.videoId || "") === requestedVideoId)
: -1;
const firstIncompleteIndex = videos.findIndex((video) => !video.completed);
state.currentIndex = matchingIndex >= 0
? matchingIndex
: Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < videos.length
? requestedIndex
: firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
render();
elements.layout.hidden = false;
resetTimer(25);
await startFocusSession();
} catch (error) {
showStatus(error.message);
}
}

init();
