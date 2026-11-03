import "dotenv/config";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 1. Instantiate the client globally ONE TIME to generate the connection pool
const client = new MongoClient(
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.oko4eb5.mongodb.net/`,
);

// Variables exposed globally for your API routes to share
let database;
let resumesColl;

// 2. Wrap initialization in an async function to maintain recommended startup order
async function startServer() {
  try {
    // Connect once and let the pool manage connections implicitly
    await client.connect();
    console.log("Successfully connected to MongoDB Cluster.");

    // Select the DB and Collection target from the client pool
    database = client.db("resumecatCloneDB");
    resumesColl = database.collection("resumes");

    // 3. ONLY start listening for HTTP traffic once the database is secure
    app.listen(port, () => {
      console.log(`Express server running cleanly on port ${port}`);
    });
  } catch (err) {
    console.error(
      "Critical Failure: Could not connect to MongoDB on startup!",
      err,
    );
    process.exit(1); // Safely terminate the broken app immediately
  }
}

// Kick off the application Lifecycle
startServer();

// ---------------------------------------------------------
// ROUTES (Reusing the open global pool)
// ---------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/resumes", async (req, res) => {
  try {
    const allResumes = await resumesColl.find({}).toArray();
    res.json(allResumes);
  } catch (err) {
    console.error("Database Query Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------------------------------------
// GRACEFUL SHUTDOWN (The ONLY place client.close() is allowed)
// ---------------------------------------------------------
process.on("SIGINT", async () => {
  console.log("\nShutting down application cleanly...");
  try {
    await client.close(); // Cleanly destroys the connection pool pools upon app exit
    console.log("MongoDB pool closed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error during database disconnection:", err);
    process.exit(1);
  }
});
