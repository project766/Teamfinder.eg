const firebaseConfig = {

apiKey: "YOUR_API_KEY",

authDomain: "YOUR_DOMAIN",

projectId: "YOUR_PROJECT_ID",

storageBucket: "YOUR_BUCKET",

appId: "YOUR_APP_ID"

};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();

const db = firebase.firestore();

const storage = firebase.storage();



window.addEventListener("DOMContentLoaded", () => {

document.getElementById("signInForm").onsubmit = e => {

e.preventDefault();

auth.signInWithEmailAndPassword(

document.getElementById("inEmail").value,

document.getElementById("inPassword").value

).catch(e => alert(e.message));

};



document.getElementById("signUpForm").onsubmit = e => {

e.preventDefault();

const name = document.getElementById("upName").value;

auth.createUserWithEmailAndPassword(

document.getElementById("upEmail").value,

document.getElementById("upPassword").value

)

.then(res => {

return res.user.updateProfile({

displayName: name

});

})

.then(() => syncUser(auth.currentUser))

.catch(e => alert(e.message));

};



document.getElementById("resetForm").onsubmit = e => {

e.preventDefault();

auth.sendPasswordResetEmail(

document.getElementById("resetEmail").value

).then(()=>alert("Email sent"));

};

});



function syncUser(user){

db.collection("users").doc(user.uid).set({

name:user.displayName,

email:user.email,

photo:user.photoURL || ""

},{merge:true});

}



auth.onAuthStateChanged(user=>{

if(user){

switchView("dashboard-view");

document.getElementById("display-name-label").innerText=user.displayName;

document.getElementById("user-email-display").innerText=user.email;

loadProfilePhoto(user);

}

else{

switchView("auth-view");

}

});



function switchView(id){

document.querySelectorAll(".view-section").forEach(v=>v.classList.remove("active"));

document.getElementById(id).classList.add("active");

}



function toggleSettings(){

document.getElementById("settings-panel").classList.toggle("active");

}



function updateName(){

const name=document.getElementById("newNameInput").value;

auth.currentUser.updateProfile({displayName:name}).then(()=>{

syncUser(auth.currentUser);

document.getElementById("display-name-label").innerText=name;

});

}



function logout(){

auth.signOut();

}



function loginWithGoogle(){

const provider=new firebase.auth.GoogleAuthProvider();

auth.signInWithPopup(provider)

.then(res=>syncUser(res.user))

.catch(e=>alert(e.message));

}



/*********************
UPLOAD PHOTO
*********************/
function uploadPhoto(){

const file=document.getElementById("photoInput").files[0];

if(!file){

alert("Select photo first");

return;

}

const user=auth.currentUser;

const ref=storage.ref("userPhotos/"+user.uid+"/"+file.name);

ref.put(file)

.then(()=>ref.getDownloadURL())

.then(url=>{

db.collection("users").doc(user.uid).update({

photo:url

});

document.getElementById("profilePhoto").src=url;

alert("Photo uploaded");

});

}



/*********************
LOAD PHOTO
*********************/
function loadProfilePhoto(user){

db.collection("users").doc(user.uid).get()

.then(doc=>{

if(doc.exists){

const data=doc.data();

if(data.photo){

document.getElementById("profilePhoto").src=data.photo;

}

}

});

}
