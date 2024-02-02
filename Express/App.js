const express = require('express');
const cors = require('cors');
const path = require('path');

// Create an Express app
console.log('Creating Express server ');
const expressApp = express();
const port = 8000;

// Expose the close method
expressApp.close = () => {
    console.log('Closing Express server');
  };

expressApp.use(express.static(path.join(__dirname, '../React/')));

expressApp.use(cors({
    origin:'http://localhost:3000'
}));
expressApp.use(express.json());

// routes

const itemRoutes = require('./Routes/itemsRoutes');
expressApp.use(itemRoutes);

const productRoutes = require('./Routes/ProductsRoutes');
expressApp.use(productRoutes);

const orderRoutes = require('./Routes/OrdersRoutes');
expressApp.use(orderRoutes);


expressApp.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = expressApp;
