// app.js
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const methodOverride = require('method-override');
const morgan = require('morgan');

// database connection
const db = require('./db');

// Set the view engine to ejs

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(morgan('combined'));

// Secret key for JWT
const secretKey = 'your-secret-key';

// Middleware to check if the user is authenticated
const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        // Invalid token
        res.redirect('/login');
      } else {
        // Valid token, user is authenticated
        req.user = decoded;
        next();
      }
    });
  } else {
    // No token, user is not authenticated
    res.redirect('/login');
  }
};

// Middleware to generate a JWT token and set it as a cookie
const generateToken = (user) => {
  return jwt.sign(user, secretKey, { expiresIn: '1h' });
};

// Read all users
app.get('/users', authenticateUser, (req, res) => {
  // Your existing code to fetch users
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // console.log("running", results);
    res.render('index', { users: results });
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

// Handle login form submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Hardcoded credentials for demonstration purposes
  const hardcodedUsername = 'admin';
  const hardcodedPassword = 'password';

  if (username === hardcodedUsername && password === hardcodedPassword) {
    // Successful login
    const user = { username: hardcodedUsername };
    const token = generateToken(user);

    // Set the token as a cookie
    res.cookie('token', token);

    res.redirect('/users');
  } else {
    // Failed login
    res.render('login', { error: 'Invalid username or password' });
  }
});

//delete a user
app.delete('/users/:id', (req, res) => {
  console.log("In delete");
  const userId = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.redirect('/users');
  });
});


// Create a new user form
app.get('/users/new', (req, res) => {
  console.log("In create file");
  res.render('create');
});

// Create a new user
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  console.log(req.body);

  // Validate input (add more validation if needed)

  // Insert the new user into the database
  db.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Redirect to the home page or wherever you want after successful creation
    res.redirect('/users');
  });
});


// Read a single user
app.get('/users/:id', (req, res) => {
  console.log("In single user");
  const userId = req.params.id;
  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.render('user', { user: results[0] });
  });
});


// Edit user form
app.get('/users/:id/edit', (req, res) => {
  const userId = req.params.id;
  db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.render('edit', { user: results[0] });
  });
});

// Update a user
app.put('/users/:id', (req, res) => {
  console.log("In put ");
  const userId = req.params.id;
  const { name, email } = req.body;
  db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId], (err, results) => {
    console.log("Nahi hora");
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.redirect('/users');
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
