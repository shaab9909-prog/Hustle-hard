import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

const SUBJECT_OPTIONS = ['General', 'Physics ⚡', 'Chemistry 🧪', 'Biology 🧬', 'Maths 📐', 'Coding 💻', 'Revision 📖'];

export default function GroupStudyWidget() {
  const [userName, setUserName] = useState(() => localStorage.getItem('zenith_username') || 'Student');
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('zenith_room_code') || '');
  const [roomTitleInput, setRoomTitleInput] = useState('Zenith Study Room');
  const [isPrivate, setIsPrivate] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [isStudying, setIsStudying] = useState(false);
  const [myStudySeconds, setMyStudySeconds] = useState(0);
  const [distractionCount, setDistractionCount] = useState(0);
  const [currentSubject, setCurrentSubject] = useState('General');
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'leaderboard' | 'chat' | 'requests'
  const [chatMessage, setChatMessage] = useState('');
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [nudgeAlert, setNudgeAlert] = useState(null);
  const [error, setError] = useState('');

  const studyIntervalRef = useRef(null);
  const chatScrollRef = useRef(null);

  const getStudyDayStr = () => {
    const d = new Date();
    d.setHours(d.getHours() - 3);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Warning Sound
  const playWarningBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  };

  // Nudge Wake-up Sound (Higher pitch double-beep)
  const playNudgeSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, delay) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.15);
      };
      playTone(880, 0);
      playTone(1174, 0.18);
    } catch (e) {
      console.warn('Nudge audio error:', e);
    }
  };

  const formatStudyTime = (totalSeconds = 0) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${totalSeconds % 60}s`;
  };

  const handleNameChange = (val) => {
    setUserName(val);
    localStorage.setItem('zenith_username', val);
  };

  const isHost = roomData?.host === userName.trim();

  // Send Nudge / Poke to a friend
  const handleSendNudge = async (targetMemberName) => {
    if (!roomCode || targetMemberName === userName.trim()) return;
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      await updateDoc(roomRef, {
        latestNudge: {
          to: targetMemberName,
          from: userName.trim() || 'Student',
          timestamp: Date.now()
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Sync Subject or Status to server
  const syncStatusToServer = async (seconds, status, extraDistraction = false, subjectOverride = null) => {
    if (!roomCode) return;
    try {
      const currentDay = getStudyDayStr();
      const roomRef = doc(db, 'rooms', roomCode);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;

      const members = snap.data().members || [];
      const myName = userName.trim() || 'Student';

      const updatedMembers = members.map((m) => {
        if (m.name === myName) {
          const isSameDay = m.activeDate === currentDay;
          const currentStudy = isSameDay ? (seconds !== null ? seconds : m.studySeconds) : 0;
          const currentDistractions = isSameDay ? (m.distractions || 0) : 0;

          return {
            ...m,
            activeDate: currentDay,
            studySeconds: currentStudy,
            status: status || m.status,
            subject: subjectOverride !== null ? subjectOverride : (m.subject || currentSubject),
            distractions: extraDistraction ? currentDistractions + 1 : currentDistractions,
            lastUpdated: Date.now()
          };
        }
        return m;
      });

      await updateDoc(roomRef, { members: updatedMembers });
    } catch (e) {
      console.error(e);
    }
  };

  // Create Room
  const handleCreateRoom = async () => {
    try {
      setError('');
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      const currentDay = getStudyDayStr();
      const roomRef = doc(db, 'rooms', code);
      const initialMember = {
        name: userName.trim() || 'Student',
        studySeconds: 0,
        status: 'Idle',
        distractions: 0,
        subject: currentSubject,
        activeDate: currentDay,
        lastUpdated: Date.now()
      };

      await setDoc(roomRef, {
        title: roomTitleInput.trim() || 'Study Room',
        isPrivate: isPrivate,
        host: userName.trim() || 'Student',
        members: [initialMember],
        pendingRequests: [],
        chatEnabled: true,
        messages: [],
        latestNudge: null,
        createdAt: new Date().toISOString()
      });

      setRoomCode(code);
      localStorage.setItem('zenith_room_code', code);
      setDistractionCount(0);
      setMyStudySeconds(0);
      setWaitingApproval(false);
    } catch (err) {
      setError('Room create nahi ho saka');
    }
  };

  // Join Room
  const handleJoinRoom = async () => {
    if (!inputCode.trim()) return;
    const code = inputCode.trim().toUpperCase();
    const currentDay = getStudyDayStr();
    try {
      setError('');
      const roomRef = doc(db, 'rooms', code);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        setError('Room code exist nahi karta');
        return;
      }
      const data = snap.data();
      const myName = userName.trim() || 'Student';
      const existingMembers = data.members || [];
      const memberIndex = existingMembers.findIndex((m) => m.name === myName);

      if (memberIndex !== -1) {
        const existing = existingMembers[memberIndex];
        if (existing.activeDate !== currentDay) {
          existing.activeDate = currentDay;
          existing.studySeconds = 0;
          existing.distractions = 0;
          setMyStudySeconds(0);
          setDistractionCount(0);
        } else {
          setMyStudySeconds(existing.studySeconds || 0);
          setDistractionCount(existing.distractions || 0);
        }
        await updateDoc(roomRef, { members: existingMembers });
        setRoomCode(code);
        localStorage.setItem('zenith_room_code', code);
        setWaitingApproval(false);
        return;
      }

      if (data.isPrivate && data.host !== myName) {
        const pending = data.pendingRequests || [];
        if (!pending.includes(myName)) {
          await updateDoc(roomRef, { pendingRequests: arrayUnion(myName) });
        }
        setRoomCode(code);
        setWaitingApproval(true);
        return;
      }

      existingMembers.push({
        name: myName,
        studySeconds: 0,
        status: 'Idle',
        distractions: 0,
        subject: currentSubject,
        activeDate: currentDay,
        lastUpdated: Date.now()
      });
      await updateDoc(roomRef, { members: existingMembers });
      setRoomCode(code);
      localStorage.setItem('zenith_room_code', code);
      setWaitingApproval(false);
    } catch (err) {
      setError('Room join karne me dikkat aayi');
    }
  };

  const handleAcceptRequest = async (applicantName) => {
    if (!isHost || !roomCode) return;
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const pending = (data.pendingRequests || []).filter((n) => n !== applicantName);
      const members = data.members || [];

      if (!members.find((m) => m.name === applicantName)) {
        members.push({
          name: applicantName,
          studySeconds: 0,
          status: 'Idle',
          distractions: 0,
          subject: 'General',
          activeDate: getStudyDayStr(),
          lastUpdated: Date.now()
        });
      }

      await updateDoc(roomRef, {
        pendingRequests: pending,
        members: members
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectRequest = async (applicantName) => {
    if (!isHost || !roomCode) return;
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      const pending = (snap.data().pendingRequests || []).filter((n) => n !== applicantName);
      await updateDoc(roomRef, { pendingRequests: pending });
    } catch (e) {
      console.error(e);
    }
  };

  const handleKickMember = async (memberName) => {
    if (!isHost || !roomCode || memberName === roomData?.host) return;
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      const members = (snap.data().members || []).filter((m) => m.name !== memberName);
      await updateDoc(roomRef, { members: members });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveRoom = () => {
    setIsStudying(false);
    clearInterval(studyIntervalRef.current);
    localStorage.removeItem('zenith_room_code');
    setRoomCode('');
    setRoomData(null);
    setWaitingApproval(false);
  };

  const toggleChatEnabled = async () => {
    if (!roomCode || !isHost) return;
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      await updateDoc(roomRef, { chatEnabled: !roomData?.chatEnabled });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatMessage.trim() || !roomCode) return;
    if (!roomData?.chatEnabled && !isHost) return;

    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const newMsg = {
        sender: userName.trim() || 'Student',
        text: chatMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        id: Date.now()
      };
      await updateDoc(roomRef, { messages: arrayUnion(newMsg) });
      setChatMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  // Real-time listener & Nudge detection
  useEffect(() => {
    if (!roomCode) return;
    const roomRef = doc(db, 'rooms', roomCode);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomData(data);
        const myName = userName.trim() || 'Student';
        const isMember = data.members?.some((m) => m.name === myName);

        // Check if I was nudged recently (< 4 seconds ago)
        if (data.latestNudge && data.latestNudge.to === myName && Date.now() - data.latestNudge.timestamp < 4000) {
          playNudgeSound();
          setNudgeAlert(`${data.latestNudge.from} nudged you! Wake up & study! 🔔`);
          setTimeout(() => setNudgeAlert(null), 4000);
        }

        if (isMember) {
          setWaitingApproval(false);
          const me = data.members.find((m) => m.name === myName);
          const currentDay = getStudyDayStr();
          if (me.activeDate !== currentDay) {
            setMyStudySeconds(0);
            setDistractionCount(0);
          } else {
            if (!isStudying) setMyStudySeconds(me.studySeconds || 0);
            setDistractionCount(me.distractions || 0);
          }
        } else if (!waitingApproval && data.host !== myName) {
          handleLeaveRoom();
          setError('Aapko room se remove kar diya gaya hai');
        }
      }
    });
    return () => unsubscribe();
  }, [roomCode, userName, isStudying, waitingApproval]);

  // Window Focus/Blur Listener
  useEffect(() => {
    const handleBlur = () => {
      if (isStudying && roomCode && !waitingApproval) {
        playWarningBeep();
        syncStatusToServer(myStudySeconds, '⚠️ Distracted (Left App)', true);
      }
    };

    const handleFocus = () => {
      if (isStudying && roomCode && !waitingApproval) {
        syncStatusToServer(myStudySeconds, 'Studying 🔥', false);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isStudying, roomCode, myStudySeconds, waitingApproval]);

  // Timer Tick
  useEffect(() => {
    if (isStudying) {
      studyIntervalRef.current = setInterval(() => {
        setMyStudySeconds((prev) => {
          const nextSec = prev + 1;
          if (nextSec % 5 === 0) {
            syncStatusToServer(nextSec, 'Studying 🔥', false);
          }
          return nextSec;
        });
      }, 1000);
    } else {
      clearInterval(studyIntervalRef.current);
    }

    return () => clearInterval(studyIntervalRef.current);
  }, [isStudying, roomCode, myStudySeconds]);

  useEffect(() => {
    if (activeTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeTab, roomData?.messages]);

  const toggleStudySession = () => {
    if (isStudying) {
      clearInterval(studyIntervalRef.current);
      setIsStudying(false);
      syncStatusToServer(myStudySeconds, 'Paused', false);
    } else {
      setIsStudying(true);
      syncStatusToServer(myStudySeconds, 'Studying 🔥', false);
    }
  };

  const handleSubjectChange = (newSub) => {
    setCurrentSubject(newSub);
    if (roomCode) {
      syncStatusToServer(myStudySeconds, null, false, newSub);
    }
  };

  const currentDay = getStudyDayStr();
  const sortedMembers = [...(roomData?.members || [])]
    .map((m) => (m.activeDate === currentDay ? m : { ...m, studySeconds: 0, distractions: 0 }))
    .sort((a, b) => {
      if ((b.studySeconds || 0) === (a.studySeconds || 0)) {
        return (a.distractions || 0) - (b.distractions || 0);
      }
      return (b.studySeconds || 0) - (a.studySeconds || 0);
    });

  return (
    <div style={{
      background: 'rgba(11, 17, 32, 0.85)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      borderRadius: '16px',
      padding: '14px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Nudge Pop-up Banner */}
      {nudgeAlert && (
        <div style={{
          background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
          color: '#fff',
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 'bold',
          textAlign: 'center',
          animation: 'pulse 1s infinite'
        }}>
          {nudgeAlert}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {roomData?.title || '👥 Study Room'}
          </h3>
          {roomCode && (
            <span style={{ fontSize: '10px', color: '#60a5fa', background: 'rgba(96,165,250,0.15)', padding: '2px 5px', borderRadius: '4px' }}>
              {roomCode}
            </span>
          )}
        </div>
        {roomCode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isHost && (
              <button
                onClick={toggleChatEnabled}
                title="Toggle Chat"
                style={{
                  fontSize: '10px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  border: 'none',
                  background: roomData?.chatEnabled !== false ? '#10b981' : '#ef4444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {roomData?.chatEnabled !== false ? '💬 ON' : '🔇 OFF'}
              </button>
            )}
            <button
              onClick={handleLeaveRoom}
              title="Leave Room"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Screen 1: Not Joined */}
      {!roomCode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '10px', color: '#9ca3af', display: 'block', marginBottom: '2px' }}>Aapka Naam:</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Your Name"
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <label style={{ fontSize: '10px', color: '#9ca3af', display: 'block', marginBottom: '2px' }}>Room Ka Naam:</label>
            <input
              type="text"
              value={roomTitleInput}
              onChange={(e) => setRoomTitleInput(e.target.value)}
              placeholder="e.g. NEET Hustle"
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: '12px',
                boxSizing: 'border-box',
                marginBottom: '6px'
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              🔒 Make Room Private (Approval required)
            </label>
            <button
              onClick={handleCreateRoom}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px'
              }}
            >
              Create Room
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Enter Code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
            <button
              onClick={handleJoinRoom}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                background: '#10b981',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px'
              }}
            >
              Join
            </button>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '11px', margin: 0 }}>{error}</p>}
        </div>
      ) : waitingApproval ? (
        <div style={{ textAlign: 'center', padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '28px' }}>⏳</div>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Waiting for Owner's Approval</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
            Yeh ek private room hai. Jaise hi Host request accept karega, aap enter ho jaoge.
          </div>
          <button
            onClick={handleLeaveRoom}
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Cancel Request
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
          {/* Quick Study Toggle + Subject Selector */}
          <div style={{
            background: isStudying ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            border: isStudying ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
            padding: '6px 10px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>Subject:</span>
                <select
                  value={currentSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    color: '#60a5fa',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    fontSize: '10px',
                    padding: '1px 4px',
                    cursor: 'pointer'
                  }}
                >
                  {SUBJECT_OPTIONS.map((sub) => (
                    <option key={sub} value={sub} style={{ background: '#18181b', color: '#fff' }}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: isStudying ? '#34d399' : '#fff', marginTop: '2px' }}>
                {formatStudyTime(myStudySeconds)}
              </div>
            </div>
            <button
              onClick={toggleStudySession}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: isStudying ? '#ef4444' : '#10b981',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '11px'
              }}
            >
              {isStudying ? 'Stop' : 'Start Study'}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '6px' }}>
            <button
              onClick={() => setActiveTab('live')}
              style={{
                flex: 1,
                padding: '4px',
                borderRadius: '5px',
                border: 'none',
                background: activeTab === 'live' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: activeTab === 'live' ? '#fff' : '#9ca3af',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ⚡ Live
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              style={{
                flex: 1,
                padding: '4px',
                borderRadius: '5px',
                border: 'none',
                background: activeTab === 'leaderboard' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: activeTab === 'leaderboard' ? '#fff' : '#9ca3af',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🏆 Ranks
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '4px',
                borderRadius: '5px',
                border: 'none',
                background: activeTab === 'chat' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: activeTab === 'chat' ? '#fff' : '#9ca3af',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              💬 Chat {roomData?.chatEnabled === false && '🔒'}
            </button>
            {isHost && (roomData?.pendingRequests?.length > 0) && (
              <button
                onClick={() => setActiveTab('requests')}
                style={{
                  padding: '4px 6px',
                  borderRadius: '5px',
                  border: 'none',
                  background: activeTab === 'requests' ? '#f59e0b' : 'rgba(245,158,11,0.25)',
                  color: '#fff',
                  fontSize: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Requests ({roomData.pendingRequests.length})
              </button>
            )}
          </div>

          {/* View Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Live Tab with Subject and Nudge button */}
            {activeTab === 'live' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {roomData?.members?.map((member, idx) => {
                  const isDistracted = member.status?.includes('Distracted');
                  const isMemberHost = member.name === roomData?.host;
                  const isMe = member.name === userName.trim();

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isDistracted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: isDistracted ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 500 }}>
                            {member.name} {isMemberHost && '👑'}
                          </span>
                          <span style={{ fontSize: '10px', color: '#93c5fd', background: 'rgba(59,130,246,0.15)', padding: '1px 4px', borderRadius: '4px' }}>
                            {member.subject || 'General'}
                          </span>
                          {(member.distractions || 0) > 0 && (
                            <span style={{ fontSize: '9px', background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '1px 4px', borderRadius: '3px' }}>
                              {member.distractions} alerts
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '2px', color: isDistracted ? '#f87171' : (member.status?.includes('Studying') ? '#34d399' : '#9ca3af') }}>
                          {member.status || 'Idle'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24' }}>
                          {formatStudyTime(member.activeDate === currentDay ? (member.studySeconds || 0) : 0)}
                        </span>
                        {!isMe && (
                          <button
                            onClick={() => handleSendNudge(member.name)}
                            title="Poke/Nudge to study"
                            style={{
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            🔔
                          </button>
                        )}
                        {isHost && !isMemberHost && (
                          <button
                            onClick={() => handleKickMember(member.name)}
                            title="Kick member"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            👢
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Leaderboard */}
            {activeTab === 'leaderboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {sortedMembers.map((member, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.03)',
                      border: idx === 0 ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255,255,255,0.06)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px' }}>{['🥇', '🥈', '🥉'][idx] || `#${idx + 1}`}</span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{member.name}</div>
                        <div style={{ fontSize: '9px', color: '#9ca3af' }}>Alerts: {member.activeDate === currentDay ? (member.distractions || 0) : 0}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#60a5fa' }}>
                      {formatStudyTime(member.activeDate === currentDay ? (member.studySeconds || 0) : 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Chat */}
            {activeTab === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '6px' }}>
                <div
                  ref={chatScrollRef}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    paddingRight: '4px',
                    minHeight: '100px',
                    maxHeight: '130px'
                  }}
                >
                  {(!roomData?.messages || roomData.messages.length === 0) ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '11px', marginTop: '25px' }}>
                      No messages yet. Say hi! 👋
                    </div>
                  ) : (
                    roomData.messages.map((m) => {
                      const isMe = m.sender === userName.trim();
                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            background: isMe ? '#2563eb' : 'rgba(255,255,255,0.08)',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }}
                        >
                          <div style={{ fontSize: '9px', color: isMe ? '#bfdbfe' : '#9ca3af', marginBottom: '2px' }}>
                            {isMe ? 'You' : m.sender} • {m.time}
                          </div>
                          <div>{m.text}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                {roomData?.chatEnabled === false && !isHost ? (
                  <div style={{ fontSize: '10px', color: '#ef4444', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '5px', borderRadius: '6px' }}>
                    🔒 Host has paused discussion for focus.
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      placeholder="Type message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#3b82f6',
                        color: '#fff',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Pending Requests */}
            {activeTab === 'requests' && isHost && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(!roomData?.pendingRequests || roomData.pendingRequests.length === 0) ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '11px', marginTop: '15px' }}>
                    No pending join requests.
                  </div>
                ) : (
                  roomData.pendingRequests.map((applicant, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{applicant}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleAcceptRequest(applicant)}
                          title="Accept"
                          style={{
                            background: '#10b981',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(applicant)}
                          title="Reject"
                          style={{
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}