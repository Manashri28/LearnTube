const API_URL = "https://learntube-ei40.onrender.com";
const reviewsSection = document.getElementById("reviewsSection");
const reviewsContainer = document.getElementById("reviewsContainer");

function renderReview(review) {
const card = document.createElement("article");
card.className = "review-card";

const rating = document.createElement("div");
rating.className = "review-rating";
rating.setAttribute("aria-label", `${review.rating} out of 5 stars`);
rating.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`;

const text = document.createElement("p");
text.className = "review-text";
text.textContent = review.text;

const reviewer = document.createElement("p");
reviewer.className = "reviewer-name";
reviewer.textContent = review.displayName;

const learnerLabel = document.createElement("span");
learnerLabel.className = "reviewer-label";
learnerLabel.textContent = "LearnTube learner";

const date = document.createElement("time");
date.className = "review-date";
date.dateTime = review.createdAt;
date.textContent = new Date(review.createdAt).toLocaleDateString();

card.append(rating, text, reviewer, learnerLabel, date);
return card;
}

async function loadApprovedReviews() {
try {
const response = await fetch(`${API_URL}/reviews`);
if(!response.ok) {
return;
}

const data = await response.json();
if(!Array.isArray(data.reviews) || !data.reviews.length) {
return;
}

reviewsContainer.replaceChildren(...data.reviews.map(renderReview));
reviewsSection.hidden = false;
} catch (error) {
return;
}
}

loadApprovedReviews();
