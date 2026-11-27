import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  Hand,
  Smile,
  MessageSquare,
  Users,
  BarChart3,
  PhoneOff,
  Copy,
  Check,
  Share2,
  Shield,
  Lock,
  Unlock,
  Pin,
  PinOff,
  Maximize,
  Minimize,
  LayoutGrid,
  Send,
  Plus,
  X,
  UserCheck,
  UserX,
  VolumeX,
  Loader2,
  ArrowLeft,
  Info,
  Settings2,
  AlertCircle
} from 'lucide-react';
import { getIceServers, getMeetingByCode, updateMeetingSettings, endMeeting } from '../../services/api';
import { initSocket } from '../../services/socket';
import { cookieStorage } from '../../services/storage';
import ShareMeetModal from './ShareMeetModal';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🎉', '🔥'];

function VideoTile({
  stream,
  name,
  isSelf = false,
  audioEnabled = true,
  videoEnabled = true,
  isScreenSharing = false,
  handRaised = false,
  isPinned = false,
  isSpeaking = false,
  onTogglePin,
  role = 'participant'
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream && el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream, videoEnabled, isScreenSharing]);

  const showVideo = Boolean(stream && (videoEnabled || isScreenSharing));

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900 border-2 transition-all duration-200 flex items-center justify-center group select-none ${
        isSpeaking && audioEnabled
          ? 'border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.35)]'
          : 'border-slate-800'
      }`}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className={`w-full h-full ${
            isScreenSharing ? 'object-contain bg-black' : 'object-cover'
          } ${isSelf && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg">
            {(name || 'U').slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-slate-300">{name}</span>
        </div>
      )}

      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5">
          {handRaised && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold flex items-center gap-1 shadow-md animate-bounce">
              <Hand className="w-3.5 h-3.5" />
              <span>Hand raised</span>
            </span>
          )}
          {isScreenSharing && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-md">
              <MonitorUp className="w-3.5 h-3.5" />
              <span>Presenting</span>
            </span>
          )}
        </div>

        {onTogglePin && (
          <button
            type="button"
            onClick={onTogglePin}
            className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 text-white cursor-pointer"
            title={isPinned ? 'Unpin' : 'Pin to spotlight'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Bottom name & mic pill */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="px-2.5 py-1 rounded-lg bg-slate-950/75 backdrop-blur-xs text-white text-xs font-semibold flex items-center gap-2 max-w-[85%]">
          {!audioEnabled && <MicOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
          <span className="truncate">
            {name} {isSelf ? '(You)' : ''}
          </span>
          {role === 'host' && (
            <span className="px-1.5 py-0.5 rounded bg-blue-600/80 text-[10px] font-bold">
              Host
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MeetRoom({ user }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const meetingCode = (code || '').trim().toLowerCase();
  const token = cookieStorage.getItem('mailchat_token');
  const currentUserId = (user?._id || user?.id)?.toString();

  const [phase, setPhase] = useState('lobby'); // 'lobby' | 'waiting' | 'in-call' | 'ended' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Local media state
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [devices, setDevices] = useState({ audioInputs: [], videoInputs: [] });
  const [selectedAudioId, setSelectedAudioId] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Room state
  const [participants, setParticipants] = useState([]); // remote participants
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream
  const [waitingList, setWaitingList] = useState([]);
  const [speakingMap, setSpeakingMap] = useState({}); // key ('self' or socketId) -> boolean

  // UI state
  const [activePanel, setActivePanel] = useState(null); // null | 'people' | 'chat' | 'polls' | 'info'
  const [layoutMode, setLayoutMode] = useState('auto'); // 'auto' | 'grid' | 'spotlight'
  const [pinnedId, setPinnedId] = useState(null);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEndMenu, setShowEndMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [clockStr, setClockStr] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  // In-call chat & polls
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [polls, setPolls] = useState([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  // Refs
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const lobbyVideoRef = useRef(null);
  const mediaStoppedRef = useRef(false);
  const iceServersRef = useRef(ICE_SERVERS.iceServers);
  const phaseRef = useRef(phase);
  const peerConnectionsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const pendingCandidatesRef = useRef(new Map()); // socketId -> RTCIceCandidateInit[]
  const socketRef = useRef(null);
  const containerRef = useRef(null);
  const activePanelRef = useRef(activePanel);
  const audioAnalysersRef = useRef(new Map());

  useEffect(() => {
    activePanelRef.current = activePanel;
    if (activePanel === 'chat') {
      setUnreadChatCount(0);
    }
  }, [activePanel]);

  const showToast = useCallback((text, type = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setClockStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Fetch ICE / TURN servers from backend
  useEffect(() => {
    if (!token) return;
    getIceServers(token)
      .then((res) => {
        if (Array.isArray(res?.iceServers) && res.iceServers.length > 0) {
          iceServersRef.current = res.iceServers;
        }
      })
      .catch(() => {});
  }, [token]);

  // Fetch meeting info
  useEffect(() => {
    if (!token || !meetingCode) return;
    getMeetingByCode(token, meetingCode)
      .then((res) => {
        if (res.meeting?.status === 'ended') {
          setPhase('ended');
          setMeetingInfo(res.meeting);
        } else {
          setMeetingInfo(res.meeting);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Meeting not found');
        setPhase('error');
      });
  }, [token, meetingCode]);

  const stopAllMedia = useCallback(() => {
    mediaStoppedRef.current = true;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (lobbyVideoRef.current) {
      lobbyVideoRef.current.srcObject = null;
    }
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    pendingCandidatesRef.current.clear();
    setRemoteStreams({});
    setIsScreenSharing(false);
  }, []);

  // Initialize local camera/mic in lobby
  const startLocalMedia = useCallback(async (audioId = '', videoId = '') => {
    if (mediaStoppedRef.current) return;
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const constraints = {
        audio: audioId ? { deviceId: { exact: audioId } } : true,
        video: videoId
          ? { deviceId: { exact: videoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (mediaStoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;

      if (lobbyVideoRef.current) {
        lobbyVideoRef.current.srcObject = stream;
      }

      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audioInputs: list.filter((d) => d.kind === 'audioinput'),
        videoInputs: list.filter((d) => d.kind === 'videoinput')
      });

      // Replace tracks on existing peer connections if already in call
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      peerConnectionsRef.current.forEach((pc) => {
        const senders = pc.getSenders();
        if (audioTrack) {
          const s = senders.find((x) => x.track?.kind === 'audio');
          if (s) s.replaceTrack(audioTrack);
        }
        if (videoTrack && !screenStreamRef.current) {
          const s = senders.find((x) => x.track?.kind === 'video');
          if (s) s.replaceTrack(videoTrack);
        }
      });
    } catch {
      if (mediaStoppedRef.current) return;
      // Fallback: try audio-only or join without media
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (mediaStoppedRef.current) {
          audioOnly.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = audioOnly;
        setVideoEnabled(false);
      } catch {
        setAudioEnabled(false);
        setVideoEnabled(false);
        showToast('Camera/Mic unavailable. You can still join as a viewer.', 'info');
      }
    }
  }, [showToast]);

  useEffect(() => {
    mediaStoppedRef.current = false;
    startLocalMedia();
    const handleBeforeUnload = () => stopAllMedia();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopAllMedia();
    };
  }, [startLocalMedia, stopAllMedia]);

  // Stop mic & camera immediately whenever meeting ends or errors
  useEffect(() => {
    if (phase === 'ended' || phase === 'error') {
      stopAllMedia();
    }
  }, [phase, stopAllMedia]);

  // Audio level meter for lobby & self speaking indicator
  useEffect(() => {
    const stream = localStreamRef.current;
    if (phase === 'ended' || phase === 'error' || !stream || !audioEnabled || stream.getAudioTracks().length === 0) {
      setAudioLevel(0);
      setSpeakingMap((prev) => ({ ...prev, self: false }));
      return;
    }

    let animId;
    let ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length;
        setAudioLevel(Math.min(100, Math.round(avg * 1.8)));
        setSpeakingMap((prev) => {
          const isSpeaking = avg > 18;
          if (prev.self === isSpeaking) return prev;
          return { ...prev, self: isSpeaking };
        });
        animId = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // ignore AudioContext errors
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    };
  }, [audioEnabled, phase]);

  // Remote active speaker detection
  useEffect(() => {
    const entries = Object.entries(remoteStreams);
    if (phase !== 'in-call' || entries.length === 0) return;

    let animId;
    let ctx;
    const analysers = [];
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      entries.forEach(([socketId, stream]) => {
        if (!stream || stream.getAudioTracks().length === 0) return;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analysers.push({ socketId, analyser, data: new Uint8Array(analyser.frequencyBinCount) });
      });

      if (analysers.length > 0) {
        const tick = () => {
          setSpeakingMap((prev) => {
            let changed = false;
            const next = { ...prev };
            analysers.forEach(({ socketId, analyser, data }) => {
              analyser.getByteFrequencyData(data);
              let sum = 0;
              for (let i = 0; i < data.length; i++) sum += data[i];
              const avg = sum / data.length;
              const speaking = avg > 18;
              if (Boolean(next[socketId]) !== speaking) {
                next[socketId] = speaking;
                changed = true;
              }
            });
            return changed ? next : prev;
          });
          animId = requestAnimationFrame(tick);
        };
        tick();
      }
    } catch {
      // ignore AudioContext errors
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    };
  }, [remoteStreams, phase]);

  // WebRTC Peer Connection helper
  const createPeerConnection = useCallback((targetSocketId, isInitiator) => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      return peerConnectionsRef.current.get(targetSocketId);
    }

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peerConnectionsRef.current.set(targetSocketId, pc);

    const activeStream = screenStreamRef.current || localStreamRef.current;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    if (activeStream) {
      const videoTrack = activeStream.getVideoTracks()[0];
      if (videoTrack) {
        pc.addTrack(videoTrack, activeStream);
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('meet:signal', {
          toSocketId: targetSocketId,
          signal: event.candidate,
          type: 'ice-candidate'
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams((prev) => ({
          ...prev,
          [targetSocketId]: remoteStream
        }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' && socketRef.current) {
        pc.createOffer({ iceRestart: true })
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (socketRef.current) {
              socketRef.current.emit('meet:signal', {
                toSocketId: targetSocketId,
                signal: pc.localDescription,
                type: 'offer'
              });
            }
          })
          .catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        pc.restartIce?.();
      }
    };

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (socketRef.current) {
            socketRef.current.emit('meet:signal', {
              toSocketId: targetSocketId,
              signal: pc.localDescription,
              type: 'offer'
            });
          }
        })
        .catch(() => {});
    }

    return pc;
  }, []);

  const closePeerConnection = useCallback((targetSocketId) => {
    const pc = peerConnectionsRef.current.get(targetSocketId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(targetSocketId);
    }
    pendingCandidatesRef.current.delete(targetSocketId);
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[targetSocketId];
      return next;
    });
  }, []);

  // Join Meeting
  const handleJoinMeeting = () => {
    const s = initSocket(user);
    socketRef.current = s;

    s.emit('meet:join-room', {
      meetingCode,
      user,
      mediaState: {
        audio: audioEnabled,
        video: videoEnabled,
        isScreenSharing,
        handRaised
      }
    });
  };

  // Socket listeners for Meet
  useEffect(() => {
    const s = initSocket(user);
    socketRef.current = s;

    const onWaitingAdmission = () => {
      setPhase('waiting');
    };

    const onJoinError = ({ message }) => {
      setErrorMessage(message || 'Cannot join meeting');
      setPhase('error');
    };

    const onJoinDenied = ({ message }) => {
      setErrorMessage(message || 'Host declined your join request.');
      setPhase('error');
    };

    const onJoined = ({ meeting, participants: existing, waitingList: waiting }) => {
      setMeetingInfo(meeting);
      setChatMessages(meeting.chatMessages || []);
      setPolls(meeting.polls || []);
      setWaitingList(waiting || []);
      setParticipants(existing || []);
      setPhase('in-call');

      // Initiate WebRTC offers to all existing participants
      (existing || []).forEach((p) => {
        if (p.socketId !== s.id) {
          createPeerConnection(p.socketId, true);
        }
      });
    };

    const onUserJoined = ({ participant }) => {
      if (!participant || participant.socketId === s.id) return;
      setParticipants((prev) => {
        if (prev.some((p) => p.socketId === participant.socketId)) return prev;
        return [...prev, participant];
      });
      // Wait for offer from the newly joined participant
      createPeerConnection(participant.socketId, false);
      showToast(`${participant.name} joined the meeting`, 'info');
    };

    const onUserLeft = ({ socketId, name }) => {
      closePeerConnection(socketId);
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
      if (pinnedId === socketId) setPinnedId(null);
      if (name) showToast(`${name} left the meeting`, 'info');
    };

    const onSignal = async ({ fromSocketId, signal, type }) => {
      try {
        let pc = peerConnectionsRef.current.get(fromSocketId);
        if (!pc) {
          pc = createPeerConnection(fromSocketId, false);
        }

        if (type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const queued = pendingCandidatesRef.current.get(fromSocketId) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingCandidatesRef.current.delete(fromSocketId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          s.emit('meet:signal', {
            toSocketId: fromSocketId,
            signal: pc.localDescription,
            type: 'answer'
          });
        } else if (type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const queued = pendingCandidatesRef.current.get(fromSocketId) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          pendingCandidatesRef.current.delete(fromSocketId);
        } else if (type === 'ice-candidate') {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal)).catch(() => {});
          } else {
            const arr = pendingCandidatesRef.current.get(fromSocketId) || [];
            arr.push(signal);
            pendingCandidatesRef.current.set(fromSocketId, arr);
          }
        }
      } catch (err) {
        console.error('WebRTC signal error:', err);
      }
    };

    const onMediaState = ({ socketId, audio, video, isScreenSharing: ss, handRaised: hr }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.socketId === socketId
            ? {
                ...p,
                ...(typeof audio === 'boolean' ? { audio } : {}),
                ...(typeof video === 'boolean' ? { video } : {}),
                ...(typeof ss === 'boolean' ? { isScreenSharing: ss } : {}),
                ...(typeof hr === 'boolean' ? { handRaised: hr } : {})
              }
            : p
        )
      );
    };

    const onReaction = (reaction) => {
      setFloatingReactions((prev) => [...prev, { ...reaction, left: 15 + Math.random() * 70 }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3200);
    };

    const onChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      if (activePanelRef.current !== 'chat' && msg.senderId !== currentUserId) {
        setUnreadChatCount((c) => c + 1);
      }
    };

    const onPollsUpdated = ({ polls: nextPolls }) => {
      setPolls(nextPolls || []);
    };

    const onWaitingRoomUpdated = ({ waitingList: list }) => {
      setWaitingList(list || []);
    };

    const onSettingsUpdated = (settings) => {
      setMeetingInfo((prev) => (prev ? { ...prev, ...settings } : prev));
    };

    const onForceMute = ({ by }) => {
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      setAudioEnabled(false);
      s.emit('meet:media-state', { meetingCode, audio: false });
      showToast(`${by || 'Host'} muted your microphone`, 'info');
    };

    const onRemoved = ({ message }) => {
      setErrorMessage(message || 'You were removed from the meeting.');
      setPhase('error');
    };

    const onEnded = ({ endedBy }) => {
      showToast(`Meeting ended by ${endedBy || 'Host'}`, 'info');
      setPhase('ended');
    };

    const onReconnect = () => {
      if (phaseRef.current === 'in-call') {
        s.emit('meet:join-room', {
          meetingCode,
          user,
          mediaState: {
            audio: Boolean(localStreamRef.current?.getAudioTracks().some((t) => t.enabled)),
            video: Boolean(localStreamRef.current?.getVideoTracks().some((t) => t.enabled)),
            isScreenSharing: Boolean(screenStreamRef.current),
            handRaised: false
          }
        });
      }
    };

    s.on('connect', onReconnect);

    s.on('meet:waiting-admission', onWaitingAdmission);
    s.on('meet:join-error', onJoinError);
    s.on('meet:join-denied', onJoinDenied);
    s.on('meet:joined', onJoined);
    s.on('meet:user-joined', onUserJoined);
    s.on('meet:user-left', onUserLeft);
    s.on('meet:signal', onSignal);
    s.on('meet:media-state', onMediaState);
    s.on('meet:reaction', onReaction);
    s.on('meet:chat-message', onChatMessage);
    s.on('meet:polls-updated', onPollsUpdated);
    s.on('meet:waiting-room-updated', onWaitingRoomUpdated);
    s.on('meet:settings-updated', onSettingsUpdated);
    s.on('meet:force-mute', onForceMute);
    s.on('meet:removed', onRemoved);
    s.on('meet:ended', onEnded);

    return () => {
      s.off('connect', onReconnect);
      s.off('meet:waiting-admission', onWaitingAdmission);
      s.off('meet:join-error', onJoinError);
      s.off('meet:join-denied', onJoinDenied);
      s.off('meet:joined', onJoined);
      s.off('meet:user-joined', onUserJoined);
      s.off('meet:user-left', onUserLeft);
      s.off('meet:signal', onSignal);
      s.off('meet:media-state', onMediaState);
      s.off('meet:reaction', onReaction);
      s.off('meet:chat-message', onChatMessage);
      s.off('meet:polls-updated', onPollsUpdated);
      s.off('meet:waiting-room-updated', onWaitingRoomUpdated);
      s.off('meet:settings-updated', onSettingsUpdated);
      s.off('meet:force-mute', onForceMute);
      s.off('meet:removed', onRemoved);
      s.off('meet:ended', onEnded);
    };
  }, [user, meetingCode, currentUserId, pinnedId, createPeerConnection, closePeerConnection, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('meet:leave-room', { meetingCode });
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      audioAnalysersRef.current.clear();
    };
  }, [meetingCode]);

  // Toggle Mic
  const toggleAudio = () => {
    const next = !audioEnabled;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
    }
    setAudioEnabled(next);
    if (phase === 'in-call' && socketRef.current) {
      socketRef.current.emit('meet:media-state', { meetingCode, audio: next });
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    const next = !videoEnabled;
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
    }
    setVideoEnabled(next);
    if (phase === 'in-call' && socketRef.current) {
      socketRef.current.emit('meet:media-state', { meetingCode, video: next });
    }
  };

  // Toggle Screen Share
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    peerConnectionsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && camTrack) {
        sender.replaceTrack(camTrack).catch(() => {});
      }
    });
    setIsScreenSharing(false);
    if (socketRef.current) {
      socketRef.current.emit('meet:media-state', { meetingCode, isScreenSharing: false });
    }
  }, [meetingCode]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    if (meetingInfo && meetingInfo.allowScreenShare === false && meetingInfo.hostId !== currentUserId) {
      showToast('Screen sharing is disabled by the host.', 'error');
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      screenStreamRef.current = displayStream;

      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack).catch(() => {});
        } else {
          pc.addTrack(screenTrack, displayStream);
        }
      });

      screenTrack.onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
      if (socketRef.current) {
        socketRef.current.emit('meet:media-state', { meetingCode, isScreenSharing: true });
      }
    } catch {
      // User cancelled screen share
    }
  };

  // Toggle Raise Hand
  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    if (socketRef.current) {
      socketRef.current.emit('meet:media-state', { meetingCode, handRaised: next });
    }
  };

  // Send Reaction
  const sendReaction = (emoji) => {
    setShowReactionsMenu(false);
    if (socketRef.current) {
      socketRef.current.emit('meet:reaction', {
        meetingCode,
        emoji,
        userName: user?.name || 'You',
        userId: currentUserId
      });
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Send in-call chat
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('meet:chat-message', {
      meetingCode,
      content: chatInput.trim(),
      senderName: user?.name || 'You',
      senderId: currentUserId
    });
    setChatInput('');
  };

  // Create & vote polls
  const handleCreatePoll = (e) => {
    e.preventDefault();
    const validOptions = newPollOptions.map((o) => o.trim()).filter(Boolean);
    if (!newPollQuestion.trim() || validOptions.length < 2 || !socketRef.current) return;
    socketRef.current.emit('meet:poll-create', {
      meetingCode,
      question: newPollQuestion.trim(),
      options: validOptions,
      createdBy: currentUserId,
      createdByName: user?.name || 'Host'
    });
    setNewPollQuestion('');
    setNewPollOptions(['', '']);
    setShowCreatePoll(false);
  };

  const handleVotePoll = (pollId, optionId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('meet:poll-vote', {
      meetingCode,
      pollId,
      optionId,
      userId: currentUserId
    });
  };

  const handleClosePoll = (pollId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('meet:poll-close', { meetingCode, pollId });
  };

  const isHost = meetingInfo?.hostId === currentUserId;

  const meetHubPath = user?.role === 'admin' ? '/admin/meet' : '/dashboard/meet';

  const handleLeaveCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('meet:leave-room', { meetingCode });
    }
    stopAllMedia();
    navigate(meetHubPath);
  };

  const handleEndForAll = async () => {
    try {
      if (socketRef.current) {
        socketRef.current.emit('meet:host-action', {
          meetingCode,
          action: 'end-for-all'
        });
      }
      await endMeeting(token, meetingCode);
    } catch {}
    handleLeaveCall();
  };

  const handleCopyMeetingLink = async () => {
    const url = `${window.location.origin}/meet/${meetingCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showToast('Meeting link copied!', 'success');
    } catch {}
  };

  const handleToggleLock = async () => {
    if (!isHost) return;
    try {
      const next = !meetingInfo.isLocked;
      await updateMeetingSettings(token, meetingCode, { isLocked: next });
      showToast(next ? 'Meeting locked' : 'Meeting unlocked', 'info');
    } catch {}
  };

  const handleToggleWaitingRoom = async () => {
    if (!isHost) return;
    try {
      const next = !meetingInfo.waitingRoomEnabled;
      await updateMeetingSettings(token, meetingCode, { waitingRoomEnabled: next });
      showToast(next ? 'Waiting room enabled' : 'Waiting room disabled', 'info');
    } catch {}
  };

  // All tiles (self + remote)
  const allTiles = useMemo(() => {
    const selfTile = {
      id: 'self',
      name: user?.name || 'You',
      isSelf: true,
      stream: isScreenSharing ? screenStreamRef.current : localStreamRef.current,
      audioEnabled,
      videoEnabled,
      isScreenSharing,
      handRaised,
      isSpeaking: Boolean(speakingMap.self),
      role: isHost ? 'host' : 'participant'
    };

    const remoteTiles = participants.map((p) => ({
      id: p.socketId,
      name: p.name,
      isSelf: false,
      stream: remoteStreams[p.socketId] || null,
      audioEnabled: p.audio,
      videoEnabled: p.video,
      isScreenSharing: p.isScreenSharing,
      handRaised: p.handRaised,
      isSpeaking: Boolean(speakingMap[p.socketId]),
      role: p.role
    }));

    return [selfTile, ...remoteTiles];
  }, [
    user?.name,
    isScreenSharing,
    audioEnabled,
    videoEnabled,
    handRaised,
    speakingMap,
    isHost,
    participants,
    remoteStreams
  ]);

  const spotlightTile = useMemo(() => {
    if (pinnedId) {
      const found = allTiles.find((t) => t.id === pinnedId);
      if (found) return found;
    }
    const presenter = allTiles.find((t) => t.isScreenSharing);
    if (presenter) return presenter;
    if (layoutMode === 'spotlight') return allTiles[0];
    return null;
  }, [allTiles, pinnedId, layoutMode]);

  const useSpotlight = Boolean(spotlightTile && layoutMode !== 'grid' && allTiles.length > 1);

  const gridColsClass = useMemo(() => {
    const count = allTiles.length;
    if (count === 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
  }, [allTiles.length]);

  // ==========================================
  // RENDER: ERROR / ENDED STATE
  // ==========================================
  if (phase === 'error' || phase === 'ended') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 text-blue-400 flex items-center justify-center mx-auto">
            {phase === 'ended' ? <PhoneOff className="w-7 h-7" /> : <AlertCircle className="w-7 h-7 text-rose-400" />}
          </div>
          <h2 className="text-xl font-extrabold">
            {phase === 'ended' ? 'Meeting Ended' : 'Unable to Join Meeting'}
          </h2>
          <p className="text-sm text-slate-400">
            {phase === 'ended'
              ? 'You left the meeting or the host ended the session.'
              : errorMessage}
          </p>
          <button
            type="button"
            onClick={() => navigate(meetHubPath)}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm cursor-pointer"
          >
            Return to Meet Hub
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: WAITING FOR HOST ADMISSION
  // ==========================================
  if (phase === 'waiting') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-5 shadow-2xl">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <h2 className="text-xl font-extrabold">Asking to be let in...</h2>
          <p className="text-sm text-slate-400">
            You'll join <strong className="text-white">{meetingInfo?.title || meetingCode}</strong> as soon as the host admits you.
          </p>
          <button
            type="button"
            onClick={handleLeaveCall}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: PRE-JOIN LOBBY (GREEN ROOM)
  // ==========================================
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => navigate(meetHubPath)}
            className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Meet Hub</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Video className="w-4 h-4 text-blue-500" />
            <span>{meetingCode}</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Video preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
                {videoEnabled ? (
                  <video
                    ref={lobbyVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-extrabold">
                      {(user?.name || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-400">Camera is off</span>
                  </div>
                )}

                {/* Audio meter */}
                {audioEnabled && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/75 backdrop-blur-xs">
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-75"
                        style={{ width: `${audioLevel}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Preview controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleAudio}
                    className={`p-3.5 rounded-full transition-colors cursor-pointer shadow-lg ${
                      audioEnabled
                        ? 'bg-slate-800/90 hover:bg-slate-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                    title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  >
                    {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleVideo}
                    className={`p-3.5 rounded-full transition-colors cursor-pointer shadow-lg ${
                      videoEnabled
                        ? 'bg-slate-800/90 hover:bg-slate-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                    title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Device selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedAudioId}
                  onChange={(e) => {
                    setSelectedAudioId(e.target.value);
                    startLocalMedia(e.target.value, selectedVideoId);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default Microphone</option>
                  {devices.audioInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || 'Microphone'}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedVideoId}
                  onChange={(e) => {
                    setSelectedVideoId(e.target.value);
                    startLocalMedia(selectedAudioId, e.target.value);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default Camera</option>
                  {devices.videoInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || 'Camera'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Join panel */}
            <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-7 space-y-5 shadow-2xl">
              <div>
                <span className="px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold">
                  Ready to join
                </span>
                <h1 className="text-2xl font-extrabold mt-3">
                  {meetingInfo?.title || 'MailChat Meet'}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Hosted by {meetingInfo?.hostName || 'MailChat User'} •{' '}
                  {meetingInfo?.liveParticipantCount
                    ? `${meetingInfo.liveParticipantCount} in call`
                    : 'No one else is here yet'}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleJoinMeeting}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg cursor-pointer transition-transform active:scale-95"
                >
                  {meetingInfo?.waitingRoomEnabled && !isHost ? 'Ask to join' : 'Join now'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-blue-400" />
                  <span>Share to Group / Personal Chat</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyMeetingLink}
                className="w-full py-2 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy meeting link ({meetingCode})</span>
              </button>
            </div>
          </div>
        </div>

        <ShareMeetModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          meeting={meetingInfo || { meetingCode, title: 'MailChat Meet' }}
          currentUser={user}
          showToast={showToast}
        />
      </div>
    );
  }

  // ==========================================
  // RENDER: IN-CALL GOOGLE MEET STAGE
  // ==========================================
  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none relative"
    >
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] px-4 py-2.5 rounded-2xl bg-slate-800/95 border border-slate-700 text-white text-xs font-semibold shadow-2xl">
          {toastMsg.text}
        </div>
      )}

      {/* Waiting room knock notification for host */}
      {isHost && waitingList.length > 0 && (
        <div className="fixed top-4 right-4 z-[110] w-80 rounded-2xl bg-slate-900 border border-blue-500/50 p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400">
              Someone wants to join ({waitingList.length})
            </span>
          </div>
          {waitingList.map((w) => (
            <div key={w.socketId} className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate">{w.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    socketRef.current?.emit('meet:deny-user', {
                      meetingCode,
                      targetSocketId: w.socketId
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-bold cursor-pointer"
                >
                  Deny
                </button>
                <button
                  type="button"
                  onClick={() =>
                    socketRef.current?.emit('meet:admit-user', {
                      meetingCode,
                      targetSocketId: w.socketId
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold cursor-pointer"
                >
                  Admit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Stage + Side Panel */}
      <div className="flex-1 min-h-0 flex p-3 sm:p-4 gap-3 overflow-hidden relative">
        {/* Video Area */}
        <div className="flex-1 min-w-0 h-full flex flex-col relative">
          {useSpotlight ? (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
              <div className="flex-1 min-h-0 grid grid-cols-1">
                <VideoTile
                  stream={spotlightTile.stream}
                  name={spotlightTile.name}
                  isSelf={spotlightTile.isSelf}
                  audioEnabled={spotlightTile.audioEnabled}
                  videoEnabled={spotlightTile.videoEnabled}
                  isScreenSharing={spotlightTile.isScreenSharing}
                  handRaised={spotlightTile.handRaised}
                  isPinned={pinnedId === spotlightTile.id}
                  isSpeaking={spotlightTile.isSpeaking}
                  role={spotlightTile.role}
                  onTogglePin={() =>
                    setPinnedId((p) => (p === spotlightTile.id ? null : spotlightTile.id))
                  }
                />
              </div>
              <div className="lg:w-64 flex lg:flex-col gap-2.5 overflow-auto shrink-0">
                {allTiles
                  .filter((t) => t.id !== spotlightTile.id)
                  .map((t) => (
                    <div key={t.id} className="h-36 lg:h-40 shrink-0 grid grid-cols-1">
                      <VideoTile
                        stream={t.stream}
                        name={t.name}
                        isSelf={t.isSelf}
                        audioEnabled={t.audioEnabled}
                        videoEnabled={t.videoEnabled}
                        isScreenSharing={t.isScreenSharing}
                        handRaised={t.handRaised}
                        isPinned={pinnedId === t.id}
                        isSpeaking={t.isSpeaking}
                        role={t.role}
                        onTogglePin={() => setPinnedId((p) => (p === t.id ? null : t.id))}
                      />
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className={`flex-1 min-h-0 grid gap-3 auto-rows-fr ${gridColsClass}`}>
              {allTiles.map((t) => (
                <VideoTile
                  key={t.id}
                  stream={t.stream}
                  name={t.name}
                  isSelf={t.isSelf}
                  audioEnabled={t.audioEnabled}
                  videoEnabled={t.videoEnabled}
                  isScreenSharing={t.isScreenSharing}
                  handRaised={t.handRaised}
                  isPinned={pinnedId === t.id}
                  isSpeaking={t.isSpeaking}
                  role={t.role}
                  onTogglePin={() => setPinnedId((p) => (p === t.id ? null : t.id))}
                />
              ))}
            </div>
          )}

          {/* Floating Reactions */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
            {floatingReactions.map((r) => (
              <div
                key={r.id}
                style={{ left: `${r.left}%` }}
                className="absolute bottom-8 flex flex-col items-center animate-[bounce_1.5s_ease-in-out_infinite]"
              >
                <span className="text-4xl drop-shadow-lg">{r.emoji}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] font-bold text-white mt-1">
                  {r.userName}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Panel */}
        {activePanel && (
          <aside className="w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col overflow-hidden shrink-0 shadow-2xl">
            <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {activePanel === 'people' && `People (${allTiles.length})`}
                {activePanel === 'chat' && 'In-call messages'}
                {activePanel === 'polls' && 'Polls & Activities'}
                {activePanel === 'info' && 'Meeting details'}
              </h3>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* PEOPLE PANEL */}
            {activePanel === 'people' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isHost && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Host Controls</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          socketRef.current?.emit('meet:host-action', {
                            meetingCode,
                            action: 'mute-all'
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                        <span>Mute all</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleLock}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          meetingInfo?.isLocked
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                      >
                        {meetingInfo?.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{meetingInfo?.isLocked ? 'Unlock' : 'Lock'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleWaitingRoom}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          meetingInfo?.waitingRoomEnabled
                            ? 'bg-blue-600/30 text-blue-300'
                            : 'bg-slate-800 hover:bg-slate-700'
                        }`}
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>{meetingInfo?.waitingRoomEnabled ? 'Waiting Room ON' : 'Waiting Room OFF'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {allTiles.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {(t.name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">
                            {t.name} {t.isSelf ? '(You)' : ''}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {t.role === 'host' ? 'Meeting host' : 'Participant'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {t.handRaised && <Hand className="w-3.5 h-3.5 text-amber-400" />}
                        {t.audioEnabled ? (
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        {isHost && !t.isSelf && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                socketRef.current?.emit('meet:host-action', {
                                  meetingCode,
                                  action: 'mute-user',
                                  targetSocketId: t.id
                                })
                              }
                              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                              title="Mute participant"
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                socketRef.current?.emit('meet:host-action', {
                                  meetingCode,
                                  action: 'remove-user',
                                  targetSocketId: t.id
                                })
                              }
                              className="p-1 rounded hover:bg-rose-950 text-rose-400 cursor-pointer"
                              title="Remove from meeting"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* IN-CALL CHAT PANEL */}
            {activePanel === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 py-10">
                      Messages sent here are visible to everyone in the call.
                    </div>
                  ) : (
                    chatMessages.map((m) => (
                      <div key={m.id} className="space-y-0.5">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-slate-200">{m.senderName}</span>
                          <span className="text-slate-500">
                            {new Date(m.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2">
                          {m.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <form
                  onSubmit={handleSendChat}
                  className="p-3 border-t border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message to everyone..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}

            {/* POLLS PANEL */}
            {activePanel === 'polls' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <button
                  type="button"
                  onClick={() => setShowCreatePoll((v) => !v)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showCreatePoll ? 'Cancel' : 'Create a Poll'}</span>
                </button>

                {showCreatePoll && (
                  <form
                    onSubmit={handleCreatePoll}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                  >
                    <input
                      type="text"
                      required
                      value={newPollQuestion}
                      onChange={(e) => setNewPollQuestion(e.target.value)}
                      placeholder="Ask a question..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    {newPollOptions.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        required={idx < 2}
                        value={opt}
                        onChange={(e) => {
                          const next = [...newPollOptions];
                          next[idx] = e.target.value;
                          setNewPollOptions(next);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setNewPollOptions((prev) => [...prev, ''])}
                        className="text-xs text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        + Add option
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-bold cursor-pointer"
                      >
                        Launch Poll
                      </button>
                    </div>
                  </form>
                )}

                {polls.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-8">
                    No polls yet. Launch a poll to gather instant team feedback!
                  </div>
                ) : (
                  polls.map((poll) => {
                    const totalVotes = poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
                    return (
                      <div
                        key={poll.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-white">{poll.question}</h4>
                            <p className="text-[10px] text-slate-500">
                              By {poll.createdByName} • {totalVotes} vote{totalVotes === 1 ? '' : 's'}
                            </p>
                          </div>
                          {poll.isClosed && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                              Closed
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          {poll.options.map((opt) => {
                            const count = opt.votes?.length || 0;
                            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                            const voted = opt.votes?.includes(currentUserId);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={poll.isClosed}
                                onClick={() => handleVotePoll(poll.id, opt.id)}
                                className={`w-full text-left p-2 rounded-lg border text-xs relative overflow-hidden cursor-pointer ${
                                  voted
                                    ? 'border-blue-500 bg-blue-950/30'
                                    : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                                }`}
                              >
                                <div
                                  className="absolute inset-y-0 left-0 bg-blue-600/20 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                                <div className="relative flex items-center justify-between">
                                  <span className="font-medium">{opt.text}</span>
                                  <span className="text-[11px] font-bold text-slate-300">
                                    {pct}% ({count})
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {!poll.isClosed && (isHost || poll.createdBy === currentUserId) && (
                          <button
                            type="button"
                            onClick={() => handleClosePoll(poll.id)}
                            className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                          >
                            End poll
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* MEETING DETAILS / SHARE PANEL */}
            {activePanel === 'info' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300">Joining info</div>
                  <p className="text-xs font-mono text-blue-400 break-all">
                    {window.location.origin}/meet/{meetingCode}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyMeetingLink}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy link</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowShareModal(true)}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share to Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Control Bar */}
      <footer className="px-4 py-3 bg-slate-950 border-t border-slate-900 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Time & Code */}
        <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-300 min-w-[180px]">
          <span>{clockStr}</span>
          <span className="text-slate-700">|</span>
          <span className="font-mono text-slate-400">{meetingCode}</span>
        </div>

        {/* Center: Core Meet Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 mx-auto">
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-colors cursor-pointer ${
              audioEnabled ? 'bg-slate-800 hover:bg-slate-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
            title={audioEnabled ? 'Turn off microphone' : 'Turn on microphone'}
          >
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-colors cursor-pointer ${
              videoEnabled ? 'bg-slate-800 hover:bg-slate-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
            title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactionsMenu((v) => !v)}
              className={`p-3 rounded-full transition-colors cursor-pointer ${
                showReactionsMenu ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title="Send a reaction"
            >
              <Smile className="w-5 h-5" />
            </button>
            {showReactionsMenu && (
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-2 rounded-full bg-slate-900 border border-slate-800 shadow-2xl flex items-center gap-2 z-50">
                {REACTION_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => sendReaction(em)}
                    className="text-xl hover:scale-125 transition-transform cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-colors cursor-pointer ${
              isScreenSharing ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop presenting' : 'Present screen'}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={toggleHand}
            className={`p-3 rounded-full transition-colors cursor-pointer ${
              handRaised ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={handRaised ? 'Lower hand' : 'Raise hand'}
          >
            <Hand className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setLayoutMode((m) => (m === 'grid' ? 'spotlight' : 'grid'))}
            className={`hidden sm:flex p-3 rounded-full transition-colors cursor-pointer ${
              layoutMode === 'spotlight' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title="Switch layout (Grid / Spotlight)"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex p-3 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* Leave / End Call */}
          <div className="relative">
            <button
              type="button"
              onClick={() => (isHost ? setShowEndMenu((v) => !v) : handleLeaveCall())}
              className="px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 cursor-pointer shadow-lg"
              title="Leave call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
            {isHost && showEndMenu && (
              <div className="absolute bottom-14 right-0 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-1.5 z-50 space-y-1">
                <button
                  type="button"
                  onClick={handleLeaveCall}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Just leave the call
                </button>
                <button
                  type="button"
                  onClick={handleEndForAll}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-950/60 cursor-pointer"
                >
                  End meeting for everyone
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Side Panel Toggles */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={() => setActivePanel((p) => (p === 'info' ? null : 'info'))}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
              activePanel === 'info' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Meeting details & Share"
          >
            <Info className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setActivePanel((p) => (p === 'people' ? null : 'people'))}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer relative ${
              activePanel === 'people' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="People"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-700 text-[10px] font-bold">
              {allTiles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel((p) => (p === 'chat' ? null : 'chat'))}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer relative ${
              activePanel === 'chat' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="In-call messages"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-[10px] font-bold">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActivePanel((p) => (p === 'polls' ? null : 'polls'))}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
              activePanel === 'polls' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Polls & Activities"
          >
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>
      </footer>

      <ShareMeetModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        meeting={meetingInfo || { meetingCode, title: 'MailChat Meet' }}
        currentUser={user}
        showToast={showToast}
      />
    </div>
  );
}
