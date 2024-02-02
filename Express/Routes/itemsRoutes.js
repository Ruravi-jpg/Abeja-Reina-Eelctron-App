const express = require('express');
const router = express.Router();
const db = require('../DB/database')

// Endpoint to fetch all main_data entries with associated values
router.get('/api/items', (req, res) => {
    const query = 'SELECT main_data.rowid AS id, main_data.name, main_data.description, ' +
    'GROUP_CONCAT("values".name) AS value_names, GROUP_CONCAT("values".cost) AS value_costs, GROUP_CONCAT("values".wholesale_cost) AS value_wholesale_costs, GROUP_CONCAT("values".uid) AS value_uids ' +
    'FROM main_data ' +
    'LEFT JOIN "values" ON main_data.rowid = "values".main_data_id GROUP BY main_data.rowid';


    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving items' });
        }

        // Process rows to format the response as desired
        const formattedItems = rows.map((row) => {
            const item = {
                id: row.id,
                name: row.name,
                description: row.description,
                values: [],
            };

            if (row.value_names && row.value_costs) {
                const valueNames = row.value_names.split(',');
                const valueCosts = row.value_costs.split(',');
                const valueWholesaleCosts = row.value_wholesale_costs.split(",");
                const valueUids = row.value_uids.split(',');
                for (let i = 0; i < valueNames.length; i++) {
                    item.values.push({
                        name: valueNames[i],
                        cost: parseInt(valueCosts[i]),
                        wholesaleCost: parseInt(valueWholesaleCosts[i]),
                        uid: valueUids[i],
                    });
                }
            }

            return item;
        });

        res.json(formattedItems);
    });
});


// Endpoint to add a new value to an item's values
router.post('/api/items/:id/values', async (req, res) => {
    const itemId = req.params.id;
    const newValue = req.body; // The new value to add

    if (!newValue) {
        return res.status(400).json({ error: 'Missing required information' });
    }

    // Insert the new value into the values table
    db.run('INSERT INTO "values" (name, cost, wholesale_cost, uid, main_data_id) VALUES (?, ?, ?, ?, ?)', [newValue.name, newValue.cost, newValue.wholesaleCost, newValue.uid, itemId], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Error adding value' });
        }

        res.status(201).json({ message: 'Value added successfully', valueId: this.lastID });
    });
});

// Endpoint to delete a value from an item's values
router.delete('/api/items/:itemId/values/:valueId', (req, res) => {
    const itemId = req.params.itemId;
    const valueId = req.params.valueId;

    if (!itemId || !valueId) {
        return res.status(400).json({ error: 'Missing required information' });
    }

    // Delete the value from the values table
    db.run('DELETE FROM "values" WHERE uid = ? AND main_data_id = ?', [valueId, itemId], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Error deleting value' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Value not found' });
        }

        res.status(200).json({ message: 'Value deleted successfully' });
    });
});

// Endpoint to update a value in an item's values
router.put('/api/items/:itemId/values/:valueId', (req, res) => {
    const itemId = req.params.itemId;
    const valueId = req.params.valueId;
    const updatedValue = req.body; // The updated value

    if (!itemId || !valueId || !updatedValue) {
        return res.status(400).json({ error: 'Missing required information' });
    }

    // Update the value in the values table
    db.run('UPDATE "values" SET name = ?, cost = ?, wholesale_cost = ? WHERE uid = ? AND main_data_id = ?', [updatedValue.name, updatedValue.cost, updatedValue.wholesaleCost, valueId, itemId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'Error updating value' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Value not found' });
            }

            res.status(200).json({ message: 'Value updated successfully' });
        });
});

module.exports = router;
