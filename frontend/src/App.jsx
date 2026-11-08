import { useEffect, useMemo, useState } from 'react';
import api from './api';

const emptyStudent = { studentId: '', name: '', email: '', department: '', semester: '', contact: '' };
const labels = { studentId: 'Student ID', name: 'Full Name', email: 'Email Address', department: 'Department', semester: 'Semester', contact: 'Contact Number' };
const palette = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#3b82f6', '#f43f5e'];

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
const colorFor = (text = '') => palette[[...text].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];

export default function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyStudent);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('All');
  const [view, setView] = useState('cards');
  const [notice, setNotice] = useState({ text: '', error: false });
  const [loading, setLoading] = useState(true);

  const notify = (text, error = false) => setNotice({ text, error });
  const errorMessage = (error, fallback) => {
    if (error.response?.data?.message || error.response?.data?.error) return error.response.data.message || error.response.data.error;
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') return 'Cannot reach the API. Check the API URL, CORS settings, and Render service status.';
    return error.message || fallback;
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/students');
      const records = Array.isArray(data) ? data : data.students || data.data || [];
      setStudents(Array.isArray(records) ? records : []);
    } catch (e) {
      notify(errorMessage(e, 'Could not reach the backend.'), true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadStudents(); }, []);

  useEffect(() => {
    if (!notice.text || notice.error) return;
    const t = setTimeout(() => setNotice({ text: '', error: false }), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const departments = useMemo(() => ['All', ...new Set(students.map((s) => s.department).filter(Boolean))], [students]);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) =>
      (dept === 'All' || s.department === dept) &&
      `${s.studentId} ${s.name} ${s.email} ${s.department}`.toLowerCase().includes(q)
    );
  }, [students, search, dept]);

  const stats = useMemo(() => {
    const sems = students.map((s) => Number(s.semester)).filter(Boolean);
    return {
      total: students.length,
      depts: new Set(students.map((s) => s.department).filter(Boolean)).size,
      avg: sems.length ? (sems.reduce((a, b) => a + b, 0) / sems.length).toFixed(1) : '0',
    };
  }, [students]);

  const closeModal = () => { setModalOpen(false); setForm(emptyStudent); setEditingId(null); };
  const openAdd = () => { setForm(emptyStudent); setEditingId(null); setModalOpen(true); };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const { data } = editingId ? await api.put(`/students/${editingId}`, form) : await api.post('/students', form);
      notify(data.message || 'Student saved successfully.');
      closeModal();
      await loadStudents();
    } catch (e) {
      notify(errorMessage(e, 'Unable to save student.'), true);
    }
  };

  const edit = (student) => {
    setEditingId(student._id);
    setForm({ studentId: student.studentId, name: student.name, email: student.email, department: student.department, semester: student.semester, contact: student.contact });
    setModalOpen(true);
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      const { data } = await api.delete(`/students/${id}`);
      notify(data.message || 'Student deleted successfully.');
      await loadStudents();
    } catch (e) {
      notify(errorMessage(e, 'Unable to delete student.'), true);
    }
  };

  return (
    <div className="shell">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="topbar">
        <div className="brand">
          <div className="logo">B</div>
          <div>
            <strong>BIT SMS</strong>
            <small>Student Management System</small>
          </div>
        </div>
        <button className="btn-primary" onClick={openAdd}>＋ Add Student</button>
      </header>

      <main>
        <section className="intro">
          <p className="eyebrow">DASHBOARD</p>
          <h1>Your campus, <span className="grad">at a glance.</span></h1>
          <p className="sub">Browse, search, and manage every student record in one place.</p>
        </section>

        <section className="stats">
          <div className="stat"><span className="stat-ico">👩‍🎓</span><div><b>{stats.total}</b><small>Total students</small></div></div>
          <div className="stat"><span className="stat-ico">🏛️</span><div><b>{stats.depts}</b><small>Departments</small></div></div>
          <div className="stat"><span className="stat-ico">📚</span><div><b>{stats.avg}</b><small>Average semester</small></div></div>
        </section>

        {notice.text && (
          <div className={`toast ${notice.error ? 'error' : ''}`}>
            <span>{notice.error ? '⚠️' : '✅'} {notice.text}</span>
            <button onClick={() => setNotice({ text: '', error: false })}>×</button>
          </div>
        )}

        <section className="toolbar">
          <div className="search-box">
            <span>🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by ID, name, email or department..." />
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            {departments.map((d) => <option key={d} value={d}>{d === 'All' ? 'All departments' : d}</option>)}
          </select>
          <div className="toggle">
            <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>▦ Cards</button>
            <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>☰ Table</button>
          </div>
        </section>

        <p className="count">{filteredStudents.length} of {students.length} students</p>

        {loading ? (
          <div className="empty">Loading students…</div>
        ) : !filteredStudents.length ? (
          <div className="empty">No students found.</div>
        ) : view === 'cards' ? (
          <section className="grid">
            {filteredStudents.map((s) => (
              <article className="student" key={s._id}>
                <div className="student-head">
                  <div className="avatar" style={{ background: colorFor(s.name) }}>{initials(s.name)}</div>
                  <div className="who">
                    <h3>{s.name}</h3>
                    <span className="sid">{s.studentId}</span>
                  </div>
                  <span className="sem">Sem {s.semester}</span>
                </div>
                <div className="rows">
                  <p><i>🏷️</i>{s.department}</p>
                  <p><i>✉️</i>{s.email}</p>
                  <p><i>📞</i>{s.contact}</p>
                </div>
                <div className="card-actions">
                  <button onClick={() => edit(s)}>Edit</button>
                  <button className="danger" onClick={() => remove(s._id, s.name)}>Delete</button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="table-panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{['Student', 'ID', 'Email', 'Department', 'Sem', 'Contact', ''].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s._id}>
                      <td><div className="cell-user"><div className="avatar sm" style={{ background: colorFor(s.name) }}>{initials(s.name)}</div>{s.name}</div></td>
                      <td><span className="sid">{s.studentId}</span></td>
                      <td>{s.email}</td>
                      <td>{s.department}</td>
                      <td><span className="sem">{s.semester}</span></td>
                      <td>{s.contact}</td>
                      <td className="row-actions">
                        <button onClick={() => edit(s)}>Edit</button>
                        <button className="danger" onClick={() => remove(s._id, s.name)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {modalOpen && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">{editingId ? 'UPDATE RECORD' : 'NEW RECORD'}</p>
                <h2>{editingId ? 'Edit student' : 'Add a student'}</h2>
              </div>
              <button className="close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={submit}>
              {Object.keys(labels).map((key) => (
                <label key={key} className={key === 'email' ? 'wide' : ''}>
                  {labels[key]}
                  <input
                    required
                    type={key === 'email' ? 'email' : key === 'semester' ? 'number' : 'text'}
                    min={key === 'semester' ? 1 : undefined}
                    max={key === 'semester' ? 12 : undefined}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={`Enter ${labels[key].toLowerCase()}`}
                  />
                </label>
              ))}
              <div className="form-actions wide">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Add Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
