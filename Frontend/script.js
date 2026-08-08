const startBtn =
document.getElementById(
"startBtn"
);

// Landing to login navigation for the static frontend flow.
if(startBtn){
startBtn.addEventListener(
"click",
()=>{
window.location.href =
"login.html";
}
);
}
