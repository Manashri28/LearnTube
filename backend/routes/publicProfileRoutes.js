const express = require("express");
const router = express.Router();

const User = require("../models/User");
const {
getDisplayTitle
} = require("../utils/titleUtils");

function isGenericPlaylistTitle(title) {
return !title || String(title).trim() === "YouTube Playlist";
}

function getPlaylistDisplayTitleMap(user) {
const map = new Map();

(user.learningHistory || []).forEach((item) => {
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

router.get("/api/public-profiles/:publicProfileId", async (req, res) => {
try {
const user = await User.findOne({
publicProfileId: req.params.publicProfileId
}).select("name skills certificates learningHistory").lean();

if(!user) {
return res.status(404).json({
message: "Profile not found"
});
}

const playlistTitles = getPlaylistDisplayTitleMap(user);
const verifiedSkills = (user.skills || []).filter((skill) => skill.verified);
const completedCourses = (user.learningHistory || []).filter((item) => {
return item.type === "playlist" && (item.completed === true || Number(item.progress) >= 100);
});

return res.status(200).json({
profile: {
displayName: user.name,
skills: verifiedSkills.map((skill) => ({
name: playlistTitles.get(String(skill.playlistId || "")) || skill.displayTitle || skill.name,
score: skill.score,
badge: "Verified Skill"
})),
certificates: (user.certificates || []).map((certificate) => ({
title: playlistTitles.has(String(certificate.playlistId || ""))
? `${playlistTitles.get(String(certificate.playlistId))} Certificate`
: certificate.displayTitle || certificate.title,
score: certificate.score,
earnedAt: certificate.generatedAt
})),
completedCourses: completedCourses.map((course) => ({
title: getDisplayTitle(course),
completedAt: course.completedAt || course.lastActiveAt || course.createdAt
}))
}
});
} catch (error) {
return res.status(500).json({
message: "Unable to load profile"
});
}
});

module.exports = router;
