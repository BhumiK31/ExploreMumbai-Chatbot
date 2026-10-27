
require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { SessionsClient } = require("@google-cloud/dialogflow");

const app = express();
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const port = process.env.PORT || 3000;

if (!projectId) {
  throw new Error("Missing GOOGLE_CLOUD_PROJECT in .env");
}

const sessionsClient = new SessionsClient();

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    // Use a session ID to maintain Dialogflow conversation context.
    // For a production multi-user app, persist a separate session ID
    // for each visitor instead of creating a new one per message.
    const sessionId = crypto.randomUUID();
    const session = sessionsClient.projectAgentSessionPath(
      projectId,
      sessionId
    );

    const [result] = await sessionsClient.detectIntent({
      session,
      queryInput: {
        text: {
          text: message.trim(),
          languageCode: "en"
        }
      }
    });

    const queryResult = result.queryResult;
    const reply = queryResult?.fulfillmentText ||
      "Sorry, I couldn't find an answer. Try asking about Mumbai places, food, beaches, or weekend plans.";

    res.json({
      reply,
      intent: queryResult?.intent?.displayName || "Unknown"
    });
  } catch (error) {
    console.error("Dialogflow API error:", error.message);
    res.status(500).json({
      error: "Couldn't contact Dialogflow. Check your project, API access, and authentication."
    });
  }
});

app.listen(port, () => {
  console.log(`Explore Mumbai is running at http://localhost:${port}`);
});
