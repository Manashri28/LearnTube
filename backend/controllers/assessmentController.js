// Assessment controller
// Handles assessment question data

const {
generateLearningAnalysis,
generateQuizFromTranscript,
hasGeminiApiKey
} = require("../services/geminiService");
const {
getYouTubeTranscript
} = require("../services/youtubeTranscriptService");
const User = require("../models/User");
const {
getDisplayTitle
} = require("../utils/titleUtils");
const PASSING_PERCENTAGE = 75;
const GENERIC_PLAYLIST_TITLE = "YouTube Playlist";

function getUserId(req) {
return req.user.userId || req.user.id || req.user._id;
}

function normalizePercentage(score, total) {
const numericScore = Number(score);
const numericTotal = Number(total);

if(Number.isFinite(numericScore) && Number.isFinite(numericTotal) && numericTotal > 0) {
return Math.round((numericScore / numericTotal) * 100);
}

return 0;
}

function getVideoUrl(video) {
if(video.url) {
return video.url;
}

if(video.videoId) {
return `https://www.youtube.com/watch?v=${video.videoId}`;
}

return "";
}

function isGenericPlaylistTitle(title) {
return !title || String(title).trim() === GENERIC_PLAYLIST_TITLE;
}

function findSavedPlaylist(user, playlistId) {
if(!playlistId) {
return null;
}

return (user.learningHistory || []).find((entry) => {
return entry.type === "playlist" &&
(entry.playlistId === playlistId ||
entry.itemId === playlistId ||
String(entry._id) === playlistId);
});
}

async function getPlaylistQuizSource(userId, playlistId) {
const user = await User.findById(userId)
.select("learningHistory")
.lean();

if(!user) {
throw new Error("User not found");
}

const playlist = findSavedPlaylist(user, playlistId);

if(!playlist) {
throw new Error("Playlist not found");
}

const videos = Array.isArray(playlist.videos) ? playlist.videos : [];
const completed = videos.length > 0 && videos.every((video) => video.completed === true);

if(!completed) {
throw new Error("Complete the entire playlist before starting the final quiz.");
}

const videoUrls = videos
.map(getVideoUrl)
.filter(Boolean);

if(!videoUrls.length) {
throw new Error("This playlist does not have saved videos for quiz generation.");
}

const transcriptResults = await Promise.allSettled(
videoUrls.map((videoUrl) => getYouTubeTranscript(videoUrl))
);
const videosWithTranscripts = transcriptResults
.filter((result) => result.status === "fulfilled")
.map((result) => result.value);

if(!videosWithTranscripts.length) {
throw new Error("No transcript is available for this playlist.");
}

return {
videoTitle: getDisplayTitle(playlist, "Playlist Quiz"),
videoUrl: playlist.url || `https://www.youtube.com/playlist?list=${playlist.playlistId}`,
transcript: videosWithTranscripts
.map((video, index) => {
return `Lesson ${index + 1}: ${video.videoTitle}\n${video.transcript}`;
})
.join("\n\n")
};
}

const getAssessments = (req,res)=>{

res.status(200).json([

{

question:"What is JavaScript?",

options:[
"Programming Language",
"Database",
"Browser",
"Operating System"
],

answer:
"Programming Language"

},

{

question:"What is React?",

options:[
"Framework",
"Library",
"Database",
"Compiler"
],

answer:
"Library"

},

{

question:"What does HTML stand for?",

options:[
"Hyper Text Markup Language",
"High Text Machine Language",
"Home Tool Markup Language",
"Hyper Transfer Markup Language"
],

answer:
"Hyper Text Markup Language"

}

]);

};

const generateYouTubeQuiz = async (req, res) => {
try {
const { type, playlistId, videoUrl } = req.body || {};
const isPlaylistQuiz = type === "playlist";
const isVideoQuiz = type === "video";

if(!isPlaylistQuiz && !isVideoQuiz) {
return res.status(400).json({
message: "Quiz type must be video or playlist."
});
}

if(isPlaylistQuiz && !playlistId) {
return res.status(400).json({
message: "A playlist ID is required."
});
}

if(isVideoQuiz && (!videoUrl || playlistId)) {
return res.status(400).json({
message: "A video quiz requires a YouTube video URL and no playlist ID."
});
}

if(!hasGeminiApiKey()) {
return res.status(503).json({
message: "GEMINI_API_KEY is not configured on the server."
});
}

const video = isPlaylistQuiz
	? await getPlaylistQuizSource(getUserId(req), playlistId)
	: await getYouTubeTranscript(videoUrl);
const questionCount = isPlaylistQuiz ? 45 : 15;
const questions = await generateQuizFromTranscript({ ...video, questionCount });

return res.status(201).json({
videoTitle: video.videoTitle,
videoUrl: video.videoUrl,
questions
});
} catch (error) {
const clientError = /valid YouTube|supported|transcript is available|Playlist not found|saved videos|No transcript is available|Complete the entire playlist/i.test(error.message);
const configError = /GEMINI_API_KEY/i.test(error.message);
return res.status(clientError ? 422 : configError ? 503 : 500).json({
message: error.message || "Quiz generation failed."
});
}
};

const getQuizStatus = (req, res) => {
res.status(200).json({
geminiConfigured: hasGeminiApiKey(),
transcriptSource: "youtube-transcript",
questionCount: 15,
playlistQuestionCount: 45,
passingPercentage: PASSING_PERCENTAGE,
durationMinutes: 15
});
};

const analyzeQuizAttempt = async (req, res) => {
try {
const analysis = await generateLearningAnalysis(req.body);
return res.status(200).json(analysis);
} catch (error) {
return res.status(500).json({
message: error.message || "Learning analysis failed."
});
}
};

const saveQuizAttempt = async (req, res) => {
try {
const {
videoTitle,
videoUrl,
playlistId,
score,
total,
analysis,
status
} = req.body;

const numericScore = Number(score);
const numericTotal = Number(total);

if(!videoTitle || !Number.isInteger(numericScore) || !Number.isInteger(numericTotal) || numericTotal <= 0 || numericScore < 0 || numericScore > numericTotal) {
return res.status(400).json({
message: "Video title, score, and a valid total are required."
});
}

const finalPercentage = normalizePercentage(numericScore, numericTotal);
const passed = status === "aborted" ? false : finalPercentage >= PASSING_PERCENTAGE;

const user = await User.findById(
getUserId(req)
);

if(!user) {
return res.status(404).json({
message: "User not found"
});
}

const savedPlaylist = findSavedPlaylist(user, playlistId);
const resolvedTitle = savedPlaylist && !isGenericPlaylistTitle(savedPlaylist.title)
? getDisplayTitle(savedPlaylist)
: videoTitle;

const attempt = {
playlistId: playlistId || "",
videoTitle: resolvedTitle,
displayTitle: resolvedTitle,
videoUrl: videoUrl || "",
title: resolvedTitle,
score: numericScore,
total: numericTotal,
percentage: finalPercentage,
passed,
status: status || "completed",
analysis: analysis || null,
createdAt: new Date()
};

user.quizAttempts.unshift(attempt);

if(passed) {
const existingSkill = user.skills.find((skill) => {
return (playlistId && skill.playlistId === playlistId) || skill.name === resolvedTitle;
});

if(existingSkill) {
existingSkill.name = resolvedTitle;
existingSkill.displayTitle = resolvedTitle;
existingSkill.playlistId = existingSkill.playlistId || playlistId || "";
existingSkill.score = Math.max(existingSkill.score || 0, finalPercentage);
existingSkill.verified = true;
existingSkill.verifiedAt = existingSkill.verifiedAt || new Date();
} else {
user.skills.unshift({
playlistId: playlistId || "",
name: resolvedTitle,
displayTitle: resolvedTitle,
score: finalPercentage,
verified: true,
verifiedAt: new Date()
});
}
}

await user.save();

const savedAttempt = user.quizAttempts[0];

return res.status(201).json({
attempt: {
id: savedAttempt._id,
videoTitle: savedAttempt.videoTitle,
score: savedAttempt.score,
total: savedAttempt.total,
percentage: savedAttempt.percentage,
passed: savedAttempt.passed,
createdAt: savedAttempt.createdAt
}
});
} catch (error) {
return res.status(500).json({
message: "Failed to save quiz attempt",
error: error.message
});
}
};

module.exports={

getAssessments,
getQuizStatus,
generateYouTubeQuiz,
analyzeQuizAttempt,
saveQuizAttempt

};
