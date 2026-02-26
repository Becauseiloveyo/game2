import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, ChevronRight, Sparkles, Trophy, Star, Lock, Hammer, Hourglass, Dices, Store, Map, BookOpen, LogOut, User, Key, ShieldAlert, Settings, Copy, Download, CheckCircle2 } from 'lucide-react';

// --- 安全保护机制，防止预览环境中抛出 tailwind 未定义的全局报错 ---
if (typeof window !== 'undefined') {
  window.tailwind = window.tailwind || {};
  window.tailwind.config = window.tailwind.config || {};
}

// ==========================================
// --- 本地化游戏引擎：纯脱机高速缓存 & 存档系统 ---
// ==========================================
const LOCAL_DB_KEY = 'crystal_link_local_db';
const LOCAL_SESSION_KEY = 'crystal_link_session';

const getLocalDB = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_DB_KEY) || '{}');
  } catch (e) {
    return {};
  }
};

const saveLocalDB = (db) => {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
};

// 动画延迟辅助
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 关卡数据配置 (15关) ---
const LEVELS = [
  { level: 1, name: "星尘初晓", target: 1000, moves: 20, colors: 5, story: "你的飞船在未知的星云中苏醒，能量核心黯淡无光。收集周围散落的低阶星尘，重新点燃主引擎吧。" },
  { level: 2, name: "碎石地带", target: 1800, moves: 22, colors: 5, story: "航行刚刚开始，你驶入了一片密集的陨石带。这里的能量波动十分稳定，正好用来热身，储备更多的星辰之力。" },
  { level: 3, name: "能量跃迁", target: 2800, moves: 16, colors: 5, story: "警告：前方出现空间断层！你必须在极短的行动时间（步数减少）内引发多次连爆，才能获得足够的跃迁能量冲出这片区域。" },
  { level: 4, name: "紫晶迷雾", target: 3500, moves: 25, colors: 6, story: "飞船进入了神秘的暗物质迷雾。这里孕育着极其不稳定的紫色幽能（新增第6种宝石），能量构成变得更加复杂，请小心行事。" },
  { level: 5, name: "双星伴月", target: 4500, moves: 28, colors: 6, story: "两颗巨大的伴星引力场交叠，使得这片星域的晶体极为丰富。稳扎稳打，收集它们来强化你的星轨护盾。" },
  { level: 6, name: "流星骤雨", target: 6000, moves: 30, colors: 6, story: "紧急警报！一场极高密度的流星雨正在逼近。你需要在它们摧毁护盾前，转化足够的星光能量来张开偏导力场。" },
  { level: 7, name: "时空暗流", target: 7500, moves: 25, colors: 6, story: "这里的时空流速异常，你的行动次数受到了严重压制。请务必深思熟虑，寻找最完美的连锁反应来打破僵局。" },
  { level: 8, name: "琥珀星骸", target: 9000, moves: 35, colors: 6, story: "你发现了一片古老文明的战场遗迹，虚空中飘浮着凝结了几万年的琥珀色能量块。发掘它们，这是宇宙赐予的宝藏。" },
  { level: 9, name: "黑洞边缘", target: 11000, moves: 40, colors: 6, story: "强大的引力正在拉扯飞船！虽然引力场给你带来了更多操作的时间，但逃逸所需的能量也达到了惊人的数值。" },
  { level: 10, name: "星云之心", target: 13500, moves: 35, colors: 6, story: "终于抵达了这片星云的中心。极高浓度的能量正在坍缩，你必须展现出突破极限的技巧，才能在坍缩前收集到核心碎片。" },
  { level: 11, name: "光芒折射", target: 16000, moves: 40, colors: 6, story: "进入了一片由巨大水晶构成的星系，星光在这里折射出迷幻的色彩。你需要如行云流水般的连消，理顺这混乱的光学迷宫。" },
  { level: 12, name: "大师试炼", target: 19000, moves: 45, colors: 6, story: "来自古老星辰的低语在脑海中响起：‘只有真正掌握星空韵律的大师，才有资格窥探宇宙的终极奥秘。’ 证明你自己吧。" },
  { level: 13, name: "超新星前夕", target: 22000, moves: 40, colors: 6, story: "一颗年迈的恒星即将爆发，周围的能量达到了狂暴的临界点。步数有限，但机会无尽，你能从这场毁灭中攫取多少生机？" },
  { level: 14, name: "命运交汇", target: 26000, moves: 50, colors: 6, story: "所有星轨的汇聚点，宇宙洪荒之力的源头就在眼前。这是决定航向的巅峰对决，不容有丝毫闪失。释放你全部的智慧！" },
  { level: 15, name: "创世之光", target: 35000, moves: 55, colors: 6, story: "在这里，时间与空间失去了意义。将所有的星辰链接，释放那道足以重塑宇宙的创世之光。去吧，去点亮这片无垠的星空！" },
];

const BOARD_SIZE = 8;
const ANIMATION_DURATION = 300; 
const SHOP_PRICES = { hammer: 150, addMoves: 200, shuffle: 250 };

const Gem = ({ type, isSelected, isTargeted }) => {
  let baseClasses = `w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] transition-transform duration-200 ${isSelected ? 'scale-110' : 'hover:scale-105'}`;
  if (isTargeted) baseClasses += ' animate-pulse filter brightness-150 drop-shadow-[0_0_15px_rgba(248,113,113,1)]';

  switch (type) {
    case 0: return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="50,5 95,50 50,95 5,50" fill="url(#grad-red)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/><defs><linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff4b8b" /><stop offset="100%" stopColor="#ba003d" /></linearGradient></defs><polygon points="50,15 80,50 50,85 20,50" fill="rgba(255,255,255,0.15)"/></svg>;
    case 1: return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#grad-blue)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/><defs><linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4bb4ff" /><stop offset="100%" stopColor="#0047ba" /></linearGradient></defs><polygon points="50,20 75,35 75,65 50,80 25,65 25,35" fill="rgba(255,255,255,0.15)"/></svg>;
    case 2: return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="25,5 75,5 95,25 95,75 75,95 25,95 5,75 5,25" fill="url(#grad-green)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/><defs><linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4bff85" /><stop offset="100%" stopColor="#008a30" /></linearGradient></defs><rect x="25" y="25" width="50" height="50" fill="rgba(255,255,255,0.15)"/></svg>;
    case 3: return <svg viewBox="0 0 100 100" className={baseClasses}><polygon points="50,5 61,35 95,35 67,55 78,85 50,65 22,85 33,55 5,35 39,35" fill="url(#grad-yellow)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/><defs><linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ffdb4b" /><stop offset="100%" stopColor="#ba7600" /></linearGradient></defs><circle cx="50" cy="50" r="15" fill="rgba(255,255,255,0.2)"/></svg>;
    case 4: return <svg viewBox="0 0 100 100" className={baseClasses}><circle cx="50" cy="50" r="45" fill="url(#grad-purple)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/><defs><radialGradient id="grad-purple" cx="30%" cy="30%" r="70%"><stop offset="0%" stopColor="#d17aff" /><stop offset="100%" stopColor="#55009c" /></radialGradient></defs><circle cx="50" cy="50" r="30" fill="rgba(255,255,255,0.1)"/><path d="M 30 30 Q 50 10 70 30" stroke="rgba(255,255,255,0.5)" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>;
    case 5: return <svg viewBox="0 0 100 100" className={baseClasses}><path d="M 50 5 C 90 40 95 90 50 95 C 5 90 10 40 50 5" fill="url(#grad-orange)" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/><defs><linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff9f4b" /><stop offset="100%" stopColor="#ba4100" /></linearGradient></defs><path d="M 35 35 Q 50 15 65 35" stroke="rgba(255,255,255,0.4)" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>;
    default: return null;
  }
};

const DynamicBackground = ({ gameState }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let stars = [];
    let meteors = [];
    let animationFrameId;

    let meteorFreq = 0.02; let starSpeed = 0.2; let meteorColor = '255, 255, 255'; let starCount = 200;
    if (gameState === 'start' || gameState === 'auth') {
      meteorFreq = 0.05; starSpeed = 0.4; meteorColor = '220, 200, 255'; starCount = 250;
    } else if (gameState === 'levels' || gameState === 'level_intro') {
      meteorFreq = 0.02; starSpeed = 0.2; meteorColor = '200, 255, 255'; starCount = 200;
    } else if (gameState === 'shop') {
      meteorFreq = 0.01; starSpeed = 0.1; meteorColor = '255, 220, 100'; starCount = 150;
    } else {
      meteorFreq = 0.003; starSpeed = 0.05; meteorColor = '255, 255, 255'; starCount = 100;
    }

    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; initStars(); };
    const initStars = () => {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({ x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.5, opacity: Math.random(), speed: (Math.random() * starSpeed) + 0.05, twinkleSpeed: 0.01 + Math.random() * 0.02 });
      }
    };
    const drawStars = () => {
      stars.forEach(star => {
        star.opacity += star.twinkleSpeed;
        if (star.opacity > 1 || star.opacity < 0.1) star.twinkleSpeed *= -1;
        star.y -= star.speed;
        if (star.y < 0) { star.y = height; star.x = Math.random() * width; }
        ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, star.opacity))})`; ctx.fill();
      });
    };
    const drawMeteors = () => {
      if (Math.random() < meteorFreq) meteors.push({ x: Math.random() * width * 1.5, y: -50, length: 60 + Math.random() * 150, speed: 15 + Math.random() * 15, angle: Math.PI / 4 + (Math.random() * 0.1 - 0.05), opacity: 1 });
      for (let i = meteors.length - 1; i >= 0; i--) {
        let m = meteors[i];
        m.x -= m.speed * Math.cos(m.angle); m.y += m.speed * Math.sin(m.angle); m.opacity -= 0.015;
        if (m.opacity <= 0 || m.y > height + m.length) { meteors.splice(i, 1); continue; }
        const endX = m.x + m.length * Math.cos(m.angle); const endY = m.y - m.length * Math.sin(m.angle);
        const gradient = ctx.createLinearGradient(m.x, m.y, endX, endY);
        gradient.addColorStop(0, `rgba(${meteorColor}, ${m.opacity})`); gradient.addColorStop(1, `rgba(${meteorColor}, 0)`);
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(endX, endY); ctx.strokeStyle = gradient; ctx.lineWidth = 1.5; ctx.stroke();
      }
    };

    const animate = () => { ctx.clearRect(0, 0, width, height); drawStars(); drawMeteors(); animationFrameId = requestAnimationFrame(animate); };
    window.addEventListener('resize', resize); resize(); animate();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId); };
  }, [gameState]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      <div className={`absolute inset-0 bg-gradient-to-br from-[#130b2e] via-[#240a36] to-black transition-opacity duration-1000 ${['start','auth'].includes(gameState) ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute inset-0 bg-gradient-to-tr from-[#0b242e] via-[#0a1e36] to-black transition-opacity duration-1000 ${['levels','level_intro'].includes(gameState) ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute inset-0 bg-gradient-to-bl from-[#2e1c0b] via-[#360a1e] to-black transition-opacity duration-1000 ${gameState === 'shop' ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`absolute inset-0 bg-gradient-to-b from-[#0a0f1c] via-black to-[#05070a] transition-opacity duration-1000 ${['playing', 'won', 'lost', 'completed'].includes(gameState) ? 'opacity-100' : 'opacity-0'}`} />

      <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] transition-colors duration-1000 ${['start','auth'].includes(gameState) ? 'bg-purple-600/30' : (gameState === 'levels' || gameState === 'level_intro') ? 'bg-cyan-600/20' : gameState === 'shop' ? 'bg-amber-600/20' : 'bg-indigo-600/10'}`} />
      <div className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] transition-colors duration-1000 ${['start','auth'].includes(gameState) ? 'bg-pink-600/20' : (gameState === 'levels' || gameState === 'level_intro') ? 'bg-blue-600/20' : gameState === 'shop' ? 'bg-rose-600/20' : 'bg-slate-600/10'}`} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-90 mix-blend-screen" />
    </div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState('auth'); 
  
  // --- Auth 状态 ---
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // --- 存档系统 ---
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [stardust, setStardust] = useState(300); 
  const [inventory, setInventory] = useState({ hammer: 1, addMoves: 1, shuffle: 1 });
  const [levelRecords, setLevelRecords] = useState({});

  // --- 游戏内部状态 ---
  const [currentLevel, setCurrentLevel] = useState(1);
  const [playMode, setPlayMode] = useState(1); 
  const [propsUsedCount, setPropsUsedCount] = useState(0); 
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState([]);
  
  const [activeProp, setActiveProp] = useState(null); 
  const [propEffect, setPropEffect] = useState(null);
  const [lastEarnedInfo, setLastEarnedInfo] = useState({ stars: 0, dust: 0, newStar: false }); 

  // 系统设置与存档管理
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const [pieces, setPiecesState] = useState([]);
  const piecesRef = useRef([]);
  const setPieces = useCallback((newPieces) => {
    let evaluatedPieces = typeof newPieces === 'function' ? newPieces(piecesRef.current) : newPieces;
    piecesRef.current = evaluatedPieces;
    setPiecesState(evaluatedPieces);
  }, []);

  const [score, setScoreState] = useState(0);
  const scoreRef = useRef(0);
  const setScore = useCallback((val) => {
    let newVal = typeof val === 'function' ? val(scoreRef.current) : val;
    scoreRef.current = newVal;
    setScoreState(newVal);
  }, []);

  const [moves, setMovesState] = useState(0);
  const movesRef = useRef(0);
  const setMoves = useCallback((val) => {
    let newVal = typeof val === 'function' ? val(movesRef.current) : val;
    movesRef.current = newVal;
    setMovesState(newVal);
  }, []);

  // --- 本地环境启动校验 ---
  useEffect(() => {
    const savedSession = localStorage.getItem(LOCAL_SESSION_KEY);
    if (savedSession) {
      setUser(savedSession);
      setGameState('start');
    }
  }, []);

  // --- 加载当前用户存档 ---
  useEffect(() => {
    if (!user) return;
    const db = getLocalDB();
    const userData = db[user]?.saveData;
    
    if (userData) {
      setStardust(userData.stardust ?? 300);
      setUnlockedLevel(userData.unlockedLevel ?? 1);
      setInventory(userData.inventory ?? { hammer: 1, addMoves: 1, shuffle: 1 });
      setLevelRecords(userData.levelRecords ?? {});
    } else {
      // 游客或新账号默认数据
      setStardust(300);
      setUnlockedLevel(1);
      setInventory({ hammer: 1, addMoves: 1, shuffle: 1 });
      setLevelRecords({});
    }
  }, [user]);

  // --- 保存进度到本地缓存 ---
  const saveProgressToLocal = async (newData) => {
    if (!user) return;
    const db = getLocalDB();
    if (!db[user]) {
       db[user] = { password: 'guest', saveData: {} }; 
    }
    db[user].saveData = { ...db[user].saveData, ...newData };
    saveLocalDB(db);
  };

  // --- 存档导出与导入功能 ---
  const handleExportSave = () => {
    const db = getLocalDB();
    const userData = db[user];
    if (userData) {
      try {
        const rawString = encodeURIComponent(JSON.stringify(userData.saveData));
        const code = 'CRYSTAL_' + btoa(rawString);
        
        const el = document.createElement('textarea');
        el.value = code;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      } catch(e) {
        alert("导出失败，设备不支持");
      }
    }
  };

  const handleImportSave = () => {
    if (!importCode || !importCode.startsWith('CRYSTAL_')) {
      alert('无效的存档代码！请确保代码以 CRYSTAL_ 开头。');
      return;
    }
    try {
      const base64Str = importCode.replace('CRYSTAL_', '');
      const jsonStr = decodeURIComponent(atob(base64Str));
      const parsedData = JSON.parse(jsonStr);
      
      if (parsedData.stardust !== undefined && parsedData.unlockedLevel !== undefined) {
        saveProgressToLocal(parsedData);
        setStardust(parsedData.stardust);
        setUnlockedLevel(parsedData.unlockedLevel);
        setInventory(parsedData.inventory || { hammer: 1, addMoves: 1, shuffle: 1 });
        setLevelRecords(parsedData.levelRecords || {});
        
        setIsImporting(false);
        setImportCode('');
        alert('档案读取成功！您的星轨进度已恢复。');
        setShowSettingsModal(false);
      } else {
        alert('存档数据损坏或不完整。');
      }
    } catch(e) {
      alert('解析存档失败，请检查代码是否复制完整。');
    }
  };

  // --- 纯本地认证交互 (无网络延迟，极速秒连) ---
  const handleAuthAction = (e) => {
    e.preventDefault(); 
    setAuthError(''); 
    setIsAuthLoading(true);

    const db = getLocalDB();

    if (authMode === 'register') {
      if (email.length < 2) {
        setAuthError('指挥官代号过短');
      } else if (password.length < 4) {
        setAuthError('本地安全码太弱，请至少输入4位');
      } else if (db[email]) {
        setAuthError('该代号已被注册，请直接选择该档案登录');
      } else {
        db[email] = { password: password, saveData: { stardust: 300, unlockedLevel: 1, inventory: { hammer: 1, addMoves: 1, shuffle: 1 }, levelRecords: {} } };
        saveLocalDB(db);
        localStorage.setItem(LOCAL_SESSION_KEY, email);
        setUser(email);
        setGameState('start');
      }
    } else {
      if (!db[email]) {
        setAuthError('查无此档案，请先建立本地档案');
      } else if (db[email].password !== password) {
        setAuthError('安全码错误，请重新输入');
      } else {
        localStorage.setItem(LOCAL_SESSION_KEY, email);
        setUser(email);
        setGameState('start');
      }
    }
    setIsAuthLoading(false);
  };

  const handleGuestLogin = () => {
    setIsAuthLoading(true); setAuthError('');
    const guestId = '游客_' + Math.floor(Math.random() * 10000);
    const db = getLocalDB();
    db[guestId] = { password: 'guest', saveData: { stardust: 300, unlockedLevel: 1, inventory: { hammer: 1, addMoves: 1, shuffle: 1 }, levelRecords: {} } };
    saveLocalDB(db);
    localStorage.setItem(LOCAL_SESSION_KEY, guestId);
    setUser(guestId);
    setGameState('start');
    setIsAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    setUser(null);
    setShowSettingsModal(false);
    setGameState('auth');
  }

  // --- 游戏主逻辑 ---
  const initBoard = (levelData) => {
    let initialPieces = []; let idCounter = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        let type; let hasMatch = true;
        while (hasMatch) {
          type = Math.floor(Math.random() * levelData.colors);
          const matchH = c >= 2 && initialPieces.find(p => p.row === r && p.col === c - 1)?.type === type && initialPieces.find(p => p.row === r && p.col === c - 2)?.type === type;
          const matchV = r >= 2 && initialPieces.find(p => p.row === r - 1 && p.col === c)?.type === type && initialPieces.find(p => p.row === r - 2 && p.col === c)?.type === type;
          if (!matchH && !matchV) hasMatch = false;
        }
        initialPieces.push({ id: `init-${idCounter++}`, type, row: r, col: c, isRemoving: false });
      }
    }
    setPieces(initialPieces);
  };

  const prepareLevel = (levelIndex) => { setCurrentLevel(levelIndex); setGameState('level_intro'); };

  const startGameWithMode = (mode) => {
    const levelData = LEVELS[currentLevel - 1];
    setPlayMode(mode);
    setPropsUsedCount(0); 
    setScore(0);
    setMoves(levelData.moves);
    initBoard(levelData);
    setGameState('playing');
    setSelectedPiece(null);
    setIsAnimating(false);
    setActiveProp(null);
    setPropEffect(null);
  };

  const findMatches = (currentBoard) => {
    let matchedIds = new Set();
    const grid = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    currentBoard.forEach(p => { if (!p.isRemoving) grid[p.row][p.col] = p; });

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE - 2; c++) {
        const p1 = grid[r][c], p2 = grid[r][c+1], p3 = grid[r][c+2];
        if (p1 && p2 && p3 && p1.type === p2.type && p2.type === p3.type) {
          matchedIds.add(p1.id).add(p2.id).add(p3.id);
          let i = 3; while (c + i < BOARD_SIZE && grid[r][c+i] && grid[r][c+i].type === p1.type) { matchedIds.add(grid[r][c+i].id); i++; }
        }
      }
    }
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r < BOARD_SIZE - 2; r++) {
        const p1 = grid[r][c], p2 = grid[r+1][c], p3 = grid[r+2][c];
        if (p1 && p2 && p3 && p1.type === p2.type && p2.type === p3.type) {
          matchedIds.add(p1.id).add(p2.id).add(p3.id);
          let i = 3; while (r + i < BOARD_SIZE && grid[r+i][c] && grid[r+i][c].type === p1.type) { matchedIds.add(grid[r+i][c].id); i++; }
        }
      }
    }
    return Array.from(matchedIds);
  };

  const performDrop = async (currentBoard) => {
    let piecesToKeep = [...currentBoard]; let piecesAtStart = []; let finalPieces = []; let newIdCounter = Date.now();
    const levelColors = LEVELS[currentLevel - 1].colors;
    const grid = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    piecesToKeep.forEach(p => grid[p.row][p.col] = p);

    for (let col = 0; col < BOARD_SIZE; col++) {
      let emptySlots = 0;
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (!grid[row][col]) { emptySlots++; } 
        else if (emptySlots > 0) {
          let p = grid[row][col]; let updatedP = { ...p, row: p.row + emptySlots };
          grid[row + emptySlots][col] = updatedP; grid[row][col] = null; finalPieces.push(updatedP);
        } else { finalPieces.push(grid[row][col]); }
      }
      for (let i = 0; i < emptySlots; i++) {
        const targetRow = emptySlots - 1 - i; const startRow = targetRow - emptySlots - 1;
        const newPiece = { id: `new-${newIdCounter++}-${col}-${i}`, type: Math.floor(Math.random() * levelColors), row: targetRow, col, isRemoving: false };
        piecesAtStart.push({ ...newPiece, row: startRow }); finalPieces.push(newPiece);
      }
    }

    const step1Pieces = finalPieces.map(p => piecesAtStart.find(sp => sp.id === p.id) || p);
    setPieces(step1Pieces);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    setPieces(finalPieces); return finalPieces;
  };

  const processMatchesChain = async (currentBoard, matchedIds, combo = 1) => {
    const removingBoard = currentBoard.map(p => matchedIds.includes(p.id) ? { ...p, isRemoving: true } : p);
    setPieces(removingBoard);
    
    const points = matchedIds.length * 10 * combo; setScore(s => s + points);
    let word = null;
    if (combo >= 4) word = "Godlike!"; else if (combo === 3) word = "Unbelievable!"; else if (combo === 2) word = "Excellent!"; else if (matchedIds.length >= 5) word = "Amazing!"; else if (matchedIds.length === 4) word = "Good!";
    
    if (word) {
      const matchedPieces = currentBoard.filter(p => matchedIds.includes(p.id));
      if (matchedPieces.length > 0) {
        const centerRow = matchedPieces.reduce((sum, p) => sum + p.row, 0) / matchedPieces.length;
        const centerCol = matchedPieces.reduce((sum, p) => sum + p.col, 0) / matchedPieces.length;
        const textId = Date.now() + Math.random();
        setFloatingTexts(prev => [...prev, { id: textId, text: word, row: centerRow, col: centerCol }]);
        setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== textId)), 1200);
      }
    }

    await sleep(ANIMATION_DURATION);
    const droppedBoard = await performDrop(removingBoard.filter(p => !p.isRemoving));
    await sleep(ANIMATION_DURATION + 100);

    const newMatches = findMatches(droppedBoard);
    if (newMatches.length > 0) await processMatchesChain(droppedBoard, newMatches, combo + 1);
    else { setIsAnimating(false); checkWinLoss(); }
  };

  const isPropDisabled = (propType) => {
    if (playMode === 3) return true; 
    if (playMode === 2 && propsUsedCount >= 2) return true; 
    if (inventory[propType] <= 0) return true; 
    return false;
  };

  const handlePieceClick = async (piece) => {
    if (isAnimating || gameState !== 'playing') return;

    if (activeProp === 'hammer') {
      setIsAnimating(true);
      setActiveProp(null);
      setPropsUsedCount(prev => prev + 1); 

      const newInventory = { ...inventory, hammer: inventory.hammer - 1 };
      setInventory(newInventory);
      saveProgressToLocal({ inventory: newInventory });

      setPropEffect({ type: 'hammer', row: piece.row, col: piece.col });
      await sleep(500); 
      setPropEffect(null);

      const newPieces = piecesRef.current.map(p => p.id === piece.id ? { ...p, isRemoving: true } : p);
      setPieces(newPieces);
      await sleep(ANIMATION_DURATION);
      const dropped = await performDrop(newPieces.filter(p => !p.isRemoving));
      await sleep(ANIMATION_DURATION + 100);
      const matches = findMatches(dropped);
      if (matches.length > 0) await processMatchesChain(dropped, matches, 1);
      else setIsAnimating(false);
      checkWinLoss();
      return;
    }

    if (!selectedPiece) { setSelectedPiece(piece); return; }
    if (selectedPiece.id === piece.id) { setSelectedPiece(null); return; }

    const isAdjacent = (Math.abs(selectedPiece.row - piece.row) === 1 && selectedPiece.col === piece.col) || (Math.abs(selectedPiece.col - piece.col) === 1 && selectedPiece.row === piece.row);
    if (!isAdjacent) { setSelectedPiece(piece); return; }

    setIsAnimating(true); setSelectedPiece(null);
    const swappedBoard = piecesRef.current.map(p => {
      if (p.id === selectedPiece.id) return { ...p, row: piece.row, col: piece.col };
      if (p.id === piece.id) return { ...p, row: selectedPiece.row, col: selectedPiece.col };
      return p;
    });
    setPieces(swappedBoard);
    await sleep(ANIMATION_DURATION);

    const matches = findMatches(swappedBoard);
    if (matches.length > 0) {
      setMoves(m => m - 1); await processMatchesChain(swappedBoard, matches, 1);
    } else {
      const revertedBoard = piecesRef.current.map(p => {
        if (p.id === selectedPiece.id) return { ...p, row: selectedPiece.row, col: selectedPiece.col };
        if (p.id === piece.id) return { ...p, row: piece.row, col: piece.col };
        return p;
      });
      setPieces(revertedBoard);
      await sleep(ANIMATION_DURATION); setIsAnimating(false);
    }
  };

  const useProp = async (propType) => {
    if (isAnimating || isPropDisabled(propType)) return;

    if (propType === 'hammer') {
      setActiveProp(activeProp === 'hammer' ? null : 'hammer');
    } else if (propType === 'addMoves') {
      setIsAnimating(true);
      setPropsUsedCount(prev => prev + 1); 

      const newInventory = { ...inventory, addMoves: inventory.addMoves - 1 };
      setInventory(newInventory);
      saveProgressToLocal({ inventory: newInventory });

      setPropEffect({ type: 'hourglass' });
      await sleep(600);
      setPropEffect(null);
      
      setMoves(m => m + 5);
      setFloatingTexts(prev => [...prev, { id: Date.now(), text: "+5 步数!", row: 3, col: 3.5 }]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.text !== "+5 步数!")), 1200);
      setIsAnimating(false);

    } else if (propType === 'shuffle') {
      setIsAnimating(true);
      setPropsUsedCount(prev => prev + 1); 

      const newInventory = { ...inventory, shuffle: inventory.shuffle - 1 };
      setInventory(newInventory);
      saveProgressToLocal({ inventory: newInventory });

      setPropEffect({ type: 'shuffle' });
      await sleep(500); 
      
      const levelColors = LEVELS[currentLevel - 1].colors;
      const shuffledBoard = piecesRef.current.map(p => ({ ...p, type: Math.floor(Math.random() * levelColors) }));
      setPieces(shuffledBoard);
      
      await sleep(500); 
      setPropEffect(null);

      const matches = findMatches(shuffledBoard);
      if (matches.length > 0) await processMatchesChain(shuffledBoard, matches, 1);
      else setIsAnimating(false);
    }
  };

  const checkWinLoss = () => {
    const currentScore = scoreRef.current;
    const currentMoves = movesRef.current;
    const target = LEVELS[currentLevel - 1].target;

    if (currentScore >= target) {
      const currentRecordStars = levelRecords[currentLevel]?.stars || 0;
      let newStarAchieved = false;
      let finalStars = currentRecordStars;

      if (playMode > currentRecordStars) {
        finalStars = playMode;
        newStarAchieved = true;
      }
      
      const baseDust = playMode === 1 ? 50 : playMode === 2 ? 100 : 200;
      const scoreBonus = Math.floor((currentScore - target) / 40);
      const earnedDust = baseDust + scoreBonus;
      
      const newDust = stardust + earnedDust;
      const newUnlockedLevel = (currentLevel === unlockedLevel && unlockedLevel < LEVELS.length) ? unlockedLevel + 1 : unlockedLevel;
      const newRecords = { ...levelRecords, [currentLevel]: { stars: finalStars, score: Math.max(currentScore, levelRecords[currentLevel]?.score || 0) } };

      setStardust(newDust); setUnlockedLevel(newUnlockedLevel); setLevelRecords(newRecords);
      setLastEarnedInfo({ stars: finalStars, dust: earnedDust, newStar: newStarAchieved });
      saveProgressToLocal({ stardust: newDust, unlockedLevel: newUnlockedLevel, levelRecords: newRecords });

      if (currentLevel === LEVELS.length && finalStars === 3) setGameState('completed');
      else setGameState('won');

    } else if (currentMoves <= 0) {
      setGameState('lost');
    }
  };

  const buyItem = (item) => {
    const price = SHOP_PRICES[item];
    if (stardust >= price) {
      const newDust = stardust - price;
      const newInventory = { ...inventory, [item]: inventory[item] + 1 };
      setStardust(newDust); setInventory(newInventory);
      saveProgressToLocal({ stardust: newDust, inventory: newInventory });
    }
  };

  // --- UI 组件 ---
  const renderProgressBar = () => {
    const target = LEVELS[currentLevel - 1]?.target || 1;
    const percentage = Math.min(100, (score / target) * 100);
    return (
      <div className="w-full bg-slate-900/50 rounded-full h-4 backdrop-blur-sm border border-white/10 overflow-hidden relative mt-2">
        <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 transition-all duration-700 ease-out" style={{ width: `${percentage}%` }} />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 drop-shadow-md">{score} / {target}</div>
      </div>
    );
  };

  const TopBar = ({ title, onBack, showStardust = true, showSettings = false }) => (
    <div className="fixed top-0 left-0 w-full flex justify-between items-center p-4 md:px-8 md:py-6 z-40 pointer-events-none">
      <div className="w-24 md:w-32 flex justify-start pointer-events-auto">
        {onBack ? (
          <button onClick={onBack} className="p-2 md:p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition active:scale-95"><ChevronRight className="w-6 h-6 md:w-7 md:h-7 rotate-180" /></button>
        ) : showSettings ? (
          <button onClick={() => {setShowSettingsModal(true); setIsImporting(false); setImportCode('');}} className="p-2 md:p-3 bg-white/10 backdrop-blur-md rounded-full text-white/70 hover:text-white hover:bg-white/20 transition active:scale-95 shadow-lg" title="档案与设置"><Settings className="w-5 h-5 md:w-6 md:h-6" /></button>
        ) : <div className="w-10"></div>}
      </div>
      
      <div className="flex-1 flex justify-center pointer-events-auto">
        {title && <h2 className="text-xl md:text-2xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200 whitespace-nowrap">{title}</h2>}
      </div>
      
      <div className="w-24 md:w-32 flex justify-end pointer-events-auto">
        {showStardust ? (
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 backdrop-blur-md shadow-lg"><Sparkles className="w-4 h-4 md:w-5 md:h-5 text-cyan-300" /><span className="font-bold text-cyan-100 md:text-lg">{stardust}</span></div>
        ) : <div className="w-10"></div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 overflow-hidden relative font-sans select-none">
      <DynamicBackground gameState={gameState} />

      {/* --- 本地档案创建/选择状态 --- */}
      {gameState === 'auth' && (
        <div className="z-10 flex flex-col items-center w-full max-w-sm animate-fade-in">
          <div className="relative mb-10 text-center">
            <Sparkles className="absolute -top-6 -right-6 w-8 h-8 text-yellow-400 animate-pulse" />
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-purple-300 to-pink-300 drop-shadow-md tracking-wider">星际通行证</h1>
            <p className="text-blue-200 mt-2 tracking-[0.2em] text-sm font-light flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> 单机模式：进度安全保存在本地</p>
          </div>
          <form onSubmit={handleAuthAction} className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            {authError && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">{authError}</div>}
            
            <div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" /><input type="text" required value={email} onChange={e => setEmail(e.target.value)} placeholder="指挥官代号 (本地账号)" className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 transition-colors" /></div>
            <div className="relative"><Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" /><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="本地安全码 (密码)" className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 transition-colors" /></div>
            
            <button type="submit" disabled={isAuthLoading} className="w-full mt-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/30">
              {authMode === 'login' ? '选 择 档 案' : '建 立 新 档 案'}
            </button>
            <div className="flex items-center justify-between mt-2 text-sm text-white/60">
              <button type="button" onClick={() => setAuthMode(m => m === 'login' ? 'register' : 'login')} className="hover:text-cyan-300 transition-colors">{authMode === 'login' ? '首次访问？建立档案' : '已有档案？选择档案'}</button>
              <button type="button" onClick={handleGuestLogin} className="flex items-center gap-1 hover:text-white transition-colors"><User className="w-4 h-4" /> 快速游客</button>
            </div>
          </form>
        </div>
      )}

      {/* --- 主页状态 --- */}
      {gameState === 'start' && (
        <div className="z-10 flex flex-col items-center w-full animate-fade-in">
          {/* 去除主页顶部的文字，保留星尘和设置按钮 */}
          <TopBar title="" showSettings={true} />
          
          <div className="relative mb-16 mt-20">
            <Sparkles className="absolute -top-6 -right-6 w-8 h-8 text-yellow-400 animate-pulse" />
            <h1 className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-purple-300 to-pink-300 drop-shadow-[0_0_20px_rgba(236,72,153,0.3)] tracking-wider text-center">星空晶莹</h1>
            <p className="text-center text-blue-200 mt-3 tracking-[0.4em] text-lg font-light uppercase">Crystal Link</p>
          </div>
          <div className="flex flex-col gap-6 w-full max-w-xs">
            <button onClick={() => setGameState('levels')} className="relative group w-full outline-none">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-300 to-pink-400 rounded-full opacity-50 group-hover:opacity-80"></div>
              <div className="relative flex items-center justify-center gap-3 px-8 py-4 bg-black/50 backdrop-blur-xl border border-white/20 rounded-full hover:bg-black/30 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <Map className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" /> <span className="font-bold text-xl tracking-widest text-white">星域航线</span>
              </div>
            </button>
            <button onClick={() => setGameState('shop')} className="relative group w-full">
              <div className="relative flex items-center justify-center gap-3 px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 transition-all active:scale-95">
                <Store className="w-5 h-5 text-cyan-300" /> <span className="font-medium text-lg tracking-widest text-cyan-100">星尘补给站</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* --- 关卡选择状态 --- */}
      {gameState === 'levels' && (
        <div className="z-10 flex flex-col items-center w-full h-full max-w-[420px] animate-slide-up pt-16 pb-8">
          <TopBar title="选择星域" onBack={() => setGameState('start')} />
          <div className="w-full flex-1 overflow-y-auto mt-4 px-2 pb-10 hide-scrollbar grid grid-cols-3 gap-4 content-start">
            {LEVELS.map((levelData, idx) => {
              const isUnlocked = levelData.level <= unlockedLevel;
              const record = levelRecords[levelData.level];
              return (
                <button
                  key={idx}
                  onClick={() => isUnlocked && prepareLevel(levelData.level)}
                  className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all ${
                    isUnlocked ? 'bg-white/10 border-white/20 hover:bg-white/20 hover:scale-105 active:scale-95 shadow-lg' : 'bg-black/40 border-white/5 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-blue-200">{levelData.level}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map(star => (<Star key={star} className={`w-3 h-3 ${record?.stars >= star ? 'text-yellow-400 fill-current drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]' : 'text-white/20'}`} />))}
                      </div>
                    </>
                  ) : (<Lock className="w-8 h-8 text-white/30" />)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 剧情及模式选择状态 --- */}
      {gameState === 'level_intro' && (() => {
        const levelData = LEVELS[currentLevel - 1];
        const record = levelRecords[currentLevel];
        const starsUnlocked = record?.stars || 0;

        return (
          <div className="z-10 flex flex-col items-center w-full h-full max-w-[420px] animate-pop-in pt-16 px-4">
            <TopBar title="星域档案" onBack={() => setGameState('levels')} showStardust={false} />
            <div className="w-full flex-1 flex flex-col justify-center mt-2">
              <div className="relative w-full bg-slate-900/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20"><BookOpen className="w-6 h-6 text-cyan-300" /></div>
                  <div><h3 className="text-sm text-blue-200/80 tracking-widest uppercase">Level {levelData.level}</h3><h2 className="text-2xl font-black text-white tracking-wide">{levelData.name}</h2></div>
                </div>
                
                <p className="text-slate-300 text-sm leading-relaxed tracking-wide italic mb-4 min-h-[60px]">"{levelData.story}"</p>
                
                <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex justify-around mb-6">
                  <div className="flex flex-col items-center"><span className="text-[10px] text-white/50 uppercase tracking-widest mb-1">目标能量</span><span className="text-lg font-bold text-cyan-300">{levelData.target}</span></div>
                  <div className="w-px h-8 bg-white/10" /><div className="flex flex-col items-center"><span className="text-[10px] text-white/50 uppercase tracking-widest mb-1">行动步数</span><span className="text-lg font-bold text-rose-300">{levelData.moves}</span></div>
                </div>

                <div className="w-full h-px bg-white/10 mb-4" />
                <h3 className="text-xs text-white/50 tracking-widest uppercase mb-3 text-center">选择星轨协议</h3>

                <div className="flex flex-col gap-3 w-full">
                  {/* 模式 1: 巡航 (翠绿主题) */}
                  <button onClick={() => startGameWithMode(1)} className="group flex items-center justify-between p-4 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-xl border border-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.4)] transition-all active:scale-95">
                    <div className="text-left">
                      <span className="block font-bold text-lg text-emerald-300 group-hover:text-emerald-100 transition-colors">巡航协议</span>
                      <span className="text-xs text-emerald-300/80 tracking-wider mt-1 block">基础模式 | 可用道具</span>
                    </div>
                    <Star className={`w-6 h-6 ${starsUnlocked >= 1 ? 'text-yellow-400 fill-current drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-white/20'}`} />
                  </button>

                  {/* 模式 2: 跃迁 (海蓝主题) */}
                  <button onClick={() => startGameWithMode(2)} disabled={starsUnlocked < 1} className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${starsUnlocked >= 1 ? 'bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border-blue-500/50 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(96,165,250,0.4)] active:scale-95 cursor-pointer' : 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed'}`}>
                    <div className="text-left">
                      <span className={`block font-bold text-lg ${starsUnlocked >= 1 ? 'text-blue-300 group-hover:text-blue-100' : 'text-white/50'} transition-colors`}>跃迁指令</span>
                      <span className={`text-xs tracking-wider mt-1 block ${starsUnlocked >= 1 ? 'text-blue-300/80' : 'text-white/50'}`}>精英挑战 | 可用两次道具</span>
                    </div>
                    {starsUnlocked < 1 ? <Lock className="w-5 h-5 text-white/30"/> : <Star className={`w-6 h-6 ${starsUnlocked >= 2 ? 'text-yellow-400 fill-current drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-white/20'}`} />}
                  </button>

                  {/* 模式 3: 奇点绝境 (深红主题) */}
                  <button onClick={() => startGameWithMode(3)} disabled={starsUnlocked < 2} className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${starsUnlocked >= 2 ? 'bg-gradient-to-r from-rose-900/40 to-red-900/40 border-rose-500/50 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.5)] active:scale-95 cursor-pointer' : 'bg-black/40 border-white/5 opacity-50 cursor-not-allowed'}`}>
                    <div className="text-left">
                      <span className={`block font-bold text-lg ${starsUnlocked >= 2 ? 'text-rose-300 group-hover:text-rose-100' : 'text-white/50'} transition-colors`}>奇点绝境</span>
                      <span className={`text-xs tracking-wider mt-1 flex items-center gap-1 ${starsUnlocked >= 2 ? 'text-rose-300/80' : 'text-white/50'}`}><ShieldAlert className="w-3 h-3"/> 炼狱模式 | 不可用道具</span>
                    </div>
                    {starsUnlocked < 2 ? <Lock className="w-5 h-5 text-white/30"/> : <Star className={`w-6 h-6 ${starsUnlocked >= 3 ? 'text-yellow-400 fill-current drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-white/20'}`} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- 商店状态 --- */}
      {gameState === 'shop' && (
        <div className="z-10 flex flex-col items-center w-full h-full max-w-[420px] animate-fade-in pt-16">
          <TopBar title="星尘补给站" onBack={() => setGameState('start')} />
          <div className="w-full flex flex-col gap-4 mt-8 px-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30 text-red-300"><Hammer className="w-6 h-6" /></div>
                <div><h3 className="font-bold text-lg">星辰陨灭</h3><p className="text-xs text-white/50">红矮星射线击碎单体</p><p className="text-sm font-medium text-cyan-300 mt-1">拥有: {inventory.hammer}</p></div>
              </div>
              <button onClick={() => buyItem('hammer')} disabled={stardust < SHOP_PRICES.hammer} className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 rounded-full font-bold flex items-center gap-1 transition"><Sparkles className="w-3 h-3 text-cyan-300"/> {SHOP_PRICES.hammer}</button>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-300"><Hourglass className="w-6 h-6" /></div>
                <div><h3 className="font-bold text-lg">时空回溯</h3><p className="text-xs text-white/50">逆转时空增加5次行动</p><p className="text-sm font-medium text-cyan-300 mt-1">拥有: {inventory.addMoves}</p></div>
              </div>
              <button onClick={() => buyItem('addMoves')} disabled={stardust < SHOP_PRICES.addMoves} className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 rounded-full font-bold flex items-center gap-1 transition"><Sparkles className="w-3 h-3 text-cyan-300"/> {SHOP_PRICES.addMoves}</button>
            </div>
            <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30 text-purple-300"><Dices className="w-6 h-6" /></div>
                <div><h3 className="font-bold text-lg">星河重置</h3><p className="text-xs text-white/50">制造黑洞重新洗牌星轨</p><p className="text-sm font-medium text-cyan-300 mt-1">拥有: {inventory.shuffle}</p></div>
              </div>
              <button onClick={() => buyItem('shuffle')} disabled={stardust < SHOP_PRICES.shuffle} className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:hover:bg-white/10 rounded-full font-bold flex items-center gap-1 transition"><Sparkles className="w-3 h-3 text-cyan-300"/> {SHOP_PRICES.shuffle}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 游玩状态 --- */}
      {(gameState === 'playing' || gameState === 'won' || gameState === 'lost' || gameState === 'completed') && (
        <div className="w-full max-w-[420px] flex flex-col items-center z-10 animate-slide-up pt-4">
          <div className="w-full flex justify-between items-end px-2 mb-4">
            <button onClick={() => setGameState('levels')} className="p-2 md:p-3 bg-white/10 border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition mb-1">
               <ChevronRight className="w-5 h-5 md:w-6 md:h-6 rotate-180" />
            </button>
            <div className="flex flex-col items-center flex-1">
               <div className="text-xs text-blue-200/80 tracking-widest uppercase mb-1 flex items-center gap-1">
                 Lv.{currentLevel} 
                 <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${playMode === 3 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' : playMode === 2 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'}`}>
                    {playMode === 3 ? '绝境' : playMode === 2 ? '跃迁' : '巡航'}
                 </span>
               </div>
               <div className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-purple-300 drop-shadow-md">{score}</div>
            </div>
            <div className="flex flex-col items-center w-[60px]">
               <div className="text-[10px] text-white/50 tracking-wider uppercase mb-1">Moves</div>
               <div className={`text-3xl font-black drop-shadow-md ${moves <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>{moves}</div>
            </div>
          </div>
          
          <div className="w-full px-2 mb-6">{renderProgressBar()}</div>

          <div className={`relative w-full aspect-square bg-white/5 backdrop-blur-2xl border ${activeProp === 'hammer' ? 'border-red-400/50 shadow-[0_0_30px_rgba(248,113,113,0.3)]' : 'border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'} rounded-3xl p-2 overflow-hidden transition-all duration-300`}>
            
            {/* 道具全局特效渲染层 */}
            {propEffect?.type === 'hourglass' && (
               <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                 <div className="w-full h-full bg-blue-500/20 animate-time-ripple rounded-full" />
               </div>
            )}
            {propEffect?.type === 'shuffle' && (
               <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm animate-fade-in">
                 <div className="w-32 h-32 bg-purple-600/50 rounded-full blur-xl animate-vortex mix-blend-screen" />
                 <Dices className="absolute w-12 h-12 text-white animate-spin" style={{animationDuration: '0.5s'}}/>
               </div>
            )}

            <div className={`absolute inset-2 grid grid-cols-8 grid-rows-8 gap-0 opacity-20 pointer-events-none ${propEffect?.type === 'shuffle' ? 'animate-vortex-board' : ''}`}>
              {Array(64).fill(0).map((_, i) => (<div key={i} className="border-[0.5px] border-white/20 rounded-md m-[1px] bg-black/20" />))}
            </div>

            <div className={`absolute inset-2 ${propEffect?.type === 'shuffle' ? 'animate-vortex-board' : ''}`}>
              {pieces.map((piece) => {
                const isBeingHammered = propEffect?.type === 'hammer' && propEffect.row === piece.row && propEffect.col === piece.col;
                return (
                  <div key={piece.id} onClick={() => handlePieceClick(piece)} className={`absolute w-[12.5%] h-[12.5%] p-[1%] ${activeProp==='hammer'?'cursor-crosshair':'cursor-pointer'} ${piece.isRemoving ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} ${isBeingHammered ? 'animate-shatter' : ''}`} style={{ top: `${piece.row * 12.5}%`, left: `${piece.col * 12.5}%`, transition: `top ${ANIMATION_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1), left ${ANIMATION_DURATION}ms ease-out, transform 200ms ease-in, opacity 200ms ease-in`, zIndex: selectedPiece?.id === piece.id ? 20 : 10 }}>
                    <div className="w-full h-full flex items-center justify-center relative">
                      {selectedPiece?.id === piece.id && <div className="absolute inset-0 bg-white/30 rounded-full blur-md animate-pulse" />}
                      {isBeingHammered && <div className="absolute inset-0 bg-red-500 rounded-full blur-lg animate-ping" />}
                      <Gem type={piece.type} isSelected={selectedPiece?.id === piece.id} isTargeted={activeProp === 'hammer'} />
                    </div>
                  </div>
                )
              })}
              {floatingTexts.map(ft => (
                <div key={ft.id} className="absolute z-50 pointer-events-none flex items-center justify-center w-[12.5%] h-[12.5%] animate-float-up" style={{ top: `${ft.row * 12.5}%`, left: `${ft.col * 12.5}%` }}>
                  <span className="text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-t from-yellow-300 via-amber-200 to-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] whitespace-nowrap">{ft.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full flex justify-around mt-8 px-4 relative">
            {playMode === 3 && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-3xl mx-2 border border-rose-500/30">
                <span className="flex items-center gap-2 text-rose-300 font-bold tracking-widest drop-shadow-md"><ShieldAlert className="w-5 h-5"/> 奇点绝境：道具系统已锁定</span>
              </div>
            )}
            {playMode === 2 && (
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-blue-300/80 tracking-widest whitespace-nowrap bg-black/40 px-3 py-1 rounded-full border border-blue-500/30">
                本局可用道具: {2 - propsUsedCount} / 2
              </div>
            )}
            <button onClick={() => useProp('hammer')} disabled={isPropDisabled('hammer')} className={`relative p-4 rounded-2xl border backdrop-blur-md transition-all ${playMode === 3 ? 'opacity-20' : activeProp === 'hammer' ? 'bg-red-500/40 border-red-400 scale-110 shadow-[0_0_20px_rgba(248,113,113,0.5)]' : !isPropDisabled('hammer') ? 'bg-white/10 border-white/20 hover:bg-white/20 active:scale-95' : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'}`}>
              <Hammer className={`w-7 h-7 ${activeProp === 'hammer' ? 'text-red-200 animate-bounce' : 'text-red-300'}`} /><div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold">{inventory.hammer}</div>
            </button>
            <button onClick={() => useProp('addMoves')} disabled={isPropDisabled('addMoves')} className={`relative p-4 rounded-2xl border backdrop-blur-md transition-all ${playMode === 3 ? 'opacity-20' : !isPropDisabled('addMoves') ? 'bg-white/10 border-white/20 hover:bg-white/20 active:scale-95' : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'}`}>
              <Hourglass className="w-7 h-7 text-blue-300" /><div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold">{inventory.addMoves}</div>
            </button>
            <button onClick={() => useProp('shuffle')} disabled={isPropDisabled('shuffle')} className={`relative p-4 rounded-2xl border backdrop-blur-md transition-all ${playMode === 3 ? 'opacity-20' : !isPropDisabled('shuffle') ? 'bg-white/10 border-white/20 hover:bg-white/20 active:scale-95' : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'}`}>
              <Dices className="w-7 h-7 text-purple-300" /><div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold">{inventory.shuffle}</div>
            </button>
          </div>
        </div>
      )}

      {/* --- 结算弹窗 --- */}
      {(gameState === 'won' || gameState === 'lost' || gameState === 'completed') && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
          <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_100px_rgba(0,0,0,0.8)] transform transition-all animate-pop-in">
            {gameState === 'won' && (
              <>
                <div className="flex gap-2 mb-4">
                   {[1, 2, 3].map(s => (
                     <div key={s} className="relative">
                       <Star className={`w-12 h-12 transition-all duration-700 ${lastEarnedInfo.stars >= s ? 'text-yellow-400 fill-current scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]' : 'text-slate-600'}`} />
                       {lastEarnedInfo.newStar && lastEarnedInfo.stars === s && (
                         <span className="absolute -top-3 -right-3 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full animate-bounce">NEW!</span>
                       )}
                     </div>
                   ))}
                </div>
                <h2 className={`text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r ${playMode === 3 ? 'from-rose-300 to-pink-400' : 'from-emerald-300 to-cyan-300'}`}>
                  {playMode === 3 ? '绝境突破！' : '星轨确认！'}
                </h2>
                <div className="text-sm text-slate-300 mb-6">
                  您已通关 <span className="font-bold text-white">{playMode === 3 ? '奇点绝境' : playMode === 2 ? '跃迁指令' : '巡航协议'}</span> 难度
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 w-full mb-8 flex items-center justify-center gap-3">
                   <span className="text-slate-300 font-medium">收集星尘</span>
                   <div className="flex items-center gap-1 text-2xl font-black text-cyan-300 drop-shadow-md"><Sparkles className="w-6 h-6" /> +{lastEarnedInfo.dust}</div>
                </div>
                <div className="flex gap-4 w-full">
                  <button onClick={() => setGameState('levels')} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors">航线中心</button>
                  <button onClick={() => prepareLevel(lastEarnedInfo.stars === 3 ? currentLevel + 1 : currentLevel)} className="flex-[2] py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-cyan-500/30">
                    {lastEarnedInfo.stars === 3 ? '前往下个星域' : '挑战更高难度'} <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            )}
            {gameState === 'lost' && (
              <>
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-700 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(244,63,94,0.4)]"><RotateCcw className="w-10 h-10 text-white" /></div>
                <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-300 to-red-300">
                  {playMode === 3 ? '绝境陨落' : '能量耗尽'}
                </h2>
                <p className="text-slate-300 mb-8 text-sm">
                  {playMode === 3 ? '在没有援助的深空中，每一个微小的失误都将被放大。' : '差一点点就能完成收集了，可以去补给站兑换道具再来哦'}
                </p>
                <div className="flex gap-4 w-full">
                  <button onClick={() => prepareLevel(currentLevel)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors">调整策略</button>
                  <button onClick={() => startGameWithMode(playMode)} className="flex-[2] py-3 bg-gradient-to-r from-rose-500 to-red-600 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-rose-500/30">重新挑战</button>
                </div>
              </>
            )}
            {gameState === 'completed' && (
              <>
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-amber-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(251,191,36,0.6)] relative"><Sparkles className="absolute -top-2 -right-2 text-yellow-200 animate-pulse" /><Trophy className="w-12 h-12 text-white fill-current" /></div>
                <h2 className="text-4xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500">宇宙之巅</h2>
                <p className="text-slate-200 mb-8 text-lg">不可思议！你以“奇点绝境”难度<br/>征服了所有的星域！</p>
                <button onClick={() => setGameState('start')} className="w-full py-4 bg-white/10 border border-white/20 rounded-xl font-bold text-lg hover:bg-white/20 transition-all">返回母舰</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- 系统设置与跨设备存档管理弹窗 --- */}
      {showSettingsModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in pointer-events-auto">
          <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 flex flex-col items-center text-center shadow-[0_0_100px_rgba(0,0,0,0.8)] transform transition-all animate-pop-in relative overflow-hidden">
            {/* 装饰光效 */}
            <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <Settings className="w-10 h-10 text-cyan-400 mb-2 animate-[spin_4s_linear_infinite]" />
            <h3 className="text-xl font-bold mb-1 text-white tracking-widest">系统设置与存档</h3>
            <p className="text-xs text-blue-200/70 mb-6 flex items-center gap-1"><User className="w-3 h-3"/> 当前登录: {user}</p>

            {/* 导出存档按钮 */}
            <button onClick={handleExportSave} className={`w-full py-3 mb-3 border rounded-xl font-bold transition-all flex justify-center items-center gap-2 ${copySuccess ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'}`}>
              {copySuccess ? <><CheckCircle2 className="w-5 h-5"/> 代码已复制</> : <><Copy className="w-5 h-5"/> 复制存档代码 (用于换设备)</>}
            </button>

            {/* 导入存档区块 */}
            {!isImporting ? (
              <button onClick={() => setIsImporting(true)} className="w-full py-3 mb-6 bg-white/10 border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all flex justify-center items-center gap-2 text-white">
                <Download className="w-5 h-5" /> 通过代码导入本地存档
              </button>
            ) : (
              <div className="w-full mb-6 flex flex-col gap-2 animate-fade-in">
                <input type="text" value={importCode} onChange={e=>setImportCode(e.target.value)} placeholder="在此粘贴 CRYSTAL_ 开头的代码" className="w-full bg-black/50 border border-cyan-500/50 rounded-xl p-3 text-xs text-cyan-300 focus:outline-none" />
                <div className="flex gap-2 mt-1">
                  <button onClick={() => setIsImporting(false)} className="flex-[1] py-2 bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 hover:text-white">取消</button>
                  <button onClick={handleImportSave} className="flex-[2] py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg text-sm font-bold shadow-lg text-white">确认导入</button>
                </div>
              </div>
            )}

            <div className="w-full h-px bg-white/10 mb-4" />

            {/* 退出登录 */}
            <button onClick={handleLogout} className="w-full py-3 mb-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold hover:bg-rose-500/40 transition-all flex justify-center items-center gap-2">
              <LogOut className="w-5 h-5" /> 切换指挥官档案
            </button>

            <button onClick={() => setShowSettingsModal(false)} className="mt-2 text-white/40 hover:text-white text-sm pb-1 transition-colors">关闭</button>
          </div>
        </div>
      )}

      {/* 全局及专属道具特效动画定义 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop-in { 0% { opacity: 0; transform: scale(0.9); } 50% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes float-up { 0% { opacity: 0; transform: translateY(10px) scale(0.5) rotate(-5deg); } 20% { opacity: 1; transform: translateY(-15px) scale(1.2) rotate(3deg); } 80% { opacity: 1; transform: translateY(-30px) scale(1) rotate(0deg); filter: drop-shadow(0 0 10px rgba(255,255,255,0.5)); } 100% { opacity: 0; transform: translateY(-45px) scale(0.9); } }
        
        /* 锤子：红矮星湮灭特效 */
        @keyframes shatter { 
          0% { transform: scale(1); filter: brightness(1) sepia(0); } 
          30% { transform: scale(1.3) rotate(15deg); filter: brightness(3) sepia(1) hue-rotate(-50deg) saturate(5); } 
          100% { transform: scale(0) rotate(-45deg); opacity: 0; filter: blur(5px); } 
        }
        .animate-shatter { animation: shatter 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; z-index: 50 !important; }

        /* 沙漏：时空涟漪特效 */
        @keyframes time-ripple {
          0% { transform: scale(0); opacity: 0.8; box-shadow: 0 0 0 0px rgba(59, 130, 246, 0.8); }
          100% { transform: scale(2.5); opacity: 0; box-shadow: 0 0 0 150px rgba(59, 130, 246, 0); }
        }
        .animate-time-ripple { animation: time-ripple 0.6s ease-out forwards; }

        /* 骰子：黑洞漩涡特效 */
        @keyframes vortex {
          0% { transform: scale(0.1) rotate(0deg); opacity: 0; }
          50% { transform: scale(3) rotate(180deg); opacity: 1; filter: brightness(2); }
          100% { transform: scale(0.1) rotate(360deg); opacity: 0; }
        }
        @keyframes vortex-board {
          0% { transform: scale(1) rotate(0deg); filter: blur(0px); }
          50% { transform: scale(0.7) rotate(5deg); filter: blur(10px); opacity: 0.5; }
          100% { transform: scale(1) rotate(0deg); filter: blur(0px); }
        }
        .animate-vortex { animation: vortex 1s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-vortex-board { animation: vortex-board 1s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-float-up { animation: float-up 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}