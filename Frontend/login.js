const API_URL =
"https://learntube-ei40.onrender.com";

const container =
document.querySelector(
".container"
);

const registerBtn =
document.getElementById(
"registerBtn"
);

const loginBtn =
document.getElementById(
"loginBtn"
);

const loginForm =
document.getElementById(
"loginForm"
);

const registerForm =
document.getElementById(
"registerForm"
);

const loginMessage =
document.getElementById(
"loginMessage"
);

const registerMessage =
document.getElementById(
"registerMessage"
);

registerBtn.addEventListener(
"click",
()=>{
clearMessage(
loginMessage
);
container.classList.add(
"active"
);
}
);

loginBtn.addEventListener(
"click",
()=>{
clearMessage(
registerMessage
);
container.classList.remove(
"active"
);
}
);

function showMessage(element,message,type) {
element.textContent =
message;
element.className =
`form-message ${type}`;
}

function clearMessage(element) {
element.textContent =
"";
element.className =
"form-message";
}

// fetch() sends data from the frontend to the backend API using HTTP.
// This login request sends email and password as JSON to Express.
loginForm.addEventListener(
"submit",
async (event)=>{
event.preventDefault();
clearMessage(
loginMessage
);

const email =
document.getElementById(
"loginEmail"
).value.trim();

const password =
document.getElementById(
"loginPassword"
).value;

try {
const response = await fetch(
`${API_URL}/login`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
email,
password
})
}
);

const data =
await response.json();

if(!response.ok) {
showMessage(
loginMessage,
data.message || "Login failed. Please check your details.",
"error"
);
return;
}

// localStorage keeps the JWT and user data available after page redirect/refresh.
localStorage.setItem(
"token",
data.token
);

localStorage.setItem(
"user",
JSON.stringify(
data.user
)
);

showMessage(
loginMessage,
"Login successful. Redirecting...",
"success"
);

// Redirect logic moves the authenticated user into the dashboard page.
window.location.href =
"dashboard.html";
} catch (error) {
showMessage(
loginMessage,
"Server error. Please make sure the backend is running.",
"error"
);
}
}
);

// This register request sends new user data to the backend API.
registerForm.addEventListener(
"submit",
async (event)=>{
event.preventDefault();
clearMessage(
registerMessage
);

const name =
document.getElementById(
"registerName"
).value.trim();

const email =
document.getElementById(
"registerEmail"
).value.trim();

const password =
document.getElementById(
"registerPassword"
).value;

try {
const response = await fetch(
`${API_URL}/register`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
name,
email,
password
})
}
);

const data =
await response.json();

if(!response.ok) {
showMessage(
registerMessage,
data.message || "Registration failed. Please try again.",
"error"
);
return;
}

showMessage(
registerMessage,
"Registration successful. You can now login.",
"success"
);

registerForm.reset();
} catch (error) {
showMessage(
registerMessage,
"Server error. Please make sure the backend is running.",
"error"
);
}
}
);
