// User model for registered LearnTube users.
// Mongoose uses this schema to validate and store user documents in MongoDB.

const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const userSchema = new mongoose.Schema(
{
publicProfileId: {
type: String,
unique: true,
sparse: true,
default: randomUUID
},
reviewPromptDismissed: {
type: Boolean,
default: false
},
name: {
type: String,
required: true,
trim: true
},
email: {
type: String,
required: true,
unique: true,
trim: true,
lowercase: true
},
password: {
type: String,
required: true
},
learningHistory: [
{
itemId: String,
type: {
type: String,
default: "playlist"
},
playlistId: String,
videoId: String,
title: String,
displayTitle: String,
thumbnail: String,
url: String,
duration: String,
channel: String,
totalVideos: Number,
videos: [
mongoose.Schema.Types.Mixed
],
progress: {
type: Number,
default: 0
},
completed: {
type: Boolean,
default: false
},
quizUnlocked: {
type: Boolean,
default: false
},
lastActiveAt: Date,
completedAt: Date,
createdAt: Date
}
],
quizAttempts: [
{
playlistId: String,
videoTitle: String,
displayTitle: String,
videoUrl: String,
title: String,
score: Number,
total: Number,
percentage: Number,
passed: {
type: Boolean,
default: false
},
proctored: {
type: Boolean,
default: false
},
tabSwitchViolations: {
type: Number,
default: 0
},
fullscreenViolations: {
type: Number,
default: 0
},
cameraViolations: {
type: Number,
default: 0
},
personPresenceViolations: {
type: Number,
default: 0
},
status: {
type: String,
enum: ["started", "completed", "aborted"],
default: "completed"
},
analysis: mongoose.Schema.Types.Mixed,
createdAt: Date
}
],
certificates: [
{
title: String,
displayTitle: String,
score: Number,
playlistId: String,
quizAttemptId: mongoose.Schema.Types.ObjectId,
generatedAt: Date
}
],
skills: [
{
playlistId: String,
name: String,
displayTitle: String,
score: Number,
verified: {
type: Boolean,
default: false
},
verifiedAt: Date
}
]
},
{
timestamps: true
}
);

module.exports = mongoose.model(
"User",
userSchema
);
