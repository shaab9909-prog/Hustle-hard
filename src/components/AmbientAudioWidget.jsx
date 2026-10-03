import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';

export default function AmbientAudioWidget() {
  const [tracks, setTracks] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [errorMsg, setErrorMsg] = useState('');

  // Owner state
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [authenticatedOwner, setAuthenticatedOwner] = useState(false);

  const audioRef = useRef(null);

  // Firestore Real-time listener
  useEffect(() => {
    const q = query(collection(db, 'global_audio_tracks'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTracks(fetched);
      if (!currentTrack && fetched.length > 0) {
        setCurrentTrack(fetched[0]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Volume handler
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Track select / switch function
  const handleSelectTrack = async (track) => {
    setErrorMsg('');
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack?.id === track.id) {
      // Same song click kiya -> toggle play/pause
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (e) {
          console.error("Playback error:", e);
          setErrorMsg('Playback error: Cannot start audio');
        }
      }
      return;
    }

    // Naya song choose kiya
    setCurrentTrack(track);
    audio.pause();
    audio.src = track.url;
    audio.load();

    try {
      await audio.play();
      setIsPlaying(true);
      setErrorMsg('');
    } catch (err) {
      console.warn("Direct play failed, waiting for user click or load:", err);
      // Agar autoplay block hui toh status false rahega taaki user Play dabaye
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    setErrorMsg('');
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      if (!currentTrack && tracks.length > 0) {
        handleSelectTrack(tracks[0]);
        return;
      }
      try {
        if (!audio.src && currentTrack?.url) {
          audio.src = currentTrack.url;
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Play toggle error:", err);
        setErrorMsg('Playback error: URL blocked or invalid format');
        setIsPlaying(false);
      }
    }
  };

  // Add Track (Owner)
  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    try {
      await addDoc(collection(db, 'global_audio_tracks'), {
        title: newTitle.trim(),
        url: newUrl.trim(),
        createdAt: serverTimestamp()
      });
      setNewTitle('');
      setNewUrl('');
      alert("Track added successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Track (Owner)
  const handleDeleteTrack = async (trackId) => {
    try {
      await deleteDoc(doc(db, 'global_audio_tracks', trackId));
      if (currentTrack?.id === trackId) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute('src');
          audioRef.current.load();
        }
        setIsPlaying(false);
        setCurrentTrack(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      background: 'rgba(11, 17, 32, 0.85)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      borderRadius: '16px',
      padding: '12px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxSizing: 'border-box',
      width: '100%',
      height: '100%'
    }}>
      {/* Audio Element without inline src to prevent race conditions */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        onPlaying={() => {
          setIsPlaying(true);
          setErrorMsg('');
        }}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          // Sirf tab error dikhaye jab actual src set ho aur playback try kiya ho
          if (audioRef.current?.src) {
            console.error("Native Audio tag error event:", e);
            setErrorMsg('Playback error: URL blocked or invalid format');
          }
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>🎧</span>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>Lo-Fi & Ambient Audio</span>
        </div>
        <button
          onClick={() => setIsOwnerMode(!isOwnerMode)}
          style={{
            background: authenticatedOwner ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: 'none',
            color: authenticatedOwner ? '#60a5fa' : '#9ca3af',
            cursor: 'pointer',
            fontSize: '11px',
            borderRadius: '4px',
            padding: '2px 6px'
          }}
        >
          ⚙️ {authenticatedOwner ? 'Owner' : 'Edit'}
        </button>
      </div>

      {/* Player Section */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.04)',
        padding: '8px 10px',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#60a5fa', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {currentTrack ? currentTrack.title : 'Select a Sound'}
        </div>

        {errorMsg && (
          <div style={{ fontSize: '10px', color: '#f87171' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={togglePlay}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: isPlaying ? '#ef4444' : '#10b981',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '11px'
            }}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
            <span style={{ fontSize: '11px' }}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#3b82f6', height: '4px', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* Owner Panel */}
      {isOwnerMode && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px dashed rgba(255, 255, 255, 0.2)',
          padding: '8px',
          borderRadius: '8px'
        }}>
          {!authenticatedOwner ? (
            <div style={{ display: 'flex', gap: '4px' }}>
             <input
  type="password"
  placeholder="Enter Owner Passkey"
  value={adminPass}
  onChange={(e) => setAdminPass(e.target.value)}
  style={{
    flex: 1,
    padding: '4px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: '11px'
  }}
/>
              <button
                onClick={() => {
                 if (adminPass === 'zenith1723') {
  setAuthenticatedOwner(true);
  setAdminPass('');
} else {
  alert('Wrong passkey');
}
                }}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Unlock
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddTrack} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ fontSize: '10px', color: '#93c5fd', fontWeight: 600 }}>ADD NEW GLOBAL SONG</div>
              <input
                type="text"
                placeholder="Song Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{
                  padding: '4px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                  fontSize: '11px'
                }}
              />
              <input
                type="text"
                placeholder="Direct Audio Stream / MP3 URL"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                style={{
                  padding: '4px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                  fontSize: '11px'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                + Broadcast
              </button>
            </form>
          )}
        </div>
      )}

      {/* Playlist Tracks */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>Select Sound:</span>
        {tracks.map((t) => {
          const isSelected = currentTrack?.id === t.id;
          return (
            <div
              key={t.id}
              onClick={() => handleSelectTrack(t)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderRadius: '6px',
                background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '11px', color: isSelected ? '#60a5fa' : '#e5e7eb' }}>
                {isSelected && isPlaying ? '🎵 ' : '▶ '} {t.title}
              </div>

              {authenticatedOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTrack(t.id);
                  }}
                  title="Delete Track"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '0 4px'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}