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

const PROCTOR_MAX_TAB_SWITCHES = 1;
const PROCTOR_MAX_PERSON_VIOLATIONS = 2;
const PROCTOR_MAX_FULLSCREEN_VIOLATIONS = 2;
const PROCTOR_MAX_CAMERA_VIOLATIONS = 1;

let proctorState = {
isActive: false,
tabSwitchViolations: 0,
fullscreenViolations: 0,
cameraViolations: 0,
personPresenceViolations: 0,
personAbsenceFrames: 0,
multiplePersonFrames: 0,
stream: null,
faceModel: null,
detectionInterval: null,
status: "completed"
};

const views = {
generator: document.getElementById("generatorView"),
welcome: document.getElementById("welcomeView"),
loading: document.getElementById("loadingView"),
proctorInstructions: document.getElementById("proctorInstructionsView"),
abort: document.getElementById("abortView"),
quiz: document.getElementById("quizView"),
result: document.getElementById("resultView")
};
const elements = {
videoUrl: document.getElementById("videoUrl"),
generateBtn: document.getElementById("generateBtn"),
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
difficultyChart: document.getElementById("difficultyChart"),
difficultyStats: document.getElementById("difficultyStats"),
strongAreas: document.getElementById("strongAreas"),
weakAreas: document.getElementById("weakAreas"),
learningAnalysis: document.getElementById("learningAnalysis"),
reviewList: document.getElementById("reviewList"),
toggleReviewBtn: document.getElementById("toggleReviewBtn"),
newQuizBtn: document.getElementById("newQuizBtn")
};

let state = null;
let timerInterval;
let chartInstance;
let statusData = null;
let playlistQuiz = null;

function saveState() {
if(state) {
localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
} else {
localStorage.removeItem(QUIZ_STATE_KEY);
}
}

function showView(viewName) {
Object.values(views).forEach((v) => v.classList.add("hidden"));
if(views[viewName]) {
views[viewName].classList.remove("hidden");
}
}

async function checkQuizStatus() {
try {
statusData = await apiRequest("/assessments/quiz/status");
} catch (error) {
elements.generatorMessage.textContent = "Error checking quiz service status.";
}
}

async function loadPlaylistQuiz() {
const params = new URLSearchParams(window.location.search);
const playlistId = params.get("playlistId");

if(!playlistId) {
return false;
}

try {
playlistQuiz = await apiRequest(`/playlists/${playlistId}`);

if(!playlistQuiz || !playlistQuiz.playlist) {
return false;
}

const playlist = playlistQuiz.playlist;

if(!playlist.completed) {
window.location.href = `playlist-details.html?playlistId=${encodeURIComponent(playlistId)}`;
return true;
}

showPlaylistWelcome(playlist);
return true;
} catch (error) {
return false;
}
}

async function generateQuizWithPayload(payload, messageElement = elements.generatorMessage) {
if(elements.generateBtn) elements.generateBtn.disabled = true;
messageElement.textContent = "";
showView("loading");

let loadingInterval;
const loadingMessages = [
"Analyzing video...",
"Extracting transcript...",
"Identifying key concepts...",
"Formulating questions...",
"Balancing difficulty...",
"Finalizing assessment..."
];
let msgIndex = 0;
elements.loadingMessage.textContent = loadingMessages[0];
loadingInterval = setInterval(() => {
msgIndex = (msgIndex + 1) % loadingMessages.length;
elements.loadingMessage.textContent = loadingMessages[msgIndex];
}, 2500);

try {
const data = await apiRequest("/assessments/generate", {
method: "POST",
body: JSON.stringify(payload)
});

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
startQuiz();
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

function startQuiz() {
const isProctoredMode = new URLSearchParams(window.location.search).get("proctored") === "true";

if (isProctoredMode && !proctorState.isActive) {
  showProctorInstructions();
  return;
}

showView("quiz");

if (!isProctoredMode) {
    document.querySelector(".proctor-status-bar").style.display = "none";
} else {
    document.querySelector(".proctor-status-bar").style.display = "flex";
}

elements.videoTitle.textContent = state.videoTitle;
elements.videoLink.href = state.videoUrl;
renderQuestion();
startTimer();
}

function showProctorInstructions() {
    showView("proctorInstructions");
    document.getElementById("proctorSetupMessage").textContent = "";
}

document.getElementById("cancelProctorBtn").addEventListener("click", () => {
    state = null;
    localStorage.removeItem(QUIZ_STATE_KEY);
    window.location.href = "dashboard.html";
});

document.getElementById("acceptProctorBtn").addEventListener("click", async () => {
    const btn = document.getElementById("acceptProctorBtn");
    const msg = document.getElementById("proctorSetupMessage");
    btn.disabled = true;
    msg.textContent = "Requesting permissions and setting up proctoring...";

    try {
        await setupProctoring();
        proctorState.isActive = true;
        proctorState.status = "started";
        startQuiz();
    } catch (err) {
        msg.textContent = "Error: " + err.message;
        btn.disabled = false;
    }
});

async function setupProctoring() {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        }
    } catch (err) {
        throw new Error("Fullscreen mode is required.");
    }

    try {
        proctorState.stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoElement = document.getElementById("cameraPreview");
        videoElement.srcObject = proctorState.stream;
        document.getElementById("cameraPreviewContainer").classList.remove("hidden");
    } catch (err) {
        throw new Error("Camera permission is required.");
    }

    try {
        document.getElementById("proctorSetupMessage").textContent = "Loading face detection model...";
        proctorState.faceModel = await blazeface.load();
    } catch (err) {
        throw new Error("Failed to load proctoring model.");
    }

    startProctorMonitoring();
}

function startProctorMonitoring() {
    proctorState.detectionInterval = setInterval(async () => {
        if (!proctorState.isActive || proctorState.status === "aborted") return;

        const video = document.getElementById("cameraPreview");
        if (video.readyState === 4 && proctorState.faceModel) {
            try {
                const predictions = await proctorState.faceModel.estimateFaces(video, false);

                if (predictions.length === 0) {
                    proctorState.personAbsenceFrames++;
                    proctorState.multiplePersonFrames = 0;
                } else if (predictions.length > 1) {
                    proctorState.multiplePersonFrames++;
                    proctorState.personAbsenceFrames = 0;
                } else {
                    proctorState.personAbsenceFrames = 0;
                    proctorState.multiplePersonFrames = 0;
                }

                if (proctorState.personAbsenceFrames > 15 || proctorState.multiplePersonFrames > 15) {
                    proctorState.personPresenceViolations++;
                    proctorState.personAbsenceFrames = 0;
                    proctorState.multiplePersonFrames = 0;
                    updateProctorStatus();

                    if (proctorState.personPresenceViolations > PROCTOR_MAX_PERSON_VIOLATIONS) {
                        abortAssessment("Repeated person-presence violations detected.");
                    }
                }
            } catch (err) {
                console.error("Face detection error:", err);
            }
        }
    }, 500);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    if (proctorState.stream) {
        proctorState.stream.getVideoTracks()[0].addEventListener("ended", handleCameraDisconnect);
    }
}

function handleVisibilityChange() {
    if (!proctorState.isActive || proctorState.status === "aborted" || document.visibilityState === "visible") return;

    proctorState.tabSwitchViolations++;
    updateProctorStatus();

    if (proctorState.tabSwitchViolations > PROCTOR_MAX_TAB_SWITCHES) {
        abortAssessment("You left the assessment tab or window more than once.");
    } else {
        alert("Warning: Do not leave the assessment tab. Repeated violations will terminate the assessment.");
    }
}

function handleFullscreenChange() {
    if (!proctorState.isActive || proctorState.status === "aborted" || document.fullscreenElement) return;

    proctorState.fullscreenViolations++;
    updateProctorStatus();

    document.getElementById("fullscreenStatus").innerHTML = '<i class="fa-solid fa-expand"></i> Exited';
    document.getElementById("fullscreenStatus").className = "error";

    if (proctorState.fullscreenViolations > PROCTOR_MAX_FULLSCREEN_VIOLATIONS) {
        abortAssessment("Repeatedly exiting fullscreen mode.");
    } else {
        alert("Warning: You must remain in fullscreen mode. Please return to fullscreen.");
    }
}

function handleCameraDisconnect() {
    if (!proctorState.isActive || proctorState.status === "aborted") return;
    proctorState.cameraViolations++;
    updateProctorStatus();
    document.getElementById("cameraStatus").innerHTML = '<i class="fa-solid fa-video-slash"></i> Disconnected';
    document.getElementById("cameraStatus").className = "error";

    if (proctorState.cameraViolations > PROCTOR_MAX_CAMERA_VIOLATIONS) {
        abortAssessment("Persistent camera loss detected.");
    } else {
        alert("Warning: Camera disconnected. Please reconnect your camera.");
    }
}

function updateProctorStatus() {
    const totalViolations = proctorState.tabSwitchViolations + proctorState.fullscreenViolations + proctorState.cameraViolations + proctorState.personPresenceViolations;
    document.getElementById("violationStatus").innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Violations: ${totalViolations}`;
    if (totalViolations > 0) {
        document.getElementById("violationStatus").className = "warning";
    }
}

function abortAssessment(reason) {
    proctorState.status = "aborted";
    clearInterval(timerInterval);
    stopProctoring();

    document.getElementById("abortMessage").textContent = `Your assessment was automatically terminated because: ${reason}`;
    showView("abort");

    // Attempt to save the aborted state to backend
    state.status = "complete";
    state.result = calculateResult();
    saveQuizAttempt(state.result).catch(() => {});

    localStorage.removeItem(QUIZ_STATE_KEY);
    state = null;
}

function stopProctoring() {
    proctorState.isActive = false;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    if (proctorState.stream) {
        proctorState.stream.getTracks().forEach(track => track.stop());
    }
    if (proctorState.detectionInterval) {
        clearInterval(proctorState.detectionInterval);
    }
    document.getElementById("cameraPreviewContainer").classList.add("hidden");

    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
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
label.appendChild(input);
label.appendChild(document.createTextNode(option));
elements.answerArea.appendChild(label);
});
}

elements.previousBtn.disabled = state.currentIndex === 0;

const isLast = state.currentIndex === state.questions.length - 1;
elements.nextBtn.classList.toggle("hidden", isLast);
elements.submitBtn.classList.toggle("hidden", !isLast);

renderNavigator();
}

function recordAnswer(questionId, answer) {
state.answers[questionId] = answer;
saveState();
renderNavigator();
}

function renderNavigator() {
elements.questionNav.innerHTML = "";
let answeredCount = 0;

state.questions.forEach((question, index) => {
const btn = document.createElement("button");
const hasAnswer = !!state.answers[question.id];
if(hasAnswer) answeredCount++;

btn.className = `nav-question ${hasAnswer ? "answered" : ""} ${index === state.currentIndex ? "current" : ""}`;
btn.textContent = index + 1;
btn.addEventListener("click", () => {
state.currentIndex = index;
saveState();
renderQuestion();
});
elements.questionNav.appendChild(btn);
});

elements.answeredCount.textContent = `${answeredCount} answered`;
}

function moveQuestion(direction) {
const newIndex = state.currentIndex + direction;
if(newIndex >= 0 && newIndex < state.questions.length) {
state.currentIndex = newIndex;
saveState();
renderQuestion();
}
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
const userAnswer = state.answers[question.id] || "";
const isCorrect = typeof question.answer === "string"
? userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim()
: question.answer.includes(userAnswer);

return {
...question,
userAnswer,
isCorrect
};
});

const correct = details.filter((d) => d.isCorrect).length;
const total = state.questions.length;
const percentage = Math.round((correct / total) * 100);
const passed = percentage >= PASSING_PERCENTAGE;

return {
correct,
total,
percentage,
passed,
details
};
}

function submitQuiz() {
if(!state || state.status === "complete") return;
clearInterval(timerInterval);
stopProctoring();
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

async function saveQuizAttempt(result) {
if(state.quizAttemptId) {
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
analysis: state.analysis || null,
proctored: proctorState.isActive,
tabSwitchViolations: proctorState.tabSwitchViolations,
fullscreenViolations: proctorState.fullscreenViolations,
cameraViolations: proctorState.cameraViolations,
personPresenceViolations: proctorState.personPresenceViolations,
status: proctorState.status
})
});

state.quizAttemptId = data.attempt.id;
saveState();
return state.quizAttemptId;
} catch (error) {
console.warn("Quiz attempt was not saved to MongoDB:", error.message);
return null;
} finally {
state.quizAttemptPromise = null;
}
})();

return state.quizAttemptPromise;
}

async function requestLearningAnalysis() {
if(state.analysis) return renderLearningAnalysis(state.analysis);

try {
elements.learningAnalysis.innerHTML = `<div class="loader"><span></span><span></span><span></span></div>`;

const analysisData = await apiRequest("/assessments/analyze", {
method: "POST",
body: JSON.stringify({
videoTitle: state.videoTitle,
score: state.result.correct,
total: state.result.total,
details: state.result.details.map(({ question, answer, userAnswer, isCorrect, topic }) => ({
question, answer, userAnswer, isCorrect, topic
}))
})
});

state.analysis = analysisData;
saveState();
renderLearningAnalysis(analysisData);

if(state.quizAttemptId) {
await apiRequest("/assessments/attempts", {
method: "POST",
body: JSON.stringify({
videoTitle: state.videoTitle,
videoUrl: state.videoUrl,
playlistId: state.playlistId || "",
score: state.result.correct,
total: state.result.total,
analysis: analysisData
})
});
}
} catch (error) {
elements.learningAnalysis.innerHTML = `<p class="message" style="color:var(--red)">Failed to generate learning analysis.</p>`;
}
}

function renderResults() {
showView("result");
const result = state.result;

elements.resultHero.className = `result-hero glass-card ${result.passed ? "pass" : "fail"}`;
elements.resultHero.innerHTML = `
<div class="result-icon"><i class="fa-solid ${result.passed ? "fa-trophy" : "fa-xmark"}"></i></div>
<h2>${result.passed ? "Outstanding work!" : "Keep learning!"}</h2>
<p>You scored <strong>${result.percentage}%</strong> on the ${state.videoTitle} assessment.</p>
${result.passed
? `<div class="eligibility">
        <i class="fa-solid fa-certificate" style="color:var(--green)"></i>
        Skill verified & Certificate eligible
        ${state.playlistId ? `<button class="primary-btn" style="padding: 6px 12px; min-height: 32px; font-size: 13px; margin-left: 10px;" onclick="handleCertificateClaim(event)">Claim Certificate</button>` : ""}
    </div>`
: `<div class="eligibility"><i class="fa-solid fa-rotate-right"></i>Review your mistakes and try again.</div>`
}
`;

elements.scoreGrid.innerHTML = `
<div class="score-card"><h3>${result.percentage}%</h3><p>Score</p></div>
<div class="score-card"><h3>${result.correct}</h3><p>Correct</p></div>
<div class="score-card"><h3>${result.total - result.correct}</h3><p>Incorrect</p></div>
<div class="score-card"><h3>${state.questions.filter((q) => !state.answers[q.id]).length}</h3><p>Skipped</p></div>
<div class="score-card"><h3>${Math.floor((Date.now() - (state.endsAt - QUIZ_DURATION_MS)) / 60000)}m</h3><p>Time</p></div>
`;

renderDifficultyChart(result.details);
renderTopicAnalysis(result.details);
renderReviewList(result.details);

if(state.analysis) {
renderLearningAnalysis(state.analysis);
}
}

async function handleCertificateClaim(event) {
const button = event.target;
button.disabled = true;
button.textContent = "Generating...";

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
if(chartInstance) chartInstance.destroy();

const isProctoredMode = new URLSearchParams(window.location.search).get("proctored") === "true";
if (isProctoredMode && playlistQuiz?.playlistId) {
    generateQuizFromPlaylist(playlistQuiz.playlistId);
} else if (playlistQuiz?.playlistId) {
showPlaylistWelcome(playlistQuiz.playlist);
} else {
showView("generator");
}
}

function renderDifficultyChart(details) {
const ctx = elements.difficultyChart.getContext("2d");
if(chartInstance) chartInstance.destroy();

const stats = { easy: { total: 0, correct: 0 }, medium: { total: 0, correct: 0 }, hard: { total: 0, correct: 0 } };
details.forEach((d) => {
stats[d.difficulty].total++;
if(d.isCorrect) stats[d.difficulty].correct++;
});

chartInstance = new Chart(ctx, {
type: "doughnut",
data: {
labels: ["Easy", "Medium", "Hard"],
datasets: [{
data: [
stats.easy.correct,
stats.medium.correct,
stats.hard.correct
],
backgroundColor: ["#4ade80", "#facc15", "#fb7185"],
borderWidth: 0,
hoverOffset: 4
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
cutout: "75%",
plugins: {
legend: { display: false }
}
}
});

elements.difficultyStats.innerHTML = Object.entries(stats).map(([level, data]) => `
<div class="difficulty-stat">
<strong>${data.total ? Math.round((data.correct / data.total) * 100) : 0}%</strong>
<span>${level}</span>
</div>
`).join("");
}

function renderTopicAnalysis(details) {
const topics = {};
details.forEach((d) => {
if(!topics[d.topic]) topics[d.topic] = { total: 0, correct: 0 };
topics[d.topic].total++;
if(d.isCorrect) topics[d.topic].correct++;
});

const sortedTopics = Object.entries(topics)
.map(([name, data]) => ({ name, accuracy: data.correct / data.total }))
.sort((a, b) => b.accuracy - a.accuracy);

elements.strongAreas.innerHTML = sortedTopics.filter((t) => t.accuracy >= 0.7)
.map((t) => `<li>${t.name} (${Math.round(t.accuracy * 100)}%)</li>`).join("") || "<li>None identified</li>";

elements.weakAreas.innerHTML = sortedTopics.filter((t) => t.accuracy < 0.7)
.map((t) => `<li>${t.name} (${Math.round(t.accuracy * 100)}%)</li>`).join("") || "<li>None identified</li>";
}

function renderLearningAnalysis(analysis) {
if(!analysis || !analysis.insights) return;
elements.learningAnalysis.innerHTML = analysis.insights.map((insight) => `
<div class="learning-item">
<h3>${insight.topic}</h3>
<p>${insight.observation}</p>
<ul>
    ${insight.recommendations.map((rec) => `<li>${rec}</li>`).join("")}
</ul>
</div>
`).join("");
}

function renderReviewList(details) {
elements.reviewList.innerHTML = details.map((d, index) => `
<div class="review-item ${d.isCorrect ? "correct" : "incorrect"}">
<div style="display:flex; justify-content:space-between; margin-bottom:8px;">
    <span style="color:var(--muted); font-size:13px;">Question ${index + 1}</span>
    ${d.isCorrect
? `<span style="color:var(--green); font-size:13px;"><i class="fa-solid fa-check"></i> Correct</span>`
: `<span style="color:var(--red); font-size:13px;"><i class="fa-solid fa-xmark"></i> Incorrect</span>`
}
</div>
<h3>${d.question}</h3>
<p>Your answer: <strong style="color:${d.isCorrect ? "var(--green)" : "var(--red)"}">${d.userAnswer || "Skipped"}</strong></p>
${!d.isCorrect ? `<p>Correct answer: <strong style="color:var(--green)">${d.answer}</strong></p>` : ""}
</div>
`).join("");
}

function renderHistory() {
const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || "[]");
if(!history.length) {
elements.historyList.innerHTML = `<div class="empty-history">No quizzes taken yet.</div>`;
return;
}

elements.historyList.innerHTML = history.map((item) => `
<div class="history-card">
<time>${new Date(item.date).toLocaleDateString()}</time>
<h3 class="truncate">${item.videoTitle}</h3>
<p>Score: <strong>${item.percentage}%</strong> (${item.score}/${item.total})</p>
</div>
`).join("");
}

function showPlaylistWelcome(playlist) {
try {
document.getElementById("welcomePlaylistTitle").textContent = playlist.displayTitle || playlist.title || "Playlist Quiz";
document.getElementById("welcomeQuestionCount").textContent = statusData?.playlistQuestionCount || 45;
document.getElementById("welcomeMessage").textContent = "";
document.getElementById("startPlaylistQuizBtn").disabled = false;
document.getElementById("startProctoredPlaylistQuizBtn").disabled = false;
} catch (error) {
document.getElementById("welcomePlaylistTitle").textContent = "Playlist Quiz";
document.getElementById("welcomeMessage").textContent = error.message;
document.getElementById("startPlaylistQuizBtn").disabled = true;
document.getElementById("startProctoredPlaylistQuizBtn").disabled = true;
}

return true;
}

elements.generateBtn.addEventListener("click", () => {
    const url = new URL(window.location);
    url.searchParams.delete("proctored");
    window.history.pushState({}, '', url);
    generateQuiz();
});
document.getElementById("generateProctoredBtn").addEventListener("click", () => {
    const url = new URL(window.location);
    url.searchParams.set("proctored", "true");
    window.history.pushState({}, '', url);
    generateQuiz();
});
elements.videoUrl.addEventListener("keydown", (event) => {
if(event.key === "Enter") {
    const url = new URL(window.location);
    url.searchParams.delete("proctored");
    window.history.pushState({}, '', url);
    generateQuiz();
}
});
elements.previousBtn.addEventListener("click", () => moveQuestion(-1));
elements.nextBtn.addEventListener("click", () => moveQuestion(1));
elements.skipBtn.addEventListener("click", () => moveQuestion(1));
elements.submitBtn.addEventListener("click", () => {
if(confirm("Are you sure you want to submit your quiz?")) {
submitQuiz();
}
});
elements.toggleReviewBtn.addEventListener("click", () => {
elements.reviewList.classList.toggle("hidden");
elements.toggleReviewBtn.textContent = elements.reviewList.classList.contains("hidden") ? "Show Review" : "Hide Review";
});
elements.newQuizBtn.addEventListener("click", resetQuiz);
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
const url = new URL(window.location);
url.searchParams.delete("proctored");
window.history.pushState({}, '', url);
generateQuizFromPlaylist(playlistQuiz.playlistId);
});

document.getElementById("startProctoredPlaylistQuizBtn").addEventListener("click", () => {
if(!playlistQuiz?.playlistId) {
document.getElementById("welcomeMessage").textContent = "This playlist is not ready for quiz generation.";
return;
}
localStorage.removeItem(QUIZ_STATE_KEY);
state = null;
const url = new URL(window.location);
url.searchParams.set("proctored", "true");
window.history.pushState({}, '', url);
generateQuizFromPlaylist(playlistQuiz.playlistId);
});

async function restore() {
renderHistory();

if(await loadPlaylistQuiz()) {
return;
}

const savedState = localStorage.getItem(QUIZ_STATE_KEY);
if(savedState) {
try {
state = JSON.parse(savedState);
if(state.status === "active" && state.endsAt > Date.now()) {
const isProctoredMode = new URLSearchParams(window.location.search).get("proctored") === "true";
if (isProctoredMode && !proctorState.isActive) {
  showProctorInstructions();
  return;
}
startQuiz();
} else if(state.status === "active") {
submitQuiz();
} else if(state.status === "complete") {
renderResults();
} else {
showView("generator");
checkQuizStatus();
}
} catch (e) {
localStorage.removeItem(QUIZ_STATE_KEY);
showView("generator");
checkQuizStatus();
}
} else {
showView("generator");
checkQuizStatus();
}
}

restore();
