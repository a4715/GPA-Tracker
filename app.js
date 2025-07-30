// // app.js - GPA Tracker

const express = require('express');
const mysql = require('mysql2');

//******** TODO: Insert code to import 'express-session' *********//
const session = require('express-session');

const flash = require('connect-flash');

const app = express();

// Database connection
const db = mysql.createConnection({
    host: 'b-poe6.h.filess.io',
    port: 61002,
    user: 'GPATracker_scienceegg',
    password: '654f0adde2031c3b3a37a16b33f789327db4a9d0',
    database: 'GPATracker_scienceegg'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

//******** TODO: Insert code for Session Middleware below ********//
app.use(session({
    secret: 'secret',
    reserve: false,
    sawUninitialized: true,
    // Session expires after 1 week of inactivity
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(flash());

// Setting up EJS
app.set('view engine', 'ejs');

//******** TODO: Create a Middleware to check if user is logged in. ********//
const checkAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    } else {
        req.flash('error', 'Please log in to view this resource');
        res.redirect('/login');
    }
};

//******** TODO: Create a Middleware to check if user is admin. ********//
const checkAdmin = (req, res, next) => {
    if (req.session.user.role == 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/dashboard');
    }
};

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.session.user, messages: req.flash('success')});
});

app.get('/register', (req, res) => {
    res.render('register', { messages: req.flash('error'), formData: req.flash('formData')[0] });
});


//******** TODO: Create a middleware function validateRegistration ********//
//TO DO: Create a middleware function validateRegistration
const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact } = req.body;

    if (!username || !email || !password || !address || !contact) {
        return res.status(400).send('All fields are required.');
    }

    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next(); //If all validations pass, the next function is called, allowing the request to proceed to the new function.
};

//******** TODO: Integrate validateRegistration into the register route. ********//
app.post('/register', validateRegistration, (req, res) => {
    //******** TODO: Update register route to include role. ********//
    const { username, email, password, address, contact, role } = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
    db.query(sql, [username, email, password, address, contact, role], (err, result) => {
        if (err) {
            throw err;
        }
        console.log(result);
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

//******** TODO: Insert code for login routes to render login page below ********//
app.get('/login', (req, res) => {
    res.render('login', {
        messages: req.flash('success'), // Retrieve success messages from the session and pass them to the view
        errors: req.flash('error') // Retrieve error messages from the session and pass them to the view
    });
});


//******** TODO: Insert code for login routes for form submission below ********//
//******* TO DO: Insert code for login routes for form submission below *******//
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validate email and password
    if (!email || !password) {
        req.flash('error', 'All fields are required.');
        return res.redirect('/login');
    }

    const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            throw err;
        }
        if (results.length > 0) {
            // Successful login
            req.session.user = results[0]; // store user in session
            req.flash('success', 'Login successful');
            // TO DO: Update to restrict the users to /dashboard
            res.redirect('/dashboard');
        } else {
            // Invalid credentials
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

//******** TODO: Insert code for dashboard route to render dashboard page for users. ********//
app.get('/dashboard', checkAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

//******** TODO: Insert code for admin route to render dashboard page for admin. ********//
app.get('/admin', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('admin', { user: req.session.user });
});

//******** TODO: Insert code for logout route ********//
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
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

// Add this function to your app.js
async function testDatabase() {
    let connection;
    try {
      console.log('Starting database test...');
      
      // 1. Test basic connection
      connection = await pool.getConnection();
      console.log('✅ Database connection successful');
      
      // 2. Test users table exists
      const [tables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
        [process.env.DB_NAME || 'GPATracker_scienceegg']
      );
      
      if (tables.length === 0) {
        console.log('⚠️ Users table does not exist');
        return false;
      }
      console.log('✅ Users table exists');
      
      // 3. Test table structure
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
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
      
      let structureValid = true;
      requiredColumns.forEach(reqCol => {
        const found = columns.some(col => 
          col.COLUMN_NAME === reqCol.name && 
          col.DATA_TYPE.toLowerCase().includes(reqCol.type)
        );
        if (!found) {
          console.log(`❌ Missing or invalid column: ${reqCol.name} (${reqCol.type})`);
          structureValid = false;
        }
      });
      
      if (!structureValid) {
        console.log('⚠️ Users table structure is invalid');
        return false;
      }
      console.log('✅ Users table structure is valid');
      
      // 4. Test basic query
      const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
      console.log(`✅ Basic query successful. Found ${users[0].count} users`);
      
      // 5. Test insert operation (will be rolled back)
      await connection.beginTransaction();
      try {
        const testEmail = `test_${Date.now()}@test.com`;
        const [result] = await connection.query(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          ['test_user', testEmail, 'test_password']
        );
        
        if (result.affectedRows === 1) {
          console.log('✅ Insert operation successful');
        } else {
          console.log('❌ Insert operation failed');
          return false;
        }
      } finally {
        await connection.rollback();
        console.log('✅ Test transaction rolled back');
      }
      
      console.log('🎉 All database tests passed successfully!');
      return true;
      
    } catch (err) {
      console.error('❌ Database test failed:', err.message);
      return false;
    } finally {
      if (connection) connection.release();
    }
  }
  
  // Call this function when your server starts
  testDatabase().then(success => {
    if (!success) {
      console.error('Database configuration issues detected');
      // Optionally exit if tests fail
      // process.exit(1);
    }
  });


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// const express = require('express');
// const mysql = require('mysql2/promise');
// const session = require('express-session');
// const flash = require('connect-flash');
// const bcrypt = require('bcrypt');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// const pool = mysql.createPool({
//     host: process.env.DB_HOST || 'b-poe6.h.filess.io',
//     user: process.env.DB_USER || 'GPATracker_scienceegg',
//     password: process.env.DB_PASSWORD || '654f0adde2031c3b3a37a16b33f789327db4a9d0',
//     database: process.env.DB_NAME || 'GPATracker_scienceegg',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
//     connectTimeout: 10000,
//     acquireTimeout: 10000
// });

// app.use(express.urlencoded({ extended: false }));
// app.use(express.json());
// app.use(express.static('public'));
// app.use(session({
//     secret: process.env.SESSION_SECRET || 'your-secret-key',
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//         maxAge: 1000 * 60 * 60 * 24 * 7,
//         secure: process.env.NODE_ENV === 'production',
//         httpOnly: true
//     }
// }));
// app.use(flash());
// app.set('view engine', 'ejs');

// app.use((req, res, next) => {
//     console.log('Session:', req.session);
//     next();
// });

// const checkAuthenticated = (req, res, next) => {
//     if (req.session.user) return next();
//     req.flash('error', 'Please login to view this page');
//     res.redirect('/login');
// };

// // --- ROUTES ---

// app.get('/', checkAuthenticated, (req, res) => {
//     res.render('index', {
//         currentGPA: 0.00,
//         projectedGPA: 0.00
//     });
// });

// app.get('/welcome', (req, res) => {
//     if (req.session.user) return res.redirect('/');
//     res.render('welcome');
// });

// app.get('/login', (req, res) => {
//     if (req.session.user) return res.redirect('/');
//     res.render('login', { error: req.flash('error') });
// });

// app.post('/login', async (req, res) => {
//     let connection;
//     try {
//         const { email, password } = req.body;
//         if (!email || !password) {
//             req.flash('error', 'Email and password are required');
//             return res.redirect('/login');
//         }

//         connection = await pool.getConnection();
//         const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

//         if (users.length === 0 || !await bcrypt.compare(password, users[0].password)) {
//             req.flash('error', 'Invalid credentials');
//             return res.redirect('/login');
//         }

//         req.session.user = {
//             id: users[0].id,
//             username: users[0].username,
//             email: users[0].email
//         };

//         req.session.save(err => {
//             if (err) {
//                 console.error('Session save error:', err);
//                 req.flash('error', 'Login failed');
//                 return res.redirect('/login');
//             }
//             return res.redirect('/');
//         });

//     } catch (err) {
//         console.error('Login error:', err);
//         req.flash('error', 'Login failed');
//         return res.redirect('/login');
//     } finally {
//         if (connection) connection.release();
//     }
// });

// app.get('/register', (req, res) => {
//     if (req.session.user) return res.redirect('/');
//     res.render('register', { error: req.flash('error') });
// });

// // app.post('/register', async (req, res) => {
// //     let connection;
// //     try {
// //         const { username, email, password } = req.body;

// //         if (!username || !email || !password) {
// //             req.flash('error', 'All fields are required');
// //             return res.redirect('/register');
// //         }

// //         connection = await pool.getConnection();

// //         const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
// //         if (existing.length > 0) {
// //             req.flash('error', 'Email already registered');
// //             return res.redirect('/register');
// //         }

// //         const hashedPassword = await bcrypt.hash(password, 10);

// //         const [result] = await connection.query(
// //             'INSERT INTO users (username, email, password, current_gpa, total_mc) VALUES (?, ?, ?, 0.00, 0)',
// //             [username, email, hashedPassword]
// //         );

// //         if (result.affectedRows === 1) {
// //             console.log('✅ New user inserted with ID:', result.insertId);
// //             req.flash('success', 'Registration successful. Please login.');
// //             return res.redirect('/login');
// //         }

// //         throw new Error('Registration failed');

// //     } catch (err) {
// //         console.error('Registration error:', err);
// //         req.flash('error', 'Registration failed. Please try again.');
// //         return res.redirect('/register');
// //     } finally { 
// //         if (connection) connection.release();
// //     }
// // });

// app.post('/register', async (req, res) => {
//     let connection;
//     try {
//         const { username, email, password } = req.body;
//         console.log('[REGISTER] Received:', { username, email });

//         if (!username || !email || !password) {
//             console.log('[REGISTER] Missing fields');
//             req.flash('error', 'All fields are required');
//             return res.redirect('/register');
//         }

//         connection = await pool.getConnection();
//         console.log('[REGISTER] Got DB connection');

//         const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
//         console.log('[REGISTER] Existing users with email:', existing.length);

//         if (existing.length > 0) {
//             console.log('[REGISTER] Email already registered');
//             req.flash('error', 'Email already registered');
//             return res.redirect('/register');
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);
//         console.log('[REGISTER] Hashed password');

//         const [result] = await connection.query(
//             'INSERT INTO users (username, email, password, current_gpa, total_mc) VALUES (?, ?, ?, 0.00, 0)',
//             [username, email, hashedPassword]
//         );

//         console.log('[REGISTER] Insert result:', result);

//         if (result.affectedRows === 1) {
//             console.log('[REGISTER] Success — New user ID:', result.insertId);
//             req.flash('success', 'Registration successful. Please login.');
//             return res.redirect('/login');
//         }

//         throw new Error('Insert failed — no rows affected');

//     } catch (err) {
//         console.error('[REGISTER] Error:', err.message);
//         req.flash('error', 'Registration failed. Please try again.');
//         return res.redirect('/register');
//     } finally {
//         if (connection) connection.release();
//     }
// });



// app.get('/logout', (req, res) => {
//     req.session.destroy();
//     res.redirect('/welcome');
// });

// // --- GPA ROUTES ---
// app.get('/', checkAuthenticated, (req, res) => {
//     res.render('index', {
//         currentGPA: 0.00,
//         projectedGPA: 0.00
//     });
// });

// app.get('/addGPA', checkAuthenticated, (req, res) => {
//     res.render('addGPA');
// });

// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something broke!');
// });

// async function testDatabase() {
//     let connection;
//     try {
//         connection = await pool.getConnection();
//         console.log('✅ Connected to database');

//         const [tables] = await connection.query(`
//             SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
//             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
//             [process.env.DB_NAME || 'GPATracker_scienceegg']
//         );

//         if (tables.length === 0) {
//             console.error('❌ Users table does not exist');
//             return false;
//         }

//         console.log('✅ Users table exists');

//         const [columns] = await connection.query(`
//             SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
//             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
//             [process.env.DB_NAME || 'GPATracker_scienceegg']
//         );

//         const requiredColumns = [
//             { name: 'id', type: 'int' },
//             { name: 'username', type: 'varchar' },
//             { name: 'email', type: 'varchar' },
//             { name: 'password', type: 'varchar' },
//             { name: 'current_gpa', type: 'decimal' },
//             { name: 'total_mc', type: 'int' }
//         ];

//         let valid = true;
//         for (let col of requiredColumns) {
//             const exists = columns.some(c =>
//                 c.COLUMN_NAME === col.name && c.DATA_TYPE.includes(col.type)
//             );
//             if (!exists) {
//                 console.error(`❌ Missing/invalid column: ${col.name}`);
//                 valid = false;
//             }
//         }

//         if (!valid) return false;

//         const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
//         console.log(`✅ Found ${users[0].count} users`);

//         await connection.beginTransaction();
//         try {
//             const email = `test_${Date.now()}@test.com`;
//             const [insert] = await connection.query(
//                 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
//                 ['test_user', email, 'test_pass']
//             );
//             if (insert.affectedRows === 1) {
//                 console.log('✅ Insert operation successful');
//             }
//         } finally {
//             await connection.rollback();
//             console.log('✅ Insert test rolled back');
//         }

//         console.log('✅ All database tests passed!');
//         return true;

//     } catch (err) {
//         console.error('❌ Database test failed:', err.message);
//         return false;
//     } finally {
//         if (connection) connection.release();
//     }
// }

// testDatabase().then(success => {
//     if (!success) {
//         console.error('⚠️ Fix database before continuing.');
//         // process.exit(1); // Optionally exit on error
//     }
// });



// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`🚀 Server started on port ${PORT}`);
// });
