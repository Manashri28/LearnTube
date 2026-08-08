// Main Express server for the LearnTube backend.
// This file configures middleware, connects routes, and starts the API server.

const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
path: path.join(__dirname, ".env")
});

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const assessmentRoutes = require("./routes/assessmentRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health route to confirm the backend is running.
app.get("/", (req, res) => {
res.json({
message: "LearnTube backend is running"
});
});

const youtubeRoutes =
require("./routes/youtubeRoutes");

app.use("/",youtubeRoutes);

// API routes
app.use("/", authRoutes);
app.use("/", protectedRoutes);
app.use("/", dashboardRoutes);
app.use("/playlists", playlistRoutes);
app.use("/assessments", assessmentRoutes);

const frontendPath = path.join(__dirname, "..", "Frontend");
app.use(express.static(frontendPath));
app.get("/quiz", (req, res) => {
res.sendFile(path.join(frontendPath, "quiz.html"));
});

async function startServer() {
// Start the server only after MongoDB connects successfully.
await connectDB();
app.listen(PORT, () => {
console.log(`LearnTube server running on port ${PORT}`);
});
}

if(require.main === module) {
startServer();
}

module.exports = app;
