const API_URL = "http://localhost:5000";
const QUIZ_STATE_KEY = "learntubeQuizState";
const QUIZ_HISTORY_KEY = "learntubeQuizHistory";
const QUIZ_DURATION_MS = 15 * 60 * 1000;
const PASSING_PERCENTAGE = 75;
const token = localStorage.getItem("token");

if(!token) {
window.location.href = "login.html";
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

const views = {
generator: document.getElementById("generatorView"),
welcome: document.getElementById("welcomeView"),
loading: document.getElementById("loadingView"),
fullscreenPrompt: document.getElementById("fullscreenPromptView"),
aborted: document.getElementById("abortedView"),
quiz: document.getElementById("quizView"),
result: document.getElementById("resultView")
};
const elements = {
videoUrl: document.getElementById("videoUrl"),
generateBtn: document.getElementById("generateBtn"),
enterFullscreenBtn: document.getElementById("enterFullscreenBtn"),
generatorMessage: document.getElementById("generatorMessage"),
loadingMessage: document.getElementById("loadingMessage"),
historyList: document.getElementById("historyList"),
questionCounter: document.getElementById("questionCounter"),
videoTitle: document.getElementById("videoTitle"),
videoLink: document.getElementById("videoLink"),
timer: document.getElementById("timer"),
progressFill: document.getElementById("progressFill"),
difficultyBadge: document.getElementById("difficultyBadge"),
questionType: document.getElementById("questionType"),
questionTopic: document.getElementById("questionTopic"),
questionText: document.getElementById("questionText"),
answerArea: document.getElementById("answerArea"),
previousBtn: document.getElementById("previousBtn"),
skipBtn: document.getElementById("skipBtn"),
nextBtn: document.getElementById("nextBtn"),
submitBtn: document.getElementById("submitBtn"),
questionNav: document.getElementById("questionNav"),
answeredCount: document.getElementById("answeredCount"),
resultHero: document.getElementById("resultHero"),
scoreGrid: document.getElementById("scoreGrid"),
difficultyStats: document.getElementById("difficultyStats"),
strongAreas: document.getElementById("strongAreas"),
weakAreas: document.getElementById("weakAreas"),
learningAnalysis: document.getElementById("learningAnalysis"),
reviewList: document.getElementById("reviewList"),
toggleReviewBtn: document.getElementById("toggleReviewBtn"),
newQuizBtn: document.getElementById("newQuizBtn")
};

let state = null;
let timerInterval = null;
let difficultyChart = null;
let playlistQuiz = null;

async function checkQuizStatus() {
try {
const response = await fetch(`${API_URL}/assessments/quiz/status`, {
headers: {
Authorization: `Bearer ${token}`
}
});

if(response.status === 401) {
clearSessionAndRedirect();
return;
}

const data = await response.json();
if(response.ok && !data.geminiConfigured) {
elements.generatorMessage.textContent =
"Quiz page is ready, but the backend needs GEMINI_API_KEY in backend/.env before AI generation can run.";
}
} catch (error) {
elements.generatorMessage.textContent =
"Quiz page is ready, but the backend API is not reachable. Start the backend on port 5000.";
}
}

function showView(name) {
Object.entries(views).forEach(([key, view]) => {
view.classList.toggle("hidden", key !== name);
});
}

function saveState() {
if(state) {
const { quizAttemptPromise, ...persistedState } = state;
localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(persistedState));
}
}

function normalizeAnswer(value) {
return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isCorrect(question, answer) {
return normalizeAnswer(answer) === normalizeAnswer(question.correctAnswer);
}

function createTextElement(tag, text, className) {
const element = document.createElement(tag);
element.textContent = text;
if(className) element.className = className;
return element;
}

function renderHistory() {
const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || "[]");
elements.historyList.innerHTML = "";

if(!history.length) {
elements.historyList.appendChild(
createTextElement("p", "Your generated quiz attempts will appear here.", "empty-history")
);
return;
}

history.slice(0, 8).forEach((attempt) => {
const card = document.createElement("article");
card.className = "history-card";
card.append(
createTextElement("time", new Date(attempt.date).toLocaleDateString()),
createTextElement("h3", attempt.videoTitle),
createTextElement("p", `${attempt.score} / ${attempt.total} correct`),
createTextElement("strong", `${attempt.percentage}% ${attempt.percentage >= PASSING_PERCENTAGE ? "Passed" : "Keep learning"}`)
);
elements.historyList.appendChild(card);
});
}

async function generateQuizWithPayload(payload, messageElement = elements.generatorMessage) {
if(!payload.videoUrl && !payload.playlistId) {
elements.generatorMessage.textContent = "Paste a YouTube video URL to continue.";
return;
}

messageElement.textContent = "";
showView("loading");
const messages = [
"Analyzing Video...",
"Extracting Transcript...",
"Generating Questions...",
"Preparing Quiz..."
];
let messageIndex = 0;
elements.loadingMessage.textContent = messages[0];
const loadingInterval = setInterval(() => {
messageIndex = Math.min(messageIndex + 1, messages.length - 1);
elements.loadingMessage.textContent = messages[messageIndex];
}, 1800);

try {
const response = await fetch(`${API_URL}/assessments/generate`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`
},
body: JSON.stringify(payload)
});
const data = await response.json();

if(!response.ok) {
if(response.status === 401) {
clearSessionAndRedirect();
return;
}
throw new Error(data.message || "Quiz generation failed.");
}

state = {
status: "active",
videoTitle: data.videoTitle,
videoUrl: data.videoUrl,
playlistId: payload.playlistId || "",
questions: data.questions,
answers: {},
currentIndex: 0,
endsAt: Date.now() + QUIZ_DURATION_MS
};
saveState();
showFullscreenPrompt();
} catch (error) {
showView(payload.playlistId ? "welcome" : "generator");
messageElement.textContent = error.message;
} finally {
clearInterval(loadingInterval);
}
}

async function generateQuizFromUrl(videoUrl) {
return generateQuizWithPayload({ type: "video", videoUrl });
}

async function generateQuizFromPlaylist(playlistId) {
return generateQuizWithPayload(
{ type: "playlist", playlistId },
document.getElementById("welcomeMessage")
);
}

async function generateQuiz() {
const videoUrl = elements.videoUrl.value.trim();
return generateQuizFromUrl(videoUrl);
}

function showFullscreenPrompt() {
showView("fullscreenPrompt");
}

function startQuiz() {
showView("quiz");
elements.videoTitle.textContent = state.videoTitle;
elements.videoLink.href = state.videoUrl;

if (!document.fullscreenElement) {
document.documentElement.requestFullscreen().catch((err) => {
console.warn("Fullscreen request failed, but starting quiz anyway for fallback:", err);
});
}

document.addEventListener("fullscreenchange", handleFullscreenChange);

renderQuestion();
startTimer();
}

function handleFullscreenChange() {
if (!document.fullscreenElement && state && state.status === "active") {
abortQuiz();
}
}

function abortQuiz() {
if (!state || state.status !== "active") return;
clearInterval(timerInterval);
state.status = "aborted";
saveState();
showView("aborted");
saveQuizAttempt({ correct: 0, total: state.questions ? state.questions.length : 1, percentage: 0 }, "aborted");
}

function renderQuestion() {
const question = state.questions[state.currentIndex];
const currentAnswer = state.answers[question.id] || "";
elements.questionCounter.textContent = `Question ${state.currentIndex + 1} / ${state.questions.length}`;
elements.progressFill.style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;
elements.difficultyBadge.textContent = question.difficulty;
elements.difficultyBadge.className = `difficulty ${question.difficulty}`;
elements.questionType.textContent = question.type.replace("_", " / ");
elements.questionTopic.textContent = question.topic;
elements.questionText.textContent = question.question;
elements.answerArea.innerHTML = "";

if(question.type === "fill_blank") {
const input = document.createElement("input");
input.className = "fill-answer";
input.type = "text";
input.placeholder = "Type your answer";
input.value = currentAnswer;
input.addEventListener("input", () => recordAnswer(question.id, input.value));
elements.answerArea.appendChild(input);
} else {
question.options.forEach((option) => {
const label = document.createElement("label");
label.className = `option ${currentAnswer === option ? "selected" : ""}`;
const input = document.createElement("input");
input.type = "radio";
input.name = `question-${question.id}`;
input.value = option;
input.checked = currentAnswer === option;
input.addEventListener("change", () => {
recordAnswer(question.id, option);
renderQuestion();
});
label.append(input, createTextElement("span", option));
elements.answerArea.appendChild(label);
});
}

elements.previousBtn.disabled = state.currentIndex === 0;
elements.nextBtn.classList.toggle("hidden", state.currentIndex === state.questions.length - 1);
elements.submitBtn.classList.toggle("hidden", state.currentIndex !== state.questions.length - 1);
renderNavigator();
}

function recordAnswer(questionId, answer) {
if(normalizeAnswer(answer)) {
state.answers[questionId] = answer;
} else {
delete state.answers[questionId];
}
saveState();
renderNavigator();
}

function renderNavigator() {
elements.questionNav.innerHTML = "";
state.questions.forEach((question, index) => {
const button = createTextElement("button", index + 1, "nav-question");
if(state.answers[question.id]) button.classList.add("answered");
if(index === state.currentIndex) button.classList.add("current");
button.addEventListener("click", () => {
state.currentIndex = index;
saveState();
renderQuestion();
});
elements.questionNav.appendChild(button);
});
elements.answeredCount.textContent = `${Object.keys(state.answers).length} answered`;
}

function moveQuestion(offset) {
state.currentIndex = Math.max(0, Math.min(state.questions.length - 1, state.currentIndex + offset));
saveState();
renderQuestion();
}

function startTimer() {
clearInterval(timerInterval);
updateTimer();
timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
const remaining = Math.max(0, state.endsAt - Date.now());
const minutes = Math.floor(remaining / 60000);
const seconds = Math.floor((remaining % 60000) / 1000);
elements.timer.querySelector("strong").textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
elements.timer.classList.toggle("danger", remaining <= 60000);

if(remaining <= 0) {
clearInterval(timerInterval);
submitQuiz();
}
}

function calculateResult() {
const details = state.questions.map((question) => {
const answer = state.answers[question.id] || "";
return {
question,
answer,
correct: isCorrect(question, answer)
};
});
const correct = details.filter((item) => item.correct).length;
const unanswered = details.filter((item) => !normalizeAnswer(item.answer)).length;
const total = state.questions.length;
const percentage = Math.round((correct / total) * 100);
return {
details,
correct,
wrong: total - correct - unanswered,
unanswered,
total,
percentage,
passed: percentage >= PASSING_PERCENTAGE
};
}

function submitQuiz() {
if(!state || state.status === "complete") return;
clearInterval(timerInterval);
state.status = "complete";
state.result = calculateResult();
saveState();
saveHistory(state.result);
saveQuizAttempt(state.result);
renderResults();
requestLearningAnalysis();
}

function saveHistory(result) {
const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || "[]");
history.unshift({
videoTitle: state.videoTitle,
date: new Date().toISOString(),
score: result.correct,
total: result.total,
percentage: result.percentage
});
localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

async function saveQuizAttempt(result, status = "completed") {
if(state.quizAttemptId && status !== "aborted") {
return state.quizAttemptId;
}

if(state.quizAttemptPromise) {
return state.quizAttemptPromise;
}

state.quizAttemptPromise = (async () => {
try {
const data = await apiRequest("/assessments/attempts", {
method: "POST",
body: JSON.stringify({
videoTitle: state.videoTitle,
videoUrl: state.videoUrl,
playlistId: state.playlistId || "",
score: result.correct,
total: result.total,
percentage: result.percentage,
status,
analysis: state.analysis || null
})
});

if (status !== "aborted") {
state.quizAttemptId = data.attempt.id;
saveState();
}
return data.attempt.id;
} catch (error) {
console.warn("Quiz attempt was not saved to MongoDB:", error.message);
return null;
} finally {
state.quizAttemptPromise = null;
}
})();

return state.quizAttemptPromise;
}

function topicPerformance(result) {
const topics = {};
result.details.forEach(({ question, correct }) => {
if(!topics[question.topic]) topics[question.topic] = { correct: 0, total: 0 };
topics[question.topic].total += 1;
if(correct) topics[question.topic].correct += 1;
});
return Object.entries(topics).map(([topic, score]) => ({
topic,
...score,
percentage: Math.round((score.correct / score.total) * 100)
}));
}

function difficultyPerformance(result) {
return ["easy", "medium", "hard"].map((difficulty) => {
const entries = result.details.filter((item) => item.question.difficulty === difficulty);
return {
difficulty,
correct: entries.filter((item) => item.correct).length,
total: entries.length
};
});
}

function renderResults() {
showView("result");
const result = state.result;
elements.resultHero.className = `result-hero glass-card ${result.passed ? "pass" : "fail"}`;
elements.resultHero.innerHTML = "";
const icon = document.createElement("div");
icon.className = "result-icon";
icon.innerHTML = `<i class="fa-solid ${result.passed ? "fa-trophy" : "fa-book-open"}"></i>`;
elements.resultHero.append(
icon,
createTextElement("h2", result.passed ? "Congratulations, you passed!" : "Keep learning, then try again."),
createTextElement("p", `${state.videoTitle} · ${result.percentage}%`)
);
const canClaimCertificate = Boolean(state.playlistId) && result.passed;
const eligibility = createTextElement(
	"div",
	canClaimCertificate
	? "You are eligible for a certificate."
	: result.passed
	? "You passed this video quiz. Complete the playlist final assessment to become certificate eligible."
	: `Score ${PASSING_PERCENTAGE}% or higher to become certificate eligible.`,
	"eligibility"
	);
elements.resultHero.appendChild(eligibility);
if(canClaimCertificate) {
const button = createTextElement("button", "Claim Certificate", "primary-btn");
button.addEventListener("click", handleCertificateClaim);
elements.resultHero.appendChild(button);
}

const scoreItems = [
["Score", `${result.correct} / ${result.total}`],
["Correct", result.correct],
["Wrong", result.wrong],
["Unanswered", result.unanswered],
["Percentage", `${result.percentage}%`]
];
elements.scoreGrid.innerHTML = "";
scoreItems.forEach(([label, value]) => {
const card = document.createElement("article");
card.className = "score-card";
card.append(createTextElement("h3", value), createTextElement("p", label));
elements.scoreGrid.appendChild(card);
});

const difficulty = difficultyPerformance(result);
renderDifficultyChart(difficulty);
renderTopics(topicPerformance(result));
renderReview(result);
renderLearningAnalysis(state.analysis || createFallbackAnalysis(result));
}

function renderDifficultyChart(difficulty) {
elements.difficultyStats.innerHTML = "";
difficulty.forEach((item) => {
const card = document.createElement("div");
card.className = "difficulty-stat";
card.append(createTextElement("strong", `${item.correct} / ${item.total}`), createTextElement("span", item.difficulty));
elements.difficultyStats.appendChild(card);
});

if(difficultyChart) difficultyChart.destroy();
if(typeof Chart === "undefined") return;
difficultyChart = new Chart(document.getElementById("difficultyChart"), {
type: "bar",
data: {
labels: difficulty.map((item) => item.difficulty),
datasets: [{
label: "Correct answers",
data: difficulty.map((item) => item.correct),
backgroundColor: ["#4ade80", "#facc15", "#fb7185"],
borderRadius: 8
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
scales: {
y: { beginAtZero: true, max: 5, ticks: { color: "#b9aed0", stepSize: 1 }, grid: { color: "rgba(255,255,255,.07)" } },
x: { ticks: { color: "#b9aed0" }, grid: { display: false } }
},
plugins: { legend: { display: false } }
}
});
}

function renderTopics(topics) {
const strong = topics.filter((item) => item.percentage >= 70);
const weak = topics.filter((item) => item.percentage < 70);
renderTopicList(elements.strongAreas, strong, "No strong area identified yet.");
renderTopicList(elements.weakAreas, weak, "No weak areas identified.");
}

function renderTopicList(container, topics, emptyText) {
container.innerHTML = "";
if(!topics.length) {
container.appendChild(createTextElement("li", emptyText));
return;
}
topics.forEach((item) => container.appendChild(
createTextElement("li", `${item.topic} · ${item.correct}/${item.total}`)
));
}

function createFallbackAnalysis(result) {
const topics = topicPerformance(result);
const weak = topics.filter((item) => item.percentage < 70).map((item) => item.topic);
return {
overallUnderstanding: result.passed
? "You demonstrate a solid understanding of the video's core ideas."
: "You have started building familiarity, but several concepts need reinforcement.",
knowledgeGaps: weak.length ? weak : ["No major knowledge gaps were identified."],
suggestedImprovements: ["Review incorrect answers and their explanations.", "Rewatch the sections connected to weaker topics."],
recommendedTopics: weak.length ? weak : topics.slice(0, 3).map((item) => item.topic),
recommendedNextStep: "Apply the concepts in a small practical exercise, then retake the quiz."
};
}

function renderLearningAnalysis(analysis) {
const sections = [
["Overall Understanding", analysis.overallUnderstanding],
["Knowledge Gaps", analysis.knowledgeGaps],
["Suggested Improvements", analysis.suggestedImprovements],
["Recommended Topics", analysis.recommendedTopics],
["Recommended Next Step", analysis.recommendedNextStep]
];
elements.learningAnalysis.innerHTML = "";
sections.forEach(([title, content]) => {
const item = document.createElement("article");
item.className = "learning-item";
item.appendChild(createTextElement("h3", title));
if(Array.isArray(content)) {
const list = document.createElement("ul");
content.forEach((entry) => list.appendChild(createTextElement("li", entry)));
item.appendChild(list);
} else {
item.appendChild(createTextElement("p", content || "Analysis is being prepared."));
}
elements.learningAnalysis.appendChild(item);
});
}

async function requestLearningAnalysis() {
const attempt = {
videoTitle: state.videoTitle,
percentage: state.result.percentage,
topics: topicPerformance(state.result),
difficulty: difficultyPerformance(state.result),
incorrectQuestions: state.result.details
.filter((item) => !item.correct)
.map((item) => ({ topic: item.question.topic, question: item.question.question }))
};

try {
const response = await fetch(`${API_URL}/assessments/analyze`, {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${token}`
},
body: JSON.stringify(attempt)
});
const data = await response.json();
if(!response.ok) throw new Error(data.message);
state.analysis = data;
saveState();
renderLearningAnalysis(data);
} catch (error) {
console.warn("Using local learning analysis:", error.message);
}
}

function renderReview(result) {
elements.reviewList.innerHTML = "";
result.details.forEach((item, index) => {
const card = document.createElement("article");
card.className = `review-item ${item.correct ? "correct" : ""}`;
card.append(
createTextElement("h3", `${index + 1}. ${item.question.question}`),
createTextElement("p", `Your answer: ${item.answer || "Unanswered"}`),
createTextElement("p", `Correct answer: ${item.question.correctAnswer}`),
createTextElement("p", `Explanation: ${item.question.explanation}`)
);
elements.reviewList.appendChild(card);
});
}

async function handleCertificateClaim(event) {
const button = event?.currentTarget;

if(button) {
button.disabled = true;
button.textContent = "Generating...";
}

try {
const quizAttemptId = state.quizAttemptId || await saveQuizAttempt(state.result);
await apiRequest("/certificate", {
method: "POST",
body: JSON.stringify({
title: `${state.videoTitle} Certificate`,
score: state.result.percentage,
playlistId: state.playlistId || "",
quizAttemptId
})
});

if(button) {
button.textContent = "Certificate Claimed";
}

window.alert("Certificate generated successfully.");
} catch (error) {
if(button) {
button.disabled = false;
button.textContent = "Claim Certificate";
}

window.alert(error.message || "Certificate generation failed.");
}
}

function resetQuiz() {
clearInterval(timerInterval);
localStorage.removeItem(QUIZ_STATE_KEY);
state = null;
elements.videoUrl.value = "";
elements.generatorMessage.textContent = "";
renderHistory();
if(playlistQuiz) {
showPlaylistWelcome();
} else {
showView("generator");
}
}

async function loadPlaylistQuiz() {
const playlistId = new URLSearchParams(window.location.search).get("playlistId");

if(!playlistId) {
return false;
}

showView("welcome");

try {
const [playlistData, statusData] = await Promise.all([
apiRequest(`/playlists/library/${encodeURIComponent(playlistId)}`),
apiRequest("/assessments/quiz/status")
]);

const playlist = playlistData.playlist;

playlistQuiz = {
playlist,
playlistId: playlist.playlistId || playlist.itemId || playlist.id || playlistId
};

document.getElementById("welcomePlaylistTitle").textContent = playlist.displayTitle || playlist.title || "Playlist Quiz";
document.getElementById("welcomeQuestionCount").textContent = statusData?.playlistQuestionCount || 45;
document.getElementById("welcomeMessage").textContent = "";
document.getElementById("startPlaylistQuizBtn").disabled = false;
} catch (error) {
document.getElementById("welcomePlaylistTitle").textContent = "Playlist Quiz";
document.getElementById("welcomeMessage").textContent = error.message;
document.getElementById("startPlaylistQuizBtn").disabled = true;
}

return true;
}

function showPlaylistWelcome() {
localStorage.removeItem(QUIZ_STATE_KEY);
state = null;
showView("welcome");
}

elements.generateBtn.addEventListener("click", generateQuiz);
elements.videoUrl.addEventListener("keydown", (event) => {
if(event.key === "Enter") generateQuiz();
});
elements.previousBtn.addEventListener("click", () => moveQuestion(-1));
elements.nextBtn.addEventListener("click", () => moveQuestion(1));
elements.skipBtn.addEventListener("click", () => moveQuestion(1));
elements.submitBtn.addEventListener("click", submitQuiz);
elements.toggleReviewBtn.addEventListener("click", () => {
const hidden = elements.reviewList.classList.toggle("hidden");
elements.toggleReviewBtn.textContent = hidden ? "Show Review" : "Hide Review";
});
elements.newQuizBtn.addEventListener("click", resetQuiz);
elements.enterFullscreenBtn.addEventListener("click", () => {
document.documentElement.requestFullscreen()
.then(() => {
startQuiz();
})
.catch((err) => {
console.error("Fullscreen request failed:", err);
alert("Fullscreen is required to start the quiz. Please try again.");
});
});
document.getElementById("backToPlaylistBtn").addEventListener("click", () => {
const playlistId = playlistQuiz?.playlist?.playlistId || new URLSearchParams(window.location.search).get("playlistId");
window.location.href = `playlist-details.html?playlistId=${encodeURIComponent(playlistId || "")}`;
});
document.getElementById("startPlaylistQuizBtn").addEventListener("click", () => {
if(!playlistQuiz?.playlistId) {
document.getElementById("welcomeMessage").textContent = "This playlist is not ready for quiz generation.";
return;
}

localStorage.removeItem(QUIZ_STATE_KEY);
state = null;
generateQuizFromPlaylist(playlistQuiz.playlistId);
});

async function restore() {
renderHistory();

if(await loadPlaylistQuiz()) {
return;
}

try {
state = JSON.parse(localStorage.getItem(QUIZ_STATE_KEY));
} catch (error) {
localStorage.removeItem(QUIZ_STATE_KEY);
}

const videoUrl = new URLSearchParams(window.location.search).get("videoUrl");

if(videoUrl) {
localStorage.removeItem(QUIZ_STATE_KEY);
elements.videoUrl.value = videoUrl;
generateQuizFromUrl(videoUrl);
return;
}

if(!state) {
showView("generator");
checkQuizStatus();
} else if(state.status === "complete") {
renderResults();
} else if(state.status === "aborted") {
showView("aborted");
} else {
showFullscreenPrompt();
}
}

restore();
