import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clubsAPI, topicsAPI, eventsAPI, membershipsAPI } from '../api';
import { useAuth } from '../AuthContext';

function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [club, setClub] = useState(null);
  const [topics, setTopics] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('topics');
  const [loading, setLoading] = useState(true);
  const { user, isSiteAdmin, isSuperAdmin } = useAuth();
  const [inviteCopied, setInviteCopied] = useState(false);

  // Check if user is club admin (site admins are always club admin)
  const isClubAdmin = isSiteAdmin || members.find(m => m.user === user?.id && m.is_admin && m.status === 'active');

  const handleCopyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/join/${id}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch (err) {
      window.prompt('Copy this invite link:', inviteUrl);
    }
  };
  
  // Form states
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicFormData, setTopicFormData] = useState({
    title: '',
    description: '',
    tabs: '',
  });
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [showEditClubForm, setShowEditClubForm] = useState(false);
  const [clubFormData, setClubFormData] = useState({
    name: '',
    description: '',
    zip_code: '',
    is_public: true,
    auto_approve_topics: false,
  });
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventFormData, setEventFormData] = useState({
    title: '',
    topic_ids: [],
    start_datetime: '',
    end_datetime: '',
    location: '',
    host: '',
    status: 'pending',
  });

  const loadClubData = useCallback(async () => {
    try {
      const [clubData, topicsData, eventsData, membersData] = await Promise.all([
        clubsAPI.get(id),
        topicsAPI.list(id),
        eventsAPI.list(id),
        clubsAPI.getMembers(id),
      ]);
      setClub(clubData);
      // Handle paginated responses
      setTopics(Array.isArray(topicsData) ? topicsData : (topicsData.results || []));
      setEvents(Array.isArray(eventsData) ? eventsData : (eventsData.results || []));
      setMembers(Array.isArray(membersData) ? membersData : (membersData.results || []));
      // Set club form data
      setClubFormData({
        name: clubData.name,
        description: clubData.description,
        zip_code: clubData.zip_code,
        is_public: clubData.is_public !== undefined ? clubData.is_public : true,
        auto_approve_topics: clubData.auto_approve_topics !== undefined ? clubData.auto_approve_topics : false,
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadClubData();
  }, [loadClubData]);

  const handleRSVP = async (eventId) => {
    try {
      await eventsAPI.rsvp(eventId, 'attending');
      alert('RSVP successful!');
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetInterest = async (topicId, interestType) => {
    try {
      await topicsAPI.setInterest(topicId, interestType);
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveInterest = async (topicId) => {
    try {
      await topicsAPI.removeInterest(topicId);
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleApproveMember = async (membershipId) => {
    try {
      await membershipsAPI.approve(membershipId);
      alert('Member approved!');
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (membershipId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await membershipsAPI.remove(membershipId);
      alert('Member removed');
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleAdmin = async (membershipId, isCurrentlyAdmin) => {
    try {
      await membershipsAPI.setAdmin(membershipId, !isCurrentlyAdmin);
      alert(`Admin status ${!isCurrentlyAdmin ? 'granted' : 'removed'}`);
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      const topicData = {
        ...topicFormData,
        club: id,
      };

      if (editingTopicId) {
        await topicsAPI.update(editingTopicId, topicData);
        alert('Topic updated successfully!');
      } else {
        await topicsAPI.create(topicData);
        alert('Topic added successfully! It will be pending until approved by an admin.');
      }

      setShowTopicForm(false);
      setEditingTopicId(null);
      setTopicFormData({ title: '', description: '', tabs: '' });
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateClub = async (e) => {
    e.preventDefault();
    try {
      await clubsAPI.update(id, clubFormData);
      alert('Club updated successfully!');
      setShowEditClubForm(false);
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangeTopicStatus = async (topicId, newStatus) => {
    try {
      await topicsAPI.update(topicId, { status: newStatus });
      alert('Topic status updated!');
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancelTopicForm = () => {
    setShowTopicForm(false);
    setEditingTopicId(null);
    setTopicFormData({ title: '', description: '', tabs: '' });
  };

  const handleCreateOrUpdateEvent = async (e) => {
    e.preventDefault();
    try {
      const eventData = {
        title: eventFormData.title,
        topic_ids: eventFormData.topic_ids,
        start_datetime: eventFormData.start_datetime,
        end_datetime: eventFormData.end_datetime,
        location: eventFormData.location,
        host: eventFormData.host,
        status: eventFormData.status,
        club: id,
      };

      if (editingEventId) {
        await eventsAPI.update(editingEventId, eventData);
        alert('Event updated successfully!');
      } else {
        await eventsAPI.create(eventData);
        alert('Event created successfully!');
      }

      handleCancelEventForm();
      loadClubData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEventId(event.id);
    setEventFormData({
      title: event.title,
      topic_ids: event.topics ? event.topics.map(t => t.id) : [],
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      location: event.location,
      host: event.host,
      status: event.status,
    });
    setShowEventForm(true);
  };

  const handleCancelEventForm = () => {
    setShowEventForm(false);
    setEditingEventId(null);
    setEventFormData({
      title: '',
      topic_ids: [],
      start_datetime: '',
      end_datetime: '',
      location: '',
      host: '',
      status: 'pending',
    });
  };

  const handleDeleteClub = async () => {
    if (!window.confirm('Are you sure you want to delete this club? This will remove all topics and members from the club. This action cannot be undone.')) {
      return;
    }
    
    try {
      await clubsAPI.delete(id);
      alert('Club deleted successfully!');
      navigate('/clubs');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading">Loading club...</div>;
  if (!club) return <div>Club not found</div>;

  return (
    <div className="container">
      <div className="card">
        <div className="flex-between">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>{club.name}</h1>
              <span 
                className={`badge badge-${club.is_public ? 'success' : 'warning'}`}
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
              >
                {club.is_public ? '🌐 Public' : '🔒 Private'}
              </span>
            </div>
            <p>{club.description}</p>
            <p><strong>Location:</strong> {club.zip_code}</p>
            <p><strong>Members:</strong> {club.member_count}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <button
              className="btn btn-secondary"
              onClick={handleCopyInviteLink}
              title="Copy a link you can share to invite someone to this club"
            >
              {inviteCopied ? '✓ Link Copied!' : '🔗 Copy Invite Link'}
            </button>
            {isClubAdmin && (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEditClubForm(!showEditClubForm)}
              >
                {showEditClubForm ? 'Cancel' : 'Edit Club'}
              </button>
            )}
            {isSuperAdmin && (
              <button 
                className="btn btn-danger"
                onClick={handleDeleteClub}
              >
                Delete Club
              </button>
            )}
          </div>
        </div>

        {showEditClubForm && (
          <div className="mt-2" style={{ borderTop: '1px solid #ddd', paddingTop: '20px' }}>
            <h3>Edit Club Information</h3>
            <form onSubmit={handleUpdateClub}>
              <div className="form-group">
                <label>Club Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={clubFormData.name}
                  onChange={(e) => setClubFormData({...clubFormData, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  className="form-control"
                  value={clubFormData.description}
                  onChange={(e) => setClubFormData({...clubFormData, description: e.target.value})}
                  rows="3"
                  required
                />
              </div>
              <div className="form-group">
                <label>Zip Code *</label>
                <input
                  type="text"
                  className="form-control"
                  value={clubFormData.zip_code}
                  onChange={(e) => setClubFormData({...clubFormData, zip_code: e.target.value})}
                  pattern="[0-9]{5}"
                  title="Enter a valid 5-digit zip code"
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={clubFormData.is_public}
                    onChange={(e) => setClubFormData({...clubFormData, is_public: e.target.checked})}
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
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={clubFormData.auto_approve_topics}
                    onChange={(e) => setClubFormData({...clubFormData, auto_approve_topics: e.target.checked})}
                    style={{ marginRight: '10px', width: '20px', height: '20px' }}
                  />
                  <span>
                    <strong>Auto-approve Topics</strong>
                    <span style={{ display: 'block', fontSize: '0.9rem', color: '#666' }}>
                      Automatically approve topics when members add them. When disabled, admins must manually approve topics.
                    </span>
                  </span>
                </label>
              </div>
              <button type="submit" className="btn btn-primary">Update Club</button>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
          <button 
            className={`btn ${activeTab === 'topics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('topics')}
          >
            Topics
          </button>
          <button 
            className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('events')}
          >
            Events
          </button>
          <button 
            className={`btn ${activeTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
        </div>

        {activeTab === 'topics' && (
          <div className="mt-2">
            <div className="flex-between mb-2">
              <h3>Discussion Topics</h3>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setShowTopicForm(!showTopicForm)}
              >
                {showTopicForm ? 'Cancel' : 'Add Topic'}
              </button>
            </div>

            {showTopicForm && (
              <div className="card mb-2">
                <h4>{editingTopicId ? 'Edit Topic' : 'Add New Topic'}</h4>
                <form onSubmit={handleCreateTopic}>
                  <div className="form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={topicFormData.title}
                      onChange={(e) => setTopicFormData({...topicFormData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={topicFormData.description}
                      onChange={(e) => setTopicFormData({...topicFormData, description: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={topicFormData.tabs}
                      onChange={(e) => setTopicFormData({...topicFormData, tabs: e.target.value})}
                      maxLength="128"
                      placeholder="e.g., philosophy, science, history"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    {editingTopicId ? 'Update Topic' : 'Add Topic'}
                  </button>
                  {editingTopicId && (
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleCancelTopicForm}
                      style={{ marginLeft: '10px' }}
                    >
                      Cancel
                    </button>
                  )}
                </form>
              </div>
            )}

            {topics.length === 0 ? (
              <p>No topics yet. Add a topic to get started!</p>
            ) : (
              <div className="topics-list">
                {topics.map((topic) => (
                  <div key={topic.id} className="card mb-2" style={{ padding: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      {topic.title}
                    </h4>
                    {topic.description && (
                      <p style={{ margin: '0 0 12px 0', color: '#333', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        {topic.description}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8em',
                      color: '#666',
                      paddingTop: '8px',
                      borderTop: '1px solid #eee'
                    }}>
                      {topic.tabs && <span>🏷 {topic.tabs}</span>}
                      <span>👤 {topic.created_by_name}</span>

                      {isClubAdmin ? (
                        <select
                          className="form-control"
                          style={{ width: 'auto', fontSize: 'inherit', padding: '2px 4px' }}
                          value={topic.status}
                          onChange={(e) => handleChangeTopicStatus(topic.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      ) : (
                        <span className={`badge badge-${topic.status}`}>{topic.status}</span>
                      )}

                      <span>👍 {topic.interest_counts?.interested || 0}</span>
                      <span>🎤 {topic.interest_counts?.able_to_lead || 0}</span>
                      <span>👎 {topic.interest_counts?.not_interested || 0}</span>

                      {topic.user_interest ? (
                        <span className="badge badge-success">My interest: {topic.user_interest}</span>
                      ) : (
                        <span className="badge badge-secondary">My interest: none</span>
                      )}
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <select
                        className="form-control"
                        style={{ width: 'auto' }}
                        value={topic.user_interest || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            handleRemoveInterest(topic.id);
                          } else {
                            handleSetInterest(topic.id, value);
                          }
                        }}
                        title="Set my interest in this topic"
                      >
                        <option value="">My interest: none</option>
                        <option value="interested">👍 Interested</option>
                        <option value="able_to_lead">🎤 I can lead this discussion</option>
                        <option value="not_interested">👎 Not interested</option>
                      </select>
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
              {isClubAdmin && (
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowEventForm(!showEventForm)}
                >
                  {showEventForm ? 'Cancel' : 'Create Event'}
                </button>
              )}
            </div>

            {showEventForm && (
              <div className="card mb-2">
                <h4>{editingEventId ? 'Edit Event' : 'Create New Event'}</h4>
                <form onSubmit={handleCreateOrUpdateEvent}>
                  <div className="form-group">
                    <label>Event Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={eventFormData.title}
                      onChange={(e) => setEventFormData({...eventFormData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Topics (select multiple)</label>
                    <select
                      multiple
                      className="form-control"
                      value={eventFormData.topic_ids}
                      onChange={(e) => {
                        const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                        setEventFormData({...eventFormData, topic_ids: selectedIds});
                      }}
                      style={{ height: '100px' }}
                    >
                      {topics.filter(t => t.status === 'active').map(topic => (
                        <option key={topic.id} value={topic.id}>
                          {topic.title}
                        </option>
                      ))}
                    </select>
                    <small>Hold Ctrl (Cmd on Mac) to select multiple topics</small>
                  </div>
                  <div className="form-group">
                    <label>Start Date/Time *</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={eventFormData.start_datetime}
                      onChange={(e) => setEventFormData({...eventFormData, start_datetime: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date/Time *</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={eventFormData.end_datetime}
                      onChange={(e) => setEventFormData({...eventFormData, end_datetime: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Location *</label>
                    <textarea
                      className="form-control"
                      value={eventFormData.location}
                      onChange={(e) => setEventFormData({...eventFormData, location: e.target.value})}
                      rows="2"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Host</label>
                    <select
                      className="form-control"
                      value={eventFormData.host}
                      onChange={(e) => setEventFormData({...eventFormData, host: e.target.value})}
                    >
                      <option value="">-- Select Host --</option>
                      {members.filter(m => m.status === 'active').map(member => (
                        <option key={member.user} value={member.user}>
                          {member.user_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      className="form-control"
                      value={eventFormData.status}
                      onChange={(e) => setEventFormData({...eventFormData, status: e.target.value})}
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    {editingEventId ? 'Update Event' : 'Create Event'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancelEventForm}
                    style={{ marginLeft: '10px' }}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            {events.length === 0 ? (
              <p>No events yet</p>
            ) : (
              <div>
                {events.map(event => (
                  <div key={event.id} className="card mb-2">
                    <h4>{event.title}</h4>
                    <p><strong>Date:</strong> {new Date(event.start_datetime).toLocaleString()}</p>
                    <p><strong>Location:</strong> {event.location}</p>
                    {event.host_name && <p><strong>Host:</strong> {event.host_name}</p>}
                    {event.topics && event.topics.length > 0 && (
                      <p><strong>Topics:</strong> {event.topics.map(t => t.title).join(', ')}</p>
                    )}
                    <p><strong>Status:</strong> <span className={`badge badge-${event.status}`}>{event.status}</span></p>
                    <p><strong>Attending:</strong> {event.attendance_count}</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRSVP(event.id)}
                      >
                        RSVP
                      </button>
                      {isClubAdmin && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEditEvent(event)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
                  {members.map(member => (
                    <tr key={member.id}>
                      <td>{member.user_name}</td>
                      <td><span className={`badge badge-${member.status}`}>{member.status}</span></td>
                      <td>{member.is_admin ? '✓' : ''}</td>
                      <td>{new Date(member.joined_at).toLocaleDateString()}</td>
                      {isClubAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            {member.status === 'pending' && (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleApproveMember(member.id)}
                              >
                                Approve
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleToggleAdmin(member.id, member.is_admin)}
                            >
                              {member.is_admin ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              Remove
                            </button>
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
}

export default ClubDetail;
