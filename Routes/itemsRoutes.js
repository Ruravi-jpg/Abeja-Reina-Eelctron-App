const express = require('express');
const router = express.Router();
const Datastore = require('nedb');
const fs = require('fs');
const uuid = require('uuid');

const usersDB = new Datastore({ filename: 'basevalues.db', autoload: true });

router.get('/api/items', (req, res) => {

   
    usersDB.find({}, (err, docs) => {
        if (err) {
            res.status(500).json({ error: 'Error retrieving users' });
        } else {
            res.json(docs);
        }
    });
});

router.post('/api/items', (req, res) => {
    const newItem = req.body;
    newItem.id = usersDB.length + 1; // Assign a new ID (replace with a proper ID generation mechanism)

    usersDB.push(newItem);
    saveDataToFile();
    res.status(201).json(newItem);
});

// Endpoint to add a new value to an item's values
router.post('/api/items/:id/values', (req, res) => {
    //console.log(req.params.id)
    const itemId = req.params.id;
    const newValue = req.body; // The new value to add

    if (!newValue) {
        return res.status(400).json({ error: 'Missing required information' });
    }

    // Find the item by ID and update its values array
    usersDB.findOne({ _id: itemId }, (err, item) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving item' });
        }

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Add the new value to the item's values array
        item.values.push(newValue);

        // Update the item in the database using $set operator with multi:false
        usersDB.update({ _id: itemId }, { $set: { values: item.values } }, { multi: false }, (err, numReplaced) => {
            if (err) {
                return res.status(500).json({ error: 'Error updating item' });
            }

            return res.status(201).json({ message: 'Value added successfully', item });
        });
    });
    
});



router.delete('/api/items/:itemId/values/:valueUid', (req, res) => {
    const itemId = req.params.itemId;
    const valueUid = req.params.valueUid;

    console.log("item id", itemId, "valueUid", valueUid)
    if (!itemId || !valueUid) {
        return res.status(400).json({ error: 'Missing required information' });
    }

    // Find the item by ID and update its values array
    usersDB.findOne({ _id: itemId }, (err, item) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving item' });
        }

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Add the new value to the item's values array
        const newValues = item.values.filter(value => value.uid !== valueUid);

        // Update the item in the database using $set operator with multi:false
        usersDB.update({ _id: itemId }, { $set: { values: newValues } }, { multi: false }, (err, numReplaced) => {
            if (err) {
                return res.status(500).json({ error: 'Error updating item' });
            }

            return res.status(201).json({ message: 'Value deleted successfully', item });
        });
    });



});



module.exports = router;

