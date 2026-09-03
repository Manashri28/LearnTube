console.log("✅ NEW dashboard.js loaded");

const API_URL = "https://learntube-ei40.onrender.com";
const statIcons = [
"fa-list-check",
"fa-circle-check",
"fa-award",
"fa-chart-line"
];

const welcomeUser =
document.getElementById(
"welcomeUser"
);

const statsContainer =
document.getElementById(
"statsContainer"
);

const recentLearningContainer =
document.getElementById(
"recentLearningContainer"
);

const continueLearningBtn =
document.getElementById(
"continueLearningBtn"
);

const logoutBtn =
document.getElementById(
"logoutBtn"
);

const reviewPrompt = document.getElementById("reviewPrompt");
const reviewForm = document.getElementById("reviewForm");
const reviewText = document.getElementById("reviewText");
const reviewMessage = document.getElementById("reviewMessage");
const dismissReviewBtn = document.getElementById("dismissReviewBtn");
const reviewStars = document.querySelectorAll(".review-star");
let selectedRating = 0;

// localStorage stores the JWT received during login so protected pages can reuse it.
const token =
localStorage.getItem(
"token"
);

if(!token) {
window.location.href =
"login.html";
}

function clearSessionAndRedirect() {
// Logout removes authentication data from localStorage and sends the user back to login.
localStorage.removeItem(
"token"
);
localStorage.removeItem(
"user"
);
window.location.href =
"login.html";
}

logoutBtn.addEventListener(
"click",
clearSessionAndRedirect
);

function renderStats(stats) {
statsContainer.innerHTML =
"";

const statItems =
[
{
title:"Playlists Completed",
value:stats.playlistsCompleted || 0
},
{
title:"Skills Verified",
value:stats.skillsVerified || 0
},
{
title:"Certificates Earned",
value:stats.certificatesEarned || 0
},
{
title:"Average Score",
value:`${stats.averageScore || 0}%`
}
];

statItems.forEach(
(item,index)=>{
const card =
document.createElement(
"div"
);
card.className =
"stat-card";

const icon =
document.createElement(
"i"
);
icon.className =
`fa-solid ${statIcons[index]}`;

const value =
document.createElement(
"h3"
);
value.textContent =
item.value;

const title =
document.createElement(
"p"
);
title.textContent =
item.title;

card.appendChild(
icon
);
card.appendChild(
value
);
card.appendChild(
title
);
statsContainer.appendChild(
card
);
}
);
}

function buildPlaylistHref(item) {
const playlistId = item.playlistId || item._id;

return playlistId
? `playlist-details.html?playlistId=${encodeURIComponent(playlistId)}`
: "playlist.html";
}

function buildFocusHref(item) {
const playlistId = item.playlistId || item._id;
const videoId = item.videoId;

if(!playlistId) {
return "playlist.html";
}

return `focus-mode.html?playlistId=${encodeURIComponent(playlistId)}${videoId ? `&videoId=${encodeURIComponent(videoId)}` : ""}`;
}

function renderEmptyRecentLearning() {
const empty =
document.createElement(
"div"
);
empty.className =
"playlist-card";

const badge =
document.createElement(
"span"
);
badge.innerHTML =
`<i class="fa-solid fa-book-open"></i> Start learning`;

const title =
document.createElement(
"h3"
);
title.textContent =
"No learning history yet";

const text =
document.createElement(
"p"
);
text.textContent =
"Add a YouTube playlist to begin tracking your progress.";

empty.appendChild(
badge
);
empty.appendChild(
title
);
empty.appendChild(
text
);
recentLearningContainer.appendChild(
empty
);
}

function renderRecentLearning(recentLearning) {
recentLearningContainer.innerHTML =
"";

if(!recentLearning.length) {
renderEmptyRecentLearning();
return;
}

recentLearning.forEach(
(item)=>{
const card =
document.createElement(
"div"
);
card.className =
"playlist-card";

if(item.thumbnail) {
const thumbnail =
document.createElement(
"img"
);
thumbnail.src =
item.thumbnail;
thumbnail.alt =
`${item.title} thumbnail`;
thumbnail.style.width =
"100%";
thumbnail.style.aspectRatio =
"16 / 9";
thumbnail.style.objectFit =
"cover";
thumbnail.style.borderRadius =
"12px";
thumbnail.style.marginBottom =
"16px";
card.appendChild(
thumbnail
);
}

const badge =
document.createElement(
"span"
);

const badgeIcon =
document.createElement(
"i"
);
badgeIcon.className =
"fa-solid fa-play";

badge.appendChild(
badgeIcon
);
badge.appendChild(
document.createTextNode(
" Playlist"
)
);

const title =
document.createElement(
"h3"
);
title.textContent =
item.title;

const progressText =
document.createElement(
"p"
);
progressText.textContent =
`Progress: ${item.progress}%`;

const progressBar =
document.createElement(
"div"
);
progressBar.className =
"progress-bar";

const progressFill =
document.createElement(
"b"
);
progressFill.style.width =
`${item.progress}%`;

const continueLink =
document.createElement(
"a"
);
continueLink.className =
"primary-btn";
continueLink.href =
buildPlaylistHref(
item
);
continueLink.textContent =
"Continue";

const focusLink = document.createElement("a");
focusLink.className = "focus-link";
focusLink.href = buildFocusHref(item);
focusLink.textContent = "Focus Mode";

progressBar.appendChild(
progressFill
);
card.appendChild(
badge
);
card.appendChild(
title
);
card.appendChild(
progressText
);
card.appendChild(
progressBar
);
card.appendChild(
continueLink
);
card.appendChild(
focusLink
);
recentLearningContainer.appendChild(
card
);
}
);
}

function setContinueLearningTarget(continueLearning) {
const playlistId = continueLearning && continueLearning.playlistId;
const videoUrl = continueLearning && continueLearning.url;

if(continueLearning?.type === "video" && videoUrl) {
continueLearningBtn.href = videoUrl;
return;
}

continueLearningBtn.href = playlistId
? `playlist-details.html?playlistId=${encodeURIComponent(playlistId)}`
: "playlist.html";
}

function setReviewMessage(message, type = "") {
reviewMessage.textContent = message;
reviewMessage.className = `review-message ${type}`;
}

function showReviewPrompt() {
reviewPrompt.hidden = false;
}

function hideReviewPrompt() {
reviewPrompt.hidden = true;
}

reviewStars.forEach((star) => {
star.addEventListener("click", () => {
selectedRating = Number(star.dataset.rating);
reviewStars.forEach((item) => {
item.classList.toggle("selected", Number(item.dataset.rating) <= selectedRating);
});
});
});

async function loadReviewPrompt() {
try {
const response = await fetch(`${API_URL}/reviews/my-review`, {
headers: {
Authorization: `Bearer ${token}`
}
});

if(!response.ok) {
return;
}

const data = await response.json();
if(data.eligible && !data.review && !data.promptDismissed) {
showReviewPrompt();
}
} catch (error) {
return;
}
}

reviewForm.addEventListener("submit", async (event) => {
event.preventDefault();

if(!selectedRating) {
setReviewMessage("Please choose a rating from 1 to 5 stars.", "error");
return;
}

try {
const response = await fetch(`${API_URL}/reviews`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`
},
body: JSON.stringify({
rating: selectedRating,
text: reviewText.value
})
});
const data = await response.json();

if(!response.ok) {
setReviewMessage(data.message || "Unable to submit review.", "error");
return;
}

setReviewMessage("Thanks for sharing your feedback. It is pending approval.", "success");
window.setTimeout(hideReviewPrompt, 1200);
} catch (error) {
setReviewMessage("Unable to submit review right now.", "error");
}
});

dismissReviewBtn.addEventListener("click", async () => {
hideReviewPrompt();

try {
await fetch(`${API_URL}/reviews/dismiss`, {
method: "POST",
headers: {
Authorization: `Bearer ${token}`
}
});
} catch (error) {
return;
}
});

function setLoadingState() {
welcomeUser.textContent =
"Loading your dashboard...";
statsContainer.innerHTML =
"";
recentLearningContainer.innerHTML =
"";
}

async function loadDashboard() {
try {
setLoadingState();
// Authorization headers send the JWT to protected backend routes.
// The Bearer token format tells the backend this is a token-based authenticated request.
const response = await fetch(
`${API_URL}/api/dashboard`,
{
headers:{
Authorization:`Bearer ${token}`
}
}
);

const data =
await response.json();

if(!response.ok) {
if(response.status === 401) {
clearSessionAndRedirect();
return;
}

throw new Error(data.message || "Dashboard request failed.");
}

localStorage.setItem(
"user",
JSON.stringify(
data.user
)
);

welcomeUser.textContent =
`Welcome back, ${data.user.name} 👋`;

renderStats(
data.stats || {}
);
renderRecentLearning(
data.recentLearning || []
);
setContinueLearningTarget(
 data.continueLearning
 );
loadReviewPrompt();
} catch (error) {
welcomeUser.textContent =
"We could not load your dashboard right now.";
recentLearningContainer.innerHTML =
"";
renderEmptyRecentLearning();
}
}

loadDashboard();
