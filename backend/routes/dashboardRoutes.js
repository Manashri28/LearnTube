console.log("✅ dashboardRoutes.js loaded");

const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");
const {
getDisplayTitle
} = require("../utils/titleUtils");

const router = express.Router();

function normalizeDate(value) {
const date = value ? new Date(value) : null;

return date && !Number.isNaN(date.getTime())
? date.getTime()
: 0;
}

function getProgress(item) {
const progress = Number(item.progress);

if(Number.isFinite(progress)) {
return Math.max(0, Math.min(100, Math.round(progress)));
}

return item.completed ? 100 : 0;
}

function getActivityTime(item) {
return Math.max(
normalizeDate(item.lastActiveAt),
normalizeDate(item.updatedAt),
normalizeDate(item.completedAt),
normalizeDate(item.createdAt)
);
}

function getQuizPercentage(attempt) {
if(Number.isFinite(Number(attempt.percentage))) {
return Number(attempt.percentage);
}

const score = Number(attempt.score);
const total = Number(attempt.total);

if(Number.isFinite(score) && Number.isFinite(total) && total > 0) {
return (score / total) * 100;
}

return Number.isFinite(score) ? score : 0;
}

function isPassed(attempt) {
return attempt.passed === true && getQuizPercentage(attempt) >= 75;
}

function getDashboardCollections(user) {
return {
learningHistory: [
...(user.learningHistory || []),
...(user.playlists || []),
...(user.recentLearning || [])
],
quizAttempts: [
...(user.quizAttempts || []),
...(user.quizzes || [])
],
certificates: [
...(user.certificates || [])
],
skills: [
...(user.skills || [])
]
};
}

async function getDashboard(req, res) {
    console.log("✅ /api/dashboard hit");
try {
const userId = req.user.userId || req.user.id || req.user._id;

const user = await User.findById(userId).lean();

if(!user) {
return res.status(404).json({
message: "User not found"
});
}

const {
learningHistory,
quizAttempts,
certificates,
skills
} = getDashboardCollections(user);

const playlists = learningHistory.filter((item) => {
return item && item.type === "playlist";
});

const playlistsCompleted = playlists.filter((item) => {
return item.completed === true || getProgress(item) >= 100;
}).length;

const passedQuizzes = quizAttempts.filter(isPassed);

const verifiedSkills = skills.filter((skill) => {
return skill.verified === true;
}).length;

const quizPercentages = quizAttempts
.map(getQuizPercentage)
.filter((score) => Number.isFinite(score));

const averageScore = quizPercentages.length
? Math.round(
quizPercentages.reduce((sum, score) => sum + score, 0) / quizPercentages.length
)
: 0;

const recentLearning = playlists
.slice()
.sort((a, b) => getActivityTime(b) - getActivityTime(a))
.slice(0, 3)
.map((item) => {
const currentVideo = (item.videos || []).find((video) => !video.completed) || item.videos?.[0];

return {
_id: String(item._id || item.playlistId || item.id || ""),
playlistId: String(item.playlistId || item._id || item.id || ""),
title: getDisplayTitle(item),
progress: getProgress(item),
thumbnail: item.thumbnail || "",
url: currentVideo?.url || item.url || "",
type: item.type,
videoId: currentVideo?.videoId || item.videoId || ""
};
});

const continuePlaylist = playlists
.slice()
.filter((item) => getProgress(item) < 100 && item.completed !== true)
.sort((a, b) => getActivityTime(b) - getActivityTime(a))[0];

return res.status(200).json({
user: {
name: user.name
},
stats: {
playlistsCompleted,
skillsVerified: Math.max(passedQuizzes.length, verifiedSkills),
certificatesEarned: certificates.length,
averageScore
},
recentLearning,
continueLearning: {
playlistId: continuePlaylist
? String(continuePlaylist.playlistId || continuePlaylist._id || continuePlaylist.id || "")
: null,
type: continuePlaylist?.type || null,
videoId: continuePlaylist?.videoId || "",
url: continuePlaylist?.url || ""
}
});
} catch (error) {
return res.status(500).json({
message: "Failed to load dashboard",
error: error.message
});
}
}

router.get("/api/dashboard", authMiddleware, getDashboard);

module.exports = router;
