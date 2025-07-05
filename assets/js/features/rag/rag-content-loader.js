import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.15.0';

const firebaseConfig = {
  apiKey: "AIzaSyC1D4HYiBVUgwwvVTm64mPWMj6WOthVhlw",
  authDomain: "chat.circleup.top",
  databaseURL: "https://e-commerce-6e5a1-default-rtdb.firebaseio.com",
  projectId: "e-commerce-6e5a1",
  storageBucket: "e-commerce-6e5a1.appspot.com",
  messagingSenderId: "964043622033",
  appId: "1:964043622033:web:c9e5ec4cbedc2936ad6130",
  measurementId: "G-L6JR3T4RJ5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let embedder = null;
let embeddedBookChunks = [];

async function initEmbedder() {
  try {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log("✅ Embedder Loaded");
  } catch (err) {
    console.error("❌ Failed to initialize embedder:", err);
  }
}

async function getUserEmail() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const email = user?.email?.replace(/\./g, "_");
    if (!email) throw new Error("Email missing or invalid");
    return email;
  } catch (err) {
    console.error("❌ Failed to get user email:", err);
    return null;
  }
}

async function loadAndEmbedVaultFiles() {
  const emailKey = await getUserEmail();
  if (!emailKey) return console.warn("⚠️ Email not found. Aborting load.");

  const filevaultRef = ref(db, `users/${emailKey}/filevault`);
  let snapshot;
  try {
    snapshot = await get(filevaultRef);
  } catch (err) {
    console.error("❌ Failed to fetch filevault data:", err);
    return;
  }

  if (!snapshot.exists()) {
    console.warn("⚠️ No files found in filevault.");
    return;
  }

  const vaultData = snapshot.val();

  if (typeof vaultData !== "object" || Object.keys(vaultData).length === 0) {
    console.warn("⚠️ filevault exists but contains no valid files.");
    alert("⚠️ File vault is empty or improperly formatted.");
    return;
  }

  embeddedBookChunks = [];
  let processed = 0;
  let skipped = 0;

  for (const fileName in vaultData) {
    console.groupCollapsed(`📄 Processing file: ${fileName}`);

    const isLikelyJson = fileName.endsWith(".json") || fileName.endsWith("_json");
    if (!isLikelyJson) {
      console.warn("⛔ Skipped (not a .json or _json file)");
      skipped++;
      console.groupEnd();
      continue;
    }

    const json = vaultData[fileName];
    if (typeof json !== "object") {
      console.warn("⛔ Skipped (invalid JSON structure)");
      skipped++;
      console.groupEnd();
      continue;
    }

    const entries = Object.keys(json).length > 0 && typeof Object.values(json)[0] === 'object'
      ? Object.values(json)
      : [json];

    for (const item of entries) {
      try {
        const text = item.text || item.content || "";
        const chapter = item.chapter || fileName;

        if (typeof text !== "string" || text.trim() === "") {
          console.warn("⚠️ Skipped (missing or empty text)");
          skipped++;
          continue;
        }

        const embedding = await embedder(text, { pooling: 'mean', normalize: true });
        embeddedBookChunks.push({ chunk: text, embedding: embedding.data, chapter });
        processed++;
        console.log("✅ Embedded successfully");

      } catch (err) {
        console.error(`❌ Error embedding content from "${fileName}":`, err);
        skipped++;
      }
    }

    console.groupEnd();
  }

  if (processed > 0) {
    console.log(`\n✅ Indexed ${processed} chunks from filevault`);
  } else {
    console.warn("⚠️ No valid chunks indexed from any file.")
  }

  if (skipped > 0) {
    console.warn(`⚠️ Skipped ${skipped} items (invalid, empty, or failed)`);
  }
}


function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

window.searchFromVault = async function (query, topK = 3, scoreThreshold = 0.5) {
  try {
    if (!embedder) await initEmbedder();
    if (embeddedBookChunks.length === 0) await loadAndEmbedVaultFiles();

    const queryEmbedding = await embedder(query, { pooling: 'mean', normalize: true });

    const scoredResults = embeddedBookChunks.map(entry => ({
      ...entry,
      score: cosineSimilarity(queryEmbedding.data, entry.embedding)
    }));

    scoredResults.sort((a, b) => b.score - a.score);

    const filteredResults = scoredResults.filter(entry => entry.score >= scoreThreshold);

    if (filteredResults.length === 0) {
      console.warn(`⚠️ No strong matches found (score ≥ ${scoreThreshold})`);
    }

    return filteredResults.slice(0, topK);

  } catch (err) {
    console.error("❌ searchFromVault failed:", err);
    return [];
  }
};
