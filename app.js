// app.js - GPA Tracker

const express = require('express');
const mysql = require('mysql2/promise');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'b-poe6.h.filess.io',
    user: process.env.DB_USER || 'GPATracker_scienceegg',
    password: process.env.DB_PASSWORD || '654f0adde2031c3b3a37a16b33f789327db4a9d0',
    database: process.env.DB_NAME || 'GPATracker_scienceegg',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    acquireTimeout: 10000
});

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
app.set('view engine', 'ejs');

app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
});

const checkAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    req.flash('error', 'Please login to view this page');
    res.redirect('/login');
};

// --- ROUTES ---

app.get('/', checkAuthenticated, (req, res) => {
    res.render('index', {
        currentGPA: 0.00,
        projectedGPA: 0.00
    });
});

app.get('/welcome', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('welcome');
});

app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { error: req.flash('error') });
});

app.post('/login', async (req, res) => {
    let connection;
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            req.flash('error', 'Email and password are required');
            return res.redirect('/login');
        }

        connection = await pool.getConnection();
        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0 || !await bcrypt.compare(password, users[0].password)) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/login');
        }

        req.session.user = {
            id: users[0].id,
            username: users[0].username,
            email: users[0].email
        };

        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error', 'Login failed');
                return res.redirect('/login');
            }
            return res.redirect('/');
        });

    } catch (err) {
        console.error('Login error:', err);
        req.flash('error', 'Login failed');
        return res.redirect('/login');
    } finally {
        if (connection) connection.release();
    }
});

app.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('register', { error: req.flash('error') });
});

app.post('/register', async (req, res) => {
    let connection;
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            req.flash('error', 'All fields are required');
            return res.redirect('/register');
        }

        connection = await pool.getConnection();

        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            req.flash('error', 'Email already registered');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await connection.query(
            'INSERT INTO users (username, email, password, current_gpa, total_mc) VALUES (?, ?, ?, 0.00, 0)',
            [username, email, hashedPassword]
        );

        if (result.affectedRows === 1) {
            console.log('✅ New user inserted with ID:', result.insertId);
            req.flash('success', 'Registration successful. Please login.');
            return res.redirect('/login');
        }

        throw new Error('Registration failed');

    } catch (err) {
        console.error('Registration error:', err);
        req.flash('error', 'Registration failed. Please try again.');
        return res.redirect('/register');
    } finally { 
        if (connection) connection.release();
    }
});


app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/welcome');
});

// --- GPA ROUTES ---
app.get('/', checkAuthenticated, (req, res) => {
    res.render('index', {
        currentGPA: 0.00,
        projectedGPA: 0.00
    });
});

app.get('/addGPA', checkAuthenticated, (req, res) => {
    res.render('addGPA');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

async function testDatabase() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('✅ Connected to database');

        const [tables] = await connection.query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
            [process.env.DB_NAME || 'GPATracker_scienceegg']
        );

        if (tables.length === 0) {
            console.error('❌ Users table does not exist');
            return false;
        }

        console.log('✅ Users table exists');

        const [columns] = await connection.query(`
            SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
            [process.env.DB_NAME || 'GPATracker_scienceegg']
        );

        const requiredColumns = [
            { name: 'id', type: 'int' },
            { name: 'username', type: 'varchar' },
            { name: 'email', type: 'varchar' },
            { name: 'password', type: 'varchar' },
            { name: 'current_gpa', type: 'decimal' },
            { name: 'total_mc', type: 'int' }
        ];

        let valid = true;
        for (let col of requiredColumns) {
            const exists = columns.some(c =>
                c.COLUMN_NAME === col.name && c.DATA_TYPE.includes(col.type)
            );
            if (!exists) {
                console.error(`❌ Missing/invalid column: ${col.name}`);
                valid = false;
            }
        }

        if (!valid) return false;

        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Found ${users[0].count} users`);

        await connection.beginTransaction();
        try {
            const email = `test_${Date.now()}@test.com`;
            const [insert] = await connection.query(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                ['test_user', email, 'test_pass']
            );
            if (insert.affectedRows === 1) {
                console.log('✅ Insert operation successful');
            }
        } finally {
            await connection.rollback();
            console.log('✅ Insert test rolled back');
        }

        console.log('✅ All database tests passed!');
        return true;

    } catch (err) {
        console.error('❌ Database test failed:', err.message);
        return false;
    } finally {
        if (connection) connection.release();
    }
}

testDatabase().then(success => {
    if (!success) {
        console.error('⚠️ Fix database before continuing.');
        // process.exit(1); // Optionally exit on error
    }
});



app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server started on port ${PORT}`);
});
