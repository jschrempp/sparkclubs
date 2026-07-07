import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

function Header() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <h1 style={{ margin: 0 }}>Spark Clubs</h1>
        {isAuthenticated && (
          <nav className="nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/clubs">Clubs</Link>
            {user.user_type === 'site_admin' || user.user_type === 'super_admin' ? (
              <Link to="/admin">Admin</Link>
            ) : null}
            <Link to="/about">About</Link>
            <div>
              {user.first_name} {user.last_name}
            </div>
            <button onClick={logout} className="btn btn-sm btn-secondary">
              Logout
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
