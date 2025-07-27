// app.js - GPA Tracker

const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const flash = require('connect-flash');
require('dotenv').config(); // Add this line

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
// const db = mysql.createConnection({
//     // host: 'localhost',
//     // user: 'root',
//     // password: 'Mynameisjeff123!',
//     // database: 'c237_usersdb'
//     host: 'b-poe6.h.filess.io',
//     user: 'GPATracker_scienceegg',
//     password: '654f0adde2031c3b3a37a16b33f789327db4a9d0',
//     database: 'GPATracker_scienceegg'
// });

// Database connection - use environment variables
const dbConfig = {
    host: process.env.DB_HOST || 'b-poe6.h.filess.io',
    user: process.env.DB_USER || 'GPATracker_scienceegg',
    password: process.env.DB_PASSWORD || '654f0adde2031c3b3a37a16b33f789327db4a9d0',
    database: process.env.DB_NAME || 'GPATracker_scienceegg',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// db.connect((err) => {
//     if (err) {
//         throw err;
//     }
//     console.log('Connected to database');
// });

// app.use(express.urlencoded({ extended: false }));
// app.use(express.static('public'));

// // Session middleware
// app.use(session({
//     secret: 'secret',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
// }));

// app.use(flash());

// // Setting up EJS
// app.set('view engine', 'ejs');

// // Middleware to check if user is logged in
// const checkAuthenticated = (req, res, next) => {
//     // Temporarily bypass authentication for testing
//     return next();
    
//     // Actual implementation (commented out for now)
//     // if (req.session.user) {
//     //     return next();
//     // } else {
//     //     req.flash('error', 'Please log in to view this resource');
//     //     res.redirect('/login');
//     // }
// };

// // Routes
// app.get('/', checkAuthenticated, (req, res) => {
//     res.render('index', {
//         currentGPA: 0.00,
//         projectedGPA: 0.00
//     });
// });

// app.get('/addGPA', checkAuthenticated, (req, res) => {
//     res.send('Add GPA page will go here');
// });

// // Starting the server
// app.listen(3000, () => {
//     console.log('Server started on port 3000');
// });

const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection()
    .then(conn => {
        console.log('Connected to database');
        conn.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err);
        process.exit(1); // Exit if DB connection fails
    });

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(express.json()); // Add JSON parsing middleware

// Session middleware - use environment variable for secret
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production', // Enable in production
        httpOnly: true
    }
}));

app.use(flash());

// Setting up EJS
app.set('view engine', 'ejs');

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    // Temporarily bypass authentication for testing
    return next();
};

// Routes
app.get('/', checkAuthenticated, (req, res) => {
    res.render('index', {
        currentGPA: 0.00,
        projectedGPA: 0.00
    });
});

app.get('/addGPA', checkAuthenticated, (req, res) => {
    res.send('Add GPA page will go here');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Starting the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
});

//test