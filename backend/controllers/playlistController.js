// Playlist controller.
// Handles saved learning library activity for the logged-in user.

const User = require("../models/User");
const {
generateDisplayTitle
} = require("../utils/titleUtils");

const getPlaylists = (req, res) => {
res.status(200).json({
message: "Playlist route is working",
playlists: []
});
};

function getUserId(req) {
return req.user.userId || req.user.id || req.user._id;
}

function normalizeProgress(progress) {
const value = Number(progress);

if(!Number.isFinite(value)) {
return 0;
}

return Math.max(0, Math.min(100, Math.round(value)));
}

function isGenericPlaylistTitle(title) {
return !title || String(title).trim() === "YouTube Playlist";
}

function pickThumbnail(thumbnails = {}) {
return thumbnails.maxres?.url ||
thumbnails.standard?.url ||
thumbnails.high?.url ||
thumbnails.medium?.url ||
thumbnails.default?.url ||
"";
}

async function fetchYouTubePlaylistMetadata(playlistId) {
const apiKey = process.env.YOUTUBE_API_KEY;

if(!apiKey || !playlistId) {
return null;
}

const response = await fetch(
`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
);

if(!response.ok) {
return null;
}

const data = await response.json();
const snippet = data.items?.[0]?.snippet;

if(!snippet?.title) {
return null;
}

return {
title: snippet.title,
channel: snippet.channelTitle || "",
thumbnail: pickThumbnail(snippet.thumbnails)
};
}

async function repairGenericPlaylistTitles(user) {
let changed = false;

for(const item of user.learningHistory || []) {
if(item.type !== "playlist") {
continue;
}

if(!item.displayTitle && item.title) {
item.displayTitle = generateDisplayTitle(item.title);
changed = true;
}

if(!isGenericPlaylistTitle(item.title) || !item.playlistId) {
continue;
}

const metadata = await fetchYouTubePlaylistMetadata(item.playlistId);

if(!metadata?.title) {
continue;
}

item.title = metadata.title;
item.displayTitle = generateDisplayTitle(metadata.title);
item.channel = item.channel || metadata.channel;
item.thumbnail = item.thumbnail || metadata.thumbnail;
changed = true;
}

if(changed) {
await user.save();
}
}

function normalizeLearningItem(item) {
const now = new Date();
const progress = normalizeProgress(item.progress);

return {
itemId: item.itemId || item.id || item.playlistId || item.videoId,
type: item.type || "playlist",
playlistId: item.playlistId || "",
videoId: item.videoId || "",
title: item.title || "Untitled Playlist",
displayTitle: item.displayTitle || generateDisplayTitle(item.title),
thumbnail: item.thumbnail || "",
url: item.url || "",
duration: item.duration || "",
channel: item.channel || "",
totalVideos: Number(item.totalVideos) || 0,
videos: Array.isArray(item.videos) ? item.videos : [],
progress,
completed: item.completed === true || progress >= 100,
quizUnlocked: item.quizUnlocked === true || progress >= 100,
lastActiveAt: item.lastActiveAt || now,
completedAt: item.completedAt || (progress >= 100 ? now : null),
createdAt: item.createdAt || now
};
}

function serializeLearningItem(item) {
return {
id: item.itemId || String(item._id),
itemId: item.itemId || String(item._id),
type: item.type,
playlistId: item.playlistId,
videoId: item.videoId,
title: item.title,
displayTitle: item.displayTitle || generateDisplayTitle(item.title),
thumbnail: item.thumbnail,
url: item.url,
duration: item.duration,
channel: item.channel,
totalVideos: item.totalVideos,
videos: item.videos || [],
progress: item.progress || 0,
completed: item.completed === true,
quizUnlocked: item.quizUnlocked === true,
completedAt: item.completedAt,
createdAt: item.createdAt
};
}

const getLearningLibrary = async (req, res) => {
try {
const user = await User.findById(
getUserId(req)
).select("learningHistory");

if(!user) {
return res.status(404).json({
message: "User not found"
});
}

await repairGenericPlaylistTitles(user);

return res.status(200).json({
items: (user.learningHistory || []).map(serializeLearningItem)
});
} catch (error) {
return res.status(500).json({
message: "Failed to load learning library",
error: error.message
});
}
};

const getLearningPlaylist = async (req, res) => {
try {
const user = await User.findById(
getUserId(req)
).select("learningHistory");

if(!user) {
return res.status(404).json({
message: "User not found"
});
}

await repairGenericPlaylistTitles(user);

const playlist = (user.learningHistory || []).find((entry) => {
return entry.type === "playlist" &&
(entry.playlistId === req.params.playlistId ||
entry.itemId === req.params.playlistId ||
String(entry._id) === req.params.playlistId);
});

if(!playlist) {
return res.status(404).json({
message: "Playlist not found"
});
}

return res.status(200).json({
playlist: serializeLearningItem(playlist)
});
} catch (error) {
return res.status(500).json({
message: "Failed to load playlist",
error: error.message
});
}
};

const saveLearningItem = async (req, res) => {
try {
const item = normalizeLearningItem(req.body);

if(!item.itemId || !item.title) {
return res.status(400).json({
message: "A learning item id and title are required."
});
}

const user = await User.findById(
getUserId(req)
);

if(!user) {
return res.status(404).json({
message: "User not found"
});
}

const existingIndex = user.learningHistory.findIndex((entry) => {
return entry.itemId === item.itemId ||
(item.playlistId && entry.playlistId === item.playlistId) ||
(item.videoId && entry.videoId === item.videoId);
});

if(existingIndex >= 0) {
const existingItem = user.learningHistory[existingIndex];
if(!isGenericPlaylistTitle(existingItem.title)) {
item.title = existingItem.title;
}
item.displayTitle = item.displayTitle || existingItem.displayTitle || generateDisplayTitle(item.title);

user.learningHistory[existingIndex].set({
...item,
createdAt: existingItem.createdAt || item.createdAt
});
} else {
user.learningHistory.unshift(item);
}

await user.save();

const savedItem = existingIndex >= 0
? user.learningHistory[existingIndex]
: user.learningHistory[0];

return res.status(existingIndex >= 0 ? 200 : 201).json({
item: serializeLearningItem(savedItem)
});
} catch (error) {
return res.status(500).json({
message: "Failed to save learning item",
error: error.message
});
}
};

const updateLearningProgress = async (req, res) => {
try {
const user = await User.findById(
getUserId(req)
);

if(!user) {
return res.status(404).json({
message: "User not found"
});
}

const item = user.learningHistory.find((entry) => {
return entry.itemId === req.params.itemId ||
String(entry._id) === req.params.itemId ||
entry.playlistId === req.params.itemId;
});

if(!item) {
return res.status(404).json({
message: "Learning item not found"
});
}

let progress = normalizeProgress(req.body.progress ?? item.progress);
let completed = req.body.completed === true || progress >= 100;
const now = new Date();

if(item.type === "playlist" && Array.isArray(req.body.videos)) {
item.videos = req.body.videos;
const completedVideos = item.videos.filter((video) => video.completed === true).length;
progress = item.videos.length
? Math.round((completedVideos / item.videos.length) * 100)
: 0;
completed = item.videos.length > 0 && completedVideos === item.videos.length;
}

item.progress = progress;
item.completed = completed;
item.quizUnlocked = item.type === "playlist" ? completed : (req.body.quizUnlocked === true || item.quizUnlocked === true || completed);
item.lastActiveAt = now;

if(completed) {
item.completedAt = item.completedAt || now;
}

await user.save();

return res.status(200).json({
item: serializeLearningItem(item)
});
} catch (error) {
return res.status(500).json({
message: "Failed to update learning progress",
error: error.message
});
}
};

const deleteLearningItem = async (req, res) => {
    try {

        const user = await User.findById(
            getUserId(req)
        );

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const originalLength = user.learningHistory.length;

        user.learningHistory = user.learningHistory.filter((item) => {
            return (
                item.itemId !== req.params.itemId &&
                String(item._id) !== req.params.itemId &&
                item.playlistId !== req.params.itemId
            );
        });

        if (user.learningHistory.length === originalLength) {
            return res.status(404).json({
                message: "Playlist not found"
            });
        }

        await user.save();

        return res.status(200).json({
            message: "Playlist deleted successfully."
        });

    } catch (error) {

        return res.status(500).json({
            message: "Failed to delete playlist",
            error: error.message
        });

    }
};

module.exports = {
getPlaylists,
getLearningLibrary,
getLearningPlaylist,
saveLearningItem,
updateLearningProgress,
deleteLearningItem
};
