import { useState, useEffect, useRef } from 'react'
import { auth, provider, db } from './firebase'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore'
import './App.css'

const OWNER_EMAIL = 'aemotioon@gmail.com'

function formatIDR(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID')
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [page, setPage] = useState('invoices')
  const [companies, setCompanies] = useState([])
  const [invoices, setInvoices] = useState([])
  const [logo, setLogo] = useState('')
  const [editingCompany, setEditingCompany] = useState(null)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [formMode, setFormMode] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [allowedEmails, setAllowedEmails] = useState([])
  const logoRef = useRef()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const ref = doc(db, 'allowed_users', u.email)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          setAllowed(true)
          loadData(u.email)
        } else {
          setAllowed(false)
        }
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function loadData(email) {
    const compSnap = await getDocs(collection(db, 'companies'))
    setCompanies(compSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    const invSnap = await getDocs(collection(db, 'invoices'))
    setInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    const settSnap = await getDoc(doc(db, 'settings', 'logo'))
    if (settSnap.exists()) setLogo(settSnap.data().url || '')
    const userSnap = await getDocs(collection(db, 'allowed_users'))
    setAllowedEmails(userSnap.docs.map(d => d.id))
  }

  async function login() {
    try { await signInWithPopup(auth, provider) }
    catch (e) { alert('Login gagal: ' + e.message) }
  }

  async function logout() {
    await signOut(auth)
    setUser(null)
    setAllowed(false)
  }

  async function saveCompany(c) {
    await setDoc(doc(db, 'companies', c.id), c)
    setCompanies(prev => prev.find(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [...prev, c])
    setShowCompanyModal(false)
    setEditingCompany(null)
  }

  async function deleteCompany(id) {
    if (!confirm('Hapus perusahaan ini?')) return
    await deleteDoc(doc(db, 'companies', id))
    setCompanies(prev => prev.filter(c => c.id !== id))
  }

  async function saveInvoice(inv) {
    await setDoc(doc(db, 'invoices', inv.id), inv)
    setInvoices(prev => prev.find(x => x.id === inv.id) ? prev.map(x => x.id === inv.id ? inv : x) : [...prev, inv])
    setFormMode(false)
    setEditingInvoice(null)
    alert('Invoice tersimpan!')
  }

  async function deleteInvoice(id) {
    if (!confirm('Hapus invoice ini?')) return
    await deleteDoc(doc(db, 'invoices', id))
    setInvoices(prev => prev.filter(i => i.id !== id))
  }

  async function saveLogo(dataUrl) {
    setLogo(dataUrl)
    await setDoc(doc(db, 'settings', 'logo'), { url: dataUrl })
  }

  async function addAllowedEmail(email) {
    const e = email.trim().toLowerCase()
    if (!e) return
    await setDoc(doc(db, 'allowed_users', e), { name: e })
    setAllowedEmails(prev => [...new Set([...prev, e])])
  }

  async function removeAllowedEmail(email) {
    if (email === OWNER_EMAIL) return
    if (!confirm('Hapus akses ' + email + '?')) return
    await deleteDoc(doc(db, 'allowed_users', email))
    setAllowedEmails(prev => prev.filter(e => e !== email))
  }

  function handleLogo(e) {
    const f = e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = ev => saveLogo(ev.target.result)
    r.readAsDataURL(f)
  }

  if (loading) return (
    <div className="center-screen">
      <p>Memuat...</p>
    </div>
  )

  if (!user) return (
    <div className="center-screen">
      <div className="login-card">
        <div className="login-icon">📄</div>
        <h2>Invoice Maker</h2>
        <p className="sub">Maks Idea Factory — akses terbatas</p>
        <button className="btn-google" onClick={login}>
          <span>G</span> Masuk dengan Google
        </button>
      </div>
    </div>
  )

  if (!allowed) return (
    <div className="center-screen">
      <div className="login-card">
        <div className="login-icon">🚫</div>
        <h2>Akses Ditolak</h2>
        <p className="sub">Email <b>{user.email}</b> tidak diizinkan.<br />Hubungi admin untuk mendapatkan akses.</p>
        <button className="btn" onClick={logout}>Keluar</button>
      </div>
    </div>
  )

  if (viewingInvoice) return (
    <div className="print-wrap">
      <div className="no-print toolbar">
        <button className="btn" onClick={() => setViewingInvoice(null)}>←
