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
document.querySelector(
".public-link button"
);

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

skills.forEach(
(item)=>{
const card =
document.createElement(
"div"
);
card.className =
"skill-card";

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
item.name
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
`Assessment Score: ${item.score}%`;

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
item.name;

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
"View"
)
);

card.appendChild(
awardIcon
);
card.appendChild(
title
);
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
()=>{
const input =
document.querySelector(
".public-link input"
);

navigator.clipboard.writeText(
input.value
);

copyBtn.innerHTML =
`<i class="fa-solid fa-check"></i> Copied`;
}
);

loadPortfolio();
