// app.js - GPA Tracker

const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Mynameisjeff123!',
    database: 'c237_usersdb'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// Session middleware
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Setting up EJS
app.set('view engine', 'ejs');

// Middleware to check if user is logged in
const checkAuthenticated = (req, res, next) => {
    // Temporarily bypass authentication for testing
    return next();
    
    // Actual implementation (commented out for now)
    // if (req.session.user) {
    //     return next();
    // } else {
    //     req.flash('error', 'Please log in to view this resource');
    //     res.redirect('/login');
    // }
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

// Starting the server
app.listen(3000, () => {
    console.log('Server started on port 3000');
});