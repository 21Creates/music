import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import { useToast } from '@/context/ToastContext';
import type { GameSession, GameQuestion, GameSessionScore } from '@/types';
import { Plus, Gamepad2, X, Trophy, Clock, Play, Check, Zap, RotateCcw } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface GamesTabProps {
  roomId: string;
  isAdmin?: boolean;
}

type ScoreWithProfile = GameSessionScore & { profiles?: { display_name: string; avatar_url: string | null; id: string } };

const gameTypeLabels: Record<string, string> = {
  complete_line: 'Complete the Lyric',
  timer_question: 'Timer Question',
  four_pics: 'Four Pics One Word',
  mixed: 'Mixed Trivia',
  anagram: 'Anagram',
};

export default function GamesTab({ roomId, isAdmin: _isAdmin }: GamesTabProps) {
  const { user } = useAuth();
  const { hasFeature } = usePremium();
  const toast = useToast();
  const [games, setGames] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [scores, setScores] = useState<ScoreWithProfile[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);

  const loadGames = useCallback(async () => {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false });
    if (error) { setLoading(false); return; }
    setGames((data as GameSession[]) || []);
    setLoading(false);
  }, [roomId]);

  useEffect(() => { loadGames(); }, [loadGames]);

  useEffect(() => {
    const channel = supabase
      .channel(`games-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `room_id=eq.${roomId}` }, loadGames)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, loadGames]);

  const openGame = async (game: GameSession) => {
    if (!hasFeature('game_access')) {
      toast.info('Games are a premium feature');
      return;
    }
    setActiveGame(game);
    const [qRes, sRes] = await Promise.all([
      supabase.from('game_questions').select('*').eq('session_id', game.id).order('position', { ascending: true }),
      supabase.from('game_session_scores')
        .select('*, profiles:profiles!game_session_scores_user_id_fkey(id, display_name, avatar_url)')
        .eq('session_id', game.id)
        .order('total_points', { ascending: false }),
    ]);
    setQuestions((qRes.data as GameQuestion[]) || []);
    setScores((sRes.data as unknown as ScoreWithProfile[]) || []);
  };

  const startGame = async () => {
    if (!user || !activeGame) return;
    setPlaying(true);
    setCurrentQ(0);
    setGameScore(0);
    setCorrectCount(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setStartTime(Date.now());
    setGameStartTime(Date.now());

    await supabase.from('game_plays').insert({
      game_id: activeGame.id,
      room_id: roomId,
      user_id: user.id,
      status: 'in_progress',
      started_at: new Date().toISOString(),
    });
  };

  const answerQuestion = async (answer: string) => {
    if (!user || !activeGame || showResult) return;
    const question = questions[currentQ];
    if (!question) return;
    const timeMs = Date.now() - startTime;
    const isCorrect = answer === question.correct_answer;
    const points = isCorrect ? Math.max(100, 500 - Math.floor(timeMs / 10)) : 0;

    setSelectedAnswer(answer);
    setShowResult(true);
    setGameScore((prev) => prev + points);
    if (isCorrect) setCorrectCount((prev) => prev + 1);

    await supabase.from('game_session_answers').insert({
      session_id: activeGame.id,
      question_id: question.id,
      user_id: user.id,
      answer,
      time_ms: timeMs,
      is_correct: isCorrect,
      points,
    });
  };

  const nextQuestion = async () => {
    if (currentQ + 1 >= questions.length) {
      await finishGame();
      return;
    }
    setCurrentQ((prev) => prev + 1);
    setSelectedAnswer(null);
    setShowResult(false);
    setStartTime(Date.now());
  };

  const finishGame = async () => {
    if (!user || !activeGame) return;
    setPlaying(false);
    const avgTime = Math.floor((Date.now() - gameStartTime) / Math.max(questions.length, 1));

    await supabase.from('game_session_scores').upsert({
      session_id: activeGame.id,
      room_id: roomId,
      user_id: user.id,
      total_points: gameScore,
      correct_count: correctCount,
      avg_time_ms: avgTime,
    }, { onConflict: 'session_id,user_id' });

    await supabase.from('game_plays').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_points: gameScore,
      correct_count: correctCount,
      avg_time_ms: avgTime,
    }).eq('game_id', activeGame.id).eq('user_id', user.id).eq('status', 'in_progress');

    toast.success(`Game over! Score: ${gameScore} · ${correctCount}/${questions.length} correct`);
    if (activeGame) openGame(activeGame);
  };

  if (activeGame) {
    if (playing && questions.length > 0) {
      const q = questions[currentQ];
      const allChoices = [...q.choices, q.correct_answer].filter(Boolean);
      const uniqueChoices = [...new Set(allChoices)];
      return (
        <div className="glass-card p-6 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <span className="badge-blue">Question {currentQ + 1} / {questions.length}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-amber-400"><Trophy className="w-4 h-4" /> {gameScore}</span>
              <span className="flex items-center gap-1 text-emerald-400"><Check className="w-4 h-4" /> {correctCount}</span>
            </div>
          </div>
          <h3 className="text-lg font-bold mb-1">{activeGame.title}</h3>
          <p className="text-muted text-sm mb-4">{q.question}</p>
          {q.image_urls && q.image_urls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {q.image_urls.map((url, i) => <img key={i} src={url} alt="" className="rounded-lg w-full aspect-square object-cover" />)}
            </div>
          )}
          <div className="space-y-2">
            {uniqueChoices.map((choice) => {
              const isCorrect = choice === q.correct_answer;
              const isSelected = choice === selectedAnswer;
              let style = 'surface-hover';
              if (showResult) {
                if (isCorrect) style = 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300';
                else if (isSelected) style = 'bg-magenta-500/15 border border-magenta-500/30 text-magenta-300';
                else style = 'surface opacity-50';
              }
              return (
                <button
                  key={choice}
                  onClick={() => answerQuestion(choice)}
                  disabled={showResult}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${style}`}
                >
                  {choice}
                  {showResult && isCorrect && <Check className="inline w-4 h-4 ml-2" />}
                </button>
              );
            })}
          </div>
          {showResult && (
            <button onClick={nextQuestion} className="btn-primary w-full mt-4">
              {currentQ + 1 >= questions.length ? 'Finish' : 'Next Question'}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <button onClick={() => setActiveGame(null)} className="btn-ghost text-sm flex items-center gap-1">
          <X className="w-4 h-4" /> Back to games
        </button>
        <div className="glass-card p-5 animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">{activeGame.title || gameTypeLabels[activeGame.game_type]}</h3>
              <span className="badge-muted mt-1">{gameTypeLabels[activeGame.game_type]}</span>
            </div>
            <span className="badge-blue flex items-center gap-1"><Clock className="w-3 h-3" /> {activeGame.duration_seconds}s</span>
          </div>
          <p className="text-sm text-muted mb-4">{questions.length} questions · Play requirement: {activeGame.play_requirement}</p>
          <button onClick={startGame} className="btn-primary w-full flex items-center justify-center gap-2">
            <Play className="w-4 h-4" /> Start Playing
          </button>
        </div>
        {scores.length > 0 && (
          <div className="glass-card p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" /> Leaderboard</h4>
            <div className="space-y-2">
              {scores.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-ink-800/50">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-ink-600 text-ink-200' : i === 2 ? 'bg-orange-900/40 text-orange-400' : 'bg-ink-700 text-muted'}`}>{i + 1}</span>
                  <span className="text-sm flex-1 truncate">{s.profiles?.display_name || 'Unknown'}</span>
                  <span className="text-sm font-bold text-amber-400">{s.total_points}</span>
                  <span className="text-xs text-muted">{s.correct_count} correct</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Gamepad2 className="w-5 h-5 text-electric-400" /> Games</h3>
        <button onClick={() => setShowCreate(true)} className="btn-secondary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Game
        </button>
      </div>

      {!hasFeature('game_access') && (
        <div className="glass-card p-3 border border-amber-500/20 bg-amber-500/5 text-sm text-amber-400">
          Games are a premium feature. Upgrade to play!
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="glass-card p-4"><div className="skeleton h-5 w-1/3 rounded mb-2" /><div className="skeleton h-4 w-1/2 rounded" /></div>)}</div>
      ) : games.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Gamepad2 className="w-10 h-10 text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">No games yet. Create a trivia game for this room!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {games.map((game) => (
            <button key={game.id} onClick={() => openGame(game)} className="surface-hover p-4 text-left group animate-fade-in">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{game.title || gameTypeLabels[game.game_type]}</h4>
                <span className="badge-muted">{gameTypeLabels[game.game_type]}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {game.duration_seconds}s</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {game.status}</span>
                <span>{timeAgo(game.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && user && <CreateGameModal roomId={roomId} userId={user.id} onClose={() => setShowCreate(false)} onCreated={loadGames} />}
    </div>
  );
}

function CreateGameModal({ roomId, userId, onClose, onCreated }: { roomId: string; userId: string; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [gameType, setGameType] = useState<GameSession['game_type']>('mixed');
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState<Array<{ question: string; correct_answer: string; choices: string[] }>>([
    { question: '', correct_answer: '', choices: ['', '', ''] },
  ]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Need a title'); return; }
    const validQs = questions.filter((q) => q.question.trim() && q.correct_answer.trim());
    if (validQs.length === 0) { toast.error('Need at least 1 question'); return; }

    const { data: game, error } = await supabase
      .from('game_sessions')
      .insert({
        room_id: roomId, created_by: userId, game_type: gameType,
        title, duration_seconds: duration, status: 'waiting',
        play_requirement: 1, repeat_questions: false, is_permanent: false,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }

    const { error: qError } = await supabase
      .from('game_questions')
      .insert(validQs.map((q, i) => ({
        session_id: game.id,
        question: q.question,
        correct_answer: q.correct_answer,
        choices: q.choices.filter((c) => c.trim() && c !== q.correct_answer),
        image_urls: [],
        question_type: 'text',
        position: i,
      })));
    if (qError) { toast.error(qError.message); return; }

    toast.success('Game created!');
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Create Game</h2>
          <button onClick={onClose} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="Game title" required />
          <div className="grid grid-cols-2 gap-3">
            <select value={gameType} onChange={(e) => setGameType(e.target.value as GameSession['game_type'])} className="input-field">
              <option value="mixed">Mixed Trivia</option>
              <option value="complete_line">Complete the Lyric</option>
              <option value="timer_question">Timer Question</option>
              <option value="four_pics">Four Pics One Word</option>
              <option value="anagram">Anagram</option>
            </select>
            <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} className="input-field" placeholder="Duration (s)" min={10} />
          </div>
          <div className="space-y-3">
            {questions.map((q, qi) => (
              <div key={qi} className="p-3 rounded-xl bg-ink-800/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted">Question {qi + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))} className="btn-icon-sm">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input value={q.question} onChange={(e) => setQuestions((prev) => prev.map((p, i) => i === qi ? { ...p, question: e.target.value } : p))} className="input-sm" placeholder="Question text" />
                <input value={q.correct_answer} onChange={(e) => setQuestions((prev) => prev.map((p, i) => i === qi ? { ...p, correct_answer: e.target.value } : p))} className="input-sm" placeholder="Correct answer" />
                <div className="space-y-1.5">
                  {q.choices.map((c, ci) => (
                    <input key={ci} value={c} onChange={(e) => setQuestions((prev) => prev.map((p, i) => i === qi ? { ...p, choices: p.choices.map((cc, ii) => ii === ci ? e.target.value : cc) } : p))} className="input-sm" placeholder={`Wrong option ${ci + 1}`} />
                  ))}
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setQuestions((prev) => [...prev, { question: '', correct_answer: '', choices: ['', '', ''] }])} className="btn-ghost text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add question
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create Game</button>
          </div>
        </form>
      </div>
    </div>
  );
}
