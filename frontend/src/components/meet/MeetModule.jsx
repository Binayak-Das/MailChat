import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Plus,
  Keyboard,
  Calendar,
  Link2,
  Share2,
  Copy,
  Check,
  Users,
  Clock,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldCheck,
  Radio,
  Trash2
} from 'lucide-react';
import { createMeeting, getMeetings, endMeeting } from '../../services/api';
import { cookieStorage } from '../../services/storage';
import ShareMeetModal from './ShareMeetModal';

const formatDateDDMMYYYY = (dateInput, includeTime = false) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  if (!includeTime) return `${dd}-${mm}-${yyyy}`;
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dd}-${mm}-${yyyy}, ${time}`;
};

export default function MeetModule({ user, showToast }) {
  const navigate = useNavigate();
  const token = cookieStorage.getItem('mailchat_token');
  const currentUserId = (user?._id || user?.id)?.toString();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [showNewMenu, setShowNewMenu] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleWaitingRoom, setScheduleWaitingRoom] = useState(false);

  const [shareModalMeeting, setShareModalMeeting] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  const loadMeetings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getMeetings(token);
      setMeetings(res.meetings || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const extractCode = (raw) => {
    const val = (raw || '').trim();
    if (!val) return '';
    const match = val.match(/([a-z0-9]{3,4}-[a-z0-9]{3,5}-[a-z0-9]{3,4})/i);
    if (match) return match[1].toLowerCase();
    return val.split('/').pop().toLowerCase();
  };

  const handleJoinByInput = (e) => {
    e.preventDefault();
    const code = extractCode(joinInput);
    if (!code) {
      if (showToast) showToast('Enter a valid meeting code or link', 'error');
      return;
    }
    navigate(`/meet/${code}`);
  };

  const handleInstantMeeting = async () => {
    setShowNewMenu(false);
    setCreating(true);
    try {
      const res = await createMeeting(token, {
        title: `${user?.name || 'MailChat'}'s Instant Meet`
      });
      if (res.meeting?.meetingCode) {
        navigate(`/meet/${res.meeting.meetingCode}`);
      }
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not start meeting', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateForLater = async () => {
    setShowNewMenu(false);
    setCreating(true);
    try {
      const res = await createMeeting(token, {
        title: `${user?.name || 'MailChat'}'s Meeting`
      });
      if (res.meeting) {
        setMeetings((prev) => [res.meeting, ...prev]);
        setShareModalMeeting(res.meeting);
      }
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not create meeting link', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createMeeting(token, {
        title: scheduleTitle.trim() || `${user?.name || 'MailChat'}'s Scheduled Meet`,
        scheduledAt: scheduleTime || new Date(Date.now() + 3600000).toISOString(),
        waitingRoomEnabled: scheduleWaitingRoom
      });
      if (res.meeting) {
        setMeetings((prev) => [res.meeting, ...prev]);
        setShowScheduleModal(false);
        setScheduleTitle('');
        setScheduleTime('');
        setShareModalMeeting(res.meeting);
        if (showToast) showToast('Meeting scheduled! Share it with your team.', 'success');
      }
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to schedule meeting', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async (code) => {
    const url = `${window.location.origin}/meet/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
      if (showToast) showToast('Meeting link copied!', 'success');
    } catch {
      if (showToast) showToast('Failed to copy', 'error');
    }
  };

  const handleEndMeeting = async (code) => {
    try {
      await endMeeting(token, code);
      setMeetings((prev) =>
        prev.map((m) => (m.meetingCode === code ? { ...m, status: 'ended', liveParticipantCount: 0 } : m))
      );
      if (showToast) showToast('Meeting ended', 'info');
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not end meeting', 'error');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Hero / Action Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Video meetings for your MailChat teams & contacts
            </h2>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
              Launch instant HD video calls, share meeting links directly into personal chats or groups, collaborate with screen sharing, live polls, and host controls.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowNewMenu((v) => !v)}
                  className="px-5 py-3 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-60"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                  <span>New Meeting</span>
                </button>

                {showNewMenu && (
                  <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50">
                    <button
                      type="button"
                      onClick={handleInstantMeeting}
                      className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Start an instant meeting</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateForLater}
                      className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 cursor-pointer"
                    >
                      <Link2 className="w-4 h-4 text-emerald-600" />
                      <span>Create a meeting for later</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewMenu(false);
                        setShowScheduleModal(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>Schedule a meeting</span>
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleJoinByInput} className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
                <div className="relative flex-1">
                  <Keyboard className="w-4 h-4 text-blue-200 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="Enter a code or link (e.g. abc-defg-hij)"
                    className="w-full pl-10 pr-3 py-3 rounded-2xl bg-white/15 border border-white/25 text-white placeholder:text-blue-200 text-sm focus:outline-none focus:bg-white/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!joinInput.trim()}
                  className="px-4 py-3 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 disabled:opacity-40 text-white font-bold text-sm cursor-pointer transition-colors"
                >
                  Join
                </button>
              </form>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <Users className="w-5 h-5 text-emerald-300 mb-1.5" />
              <div className="text-xs font-bold">Group & Direct Share</div>
              <div className="text-[11px] text-blue-100 mt-0.5">1-click invite cards in chats</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <ShieldCheck className="w-5 h-5 text-amber-300 mb-1.5" />
              <div className="text-xs font-bold">Host Controls</div>
              <div className="text-[11px] text-blue-100 mt-0.5">Waiting room, lock & mute</div>
            </div>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Your Meetings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rejoin active rooms, share links to groups/chats, or manage scheduled calls
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : meetings.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Video className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No meetings yet
            </p>
            <p className="text-xs text-slate-400">
              Click "New Meeting" above to start an instant call or schedule one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {meetings.map((m) => {
              const isHost = m.hostId === currentUserId;
              const isEnded = m.status === 'ended';
              return (
                <div
                  key={m._id || m.meetingCode}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {m.title}
                        </h4>
                        {m.liveParticipantCount > 0 && !isEnded && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            <Radio className="w-3 h-3 animate-pulse" />
                            {m.liveParticipantCount} live
                          </span>
                        )}
                        {isEnded && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">
                            Ended
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {m.meetingCode}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {m.scheduledAt
                            ? formatDateDDMMYYYY(m.scheduledAt, true)
                            : formatDateDDMMYYYY(m.createdAt, true)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(m.meetingCode)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedCode === m.meetingCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Copy</span>
                      </button>

                      {!isEnded && (
                        <button
                          type="button"
                          onClick={() => setShareModalMeeting(m)}
                          className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Share to Chat</span>
                        </button>
                      )}

                      {isHost && !isEnded && (
                        <button
                          type="button"
                          onClick={() => handleEndMeeting(m.meetingCode)}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="End meeting for all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {!isEnded && (
                      <button
                        type="button"
                        onClick={() => navigate(`/meet/${m.meetingCode}`)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Join</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleScheduleSubmit}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Schedule a Meeting
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Meeting Title
              </label>
              <input
                type="text"
                required
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                placeholder="e.g., Weekly Product Sync"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleWaitingRoom}
                onChange={(e) => setScheduleWaitingRoom(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Enable Waiting Room (Host admits participants)</span>
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1.5"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Create & Share</span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ShareMeetModal
        isOpen={Boolean(shareModalMeeting)}
        onClose={() => setShareModalMeeting(null)}
        meeting={shareModalMeeting}
        currentUser={user}
        showToast={showToast}
      />
    </div>
  );
}
