const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const Review = require("../models/Review");

function hasCompletedPlaylist(user) {
return (user.learningHistory || []).some((item) => {
return item?.type === "playlist" && (item.completed === true || Number(item.progress) >= 100);
});
}

function serializeReview(review) {
if(!review) {
return null;
}

return {
displayName: review.displayName,
rating: review.rating,
text: review.text,
status: review.status,
createdAt: review.createdAt
};
}

router.get("/reviews", async (req, res) => {
try {
const reviews = await Review.find({ status: "approved" })
.select("displayName rating text createdAt -_id")
.sort({ createdAt: -1 })
.lean();

return res.status(200).json({ reviews });
} catch (error) {
return res.status(500).json({ message: "Unable to load reviews" });
}
});

router.get("/reviews/my-review", protect, async (req, res) => {
try {
const user = await User.findById(req.user.userId)
.select("name learningHistory reviewPromptDismissed")
.lean();

if(!user) {
return res.status(404).json({ message: "User not found" });
}

const review = await Review.findOne({ user: user._id }).lean();

return res.status(200).json({
eligible: hasCompletedPlaylist(user),
promptDismissed: user.reviewPromptDismissed === true,
review: serializeReview(review)
});
} catch (error) {
return res.status(500).json({ message: "Unable to load review status" });
}
});

router.post("/reviews", protect, async (req, res) => {
try {
const rating = Number(req.body.rating);
const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

if(!Number.isInteger(rating) || rating < 1 || rating > 5) {
return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
}

if(!text || text.length > 1000) {
return res.status(400).json({ message: "Review text is required and must be 1000 characters or fewer." });
}

const user = await User.findById(req.user.userId)
.select("name learningHistory")
.lean();

if(!user) {
return res.status(404).json({ message: "User not found" });
}

if(!hasCompletedPlaylist(user)) {
return res.status(403).json({ message: "Complete at least one playlist before reviewing LearnTube." });
}

const existingReview = await Review.findOne({ user: user._id }).lean();
if(existingReview) {
return res.status(409).json({ message: "You have already submitted a LearnTube review." });
}

const review = await Review.create({
user: user._id,
displayName: user.name,
text,
rating,
status: "pending"
});

return res.status(201).json({
message: "Review submitted for approval.",
review: serializeReview(review)
});
} catch (error) {
if(error?.code === 11000) {
return res.status(409).json({ message: "You have already submitted a LearnTube review." });
}

return res.status(500).json({ message: "Unable to submit review" });
}
});

router.post("/reviews/dismiss", protect, async (req, res) => {
try {
const user = await User.findByIdAndUpdate(
req.user.userId,
{ reviewPromptDismissed: true },
{ new: true }
).select("reviewPromptDismissed").lean();

if(!user) {
return res.status(404).json({ message: "User not found" });
}

return res.status(200).json({ promptDismissed: user.reviewPromptDismissed === true });
} catch (error) {
return res.status(500).json({ message: "Unable to dismiss review prompt" });
}
});

module.exports = router;
