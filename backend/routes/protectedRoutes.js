// Protected routes for LearnTube user-only data.

const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const {
getDisplayTitle
} = require("../utils/titleUtils");

const PASSING_PERCENTAGE = 75;
const CERTIFICATE_TEMPLATE_ID = "learntube-approved";

function isGenericPlaylistTitle(title) {
return !title || String(title).trim() === "YouTube Playlist";
}

function getPlaylistDisplayTitleMap(user) {
const map = new Map();

(user?.learningHistory || []).forEach((item) => {
if(item?.type !== "playlist" || (isGenericPlaylistTitle(item.title) && !item.displayTitle)) {
return;
}

const displayTitle = getDisplayTitle(item);

[item.playlistId, item.itemId, String(item._id || "")].forEach((id) => {
if(id) {
map.set(String(id), displayTitle);
}
});
});

return map;
}

function findSavedPlaylist(user, playlistId) {
if(!playlistId) {
return null;
}

return (user?.learningHistory || []).find((entry) => {
return entry?.type === "playlist" &&
(entry.playlistId === playlistId ||
entry.itemId === playlistId ||
String(entry._id || "") === String(playlistId));
});
}

function findQuizAttempt(user, quizAttemptId) {
if(!quizAttemptId) {
return null;
}

return (user?.quizAttempts || []).find((attempt) => {
return String(attempt?._id || "") === String(quizAttemptId);
});
}

function getQuizPercentage(attempt, fallbackScore = 0) {
if(Number.isFinite(Number(attempt?.percentage))) {
return Math.round(Number(attempt.percentage));
}

const score = Number(attempt?.score);
const total = Number(attempt?.total);

if(Number.isFinite(score) && Number.isFinite(total) && total > 0) {
return Math.round((score / total) * 100);
}

return Math.round(Number(fallbackScore) || 0);
}

function buildCertificatePayload(user, certificate) {
const attempt = findQuizAttempt(user, certificate?.quizAttemptId);
const playlist = findSavedPlaylist(user, certificate?.playlistId || attempt?.playlistId);
const courseTitle = playlist
? getDisplayTitle(playlist, attempt?.displayTitle || "Playlist Quiz")
: attempt?.displayTitle || attempt?.videoTitle || certificate?.displayTitle || certificate?.title || "Playlist Quiz";
const certificateId = String(certificate?._id || "");
const score = getQuizPercentage(attempt, certificate?.score);
const completionDate = attempt?.createdAt || certificate?.generatedAt || new Date();

return {
id: certificateId,
templateId: CERTIFICATE_TEMPLATE_ID,
learnerName: user?.name || "Learner",
courseTitle,
channelName: playlist?.channel || "LearnTube",
quizScore: score,
completionDate,
certificateId,
qrValue: certificateId,
title: `${courseTitle} Certificate`
};
}

router.get("/dashboard", protect, async (req, res) => {
res.redirect(307, "/api/dashboard");
});

router.get("/portfolio", protect, async (req, res) => {
const user = await User.findById(
req.user.userId
).select(
"name email skills certificates quizAttempts learningHistory"
).lean();

const quizAttempts = user?.quizAttempts || [];
const certificates = user?.certificates || [];
const verifiedSkills = (user?.skills || []).filter((skill) => skill.verified);
const playlistTitles = getPlaylistDisplayTitleMap(user);
const averageScore = quizAttempts.length
? Math.round(
quizAttempts.reduce((sum, attempt) => sum + (Number(attempt.percentage) || 0), 0) / quizAttempts.length
)
: 0;

res.status(200).json({
message: "Portfolio access granted",
user: {
id: req.user.userId,
name: user ? user.name : "Learner",
email: req.user.email
},
stats: [
{
title: "Skills Verified",
value: verifiedSkills.length,
icon: "fa-circle-check"
},
{
title: "Certificates",
value: certificates.length,
icon: "fa-award"
},
{
title: "Average Score",
value: `${averageScore}%`,
icon: "fa-chart-line"
}
],
skills: verifiedSkills.map((skill) => ({
name: playlistTitles.get(String(skill.playlistId || "")) || skill.displayTitle || skill.name,
score: skill.score
})),
certificates: certificates.map((certificate) => ({
id: String(certificate._id || ""),
name: playlistTitles.has(String(certificate.playlistId || ""))
? `${playlistTitles.get(String(certificate.playlistId))} Certificate`
: certificate.displayTitle || certificate.title,
score: certificate.score,
generatedAt: certificate.generatedAt
}))
});
});

router.get("/certificate", protect, (req, res) => {
res.status(200).json({
message: "Certificate access granted",
user: req.user
});
});

router.get("/certificate/:certificateId", protect, async (req, res) => {
try {
const user = await User.findById(
req.user.userId
).select(
"name email certificates quizAttempts learningHistory"
).lean();

if(!user) {
return res.status(404).json({
message: "User not found"
});
}

const certificate = (user.certificates || []).find((item) => {
return String(item._id || "") === String(req.params.certificateId);
});

if(!certificate) {
return res.status(404).json({
message: "Certificate not found"
});
}

return res.status(200).json({
certificate: buildCertificatePayload(user, certificate)
});
} catch (error) {
return res.status(500).json({
message: "Failed to load certificate",
error: error.message
});
}
});

router.post("/certificate", protect, async (req, res) => {
try {
const {
title,
score,
playlistId,
quizAttemptId
} = req.body;

if(!title) {
return res.status(400).json({
message: "Certificate title is required."
});
}

const user = await User.findById(
req.user.userId
);

if(!user) {
return res.status(404).json({
message: "User not found"
});
}

const playlistTitles = getPlaylistDisplayTitleMap(user);
const savedPlaylistTitle = playlistTitles.get(String(playlistId || ""));
const quizAttempt = findQuizAttempt(user, quizAttemptId);
const certificateScore = getQuizPercentage(quizAttempt, score);

if(certificateScore < PASSING_PERCENTAGE) {
return res.status(400).json({
message: "A passing quiz score is required to generate a certificate."
});
}

const certificateTitle = savedPlaylistTitle
? `${savedPlaylistTitle} Certificate`
: title;

const existingCertificate = user.certificates.find((certificate) => {
const sameAttempt =
quizAttemptId && String(certificate.quizAttemptId || "") === String(quizAttemptId);

return sameAttempt || certificate.title === certificateTitle;
});
const exists = Boolean(existingCertificate);

if(!exists) {
user.certificates.unshift({
title: certificateTitle,
displayTitle: certificateTitle,
score: certificateScore,
playlistId: playlistId || quizAttempt?.playlistId || "",
quizAttemptId: quizAttemptId || undefined,
generatedAt: new Date()
});

await user.save();
} else if(
existingCertificate.title !== certificateTitle ||
existingCertificate.displayTitle !== certificateTitle ||
existingCertificate.score !== certificateScore ||
(!existingCertificate.playlistId && (playlistId || quizAttempt?.playlistId))
) {
existingCertificate.title = certificateTitle;
existingCertificate.displayTitle = certificateTitle;
existingCertificate.score = certificateScore;
existingCertificate.playlistId = existingCertificate.playlistId || playlistId || quizAttempt?.playlistId || "";
await user.save();
}

const certificate = user.certificates.find((item) => {
const sameAttempt =
quizAttemptId && String(item.quizAttemptId || "") === String(quizAttemptId);

return sameAttempt || item.title === certificateTitle;
});

return res.status(exists ? 200 : 201).json({
certificate: {
id: certificate._id,
templateId: CERTIFICATE_TEMPLATE_ID,
title: certificate.displayTitle || certificate.title,
score: certificate.score,
certificateId: String(certificate._id || ""),
generatedAt: certificate.generatedAt
}
});
} catch (error) {
return res.status(500).json({
message: "Failed to generate certificate",
error: error.message
});
}
});

module.exports = router;
