import React, { useState, useEffect } from 'react'
import axios from 'axios'
var API = 'http://localhost:5000/api'

function App() {
  // book form states
  const [bookId, setBookId] = useState('')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState('Computer Science')
  // borrow/return states
  const [regNo, setRegNo] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [checked, setChecked] = useState(false)
  const [heldBooks, setHeldBooks] = useState([])
  const [targetId, setTargetId] = useState('')
  // book list states
  const [books, setBooks] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')

  async function viewBooks() {
    try {
      var q = '?search=' + search + '&status=' + status
      setBooks((await axios.get(API + '/viewBooks' + q)).data)
    } catch (err) { alert('Error fetching books') }
  }
  useEffect(function() { viewBooks() }, [status])

  async function addBook(e) {
    e.preventDefault()
    if (!bookId || !title || !author || !category) {
      return alert('All fields are required.')
    }
    try {
      await axios.post(API + '/addBook', { bookId, title, author, category })
      alert('Book added successfully')
      setBookId(''); setTitle(''); setAuthor(''); viewBooks()
    } catch (err) {
      alert(err.response ? err.response.data.error : 'Failed to add book')
    }
  }

  async function checkStudent(e) {
    if (e) { e.preventDefault() }
    if (!regNo || !name || !phone) { return alert('All fields are required.') }
    if (phone.length !== 10 || isNaN(phone)) {
      return alert('Phone must be exactly 10 digits.')
    }
    try {
      var url = API + '/checkStudent?registerNumber=' + regNo
      setHeldBooks((await axios.get(url)).data); setChecked(true)
    } catch (err) { alert('Error checking student') }
  }

  async function borrowBook() {
    if (!targetId) { return alert('Please enter Book ID.') }
    if (heldBooks.length >= 3) { return alert('You can borrow only 3 books at a time') }
    try {
      var res = await axios.post(API + '/borrowBook', {
        bookId: targetId, borrowerName: name,
        registerNumber: regNo, phone: phone })
      alert('Book issued. Due date: ' + res.data.dueDate.substring(0, 10))
      setTargetId(''); viewBooks(); checkStudent()
    } catch (err) {
      alert(err.response ? err.response.data.error : 'Failed to borrow book')
    }
  }

  async function returnBook() {
    if (!targetId) { return alert('Please enter Book ID.') }
    var match = heldBooks.some(function(b) { return b.bookId === targetId.trim() })
    if (!match) { return alert('This is not a book you borrowed') }
    try {
      await axios.post(API + '/returnBook', { bookId: targetId, registerNumber: regNo })
      alert('Book returned successfully')
      setTargetId(''); viewBooks(); checkStudent()
    } catch (err) {
      alert(err.response ? err.response.data.error : 'Failed to return book')
    }
  }

  function resetCard() {
    setRegNo(''); setName(''); setPhone('')
    setChecked(false); setHeldBooks([]); setTargetId('')
  }

  async function deleteBook(id) {
    try {
      await axios.post(API + '/deleteBook', { id: id })
      alert('Book deleted successfully'); viewBooks()
    } catch (err) {
      alert(err.response ? err.response.data.error : 'Failed to delete book')
    }
  }

  function inp(v, set, ph) {
    return <input className="form-control" placeholder={ph}
      value={v} onChange={(e) => set(e.target.value)} />
  }
  function btn(cls, fn, txt) {
    return <button type="button" className={cls} onClick={fn}>{txt}</button>
  }

  return (
    <div className="container py-4">
    <h1 className="text-center mb-4">Library Management System</h1>
    <div className="card p-3 mb-4"><h4>Add Book</h4>
      <form onSubmit={addBook}><div className="row g-2 mb-3">
        <div className="col-md-3">{inp(bookId, setBookId, 'Book ID')}</div>
        <div className="col-md-3">{inp(title, setTitle, 'Title')}</div>
        <div className="col-md-3">{inp(author, setAuthor, 'Author')}</div>
        <div className="col-md-3"><select className="form-select" value={category}
          onChange={(e) => setCategory(e.target.value)}>
          <option>Computer Science</option><option>Fiction</option>
          <option>Science</option><option>History</option></select></div></div>
        <button type="submit" className="btn btn-primary me-2">Add Book</button>
        {btn('btn btn-secondary',
          () => { setBookId(''); setTitle(''); setAuthor('') }, 'Clear Form')}
      </form></div>
    <div className="card p-3 mb-4"><h4>Borrow or Return Book</h4>
      {!checked ? (
        <form onSubmit={checkStudent}><div className="row g-2 mb-3">
          <div className="col-md-4">{inp(regNo, setRegNo, 'Register Number')}</div>
          <div className="col-md-4">{inp(name, setName, 'Student Name')}</div>
          <div className="col-md-4">{inp(phone, setPhone, 'Phone Number')}</div>
        </div><button type="submit" className="btn btn-primary">Check</button></form>
      ) : (<div>
        {heldBooks.length === 0
          ? <p className="text-muted mb-2">You have no books issued.</p>
          : <div><p className="text-muted mb-1">Books you currently have:</p>
              <ul className="mb-2">{heldBooks.map(function(b) {
                return <li key={b._id}>{b.bookId} - {b.title}</li>
              })}</ul></div>}
        <div className="row g-2 mb-3"><div className="col-md-4">
          {inp(targetId, setTargetId, 'Book ID')}</div></div>
        {btn('btn btn-primary me-2', borrowBook, 'Borrow')}
        {btn('btn btn-secondary me-2', returnBook, 'Return')}
        {btn('btn btn-secondary', resetCard, 'Cancel')}
      </div>)}</div>
    <div className="card p-3 mb-4"><h4>Book List</h4>
      <form onSubmit={function(e) { e.preventDefault(); viewBooks() }}
        className="row g-2 mb-3">
        <div className="col-md-8">{inp(search, setSearch, 'Search title or author')}</div>
        <div className="col-md-2"><select className="form-select" value={status}
          onChange={(e) => setStatus(e.target.value)}>
          <option value="All">All</option>
          <option value="Available">Available</option>
          <option value="Issued">Issued</option></select></div>
        <div className="col-md-2">
          <button type="submit" className="btn btn-primary w-100">Search</button></div></form>
      <table className="table table-bordered"><thead><tr>
        <th>Book ID</th><th>Title</th><th>Author</th><th>Category</th>
        <th>Status</th><th>Borrower</th><th>Due Date</th><th>Action</th></tr></thead>
        <tbody>{books.map(function(b) {
          var who = b.borrowerName ? b.borrowerName + ' (' + b.registerNumber + ')' : '-'
          var due = b.dueDate ? b.dueDate.substring(0, 10) : '-'
          return (<tr key={b._id}><td>{b.bookId}</td><td>{b.title}</td><td>{b.author}</td>
            <td>{b.category}</td><td>{b.status}</td><td>{who}</td><td>{due}</td>
            <td>{btn('btn btn-danger', () => deleteBook(b._id), 'Delete')}</td></tr>)
        })}</tbody></table></div>
    </div>)
}

export default App
