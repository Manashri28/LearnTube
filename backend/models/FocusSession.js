const mongoose = require("mongoose");

const focusSessionSchema = new mongoose.Schema(
{
user: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: true,
index: true
},
playlistId: {
type: String,
required: true,
trim: true
},
videoId: {
type: String,
default: "",
trim: true
},
videoUrl: {
type: String,
default: "",
trim: true
},
startedAt: {
type: Date,
required: true,
default: Date.now
},
endedAt: Date,
durationSeconds: {
type: Number,
min: 0,
default: 0
}
},
{
timestamps: true
}
);

module.exports = mongoose.model("FocusSession", focusSessionSchema);
