// app.js - GPA Tracker

const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'b-poe6.h.filess.io',
    user: process.env.DB_USER || 'GPATracker_scienceegg',
    password: process.env.DB_PASSWORD || '654f0adde2031c3b3a37a16b33f789327db4a9d0',
    database: process.env.DB_NAME || 'GPATracker_scienceegg',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000, // 10 seconds timeout
    acquireTimeout: 10000  // 10 seconds timeout
});

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));
app.use(flash());

app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
});


// Set view engine
app.set('view engine', 'ejs');

// Authentication middleware
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error', 'Please login to view this page');
    res.redirect('/login');
};

// Routes

app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard'); // or your main app page
    }
    res.redirect('/welcome');
});

// Auth Routes
app.get('/welcome', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('welcome');
});

app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { error: req.flash('error') });
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if user exists
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (users.length === 0 || !await bcrypt.compare(password, users[0].password)) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/login');
        }
        
        // Set session
        req.session.user = {
            id: users[0].id,
            username: users[0].username,
            email: users[0].email
        };
        
        return res.redirect('/'); // or your dashboard route
        
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error', 'Login failed');
        return res.redirect('/login');
    }
});

app.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('register', { error: req.flash('error') });
});

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?', 
            [email]
        );
        
        if (existing.length > 0) {
            req.flash('error', 'Email already registered');
            return res.redirect('/register');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, current_gpa, total_mc) VALUES (?, ?, ?, 0.00, 0)',
            [username, email, hashedPassword]
        );
        
        if (result.affectedRows === 1) {
            req.flash('success', 'Registration successful. Please login.');
            return res.redirect('/login');
        } else {
            throw new Error('Registration failed');
        }
    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error', 'Registration failed');
        return res.redirect('/register');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/welcome');
});

// Your existing GPA routes
app.get('/addGPA', checkAuthenticated, (req, res) => {
    res.render('addGPA');
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Test database connection on startup
async function testDbConnection() {
    try {
        const conn = await pool.getConnection();
        console.log('Successfully connected to database');
        conn.release();
        
        // Test query
        const [rows] = await pool.query('SELECT * FROM users LIMIT 1');
        console.log('Database test query successful');
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
}

testDbConnection();


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// const express = require('express');
// const mysql = require('mysql2/promise');
// const session = require('express-session');
// const flash = require('connect-flash');
// require('dotenv').config(); // Add this line

// const app = express();
// const PORT = process.env.PORT || 3000;

// // Database connection
// // const db = mysql.createConnection({
// //     // host: 'localhost',
// //     // user: 'root',
// //     // password: 'Mynameisjeff123!',
// //     // database: 'c237_usersdb'
// //     host: 'b-poe6.h.filess.io',
// //     user: 'GPATracker_scienceegg',
// //     password: '654f0adde2031c3b3a37a16b33f789327db4a9d0',
// //     database: 'GPATracker_scienceegg'
// // });

// // Database connection - use environment variables
// const dbConfig = {
//     host: process.env.DB_HOST || 'b-poe6.h.filess.io',
//     user: process.env.DB_USER || 'GPATracker_scienceegg',
//     password: process.env.DB_PASSWORD || '654f0adde2031c3b3a37a16b33f789327db4a9d0',
//     database: process.env.DB_NAME || 'GPATracker_scienceegg',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// };

// // db.connect((err) => {
// //     if (err) {
// //         throw err;
// //     }
// //     console.log('Connected to database');
// // });

// // app.use(express.urlencoded({ extended: false }));
// // app.use(express.static('public'));

// // // Session middleware
// // app.use(session({
// //     secret: 'secret',
// //     resave: false,
// //     saveUninitialized: true,
// //     cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
// // }));

// // app.use(flash());

// // // Setting up EJS
// // app.set('view engine', 'ejs');

// // // Middleware to check if user is logged in
// // const checkAuthenticated = (req, res, next) => {
// //     // Temporarily bypass authentication for testing
// //     return next();
    
// //     // Actual implementation (commented out for now)
// //     // if (req.session.user) {
// //     //     return next();
// //     // } else {
// //     //     req.flash('error', 'Please log in to view this resource');
// //     //     res.redirect('/login');
// //     // }
// // };

// // // Routes
// // app.get('/', checkAuthenticated, (req, res) => {
// //     res.render('index', {
// //         currentGPA: 0.00,
// //         projectedGPA: 0.00
// //     });
// // });

// // app.get('/addGPA', checkAuthenticated, (req, res) => {
// //     res.send('Add GPA page will go here');
// // });

// // // Starting the server
// // app.listen(3000, () => {
// //     console.log('Server started on port 3000');
// // });

// const pool = mysql.createPool(dbConfig);

// // Test database connection
// pool.getConnection()
//     .then(conn => {
//         console.log('Connected to database');
//         conn.release();
//     })
//     .catch(err => {
//         console.error('Database connection failed:', err);
//         process.exit(1); // Exit if DB connection fails
//     });

// app.use(express.urlencoded({ extended: false }));
// app.use(express.static('public'));
// app.use(express.json()); // Add JSON parsing middleware

// // Session middleware - use environment variable for secret
// app.use(session({
//     secret: process.env.SESSION_SECRET || 'secret',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { 
//         maxAge: 1000 * 60 * 60 * 24 * 7,
//         secure: process.env.NODE_ENV === 'production', // Enable in production
//         httpOnly: true
//     }
// }));

// app.use(flash());

// // Setting up EJS
// app.set('view engine', 'ejs');

// // Middleware to check if user is logged in
// const checkAuthenticated = (req, res, next) => {
//     // Temporarily bypass authentication for testing
//     return next();
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

// // Error handling middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something broke!');
// });

// // Starting the server
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server started on port ${PORT}`);
// });

//test