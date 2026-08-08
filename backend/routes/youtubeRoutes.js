const express = require("express");

const router = express.Router();

function parsePlaylistId(playlistUrl) {
    try {
        return new URL(playlistUrl).searchParams.get("list");
    } catch (error) {
        return "";
    }
}

function pickThumbnail(thumbnails = {}) {
    return thumbnails.maxres?.url ||
        thumbnails.standard?.url ||
        thumbnails.high?.url ||
        thumbnails.medium?.url ||
        thumbnails.default?.url ||
        "";
}

router.get("/playlist", async (req, res) => {

    try {

        const playlistUrl = req.query.url;

        if (!playlistUrl) {
            return res.status(400).json({
                message: "Playlist URL is required."
            });
        }

        const playlistId = parsePlaylistId(playlistUrl);

        if (!playlistId) {
            return res.status(400).json({
                message: "Invalid playlist URL."
            });
        }

        const apiKey = process.env.YOUTUBE_API_KEY;

        let videos = [];
        let pageToken = "";
        let playlist = null;

        const playlistResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`
        );

        if (!playlistResponse.ok) {
            throw new Error("YouTube playlist metadata request failed.");
        }

        const playlistData = await playlistResponse.json();
        const playlistSnippet = playlistData.items?.[0]?.snippet;

        if (playlistSnippet) {
            playlist = {
                playlistId,
                title: playlistSnippet.title || "",
                channel: playlistSnippet.channelTitle || "YouTube Channel",
                thumbnail: pickThumbnail(playlistSnippet.thumbnails)
            };
        }

        while (true) {

            const url =
                `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
                + (pageToken ? `&pageToken=${pageToken}` : "");

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("YouTube API request failed.");
            }

            const data = await response.json();

            videos.push(
                ...data.items.map(video => ({

                    videoId: video.snippet.resourceId.videoId,

                    title: video.snippet.title,

                    thumbnail: pickThumbnail(video.snippet.thumbnails),

                    channel:
                        video.snippet.videoOwnerChannelTitle ||

                        video.snippet.channelTitle ||

                        "Unknown Channel"

                }))
            );

            if (!data.nextPageToken) {
                break;
            }

            pageToken = data.nextPageToken;
        }

        res.json({
            playlist,
            videos
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Failed to fetch playlist.",

            error: error.message

        });

    }

});

module.exports = router;
