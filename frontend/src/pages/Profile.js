import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { authAPI } from '../api';

function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  const toggleShow = (field) =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const eyeBtn = (field) => (
    <button
      type="button"
      onClick={() => toggleShow(field)}
      style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 13, padding: 0,
      }}
    >
      {showPasswords[field] ? 'Hide' : 'Show'}
    </button>
  );

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { label: 'One digit', test: (p) => /\d/.test(p) },
    { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ];

  const passwordValid = (p) => passwordRequirements.every((r) => r.test(p));

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    if (!passwordValid(form.new_password)) {
      setError('New password does not meet the requirements below');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword(form.current_password, form.new_password);
      setMessage('Password changed successfully');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>My Profile</h2>

      <div className="card" style={{ maxWidth: 480 }}>
        <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.user_type.replace('_', ' ')}</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Change Password</h3>
        {message && <p style={{ color: '#28a745' }}>{message}</p>}
        {error && <p style={{ color: '#dc3545' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.current ? 'text' : 'password'}
                name="current_password"
                value={form.current_password}
                onChange={handleChange}
                className="form-control"
                style={{ paddingRight: 55 }}
                required
              />
              {eyeBtn('current')}
            </div>
          </div>
          <div className="form-group">
            <label>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.new_pw ? 'text' : 'password'}
                name="new_password"
                value={form.new_password}
                onChange={handleChange}
                className="form-control"
                style={{ paddingRight: 55 }}
                required
              />
              {eyeBtn('new_pw')}
            </div>
              required
            />
            {form.new_password && (
              <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 13 }}>
                {passwordRequirements.map((r) => (
                  <li key={r.label} style={{ color: r.test(form.new_password) ? '#28a745' : '#dc3545' }}>
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                className="form-control"
                style={{ paddingRight: 55 }}
                required
              />
              {eyeBtn('confirm')}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
