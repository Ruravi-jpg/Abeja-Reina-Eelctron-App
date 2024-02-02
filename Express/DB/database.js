const sqlite3 = require('sqlite3').verbose();
const path = require('path');



const db = new sqlite3.Database(path.join(__dirname, 'mydatabase.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return res.status(500).json({ error: 'Database initialization failed' });
    }
    console.log("database opened succesfully");
});

// Other database setup and configuration, if needed

module.exports = db; // Export the initialized database connection
