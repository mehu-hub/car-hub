const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require('mongodb').ObjectId;

require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const run = async () => {
  try {
    const uri = `mongodb+srv://carResale:D1014xz9CyKe7Kv3@cluster0.lfqifm1.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: ServerApiVersion.v1,
    });

    const carsCollection = client.db("carResale").collection("allCars");

    // updateMany(
    //   { currentDate: true },
    //   {
    //     $set: {
    //       curentDate: new Date()
    //     }
    //   }
    // )

    const bookingsCollection = client.db("carResale").collection("bookings");
    const usersCollection = client.db("carResale").collection("users");

    const productCollection = client.db("carResale").collection("product");

    console.log('db connected');
    app.get('/allCars', async (req, res) => {
      const query = {};
      const cursor = carsCollection.find(query);
      const cars = await cursor.toArray();
      res.send(cars);
  });

    app.get("/allCars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const car = await carsCollection.findOne(query);
      res.send(car);
    });

    app.get("/bookings",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    });

    //allCarsSpecialty

    app.get("/allCarsSpecialty", async (req, res) => {
      const query = {};
      const result = await carsCollection
        .find(query)
        .project({ name: 1 })
        .toArray();
      res.send(result);
    });

    // POST
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const query = {
        carName: booking.carName,
        email: booking.email,
      };
      const alreadyBooked = await bookingsCollection.find(query).toArray();
      if (alreadyBooked.length) {
        const message = `You Already have a Booked ${booking.carName}`;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    //Delete
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    //JWT
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);
        return res.send({ accessToken:token});
      }
      res.status(403).send({ accessToken:""});
    });

    //Users
    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.post('/users', async (req, res) => {
const user = req.body;
const result = await usersCollection.insertOne(user)
res.send(result)
  })

    app.put('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
          const filter = { email: email };
          const updateDoc = {
              $set: { role: 'admin' },
          };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.send(result)
      } else {
          res.status(403).send({ message: 'forbidden' })
      }

  })

    //add product
    app.put("/allCars", async (req, res) => {
      const product = req.body;
      const filter = { _id: ObjectId(product.categorie) };
      const options = { upsert: true };
      const updatedDoc = {
        $push: {
          allcar: product,
        },
      };
      const result = await carsCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //seller
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "Seller" });
    });

    // user delete
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // my product
    app.post('/product', async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    })

    app.get('/product', async (req, res) => {
      const query = {};
      const options = await productCollection.find(query).toArray();
      res.send(options);
    })
  } finally {
  }
};
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("car factory server is running");
});

app.listen(port, () => {
  console.log(port);
});
