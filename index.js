// index.js

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const { GoogleAuth } = require("google-auth-library");

const app = express();
app.use(bodyParser.json());

// 🔒 Use the path of your uploaded secret file on Render
const GOOGLE_KEY_FILE = "/etc/secrets/ezzimachineries-mscw-697bf82feaf1.json";

// 📌 Your Dialogflow project ID
const PROJECT_ID = "your-dialogflow-project-id";

// 📌 Your WhatsApp Cloud API Info (from Meta Developer Portal)
const WHATSAPP_TOKEN = "your-meta-permanent-access-token"; // Not temporary test token
const PHONE_NUMBER_ID = "your-phone-number-id"; // From WhatsApp app setup

// 🔐 Function to get Dialogflow access token using service account
async function getDialogflowAccessToken() {
  const auth = new GoogleAuth({
    keyFile: GOOGLE_KEY_FILE,
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
}

// 📬 Incoming WhatsApp Webhook Endpoint
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200); // No new messages
    }

    const userText = message.text.body;
    const from = message.from; // WhatsApp user phone number
    const sessionId = from; // Use phone number as session ID

    console.log("📥 Received message:", userText);

    // 🧠 Get Dialogflow Access Token
    const dfToken = await getDialogflowAccessToken();

    // 💬 Send message to Dialogflow
    const dfRes = await axios.post(
      https://dialogflow.googleapis.com/v2/projects/${PROJECT_ID}/agent/sessions/${sessionId}:detectIntent,
      {
        queryInput: {
          text: {
            text: userText,
            languageCode: "en",
          },
        },
      },
      {
        headers: {
          Authorization: Bearer ${dfToken},
        },
      }
    );

    const reply = dfRes.data.queryResult.fulfillmentText;
    console.log("🤖 Dialogflow replied:", reply);

    // 📤 Send reply back via WhatsApp API
    await axios.post(
      https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages,
      {
        messaging_product: "whatsapp",
        to: from,
        text: {
          body: reply,
        },
      },
      {
        headers: {
          Authorization: Bearer ${WHATSAPP_TOKEN},
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Sent reply to user.");
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error in webhook:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// 🌐 Webhook Verification (for Meta setup)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = "your-verify-token"; // Same one you added in Meta
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("🔐 Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(🚀 Server is running on port ${PORT});
});
