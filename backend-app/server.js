const express = require('express'), mongoose = require('mongoose'), cors = require('cors');

const app = express(); app.use(cors()); app.use(express.json());
const mongoUrl = 'mongodb://127.0.0.1:27017/librarydb';
mongoose.connect(mongoUrl).then(function () { console.log('Connected to MongoDB'); }).catch(function (err) { console.log('MongoDB error:', err); });

const Book = mongoose.model('Book', new mongoose.Schema({
  bookId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, default: 'Available' },
  borrowerName: { type: String, default: '' },
  registerNumber: { type: String, default: '' },
  phone: { type: String, default: '' },
  dueDate: { type: Date, default: null }
}));

// Validate register number format (e.g. URK23CS3001)
function isValidRegNo(reg) {
  return /^[A-Z]{3}\d{2}[A-Z]{2}\d{4}$/.test(reg);
}

// View books with search and filter
app.get('/api/viewBooks', async function (req, res) {
  try {
    let filter = {};
    if (req.query.search) {
      filter.$or = [{ title: { $regex: req.query.search, $options: 'i' } }, { author: { $regex: req.query.search, $options: 'i' } }];
    }
    if (req.query.status && req.query.status !== 'All') { filter.status = req.query.status; }
    res.json(await Book.find(filter));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add a book
app.post('/api/addBook', async function (req, res) {
  try {
    if (!req.body.bookId || !req.body.title || !req.body.author || !req.body.category) return res.status(400).json({ error: 'All fields are required.' });
    if (await Book.findOne({ bookId: req.body.bookId.trim() })) return res.status(400).json({ error: 'Book ID already exists.' });
    const book = new Book({ bookId: req.body.bookId.trim(), title: req.body.title.trim(), author: req.body.author.trim(), category: req.body.category.trim(), status: 'Available' });
    await book.save();
    res.json(book);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Check all books currently held by a student (case-insensitive)
app.get('/api/checkStudent', async function (req, res) {
  try {
    if (!req.query.registerNumber) return res.status(400).json({ error: 'Register number is required.' });
    const reg = req.query.registerNumber.trim().toUpperCase();
    if (!isValidRegNo(reg)) return res.status(400).json({ error: 'Invalid register number format (e.g. URK23CS3001).' });
    const books = await Book.find({ registerNumber: reg, status: 'Issued' });
    res.json(books);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Borrow a book (format check, case-insensitive, student name consistency)
app.post('/api/borrowBook', async function (req, res) {
  try {
    if (!req.body.bookId || !req.body.borrowerName || !req.body.registerNumber || !req.body.phone) return res.status(400).json({ error: 'All fields are required.' });
    const reg = req.body.registerNumber.trim().toUpperCase();
    const name = req.body.borrowerName.trim();
    if (!isValidRegNo(reg)) return res.status(400).json({ error: 'Invalid register number format (e.g. URK23CS3001).' });
    if (req.body.phone.length !== 10 || isNaN(req.body.phone)) return res.status(400).json({ error: 'Phone must be exactly 10 digits.' });

    // Compare name with earlier entry for this register number
    const prevBook = await Book.findOne({ registerNumber: reg, status: 'Issued' });
    if (prevBook && prevBook.borrowerName.toLowerCase() !== name.toLowerCase()) {
      return res.status(400).json({ error: 'Name does not match previous record for ' + reg + ' (' + prevBook.borrowerName + ').' });
    }

    const count = await Book.countDocuments({ registerNumber: reg, status: 'Issued' });
    if (count >= 3) return res.status(400).json({ error: 'You can borrow only 3 books at a time' });

    const book = await Book.findOne({ bookId: req.body.bookId.trim() });
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    if (book.status === 'Issued') return res.status(400).json({ error: 'Book is already issued.' });

    let dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14);
    book.status = 'Issued'; book.borrowerName = name; book.registerNumber = reg; book.phone = req.body.phone.trim(); book.dueDate = dueDate;
    await book.save();
    res.json(book);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Return a book
app.post('/api/returnBook', async function (req, res) {
  try {
    if (!req.body.bookId || !req.body.registerNumber) return res.status(400).json({ error: 'All fields are required.' });
    const reg = req.body.registerNumber.trim().toUpperCase();
    const book = await Book.findOne({ bookId: req.body.bookId.trim() });
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    if (book.status !== 'Issued' || book.registerNumber !== reg) return res.status(400).json({ error: 'This is not a book you borrowed.' });
    book.status = 'Available'; book.borrowerName = ''; book.registerNumber = ''; book.phone = ''; book.dueDate = null;
    await book.save();
    res.json({ message: 'Book returned successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete a book
app.post('/api/deleteBook', async function (req, res) {
  try {
    const book = await Book.findById(req.body.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    if (book.status === 'Issued') return res.status(400).json({ error: 'Cannot delete an issued book.' });
    await Book.findByIdAndDelete(req.body.id);
    res.json({ message: 'Book deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(5000, function () { console.log('Server running on port 5000'); });