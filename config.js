// Firebase WEB config is public by design (security comes from Firestore/Storage rules).
// Copy it from Firebase Console > Project settings > Your apps. Never put secrets here.
window.CONFIG = {
  apiBase: "http://localhost:8080", // your deployed backend URL
  firebase: {
    apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: ""
  }
};
