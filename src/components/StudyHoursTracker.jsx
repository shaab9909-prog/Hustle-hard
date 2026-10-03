import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

export default function StudyHoursTracker() {
  const [logs, setLogs] = useState([]);
  const [todaySeconds, setTodaySeconds] = useState(0);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // 1. Realtime Firestore Daily Logs Listener
  useEffect(() => {
    const q = query(collection(db, 'daily_study_stats'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(data);

      // Aaj ke din ka data agar pehle se Firestore me hai toh load kar lo
      const todayEntry = data.find(item => item.date === getTodayDate());
      if (todayEntry?.totalSeconds) {
        setTodaySeconds(todayEntry.totalSeconds);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Automatic Background Study Timer (Har second active rehta hai jab app khula ho)
  useEffect(() => {
    const timer = setInterval(() => {
      setTodaySeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 3. Auto-Save to Firestore (Har 60 seconds me bina kisi button ke background me save)
  useEffect(() => {
    if (todaySeconds === 0) return;

    // Har 60 second par auto-save trigger
    if (todaySeconds % 60 === 0) {
      const today = getTodayDate();
      const hours = (todaySeconds / 3600).toFixed(2);

      setDoc(doc(db, 'daily_study_stats', today), {
        date: today,
        totalSeconds: todaySeconds,
        hours: parseFloat(hours),
        lastUpdated: new Date()
      }, { merge: true }).catch(console.error);
    }
  }, [todaySeconds]);

  // Window band hote waqt bhi instantly last seconds save ho jayein
  useEffect(() => {
    const handleBeforeUnload = () => {
      const today = getTodayDate();
      const hours = (todaySeconds / 3600).toFixed(2);
      setDoc(doc(db, 'daily_study_stats', today), {
        date: today,
        totalSeconds: todaySeconds,
        hours: parseFloat(hours),
        lastUpdated: new Date()
      }, { merge: true }).catch(console.error);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [todaySeconds]);

  const formatTime = (totalSec) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const todayHoursFormatted = (todaySeconds / 3600).toFixed(2);

  return (
    <div style={{
      background: 'rgba(11, 17, 32, 0.85)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      padding: '12px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxSizing: 'border-box',
      width: '100%',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '15px' }}>⏱️</span>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Auto Study Tracker</span>
        </div>
        <span style={{
          fontSize: '10px',
          color: '#10b981',
          background: 'rgba(16, 185, 129, 0.15)',
          padding: '2px 6px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          Tracking Active
        </span>
      </div>

      {/* Today Live Status Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.04)',
        padding: '10px',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Today's Focus Time:</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>
            {formatTime(todaySeconds)}
          </span>
          <span style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 600 }}>
            {todayHoursFormatted} hrs
          </span>
        </div>
        <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>
          ⚡ Auto-saves every 60 seconds to database
        </div>
      </div>

      {/* Date-wise History */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Previous Days Log:</span>
        {logs.length === 0 ? (
          <div style={{ fontSize: '11px', color: '#6b7280', padding: '4px' }}>
            History prepare ho rahi hai...
          </div>
        ) : (
          logs.map((item) => {
            const isToday = item.date === getTodayDate();
            return (
              <div
                key={item.date}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: isToday ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: isToday ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: isToday ? '#93c5fd' : '#e5e7eb' }}>
                    {item.date} {isToday && '(Today)'}
                  </span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: (item.hours || 0) >= 3 ? '#10b981' : '#f59e0b',
                  background: 'rgba(255,255,255,0.06)',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {item.hours ? item.hours : ((item.totalSeconds || 0) / 3600).toFixed(2)} hrs
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}