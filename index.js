const express = require("express");
const axios = require("axios");
require("dotenv").config();
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const userMessage = req.body.message?.text?.body;
  const phone = req.body.contacts?.[0]?.wa_id;

  if (!userMessage || !phone) return res.sendStatus(400);

  // Dialogflow API Call
  const dialogflowRes = await axios.post(
    `https://dialogflow.googleapis.com/v2/projects/${process.env.DF_PROJECT_ID}/agent/sessions/${phone}:detectIntent`,
    {
      queryInput: {
        text: { text: userMessage, languageCode: "en" },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DF_TOKEN}`,
      },
    }
  );

  const botReply =
    dialogflowRes.data.queryResult.fulfillmentText || "Sorry, try again.";

  // WhatsApp Reply
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WA_PHONE_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: phone,
      text: { body: botReply },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WA_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("WhatsApp bot is live!");
});

app.listen(process.env.PORT || 3000);