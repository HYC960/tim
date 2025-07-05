const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

let uploadedFileName = null;
let uploadedFileContent = null;
let imageClassification = null;

// Accepted file types
const imageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
const textTypes = [
  'text/plain',
  'text/html',
  'text/css',
  'application/javascript',
  'application/json',
  'text/x-python'
];

// Create file preview container
const filePreviewContainer = document.createElement('div');
filePreviewContainer.id = 'filePreviewContainer';
filePreviewContainer.style.display = 'none';
filePreviewContainer.className = 'file-preview';
document.body.appendChild(filePreviewContainer);

// 🖱️ Upload Button Click
uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

// 📂 Handle File Selection
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) handleFileUpload(file);
});

// 🚀 Drag and Drop Upload
window.addEventListener("dragover", (e) => {
  e.preventDefault();
});

window.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) handleFileUpload(file);
});

// 🧠 File Upload Handler (reusable)
async function handleFileUpload(file) {
  uploadedFileName = file.name;
  const fileType = file.type;
  filePreviewContainer.innerHTML = ''; // Reset

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✖';
  closeBtn.style.marginLeft = 'auto';
  closeBtn.style.background = 'transparent';
  closeBtn.style.color = '#fff';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '18px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    filePreviewContainer.style.display = 'none';
    uploadedFileName = null;
    uploadedFileContent = null;
    imageClassification = null;
  };

  // 🖼️ Show Image Preview
  if (imageTypes.includes(fileType)) {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Image = event.target.result;

      try {
        const classification = await classifyImageWithTogether(base64Image);
        imageClassification = classification;

        uploadedFileContent =
          `🖼️ Image uploaded: ${uploadedFileName}\n` +
          `🧠 Classification:\n${classification}`;

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        const name = document.createElement('span');
        name.textContent = uploadedFileName;

        filePreviewContainer.appendChild(img);
        filePreviewContainer.appendChild(name);
        filePreviewContainer.appendChild(closeBtn);
        filePreviewContainer.style.display = 'flex';

      } catch (err) {
        alert("❌ Image upload failed, please try again.");
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  }

  // 📄 Show Text File Preview
  else if (textTypes.includes(fileType)) {
    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedFileContent =
        `📄 Text file uploaded: ${uploadedFileName}\n` +
        `📄 Content:\n${event.target.result}`;

      const icon = document.createElement('i');
      icon.className = 'fas fa-file-code';
      const name = document.createElement('span');
      name.textContent = uploadedFileName;

      filePreviewContainer.appendChild(icon);
      filePreviewContainer.appendChild(name);
      filePreviewContainer.appendChild(closeBtn);
      filePreviewContainer.style.display = 'flex';
    };
    reader.readAsText(file);
  }

  // ❌ Unsupported File
  else {
    alert("⚠️ Unsupported file type selected.");
    filePreviewContainer.style.display = 'none';
  }
}

// 🧠 Classify Image with LLaMA Vision
async function classifyImageWithTogether(base64Image) {
  if (!base64Image) throw new Error("No image provided");

  const base64 = base64Image.split(',')[1];
  if (!base64) throw new Error("Invalid base64 image format");

  const requestPayload = {
    model: "meta-llama/Llama-Vision-Free",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `🧠 You are a **visual expert AI**. When a user uploads any image, analyze it carefully and respond with a clear and simple explanation.

1. 📝 What the image likely represents  
2. 👀 What is clearly visible  
3. 🔍 Notable features or themes

🎯 Be short, helpful, and easy to understand.`
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${base64}` }
          }
        ]
      }
    ],
    max_tokens: 300,
    temperature: 0.7
  };

  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 0e2ecc906d7eb82afad652ec41a6548fb7526421eea9bf6023d61bb55d936aae"
    },
    body: JSON.stringify(requestPayload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("API Error Details:", errorData);
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const msg = data.choices?.[0]?.message?.content;

  if (Array.isArray(msg)) {
    return msg.find(m => m.type === "text")?.text || "No text response found";
  }

  return msg?.trim() || "No classification found.";
}

// ✉️ Send Message With File Context
async function sendMessageToAI(userPrompt) {
  let finalPrompt = userPrompt;

  if (uploadedFileContent) {
    if (imageClassification) {
      finalPrompt =
        `🖼️ The user uploaded an image file named **${uploadedFileName}**.\n\n` +
        `👁️ Visual system analysis:\n${imageClassification}\n\n` +
        `🤖 Respond to the user's request using your own understanding.\n\n` +
        `🗣️ User prompt: ${userPrompt}`;
    } else {
      finalPrompt =
        `📄 The user uploaded a text file named **${uploadedFileName}**.\n\n` +
        `📂 File Content:\n${uploadedFileContent}\n\n` +
        `🤖 Please analyze and respond helpfully.\n\n` +
        `🗣️ User prompt: ${userPrompt}`;
    }
  }

  console.log("🧠 Final AI Prompt Sent:\n", finalPrompt);

  // Example:
  // await callYourAIModel(finalPrompt);
}
