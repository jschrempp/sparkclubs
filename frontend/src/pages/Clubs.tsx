import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { clubsAPI } from '../api';

interface Club {
  id: number;
  name: string;
  description: string;
  zip_code: string;
  is_public: boolean;
  member_count: number;
  user_membership: {
    status: string;
    is_admin: boolean;
  } | null;
}

const Clubs: React.FC = () => {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    zip_code: '',
    is_public: true,
  });

  const { data: clubs = [], isLoading: loading, error } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => {
      const data = await clubsAPI.list();
      return Array.isArray(data) ? data : (data.results || []);
    },
  });

  const joinMutation = useMutation({
    mutationFn: clubsAPI.join,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  const leaveMutation = useMutation({
    mutationFn: clubsAPI.leave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => clubsAPI.create(data),
    onSuccess: () => {
      setShowCreateForm(false);
      setFormData({ name: '', description: '', zip_code: '', is_public: true });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
    onError: (err: Error) => alert(err.message),
  });

  const handleJoinClub = (clubId: number) => {
    joinMutation.mutate(clubId);
    alert('Join request sent! Waiting for admin approval.');
  };

  const handleCancelRequest = (clubId: number) => {
    if (!window.confirm('Are you sure you want to cancel your join request?')) return;
    leaveMutation.mutate(clubId);
    alert('Join request cancelled.');
  };

  const handleRejoin = (clubId: number) => {
    joinMutation.mutate(clubId);
    alert('Rejoin request sent! Waiting for admin approval.');
  };

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
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

      {error && <div className="error">{(error as Error).message}</div>}

      {showCreateForm && (
        <div className="card mb-2">
          <h3>Create New Club</h3>
          <form onSubmit={handleCreateClub}>
            <div className="form-group">
              <label>Club Name *</label>
              <input type="text" className="form-control" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea className="form-control" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} required />
            </div>
            <div className="form-group">
              <label>Zip Code *</label>
              <input type="text" className="form-control" value={formData.zip_code} onChange={(e) => setFormData({...formData, zip_code: e.target.value})} pattern="[0-9]{5}" required />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.is_public} onChange={(e) => setFormData({...formData, is_public: e.target.checked})} style={{ marginRight: '10px', width: '20px', height: '20px' }} />
                <span><strong>Public Club</strong><span style={{ display: 'block', fontSize: '0.9rem', color: '#666' }}>Public clubs are visible to all users. Private clubs are only visible to members.</span></span>
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Club'}
            </button>
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
          {clubs.map((club: Club) => (
            <div key={club.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>{club.name}</h3>
                <span className={`badge badge-${club.is_public ? 'success' : 'warning'}`} style={{ fontSize: '0.75rem', padding: '3px 6px' }}>
                  {club.is_public ? '🌐 Public' : '🔒 Private'}
                </span>
              </div>
              <p>{club.description}</p>
              <p><strong>Location:</strong> {club.zip_code}</p>
              <p><strong>Members:</strong> {club.member_count}</p>
              
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
                <Link to={`/clubs/${club.id}`} className="btn btn-primary btn-sm">View Details</Link>
                {!club.user_membership && (
                  <button className="btn btn-success btn-sm" onClick={() => handleJoinClub(club.id)}>Join Club</button>
                )}
                {club.user_membership && club.user_membership.status === 'pending' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleCancelRequest(club.id)}>Cancel Request</button>
                )}
                {club.user_membership && club.user_membership.status === 'removed' && (
                  <button className="btn btn-success btn-sm" onClick={() => handleRejoin(club.id)}>Request to Rejoin</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Clubs;
