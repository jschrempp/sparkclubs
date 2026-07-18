import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <h1 style={styles.logoText}>✨ Spark Clubs</h1>
        </div>
        <div style={styles.headerRight}>
          <button 
            style={styles.aboutLink}
            onClick={() => navigate('/about')}
            onMouseOver={(e) => { (e.target as HTMLButtonElement).style.color = '#007bff'; }}
            onMouseOut={(e) => { (e.target as HTMLButtonElement).style.color = '#666'; }}
          >
            About
          </button>
          <button 
            style={styles.loginButton}
            onClick={() => navigate('/login')}
            onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#0056b3'; }}
            onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#007bff'; }}
          >
            Login / Sign Up
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              Connect Through Discussion
            </h1>
            <p style={styles.heroSubtitle}>
              Join vibrant discussion clubs, explore thought-provoking topics, and engage in meaningful conversations with fellow thinkers in your community.
            </p>
            <button 
              style={styles.ctaButton}
              onClick={() => navigate('/login')}
              onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#218838'; }}
              onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#28a745'; }}
            >
              Get Started
            </button>
          </div>
        </div>

        <div style={styles.imageSection}>
          <div style={styles.imageGrid}>
            <div style={{...styles.imageCard, ...styles.imageCard1}}>
              <img 
                src="https://images.pexels.com/photos/35203995/pexels-photo-35203995.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Diverse group of friends talking and laughing in a cozy living room"
                style={styles.image}
              />
              <div style={styles.imageOverlay}>
                <p style={styles.imageText}>Engaging Discussions</p>
              </div>
            </div>

            <div style={{...styles.imageCard, ...styles.imageCard2}}>
              <img 
                src="https://images.pexels.com/photos/8275697/pexels-photo-8275697.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Discussion club members sharing perspectives in a welcoming living room"
                style={styles.image}
              />
              <div style={styles.imageOverlay}>
                <p style={styles.imageText}>Build Community</p>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.features}>
          <h2 style={styles.featuresTitle}>Why Join Our Discussion Clubs?</h2>
          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>👥</div>
              <h3 style={styles.featureTitle}>Connect</h3>
              <p style={styles.featureText}>Meet fellow thinkers and build lasting friendships</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📖</div>
              <h3 style={styles.featureTitle}>Discover</h3>
              <p style={styles.featureText}>Explore new topics and expand your knowledge</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>💬</div>
              <h3 style={styles.featureTitle}>Discuss</h3>
              <p style={styles.featureText}>Engage in meaningful conversations with fellow thinkers</p>
            </div>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>© 2026 Spark Clubs. All rights reserved.</p>
      </footer>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  logo: {},
  logoText: {
    fontSize: '24px',
    color: '#007bff',
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  aboutLink: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '16px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  loginButton: {
    padding: '10px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  main: {
    flex: 1,
  },
  hero: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '80px 40px',
    textAlign: 'center',
    color: 'white',
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  heroTitle: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  heroSubtitle: {
    fontSize: '20px',
    lineHeight: 1.6,
    marginBottom: '30px',
    opacity: 0.9,
  },
  ctaButton: {
    padding: '16px 40px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '18px',
    cursor: 'pointer',
  },
  imageSection: {
    padding: '60px 40px',
    backgroundColor: '#f8f9fa',
  },
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  imageCard: {
    position: 'relative',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  imageCard1: {},
  imageCard2: {},
  image: {
    width: '100%',
    height: '300px',
    objectFit: 'cover',
    display: 'block',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
    padding: '20px',
  },
  imageText: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
  },
  features: {
    padding: '60px 40px',
    textAlign: 'center',
  },
  featuresTitle: {
    fontSize: '32px',
    marginBottom: '40px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  featureCard: {
    padding: '30px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  featureIcon: {
    fontSize: '48px',
    marginBottom: '15px',
  },
  featureTitle: {
    fontSize: '20px',
    marginBottom: '10px',
  },
  featureText: {
    color: '#666',
    lineHeight: 1.5,
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #ddd',
    color: '#666',
  },
};

export default Landing;