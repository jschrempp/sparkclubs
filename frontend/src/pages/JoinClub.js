import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { clubsAPI } from '../api';

function JoinClub() {
  const { inviteToken } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isPending } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteToken) {
      navigate('/');
      return;
    }

    if (!isAuthenticated) {
      // Remember which club to join once the user signs up / logs in
      localStorage.setItem('pendingClubInvite', inviteToken);
      navigate('/login');
      return;
    }

    if (isPending) {
      // Site account is still awaiting admin approval - queue the invite so
      // it's retried automatically once the account is approved and they log in.
      localStorage.setItem('pendingClubInvite', inviteToken);
      navigate('/dashboard');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const membership = await clubsAPI.joinByToken(inviteToken);
        if (!cancelled) navigate(`/clubs/${membership.club}`);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to join this club.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken, isAuthenticated, isPending, navigate]);

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
