const express = require("express");
const router = express.Router();
const db = require("../DB/database");

router.post("/api/orders", (req, res) => {
  const { clientName, items } = req.body;

  try {
    // Insert the order into the orders table
    db.run(
      "INSERT INTO orders (client_name) VALUES (?)",
      [clientName],
      function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: "Error adding the order." });
        }

        const orderId = this.lastID; // Get the ID of the newly inserted order

        // Insert each item in the order_items table
        const stmt = db.prepare(
          "INSERT INTO orders_items (order_id, product_id, quantity) VALUES (?, ?, ?)"
        );
        items.forEach((item) => {
          stmt.run(orderId, item.ID, item.quantity);
        });

        stmt.finalize(); // Finalize the statement

        res.status(201).json({ message: "Order added successfully", orderId });
      }
    );
  } catch (error) {
    console.log(error);
  }
});

router.get("/api/orders", (req, res) => {
  try {
     // SQL query to retrieve orders and related product information
  const sql = `
  SELECT
    o.id AS OrderId,
    o.client_name AS ClientName,
    p.name AS ProductName,
    oi.quantity AS Quantity,
    p.RetailCost AS RetailCost,
    p.WholesaleCost AS WholesaleCost
  FROM orders o
  JOIN orders_items oi ON o.id = oi.order_id
  JOIN products p ON oi.product_id = p.id;
 `;
   db.all(sql, (err, rows) => {
     if (err) {
       res.status(500).json({ error: "Internal Server Error" });
       return;
     }
 
     // Organize the data into the desired format
     const orders = {};
     rows.forEach((row) => {
       if (!orders[row.OrderId]) {
         orders[row.OrderId] = {
           OrderId: row.OrderId,
           ClientName: row.ClientName,
           Products: [],
         };
       }
 
       orders[row.OrderId].Products.push({
         ProductName: row.ProductName,
         Quantity: row.Quantity,
         RetailCost: row.RetailCost,
         WholesaleCost: row.WholesaleCost,
       });
     });
 
     // Convert the orders object into an array
     const ordersArray = Object.values(orders);
     res.status(200).json(ordersArray);
   });
  } catch (error) {
    console.log(error)
  }
 
});

module.exports = router;
