const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
{
user: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: true,
unique: true
},
displayName: {
type: String,
required: true,
trim: true
},
text: {
type: String,
required: true,
trim: true,
maxlength: 1000
},
rating: {
type: Number,
required: true,
min: 1,
max: 5
},
status: {
type: String,
enum: ["pending", "approved", "rejected"],
default: "pending"
}
},
{
timestamps: true
}
);

module.exports = mongoose.model("Review", reviewSchema);
