import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Poll, PollOption, Profile } from '@/types';
import { Plus, Vote, X, BarChart3, Clock } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface PollsTabProps {
  roomId: string;
  isAdmin?: boolean;
}

interface PollWithOptions extends Poll {
  poll_options: PollOption[];
}

export default function PollsTab({ roomId, isAdmin: _isAdmin }: PollsTabProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [polls, setPolls] = useState<PollWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});

  const loadPolls = useCallback(async () => {
    const { data, error } = await supabase
      .from('polls')
      .select(`
        *,
        poll_options(*)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });
    if (error) { setLoading(false); return; }
    setPolls((data as unknown as PollWithOptions[]) || []);

    if (user && data) {
      const votes = await supabase
        .from('poll_votes')
        .select('poll_id, option_id')
        .eq('user_id', user.id)
        .in('poll_id', data.map((p) => p.id));
      const voted = new Set<string>();
      votes.data?.forEach((v) => voted.add(v.poll_id));
      setVotedPolls(voted);
    }

    if (data && data.length > 0) {
      const counts: Record<string, Record<string, number>> = {};
      await Promise.all(data.map(async (poll) => {
        const { data: votes } = await supabase
          .from('poll_votes')
          .select('option_id')
          .eq('poll_id', poll.id);
        const c: Record<string, number> = {};
        votes?.forEach((v) => { c[v.option_id] = (c[v.option_id] || 0) + 1; });
        counts[poll.id] = c;
      }));
      setVoteCounts(counts);
    }
    setLoading(false);
  }, [roomId, user]);

  useEffect(() => { loadPolls(); }, [loadPolls]);

  useEffect(() => {
    const channel = supabase
      .channel(`polls-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls', filter: `room_id=eq.${roomId}` }, loadPolls)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, loadPolls)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_options' }, loadPolls)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, loadPolls]);

  const vote = async (pollId: string, optionId: string) => {
    if (!user) return;
    if (votedPolls.has(pollId)) { toast.info('You already voted'); return; }
    const { error } = await supabase.from('poll_votes').insert({
      poll_id: pollId, option_id: optionId, user_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    setVotedPolls((prev) => new Set(prev).add(pollId));
    loadPolls();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Vote className="w-5 h-5 text-electric-400" /> Polls & Surveys</h3>
        <button onClick={() => setShowCreate(true)} className="btn-secondary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Poll
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="glass-card p-4"><div className="skeleton h-5 w-1/2 rounded mb-3" /><div className="skeleton h-4 w-full rounded mb-2" /><div className="skeleton h-4 w-3/4 rounded" /></div>)}
        </div>
      ) : polls.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <BarChart3 className="w-10 h-10 text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">No polls yet. Create one to gather feedback!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => {
            const hasVoted = votedPolls.has(poll.id);
            const totalVotes = Object.values(voteCounts[poll.id] || {}).reduce((a, b) => a + b, 0);
            return (
              <div key={poll.id} className="glass-card p-4 animate-fade-in">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{poll.question}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-muted">{poll.type === 'survey' ? 'Survey' : 'Poll'}</span>
                      {poll.multiple_choice && <span className="badge-blue">Multi-choice</span>}
                      {poll.closes_at && <span className="text-xs text-muted flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(poll.closes_at)}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-2">{totalVotes} votes</span>
                </div>
                <div className="space-y-2">
                  {poll.poll_options
                    .sort((a, b) => a.position - b.position)
                    .map((option) => {
                      const count = voteCounts[poll.id]?.[option.id] || 0;
                      const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                      return (
                        <button
                          key={option.id}
                          onClick={() => vote(poll.id, option.id)}
                          disabled={hasVoted}
                          className="w-full text-left group"
                        >
                          <div className="relative overflow-hidden rounded-lg bg-ink-800 border border-white/[0.04] hover:border-white/[0.1] transition-colors">
                            {hasVoted && (
                              <div className="absolute inset-y-0 left-0 bg-electric-500/15" style={{ width: `${pct}%` }} />
                            )}
                            <div className="relative flex items-center justify-between px-3 py-2">
                              <span className="text-sm">{option.text}</span>
                              {hasVoted && <span className="text-xs text-muted tabular-nums">{count} ({Math.round(pct)}%)</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
                <p className="text-xs text-muted-2 mt-2">by {poll.profiles?.display_name || 'Unknown'} · {timeAgo(poll.created_at)}</p>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreatePollModal roomId={roomId} userId={user!.id} onClose={() => setShowCreate(false)} onCreated={loadPolls} />}
    </div>
  );
}

function CreatePollModal({ roomId, userId, onClose, onCreated }: { roomId: string; userId: string; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<'poll' | 'survey'>('poll');
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [options, setOptions] = useState(['', '']);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) { toast.error('Need at least 2 options'); return; }

    const { data: poll, error } = await supabase
      .from('polls')
      .insert({ room_id: roomId, created_by: userId, question, type, multiple_choice: multipleChoice })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }

    const { error: optError } = await supabase
      .from('poll_options')
      .insert(validOptions.map((text, i) => ({ poll_id: poll.id, text, position: i })));
    if (optError) { toast.error(optError.message); return; }

    toast.success('Poll created!');
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Create Poll</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} className="input-field" placeholder="Ask a question..." required />
          <div className="flex gap-2">
            <select value={type} onChange={(e) => setType(e.target.value as 'poll' | 'survey')} className="input-field flex-1">
              <option value="poll">Poll</option>
              <option value="survey">Survey</option>
            </select>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-800 cursor-pointer">
              <input type="checkbox" checked={multipleChoice} onChange={(e) => setMultipleChoice(e.target.checked)} />
              <span className="text-sm">Multi</span>
            </label>
          </div>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => setOptions((prev) => prev.map((o, idx) => idx === i ? e.target.value : o))}
                  className="input-field"
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))} className="btn-icon-sm">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" onClick={() => setOptions((prev) => [...prev, ''])} className="btn-ghost text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add option
              </button>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
