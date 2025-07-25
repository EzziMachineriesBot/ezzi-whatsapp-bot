const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(bodyParser.json());

const PROJECT_ID = process.env.PROJECT_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const PORT = process.env.PORT || 3000;

// 📌 Step 1: Get Google access token
async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: '/etc/secrets/ezzimachineries-mscw-697bf82feaf1.json', // ✅ your Render secret file
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

// 📌 Step 2: Send user message to Dialogflow
async function sendToDialogflow(message, sessionId) {
  const accessToken = await getAccessToken();

  const dialogflowUrl = https://dialogflow.googleapis.com/v2/projects/${PROJECT_ID}/agent/sessions/${sessionId}:detectIntent;

  const response = await axios.post(dialogflowUrl, {
    queryInput: {
      text: {
        text: message,
        languageCode: 'en-US',
      },
    },
  }, {
    headers: {
      Authorization: Bearer ${accessToken},
    },
  });

  return response.data.queryResult.fulfillmentText;
}

// 📌 Step 3: Send message back to user on WhatsApp
async function sendMessageToWhatsApp(recipient, message) {
  const url = https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages;

  await axios.post(url, {
    messaging_product: 'whatsapp',
    to: recipient,
    text: {
      body: message,
    },
  }, {
    headers: {
      Authorization: Bearer ${WHATSAPP_TOKEN},
      'Content-Type': 'application/json',
    },
  });
}

// 📌 Step 4: Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messageData = changes?.value?.messages?.[0];

    if (messageData && messageData.type === 'text') {
      const userMessage = messageData.text.body;
      const senderNumber = messageData.from;
      const sessionId = senderNumber;

      const dfReply = await sendToDialogflow(userMessage, sessionId);
      await sendMessageToWhatsApp(senderNumber, dfReply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// 📌 Step 5: Webhook verification (for Meta)
app.get('/webhook', (req, res) => {
  const verifyToken = 'ezzi-whatsapp-bot'; // You must match this in WhatsApp cloud setup
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook Verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.listen(PORT, () => {
  console.log(✅ Server listening on port ${PORT});
});
