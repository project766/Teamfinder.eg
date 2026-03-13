/************************************************
 * FIREBASE CONFIG - FIRESTORE PHOTO STORAGE
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
const db = firebase.firestore();

/************************************************
 * PAGE LOAD & EVENT LISTENERS
 ************************************************/
window.addEventListener("DOMContentLoaded", () => {
    // Auth form animations
    const mainContainer = document.getElementById('main-container');
    const signUpToggle = document.getElementById('signUpToggle');
    const signInToggle = document.getElementById('signInToggle');
    
    if (signUpToggle && signInToggle && mainContainer) {
        signUpToggle.onclick = () => mainContainer.classList.add("right-panel-active");
        signInToggle.onclick = () => mainContainer.classList.remove("right-panel-active");
    }

    // Photo upload setup
    initPhotoUpload();

    // Form handlers
    document.getElementById('signInForm').onsubmit = (e) => {
        e.preventDefault();
        auth.signInWithEmailAndPassword(
            document.getElementById('inEmail').value,
            document.getElementById('inPassword').value
        ).catch(err => alert(err.message));
    };

    document.getElementById('signUpForm').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('upName').value;
        auth.createUserWithEmailAndPassword(
            document.getElementById('upEmail').value,
            document.getElementById('upPassword').value
        ).then(res => res.user.updateProfile({ displayName: name })
            .then(() => syncUserToFirestore(res.user)))
        .catch(err => alert(err.message));
    };

    document.getElementById('resetForm').onsubmit = (e) => {
        e.preventDefault();
        auth.sendPasswordResetEmail(document.getElementById('resetEmail').value)
        .then(() => {
            alert("Check your email 📧");
            switchView('auth-view');
        }).catch(err => alert(err.message));
    };
});

/************************************************
 * PHOTO UPLOAD TO FIRESTORE (Base64)
 ************************************************/
function initPhotoUpload() {
    const photoInput = document.getElementById('photoInput');
    const photoSelectBtn = document.getElementById('photoSelectBtn');
    
    if (photoInput && photoSelectBtn) {
        photoSelectBtn.onclick = () => photoInput.click();
        photoInput.onchange = handlePhotoSelect;
    }
}

function handlePhotoSelect(e) {
    const file = e.target.files[0];
    const photoPreview = document.getElementById('photoPreview');
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');

    if (file) {
        if (!file.type.startsWith('image/')) return alert('Please select image');
        if (file.size > 5 * 1024 * 1024) return alert('Max 5MB');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            photoPreview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <br><small>${file.name} (${(file.size/1024).toFixed(1)}KB)</small>
            `;
            uploadPhotoBtn.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
        window.selectedPhotoFile = file;
    }
}

async function handlePhotoUpload() {
    if (!window.selectedPhotoFile || !auth.currentUser) return alert('Login first');
    
    const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
    uploadPhotoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    uploadPhotoBtn.disabled = true;

    try {
        // Compress & convert to base64
        const base64Photo = await compressImageToBase64(window.selectedPhotoFile);
        
        // Update Auth profile
        await auth.currentUser.updateProfile({ photoURL: base64Photo });
        
        // Save to Firestore
        await db.collection("users").doc(auth.currentUser.uid).update({
            photo: base64Photo,
            photoSize: window.selectedPhotoFile.size,
            photoName: window.selectedPhotoFile.name,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        updateProfilePhotoUI(base64Photo);
        alert('✅ Photo saved to database!');
        loadUsers(); // Refresh users grid
        
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        resetPhotoUI();
    }
}

// Compress image to <500KB
function compressImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const maxSize = 400;
            let { width, height } = img;
            if (width > height) {
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
            } else {
                if (height > maxSize) { width *= maxSize / height; height = maxSize; }
            }
            
            canvas.width = width; canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function resetPhotoUI() {
    document.getElementById('photoPreview').innerHTML = '';
    const btn = document.getElementById('uploadPhotoBtn');
    btn.style.display = 'none';
    btn.innerHTML = '<i class="fas fa-upload"></i> Save to Database';
    btn.disabled = false;
    document.getElementById('photoInput').value = '';
    delete window.selectedPhotoFile;
}

/************************************************
 * USERS GRID - LOAD FROM FIRESTORE
 ************************************************/
function loadUsers(containerId = 'usersGrid') {
    db.collection("users")
    .where('photo', '!=', null)
    .orderBy('updatedAt', 'desc')
    .limit(20)
    .get()
    .then(snapshot => {
        const container = document.getElementById(containerId);
        const countEl = document.getElementById(containerId === 'usersGrid' ? 'usersCount' : 'allUsersCount');
        let count = 0;
        
        container.innerHTML = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            if (user.photo) {
                container.innerHTML += `
                    <div class="user-card">
                        <div class="user-photo" style="background-image: url('${user.photo}')"></div>
                        <h4>${user.name || 'Anonymous'}</h4>
                        <p>${user.email}</p>
                        <small>${user.photoName || 'Photo'} • ${(user.photoSize/1024).toFixed(1)}KB</small>
                    </div>
                `;
                count++;
            }
        });
        
        if (countEl) countEl.textContent = count;
    });
}

function loadAllUsers() {
    loadUsers('allUsersGrid');
}

/************************************************
 * UI UPDATES
 ************************************************/
function updateProfilePhotoUI(photoURL) {
    document.getElementById('profilePhotoContainer').innerHTML = `
        <div class="profile-photo" style="
            width: 70px; height: 70px; border-radius: 50%; margin: 0 auto 15px;
            background: #ddd url('${photoURL}') center/cover; border: 4px solid #4285f4;
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        "></div>
    `;
}

function loadCurrentProfilePhoto(user) {
    if (user.photoURL) {
        updateProfilePhotoUI(user.photoURL);
        document.getElementById('photoPreview').innerHTML = `
            <img src="${user.photoURL}" style="max-width:100px;max-height:100px;border-radius:8px;">
            <br><small>Current photo</small>
        `;
    }
}

/************************************************
 * FIRESTORE SYNC
 ************************************************/
function syncUserToFirestore(user) {
    if (!user) return;
    return db.collection("users").doc(user.uid).set({
        name: user.displayName || "New User",
        email: user.email,
        phone: user.phoneNumber || "Not provided",
        photo: user.photoURL || "",
        photoSize: 0,
        photoName: "",
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

/************************************************
 * AUTH LISTENER
 ************************************************/
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('display-name-label').innerText = user.displayName || "User";
        document.getElementById('user-email-display').innerText = user.email;
        switchView('dashboard-view');
        syncUserToFirestore(user);
        loadCurrentProfilePhoto(user);
        loadUsers();
        loadAllUsers();
    } else {
        switchView('auth-view');
    }
});

/************************************************
 * UTILITY FUNCTIONS
 ************************************************/
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
}

function toggleSettings() {
    document.getElementById('settings-panel').classList.toggle('active');
}

function updateName() {
    const newName = document.getElementById('newNameInput').value;
    if (newName && auth.currentUser) {
        auth.currentUser.updateProfile({ displayName: newName })
        .then(() => {
            syncUserToFirestore(auth.currentUser);
            document.getElementById('display-name-label').innerText = newName;
            alert("✅ Name updated!");
            toggleSettings();
        });
    }
}

function logout() {
    auth.signOut();
    document.getElementById('settings-panel').classList.remove('active');
}

/************************************************
 * GOOGLE LOGIN
 ************************************************/
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(provider)
    .then(result => syncUserToFirestore(result.user))
    .catch(err => alert(err.message));
}
