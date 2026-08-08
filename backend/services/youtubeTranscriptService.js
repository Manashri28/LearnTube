const { YoutubeTranscript } = require("youtube-transcript");

const YOUTUBE_HOSTS = new Set([
"youtube.com",
"www.youtube.com",
"m.youtube.com",
"youtu.be"
]);

function parseYouTubeUrl(value) {
let url;

try {
url = new URL(value);
} catch (error) {
throw new Error("Enter a valid YouTube video URL.");
}

if(!YOUTUBE_HOSTS.has(url.hostname)) {
throw new Error("Only YouTube video URLs are supported.");
}

const videoId = url.hostname === "youtu.be"
? url.pathname.slice(1)
: url.searchParams.get("v");

if(!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
throw new Error("The YouTube URL does not contain a valid video ID.");
}

return {
videoId,
videoUrl: `https://www.youtube.com/watch?v=${videoId}`
};
}

async function fetchVideoTitle(videoUrl) {
const response = await fetch(
`https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
);

if(!response.ok) {
return "YouTube Learning Quiz";
}

const data = await response.json();
return data.title || "YouTube Learning Quiz";
}

async function getYouTubeTranscript(value) {
const { videoId, videoUrl } = parseYouTubeUrl(value);

const [segments, videoTitle] = await Promise.all([
YoutubeTranscript.fetchTranscript(videoId),
fetchVideoTitle(videoUrl)
]);

const transcript = segments
.map((segment) => segment.text)
.join(" ")
.replace(/\s+/g, " ")
.trim();

if(!transcript) {
throw new Error("No transcript is available for this video.");
}

return {
videoTitle,
videoUrl,
transcript
};
}

module.exports = {
getYouTubeTranscript,
parseYouTubeUrl
};
