import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { clubsAPI, topicsAPI, eventsAPI, membershipsAPI } from '../api';
import { useAuth } from '../AuthContext';

interface Topic {
  id: number;
  title: string;
  description: string;
  tabs: string;
  status: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  interest_counts: { interested: number; able_to_lead: number; not_interested: number };
  user_interest: string | null;
}

interface Event {
  id: number;
  title: string;
  start_datetime: string | null;
  end_datetime: string | null;
  location: string;
  host: number;
  host_name: string;
  status: string;
  topics: { id: number; title: string }[];
  attendance_count: number;
  date_options: { id: number; start_datetime: string; end_datetime: string; vote_count: number; user_voted: boolean }[];
}

interface Member {
  id: number;
  user: number;
  user_name: string;
  status: string;
  is_admin: boolean;
  joined_at: string;
}

interface Club {
  id: number;
  name: string;
  description: string;
  zip_code: string;
  is_public: boolean;
  auto_approve_topics: boolean;
  member_count: number;
  invite_token: string;
}

const ClubDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isSiteAdmin, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('topics');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicFormData, setTopicFormData] = useState({ title: '', description: '', tabs: '' });
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [showEditClubForm, setShowEditClubForm] = useState(false);
  const [clubFormData, setClubFormData] = useState({ name: '', description: '', zip_code: '', is_public: true, auto_approve_topics: false });
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [sortOrder, setSortOrder] = useState<'recent' | 'interested'>('recent');
  const [eventFormData, setEventFormData] = useState({
    title: '', topic_ids: [] as number[], start_datetime: '', end_datetime: '',
    location: '', host: '', status: 'pending',
  });
  const [useDateVoting, setUseDateVoting] = useState(false);
  const [dateOptionDates, setDateOptionDates] = useState<{ start_datetime: string; end_datetime: string }[]>([]);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendees, setAttendees] = useState<{ id: number; user_name: string; user_email: string; rsvp_status: string }[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState('');

  const { data: club, isLoading: loading } = useQuery({
    queryKey: ['club', id],
    queryFn: () => clubsAPI.get(id!),
    enabled: !!id,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', id],
    queryFn: async () => {
      const data = await topicsAPI.list(id!);
      return Array.isArray(data) ? data : (data.results || []);
    },
    enabled: !!id,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const data = await eventsAPI.list(id!);
      return Array.isArray(data) ? data : (data.results || []);
    },
    enabled: !!id,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const data = await clubsAPI.getMembers(id!);
      return Array.isArray(data) ? data : (data.results || []);
    },
    enabled: !!id,
  });

  const isClubAdmin = isSiteAdmin || members.find((m: Member) => m.user === user?.id && m.is_admin && m.status === 'active');

  const isTopicCreator = (topic: Topic) => user?.id === topic.created_by;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['club', id] });
    queryClient.invalidateQueries({ queryKey: ['topics', id] });
    queryClient.invalidateQueries({ queryKey: ['events', id] });
    queryClient.invalidateQueries({ queryKey: ['members', id] });
  };

  // Mutations
  const rsvpMutation = useMutation({
    mutationFn: (eventId: number) => eventsAPI.rsvp(eventId, 'attending'),
    onSuccess: () => { alert('RSVP successful!'); invalidateAll(); },
    onError: (err: Error) => alert(err.message),
  });

  const interestMutation = useMutation({
    mutationFn: ({ topicId, interestType }: { topicId: number; interestType: string }) =>
      topicsAPI.expressInterest(topicId, interestType),
    onSuccess: () => invalidateAll(),
    onError: (err: Error) => alert(err.message),
  });

  const removeInterestMutation = useMutation({
    mutationFn: (topicId: number) => topicsAPI.removeInterest(topicId),
    onSuccess: () => invalidateAll(),
    onError: (err: Error) => alert(err.message),
  });

  const approveMemberMutation = useMutation({
    mutationFn: (membershipId: number) => membershipsAPI.update(membershipId, { status: 'active' }),
    onSuccess: () => { alert('Member approved!'); invalidateAll(); },
    onError: (err: Error) => alert(err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (membershipId: number) => membershipsAPI.update(membershipId, { status: 'removed' }),
    onSuccess: () => { alert('Member removed'); invalidateAll(); },
    onError: (err: Error) => alert(err.message),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: ({ membershipId, isAdmin }: { membershipId: number; isAdmin: boolean }) =>
      membershipsAPI.update(membershipId, { is_admin: isAdmin }),
    onSuccess: (_data, vars) => {
      alert(`Admin status ${vars.isAdmin ? 'granted' : 'removed'}`);
      invalidateAll();
    },
    onError: (err: Error) => alert(err.message),
  });

  const topicMutation = useMutation({
    mutationFn: ({ topicId, data }: { topicId?: number; data: Record<string, unknown> }) =>
      topicId ? topicsAPI.update(topicId, data) : topicsAPI.create(data),
    onSuccess: () => {
      alert(editingTopicId ? 'Topic updated!' : 'Topic added! Pending admin approval.');
      setShowTopicForm(false);
      setEditingTopicId(null);
      setTopicFormData({ title: '', description: '', tabs: '' });
      invalidateAll();
    },
    onError: (err: Error) => alert(err.message),
  });

  const updateClubMutation = useMutation({
    mutationFn: (data: typeof clubFormData) => clubsAPI.update(id!, data),
    onSuccess: () => { alert('Club updated!'); setShowEditClubForm(false); invalidateAll(); },
    onError: (err: Error) => alert(err.message),
  });

  const topicStatusMutation = useMutation({
    mutationFn: ({ topicId, status }: { topicId: number; status: string }) =>
      topicsAPI.update(topicId, { status }),
    onSuccess: () => { alert('Topic status updated!'); invalidateAll(); },
    onError: (err: Error) => alert(err.message),
  });

  const eventMutation = useMutation({
    mutationFn: ({ eventId, data }: { eventId?: number; data: Record<string, unknown> }) =>
      eventId ? eventsAPI.update(eventId, data) : eventsAPI.create(data),
    onSuccess: () => {
      alert(editingEventId ? 'Event updated!' : 'Event created!');
      setShowEventForm(false);
      setEditingEventId(null);
      setUseDateVoting(false);
      setDateOptionDates([]);
      setEventFormData({ title: '', topic_ids: [], start_datetime: '', end_datetime: '', location: '', host: '', status: 'pending' });
      invalidateAll();
    },
    onError: (err: Error) => alert(err.message),
  });

  const voteDateMutation = useMutation({
    mutationFn: ({ eventId, dateOptionId }: { eventId: number; dateOptionId: number }) =>
      eventsAPI.voteDate(eventId, dateOptionId),
    onSuccess: () => invalidateAll(),
    onError: (err: Error) => alert(err.message),
  });

  const selectDateMutation = useMutation({
    mutationFn: ({ eventId, dateOptionId }: { eventId: number; dateOptionId: number }) =>
      eventsAPI.selectDate(eventId, dateOptionId),
    onSuccess: () => { alert('Date selected! Event moved to Pending.'); invalidateAll(); },
    onError: (err: Error) => alert(err.message),
  });

  // Handlers
  const handleCopyInviteLink = async () => {
    if (!club?.invite_token) return;
    const inviteUrl = `${window.location.origin}/join/${club.invite_token}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link:', inviteUrl);
    }
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    topicMutation.mutate({ topicId: editingTopicId ?? undefined, data: { ...topicFormData, club: id } });
  };

  const handleUpdateClub = (e: React.FormEvent) => {
    e.preventDefault();
    updateClubMutation.mutate(clubFormData);
  };

  const handleCreateOrUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = { ...eventFormData, club: id, host: eventFormData.host || null };
    if (useDateVoting) {
      data.status = 'date_voting';
      data.date_option_dates = dateOptionDates;
      // Clear single date fields when using date voting
      data.start_datetime = null;
      data.end_datetime = null;
    }
    eventMutation.mutate({
      eventId: editingEventId ?? undefined,
      data,
    });
  };

  const handleEditEvent = (event: Event) => {
    const toDatetimeLocal = (iso: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setEditingEventId(event.id);
    setEventFormData({
      title: event.title, topic_ids: event.topics ? event.topics.map(t => t.id) : [],
      start_datetime: toDatetimeLocal(event.start_datetime),
      end_datetime: toDatetimeLocal(event.end_datetime),
      location: event.location, host: String(event.host), status: event.status,
    });
    if (event.status === 'date_voting' && event.date_options) {
      setUseDateVoting(true);
      setDateOptionDates(event.date_options.map(o => ({
        start_datetime: toDatetimeLocal(o.start_datetime),
        end_datetime: toDatetimeLocal(o.end_datetime),
      })));
    } else {
      setUseDateVoting(false);
      setDateOptionDates([]);
    }
    setShowEventForm(true);
  };

  const handleShowAttendees = async (eventId: number, eventTitle: string) => {
    setSelectedEventTitle(eventTitle);
    setShowAttendeesModal(true);
    setAttendeesLoading(true);
    try {
      const data = await eventsAPI.attendees(eventId);
      setAttendees(Array.isArray(data) ? data : []);
    } catch {
      setAttendees([]);
    } finally {
      setAttendeesLoading(false);
    }
  };

  const handleDeleteClub = () => {
    if (!window.confirm('Delete this club? This cannot be undone.')) return;
    updateClubMutation.mutate(clubFormData);
    navigate('/clubs');
  };

  // Sync clubFormData when club loads
  React.useEffect(() => {
    if (club) {
      setClubFormData({
        name: club.name, description: club.description, zip_code: club.zip_code,
        is_public: club.is_public ?? true, auto_approve_topics: club.auto_approve_topics ?? false,
      });
    }
  }, [club]);

  if (loading) return <div className="loading">Loading club...</div>;
  if (!club) return <div>Club not found</div>;

  return (
    <div className="container">
      <div className="card">
        <div className="flex-between">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>{club.name}</h1>
              <span className={`badge badge-${club.is_public ? 'success' : 'warning'}`} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                {club.is_public ? '🌐 Public' : '🔒 Private'}
              </span>
            </div>
            <p>{club.description}</p>
            <p><strong>Location:</strong> {club.zip_code}</p>
            <p><strong>Members:</strong> {club.member_count}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <button className="btn btn-secondary" onClick={handleCopyInviteLink} title="Copy invite link">
              {inviteCopied ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
            </button>
            {isClubAdmin && (
              <button className="btn btn-secondary" onClick={() => setShowEditClubForm(!showEditClubForm)}>
                {showEditClubForm ? 'Cancel' : 'Edit Club'}
              </button>
            )}
            {isSuperAdmin && <button className="btn btn-danger" onClick={handleDeleteClub}>Delete Club</button>}
          </div>
        </div>

        {showEditClubForm && (
          <div className="mt-2" style={{ borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Edit Club Information</h3>
            <form onSubmit={handleUpdateClub}>
              <div className="form-group">
                <label>Club Name *</label>
                <input type="text" className="form-control" value={clubFormData.name} onChange={(e) => setClubFormData({...clubFormData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea className="form-control" value={clubFormData.description} onChange={(e) => setClubFormData({...clubFormData, description: e.target.value})} rows={3} required />
              </div>
              <div className="form-group">
                <label>Zip Code *</label>
                <input type="text" className="form-control" value={clubFormData.zip_code} onChange={(e) => setClubFormData({...clubFormData, zip_code: e.target.value})} pattern="[0-9]{5}" title="5-digit zip" required />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={clubFormData.is_public} onChange={(e) => setClubFormData({...clubFormData, is_public: e.target.checked})} style={{ marginRight: '10px', width: '20px', height: '20px' }} />
                  <span><strong>Public Club</strong><span style={{ display: 'block', fontSize: '0.9rem', color: '#666' }}>Public clubs are visible to all users.</span></span>
                </label>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={clubFormData.auto_approve_topics} onChange={(e) => setClubFormData({...clubFormData, auto_approve_topics: e.target.checked})} style={{ marginRight: '10px', width: '20px', height: '20px' }} />
                  <span><strong>Auto-approve Topics</strong><span style={{ display: 'block', fontSize: '0.9rem', color: '#666' }}>Automatically approve topics from members.</span></span>
                </label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={updateClubMutation.isPending}>
                {updateClubMutation.isPending ? 'Updating...' : 'Update Club'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
          <button className={`btn ${activeTab === 'topics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('topics')}>Topics</button>
          <button className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('events')}>Events</button>
          <button className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('members')}>Members</button>
        </div>

        {activeTab === 'topics' && (
          <div className="mt-2">
            <div className="flex-between mb-2">
              <h3>Discussion Topics</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="btn btn-link btn-sm" onClick={() => setShowHidden(!showHidden)} style={{ padding: 0, textDecoration: 'underline', cursor: 'pointer' }}>
                  {showHidden ? 'Hide hidden' : 'Show hidden'}
                </button>
                <select className="form-control" style={{ width: 'auto', fontSize: '0.85em' }} value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'recent' | 'interested')}>
                  <option value="recent">Most recently added</option>
                  <option value="interested">Most interested</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={() => setShowTopicForm(!showTopicForm)}>{showTopicForm ? 'Cancel' : 'Add Topic'}</button>
              </div>
            </div>

            {showTopicForm && (
              <div className="card mb-2">
                <h4>{editingTopicId ? 'Edit Topic' : 'Add New Topic'}</h4>
                <form onSubmit={handleCreateTopic}>
                  <div className="form-group">
                    <label>Title *</label>
                    <input type="text" className="form-control" value={topicFormData.title} onChange={(e) => setTopicFormData({...topicFormData, title: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Description *</label>
                    <input type="text" className="form-control" value={topicFormData.description} onChange={(e) => setTopicFormData({...topicFormData, description: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Tags (comma-separated)</label>
                    <input type="text" className="form-control" value={topicFormData.tabs} onChange={(e) => setTopicFormData({...topicFormData, tabs: e.target.value})} maxLength={128} placeholder="e.g., philosophy, science, history" />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={topicMutation.isPending}>
                    {topicMutation.isPending ? 'Saving...' : editingTopicId ? 'Update Topic' : 'Add Topic'}
                  </button>
                  {editingTopicId && <button type="button" className="btn btn-secondary" onClick={() => { setShowTopicForm(false); setEditingTopicId(null); setTopicFormData({ title: '', description: '', tabs: '' }); }} style={{ marginLeft: '10px' }}>Cancel</button>}
                </form>
              </div>
            )}

            {topics.length === 0 ? (
              <p>No topics yet. Add a topic to get started!</p>
            ) : (
              <div className="topics-list">
                {topics
                  .filter((topic: Topic) => showHidden || topic.status !== 'hidden')
                  .sort((a: Topic, b: Topic) => {
                    if (sortOrder === 'interested') {
                      const aTotal = (a.interest_counts?.interested || 0) + (a.interest_counts?.able_to_lead || 0);
                      const bTotal = (b.interest_counts?.interested || 0) + (b.interest_counts?.able_to_lead || 0);
                      return bTotal - aTotal;
                    }
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                  })
                  .map((topic: Topic) => (
                  <div key={topic.id} className="card mb-2" style={{ padding: '16px' }}>
                    {/* Top section: two-column layout */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                      {/* Left column: Title + Description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ margin: '0 0 8px 0', fontWeight: 'bold', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{topic.title}</h4>
                        {topic.description && (
                          <p style={{ margin: 0, color: '#333', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{topic.description}</p>
                        )}
                      </div>
                      {/* Right column: Controls + Counts + Meta */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {isClubAdmin ? (
                            <select className="form-control" style={{ width: 'auto', fontSize: '0.8em', padding: '2px 4px' }} value={topic.status} onChange={(e) => topicStatusMutation.mutate({ topicId: topic.id, status: e.target.value })}>
                              <option value="pending">Pending</option>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="hidden">Hidden</option>
                            </select>
                          ) : (
                            <span className={`badge badge-${topic.status}`}>{topic.status}</span>
                          )}
                          {isTopicCreator(topic) && (
                            <button className="btn btn-sm btn-secondary" onClick={() => {
                              setEditingTopicId(topic.id);
                              setTopicFormData({ title: topic.title, description: topic.description, tabs: topic.tabs || '' });
                              setShowTopicForm(true);
                            }}>Edit</button>
                          )}
                          <select className="form-control" style={{ width: 'auto' }} value={topic.user_interest || ''} onChange={(e) => { if (e.target.value) { interestMutation.mutate({ topicId: topic.id, interestType: e.target.value }); } else { removeInterestMutation.mutate(topic.id); } }} title="Set my interest">
                            <option value="">My interest: none</option>
                            <option value="interested">👍 Interested</option>
                            <option value="able_to_lead">🎤 I can lead this discussion</option>
                            <option value="not_interested">👎 Not interested</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.85em', color: '#666', whiteSpace: 'nowrap' }}>
                          <span>👍 {topic.interest_counts?.interested || 0}</span>
                          <span>🎤 {topic.interest_counts?.able_to_lead || 0}</span>
                          <span>👎 {topic.interest_counts?.not_interested || 0}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8em', color: '#666' }}>
                          {topic.tabs && <span>🏷 {topic.tabs}</span>}
                          <span>👤 {topic.created_by_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="mt-2">
            <div className="flex-between mb-2">
              <h3>Events</h3>
              {isClubAdmin && <button className="btn btn-primary btn-sm" onClick={() => setShowEventForm(!showEventForm)}>{showEventForm ? 'Cancel' : 'Create Event'}</button>}
            </div>

            {showEventForm && (
              <div className="card mb-2">
                <h4>{editingEventId ? 'Edit Event' : 'Create New Event'}</h4>
                <form onSubmit={handleCreateOrUpdateEvent}>
                  <div className="form-group">
                    <label>Event Title *</label>
                    <input type="text" className="form-control" value={eventFormData.title} onChange={(e) => setEventFormData({...eventFormData, title: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Topics (select multiple)</label>
                    <select multiple className="form-control" value={eventFormData.topic_ids.map(String)} onChange={(e) => { const ids = Array.from(e.target.selectedOptions, o => parseInt(o.value)); setEventFormData({...eventFormData, topic_ids: ids}); }} style={{ height: '100px' }}>
                      {topics.filter((t: Topic) => t.status === 'active').map((topic: Topic) => (
                        <option key={topic.id} value={topic.id}>{topic.title}</option>
                      ))}
                    </select>
                    <small>Hold Ctrl (Cmd on Mac) to select multiple</small>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={useDateVoting} onChange={(e) => setUseDateVoting(e.target.checked)} style={{ marginRight: '10px', width: '20px', height: '20px' }} />
                      <span><strong>Date Voting</strong><span style={{ display: 'block', fontSize: '0.9rem', color: '#666' }}>Let members vote on multiple date options instead of setting a single date.</span></span>
                    </label>
                  </div>

                  {useDateVoting ? (
                    <div className="form-group">
                      <label>Date Options</label>
                      {dateOptionDates.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                          <input type="datetime-local" className="form-control" value={opt.start_datetime} onChange={(e) => { const updated = [...dateOptionDates]; updated[i] = { ...updated[i], start_datetime: e.target.value }; setDateOptionDates(updated); }} required />
                          <span>to</span>
                          <input type="datetime-local" className="form-control" value={opt.end_datetime} onChange={(e) => { const updated = [...dateOptionDates]; updated[i] = { ...updated[i], end_datetime: e.target.value }; setDateOptionDates(updated); }} required />
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => setDateOptionDates(dateOptionDates.filter((_, j) => j !== i))}>✕</button>
                        </div>
                      ))}
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDateOptionDates([...dateOptionDates, { start_datetime: '', end_datetime: '' }])}>+ Add Date Option</button>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Start Date/Time *</label>
                        <input type="datetime-local" className="form-control" value={eventFormData.start_datetime} onChange={(e) => setEventFormData({...eventFormData, start_datetime: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>End Date/Time *</label>
                        <input type="datetime-local" className="form-control" value={eventFormData.end_datetime} onChange={(e) => setEventFormData({...eventFormData, end_datetime: e.target.value})} required />
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label>Location *</label>
                    <textarea className="form-control" value={eventFormData.location} onChange={(e) => setEventFormData({...eventFormData, location: e.target.value})} rows={2} required />
                  </div>
                  <div className="form-group">
                    <label>Host</label>
                    <select className="form-control" value={eventFormData.host} onChange={(e) => setEventFormData({...eventFormData, host: e.target.value})}>
                      <option value="">-- Select Host --</option>
                      {members.filter((m: Member) => m.status === 'active').map((member: Member) => (
                        <option key={member.user} value={member.user}>{member.user_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-control" value={eventFormData.status} onChange={(e) => setEventFormData({...eventFormData, status: e.target.value})}>
                      <option value="pending">Pending</option>
                      <option value="date_voting">Date Voting</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={eventMutation.isPending}>
                    {eventMutation.isPending ? 'Saving...' : editingEventId ? 'Update Event' : 'Create Event'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowEventForm(false); setEditingEventId(null); setUseDateVoting(false); setDateOptionDates([]); setEventFormData({ title: '', topic_ids: [], start_datetime: '', end_datetime: '', location: '', host: '', status: 'pending' }); }} style={{ marginLeft: '10px' }}>Cancel</button>
                </form>
              </div>
            )}

            {events.length === 0 ? (
              <p>No events yet</p>
            ) : (
              <div>
                {events.map((event: Event) => (
                  <div key={event.id} className="card mb-2">
                    <h4>{event.title}</h4>
                    {event.start_datetime && <p><strong>Date:</strong> {new Date(event.start_datetime).toLocaleString()}</p>}
                    <p><strong>Location:</strong> {event.location}</p>
                    {event.host_name && <p><strong>Host:</strong> {event.host_name}</p>}
                    {event.topics && event.topics.length > 0 && <p><strong>Topics:</strong> {event.topics.map(t => t.title).join(', ')}</p>}
                    <p><strong>Status:</strong> <span className={`badge badge-${event.status}`}>{event.status}</span></p>

                    {event.status === 'date_voting' && event.date_options && event.date_options.length > 0 && (
                      <div style={{ margin: '10px 0', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                        <strong>Date Options (vote for your preferred):</strong>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
                          {event.date_options.map(opt => (
                            <li key={opt.id} style={{ padding: '6px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{new Date(opt.start_datetime).toLocaleString()} – {new Date(opt.end_datetime).toLocaleTimeString()}</span>
                              <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85em', color: '#666' }}>{opt.vote_count} vote{opt.vote_count !== 1 ? 's' : ''}</span>
                                <button
                                  className={`btn btn-sm ${opt.user_voted ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={() => voteDateMutation.mutate({ eventId: event.id, dateOptionId: opt.id })}
                                  disabled={voteDateMutation.isPending}
                                >
                                  {opt.user_voted ? '✓ Voted' : 'Vote'}
                                </button>
                                {isClubAdmin && (
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => { if (window.confirm('Select this date and move event to Pending?')) selectDateMutation.mutate({ eventId: event.id, dateOptionId: opt.id }); }}
                                    disabled={selectDateMutation.isPending}
                                  >
                                    Select
                                  </button>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p><strong>Attending:</strong>{' '}
                      <button className="btn btn-link btn-sm" onClick={() => handleShowAttendees(event.id, event.title)} style={{ padding: 0, textDecoration: 'underline', cursor: 'pointer' }}>
                        {event.attendance_count}
                      </button>
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => rsvpMutation.mutate(event.id)} disabled={rsvpMutation.isPending}>RSVP</button>
                      {isClubAdmin && <button className="btn btn-secondary btn-sm" onClick={() => handleEditEvent(event)}>Edit</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAttendeesModal && (
              <div className="modal-overlay" onClick={() => setShowAttendeesModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                  <div className="flex-between mb-2">
                    <h3 style={{ margin: 0 }}>Attendees: {selectedEventTitle}</h3>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAttendeesModal(false)}>✕</button>
                  </div>
                  {attendeesLoading ? (
                    <p>Loading...</p>
                  ) : attendees.length === 0 ? (
                    <p>No attendees yet.</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {attendees.map((a) => (
                        <li key={a.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                          <strong>{a.user_name}</strong>
                          <span style={{ color: '#666', marginLeft: '8px', fontSize: '0.9em' }}>{a.user_email}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="mt-2">
            <h3>Members</h3>
            {members.length === 0 ? (
              <p>No members yet</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Admin</th>
                    <th>Joined</th>
                    {isClubAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member: Member) => (
                    <tr key={member.id}>
                      <td>{member.user_name}</td>
                      <td><span className={`badge badge-${member.status}`}>{member.status}</span></td>
                      <td>{member.is_admin ? '✓' : ''}</td>
                      <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                      {isClubAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            {member.status === 'pending' && (
                              <button className="btn btn-sm btn-success" onClick={() => approveMemberMutation.mutate(member.id)}>Approve</button>
                            )}
                            <button className="btn btn-sm btn-secondary" onClick={() => toggleAdminMutation.mutate({ membershipId: member.id, isAdmin: !member.is_admin })}>
                              {member.is_admin ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => removeMemberMutation.mutate(member.id)}>Remove</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubDetail;
