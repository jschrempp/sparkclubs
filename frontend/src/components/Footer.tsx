import React from 'react';
import versionInfo from '../version.json';

const Footer: React.FC = () => {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '20px',
      marginTop: '40px',
      borderTop: '1px solid #ddd',
      fontSize: '0.85rem',
      color: '#666'
    }}>
      <div>
        Spark Clubs © 2026
      </div>
      <div style={{ marginTop: '5px' }}>
        Version: <code style={{ 
          backgroundColor: '#f4f4f4', 
          padding: '2px 6px', 
          borderRadius: '3px',
          fontSize: '0.8rem' 
        }}>
          {versionInfo.version}
        </code>
        {versionInfo.branch !== 'main' && (
          <span style={{ marginLeft: '8px', color: '#ff9800' }}>
            ({versionInfo.branch})
          </span>
        )}
      </div>
    </footer>
  );
};

export default Footer;