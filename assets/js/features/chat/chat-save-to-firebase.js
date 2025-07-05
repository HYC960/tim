import { db, ref, set, update, remove } from "../../core/firebase-config.js";

// 🔐 Get logged in user email
const user = JSON.parse(sessionStorage.getItem("user"));
const userEmail = user?.email?.replace(/\./g, "_") || "anonymous";

// 🔁 Initialize session variables
let sessionId = sessionStorage.getItem("sessionId");
let sessionName = sessionStorage.getItem("sessionName");
let messageCount = Number(sessionStorage.getItem("messageCount") || 0);
let pendingNameUpdate = false;

// ✅ Helper to generate meaningful chat names
function generateChatName(userMsg = "", aiMsg = "") {
  const getMeaningfulWords = (text, maxWords = 3) => {
    if (!text) return "";
    return text
      .replace(/\n/g, " ")
      .replace(/[^\w\s]/g, "")
      .split(" ")
      .filter(word => word.length > 3)
      .slice(0, maxWords)
      .join(" ");
  };

  const userPart = getMeaningfulWords(userMsg);
  const aiPart = getMeaningfulWords(aiMsg);

  if (userPart && aiPart) return `${userPart} - ${aiPart}`.slice(0, 60);
  if (userPart) return userPart.slice(0, 60);
  if (aiPart) return aiPart.slice(0, 60);
  return "New Chat";
}

// 💾 Create a new session with proper initialization
export function createNewSession() {
  // Generate a unique session ID
  const timestamp = Date.now();
  const sessionId = `sess_${timestamp}`;
  
  // Reset session storage
  sessionStorage.setItem("sessionId", sessionId);
  sessionStorage.setItem("sessionName", "New Chat");
  sessionStorage.setItem("messageCount", "0");
  
  // Initialize metadata in Firebase
  const sessionRef = ref(db, `users/${userEmail}/${sessionId}`);
  set(sessionRef, {
    metadata: {
      name: "New Chat",
      created: timestamp,
      lastUpdated: timestamp
    }
  });
  
  return sessionId;
}

// ✏️ Update session name in both storage and Firebase
async function updateSessionName(name) {
  if (!sessionId) return;
  
  // Update local storage
  sessionName = name;
  sessionStorage.setItem("sessionName", name);
  
  // Update Firebase metadata
  const metadataRef = ref(db, `users/${userEmail}/${sessionId}/metadata`);
  try {
    await update(metadataRef, {
      name: name,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error("Error updating session name:", error);
  }
}

// ✅ Override conversationHistory.push with proper session handling
const originalPush = window.conversationHistory.push;
window.conversationHistory.push = async function (...args) {
  const result = originalPush.apply(this, args);
  const latestMsg = args[0];

  if (!latestMsg?.role || !latestMsg?.content) return result;

  // Create new session if none exists
  if (!sessionId) {
    sessionId = createNewSession();
  }

  // Get current message index
  const msgIndex = messageCount;
  messageCount++;
  sessionStorage.setItem("messageCount", messageCount);

  // Save message to Firebase
  const messageRef = ref(db, `users/${userEmail}/${sessionId}/messages/${msgIndex}`);
  await set(messageRef, {
    role: latestMsg.role,
    content: latestMsg.content,
    timestamp: Date.now()
  });

  // Handle session naming logic
  if (!pendingNameUpdate && latestMsg.role === "user") {
    // Flag that we're expecting an AI response to name the chat
    pendingNameUpdate = true;
  } else if (pendingNameUpdate && latestMsg.role === "assistant") {
    // Get the last two messages for naming
    const messages = window.conversationHistory.slice(-2);
    const userMsg = messages.find(m => m.role === "user")?.content || "";
    const aiMsg = messages.find(m => m.role === "assistant")?.content || "";
    
    // Generate and update session name
    const newName = generateChatName(userMsg, aiMsg);
    await updateSessionName(newName);
    pendingNameUpdate = false;
  }

  return result;
};

// 🆕 Initialize session on load
if (!sessionId) {
  sessionId = createNewSession();
} else {
  // Update existing session metadata
  updateSessionName(sessionName || "New Chat");
}

// 💬 Export function for creating new chats
export function startNewChat() {
  // Clear current conversation
  window.conversationHistory = [];
  pendingNameUpdate = false;
  
  // Create new session
  return createNewSession();
}