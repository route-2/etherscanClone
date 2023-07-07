import express, { Request, Response, Application } from "express";
import { MongoClient } from "mongodb";

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import cors from "cors";
import { ethers } from "ethers";
// import routes

dotenv.config();

const app = express();
const PORT = process.env.PORT;
app.use(express.json());
const provider = new ethers.providers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/01d39543d4884207bdccff4e64f5c7ee"
);
app.use(cors());

const client = new MongoClient(process.env.MONGO_URL!);

async function storeBlock(): Promise<void> {
  try {
    const latestBlock = await provider.getBlockNumber();
    const db = client.db("blocksData");
    const blocksData = db.collection("blocks"); 

    const lastStoredBlock = await blocksData.findOne(
      {},
      { sort: { number: -1 } }
    );
   

    let startBlockNumber = lastStoredBlock ? lastStoredBlock.number + 1 : latestBlock;
    console.log("startBlockNumber", startBlockNumber);
    for (let i = startBlockNumber; i <= latestBlock; i++) {
      const block = await provider.getBlock(i);
      const existingBlock = await blocksData.findOne({ number: block.number });
      if (existingBlock) {
        console.log(`Block ${block.number} already exists in the database.`);
        continue; 
      }

      const blockData = {
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        nonce: block.nonce,
        difficulty: block.difficulty,
        gasLimit: block.gasLimit,
        gasUsed: block.gasUsed,
      };

      await blocksData.insertOne(blockData);
      console.log("Blocks stored successfully.", blockData);
    }
  
  } catch (error) {
    console.error("Error while storing block:", error);
  }

  setTimeout(storeBlock, 10000);
}

app.post("/", async (req: Request, res: Response) => {
  try {
    await storeBlock();
    res.status(200).json({ message: "Block numbers storage initiated." });
  } catch (error) {
    console.error("Error starting block numbers storage:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/block", async (req: Request, res: Response) => {
  try {
    const db = client.db("blocksData");
    const blocks = db.collection("blocks");
    const getBlockDetails = await blocks.find().toArray();
    res.status(200).json(
      getBlockDetails.map((block) => ({
        number: block.number,
        blockHash: block.hash,
        timestamp: block.timestamp,
        nonce: block.nonce,
        difficulty: block.difficulty,
        gasLimit: block.gasLimit,
        gasUsed: block.gasUsed,
      }))
    );
  } catch (error) {
    console.error("Error getting block numbers:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/block/:blockNumber", async (req: Request, res: Response) => {
  try {
    const db = client.db("blocksData");
    const blocks = db.collection("blocks");
    const getBlockDetails = await blocks.findOne({
      number: parseInt(req.params.blockNumber),
    });
    if (getBlockDetails)
      res.status(200).json({
        number: getBlockDetails.number,
        blockHash: getBlockDetails.hash,
        timestamp: getBlockDetails.timestamp,
        nonce: getBlockDetails.nonce,
        difficulty: getBlockDetails.difficulty,
        gasLimit: getBlockDetails.gasLimit,
        gasUsed: getBlockDetails.gasUsed,
      });
    else
      res.status(404).json({
        message: "Block not found",
      });
  } catch (error) {
    console.error("Error getting block numbers:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.delete("/block/:blockNumber", async (req: Request, res: Response) => {
  try {
    const db = client.db("blocksData");
    const blocks = db.collection("blocks");
    const getBlockDetails = await blocks.deleteOne({
      number: parseInt(req.params.blockNumber),
    });
    if (getBlockDetails)
      res.status(200).json({
        message: "Block deleted successfully",
      });
    else
      res.status(404).json({
        message: "Block not found",
      });
  } catch (error) {
    console.error("Error getting block numbers:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.delete("/all", async (req: Request, res: Response) => {
  try {
    const db = client.db("blocksData");
    const blocks = db.collection("blocks");

    const getBlockDetails = await blocks.deleteMany({});
    if (getBlockDetails)
      res.status(200).json({
        message: "All blocks deleted successfully",
      });
    else
      res.status(404).json({
        message: "Block not found",
      });
  } catch (error) {
    console.error("Error getting block numbers:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.MONGO_URL!)
  .then(() => {
    console.log(`Connected ----> ${PORT}`);
   setTimeout(
        async () => {
            await storeBlock();
            }
        , 10000
   )
    app.listen(PORT);
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });