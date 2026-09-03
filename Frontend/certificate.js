const API_URL = "https://learntube-ei40.onrender.com";
const token = localStorage.getItem("token");
const certificateDocument = document.getElementById("certificateDocument");
const certificateStatus = document.getElementById("certificateStatus");
const downloadCertificateBtn = document.getElementById("downloadCertificateBtn");

function showCertificateStatus(message) {
certificateStatus.textContent = message;
certificateStatus.hidden = false;
}

async function loadCertificate() {
if(!token) {
window.location.href = "login.html";
return;
}

const certificateId = new URLSearchParams(window.location.search).get("certificateId");
if(!certificateId) {
showCertificateStatus("Certificate not found.");
return;
}

try {
const response = await fetch(`${API_URL}/certificate/${encodeURIComponent(certificateId)}`, {
headers: {
Authorization: `Bearer ${token}`
}
});

if(!response.ok) {
showCertificateStatus("Certificate not found.");
return;
}

function getCleanCourseName(title) {
    if (!title) return "Course";

    let name = title;

    name = name
        .replace(/\b(full course|complete course|course|tutorial|tutorials|beginner to advanced|beginners|masterclass)\b/gi, "")
        .replace(/\b(20\d{2})\b/g, "")
        .replace(/\s*[-|:•]\s*/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return name || title;
}

const data = await response.json();
const certificate = data.certificate;
document.getElementById("courseTitle").textContent =
    getCleanCourseName(certificate.courseTitle);
document.getElementById("learnerName").textContent = certificate.learnerName;
document.getElementById("courseTitle").textContent = certificate.courseTitle;
document.getElementById("channelName").textContent = certificate.channelName;
document.getElementById("quizScore").textContent = `${certificate.quizScore}%`;
document.getElementById("completionDate").textContent = new Date(certificate.completionDate).toLocaleDateString();
document.getElementById("certificateId").textContent = certificate.certificateId;
certificateStatus.hidden = true;
certificateDocument.hidden = false;
} catch (error) {
showCertificateStatus("Unable to load certificate.");
}
}

downloadCertificateBtn.addEventListener("click", () => {
window.print();
});

loadCertificate();
