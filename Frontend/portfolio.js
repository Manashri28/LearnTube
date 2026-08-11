const API_URL =
"http://localhost:5000";

const portfolioStatsContainer =
document.getElementById(
"portfolioStatsContainer"
);

const skillsContainer =
document.getElementById(
"skillsContainer"
);

const certificatesContainer =
document.getElementById(
"certificatesContainer"
);

const profileName =
document.getElementById(
"profileName"
);

const logoutBtn =
document.getElementById(
"logoutBtn"
);

const copyBtn =
document.getElementById(
"copyProfileUrlBtn"
);

const shareProfileBtn =
document.getElementById(
"shareProfileBtn"
);

const publicProfileUrl =
document.getElementById(
"publicProfileUrl"
);

const portfolioSections = document.querySelectorAll("[data-section]");
const portfolioTabLinks = document.querySelectorAll("[data-tab]");

function setActivePortfolioTab() {
const requestedTab = new URLSearchParams(window.location.search).get("tab");
const activeTab = ["profile", "skills", "certifications"].includes(requestedTab)
? requestedTab
: "profile";

portfolioSections.forEach((section) => {
section.classList.toggle("portfolio-section-hidden", section.dataset.section !== activeTab);
});

portfolioTabLinks.forEach((link) => {
link.classList.toggle("active", link.dataset.tab === activeTab);
});
}

setActivePortfolioTab();

// localStorage stores the JWT from login so this protected page can call the backend.
const token =
localStorage.getItem(
"token"
);

if(!token) {
window.location.href =
"login.html";
}

function clearSessionAndRedirect() {
// Logout removes both token and user data, then redirects to the login screen.
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

function getPublicProfileUrl(publicProfileId) {
const url = new URL(
"public-profile.html",
window.location.href
);
url.searchParams.set(
"profile",
publicProfileId
);
return url.toString();
}

function renderPortfolioStats(stats) {
portfolioStatsContainer.innerHTML =
"";

stats.forEach(
(item)=>{
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
`fa-solid ${item.icon}`;

const value =
document.createElement(
"h2"
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
portfolioStatsContainer.appendChild(
card
);
}
);
}

function renderSkills(skills) {
skillsContainer.innerHTML =
"";

if(!skills.length) {
const emptyState = document.createElement("p");
emptyState.className = "portfolio-empty-state";
emptyState.textContent = "No skills earned yet. Complete assessments to unlock skill badges.";
skillsContainer.appendChild(emptyState);
return;
}

skills.forEach(
(item)=>{
const card =
document.createElement(
"div"
);
card.className =
`skill-card ${item.earned ? "skill-earned" : "skill-unearned"}`;

const badge =
document.createElement(
"span"
);

const badgeIcon =
document.createElement(
"i"
);
badgeIcon.className =
item.earned ? "fa-solid fa-circle-check" : "fa-solid fa-lock";

badge.appendChild(
badgeIcon
);
badge.appendChild(
document.createTextNode(
item.earned ? "Verified Skill" : "Skill In Progress"
)
);

const title =
document.createElement(
"h3"
);
title.textContent =
item.name;

const score =
document.createElement(
"p"
);
score.textContent =
item.achievement || `Assessment Score: ${item.score}%`;

card.appendChild(
badge
);
card.appendChild(
title
);
card.appendChild(
score
);
skillsContainer.appendChild(
card
);
}
);
}

function renderCertificates(certificates) {
certificatesContainer.innerHTML =
"";

if(!certificates.length) {
const emptyState = document.createElement("p");
emptyState.className = "portfolio-empty-state";
emptyState.textContent = "No certificates earned yet. Pass a final playlist assessment to earn one.";
certificatesContainer.appendChild(emptyState);
return;
}

certificates.forEach(
(item)=>{
const card =
document.createElement(
"div"
);
card.className =
"certificate-card";

const awardIcon =
document.createElement(
"i"
);
awardIcon.className =
"fa-solid fa-award";

const title =
document.createElement(
"h3"
);
title.textContent =
item.title;

const course = document.createElement("p");
course.className = "certificate-detail";
course.textContent = `Course: ${item.courseTitle}`;

const channel = document.createElement("p");
channel.className = "certificate-detail";
channel.textContent = `Mentor/Channel: ${item.channelName}`;

const completionDate = document.createElement("p");
completionDate.className = "certificate-detail";
completionDate.textContent = `Completed: ${new Date(item.completionDate).toLocaleDateString()}`;

const score = document.createElement("p");
score.className = "certificate-detail";
score.textContent = `Final Assessment: ${item.score}%`;

const certificateId = document.createElement("p");
certificateId.className = "certificate-detail";
certificateId.textContent = `Certificate ID: ${item.certificateId}`;

const button =
document.createElement(
"button"
);

const buttonIcon =
document.createElement(
"i"
);
buttonIcon.className =
"fa-solid fa-eye";

button.appendChild(
buttonIcon
);
button.appendChild(
document.createTextNode(
"View / Download"
)
);

button.addEventListener("click", () => {
window.location.href = `certificate.html?certificateId=${encodeURIComponent(item.id)}`;
});

card.appendChild(
awardIcon
);
card.appendChild(
title
);
card.appendChild(course);
card.appendChild(channel);
card.appendChild(completionDate);
card.appendChild(score);
card.appendChild(certificateId);
card.appendChild(
button
);
certificatesContainer.appendChild(
card
);
}
);
}

async function loadPortfolio() {
try {
// Authorization sends the JWT in the request header.
// Bearer tokens are the common format for passing JWTs to protected APIs.
const response = await fetch(
`${API_URL}/portfolio`,
{
headers:{
Authorization:`Bearer ${token}`
}
}
);

const data =
await response.json();

if(!response.ok) {
clearSessionAndRedirect();
return;
}

localStorage.setItem(
"user",
JSON.stringify(
data.user
)
);

profileName.textContent =
data.user.name;

publicProfileUrl.value =
getPublicProfileUrl(
data.user.publicProfileId
);

renderPortfolioStats(
data.stats
);
renderSkills(
data.skills
);
renderCertificates(
data.certificates
);
} catch (error) {
clearSessionAndRedirect();
}
}

copyBtn.addEventListener(
"click",
async ()=>{
await navigator.clipboard.writeText(
publicProfileUrl.value
);

copyBtn.innerHTML =
`<i class="fa-solid fa-check"></i> Copied`;
}
);

shareProfileBtn.addEventListener(
"click",
async ()=>{
const url = publicProfileUrl.value;

if(navigator.share) {
await navigator.share({
title: "LearnTube Public Profile",
url
});
return;
}

await navigator.clipboard.writeText(
url
);
copyBtn.innerHTML =
`<i class="fa-solid fa-check"></i> Copied`;
}
);

loadPortfolio();
