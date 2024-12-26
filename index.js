require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware 
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
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

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    console.log(token);

    if (!token) {
        return res.status(401).send({ message: 'Unauthorized user' });
    }
    jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized user' });
        }
        req.user = decoded;
        next();
    })

}

async function run() {
    try {
        // https://assignment-eleven-server-amber.vercel.app/
        // Connect the client to the server	(optional starting in v4.7)

        const database = client.db('ServiceDB');
        const serviceCollection = database.collection('services');
        const reviewCollection = database.collection('reviews');

        // jwt related api
        app.post('/jwt/login', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '24h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: false
            }).send({ success: true })
        })

        app.post('/jwt/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: false
            }).send({ message: 'cookie cleared' })
        })

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

        app.get('/myservice', verifyToken, async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const result = await serviceCollection.find(filter).toArray();

            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'Forbiden access' });
            }

            res.send(result);
        })

        app.delete('/myservice/delete', async (req, res) => {
            const id = req.query.id;
            const filter = { _id: new ObjectId(id) }
            const result = await serviceCollection.deleteOne(filter);
            res.send(result)
        })

        app.put('/myservice/update', async (req, res) => {
            const id = req.query.id;
            const update = req.body;
            const updatedService = {
                $set: {
                    title: update.title,
                    image: update.image,
                    website: update.website,
                    companyName: update.companyName,
                    price: update.price,
                    description: update.description,
                    category: update.category
                }
            }
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const result = await serviceCollection.updateOne(filter, updatedService, options)
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

        app.get('/myreview', verifyToken, async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const result = await reviewCollection.find(filter).toArray();

            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'Forbiden access' });
            }

            res.send(result)
        })

        app.get('/review', async (req, res) => {
            const id = req.query.id;
            const filter = { _id: new ObjectId(id) };
            const result = await reviewCollection.findOne(filter)
            res.send(result);
        })

        app.delete('/myreview/delete', async (req, res) => {
            const id = req.query.id;
            const filter = { _id: new ObjectId(id) };
            const result = await reviewCollection.deleteOne(filter);
            res.send(result);
        })

        app.put('/myreview/update', async (req, res) => {
            const id = req.query.id;
            const update = req.body;
            const updateReview = {
                $set: {
                    rating: update.rating,
                    review: update.review
                }
            }
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const result = await reviewCollection.updateOne(filter, updateReview, options);
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