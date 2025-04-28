const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');

// Middlewares
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://rahmatillaqobilov90:dilbek1233@cluster0.dnbhm7s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define Schema
const imageSchema = new mongoose.Schema({
    imageUrl: String,
    alt: String
});

const locationSchema = new mongoose.Schema({
    address: String,
    city: String,
    areaName: String,
    stateOrCounty: String,
    zip: String,
    country: String
});

const propertySchema = new mongoose.Schema({
    title: String,
    address: String,
    beds: Number,
    baths: Number,
    garage: Number,
    area: String,
    yearBuilt: Number,
    price: Number,
    pricePerMonth: Boolean,
    oldPrice: Number,
    description: String,
    details: String,
    documents: [String],
    location: locationSchema
});

const propertyDetailsSchema = new mongoose.Schema({
    propertyId: String,
    price: Number,
    propertySize: String,
    yearBuilt: String,
    bedrooms: Number,
    bathrooms: Number,
    garage: Number,
    garageSize: String,
    propertyType: String,
    propertyStatus: String
});

const reviewSchema = new mongoose.Schema({
    id: Number,
    name: String,
    date: String,
    rating: Number,
    reviewCount: Number,
    comment: String
});

const reviewSummarySchema = new mongoose.Schema({
    Cleanliness: Number,
    Communication: Number,
    'Check-in': Number,
    Accuracy: Number,
    Location: Number,
    Value: Number
});

const propertiesSchema = new mongoose.Schema({
    title: String,
    address: String,
    beds: Number,
    baths: Number,
    garage: Number,
    area: String,
    price: Number,
    oldPrice: Number,
    pricePerMonth: Boolean,
    status: String,
    featured: Boolean,
    imageUrl: String
});

// Asosiy schema
const ProductSchema = new mongoose.Schema({
    images: [imageSchema],
    property: propertySchema,
    propertyDetails: propertyDetailsSchema,
    features: [String],
    reviews: [reviewSchema],
    reviewSummary: reviewSummarySchema,
    properties: [propertiesSchema]
});


const UserSchema = new mongoose.Schema({
    phone: Number,
    username: String
});

// Create Model
const Product = mongoose.model('Product', ProductSchema);
const User = mongoose.model('User', UserSchema);

// CRUD Router yaratish funksiyasi
const createCRUDRoutes = (model, modelName) => {
    const router = express.Router();

    // Get All
    router.get('/', async (req, res) => {
        try {
            const items = await model.find();
            res.json(items);
        } catch (err) {
            console.error(`GET /${modelName.toLowerCase()} error:`, err.message);
            res.status(500).json({ message: err.message });
        }
    });

    // Get Single
    router.get('/:id', getItem(model, modelName), (req, res) => {
        res.json(res.item);
    });

    // Create New
    router.post('/', async (req, res) => {
        const item = new model(req.body);
        try {
            const newItem = await item.save();
            res.status(201).json(newItem);
        } catch (err) {
            console.error(`POST /${modelName.toLowerCase()} error:`, err.message);
            res.status(400).json({ message: err.message });
        }
    });

    // Update
    router.put('/:id', getItem(model, modelName), async (req, res) => {
        Object.assign(res.item, req.body);
        try {
            const updatedItem = await res.item.save();
            res.json(updatedItem);
        } catch (err) {
            console.error(`PUT /${modelName.toLowerCase()}/${req.params.id} error:`, err.message);
            res.status(400).json({ message: err.message });
        }
    });



    // Delete
    router.delete('/:id', getItem(model, modelName), async (req, res) => {
        try {
            await res.item.remove();
            res.json({ message: `${modelName} deleted` });
        } catch (err) {
            console.error(`DELETE /${modelName.toLowerCase()}/${req.params.id} error:`, err.message);
            res.status(500).json({ message: err.message });
        }
    });

    return router;
};

// Middleware: ID bo'yicha item olish
function getItem(model, modelName) {
    return async (req, res, next) => {
        let item;
        try {
            item = await model.findById(req.params.id);
            if (item == null) {
                return res.status(404).json({ message: `${modelName} not found` });
            }
        } catch (err) {
            console.error(`GET_ITEM /${modelName.toLowerCase()}/${req.params.id} error:`, err.message);
            return res.status(500).json({ message: err.message });
        }

        res.item = item;
        next();
    };
}

// Use Routes
app.use('/products', createCRUDRoutes(Product, 'Product'));
app.use('/users', createCRUDRoutes(User, 'User'));

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));