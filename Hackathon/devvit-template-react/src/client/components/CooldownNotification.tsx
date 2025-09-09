import React from 'react';

interface CooldownNotificationProps {
  isVisible: boolean;
  remainingTime: number;
  formatTime: (seconds: number) => string;
}

const CooldownNotification: React.FC<CooldownNotificationProps> = ({
  isVisible,
  remainingTime,
  formatTime,
}) => {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        textAlign: 'center',
        zIndex: 1000,
        minWidth: '200px',
      }}
    >
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
        Drawing Cooldown
      </div>
      <div style={{ fontSize: '14px', marginBottom: '10px' }}>
        You need to wait before drawing again
      </div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b' }}>
        {formatTime(remainingTime)}
      </div>
    </div>
  );
};

export default CooldownNotification;
