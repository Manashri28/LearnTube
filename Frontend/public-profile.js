const API_URL = "https://learntube-ei40.onrender.com";


const profileContent = document.getElementById("profileContent");
const profileDetails = document.getElementById("profileDetails");
const profileStatus = document.getElementById("profileStatus");
const profileName = document.getElementById("profileName");
const skillsContainer = document.getElementById("skillsContainer");
const certificatesContainer = document.getElementById("certificatesContainer");
const completedCoursesContainer = document.getElementById("completedCoursesContainer");

function renderEmptyState(container, message) {
const emptyState = document.createElement("p");
emptyState.className = "empty-state";
emptyState.textContent = message;
container.appendChild(emptyState);
}

function renderSkills(skills) {
skillsContainer.innerHTML = "";

if(!skills.length) {
renderEmptyState(skillsContainer, "No verified skills yet.");
return;
}

skills.forEach((skill) => {
const card = document.createElement("article");
card.className = "profile-card";
const icon = document.createElement("i");
icon.className = "fa-solid fa-circle-check";
const badge = document.createElement("span");
badge.className = "badge-label";
badge.textContent = skill.badge;
const title = document.createElement("h3");
title.textContent = skill.name;
const score = document.createElement("p");
score.textContent = `Assessment Score: ${skill.score}%`;
card.append(icon, badge, title, score);
skillsContainer.appendChild(card);
});
}

function renderCertificates(certificates) {
certificatesContainer.innerHTML = "";

if(!certificates.length) {
renderEmptyState(certificatesContainer, "No certificates earned yet.");
return;
}

certificates.forEach((certificate) => {
const card = document.createElement("article");
card.className = "profile-card";
const icon = document.createElement("i");
icon.className = "fa-solid fa-award";
const title = document.createElement("h3");
title.textContent = certificate.title;
const score = document.createElement("p");
score.textContent = `Assessment Score: ${certificate.score}%`;
card.append(icon, title, score);
certificatesContainer.appendChild(card);
});
}

function renderCompletedCourses(completedCourses) {
completedCoursesContainer.innerHTML = "";

if(!completedCourses.length) {
renderEmptyState(completedCoursesContainer, "No completed learning yet.");
return;
}

completedCourses.forEach((course) => {
const card = document.createElement("article");
card.className = "profile-card";
const icon = document.createElement("i");
icon.className = "fa-solid fa-play";
const title = document.createElement("h3");
title.textContent = course.title;
const completion = document.createElement("p");
completion.textContent = "Completed through LearnTube";
card.append(icon, title, completion);
completedCoursesContainer.appendChild(card);
});
}

function showStatus(iconClass, message) {
profileStatus.innerHTML = "";
const icon = document.createElement("i");
icon.className = iconClass;
const text = document.createElement("p");
text.textContent = message;
profileStatus.append(icon, text);
profileStatus.hidden = false;
}

async function loadPublicProfile() {
const publicProfileId = new URLSearchParams(window.location.search).get("profile");

if(!publicProfileId) {
showStatus("fa-solid fa-user-slash", "Profile not found.");
return;
}

try {
const response = await fetch(`${API_URL}/api/public-profiles/${encodeURIComponent(publicProfileId)}`);

if(!response.ok) {
showStatus("fa-solid fa-user-slash", "Profile not found.");
return;
}

const data = await response.json();
profileName.textContent = data.profile.displayName;
renderSkills(data.profile.skills);
renderCertificates(data.profile.certificates);
renderCompletedCourses(data.profile.completedCourses);
profileStatus.hidden = true;
profileContent.hidden = false;
profileDetails.hidden = false;
} catch (error) {
showStatus("fa-solid fa-triangle-exclamation", "Unable to load this public profile.");
}
}

loadPublicProfile();
