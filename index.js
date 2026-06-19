const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const uri = `mongodb+srv://${process.env.MUHI}:${process.env.PASS}@cluster0.yvkvp7u.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const db = client.db("challenge_db");

    const challengeCollection = db.collection("challenges");
    const participantCollection = db.collection("participants");
    const tipsCollection = db.collection("tips");
    const eventsCollection = db.collection("events");

    app.get("/live-stats", async (req, res) => {
      try {
        const challenges = await challengeCollection.find().toArray();

        let totalParticipants = 0;
        let totalCO2Reduced = 0;
        let totalWaterLiterSaved = 0;

        challenges.forEach((challenge) => {
          totalParticipants += challenge.participants || 0;
          if (challenge.impactMetric == "kg CO2 reduced") {
            totalCO2Reduced += challenge.participants * 1;
          }
          if (challenge.impactMetric == "liters saved") {
            totalWaterLiterSaved += challenge.participants * 1;
          }
        });

        res.send({
          totalParticipants,
          totalCO2Reduced,
          totalWaterLiterSaved,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch live statistics" });
      }
    });

    app.get("/latest-tips", async (req, res) => {
      const result = await tipsCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(4)
        .toArray();
      res.send(result);
    });
    app.get("/featured-events", async (req, res) => {
      const result = await eventsCollection
        .find()
        .sort({ date: -1 })
        .limit(3)
        .toArray();
      res.send(result);
    });

    app.get("/challenges", async (req, res) => {
      const result = await challengeCollection.find().toArray();
      res.send(result);
    });
    app.get("/api/challenges/filter", async (req, res) => {
      const { category, startDate, endDate, minParticipants, maxParticipants } =
        req.query;

      const filter = {};
      if (category) {
        const categoryArray = category.split(",").map((c) => c.trim());
        filter.category = { $in: categoryArray };
      }
      if (startDate || endDate) {
        filter.$and = [];

        if (startDate) {
          filter.$and.push({
            endDate: { $gte: startDate },
          });
        }

        if (endDate) {
          filter.$and.push({
            startDate: { $lte: endDate },
          });
        }
      }

      if (minParticipants || maxParticipants) {
        filter.participants = {};
        if (minParticipants)
          filter.participants.$gte = parseInt(minParticipants);
        if (maxParticipants)
          filter.participants.$lte = parseInt(maxParticipants);
      }

      const result = await challengeCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/challenges", async (req, res) => {
      const data = req.body;
      const result = await challengeCollection.insertOne(data);
      res.send({
        result,
        success: true,
      });
    });
    app.get("/challenges/:id", async (req, res) => {
      const { id } = req.params;
      const result = await challengeCollection.findOne({
        _id: new ObjectId(id),
      });

      res.send({
        success: true,
        result,
      });
    });
    app.put("/challenges/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const update = {
        $set: data,
      };

      const result = await challengeCollection.updateOne(filter, update);

      res.send({
        success: true,
        result,
      });
    });
    app.delete("/challenges/:id", async (req, res) => {
      const { id } = req.params;
      const result = await challengeCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send({
        success: true,
        result,
      });
    });
    app.get("/my-added-challenges", async (req, res) => {
      const email = req.query.email;
      const result = await challengeCollection
        .find({ createdBy: email })
        .toArray();
      res.send(result);
    });
    app.post("/participants/:id", async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const result = await participantCollection.insertOne(data);
      const filter = { _id: new ObjectId(id) };
      const update = {
        $inc: {
          participants: 1,
        },
      };
      const participantCounted = await challengeCollection.updateOne(
        filter,
        update
      );
      res.send({ result, participantCounted });
    });

    app.get("/participants", async (req, res) => {
      const email = req.query.email;
      const result = await participantCollection
        .find({ participatedBy: email })
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app;
