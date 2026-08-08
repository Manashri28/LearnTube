const express = require("express");

const router = express.Router();

const {
analyzeQuizAttempt,
generateYouTubeQuiz,
getQuizStatus,
getAssessments,
saveQuizAttempt
} = require("../controllers/assessmentController");
const protect = require("../middleware/authMiddleware");

router.get(
"/",
getAssessments
);

router.get(
"/quiz/status",
protect,
getQuizStatus
);

router.post(
"/generate",
protect,
generateYouTubeQuiz
);

router.post(
"/analyze",
protect,
analyzeQuizAttempt
);

router.post(
"/attempts",
protect,
saveQuizAttempt
);

module.exports = router;
