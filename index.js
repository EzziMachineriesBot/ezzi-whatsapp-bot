const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// ✅ Webhook verification route for Meta
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("WEBHOOK_VERIFIED");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ POST webhook for incoming messages
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object && body.entry && body.entry[0].changes[0].value.messages) {
    const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
    const from = body.entry[0].changes[0].value.messages[0].from;
    const msg_body = body.entry[0].changes[0].value.messages[0].text.body;

    // ✅ Send message to Dialogflow
    const dialogflowResponse = await axios.post(
      https://dialogflow.googleapis.com/v2/projects/${process.env.DIALOGFLOW_PROJECT_ID}/agent/sessions/${from}:detectIntent,
      {
        queryInput: {
          text: {
            text: msg_body,
            languageCode: "en",
          },
        },
      },
      {
        headers: {
          Authorization: Bearer ${process.env.DIALOGFLOW_ACCESS_TOKEN},
        },
      }
    );

    const reply = dialogflowResponse.data.queryResult.fulfillmentText;

    // ✅ Send reply via WhatsApp
    await axios.post(
      https://graph.facebook.com/v18.0/${phone_number_id}/messages,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply },
      },
      {
        headers: {
          Authorization: Bearer ${process.env.WHATSAPP_TOKEN},
          "Content-Type": "application/json",
        },
      }
    );
  }

  res.sendStatus(200);
});

// ✅ Home Route
app.get("/", (req, res) => {
  res.send("Ezzi WhatsApp Bot is Live 🚀");
});

app.listen(port, () => {
  console.log(Server is running on port ${port});
});
