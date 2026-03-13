   /************************************************
 * 1. INITIALIZE FIREBASE
 ************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyD0efUT_IFoPQ3svHnu89j7kyWE6OYnWtE",
  authDomain: "the-tech-world-e2b7c.firebaseapp.com",
  projectId: "the-tech-world-e2b7c",
  storageBucket: "the-tech-world-e2b7c.firebasestorage.app",
  messagingSenderId: "435175920778",
  appId: "1:435175920778:web:09c9e899d71afce34c0973"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();

/************************************************
 * 2. WAIT FOR PAGE LOAD
 ************************************************/
window.addEventListener("DOMContentLoaded", () => {

  // Animation toggles
  const mainContainer = document.getElementById('main-container');
  const signUpToggle  = document.getElementById('signUpToggle');
  const signInToggle  = document.getElementById('signInToggle');

  if (signUpToggle && signInToggle && mainContainer) {
    signUpToggle.onclick = () =>
      mainContainer.classList.add("right-panel-active");

    signInToggle.onclick = () =>
      mainContainer.classList.remove("right-panel-active");
  }

  /************************************************
   * 6. FORM ACTIONS
   ************************************************/

  // Sign In
  const signInForm = document.getElementById('signInForm');
  if (signInForm) {
    signInForm.onsubmit = (e) => {
      e.preventDefault();
      auth.signInWithEmailAndPassword(
        document.getElementById('inEmail').value,
        document.getElementById('inPassword').value
      ).catch(err => alert(err.message));
    };
  }

  // Sign Up
  const signUpForm = document.getElementById('signUpForm');
  if (signUpForm) {
    signUpForm.onsubmit = (e) => {
      e.preventDefault();

      const name = document.getElementById('upName').value;

      auth.createUserWithEmailAndPassword(
        document.getElementById('upEmail').value,
        document.getElementById('upPassword').value
      )
      .then(res =>
        res.user.updateProfile({ displayName: name })
          .then(() => syncUserToFirestore(res.user))
      )
      .catch(err => alert(err.message));
    };
  }

  // Reset Password
  const resetForm = document.getElementById('resetForm');
  if (resetForm) {
    resetForm.onsubmit = (e) => {
      e.preventDefault();
      auth.sendPasswordResetEmail(
        document.getElementById('resetEmail').value
      )
      .then(() => {
        alert("Check your email 📧");
        switchView('auth-view');
      })
      .catch(err => alert(err.message));
    };
  }

});

/************************************************
 * 3. DATABASE SYNC (ONE FUNCTION ONLY ✅)
 ************************************************/
function syncUserToFirestore(user) {
  if (!user) return;

  return db.collection("users").doc(user.uid).set({
    name: user.displayName || "New User",
    email: user.email,
    phone: user.phoneNumber || "Not provided",
    photo: user.photoURL || "",
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true })
  .catch(err => console.error("Firestore Error:", err));
}

/************************************************
 * 4. AUTH STATE LISTENER
 ************************************************/
auth.onAuthStateChanged(user => {
  if (user) {
    const nameLabel  = document.getElementById('display-name-label');
    const emailLabel = document.getElementById('user-email-display');

    if (nameLabel)  nameLabel.innerText  = user.displayName || "User";
    if (emailLabel) emailLabel.innerText = user.email;

    switchView('dashboard-view');
    syncUserToFirestore(user);
  } else {
    const resetView = document.getElementById('reset-view');
    if (!resetView || !resetView.classList.contains('active')) {
      switchView('auth-view');
    }
  }
});

/************************************************
 * 5. HELPER FUNCTIONS
 ************************************************/
function switchView(viewId) {
  document.querySelectorAll('.view-section')
    .forEach(v => v.classList.remove('active'));

  const view = document.getElementById(viewId);
  if (view) view.classList.add('active');
}

function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  if (panel) panel.classList.toggle('active');
}

function updateName() {
  const newName = document.getElementById('newNameInput').value;

  if (newName && auth.currentUser) {
    auth.currentUser.updateProfile({ displayName: newName })
      .then(() => {
        syncUserToFirestore(auth.currentUser);
        document.getElementById('display-name-label').innerText = newName;
        alert("Name Updated ✅");
        toggleSettings();
      });
  }
}

function logout() {
  auth.signOut();
  const panel = document.getElementById('settings-panel');
  if (panel) panel.classList.remove('active');
}

/************************************************
 * 7. GOOGLE LOGIN
 ************************************************/
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  auth.signInWithPopup(provider)
    .then(result => syncUserToFirestore(result.user))
    .catch(err => alert(err.message));
}
