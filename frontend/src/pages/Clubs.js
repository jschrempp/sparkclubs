import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clubsAPI } from '../api';

function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    zip_code: '',
    is_public: true,
  });

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const data = await clubsAPI.list();
      // Handle paginated response
      setClubs(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (clubId) => {
    try {
      await clubsAPI.join(clubId);
      alert('Join request sent! Waiting for admin approval.');
      loadClubs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelRequest = async (clubId) => {
    if (!window.confirm('Are you sure you want to cancel your join request?')) {
      return;
    }
    try {
      await clubsAPI.leave(clubId);
      alert('Join request cancelled.');
      loadClubs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRejoin = async (clubId) => {
    try {
      await clubsAPI.join(clubId);
      alert('Rejoin request sent! Waiting for admin approval.');
      loadClubs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateClub = async (e) => {
    e.preventDefault();
    try {
      await clubsAPI.create(formData);
      setShowCreateForm(false);
      setFormData({ name: '', description: '', zip_code: '', is_public: true });
      loadClubs();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading clubs...</div>;

  return (
    <div className="container">
      <div className="flex-between mb-2">
        <h1>Discussion Clubs</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create Club'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showCreateForm && (
        <div className="card mb-2">
          <h3>Create New Club</h3>
          <form onSubmit={handleCreateClub}>
            <div className="form-group">
              <label>Club Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea
                className="form-control"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
                required
              />
            </div>
            <div className="form-group">
              <label>Zip Code *</label>
              <input
                type="text"
                className="form-control"
                value={formData.zip_code}
                onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                pattern="[0-9]{5}"
                required
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_public}
                  onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                  style={{ marginRight: '10px', width: '20px', height: '20px' }}
                />
                <span>
                  <strong>Public Club</strong>
                  <span style={{ display: 'block', fontSize: '0.9rem', color: '#666' }}>
                    Public clubs are visible to all users. Private clubs are only visible to members.
                  </span>
                </span>
              </label>
            </div>
            <button type="submit" className="btn btn-primary">Create Club</button>
          </form>
        </div>
      )}

      {clubs.length === 0 ? (
        <div className="empty-state">
          <h2>No clubs yet</h2>
          <p>Be the first to create a discussion club!</p>
        </div>
      ) : (
        <div className="grid">
          {clubs.map((club) => (
            <div key={club.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{club.name}</h3>
                <span 
                  className={`badge badge-${club.is_public ? 'success' : 'warning'}`}
                  style={{ fontSize: '0.75rem', padding: '3px 6px' }}
                >
                  {club.is_public ? '🌐 Public' : '🔒 Private'}
                </span>
              </div>
              <p>{club.description}</p>
              <p><strong>Location:</strong> {club.zip_code}</p>
              <p><strong>Members:</strong> {club.member_count}</p>
              
              {/* Show membership status if user has a membership */}
              {club.user_membership && (
                <div className="mb-1">
                  <span className={`badge badge-${club.user_membership.status}`}>
                    {club.user_membership.status === 'pending' && 'Membership Pending'}
                    {club.user_membership.status === 'active' && 'Active Member'}
                    {club.user_membership.status === 'removed' && 'Membership Removed'}
                  </span>
                  {club.user_membership.is_admin && (
                    <span className="badge badge-admin ml-1" style={{marginLeft: '8px'}}>Admin</span>
                  )}
                </div>
              )}
              
              <div className="flex mt-1">
                <Link to={`/clubs/${club.id}`} className="btn btn-primary btn-sm">
                  View Details
                </Link>
                {/* Only show Join button if user doesn't have a membership */}
                {!club.user_membership && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => handleJoinClub(club.id)}
                  >
                    Join Club
                  </button>
                )}
                {/* Show relevant action based on membership status */}
                {club.user_membership && club.user_membership.status === 'pending' && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCancelRequest(club.id)}
                  >
                    Cancel Request
                  </button>
                )}
                {club.user_membership && club.user_membership.status === 'removed' && (
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => handleRejoin(club.id)}
                  >
                    Request to Rejoin
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Clubs;
