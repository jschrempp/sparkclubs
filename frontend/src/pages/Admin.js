import React, { useState, useEffect } from 'react';
import { usersAPI, systemSettingsAPI } from '../api';

function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
    loadSystemSettings();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await usersAPI.list();
      // Handle paginated response
      setUsers(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const data = await systemSettingsAPI.getSettings();
      setSystemSettings(data);
    } catch (err) {
      // Silently fail if not super admin
      console.error('Failed to load system settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateUserType = async (userId, newType) => {
    try {
      await usersAPI.updateUserType(userId, newType);
      loadUsers();
      alert('User type updated successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleAutoApproval = async () => {
    try {
      const newValue = !systemSettings.auto_approve_users;
      const updatedSettings = await systemSettingsAPI.updateSettings({
        auto_approve_users: newValue
      });
      setSystemSettings(updatedSettings);
      alert(`User auto-approval ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleToggleClubAutoApproval = async () => {
    try {
      const newValue = !systemSettings.auto_approve_club_memberships;
      const updatedSettings = await systemSettingsAPI.updateSettings({
        auto_approve_club_memberships: newValue
      });
      setSystemSettings(updatedSettings);
      alert(`Club membership auto-approval ${newValue ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleIncreaseClubLimit = async (userId) => {
    try {
      const result = await usersAPI.increaseClubLimit(userId);
      loadUsers();
      alert(result.message);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  const getStatusBadgeColor = (status) => {
    switch(status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'removed': return 'danger';
      default: return 'secondary';
    }
  };

  const renderClubMemberships = (memberships) => {
    if (!memberships || memberships.length === 0) {
      return <span className="text-muted">None</span>;
    }

    return (
      <div className="club-memberships">
        {memberships.map((membership) => (
          <div key={membership.club_id} className="club-membership-item">
            <span className="club-name">{membership.club_name}</span>
            {membership.is_admin && (
              <span className="badge badge-primary admin-badge">Admin</span>
            )}
            <span className={`badge badge-${getStatusBadgeColor(membership.status)} status-badge`}>
              {membership.status}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container">
      <h1>User Management</h1>
      
      {!settingsLoading && systemSettings && (
        <div className="card" style={{ marginBottom: '20px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>System Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              fontSize: '1rem'
            }}>
              <input
                type="checkbox"
                checked={systemSettings.auto_approve_users}
                onChange={handleToggleAutoApproval}
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  marginRight: '10px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
              <span>
                <strong>Auto-approve new users</strong>
                <span style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginTop: '3px' }}>
                  When enabled, new registrations are automatically approved as members instead of pending
                </span>
              </span>
            </label>
            
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              fontSize: '1rem'
            }}>
              <input
                type="checkbox"
                checked={systemSettings.auto_approve_club_memberships}
                onChange={handleToggleClubAutoApproval}
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  marginRight: '10px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
              <span>
                <strong>Auto-approve club membership requests</strong>
                <span style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginTop: '3px' }}>
                  When enabled, users joining clubs are automatically approved as active members instead of pending
                </span>
              </span>
            </label>
          </div>
        </div>
      )}
      
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Zip Code</th>
              <th>Clubs</th>
              <th>Clubs Created</th>
              <th>Current Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>{user.zip_code}</td>
                <td className="clubs-column">
                  {renderClubMemberships(user.club_memberships)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-primary" style={{ marginRight: '5px' }}>
                    {user.clubs_created_count || 0} / {user.club_creation_limit || 5}
                  </span>
                  {user.user_type !== 'site_admin' && user.user_type !== 'super_admin' && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleIncreaseClubLimit(user.id)}
                      title="Increase limit by 5"
                      style={{ padding: '2px 6px', fontSize: '0.8rem' }}
                    >
                      +5
                    </button>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${user.user_type}`}>
                    {user.user_type}
                  </span>
                </td>
                <td>
                  <select 
                    className="form-control"
                    value={user.user_type}
                    onChange={(e) => handleUpdateUserType(user.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="member">Member</option>
                    <option value="site_admin">Site Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admin;
