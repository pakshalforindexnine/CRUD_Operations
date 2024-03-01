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

app.get('/login', (req, res) => {
  res.render('login', { signupButton: true });
});

function Authenticate(name, password, callback) {
  db.query('SELECT * FROM users WHERE name = ? AND password = ?', [name, password], (err, results) => {
    if (err) {
      // Handle database error
      callback(err, false);
    } else {
      // Check if results contain any rows (i.e., valid credentials)
      const isValid = results.length > 0;
      callback(null, isValid);
    }
  });
}

// Handle login form submission
app.post('/login', (req, res) => {
  const { name, password } = req.body;
  console.log(req.body)

  Authenticate(name, password, (err, isValid) => {
    if (err) {
      // Handle database error
      res.status(500).json({ error: err.message });
    } else if (isValid) {
      // Successful login
      const user = { name: name };
      const token = generateToken(user);

      // Set the token as a cookie
      res.cookie('token', token);
      res.redirect('/users');
    } else {
      // Failed login
      res.render('login', { error: 'Invalid username or password' });
    }
  });
});


app.get('/signup', (req, res) => {
  res.render('signup', { loginButton: true });
});

// Handle user registration
app.post('/signup', (req, res) => {
  const { name, password, email } = req.body;

  // Check if the username or email already exists in the database
  db.query('SELECT * FROM users WHERE name =? or email = ?', [name, email], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (results.length > 0) {
      // User with the same username or email already exists
      return res.render('signup', { error: 'Username or email already in use', loginButton: true });
    }

    // If the username or email is unique, proceed with registration
    db.query('INSERT INTO users (name, password, email) VALUES (?, ?, ?)', [name, password, email], (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // Redirect to the login page after successful registration
      res.redirect('/login');
    });
  });
});

// Logout route
app.get('/logout', (req, res) => {
  res.clearCookie('token'); // Clear the token cookie
  res.redirect('/login'); 
});

// Read all users
app.get('/users', authenticateUser, (req, res) => {
  // Your existing code to fetch users
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    console.log("Request User: ", req.user.name);
    res.render('index', { users: results, authUser: req.user.name });
  });
});

// Create a new user form
app.get('/users/new', authenticateUser, (req, res) => {
  res.render('create');
});

// Create a new user
app.post('/users', authenticateUser, (req, res) => {
  const { name, email } = req.body;

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
app.get('/users/:id', authenticateUser, (req, res) => {
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
app.get('/users/:id/edit', authenticateUser, (req, res) => {
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

// Edit a user
app.put('/users/:id', authenticateUser, (req, res) => {
  console.log("In put ");
  const userId = req.params.id;
  const { name, email } = req.body;
  db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, userId], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.redirect('/users');
  });
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


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});



/*

(/)       -- home
(/login)  -- login
(/signup) -- signup
(/view)   -- view
(/edit)   -- edit
()

*/ 