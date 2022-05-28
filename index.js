const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
app.use(cors());

//-------------------------------------------------------------------------------------//
//connect MongoDB
//-------------------------------------------------------------------------------------//
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.8cxxi.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//-------------------------------------------------------------------------------------//
//Verify JWT TOKEN CRESTED
//-------------------------------------------------------------------------------------//

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      console.log(err);
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

//-------------------------------------------------------------------------------------//
//RUN FUNCTION
//-------------------------------------------------------------------------------------//
async function run() {
  try {
    await client.connect();
    const partsCollection = client.db("goodies").collection("parts");
    const reviewsCollection = client.db("goodies").collection("reviews");
    const userCollection = client.db("goodies").collection("users");
    const orderCollection = client.db("goodies").collection("orders");
    //-------------------------------------------------------------------------------------//
    // Verify Admin
    //-------------------------------------------------------------------------------------//

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    //-------------------------------------------------------------------------------------//
    /*-------------------------------- POST API CALL ---------------------------------------*/
    //-------------------------------------------------------------------------------------//

    /*-------------------------------- POST REVIEW ---------------------------------------*/
    app.post("/reviews", verifyJWT, async (req, res) => {
      const newReview = req.body;
      const result = await reviewsCollection.insertOne(newReview);
      res.send(result);
    });

    app.post("/orders", verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    /*-------------------------------- POST PARTS ---------------------------------------*/
    app.post("/parts", verifyJWT, verifyAdmin, async (req, res) => {
      const newReview = req.body;
      const result = await partsCollection.insertOne(newReview);
      res.send(result);
    });

    //-------------------------------------------------------------------------------------//
    /*-------------------------------- PUT API CALL ---------------------------------------*/
    //-------------------------------------------------------------------------------------//

    /*-------------------------------- USERS API CALL ---------------------------------------*/

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "10h" }
      );
      res.send({ result, token });
    });

    /*-------------------------------- MAKE A ADMIN USER ---------------------------------------*/

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    /*-------------------------------- Update User ---------------------------------------*/

    app.put("/user/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          img: updateData.img,
          location: updateData.location,
          phoneNumber: updateData.phoneNumber,
        },
      };
      const result = await userCollection.updateMany(filter, updateDoc, option);
      res.send(result);
    });

    //-------------------------------------------------------------------------------------//
    /*-------------------------------- DELETE API CALL ---------------------------------------*/
    //-------------------------------------------------------------------------------------//

    app.delete("/parts/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params._id;
      const filter = { id: id };
      const result = await partsCollection.deleteOne(filter);
      res.send(result);
    });

    app.delete("/orders/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params._id;
      const filter = { id: id };
      const result = await orderCollection.deleteOne(filter);
      res.send(result);
    });

    app.delete("/user/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });

    //-------------------------------------------------------------------------------------//
    /*-------------------------------- GET API CALL ---------------------------------------*/
    //-------------------------------------------------------------------------------------//

    //-------------------------------------------------------------------------------------//
    // GET USER
    // Can Not Get User.. Use Verify JWT
    //-------------------------------------------------------------------------------------//

    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });
    //-------------------------------------------------------------------------------------//
    //Get Motor Bike Accessories PartsCollection
    //-------------------------------------------------------------------------------------//

    app.get("/parts", async (req, res) => {
      const query = {};
      const cursor = partsCollection.find(query);
      const parts = await cursor.toArray();
      res.send(parts);
    });
    //-------------------------------------------------------------------------------------//
    //Get Parts specific by id
    //-------------------------------------------------------------------------------------//
    app.get("/parts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const parts = await partsCollection.findOne(query);
      res.send(parts);
    });
    //-------------------------------------------------------------------------------------//
    //Get Reviews
    //-------------------------------------------------------------------------------------//

    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    });

    //-------------------------------------------------------------------------------------//
    //Get Order
    //-------------------------------------------------------------------------------------//

    app.get("/orders", async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    app.get("/orders", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.query.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      } else {
        res.status(403).send({ message: "forbidden access" });
      }
    });
  } finally {
  }
}

//-------------------------------------------------------------------------------------//
//  FUNCTION CALL
//-------------------------------------------------------------------------------------//

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`<h1>HELLO GOODIES SERVER WORLD!!!!!</h1>`);
});

app.listen(port, () => {
  console.log("listening on port", port);
});
