const express = require("express");
const router = express.Router();
const db = require("../DB/database");

// Endpoint to fetch predefined values
router.get("/api/Products/predefinedValues", (req, res) => {
  const query =
    "SELECT main_data.name, [values].name AS value_name, [values].cost, [values].wholesale_cost, [values].uid " +
    "FROM main_data " +
    "LEFT JOIN [values] ON main_data.rowid = [values].main_data_id";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Error fetching predefined values:", err);
      return res
        .status(500)
        .json({ error: "Error fetching predefined values" });
    }

    const transformedValues = {};

    rows.forEach((row) => {
      const itemName = row.name;
      if (!transformedValues[itemName]) {
        transformedValues[itemName] = [];
      }
      transformedValues[itemName].push({
        name: row.value_name,
        retailCost: row.cost,
        wholesaleCost: row.wholesale_cost,
        uid: row.uid,
      });
    });

    res.json(transformedValues);
  });
});

router.post("/api/Products", async (req, res) => {
  const product = req.body.product;

  try {
    // First, insert a record with just the "name" property
    const insertProduct = (name) =>
      new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO products (name) VALUES (?)",
          [name],
          function (err) {
            if (err) {
              console.error("Error saving the product:", err);
              reject(err);
            } else {
              resolve(this.lastID); // Resolve with the newly inserted product's ID
            }
          }
        );
      });

    const productId = await insertProduct(product.name);

    // Calculate the RetailCost and WholesaleCost for the product
    const calculateProductCost = async () => {
      let retailCost = 0;
      let wholesaleCost = 0;

      for (const propertyName in product) {
        if (
          propertyName !== "name" &&
          propertyName !== "retailPercentage" &&
          propertyName !== "wholesalePercentage" &&
          propertyName !== "RetailCost" &&
          propertyName !== "Wholesale"
        ) {
          const property = product[propertyName];
          const type = property.type;
          const value =
            type === "predefined"
              ? await retrieveValueFromValuesTable(property.value)
              : {
                  name: "manual",
                  cost: parseFloat(property.value),
                  wholesaleCost: parseFloat(property.value),
                  uid: "manual",
                };
          const quantity = property.quantity;

          retailCost += value.cost * quantity;
          wholesaleCost += value.wholesaleCost * quantity;

          // Update the existing record with the current property
          db.run(
            `UPDATE products SET "${propertyName}Value" = ?, "${propertyName}IsPredefined" = ?, "${propertyName}Quantity" = ? WHERE id = ?`,
            [type === "predefined" ? value.uid : value.cost , type === "predefined" ? 1 : 0, quantity, productId],
            (updateErr) => {
              if (updateErr) {
                console.error(
                  `Error updating product property ${propertyName}:`,
                  updateErr
                );
              }
            }
          );
        }
      }

      return { retailCost, wholesaleCost };
    };

    const { retailCost, wholesaleCost } = await calculateProductCost();

    // Calculate RetailPrice and WholesalePrice based on RetailCost and WholesaleCost
    const retailProfit = (product.retailPercentage / 100) * retailCost;
    const wholesaleProfit = (product.wholesalePercentage / 100) * wholesaleCost;

    // Update RetailCost and WholesaleCost for the product
    db.run(
      `UPDATE products SET "RetailCost" = ?, "WholesaleCost" = ? WHERE id = ?`,
      [retailProfit, wholesaleProfit, productId],
      (updateErr) => {
        if (updateErr) {
          console.error(
            "Error updating product properties RetailCost and WholesaleCost:",
            updateErr
          );
          res.status(500).json({
            error: "Failed to update product properties RetailCost and WholesaleCost",
          });
        } else {
          // Update RetailProfit and WholesaleProfit
          db.run(
            `UPDATE products SET "RetailProfit" = ?, "WholesaleProfit" = ? WHERE id = ?`,
            [product.retailPercentage, product.wholesalePercentage, productId],
            (updateProfitErr) => {
              if (updateProfitErr) {
                console.error(
                  "Error updating product properties RetailProfit and WholesaleProfit:",
                  updateProfitErr
                );
                res.status(500).json({
                  error:
                    "Failed to update product properties RetailProfit and WholesaleProfit",
                });
              } else {
                res.status(201).json({
                  message: "Product created and properties updated successfully",
                });
              }
            }
          );
        }
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to create the product" });
  }
});


router.delete("/api/Products/:productId", (req, res) => {
  const productId = req.params.productId;

  // Update the "IsActive" property
  db.run(
    `UPDATE products SET IsActive = 0 WHERE id = ?`,
    [productId],
    function (err) {
      if (err) {
        console.error("Error deleting the product:", err);
        res.status(500).json({ error: "Failed to delete the product" });
        return;
      }

      res
        .status(200)
        .json({
          message: "Product deleted successfully",
        });
    }
  );
});


// Function to retrieve the cost from your database based on the UID
function retrieveValueFromValuesTable(uid) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT cost, wholesale_cost, name, uid FROM "values" WHERE uid = ?`, [uid], (err, row) => {
      if (err) {
        console.error("Error retrieving value:", err);
        resolve({ name: "error", cost: -1, wholesaleCost: -1, uid: "error" }); // Resolve with default values if there's an error
      } else {
        if (row) {
          resolve({ name: row.name, cost: row.cost, wholesaleCost: row.wholesale_cost, uid: row.uid});
        } else {
          resolve({ name: "error", cost: -1, wholesaleCost: -1, uid: "error" }); // Resolve with default values if UID is not found
        }
      }
    });
  });
}


router.get("/api/Products", async (req, res) => {
  try {
    // Retrieve the products from the database
    const products = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM products WHERE IsActive = 1", (err, products) => {
        if (err) {
          console.error("Error retrieving products:", err);
          reject("Failed to retrieve products");
        }
        resolve(products);
      });
    });

    // Initialize an array to store the transformed products
    const transformedProducts = [];

    // Iterate through the retrieved products
    for (const product of products) {
      const transformedProduct = {
        ID: product.id,
        name: product.name,
        properties: {},
        percentages:{},
        prices:{},
      };

      // Iterate through the properties
      for (const propertyName in product) {
        if (propertyName.endsWith("Value") && product[propertyName] !== null) {
          const isPredefined = product[propertyName.replace("Value", "IsPredefined")];
          const propertyValue = product[propertyName];
          const quantity = product[propertyName.replace("Value", "Quantity")];

          // Check if the value is predefined
          if (isPredefined) {
            const value = await retrieveValueFromValuesTable(propertyValue);
            transformedProduct.properties[propertyName.replace("Value", "")] = {
              quantity,
              name: value.name,
              retailCost: value.cost,
              wholesaleCost: value.wholesaleCost,
              uid: value.uid
            };
          } else {
            // If not predefined, use the value directly
            const value = parseFloat(propertyValue);
            transformedProduct.properties[propertyName.replace("Value", "")] = {
              quantity,
              name: "Precio Manual",
              retailCost: value,
              wholesaleCost: value,
              uid: "Precio Manual"
            };
          }
        }else if(propertyName === "WholesaleProfit" || propertyName === "RetailProfit"){
          transformedProduct.percentages[propertyName] = product[propertyName];
        }else if(propertyName === "RetailCost" || propertyName === "WholesaleCost"){
          transformedProduct.prices[propertyName] = product[propertyName];
        }
      }

      //add Precio, CostoProd, PrecioMay, GananciMay, gananciaMen

      transformedProducts.push(transformedProduct);
    }

    // Send the response
    res.status(200).json(transformedProducts);
  } catch (error) {
    res.status(500).json({ error });
  }
});


router.put("/api/Products/:productId", async (req, res) => {
  const productId = req.params.productId;
  const product = req.body.product;

  try {
    // Update the product's name
    const updateProductName = (name, id) => {
      return new Promise((resolve, reject) => {
        db.run(
          "UPDATE products SET name = ? WHERE id = ?",
          [name, id],
          function (err) {
            if (err) {
              console.error("Error updating product name:", err);
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });
    };

    await updateProductName(product.name, productId);

    // Calculate and update the product properties (similar to the POST endpoint)
    let retailCost = 0;
    let wholesaleCost = 0;

    for (const propertyName in product) {
      if (
        propertyName !== "name" &&
        propertyName !== "retailPercentage" &&
        propertyName !== "wholesalePercentage" &&
        propertyName !== "RetailCost" &&
        propertyName !== "Wholesale"
      ) {
        const property = product[propertyName];
        const type = property.type;
        const value =
          type === "predefined"
            ? await retrieveValueFromValuesTable(property.value)
            : {
                name: "manual",
                cost: parseFloat(property.value),
                wholesaleCost: parseFloat(property.value),
                uid: "manual",
              };
        const quantity = property.quantity;

        retailCost += value.cost * quantity;
        wholesaleCost += value.wholesaleCost * quantity;

        // Update the existing record with the current property
        await new Promise((resolve, reject) => {
          db.run(
            `UPDATE products SET "${propertyName}Value" = ?, "${propertyName}IsPredefined" = ?, "${propertyName}Quantity" = ? WHERE id = ?`,
            [type === "predefined" ? value.uid : value.cost , type === "predefined" ? 1 : 0, quantity, productId],
            (updateErr) => {
              if (updateErr) {
                console.error(
                  `Error updating product property ${propertyName}:`,
                  updateErr
                );
                reject(updateErr);
              } else {
                resolve();
              }
            }
          );
        });
      }
    }

    // Calculate RetailPrice and WholesalePrice based on RetailCost and WholesaleCost
    const retailProfit = (product.retailPercentage / 100) * retailCost;
    const wholesaleProfit = (product.wholesalePercentage / 100) * wholesaleCost;


    // Update RetailCost and WholesaleCost for the product
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET "RetailCost" = ?, "WholesaleCost" = ? WHERE id = ?`,
        [retailProfit, wholesaleProfit, productId],
        (updateErr) => {
          if (updateErr) {
            console.error(
              "Error updating product properties RetailCost and WholesaleCost:",
              updateErr
            );
            reject(updateErr);
          } else {
            resolve();
          }
        }
      );
    });

    // Update RetailProfit and WholesaleProfit
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET "RetailProfit" = ?, "WholesaleProfit" = ? WHERE id = ?`,
        [product.retailPercentage, product.wholesalePercentage, productId],
        (updateProfitErr) => {
          if (updateProfitErr) {
            console.error(
              "Error updating product properties RetailProfit and WholesaleProfit:",
              updateProfitErr
            );
            reject(updateProfitErr);
          } else {
            resolve();
          }
        }
      );
    });

    res.status(200).json({
      message: "Product updated successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update the product" });
  }
});




module.exports = router;
