import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [message, setMessage] = useState('');
  const [chatId, setChatId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [messageId, setMessageId] = useState('');
  const [broadcastResults, setBroadcastResults] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('https://abiybot34.onrender.com/api/broadcast', { message, imageUrl });
      setBroadcastResults(response.data.results);
      setIsModalOpen(true);
      setMessage('');
      setImageUrl('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message.');
    }
  };

  const handleBroadcastImage = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('https://abiybot34.onrender.com/api/broadcastImage', { imageUrl });
      setBroadcastResults(response.data.results);
      setIsModalOpen(true);
      setImageUrl('');
    } catch (error) {
      console.error('Failed to send image:', error);
      alert('Failed to send image.');
    }
  };

  const handleSendToUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('https://abiybot34.onrender.com/api/sendToUser', { chatId, message, imageUrl });
    //   alert(`Message sent to user with Chat ID: ${chatId}`);
      setMessageId(response.data.messageId);
      setChatId('');
      setMessage('');
      setImageUrl('');
    } catch (error) {
      console.error('Failed to send message to user:', error);
      alert('Failed to send message to user.');
    }
  };

  const handleDeleteMessage = async () => {
    try {
      await axios.post('https://abiybot34.onrender.com/api/deleteMessage', { chatId, messageId });
    //   alert('Message deleted successfully!');
      setMessageId('');
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message.');
    }
  };

  const handleDeleteAllMessages = async () => {
    try {
      await axios.post('https://abiybot34.onrender.com/api/deleteAllMessages');
    //   alert('All broadcast messages deleted successfully!');
    } catch (error) {
      console.error('Failed to delete all messages:', error);
      alert('Failed to delete all messages.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Broadcast Message</h1>
      <form onSubmit={handleBroadcast}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message here..."
          rows="5"
          style={{ width: '100%', marginBottom: '10px' }}
        />
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Enter Image URL (optional)"
          style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', marginRight: '10px' }}>
          Broadcast to All
        </button>
      </form>

      <h2>Send Image Only to All Users</h2>
      <form onSubmit={handleBroadcastImage}>
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Enter Image URL"
          style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', marginRight: '10px' }}>
          Broadcast Image to All
        </button>
      </form>

      <h2>Send Message to Specific User</h2>
      <form onSubmit={handleSendToUser}>
        <input
          type="text"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="Enter Chat ID"
          style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your message here..."
          rows="5"
          style={{ width: '100%', marginBottom: '10px' }}
        />
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Enter Image URL (optional)"
          style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px' }}>
          Send to User
        </button>
      </form>

      {messageId && (
        <div style={{ marginTop: '20px' }}>
          <button onClick={handleDeleteMessage} style={{ padding: '10px 20px', backgroundColor: 'red', color: 'white' }}>
            Delete Message
          </button>
        </div>
      )}

      <h3>Delete All Broadcast Messages</h3>
      <button onClick={handleDeleteAllMessages} style={{ padding: '10px 20px', backgroundColor: 'red', color: 'white' }}>
        Delete All Messages
      </button>
      <br/>
      <h3>Delete Message by Text or Image</h3>
<form onSubmit={async (e) => {
  e.preventDefault();
  try {
    await axios.post('https://abiybot34.onrender.com/api/deleteByContent', {
      message,
      imageUrl,
    });
    // alert('Matching messages deleted!');
  } catch (error) {
    console.error('Failed to delete message by content:', error);
    alert('Error deleting messages by content.');
  }
}}>
  <textarea
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    placeholder="Enter exact message text (optional)"
    rows="3"
    style={{ width: '100%', marginBottom: '10px' }}
  />
  <input
    type="text"
    value={imageUrl}
    onChange={(e) => setImageUrl(e.target.value)}
    placeholder="Enter image URL (optional)"
    style={{ width: '100%', marginBottom: '10px', padding: '10px' }}
  />
  <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'orange', color: 'white' }}>
    Delete Matching Messages
  </button>
</form>

      {/* Modal for Broadcast Results */}
      {isModalOpen && broadcastResults && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            fontFamily: 'Arial, sans-serif'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '15px 20px',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <h3 style={{ margin: 0, color: '#333' }}>Broadcast Delivery Report</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#aaa',
                  lineHeight: '1'
                }}
              >
                &times;
              </button>
            </div>

            {/* Summary Banner */}
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#e9ecef',
              borderBottom: '1px solid #dee2e6',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              gap: '20px',
              color: '#495057'
            }}>
              <span>Total Targeted: {broadcastResults.length}</span>
              <span style={{ color: '#28a745' }}>Reached: {broadcastResults.filter(r => r.success).length}</span>
              <span style={{ color: '#dc3545' }}>Failed: {broadcastResults.filter(r => !r.success).length}</span>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
              maxHeight: '55vh'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left', backgroundColor: '#f1f3f5' }}>
                    <th style={{ padding: '10px' }}>User Name</th>
                    <th style={{ padding: '10px' }}>Chat ID</th>
                    <th style={{ padding: '10px' }}>Status</th>
                    <th style={{ padding: '10px' }}>Detail/Error Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcastResults.map((result, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ padding: '10px', fontWeight: '500' }}>{result.name || 'Unknown'}</td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', color: '#666' }}>{result.chatId}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
                          color: result.success ? '#155724' : '#721c24',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          textAlign: 'center'
                        }}>
                          {result.success ? 'Reached' : 'Failed'}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '10px', 
                        color: result.success ? '#155724' : '#721c24', 
                        fontSize: '13px',
                        wordBreak: 'break-word'
                      }}>
                        {result.success ? 'Delivered' : (result.error || 'Unknown error')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '15px 20px',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: '#f8f9fa'
            }}>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
