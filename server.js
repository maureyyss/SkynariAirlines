const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const db = new sqlite3.Database('database.db');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); 
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    secret: 'secretkey123',
    resave: false,
    saveUninitialized: true
}));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        origin TEXT,
        destination TEXT,
        departure_date TEXT,
        return_date TEXT,
        adults INTEGER,
        children INTEGER,
        infants INTEGER,
        travel_class TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.get('/', (req, res) => {
    res.render('login', { error: null, message: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (row) {
            req.session.username = username;
            res.redirect('/index');
        } else {
            res.render('login', { error: "Invalid username or password", message: null });
        }
    });
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function (err) {
        if (err) {
            res.render('login', { error: "Username already exists", message: null });
        } else {
            res.render('login', { error: null, message: "Account created successfully!" });
        }
    });
});

app.get('/index', (req, res) => {
    if (req.session.username) {
        res.render('index', { username: req.session.username, message: null });
    } else {
        res.redirect('/');
    }
});

app.get('/flights', (req, res) => {
    if (req.session.username) {
        res.render('flights', { username: req.session.username });
    } else {
        res.redirect('/');
    }
});

app.get('/about', (req, res) => {
    if (req.session.username) {
        res.render('about', { username: req.session.username });
    } else {
        res.redirect('/');
    }
});

app.get('/contact', (req, res) => {
    if (req.session.username) {
        res.render('contact', { username: req.session.username, error: null, success: null });
    } else {
        res.redirect('/');
    }
});

app.post('/contact-submit', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/');
    }

    const { name, email, subject, message } = req.body;
    const username = req.session.username;

    if (!name || !email || !message) {
        return res.render('contact', { username, error: 'Please fill in all required fields.', success: null });
    }

    db.run(
        `INSERT INTO contact_messages (username, name, email, subject, message) VALUES (?, ?, ?, ?, ?)`,
        [username, name, email, subject, message],
        function(err) {
            if (err) {
                console.error(err);
                return res.render('contact', { username, error: 'Failed to submit your message.', success: null });
            }
            res.render('contact', { username, error: null, success: 'Your message has been sent. Thank you!' });
        }
    );
});

app.post('/book', (req, res) => {
    if (!req.session.username) return res.redirect('/');

    const {
        from, to, departure, return: returnDate,
        adults, children, infants, class: travelClass
    } = req.body;

    db.run(`INSERT INTO bookings 
        (username, origin, destination, departure_date, return_date, adults, children, infants, travel_class) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        req.session.username, from, to, departure, returnDate,
        adults, children, infants, travelClass
    ], function (err) {
        if (err) {
            console.error(err);
            return res.render('index', { username: req.session.username, message: 'Booking failed. Try again.' });
        }
        res.render('index', { username: req.session.username, message: "Your booking was successful! Thank you for choosing Skynari Airlines." });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});
