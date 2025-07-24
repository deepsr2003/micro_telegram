// client/src/pages/DashboardPage.jsx
import React, { useState } from 'react';
import ContactsSidebar from '../components/ContactsSidebar';
import RoomsSidebar from '../components/RoomsSidebar';
import ChatPanel from '../components/ChatPanel';
import '../App.css';

const DashboardPage = () => {
    // activeChat can be { type: 'room', id: 'dev-team', name: 'Developer Team' }
    // or { type: 'dm', id: 123, name: 'username' }
    const [activeChat, setActiveChat] = useState(null);
    const [roomData, setRoomData] = useState({ members: [], admins: [] });

    return (
        <div className="dashboard-container">
            <ContactsSidebar setActiveChat={setActiveChat} />
            <ChatPanel activeChat={activeChat} setRoomData={setRoomData}  />{
        /* Pass setRoomData */
      }
            <RoomsSidebar setActiveChat={setActiveChat}  activeChat={activeChat}
                roomData={roomData} /> {/* Pass more props */}

          

    </div>
    );
};

export default DashboardPage;


//  <RoomsSidebar setActiveChat={setActiveChat} activeChatId={activeChat?.id}/> 
