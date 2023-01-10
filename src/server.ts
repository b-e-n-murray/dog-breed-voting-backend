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

app.patch("/dogs/breed/vote", async (req, res) => {
  const { breedname } = req.body;
  console.log(breedname);
  const score = 1;
  try {
    const text = "update votes set score = score+$2 where breedname = $1";
    const values = [breedname, score];
    const response = await client.query(text, values);
    res.status(200).json({
      status: "success",
      data: response.rows,
    });
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

//one use function to initially add all breed names into database
const addBreedNamesToDB = async (breedNames: namesI) => {
  const breedNamesArr: string[] = [];
  for (const key of Object.keys(breedNames.message)) {
    const subBreeds = breedNames.message[key];
    if (subBreeds.length === 0) {
      //[] | ["german"]
      breedNamesArr.push(key);
    } else {
      for (const name of subBreeds) {
        breedNamesArr.push(`${key}/${name}`);
      }
    }
  }
  const text = "insert into votes (breedName) values ($1) returning *";
  for (const name of breedNamesArr) {
    const response = await client.query(text, [name]);
    console.log(response);
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
