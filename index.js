require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware 
app.use(cors())
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xdm7k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const database = client.db('ServiceDB');
        const serviceCollection = database.collection('services');
        const reviewCollection = database.collection('reviews');

        // service related api
        app.post('/addservice', async (req, res) => {
            const data = req.body;
            const result = await serviceCollection.insertOne(data);
            res.send(result);
        })

        app.get('/feature', async (req, res) => {
            const feature = await serviceCollection.find().sort({ price: -1 }).limit(6).toArray();
            res.send(feature);
        })

        app.get('/services', async (req, res) => {
            const services = await serviceCollection.find().toArray();
            res.send(services);
        })

        app.get('/service/details/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await serviceCollection.findOne(filter);
            res.send(result);
        })

        // review
        app.post('/service-review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);

            const id = review.service_id;
            const filter = { _id: new ObjectId(id) }
            const service = await serviceCollection.findOne(filter);
            let count;
            if (service.reviewCount) {
                count = service.reviewCount + 1;
            } else {
                count = 1;
            }
            const query = { _id: new ObjectId(id) }
            const updatedService = {
                $set: {
                    reviewCount: count
                }
            }
            const options = { upsert: true }
            const updatedResult = await serviceCollection.updateOne(query, updatedService, options);

            res.send(result);
        })

        app.get('/reviews', async (req, res) => {
            const id = req.query.id;
            const filter = { service_id: id }
            const result = await reviewCollection.find(filter).toArray();
            res.send(result)
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is Okkkkkay');
})

app.listen(port, (req, res) => {
    console.log(`server is running on ${port}`);
})