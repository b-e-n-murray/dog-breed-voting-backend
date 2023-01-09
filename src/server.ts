import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Client } from "pg";
import { getEnvVarOrFail } from "./support/envVarUtils";
import { setupDBClientConfig } from "./support/setupDBClientConfig";

// api link https://dog.ceo/api/breeds/list/all

dotenv.config();
const dbClientConfig = setupDBClientConfig();
const client = new Client(dbClientConfig);

//Configure express routes
const app = express();

app.use(express.json()); //add JSON body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

app.post("/breeds/newNames", async (req, res) => {
  const breedNames = req.body;
  try {
    await addBreedNamesToDB(breedNames);
    res.send("names added to db");
  } catch (err) {
    console.error(err, "failed");
  }
});

app.get("/", async (req, res) => {
  res.json({ msg: "Hello! There's nothing interesting for GET /" });
});

app.get("/health-check", async (req, res) => {
  try {
    //For this to be successful, must connect to db
    await client.query("select now()");
    res.status(200).send("system ok");
  } catch (error) {
    //Recover from error rather than letting system halt
    console.error(error);
    res.status(500).send("An error occurred. Check server logs.");
  }
});

app.get("/dogs/breeds", async (req, res) => {
  try {
    const text = "select * from votes";
    const response = await client.query(text);
    // res.status(200).json({
    //   status: "success",
    //   data: response.rows
    // })
    res.status(200).send(response.rows);
  } catch (err) {
    console.error(err);
  }
});

app.get("/dogs/leaderboard", async (req, res) => {
  try {
    const text = "select * from votes order by score desc limit 10";
    const response = await client.query(text);
    res.status(200).send(response.rows);
  } catch (err) {
    console.error(err);
  }
});

app.patch("dogs/breed/vote", async (req, res) => {
  const { breedName } = req.body;
  try {
    const text = "update votes set score = score+1 where breedname = $1";
    const values = [breedName];
    const response = await client.query(text, values);
    res.status(200).send(response.rows);
  } catch (err) {
    console.error(err);
  }
});

//adding all dog breed names to the db using API
interface namesI {
  message: nameListI;
}
interface nameListI {
  [breedName: string]: string[];
}

const addBreedNamesToDB = async (breedNames: namesI) => {
  try {
    const dogNamesArray = Object.keys(breedNames.message);
    const dogSubNamesArray = Object.values(breedNames.message);
    const filteredDogArray = dogSubNamesArray.filter(
      (nameAr) => nameAr.length > 0
    );
    for (const item of filteredDogArray) {
      for (const arrayItem of item) {
        dogNamesArray.push(arrayItem);
      }
    }
    console.log(dogNamesArray);
    const text = "insert into votes (breedName) values ($1) returning *";
    for (const name of dogNamesArray) {
      const response = await client.query(text, [name]);
      console.log(response);
    }
  } catch (err) {
    console.error(err);
  }
};

connectToDBAndStartListening();

async function connectToDBAndStartListening() {
  console.log("Attempting to connect to db");
  await client.connect();
  console.log("Connected to db!");

  const port = getEnvVarOrFail("PORT");
  app.listen(port, () => {
    console.log(
      `Server started listening for HTTP requests on port ${port}.  Let's go!`
    );
  });
}
