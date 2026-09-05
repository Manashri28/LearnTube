const API_URL =
"https://learntube-ei40.onrender.com";

const GOOGLE_CLIENT_ID =
"861396590788-amh4qggnp8q3o2mj2ortnecjrd139fh0.apps.googleusercontent.com";

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

const googleLoginBtn =
document.getElementById(
"googleLoginBtn"
);

const googleRegisterBtn =
document.getElementById(
"googleRegisterBtn"
);


/* =======================
   FORM SWITCHING
   ======================= */

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


/* =======================
   MESSAGE HELPERS
   ======================= */

function showMessage(
element,
message,
type
){
element.textContent =
message;

element.className =
`form-message ${type}`;
}

function clearMessage(
element
){
element.textContent =
"";

element.className =
"form-message";
}


/* =======================
   NORMAL LOGIN
   ======================= */

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

const response =
await fetch(
`${API_URL}/login`,
{
method:"POST",

headers:{
"Content-Type":
"application/json"
},

body:JSON.stringify({
email,
password
})
}
);

const data =
await response.json();

if(!response.ok){

showMessage(
loginMessage,
data.message ||
"Login failed. Please check your details.",
"error"
);

return;
}


// Save JWT token
localStorage.setItem(
"token",
data.token
);


// Save user information
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


// Redirect to dashboard
window.location.href =
"dashboard.html";

} catch(error){

console.error(error);

showMessage(
loginMessage,
"Server error. Please make sure the backend is running.",
"error"
);

}

}
);


/* =======================
   NORMAL REGISTRATION
   ======================= */

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

const response =
await fetch(
`${API_URL}/register`,
{
method:"POST",

headers:{
"Content-Type":
"application/json"
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

if(!response.ok){

showMessage(
registerMessage,
data.message ||
"Registration failed. Please try again.",
"error"
);

return;
}


/*
   Registration successful.

   Instead of leaving the user
   on the registration form,
   switch directly to Login.
*/

registerForm.reset();

container.classList.remove(
"active"
);

showMessage(
loginMessage,
"Registration successful. Please login to continue.",
"success"
);

} catch(error){

console.error(error);

showMessage(
registerMessage,
"Server error. Please make sure the backend is running.",
"error"
);

}

}
);

/* =======================
   GOOGLE AUTHENTICATION
   ======================= */

async function handleGoogleCredential(response){

    try{

        const apiResponse = await fetch(
            `${API_URL}/google`,
            {
                method:"POST",

                headers:{
                    "Content-Type":"application/json"
                },

                body:JSON.stringify({
                    credential:response.credential
                })
            }
        );

        const data = await apiResponse.json();

        if(!apiResponse.ok){

            showMessage(
                loginMessage,
                data.message ||
                "Google authentication failed.",
                "error"
            );

            return;
        }

        localStorage.setItem(
            "token",
            data.token
        );

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        window.location.href =
            "dashboard.html";

    }catch(error){

        console.error(
            "Google authentication error:",
            error
        );

        showMessage(
            loginMessage,
            "Unable to authenticate with Google.",
            "error"
        );
    }
}


/* =======================
   GOOGLE BUTTON SETUP
   ======================= */

window.addEventListener("load",()=>{

    if(
        typeof google === "undefined" ||
        !google.accounts ||
        !google.accounts.id
    ){

        console.error(
            "Google Identity Services has not loaded."
        );

        return;
    }

    google.accounts.id.initialize({

        client_id:GOOGLE_CLIENT_ID,

        callback:handleGoogleCredential

    });

    if(googleLoginBtn){

        google.accounts.id.renderButton(
            googleLoginBtn,
            {
                theme:"outline",
                size:"large",
                text:"continue_with",
                shape:"rectangular"
            }
        );

    }

    if(googleRegisterBtn){

        google.accounts.id.renderButton(
            googleRegisterBtn,
            {
                theme:"outline",
                size:"large",
                text:"continue_with",
                shape:"rectangular"
            }
        );

    }

});