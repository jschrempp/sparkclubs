import React from 'react';
import { useNavigate } from 'react-router-dom';

function Landing() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      {/* Header with Login/Signup button */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <h1 style={styles.logoText}>� Spark Clubs</h1>
        </div>
        <div style={styles.headerRight}>
          <button 
            style={styles.aboutLink}
            onClick={() => navigate('/about')}
            onMouseOver={(e) => e.target.style.color = '#007bff'}
            onMouseOut={(e) => e.target.style.color = '#666'}
          >
            About
          </button>
          <button 
            style={styles.loginButton}
            onClick={() => navigate('/login')}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Login / Sign Up
          </button>
        </div>
      </header>

      {/* Hero Section */}
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
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Image Section */}
        <div style={styles.imageSection}>
          <div style={styles.imageGrid}>
            {/* Image 1 - Placeholder, replace with actual image */}
            <div style={{...styles.imageCard, ...styles.imageCard1}}>
              <img 
                src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&q=80"
                alt="Diverse group of people discussing topics in a cozy living room"
                style={styles.image}
              />
              <div style={styles.imageOverlay}>
                <p style={styles.imageText}>Engaging Discussions</p>
              </div>
            </div>

            {/* Image 2 - Placeholder, replace with actual image */}
            <div style={{...styles.imageCard, ...styles.imageCard2}}>
              <img 
                src="https://images.unsplash.com/photo-1509266272358-7701da638078?w=800&q=80"
                alt="Discussion club members sharing perspectives in a welcoming environment"
                style={styles.image}
              />
              <div style={styles.imageOverlay}>
                <p style={styles.imageText}>Build Community</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
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
              <p style={styles.featureText}>Share insights and dive deep into meaningful conversations</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>© 2026 Spark Clubs. Bringing thinkers together.</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
  },
  logoText: {
    margin: 0,
    fontSize: '24px',
    color: '#333',
    fontWeight: '600',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  aboutLink: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: 'transparent',
    color: '#666',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'color 0.3s ease',
  },
  loginButton: {
    padding: '12px 30px',
    fontSize: '16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.3s ease',
  },
  main: {
    flex: 1,
  },
  hero: {
    padding: '80px 40px',
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '20px',
    lineHeight: '1.2',
  },
  heroSubtitle: {
    fontSize: '20px',
    color: '#666',
    marginBottom: '40px',
    lineHeight: '1.6',
  },
  ctaButton: {
    padding: '16px 40px',
    fontSize: '18px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background-color 0.3s ease',
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
    transition: 'transform 0.3s ease',
    cursor: 'pointer',
  },
  imageCard1: {
    gridColumn: 'span 1',
  },
  imageCard2: {
    gridColumn: 'span 1',
  },
  image: {
    width: '100%',
    height: '400px',
    objectFit: 'cover',
    display: 'block',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
  },
  imageText: {
    color: 'white',
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
  },
  features: {
    padding: '80px 40px',
    backgroundColor: '#ffffff',
    textAlign: 'center',
  },
  featuresTitle: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '50px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  featureCard: {
    padding: '30px',
    textAlign: 'center',
  },
  featureIcon: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  featureTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '15px',
  },
  featureText: {
    fontSize: '16px',
    color: '#666',
    lineHeight: '1.6',
  },
  footer: {
    padding: '30px 40px',
    backgroundColor: '#333',
    textAlign: 'center',
  },
  footerText: {
    color: '#fff',
    margin: 0,
    fontSize: '14px',
  },
};

export default Landing;
