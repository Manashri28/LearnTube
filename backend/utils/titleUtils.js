function generateDisplayTitle(title) {
const original = String(title || "").trim();

if(!original) {
return "";
}

if(/^youtube playlist$/i.test(original)) {
return original;
}

const techPatterns = [
["Node.js", /\bnode(?:\.js|js)?\b/i],
["FastAPI", /\bfast\s*api\b/i],
["JavaScript", /\bjava\s*script\b|\bjavascript\b/i],
["TypeScript", /\btype\s*script\b|\btypescript\b/i],
["Python", /\bpython\b/i],
["React", /\breact(?:\.js|js)?\b/i],
["Next.js", /\bnext(?:\.js|js)?\b/i],
["Express.js", /\bexpress(?:\.js|js)?\b/i],
["MongoDB", /\bmongo\s*db\b|\bmongodb\b/i],
["Java", /\bjava\b/i],
["C++", /\bc\+\+\b/i],
["C#", /\bc#\b/i],
["HTML", /\bhtml\b/i],
["CSS", /\bcss\b/i],
["SQL", /\bsql\b/i],
["Django", /\bdjango\b/i],
["Flask", /\bflask\b/i],
["Angular", /\bangular\b/i],
["Vue.js", /\bvue(?:\.js|js)?\b/i],
["Docker", /\bdocker\b/i],
["Kubernetes", /\bkubernetes\b|\bk8s\b/i]
];

const technologies = [];
techPatterns.forEach(([name, pattern]) => {
if(pattern.test(original) && !technologies.includes(name)) {
technologies.push(name);
}
});

let cleaned = original
.replace(/\([^)]*\)/g, " ")
.replace(/\[[^\]]*\]/g, " ")
.replace(/\b(20\d{2})\b/g, " ")
.replace(/\b(beginner\s*to\s*advanced|zero\s*to\s*hero|complete\s*playlist|full\s*course|crash\s*course|complete\s*course)\b/gi, " ")
.replace(/\b(complete|ultimate|playlist|tutorials?|course|videos?|classes|masterclass|bootcamp|hindi|english)\b/gi, " ")
.replace(/[|:;,/\\()[\]{}]+/g, " ")
.replace(/\s+-\s+/g, " ")
.replace(/\bwith\b/gi, " ")
.replace(/\s+/g, " ")
.trim();

technologies.forEach((name) => {
const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pattern = /[+#.]/.test(name)
? new RegExp(escaped, "gi")
: new RegExp(`\\b${escaped}\\b`, "gi");
cleaned = cleaned.replace(pattern, " ");
});

const words = [];
cleaned.split(/\s+/).forEach((word) => {
const normalized = word.toLowerCase();
if(!normalized || ["the", "a", "an"].includes(normalized) || words.some((entry) => entry.toLowerCase() === normalized)) {
return;
}
words.push(word);
});

const displayTitle = [...technologies, ...words].join(" ")
.replace(/\s+/g, " ")
.trim();

return displayTitle || original;
}

function getDisplayTitle(item, fallback = "Untitled Playlist") {
return item?.displayTitle || generateDisplayTitle(item?.title) || item?.title || fallback;
}

module.exports = {
generateDisplayTitle,
getDisplayTitle
};
