import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../AuthContext';
import { authAPI, clubsAPI } from '../api';
import { Link } from 'react-router-dom';

interface Membership {
  id: number;
  club: number;
  club_name: string;
  club_description: string;
  club_zip_code: string;
  status: string;
  is_admin: boolean;
  joined_at: string;
}

interface Event {
  id: number;
  title: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  club: number;
  club_name: string;
  host_name: string;
  topics: { id: number; title: string }[];
  attendance_count: number;
}

const formatEventDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit'
  };
  return date.toLocaleDateString('en-US', options);
};

const formatEventTime = (startString: string, endString: string) => {
  const start = new Date(startString);
  const end = new Date(endString);
  const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${start.toLocaleTimeString('en-US', options)} - ${end.toLocaleTimeString('en-US', options)}`;
};

const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending Approval', className: 'badge-pending' },
    active: { label: 'Active Member', className: 'badge-active' },
    removed: { label: 'Removed', className: 'badge-removed' },
  };
  const badge = badges[status] || { label: status, className: '' };
  return <span className={`badge ${badge.className}`}>{badge.label}</span>;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [leavingClubId, setLeavingClubId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const enabled = user?.user_type !== 'pending';

  const { data: memberships = [], isLoading: loading, error: membershipsError } = useQuery({
    queryKey: ['myMemberships'],
    queryFn: authAPI.myMemberships,
    enabled,
  });

  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ['myEvents'],
    queryFn: authAPI.myEvents,
    enabled,
  });

  const leaveClubMutation = useMutation({
    mutationFn: (clubId: number) => clubsAPI.leave(clubId),
    onSuccess: (_data: unknown, clubId: number) => {
      const clubName = (memberships as Membership[]).find(m => m.club === clubId)?.club_name || '';
      setSuccessMessage(`Successfully left "${clubName}"`);
      queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: Error) => {
      alert(`Failed to leave club: ${err.message}`);
    },
    onSettled: () => setLeavingClubId(null),
  });

  const handleLeaveClub = (clubId: number, clubName: string) => {
    if (!window.confirm(`Are you sure you want to leave "${clubName}"?\n\nThis action cannot be undone.`)) return;
    setLeavingClubId(clubId);
    leaveClubMutation.mutate(clubId);
  };

  if (user?.user_type === 'pending') {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <h2>Account Pending Approval</h2>
          <p>Your account is waiting for admin approval. You&apos;ll be notified once approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Welcome, {user?.first_name}!</h1>
      
      <div className="grid">
        <div className="card">
          <h3>Your Profile</h3>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Name:</strong> {user?.first_name} {user?.last_name}</p>
          <p><strong>Zip Code:</strong> {user?.zip_code}</p>
          <p><strong>Role:</strong> {user?.user_type}</p>
          {user?.bio && <p><strong>Bio:</strong> {user.bio}</p>}
        </div>

        <div className="card">
          <h3>Quick Stats</h3>
          <p><strong>Total Clubs:</strong> {memberships.length}</p>
          <p><strong>Active Memberships:</strong> {memberships.filter((m: Membership) => m.status === 'active').length}</p>
          <p><strong>Pending Requests:</strong> {memberships.filter((m: Membership) => m.status === 'pending').length}</p>
          {memberships.filter((m: Membership) => m.is_admin).length > 0 && (
            <p><strong>Admin Of:</strong> {memberships.filter((m: Membership) => m.is_admin).length} club(s)</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Your Clubs</h3>
        
        {loading && <p>Loading your clubs...</p>}
        
        {successMessage && (
          <div style={{ color: '#155724', padding: '12px', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px', marginBottom: '15px' }}>
            {successMessage}
          </div>
        )}
        
        {membershipsError && (
          <div style={{ color: '#721c24', padding: '12px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '15px' }}>
            Error: {(membershipsError as Error).message}
          </div>
        )}

        {!loading && !membershipsError && memberships.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>You haven&apos;t joined any clubs yet.</p>
            <Link to="/clubs" className="btn btn-primary">Browse Clubs</Link>
          </div>
        )}

        {!loading && !membershipsError && memberships.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Club Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Zip Code</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Joined</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership: Membership) => (
                  <tr key={membership.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}><strong>{membership.club_name}</strong></td>
                    <td style={{ padding: '12px', maxWidth: '300px' }}>
                      {membership.club_description.length > 100 
                        ? `${membership.club_description.substring(0, 100)}...` 
                        : membership.club_description}
                    </td>
                    <td style={{ padding: '12px' }}>{membership.club_zip_code}</td>
                    <td style={{ padding: '12px' }}>{getStatusBadge(membership.status)}</td>
                    <td style={{ padding: '12px' }}>
                      {membership.is_admin ? <span className="badge badge-admin">Admin</span> : <span>Member</span>}
                    </td>
                    <td style={{ padding: '12px' }}>{new Date(membership.joined_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>
                      {membership.status === 'active' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link to={`/clubs/${membership.club}`} className="btn btn-sm" style={{ fontSize: '0.9em', padding: '4px 12px' }}>View Club</Link>
                          <button
                            onClick={() => handleLeaveClub(membership.club, membership.club_name)}
                            disabled={leavingClubId === membership.club}
                            className="btn btn-sm btn-danger"
                            style={{ fontSize: '0.9em', padding: '4px 12px', opacity: leavingClubId === membership.club ? 0.6 : 1, cursor: leavingClubId === membership.club ? 'not-allowed' : 'pointer' }}
                          >
                            {leavingClubId === membership.club ? 'Leaving...' : 'Leave Club'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h3>Your Upcoming Events</h3>
        
        {eventsLoading && <p>Loading your events...</p>}
        
        {eventsError && (
          <div style={{ color: '#721c24', padding: '12px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', marginBottom: '15px' }}>
            Error: {(eventsError as Error).message}
          </div>
        )}

        {!eventsLoading && !eventsError && events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>You haven&apos;t RSVP&apos;d to any upcoming events yet.</p>
            <p style={{ marginTop: '10px', color: '#666' }}>Visit your club pages to see and RSVP to events.</p>
          </div>
        )}

        {!eventsLoading && !eventsError && events.length > 0 && (
          <div style={{ display: 'grid', gap: '15px', marginTop: '10px' }}>
            {events.map((event: Event) => (
              <div key={event.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#f9f9f9', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#333' }}>{event.title}</h4>
                    <div style={{ marginBottom: '6px' }}><strong style={{ color: '#666', fontSize: '0.9em' }}>📅 Date:</strong> <span style={{ color: '#444' }}>{formatEventDate(event.start_datetime)}</span></div>
                    <div style={{ marginBottom: '6px' }}><strong style={{ color: '#666', fontSize: '0.9em' }}>⏰ Time:</strong> <span style={{ color: '#444' }}>{formatEventTime(event.start_datetime, event.end_datetime)}</span></div>
                    <div style={{ marginBottom: '6px' }}><strong style={{ color: '#666', fontSize: '0.9em' }}>📍 Location:</strong> <span style={{ color: '#444' }}>{event.location}</span></div>
                    <div style={{ marginBottom: '6px' }}><strong style={{ color: '#666', fontSize: '0.9em' }}>📚 Club:</strong> <span style={{ color: '#444' }}>{event.club_name}</span></div>
                    {event.topics && event.topics.length > 0 && (
                      <div style={{ marginBottom: '6px' }}><strong style={{ color: '#666', fontSize: '0.9em' }}>💬 Topics:</strong> <span style={{ color: '#444' }}>{event.topics.map(t => t.title).join(', ')}</span></div>
                    )}
                    {event.host_name && (
                      <div style={{ marginBottom: '6px' }}><strong style={{ color: '#666', fontSize: '0.9em' }}>👤 Host:</strong> <span style={{ color: '#444' }}>{event.host_name}</span></div>
                    )}
                    {event.attendance_count > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ backgroundColor: '#28a745', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em', fontWeight: 'bold' }}>
                          {event.attendance_count} {event.attendance_count === 1 ? 'person' : 'people'} attending
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Link to={`/clubs/${event.club}`} className="btn btn-sm" style={{ fontSize: '0.9em', padding: '6px 14px', whiteSpace: 'nowrap' }}>View Club</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
