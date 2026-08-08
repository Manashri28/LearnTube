// Playlist routes for future YouTube playlist actions.
// More endpoints can be added here as playlist features grow.

const express = require("express");
const router = express.Router();

const {
getLearningLibrary,
getLearningPlaylist,
getPlaylists,
saveLearningItem,
updateLearningProgress,
deleteLearningItem
} = require("../controllers/playlistController");
const protect = require("../middleware/authMiddleware");

router.get("/", getPlaylists);
router.get("/library", protect, getLearningLibrary);
router.get("/library/:playlistId", protect, getLearningPlaylist);
router.post("/library", protect, saveLearningItem);
router.patch("/library/:itemId", protect, updateLearningProgress);
router.delete("/library/:itemId", protect, deleteLearningItem);

module.exports = router;
