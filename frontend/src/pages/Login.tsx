import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authAPI, clubsAPI } from '../api';
import { getPendingInvite, clearPendingInvite } from '../pendingInviteStore';

const USE_GOOGLE_OAUTH = import.meta.env.VITE_USE_GOOGLE_OAUTH === 'true';

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  zip_code: string;
  bio: string;
  password: string;
  confirmPassword: string;
}

interface GoogleData {
  google_id: string;
  email: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showRegistration, setShowRegistration] = useState(false);
  const [googleData, setGoogleData] = useState<GoogleData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    zip_code: '',
    bio: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const completeAuth = async (token: string, userData: Record<string, unknown>) => {
    login(token, userData as never);

    const pendingInviteToken = getPendingInvite();
    if (pendingInviteToken) {
      if ((userData as Record<string, unknown>).user_type === 'pending') {
        navigate('/dashboard');
        return;
      }

      try {
        const membership = await clubsAPI.joinByToken(pendingInviteToken);
        clearPendingInvite();
        navigate(`/clubs/${membership.club}`);
      } catch {
        clearPendingInvite();
        navigate('/dashboard');
      }
      return;
    }

    navigate('/dashboard');
  };

  const toggleShow = (field: string) =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const eyeBtn = (field: string) => (
    <button
      type="button"
      onClick={() => toggleShow(field)}
      style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 13, padding: 0,
      }}
    >
      {showPasswords[field] ? 'Hide' : 'Show'}
    </button>
  );

  const handleGoogleSuccess = async (credentialResponse: { credential: string }) => {
    try {
      const result = await authAPI.googleAuth(credentialResponse.credential);
      
      if (result.needs_registration) {
        setGoogleData({
          google_id: result.google_id,
          email: result.email,
        });
        setFormData(prev => ({
          ...prev,
          email: result.email,
        }));
        setShowRegistration(true);
      } else {
        await completeAuth(result.token, result.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleTraditionalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await authAPI.login(formData.email, formData.password);
      await completeAuth(result.token, result.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One digit', test: (p: string) => /\d/.test(p) },
    { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];
  const passwordValid = (p: string) => passwordRequirements.every((r) => r.test(p));

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!USE_GOOGLE_OAUTH && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!USE_GOOGLE_OAUTH && !passwordValid(formData.password)) {
      setError('Password does not meet the requirements');
      return;
    }

    try {
      const registrationData: Record<string, unknown> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        zip_code: formData.zip_code,
        bio: formData.bio,
      };

      if (USE_GOOGLE_OAUTH && googleData) {
        registrationData.google_id = googleData.google_id;
      } else {
        registrationData.password = formData.password;
      }

      const result = await authAPI.register(registrationData);
      await completeAuth(result.token, result.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (showRegistration) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: '500px', margin: '50px auto' }}>
          <h2>Complete Your Registration</h2>
          <form onSubmit={handleRegistrationSubmit}>
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="first_name"
                className="form-control"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="last_name"
                className="form-control"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleInputChange}
                readOnly={USE_GOOGLE_OAUTH}
                required
              />
            </div>
            {!USE_GOOGLE_OAUTH && (
              <>
                <div className="form-group">
                  <label>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.reg_password ? 'text' : 'password'}
                      name="password"
                      className="form-control"
                      value={formData.password}
                      onChange={handleInputChange}
                      style={{ paddingRight: 55 }}
                      required
                    />
                    {eyeBtn('reg_password')}
                  </div>
                  {formData.password && (
                    <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 13 }}>
                      {passwordRequirements.map((r) => (
                        <li key={r.label} style={{ color: r.test(formData.password) ? '#28a745' : '#dc3545' }}>
                          {r.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="form-group">
                  <label>Confirm Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.reg_confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      className="form-control"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      style={{ paddingRight: 55 }}
                      required
                    />
                    {eyeBtn('reg_confirm')}
                  </div>
                </div>
              </>
            )}
            <div className="form-group">
              <label>Zip Code *</label>
              <input
                type="text"
                name="zip_code"
                className="form-control"
                value={formData.zip_code}
                onChange={handleInputChange}
                pattern="[0-9]{5}"
                title="Enter a valid 5-digit zip code"
                required
              />
            </div>
            <div className="form-group">
              <label>Bio (Optional)</label>
              <textarea
                name="bio"
                className="form-control"
                value={formData.bio}
                onChange={handleInputChange}
                rows={3}
                maxLength={500}
              />
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn btn-primary mt-1">
              Complete Registration
            </button>
            <button
              type="button"
              className="btn btn-secondary mt-1"
              onClick={() => {
                setShowRegistration(false);
                setGoogleData(null);
                setFormData({
                  first_name: '',
                  last_name: '',
                  email: '',
                  zip_code: '',
                  bio: '',
                  password: '',
                  confirmPassword: '',
                });
              }}
            >
              Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (USE_GOOGLE_OAUTH) {
    return (
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
        <div className="container">
          <div className="card" style={{ maxWidth: '500px', margin: '100px auto', textAlign: 'center' }}>
            <h1>Welcome to Spark Clubs</h1>
            <p>Join discussion groups, share ideas, and schedule events.</p>
            <div style={{ marginTop: '30px' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google login failed')}
                useOneTap
              />
            </div>
            {error && <div className="error mt-1">{error}</div>}
          </div>
        </div>
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '500px', margin: '100px auto' }}>
        <h1 style={{ textAlign: 'center' }}>Welcome to Spark Clubs</h1>
        <p style={{ textAlign: 'center' }}>Join discussion groups, share ideas, and schedule events.</p>
        
        <form onSubmit={handleTraditionalLogin} style={{ marginTop: '30px' }}>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPasswords.login ? 'text' : 'password'}
                name="password"
                className="form-control"
                value={formData.password}
                onChange={handleInputChange}
                style={{ paddingRight: 55 }}
                required
              />
              {eyeBtn('login')}
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn btn-primary mt-1" style={{ width: '100%' }}>
            Sign In
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p>Don&apos;t have an account?</p>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowRegistration(true);
              setFormData({
                first_name: '',
                last_name: '',
                email: '',
                zip_code: '',
                bio: '',
                password: '',
                confirmPassword: '',
              });
            }}
            style={{ width: '100%' }}
          >
            Request an Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;