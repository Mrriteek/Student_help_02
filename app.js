firebase.initializeApp(CONFIG.firebase);
const auth = firebase.auth(), db = firebase.firestore();
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const S = { user: null, admin: false, maint: { enabled: false, message: "" }, prices: {}, owned: new Set(), payments: [], q: "" };

function toast(m, err) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : ""); t.textContent = m;
  $("#toasts").append(t); setTimeout(() => t.remove(), 4000);
}
async function api(path, opts = {}) {
  const h = { "Content-Type": "application/json" };
  if (S.user) h.Authorization = "Bearer " + (await S.user.getIdToken());
  const r = await fetch(CONFIG.apiBase + path, { ...opts, headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.message || d.error || "Request failed"), { status: r.status });
  return d;
}
const priceOf = (sid, type) => S.prices[`${sid}_${type}`]?.price ?? (type === "qa" ? 69 : 99);

/* ---------- views ---------- */
const nav = () => `<nav><div class="wrap">
 <a class="logo" href="#/"><i>🎓</i>STUDENT HELP</a>
 <button id="burger" onclick="document.querySelector('.links').classList.toggle('open')">☰</button>
 <div class="links"><a href="#/">Home</a><a href="#/subjects">Subjects</a><a href="#/faq">FAQ</a>
 ${S.user ? `<a href="#/account">My PDFs</a><button onclick="auth.signOut()">Logout</button>` : `<button class="btn sm" onclick="openAuth()">Login / Sign up</button>`}</div></div></nav>`;
const footer = () => `<footer><div class="wrap"><b>STUDENT HELP</b> · Your Study. Your Success.<br>© ${new Date().getFullYear()} Student Help. All rights reserved.</div></footer>`;

function subjectCard(s, i) {
  return `<div class="card" style="animation-delay:${(i % 12) * 40}ms"><div class="ico">${s.icon}</div><h3>${esc(s.name)}</h3><div class="code">${esc(s.code)}</div>
  <div class="row"><span class="tag">Q&A ₹${priceOf(s.id, "qa")}</span><span class="tag">Notes ₹${priceOf(s.id, "notes")}</span></div>
  <div class="row"><a class="btn sm" href="#/subject/${s.id}">View Details</a><a class="btn sm ghost" href="#/subject/${s.id}">Q&A</a><a class="btn sm ghost" href="#/subject/${s.id}">Premium PDF</a></div></div>`;
}
const list = (arr) => arr.length ? arr.map(subjectCard).join("") : `<div class="empty" style="grid-column:1/-1">😕 No subjects found.</div>`;
const filtered = () => SUBJECTS.filter((s) => (s.name + s.code).toLowerCase().includes(S.q.toLowerCase()));

const faqs = [["How do I get my PDF?", "Buy it, and the Download button appears instantly in My PDFs."],
 ["Is payment safe?", "Payments run through Razorpay and are verified on our secure server."],
 ["Can I download again later?", "Yes, purchased PDFs stay in your account."],
 ["Are Q&A and Notes sold separately?", "Yes. Q&A PDF is ₹69 and Premium Notes PDF is ₹99 per subject."]];

function home() {
  const feat = SUBJECTS.slice(0, 6);
  return `${nav()}<div class="wrap"><div class="hero"><span class="tag">🎓 Premium Education Platform</span>
  <h1 style="margin-top:14px">Your Study.<br><span class="grad">Your Success.</span></h1>
  <p>Find Quality Study Materials, Important Questions and Premium Notes.</p>
  <div class="search"><input id="q" placeholder="Search subjects or code…" oninput="S.q=this.value;go()" value="${esc(S.q)}"><a class="btn sm" href="#/subjects">Explore Subjects</a></div></div>
  <section><h2>Featured Subjects</h2><p class="sub">Popular picks this semester</p><div class="grid">${list(feat)}</div></section>
  <section><div class="two"><div class="card"><div class="ico">❓</div><h3>Question & Answer PDF</h3><p class="sub" style="text-align:left">Important questions with clear answers. <b>₹69</b> per subject.</p></div>
  <div class="card"><div class="ico">💎</div><h3>Premium Notes PDF</h3><p class="sub" style="text-align:left">Complete, exam-focused notes. <b>₹99</b> per subject.</p></div></div></section>
  <section><h2>Why Choose Student Help?</h2><div class="grid" style="margin-top:24px">
  ${[["🔒", "Secure Payments", "Razorpay with server-side verification"], ["⚡", "Instant Unlock", "PDF unlocked right after payment"], ["📱", "Any Device", "Works on phone, tablet and laptop"], ["🎯", "Exam Focused", "Important questions and notes"]].map(([i, t, d]) => `<div class="card"><div class="ico">${i}</div><h3>${t}</h3><p class="code">${d}</p></div>`).join("")}</div></section>
  <section><h2>How It Works</h2><div class="grid" style="margin-top:24px">${["Pick your subject", "Click Buy Now", "Pay with Razorpay", "Download your PDF"].map((t, i) => `<div class="card"><div class="ico">${i + 1}</div><h3>${t}</h3></div>`).join("")}</div></section>
  <section><h2>Frequently Asked Questions</h2><div style="max-width:760px;margin:24px auto 0">${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></section></div>${footer()}`;
}
const subjectsPage = () => `${nav()}<div class="wrap"><section><h2>All Subjects</h2><p class="sub">22 subjects, 2 products each</p>
  <div class="search"><input id="q" placeholder="Search subjects or code…" oninput="S.q=this.value;go()" value="${esc(S.q)}"></div><div class="grid">${list(filtered())}</div></section></div>${footer()}`;

function productCard(s, type) {
  const id = `${s.id}_${type}`, qa = type === "qa", own = S.owned.has(id);
  return `<div class="card"><div class="ico">${qa ? "❓" : "💎"}</div><h3>${qa ? "Question & Answer PDF" : "Premium Notes PDF"}</h3>
  <p class="code">${esc(s.name)} · ${esc(s.code)}</p><div class="price">₹${priceOf(s.id, type)}</div>
  <div class="row">${own ? `<button class="btn" onclick="download('${id}')">⬇ Download PDF</button>` : `<button class="btn" id="b_${id}" onclick="buy('${id}')">Buy Now</button>`}</div></div>`;
}
function subjectPage(id) {
  const s = SUBJECTS.find((x) => x.id === id); if (!s) return notFound();
  return `${nav()}<div class="wrap"><section><a href="#/subjects" class="code">← All subjects</a><div class="hero" style="padding:20px 0"><div class="ico" style="margin:auto">${s.icon}</div>
  <h1 style="font-size:2.2rem">${esc(s.name)}</h1><p>Code: ${esc(s.code)}. Exam-focused study material prepared for this subject.</p></div>
  <div class="two">${productCard(s, "qa")}${productCard(s, "notes")}</div></section></div>${footer()}`;
}
function account() {
  if (!S.user) return `${nav()}<div class="center"><div><div class="big">🔐</div><h2>Please login</h2><button class="btn" onclick="openAuth()">Login / Sign up</button></div></div>`;
  const mine = SUBJECTS.flatMap((s) => ["qa", "notes"].map((t) => ({ s, t, id: `${s.id}_${t}` }))).filter((x) => S.owned.has(x.id));
  return `${nav()}<div class="wrap"><section><h2>My Account</h2><p class="sub">${esc(S.user.displayName || "")} · ${esc(S.user.email)}</p>
  <h3>My PDFs</h3>${mine.length ? `<div class="grid" style="margin:14px 0 30px">${mine.map((x) => `<div class="card"><h3>${esc(x.s.name)}</h3><p class="code">${x.t === "qa" ? "Q&A PDF" : "Premium Notes"}</p><button class="btn sm" onclick="download('${x.id}')">⬇ Download</button></div>`).join("")}</div>` : `<div class="empty">📭 No purchases yet. <a href="#/subjects" class="grad">Browse subjects</a></div>`}
  <h3>Payment History</h3>${S.payments.length ? `<div style="overflow-x:auto"><table><tr><th>Date</th><th>Product</th><th>Amount</th><th>Status</th></tr>${S.payments.map((p) => `<tr><td>${p.createdAt ? p.createdAt.toDate().toLocaleDateString() : "…"}</td><td>${esc(p.productId)}</td><td>₹${p.amount / 100}</td><td>${esc(p.status)}</td></tr>`).join("")}</table></div>` : `<div class="empty">No payments yet.</div>`}</section></div>${footer()}`;
}
const faqPage = () => `${nav()}<div class="wrap"><section><h2>FAQ</h2><div style="max-width:760px;margin:24px auto">${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></section></div>${footer()}`;
const notFound = () => `${nav()}<div class="center"><div><div class="big">🧭</div><h2>404 – Page not found</h2><a class="btn" href="#/">Go Home</a></div></div>`;
const maintenance = () => `<div class="center"><div><div class="big">🛠️</div><h2>Under Maintenance</h2><p class="sub">${esc(S.maint.message || "We'll be back shortly.")}</p>
  ${S.user ? "" : `<button class="btn ghost sm" onclick="openAuth()">Admin login</button>`}</div></div>`;

/* ---------- router ---------- */
function go() {
  const h = location.hash.replace(/^#/, "") || "/", focus = document.activeElement?.id === "q", pos = $("#q")?.selectionStart;
  let html;
  if (S.maint.enabled && !S.admin) html = maintenance();
  else if (h === "/") html = home();
  else if (h === "/subjects") html = subjectsPage();
  else if (h.startsWith("/subject/")) html = subjectPage(h.split("/")[2]);
  else if (h === "/account") html = account();
  else if (h === "/faq") html = faqPage();
  else html = notFound();
  $("#app").innerHTML = html;
  if (focus && $("#q")) { $("#q").focus(); $("#q").setSelectionRange(pos, pos); }
}
window.addEventListener("hashchange", () => { go(); scrollTo(0, 0); });

/* ---------- auth ---------- */
function openAuth(mode = "login") {
  const reg = mode === "register";
  $("#authDlg").innerHTML = `<h3>${reg ? "Create account" : "Welcome back"}</h3>
  <form onsubmit="submitAuth(event,${reg})">${reg ? `<input class="f" name="name" placeholder="Full name" required>` : ""}
  <input class="f" type="email" name="email" placeholder="Email" required><input class="f" type="password" name="pw" placeholder="Password (min 6)" minlength="6" required>
  <button class="btn" style="width:100%;margin-top:8px">${reg ? "Register" : "Login"}</button></form>
  <button class="btn ghost" style="width:100%;margin-top:8px" onclick="googleLogin()">Continue with Google</button>
  <p class="code" style="text-align:center;margin-top:12px"><a href="#" onclick="event.preventDefault();openAuth('${reg ? "login" : "register"}')">${reg ? "Have an account? Login" : "New here? Register"}</a> ·
  <a href="#" onclick="event.preventDefault();$('#authDlg').close()">Close</a></p>`;
  $("#authDlg").showModal();
}
async function saveProfile(u, name) {
  await db.doc(`users/${u.uid}`).set({ name: name || u.displayName || "", email: u.email, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
}
async function submitAuth(e, reg) {
  e.preventDefault(); const f = new FormData(e.target);
  try {
    if (reg) {
      const c = await auth.createUserWithEmailAndPassword(f.get("email"), f.get("pw"));
      await c.user.updateProfile({ displayName: f.get("name") }); await saveProfile(c.user, f.get("name"));
    } else await auth.signInWithEmailAndPassword(f.get("email"), f.get("pw"));
    $("#authDlg").close(); toast("Welcome!");
  } catch (err) { toast(err.message.replace("Firebase: ", ""), true); }
}
async function googleLogin() {
  try { const c = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); await saveProfile(c.user); $("#authDlg").close(); }
  catch (err) { toast(err.message.replace("Firebase: ", ""), true); }
}

/* ---------- purchase flow ---------- */
async function buy(productId) {
  if (!S.user) return openAuth();
  const btn = $("#b_" + productId); if (btn) { btn.disabled = true; btn.textContent = "Please wait…"; }
  try {
    const o = await api("/api/payments/create-order", { method: "POST", body: { productId } });
    new Razorpay({
      key: o.keyId, amount: o.amount, currency: o.currency, order_id: o.orderId, name: o.name, description: o.description,
      prefill: o.prefill, theme: { color: "#6d4cff" },
      handler: async (r) => {
        try {
          const v = await api("/api/payments/verify", { method: "POST", body: r });
          toast(v.status === "paid" ? "Payment successful! PDF unlocked 🎉" : "Payment received, unlocking shortly…");
        } catch (err) { toast(err.message, true); }
      },
      modal: { ondismiss: () => { if (btn) { btn.disabled = false; btn.textContent = "Buy Now"; } } },
    }).open();
  } catch (err) {
    toast(err.message, true); if (btn) { btn.disabled = false; btn.textContent = "Buy Now"; }
  }
}
async function download(productId) {
  try { const d = await api("/api/downloads/" + productId); window.open(d.url, "_blank"); }
  catch (err) { toast(err.message, true); }
}

/* ---------- boot ---------- */
let unsub = [];
auth.onAuthStateChanged(async (u) => {
  unsub.forEach((f) => f()); unsub = []; S.user = u; S.admin = false; S.owned = new Set(); S.payments = [];
  if (u) {
    api("/api/me").then((m) => { S.admin = m.admin; go(); }).catch(() => {});
    unsub.push(db.collection("purchases").where("uid", "==", u.uid).onSnapshot((q) => { S.owned = new Set(q.docs.map((d) => d.data().productId)); go(); }, () => {}));
    unsub.push(db.collection("payments").where("uid", "==", u.uid).onSnapshot((q) => { S.payments = q.docs.map((d) => d.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)); go(); }, () => {}));
  }
  go();
});
(async () => {
  try { S.maint = await api("/api/maintenance"); } catch { toast("Server not reachable", true); }
  try { (await db.collection("products").get()).forEach((d) => (S.prices[d.id] = d.data())); } catch {}
  db.doc("settings/maintenance").onSnapshot((d) => { if (d.exists) { S.maint = d.data(); go(); } }, () => {});
  go(); $("#loader").classList.add("hide");
})();
