let socket; // declared here so initSocket can reassign

// DOM elements
const loginContainer = document.getElementById("login-container");
const chatContainer = document.getElementById("chat-container");

const registerBtn = document.getElementById("register-btn");
const loginBtn = document.getElementById("login-btn");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const profileInput = document.getElementById("profilePic");

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const onlineUsersList = document.getElementById("online-users");
const typingDiv = document.getElementById("typing");

// Audio notifications
const messageAudio = new Audio("/sounds/ding.mp3");
const joinAudio = new Audio("/sounds/join.mp3");
const leaveAudio = new Audio("/sounds/leave.mp3");

// Current logged-in user
let currentUser = null;

/* -----------------------
   Initialize Socket
------------------------ */
function initSocket() {
  const token = localStorage.getItem("jwtToken");
  if (!token) return;

  socket = io({ auth: { token } });

  // Socket events
  socket.on("newMessage", (data) => {
    renderMessage(data, data.sender?.name === currentUser?.name);
    if (data.sender?.name !== currentUser?.name) {
      messageAudio.play();
    }
  });

  socket.on("userTyping", (user) => {
    typingDiv.innerText = `${user} is typing...`;
    setTimeout(() => (typingDiv.innerText = ""), 2000);
  });

  socket.on("updateUsers", (users) => {
    onlineUsersList.innerHTML = "";
    users.forEach((u) => {
      const li = document.createElement("li");
      li.textContent = u.name;
      onlineUsersList.appendChild(li);
    });
  });

  socket.on("userNotification", (msg) => {
    const notifElem = document.createElement("div");
    notifElem.innerHTML = `<em>${msg}</em>`;
    messagesDiv.appendChild(notifElem);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    if (msg.includes("joined")) joinAudio.play();
    if (msg.includes("left")) leaveAudio.play();
  });
}

/* -----------------------
   Register
------------------------ */
registerBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const profilePicFile = profileInput.files[0];

  if (!name || !email || !password) return alert("All fields required");

  const formData = new FormData();
  formData.append("name", name);
  formData.append("email", email);
  formData.append("password", password);
  if (profilePicFile) formData.append("profilePic", profilePicFile);

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) return alert(data.msg);

    currentUser = data.user;
    localStorage.setItem("jwtToken", data.token);

    loginContainer.style.display = "none";
    chatContainer.style.display = "flex";

    initSocket();
    loadChatHistory();
  } catch (err) {
    console.error(err);
    alert("Registration failed");
  }
});

/* -----------------------
   Login
------------------------ */
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  if (!email || !password) return alert("Email and password required");

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.msg);

    currentUser = data.user;
    localStorage.setItem("jwtToken", data.token);

    loginContainer.style.display = "none";
    chatContainer.style.display = "flex";

    initSocket();
    loadChatHistory();
  } catch (err) {
    console.error(err);
    alert("Login failed");
  }
});

/* -----------------------
   Load Chat History
------------------------ */
async function loadChatHistory() {
  try {
    const res = await fetch("/api/chat", { credentials: "include" });
    const data = await res.json();
    messagesDiv.innerHTML = "";
    data.forEach((msg) =>
      renderMessage(msg, msg.sender?.name === currentUser?.name)
    );
  } catch (err) {
    console.error("Error loading chat history:", err);
  }
}

/* -----------------------
   Render Message
------------------------ */
function renderMessage(msg, isOwn = false) {
  const msgElem = document.createElement("div");
  msgElem.classList.add("chat-message");
  if (isOwn) msgElem.classList.add("own-message");

  const time = new Date(msg.createdAt || Date.now()).toLocaleTimeString();

  const profileSrc = msg.sender?.profilePic
    ? `/uploads/${msg.sender.profilePic}`
    : "/uploads/default.png";

  msgElem.innerHTML = `
    <img src="${profileSrc}" class="profile-pic" />
    <div class="message-content">
      <strong>${msg.sender?.name || "Anonymous"}:</strong>
      <p>${msg.content}</p>
      <span class="time">${time}</span>
    </div>
  `;

  messagesDiv.appendChild(msgElem);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* -----------------------
   Send Message
------------------------ */
sendBtn.addEventListener("click", () => {
  const msg = messageInput.value.trim();
  if (!msg || !currentUser) return;

  socket.emit("sendMessage", {
    content: msg,
    senderId: currentUser._id,
  });

  messageInput.value = "";
});

/* -----------------------
   Typing
------------------------ */
messageInput.addEventListener("input", () => {
  if (currentUser) socket.emit("typing", currentUser.name);
});
