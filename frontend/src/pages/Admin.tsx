import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI, systemSettingsAPI, testEmailAPI } from '../api';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  zip_code: string;
  user_type: string;
  club_creation_limit: number;
  clubs_created_count: number;
  club_memberships: {
    club_id: number;
    club_name: string;
    status: string;
    is_admin: boolean;
    joined_at: string;
  }[];
}

interface SystemSettings {
  auto_approve_users: boolean;
  auto_approve_club_memberships: boolean;
}

const getStatusBadgeColor = (status: string) => {
  switch(status) {
    case 'active': return 'success';
    case 'pending': return 'warning';
    case 'removed': return 'danger';
    default: return 'secondary';
  }
};

const Admin: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const data = await usersAPI.list();
      return Array.isArray(data) ? data : (data.results || []);
    },
  });

  const { data: systemSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: systemSettingsAPI.getSettings,
  });

  const updateUserTypeMutation = useMutation({
    mutationFn: ({ userId, newType }: { userId: number; newType: string }) => usersAPI.updateUserType(userId, newType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert('User type updated successfully');
    },
    onError: (err: Error) => alert(err.message),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: systemSettingsAPI.updateSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(['systemSettings'], data);
    },
    onError: (err: Error) => alert(err.message || 'Failed to update settings'),
  });

  const increaseClubLimitMutation = useMutation({
    mutationFn: usersAPI.increaseClubLimit,
    onSuccess: (result: { message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert(result.message);
    },
    onError: (err: Error) => alert(err.message),
  });

  const handleUpdateUserType = (userId: number, newType: string) => {
    updateUserTypeMutation.mutate({ userId, newType });
  };

  const handleToggleAutoApproval = () => {
    if (!systemSettings) return;
    const newValue = !systemSettings.auto_approve_users;
    updateSettingsMutation.mutate({ auto_approve_users: newValue });
    alert(`User auto-approval ${newValue ? 'enabled' : 'disabled'} successfully`);
  };

  const handleToggleClubAutoApproval = () => {
    if (!systemSettings) return;
    const newValue = !systemSettings.auto_approve_club_memberships;
    updateSettingsMutation.mutate({ auto_approve_club_memberships: newValue });
    alert(`Club membership auto-approval ${newValue ? 'enabled' : 'disabled'} successfully`);
  };

  const handleIncreaseClubLimit = (userId: number) => {
    increaseClubLimitMutation.mutate(userId);
  };

  const deleteAccountMutation = useMutation({
    mutationFn: usersAPI.deleteAccount,
    onSuccess: (result: { message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      alert(result.message);
    },
    onError: (err: Error) => alert(err.message),
  });

  const handleDeleteAccount = (userId: number, userName: string) => {
    if (window.confirm(`Are you sure you want to delete the account for ${userName}? This cannot be undone.`)) {
      deleteAccountMutation.mutate(userId);
    }
  };

  // Test email state
  const [testEmailExpanded, setTestEmailExpanded] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailSubject, setTestEmailSubject] = useState('Test from SparkClubs');
  const [testEmailBody, setTestEmailBody] = useState('A site admin sent this test email from SparkClubs');
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  const testEmailMutation = useMutation({
    mutationFn: ({ to, subject, body }: { to: string; subject: string; body: string }) =>
      testEmailAPI.send(to, subject, body),
    onSuccess: (data) => {
      setTestEmailResult(`✅ ${data.message}`);
    },
    onError: (err: Error) => {
      setTestEmailResult(`❌ ${err.message}`);
    },
  });

  const handleSendTestEmail = () => {
    if (!testEmailTo.trim()) {
      setTestEmailResult('❌ Please enter a destination email address');
      return;
    }
    setTestEmailResult(null);
    testEmailMutation.mutate({ to: testEmailTo, subject: testEmailSubject, body: testEmailBody });
  };

  if (loading) return <div className="loading">Loading users...</div>;

  const renderClubMemberships = (memberships: User['club_memberships']) => {
    if (!memberships || memberships.length === 0) {
      return <span className="text-muted">None</span>;
    }
    return (
      <div className="club-memberships">
        {memberships.map((membership) => (
          <div key={membership.club_id} className="club-membership-item">
            <span className="club-name">{membership.club_name}</span>
            {membership.is_admin && <span className="badge badge-primary admin-badge">Admin</span>}
            <span className={`badge badge-${getStatusBadgeColor(membership.status)} status-badge`}>{membership.status}</span>
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
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '1rem' }}>
              <input type="checkbox" checked={systemSettings.auto_approve_users} onChange={handleToggleAutoApproval} style={{ width: '20px', height: '20px', marginRight: '10px', cursor: 'pointer', flexShrink: 0 }} />
              <span><strong>Auto-approve new users</strong><span style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginTop: '3px' }}>When enabled, new registrations are automatically approved as members instead of pending</span></span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '1rem' }}>
              <input type="checkbox" checked={systemSettings.auto_approve_club_memberships} onChange={handleToggleClubAutoApproval} style={{ width: '20px', height: '20px', marginRight: '10px', cursor: 'pointer', flexShrink: 0 }} />
              <span><strong>Auto-approve club membership requests</strong><span style={{ display: 'block', fontSize: '0.9rem', color: '#666', marginTop: '3px' }}>When enabled, users joining clubs are automatically approved as active members instead of pending</span></span>
            </label>
          </div>
        </div>
      )}

      {/* Test Email Card */}
      <div className="card" style={{ marginBottom: '20px', backgroundColor: '#f8f9fa' }}>
        <h2
          style={{ fontSize: '1.2rem', marginBottom: testEmailExpanded ? '15px' : '0', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => setTestEmailExpanded(!testEmailExpanded)}
        >
          <span style={{ fontSize: '0.8rem', transition: 'transform 0.2s', transform: testEmailExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          Send Test Email
        </h2>
        {testEmailExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
              Destination Email
            </label>
            <input
              type="email"
              className="form-control"
              placeholder="recipient@example.com"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
              Subject
            </label>
            <input
              type="text"
              className="form-control"
              value={testEmailSubject}
              onChange={(e) => setTestEmailSubject(e.target.value)}
              style={{ width: '100%', maxWidth: '400px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '0.9rem' }}>
              Body
            </label>
            <textarea
              className="form-control"
              rows={4}
              value={testEmailBody}
              onChange={(e) => setTestEmailBody(e.target.value)}
              style={{ width: '100%', maxWidth: '400px', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn btn-primary"
              onClick={handleSendTestEmail}
              disabled={testEmailMutation.isPending}
            >
              {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
            </button>
            {testEmailResult && (
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{testEmailResult}</span>
            )}
          </div>
        </div>
        )}
      </div>
      
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
            {users.map((user: User) => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>{user.zip_code}</td>
                <td className="clubs-column">{renderClubMemberships(user.club_memberships)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-primary" style={{ marginRight: '5px' }}>{user.clubs_created_count || 0} / {user.club_creation_limit || 5}</span>
                  {user.user_type !== 'site_admin' && user.user_type !== 'super_admin' && (
                    <button className="btn btn-sm btn-success" onClick={() => handleIncreaseClubLimit(user.id)} title="Increase limit by 5" style={{ padding: '2px 6px', fontSize: '0.8rem' }}>+5</button>
                  )}
                </td>
                <td><span className={`badge badge-${user.user_type}`}>{user.user_type}</span></td>
                <td>
                  <select className="form-control" value={user.user_type} onChange={(e) => handleUpdateUserType(user.id, e.target.value)}>
                    <option value="awaiting_verification">Awaiting Verification</option>
                    <option value="pending">Pending</option>
                    <option value="member">Member</option>
                    <option value="site_admin">Site Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  {(user.user_type === 'pending' || user.user_type === 'awaiting_verification') && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteAccount(user.id, `${user.first_name} ${user.last_name}`)}
                      disabled={deleteAccountMutation.isPending}
                      style={{ marginTop: '6px', width: '100%' }}
                    >
                      {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;
