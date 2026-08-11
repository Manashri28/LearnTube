const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const FocusSession = require("../models/FocusSession");

function findPlaylist(user, playlistId) {
return (user.learningHistory || []).find((item) => {
return item.type === "playlist" && (
item.playlistId === playlistId ||
item.itemId === playlistId ||
String(item._id || "") === playlistId
);
});
}

function getVideoUrl(video) {
if(video?.url) {
return video.url;
}

return video?.videoId ? `https://www.youtube.com/watch?v=${video.videoId}` : "";
}

router.post("/focus-sessions", protect, async (req, res) => {
try {
const playlistId = String(req.body.playlistId || "");
const videoId = String(req.body.videoId || "");

if(!playlistId || !videoId) {
return res.status(400).json({ message: "A playlist and video are required." });
}

const user = await User.findById(req.user.userId).select("learningHistory").lean();
const playlist = user && findPlaylist(user, playlistId);
const video = playlist?.videos?.find((item) => String(item.videoId || "") === videoId);

if(!playlist || !video) {
return res.status(404).json({ message: "Learning video not found." });
}

const session = await FocusSession.create({
user: user._id,
playlistId: playlist.playlistId || playlist.itemId || playlistId,
videoId: video.videoId,
videoUrl: getVideoUrl(video)
});

return res.status(201).json({
session: {
id: String(session._id),
playlistId: session.playlistId,
videoId: session.videoId,
startedAt: session.startedAt
}
});
} catch (error) {
return res.status(500).json({ message: "Unable to start focus session" });
}
});

router.patch("/focus-sessions/:sessionId", protect, async (req, res) => {
try {
const session = await FocusSession.findOne({
_id: req.params.sessionId,
user: req.user.userId
});

if(!session) {
return res.status(404).json({ message: "Focus session not found." });
}

if(!session.endedAt) {
const endedAt = new Date();
session.endedAt = endedAt;
session.durationSeconds = Math.max(0, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000));
await session.save();
}

return res.status(200).json({
session: {
id: String(session._id),
playlistId: session.playlistId,
videoId: session.videoId,
startedAt: session.startedAt,
endedAt: session.endedAt,
durationSeconds: session.durationSeconds
}
});
} catch (error) {
return res.status(500).json({ message: "Unable to end focus session" });
}
});

module.exports = router;
