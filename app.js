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
    let connection;
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            req.flash('error', 'Email and password are required');
            return res.redirect('/login');
        }

        connection = await pool.getConnection();
        
        // Check if user exists
        const [users] = await connection.query(
            'SELECT * FROM users WHERE email = ?', 
            [email]
        );
        
        if (users.length === 0) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/login');
        }
        
        const user = users[0];
        
        if (!await bcrypt.compare(password, user.password)) {
            req.flash('error', 'Invalid credentials');
            return res.redirect('/login');
        }
        
        // Set session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };
        
        // Ensure session is saved before redirect
        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error', 'Login failed');
                return res.redirect('/login');
            }
            return res.redirect('/dashboard'); // Make sure this matches your actual dashboard route
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
        
        // Basic validation
        if (!username || !email || !password) {
            req.flash('error', 'All fields are required');
            return res.redirect('/register');
        }

        connection = await pool.getConnection();
        
        // Check if user exists
        const [existing] = await connection.query(
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
        const [result] = await connection.query(
            'INSERT INTO users (username, email, password, current_gpa, total_mc) VALUES (?, ?, ?, 0.00, 0)',
            [username, email, hashedPassword]
        );
        
        if (result.affectedRows === 1) {
            req.flash('success', 'Registration successful. Please login.');
            return res.redirect('/login');
        }
        throw new Error('Registration failed - no rows affected');
        
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


// Jenelle
app.get('/', (req, res) => {
  connection.query('SELECT * FROM modules', (err, modules) => {
    if (err) return res.send('Error loading modules');

    connection.query('SELECT * FROM components', (err2, components) => {
      if (err2) return res.send('Error loading components');

      res.render('index', { modules, components });
    });
  });
});

app.get('/moduleDetails', (req, res) => {
  connection.query('SELECT * FROM modules', (err, modules) => {
    if (err) return res.send('Error loading modules');

    connection.query('SELECT * FROM components', (err2, components) => {
      if (err2) return res.send('Error loading components');

      res.render('moduleDetails', {
        modules,
        components
      });
    });
  });
});

app.get('/moduleDetails/:id', (req, res) => {
  const moduleId = req.params.id;
  const sqlm = 'SELECT * FROM modules WHERE module_id = ?';
  const sqlc = 'SELECT * FROM components WHERE module_id = ?';
  connection.query(sqlm, [moduleId], (err, moduleResults) => {
    if (err || moduleResults.length === 0) {
      return res.status(404).send('Module not found');
    }
    connection.query(sqlc, [moduleId], (err2, componentResults) => {
      if (err2) {
        return res.status(500).send('Error loading components');
      }

      res.render('moduleDetails', {
        modules: moduleResults[0], 
        components: componentResults
      });
    });
  });
});

app.get('/editCurrentModule/:id', (req, res) => {
  const moduleId = req.params.id;
  const sqlm = 'SELECT * FROM modules WHERE module_id = ?';
  const sqlc = 'SELECT * FROM components WHERE module_id = ?';

  connection.query(sqlm, [moduleId], (error, moduleResults) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error retrieving module');
    }
    if (moduleResults.length === 0) {
      return res.status(404).send('Module not found');
    }
    const module = moduleResults[0];

    connection.query(sqlc, [moduleId], (error2, componentResults) => {
      if (error2) {
        console.error('Component query error:', error2.message);
        return res.status(500).send('Error retrieving components');
      }
      res.render('editCurrentModule', {
        modules: module,
        components: componentResults
      });
    });
  });
});

app.post('/editCurrentModule/:id', (req, res) => {
  console.log(req.body);
  const moduleId = req.params.id;
  const { module_name, module_code, component_id, component_name, grade, weightage } = req.body;
  const updateModuleSQL = 'UPDATE modules SET module_name = ?, module_code = ? WHERE module_id = ?';

  connection.query(updateModuleSQL, [module_name, module_code, moduleId], (error) => {
    if (error) {
      console.error('Error updating module:', error.message);
      return res.status(500).send('Error updating module: ' + error.message);
    }

    if (component_name && grade && weightage) {
      if (component_id) {
        const updateComponentSQL = 'UPDATE components SET component_name = ?, grade = ?, weightage = ? WHERE component_id = ? AND module_id = ?';
        connection.query(updateComponentSQL, [component_name, grade, weightage, component_id, moduleId], (error2) => {
          if (error2) {
            console.error('Error updating component:', error2.message);
            return res.status(500).send('Error updating component: ' + error2.message);
          }
          res.redirect('/editCurrentModule/' + moduleId);
        });
      } else {
        const insertComponentSQL = 'INSERT INTO components (component_name, grade, weightage, module_id) VALUES (?, ?, ?, ?)';
        connection.query(insertComponentSQL, [component_name, grade, weightage, moduleId], (error3) => {
          if (error3) {
            console.error('Error inserting component:', error3.message);
            return res.status(500).send('Error adding component: ' + error3.message);
          }
          res.redirect('/editCurrentModule/' + moduleId);
        });
      }
    } else {
      res.redirect('/editCurrentModule/' + moduleId);
    }
  });
});

app.post('/updateModuleInfo/:id', (req, res) => {
  const moduleId = req.params.id;
  const { module_name, module_code } = req.body;

  const sql = 'UPDATE modules SET module_name = ?, module_code = ? WHERE module_id = ?';
  connection.query(sql, [module_name, module_code, moduleId], (err) => {
    if (err) throw err;
    res.redirect('/moduleDetails/' + moduleId);
  });
});


app.get('/deleteComponent/:id', (req, res) => {
  const componentId = req.params.id;
  const moduleId = req.query.module_id;
  const deleteQuery = 'DELETE FROM components WHERE id = ?';

  connection.query(deleteQuery, [componentId], (error, results) => {
    if (error) {
      console.error("Error deleting component:", error);
      res.status(500).send('Error deleting component');
    } else {
      res.redirect('/editCurrentModule/' + moduleId);
    }
  });
});

app.post('/editComponent', (req, res) => {
  const componentId = parseInt(req.body.component_id);
  const moduleId = parseInt(req.body.module_id);
  const componentName = req.body.component_name;
  const grade = req.body.grade;
  const weightage = parseInt(req.body.weightage);

  const sql = `UPDATE components 
             SET component_name = ?, grade = ?, weightage = ? 
             WHERE id = ? AND module_id = ?`;

  connection.query(sql, [componentName, grade, weightage, componentId, moduleId], (error) => {
    if (error) {
      console.error('Error updating component:', error.message);
      return res.status(500).send('Failed to update component');
    }
    res.redirect(`/editCurrentModule/${moduleId}`);
  });
});


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