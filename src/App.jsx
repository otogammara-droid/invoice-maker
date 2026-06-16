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
        <button className="btn" onClick={() => setViewingInvoice(null)}>← Kembali</button>
        <button className="btn-primary btn" onClick={() => window.print()}>🖨 Print / PDF</button>
      </div>
      <InvoicePreview invoice={viewingInvoice} companies={companies} logo={logo} />
    </div>
  )

  return (
    <div className="app-layout">
      <div className="sidebar no-print">
        <div className="sidebar-brand">
          <span>📄</span>
          <div>
            <div className="brand-name">Invoice Maker</div>
            <div className="brand-sub">Maks Idea Factory</div>
          </div>
        </div>
        <button className={'sidebar-item' + (page === 'invoices' ? ' active' : '')} onClick={() => { setPage('invoices'); setFormMode(false); setEditingInvoice(null) }}>📋 Invoice</button>
        <button className={'sidebar-item' + (page === 'companies' ? ' active' : '')} onClick={() => setPage('companies')}>🏢 Perusahaan</button>
        <button className={'sidebar-item' + (page === 'settings' ? ' active' : '')} onClick={() => setPage('settings')}>⚙️ Pengaturan</button>
        <div className="sidebar-footer">
          <img src={user.photoURL} className="avatar-img" referrerPolicy="no-referrer" />
          <div className="user-info">
            <div className="user-name">{user.displayName}</div>
            <div className="user-email">{user.email}</div>
          </div>
          <button className="btn btn-sm" onClick={logout}>Keluar</button>
        </div>
      </div>

      <div className="main">
        {page === 'invoices' && !formMode && (
          <InvoiceList invoices={invoices} companies={companies}
            onNew={() => setFormMode(true)}
            onView={setViewingInvoice}
            onEdit={inv => { setEditingInvoice(inv); setFormMode(true) }}
            onDelete={deleteInvoice} />
        )}
        {page === 'invoices' && formMode && (
          <InvoiceForm invoice={editingInvoice} companies={companies} logo={logo}
            onSave={saveInvoice}
            onCancel={() => { setFormMode(false); setEditingInvoice(null) }} />
        )}
        {page === 'companies' && (
          <CompanyList companies={companies}
            onAdd={() => { setEditingCompany(null); setShowCompanyModal(true) }}
            onEdit={c => { setEditingCompany(c); setShowCompanyModal(true) }}
            onDelete={deleteCompany} />
        )}
        {page === 'settings' && (
          <Settings logo={logo} logoRef={logoRef} onLogoChange={handleLogo}
            onLogoClear={() => saveLogo('')}
            allowedEmails={allowedEmails}
            ownerEmail={OWNER_EMAIL}
            onAddEmail={addAllowedEmail}
            onRemoveEmail={removeAllowedEmail} />
        )}
      </div>

      {showCompanyModal && (
        <CompanyModal company={editingCompany}
          onSave={saveCompany}
          onClose={() => { setShowCompanyModal(false); setEditingCompany(null) }} />
      )}
    </div>
  )
}

function InvoiceList({ invoices, companies, onNew, onView, onEdit, onDelete }) {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Daftar Invoice</h2>
        <button className="btn-primary btn" onClick={onNew}>+ Buat Invoice Baru</button>
      </div>
      {invoices.length === 0 && (
        <div className="empty-state">
          <p>📄</p>
          <p>Belum ada invoice. Klik 'Buat Invoice Baru' untuk mulai.</p>
        </div>
      )}
      {invoices.length > 0 && (
        <div className="card table-card">
          <table>
            <thead>
              <tr><th>No. Invoice</th><th>Tanggal</th><th>Kepada</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td><span className="badge badge-blue">{inv.invNo || '—'}</span></td>
                  <td>{new Date(inv.date).toLocaleDateString('id-ID')}</td>
                  <td>{(companies.find(c => c.id === inv.recipientId) || { name: inv.recipientName || '—' }).name}</td>
                  <td><b>{formatIDR(inv.total)}</b></td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm" onClick={() => onView(inv)}>👁 Lihat</button>
                      <button className="btn btn-sm" onClick={() => onEdit(inv)}>✏️</button>
                      <button className="btn btn-sm danger" onClick={() => onDelete(inv.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function InvoiceForm({ invoice, companies, onSave, onCancel }) {
  const blankItem = () => ({ id: genId(), desc: '', qty: 1, price: 0 })
  const [form, setForm] = useState(invoice || {
    id: genId(), invNo: '', date: new Date().toISOString().slice(0, 10),
    spksNo: '', senderId: '', recipientId: '', recipientName: '',
    recipientAddress: '', items: [blankItem()], notes: ''
  })

  const sender = companies.find(c => c.id === form.senderId)
  const recipient = companies.find(c => c.id === form.recipientId)
  const total = form.items.reduce((s, it) => s + (it.qty || 0) * (it.price || 0), 0)

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setItem = (idx, k, v) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [k]: v } : it) }))
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, blankItem()] }))
  const removeItem = idx => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

  useEffect(() => {
    if (form.recipientId) {
      const c = companies.find(x => x.id === form.recipientId)
      if (c) setForm(f => ({ ...f, recipientName: c.name, recipientAddress: c.address }))
    }
  }, [form.recipientId])

  return (
    <div className="page">
      <div className="page-header">
        <h2>{invoice ? 'Edit Invoice' : 'Invoice Baru'}</h2>
        <div className="action-btns">
          <button className="btn" onClick={onCancel}>Batal</button>
          <button className="btn-primary btn" onClick={() => onSave({ ...form, total })}>💾 Simpan</button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Info Invoice</div>
        <div className="grid2">
          <div><label>No. Invoice</label><input value={form.invNo} onChange={setF('invNo')} placeholder="INV/2026/04/001" /></div>
          <div><label>Tanggal</label><input type="date" value={form.date} onChange={setF('date')} /></div>
          <div><label>No. SPKS / PO</label><input value={form.spksNo} onChange={setF('spksNo')} placeholder="Opsional" /></div>
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <div className="section-title">Dari (Pengirim)</div>
          <label>Pilih Perusahaan</label>
          <select value={form.senderId} onChange={setF('senderId')}>
            <option value="">— Default (CV. MAKS IDEA FACTORY) —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {sender && (
            <div className="company-preview">
              <b>{sender.name}</b>
              <p>{sender.address}</p>
              {sender.bank && <p>Bank: {sender.bank} - {sender.bankCabang}</p>}
              {sender.accountNo && <p>Rek: {sender.accountNo} a/n {sender.accountName}</p>}
            </div>
          )}
        </div>
        <div className="card">
          <div className="section-title">Kepada (Penerima)</div>
          <label>Pilih Perusahaan</label>
          <select value={form.recipientId} onChange={setF('recipientId')}>
            <option value="">— Ketik Manual —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {!form.recipientId && (
            <div className="mt8">
              <label>Nama</label><input value={form.recipientName} onChange={setF('recipientName')} placeholder="PT. DJARUM" />
              <label>Alamat</label><textarea value={form.recipientAddress} onChange={setF('recipientAddress')} rows={2} placeholder="Jl. ..." />
            </div>
          )}
          {recipient && (
            <div className="company-preview">
              <b>{recipient.name}</b>
              <p>{recipient.address}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Item / Keterangan</div>
        <div className="items-header">
          <span>Deskripsi</span><span>Qty</span><span>Harga Satuan</span><span>Total</span><span></span>
        </div>
        {form.items.map((it, idx) => (
          <div key={it.id} className="item-row">
            <input value={it.desc} onChange={e => setItem(idx, 'desc', e.target.value)} placeholder="Keterangan..." />
            <input type="number" value={it.qty} onChange={e => setItem(idx, 'qty', +e.target.value)} min={0} />
            <input type="number" value={it.price} onChange={e => setItem(idx, 'price', +e.target.value)} min={0} />
            <span className="item-total">{formatIDR(it.qty * it.price)}</span>
            <button className="btn btn-sm danger" onClick={() => removeItem(idx)}>✕</button>
          </div>
        ))}
        <button className="btn btn-sm" onClick={addItem} style={{ marginTop: 8 }}>+ Tambah Item</button>
        <div className="total-row">
          <span>TOTAL</span>
          <span className="total-amount">{formatIDR(total)}</span>
        </div>
      </div>

      <div className="card">
        <label>Catatan (opsional)</label>
        <textarea value={form.notes} onChange={setF('notes')} rows={2} placeholder="Catatan tambahan..." />
      </div>
    </div>
  )
}

function InvoicePreview({ invoice, companies, logo }) {
  const sender = companies.find(c => c.id === invoice.senderId)
  const recipient = companies.find(c => c.id === invoice.recipientId)
  const recipientName = recipient ? recipient.name : invoice.recipientName
  const recipientAddr = recipient ? recipient.address : invoice.recipientAddress
  const bank = sender || { bank: 'Bank Central Asia', bankCabang: 'Makassar', accountNo: '7892824889', accountName: 'MAKS IDEA FACTORY CV' }
  const senderName = sender ? sender.name : 'CV. MAKS IDEA FACTORY'

  return (
    <div className="invoice-preview">
      <div className="inv-header">
        <h1 className="inv-title">INVOICE</h1>
        {logo ? <img src={logo} className="inv-logo" /> : (
          <div className="inv-sender-info">
            <b>{senderName}</b>
            <p>{sender?.address || 'JL. BORONG RAYA KOMP. GRAHA INDAH FAMILY BLOK A15'}</p>
            <p>{sender?.phone || '085299119999'}</p>
            <p>{sender?.email || 'masif.id.official@gmail.com'}</p>
          </div>
        )}
      </div>
      <div className="inv-meta">
        <div><span>INV NO:</span><span>{invoice.invNo || '—'}</span></div>
        <div><span>DATE</span><span>{new Date(invoice.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</span></div>
        <div><span>SPKS/SPKS NO</span><span>{invoice.spksNo || '—'}</span></div>
      </div>
      <div className="inv-recipient">
        <div>KEPADA</div>
        <div>{recipientName || '—'}</div>
        <div>{recipientAddr || '—'}</div>
      </div>
      <table className="inv-table">
        <thead>
          <tr><th>KETERANGAN</th><th>HARGA</th><th>JML</th><th>TOTAL</th></tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={i}>
              <td>{it.desc || '—'}</td>
              <td>{Number(it.price).toLocaleString('id-ID')}</td>
              <td>{it.qty}</td>
              <td>{Number(it.qty * it.price).toLocaleString('id-ID')}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3}><b>TOTAL</b></td><td><b>{Number(invoice.total).toLocaleString('id-ID')}</b></td></tr>
        </tfoot>
      </table>
      <div className="inv-footer">
        <div className="inv-payment">
          <b>Payment via</b>
          <p>Bank : {bank.bank || '—'}</p>
          <p>Cabang : {bank.bankCabang || '—'}</p>
          <p>No. A/C : {bank.accountNo || '—'}</p>
          <p>Atas Nama : {bank.accountName || '—'}</p>
        </div>
        <div className="inv-sign">
          <p><b>HORMAT KAMI,</b></p>
          <br /><br /><br />
          <p><b>{sender?.signerName || 'AEDY MAWARDI'}</b></p>
        </div>
      </div>
      {invoice.notes && <div className="inv-notes">Catatan: {invoice.notes}</div>}
    </div>
  )
}

function CompanyList({ companies, onAdd, onEdit, onDelete }) {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Perusahaan</h2>
        <button className="btn-primary btn" onClick={onAdd}>+ Tambah Perusahaan</button>
      </div>
      {companies.length === 0 && <div className="empty-state"><p>🏢</p><p>Belum ada perusahaan tersimpan.</p></div>}
      <div className="company-list">
        {companies.map(c => (
          <div key={c.id} className="card company-card">
            <div>
              <p className="company-name">{c.name}</p>
              <p className="company-addr">{c.address}</p>
              {c.bank && <p className="company-bank">Bank {c.bank} | Rek: {c.accountNo} a/n {c.accountName}</p>}
            </div>
            <div className="action-btns">
              <button className="btn btn-sm" onClick={() => onEdit(c)}>✏️ Edit</button>
              <button className="btn btn-sm danger" onClick={() => onDelete(c.id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompanyModal({ company, onSave, onClose }) {
  const [form, setForm] = useState(company || { id: genId(), name: '', address: '', bank: '', bankCabang: '', accountNo: '', accountName: '', signerName: '' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-header">
          <h3>{company ? 'Edit Perusahaan' : 'Tambah Perusahaan'}</h3>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="form-stack">
          <div><label>Nama Perusahaan</label><input value={form.name} onChange={set('name')} placeholder="PT. Example" /></div>
          <div><label>Alamat</label><textarea value={form.address} onChange={set('address')} rows={2} /></div>
          <div className="grid2">
            <div><label>Bank</label><input value={form.bank} onChange={set('bank')} placeholder="Bank Central Asia" /></div>
            <div><label>Cabang</label><input value={form.bankCabang} onChange={set('bankCabang')} placeholder="Makassar" /></div>
          </div>
          <div className="grid2">
            <div><label>No. Rekening</label><input value={form.accountNo} onChange={set('accountNo')} /></div>
            <div><label>Atas Nama</label><input value={form.accountName} onChange={set('accountName')} /></div>
          </div>
          <div><label>Nama Penanda Tangan</label><input value={form.signerName} onChange={set('signerName')} placeholder="AEDY MAWARDI" /></div>
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>Batal</button>
            <button className="btn-primary btn" onClick={() => onSave(form)}>Simpan</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Settings({ logo, logoRef, onLogoChange, onLogoClear, allowedEmails, ownerEmail, onAddEmail, onRemoveEmail }) {
  const [newEmail, setNewEmail] = useState('')
  return (
    <div className="page">
      <h2>Pengaturan</h2>
      <div className="card">
        <div className="section-title">Logo Invoice</div>
        {logo && <img src={logo} className="logo-preview" />}
        <div className="action-btns">
          <button className="btn btn-sm" onClick={() => logoRef.current.click()}>📁 Upload Logo</button>
          {logo && <button className="btn btn-sm danger" onClick={onLogoClear}>Hapus Logo</button>}
        </div>
        <input type="file" ref={logoRef} accept="image/*" style={{ display: 'none' }} onChange={onLogoChange} />
      </div>
      <div className="card">
        <div className="section-title">Kelola Akses</div>
        <div className="email-input-row">
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="tambah@email.com" onKeyDown={e => e.key === 'Enter' && (onAddEmail(newEmail), setNewEmail(''))} />
          <button className="btn-primary btn" onClick={() => { onAddEmail(newEmail); setNewEmail('') }}>Tambah</button>
        </div>
        {allowedEmails.map(e => (
          <div key={e} className="email-row">
            <span>{e}</span>
            {e === ownerEmail ? <span className="badge badge-blue">Owner</span> :
              <button className="btn btn-sm danger" onClick={() => onRemoveEmail(e)}>Hapus</button>}
          </div>
        ))}
      </div>
    </div>
  )
}
