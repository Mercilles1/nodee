const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');

// Middlewares
app.use(cors());
app.use(express.json());

// Enable MongoDB debugging
mongoose.set('debug', true);
mongoose.set('bufferCommands', false);

// Connection configuration
const MONGODB_URI = "mongodb+srv://rahmatillaqobilov90:dilbek1233@cluster0.dnbhm7s.mongodb.net/yourDatabaseName?retryWrites=true&w=majority";

// Connect to MongoDB with enhanced options
const connectWithRetry = () => {
  console.log('Attempting MongoDB connection...');
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,  // 30 seconds
    socketTimeoutMS: 45000,          // 45 seconds
    maxPoolSize: 10,                 // Maximum number of connections
    retryWrites: true,
    retryReads: true
  })
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

// Initial connection attempt
connectWithRetry();

// Event listeners for connection
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Close connection on process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed due to app termination');
  process.exit(0);
});

// Define Schemas
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

// Main schemas
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

// Create Models
const Product = mongoose.model('Product', ProductSchema);
const User = mongoose.model('User', UserSchema);

// CRUD Router factory function
const createCRUDRoutes = (model, modelName) => {
  const router = express.Router();

  // Get All
  router.get('/', async (req, res) => {
    try {
      if (!mongoose.connection.readyState) {
        return res.status(503).json({ message: 'Database not connected' });
      }
      const items = await model.find().maxTimeMS(20000); // 20 second timeout
      res.json(items);
    } catch (err) {
      console.error(`GET /${modelName.toLowerCase()} error:`, err.message);
      res.status(500).json({ 
        message: err.message,
        suggestion: 'Check database connection and try again'
      });
    }
  });

  // Get Single
  router.get('/:id', getItem(model, modelName), (req, res) => {
    res.json(res.item);
  });

  // Create New
  router.post('/', async (req, res) => {
    try {
      if (!mongoose.connection.readyState) {
        return res.status(503).json({ message: 'Database not connected' });
      }
      const item = new model(req.body);
      const newItem = await item.save();
      res.status(201).json(newItem);
    } catch (err) {
      console.error(`POST /${modelName.toLowerCase()} error:`, err.message);
      res.status(400).json({ 
        message: err.message,
        details: 'Validation failed or duplicate key'
      });
    }
  });

  // Update
  router.put('/:id', getItem(model, modelName), async (req, res) => {
    try {
      Object.assign(res.item, req.body);
      const updatedItem = await res.item.save();
      res.json(updatedItem);
    } catch (err) {
      console.error(`PUT /${modelName.toLowerCase()}/${req.params.id} error:`, err.message);
      res.status(400).json({ 
        message: err.message,
        details: 'Validation failed or invalid update'
      });
    }
  });

  // Delete
  router.delete('/:id', getItem(model, modelName), async (req, res) => {
    try {
      await res.item.deleteOne();
      res.json({ message: `${modelName} deleted successfully` });
    } catch (err) {
      console.error(`DELETE /${modelName.toLowerCase()}/${req.params.id} error:`, err.message);
      res.status(500).json({ 
        message: err.message,
        details: 'Deletion failed due to server error'
      });
    }
  });

  return router;
};

// Middleware: Get item by ID
function getItem(model, modelName) {
  return async (req, res, next) => {
    if (!mongoose.connection.readyState) {
      return res.status(503).json({ message: 'Database not connected' });
    }

    let item;
    try {
      item = await model.findById(req.params.id).maxTimeMS(15000);
      if (!item) {
        return res.status(404).json({ 
          message: `${modelName} not found`,
          suggestion: 'Check the ID and try again'
        });
      }
    } catch (err) {
      console.error(`GET_ITEM /${modelName.toLowerCase()}/${req.params.id} error:`, err.message);
      return res.status(500).json({ 
        message: err.message,
        details: 'Error retrieving item'
      });
    }

    res.item = item;
    next();
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'OK',
    database: dbStatus,
    timestamp: new Date()
  });
});

// Use Routes
app.use('/products', createCRUDRoutes(Product, 'Product'));
app.use('/users', createCRUDRoutes(User, 'User'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);
  console.log(`Health check at http://localhost:${PORT}/health`);
});