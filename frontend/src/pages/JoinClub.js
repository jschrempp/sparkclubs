import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { clubsAPI } from '../api';

function JoinClub() {
  const { clubId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isPending } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clubId) {
      navigate('/');
      return;
    }

    if (!isAuthenticated) {
      // Remember which club to join once the user signs up / logs in
      localStorage.setItem('pendingClubInvite', clubId);
      navigate('/login');
      return;
    }

    if (isPending) {
      // Site account is still awaiting admin approval - queue the invite so
      // it's retried automatically once the account is approved and they log in.
      localStorage.setItem('pendingClubInvite', clubId);
      navigate('/dashboard');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await clubsAPI.join(clubId);
        if (!cancelled) navigate(`/clubs/${clubId}`);
      } catch (err) {
        const message = err.message || '';
        if (/already a member|pending request/i.test(message)) {
          // Already a member or has a pending request - just go to the club
          if (!cancelled) navigate(`/clubs/${clubId}`);
        } else if (!cancelled) {
          setError(message || 'Unable to join this club.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clubId, isAuthenticated, isPending, navigate]);

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '500px', margin: '100px auto', textAlign: 'center' }}>
        {error ? (
          <>
            <h2>Couldn't Join Club</h2>
            <p className="error">{error}</p>
            <Link to="/dashboard" className="btn btn-primary mt-1">Go to Dashboard</Link>
          </>
        ) : (
          <h2>Joining club...</h2>
        )}
      </div>
    </div>
  );
}

export default JoinClub;
