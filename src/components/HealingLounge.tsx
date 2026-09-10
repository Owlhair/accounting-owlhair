import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Coffee, 
  Sparkles, 
  Smile, 
  X, 
  RefreshCw, 
  Volume2, 
  Wind,
  Check,
  ChevronDown
} from 'lucide-react';

interface HealingLoungeProps {
  isOpen: boolean;
  onClose: () => void;
}

// ほっこり温かい言葉集（経営・給与計算・数字入力で疲れた心に染みるメッセージ）
const COZY_MESSAGES = [
  {
    character: '🐱 みけねこのみかん',
    avatar: '🐱',
    text: 'わがままなんかじゃ全然ないにゃ！数字とにらめっこして会社を支えるあなたにこそ、一番の癒しが必要なんだにゃ✨',
    sub: '今日もスタッフと会社を守ってて、本当にえらいにゃ！',
  },
  {
    character: '🐱 みけねこのみかん',
    avatar: '🐱',
    text: '1円単位まで真剣に向き合って計算する社長の誠実さ、スタッフのみんなにもきっと届いてるにゃ🍵',
    sub: '肩をぐる〜んと回して、首をすこし伸ばしてみてにゃ。',
  },
  {
    character: '🐶 柴犬のこむぎ',
    avatar: '🐶',
    text: 'わん！毎月の給料計算って、スタッフさんの生活と笑顔を支える最高に尊いお仕事です！',
    sub: 'いつも本当にお疲れ様です！僕はずーっと応援してますワン！',
  },
  {
    character: '🐶 柴犬のこむぎ',
    avatar: '🐶',
    text: 'お茶かコーヒーを淹れて、一口ごくりと飲んでみませんか？☕',
    sub: '息をふぅ〜〜っと吐いて、一瞬だけ数字のことを忘れる時間も大事ですワン。',
  },
  {
    character: '🦭 カピバラののんのん',
    avatar: '🦭',
    text: 'のんびり、ゆったり…焦らなくても、ちゃんと前に進んでるよ〜♨️',
    sub: '温泉にぽかぽか浸かってる気分で、深呼吸してみてね。',
  },
  {
    character: '🦭 カピバラののんのん',
    avatar: '🦭',
    text: '「今日はここまでよくやった！」って、自分をいっぱい褒めてあげてね🍮',
    sub: '美味しいスイーツでも買って帰る資格、今日のあなたには十二分にあります。',
  },
  {
    character: '🐱 みけねこのみかん',
    avatar: '🐱',
    text: '扶養家族の計算も社保の計算も、迷ったら何度でもやり直せば大丈夫にゃ🐾',
    sub: '完璧じゃなくても、少しずつ整っていけば百点満点だにゃ！',
  },
  {
    character: '🐶 柴犬のこむぎ',
    avatar: '🐶',
    text: 'いつも誰かのために頑張ってるあなたへ。たまには自分を最優先で甘やかしてあげてくださいね🌸',
    sub: 'あなたが元気で笑顔でいることが、会社の一番の宝物です！',
  },
];

const TREATS = [
  { id: 'tea', icon: '🍵', name: 'あたたかい緑茶', effect: 'ほっと一息…香りに癒されます' },
  { id: 'coffee', icon: '☕', name: '芳醇な珈琲', effect: 'ふんわりいい香りでリフレッシュ！' },
  { id: 'pudding', icon: '🍮', name: '特製プリン', effect: '甘〜い幸せがお口いっぱいに広がります' },
  { id: 'dango', icon: '🍡', name: '三色おだんご', effect: 'もちもち食感で思わず笑顔に♪' },
];

export const HealingLounge: React.FC<HealingLoungeProps> = ({ isOpen, onClose }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [heartsCount, setHeartsCount] = useState(0);
  const [isPetting, setIsPetting] = useState(false);
  const [activeTab, setActiveTab] = useState<'talk' | 'breath' | 'stretch'>('talk');
  const [selectedTreat, setSelectedTreat] = useState<string | null>(null);

  // Breathing circle state
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathTimer, setBreathTimer] = useState(4);

  // Rotate message
  const nextMessage = () => {
    setCurrentMessageIndex((prev) => (prev + 1) % COZY_MESSAGES.length);
  };

  // Pet the companion
  const handlePet = () => {
    setIsPetting(true);
    setHeartsCount((prev) => prev + 1);
    setTimeout(() => setIsPetting(false), 800);
  };

  // Give a treat
  const handleGiveTreat = (treatId: string) => {
    setSelectedTreat(treatId);
    setHeartsCount((prev) => prev + 3);
    setTimeout(() => {
      setSelectedTreat(null);
    }, 2500);
  };

  // Breathing loop
  useEffect(() => {
    if (!isOpen || activeTab !== 'breath') return;

    let phase: 'inhale' | 'hold' | 'exhale' = 'inhale';
    let count = 4;
    setBreathPhase('inhale');
    setBreathTimer(4);

    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (phase === 'inhale') {
          phase = 'hold';
          count = 4;
        } else if (phase === 'hold') {
          phase = 'exhale';
          count = 6;
        } else {
          phase = 'inhale';
          count = 4;
        }
        setBreathPhase(phase);
      }
      setBreathTimer(count);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const currentMsg = COZY_MESSAGES[currentMessageIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-gradient-to-b from-amber-50/90 via-orange-50/40 to-white rounded-3xl max-w-lg w-full border border-amber-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-white/80 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg shadow-2xs">
              🍵
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-amber-950">
                  ほっこり休憩室
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  経営者の癒しカフェ
                </span>
              </div>
              <p className="text-[11px] text-amber-800/80">
                数字から少し離れて、温かいお茶でほっと一息つきましょう
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-800 hover:text-amber-950 hover:bg-amber-100/60 rounded-xl transition-colors cursor-pointer"
            title="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-amber-100/80 bg-amber-50/60 p-1.5 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('talk')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'talk'
                ? 'bg-white text-amber-950 shadow-xs border border-amber-200/60'
                : 'text-amber-800/70 hover:text-amber-950 hover:bg-amber-100/50'
            }`}
          >
            <span>🐱</span>
            <span>相棒からの温かい言葉</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('breath')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'breath'
                ? 'bg-white text-amber-950 shadow-xs border border-amber-200/60'
                : 'text-amber-800/70 hover:text-amber-950 hover:bg-amber-100/50'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-emerald-600" />
            <span>30秒の深呼吸</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stretch')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'stretch'
                ? 'bg-white text-amber-950 shadow-xs border border-amber-200/60'
                : 'text-amber-800/70 hover:text-amber-950 hover:bg-amber-100/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>プチ肩こりほぐし</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'talk' && (
            <>
              {/* Character Stage */}
              <div className="relative bg-gradient-to-b from-white to-amber-50/70 rounded-3xl p-6 border border-amber-200/70 shadow-xs text-center space-y-4">
                {/* Floating Hearts */}
                {heartsCount > 0 && (
                  <div className="absolute top-3 right-4 flex items-center gap-1 text-xs font-black text-rose-500 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    <Heart className="w-3.5 h-3.5 fill-rose-500 animate-pulse" />
                    <span>なでなで x {heartsCount}</span>
                  </div>
                )}

                {/* Animated Mascot */}
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={handlePet}
                    className={`text-6xl sm:text-7xl select-none cursor-pointer transition-transform duration-300 relative ${
                      isPetting ? 'scale-125 rotate-6' : 'hover:scale-110 active:scale-95'
                    }`}
                    title="クリックしてなでる！"
                  >
                    {currentMsg.avatar}
                  </button>

                  {isPetting && (
                    <div className="absolute -top-4 -right-2 text-rose-500 text-lg font-bold animate-bounce select-none">
                      💕 ゴロゴロ…
                    </div>
                  )}

                  {selectedTreat && (
                    <div className="absolute -bottom-2 -right-3 text-2xl animate-bounce select-none">
                      ✨
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-amber-800 flex items-center justify-center gap-1.5">
                    <span>{currentMsg.character}</span>
                  </div>

                  {/* Bubble Message */}
                  <div className="relative bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs text-left mt-3">
                    <p className="text-sm font-bold text-slate-800 leading-relaxed">
                      「{currentMsg.text}」
                    </p>
                    <p className="text-xs text-slate-500 mt-2 border-t border-amber-100 pt-2 flex items-center gap-1">
                      <span>💡</span>
                      <span>{currentMsg.sub}</span>
                    </p>
                  </div>
                </div>

                {/* Pet & Next message buttons */}
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handlePet}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Heart className="w-3.5 h-3.5 fill-rose-400" />
                    <span>なでる（タップ）</span>
                  </button>

                  <button
                    type="button"
                    onClick={nextMessage}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>別の言葉を聞く</span>
                  </button>
                </div>
              </div>

              {/* Treats / Coffee Break */}
              <div className="bg-white/80 p-4 rounded-2xl border border-amber-200/60 space-y-2.5">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-amber-700" />
                  ほっと一服、差し入れをどうぞ:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TREATS.map((treat) => (
                    <button
                      key={treat.id}
                      type="button"
                      onClick={() => handleGiveTreat(treat.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        selectedTreat === treat.id
                          ? 'bg-amber-100 border-amber-400 scale-105 shadow-xs'
                          : 'bg-amber-50/40 hover:bg-amber-100/50 border-amber-200/60 text-slate-700'
                      }`}
                    >
                      <span className="text-2xl">{treat.icon}</span>
                      <span className="text-[11px] font-bold text-slate-800">{treat.name}</span>
                    </button>
                  ))}
                </div>

                {selectedTreat && (
                  <div className="p-2.5 bg-amber-100/80 rounded-xl text-xs text-amber-900 font-bold text-center border border-amber-300 animate-in fade-in">
                    {TREATS.find(t => t.id === selectedTreat)?.effect}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'breath' && (
            <div className="bg-gradient-to-b from-white to-emerald-50/50 rounded-3xl p-6 border border-emerald-200/70 shadow-xs text-center space-y-5">
              <div>
                <h3 className="text-sm font-black text-emerald-950">
                  30秒のゆるふわマインドフル深呼吸
                </h3>
                <p className="text-xs text-emerald-800/80 mt-1">
                  息を整えると、脳に酸素が行き渡り、計算の疲れや緊張がすっと抜けます
                </p>
              </div>

              {/* Pulsing Breathing Circle */}
              <div className="py-8 flex flex-col items-center justify-center">
                <div
                  className={`w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-1000 select-none ${
                    breathPhase === 'inhale'
                      ? 'scale-125 bg-gradient-to-tr from-emerald-200 to-teal-100 border-4 border-emerald-400 ring-8 ring-emerald-100'
                      : breathPhase === 'hold'
                      ? 'scale-120 bg-gradient-to-tr from-amber-200 to-yellow-100 border-4 border-amber-400 ring-8 ring-amber-100'
                      : 'scale-90 bg-gradient-to-tr from-blue-100 to-indigo-100 border-4 border-blue-300 ring-4 ring-blue-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-700">
                    {breathPhase === 'inhale' && '🌿 鼻から吸って〜'}
                    {breathPhase === 'hold' && '✨ そのまま止めて〜'}
                    {breathPhase === 'exhale' && '🍃 口から吐いて〜'}
                  </span>
                  <span className="text-3xl font-black font-mono text-slate-800 mt-1">
                    {breathTimer}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">秒</span>
                </div>
              </div>

              <div className="bg-white/80 p-3.5 rounded-2xl border border-emerald-200/60 text-xs text-slate-600 leading-relaxed text-left">
                <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1">
                  <span>💡</span>
                  <span>深呼吸のコツ:</span>
                </div>
                <span>
                  お腹に手をあてて、下腹がふくらむのを意識しながらゆっくり。数字で固まった肩の力を下にストンと落としましょう。
                </span>
              </div>
            </div>
          )}

          {activeTab === 'stretch' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👀</span>
                  <h4 className="text-xs font-bold text-slate-900">
                    1. 目の疲れをリセット（ぎゅ〜・パッ運動）
                  </h4>
                </div>
                <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                  目をぎゅ〜っと5秒間強くつむってから、パッと大きく見開きます。これを3回繰り返すだけで、画面を見つめて凝り固まった目の奥の筋肉がほぐれます。
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🙆‍♀️</span>
                  <h4 className="text-xs font-bold text-slate-900">
                    2. 肩甲骨ぐるぐる体操（10秒）
                  </h4>
                </div>
                <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                  両手を肩の上にちょんと置き、肘で大きな円を描くように「前まわし5回」「後ろまわし5回」。背中がじんわり温かくなって血流がアップします！
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-amber-200/70 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍵</span>
                  <h4 className="text-xs font-bold text-slate-900">
                    3. お水を一杯ゆっくり飲む
                  </h4>
                </div>
                <p className="text-xs text-slate-600 pl-7 leading-relaxed">
                  集中していると喉の渇きを忘れがちです。常温の水か白湯を一口含むだけで、自律神経が整って心拍が落ち着きます。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-amber-100 flex items-center justify-between text-xs">
          <div className="text-[11px] text-amber-900/80 font-medium flex items-center gap-1">
            <span>🌸</span>
            <span>いつでもここに戻ってきて休んでくださいね</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
          >
            リフレッシュして戻る
          </button>
        </div>

      </div>
    </div>
  );
};
