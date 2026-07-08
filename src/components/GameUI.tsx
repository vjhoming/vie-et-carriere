import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Volume2, VolumeX } from 'lucide-react';
import { GameState, DialogueState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { audio } from '../audio';

interface GameUIProps {
  gameState: GameState;
  dialogue: DialogueState;
  levelMessage: string | null;
  onStartGame: () => void;
  onRestartGame: () => void;
  isPregnant: boolean;
  condonCaught: boolean;
  onPressLeft: (active: boolean) => void;
  onPressRight: (active: boolean) => void;
  onPressJump: (active: boolean) => void;
  onPressShoot: (active: boolean) => void;
  onOpenEditor: () => void;
}

export default function GameUI({
  gameState,
  dialogue,
  levelMessage,
  onStartGame,
  onRestartGame,
  isPregnant,
  condonCaught,
  onPressLeft,
  onPressRight,
  onPressJump,
  onPressShoot,
  onOpenEditor,
}: GameUIProps) {
  const isGameOver = gameState.lives <= 0;
  const isVictory = gameState.phase >= 16 && gameState.isPlaying === false;
  
  const displayDialogueText = dialogue.visible ? dialogue.text : levelMessage;

  const [editorClickCount, setEditorClickCount] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (editorClickCount > 0) {
      timeout = setTimeout(() => {
        setEditorClickCount(0);
      }, 500);
    }
    return () => clearTimeout(timeout);
  }, [editorClickCount]);

  const handleSecretClick = () => {
    setEditorClickCount((prev) => prev + 1);
  };
  
  useEffect(() => {
    if (editorClickCount >= 5) {
      onOpenEditor();
      setEditorClickCount(0);
    }
  }, [editorClickCount, onOpenEditor]);
  const showDialogueBubble = !!displayDialogueText && gameState.isPlaying;
  const showStart = !gameState.isPlaying && !isGameOver && !isVictory;

  const [isMuted, setIsMuted] = useState(audio.getIsMuted());

  const handleToggleMute = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col p-2 md:p-6 z-30 select-none font-press-start">
      
      {/* Global Controls */}
      <div className="absolute top-2 right-2 md:top-6 md:right-6 pointer-events-auto z-50">
        <button
          onClick={handleToggleMute}
          className="bg-black border-2 border-white text-white p-2 sm:p-3 hover:bg-gray-800 active:scale-95 transition-all shadow-[2px_2px_0px_rgba(255,255,255,1)] rounded-none"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* 1. DESKTOP HUD (Hidden on small screens, shown on md and up) */}
      <div className="hidden md:flex w-full justify-between items-start gap-4 pointer-events-auto mt-8 md:mt-0 pr-12">
        {/* Left Side: Lives & Badges */}
        <div className="flex flex-col gap-3">
          <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2 min-w-[200px]">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest">VIE ET SANTÉ</div>
            <div className="flex items-center gap-2">
              <span className="text-black text-xs font-black">VIES:</span>
              <div className="flex gap-1.5">
                {Array.from({ length: Math.max(0, gameState.lives) }).map((_, i) => (
                  <div key={i} className="w-8 h-8 bg-red-500 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-white text-sm font-bold animate-pulse">
                    ♥
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isPregnant && (
              <div className="bg-pink-500 border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-white text-[9px] font-black flex flex-col gap-0.5 animate-pulse">
                <div className="flex items-center gap-1">
                  <span>🤰</span> ENCEINTE !
                </div>
                <div className="text-[7px] text-pink-100 font-bold uppercase leading-normal">
                  +1 VIE (BÉBÉ) / VITESSE DIVISÉE PAR 2
                </div>
              </div>
            )}
            {gameState.isBerserk && (
              <div className="bg-red-600 border-4 border-black px-3 py-2 text-white text-[10px] font-black uppercase tracking-widest animate-pulse shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-center">
                MODE TABARNAK!
              </div>
            )}
          </div>
        </div>
        
        {/* Right Side: Score */}
        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-end gap-1 min-w-[200px]">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">PERFORMANCE</div>
          <div className="flex items-end gap-2 text-black">
            <span className="text-3xl font-black leading-none">{gameState.score}</span>
            <span className="text-xs font-bold mb-1">PTS</span>
          </div>
          <div className="text-[9px] text-gray-400 font-bold">
            DIST: {Math.floor(gameState.distance)}m
          </div>
        </div>
      </div>

      {/* DIALOGUE SYSTEM */}
      <div className="absolute top-24 sm:top-32 left-1/2 -translate-x-1/2 w-[95%] sm:w-[80%] max-w-2xl pointer-events-none z-50">
        <AnimatePresence mode="wait">
          {displayDialogueText && (
            <motion.div 
              key={displayDialogueText}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="bg-black border-4 border-yellow-400 p-4 sm:p-6 shadow-[6px_6px_0px_rgba(0,0,0,1)] relative w-full mt-1 origin-top text-center"
            >
              <div className="text-yellow-400 text-xs sm:text-sm uppercase font-black tracking-widest mb-2">MESSAGE:</div>
              <div className="text-white text-sm sm:text-xl md:text-2xl leading-snug font-sans font-bold">
                "{displayDialogueText}"
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* OVERLAY SCREENS: RESPONSIVE & MOBILE ACCESSIBLE */}
      {showStart && (
        <div className="absolute inset-0 bg-indigo-900/95 flex flex-col items-center justify-center p-3 sm:p-6 text-center pointer-events-auto z-40 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#6366f1] border-4 border-black rounded-none p-4 sm:p-6 md:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center my-auto">
            {/* Retro header badge */}
            <div className="px-2.5 py-1 bg-yellow-400 text-black text-[7px] sm:text-[9px] border-2 border-black rounded-none font-black mb-3 sm:mb-4 tracking-widest animate-pulse shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              QUÉBEC RETRO &bull; FRANÇOIS PÉRUSSE
            </div>

            {/* Neo-brutalist Game Title */}
            <h1 className="text-base sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-none mb-3 sm:mb-4 uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              Vi<span onClick={handleSecretClick} className="cursor-default">e</span> et Carrière 3D
            </h1>

            <div className="bg-white border-2 border-black p-2 text-black text-[8px] sm:text-[9px] font-bold italic mb-4 max-w-md shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              "C'est ta vie qui commence ma p'tite Isabelle ! Saute !"
            </div>

            {/* Controls Info Box (Prominent) */}
            <div className="bg-black border-2 border-white p-4 sm:p-5 text-[10px] sm:text-xs text-cyan-300 mb-6 font-black flex flex-col items-center gap-2 shadow-[4px_4px_0px_rgba(255,255,255,1)] w-full max-w-md">
              <span className="uppercase text-yellow-400 text-[12px] sm:text-sm tracking-widest border-b border-white/30 pb-1 mb-1 w-full text-center">Contrôles du jeu</span>
              <div className="flex flex-col gap-2 w-full text-center">
                <div className="bg-white/10 p-1 rounded"><span className="text-white">DÉPLACEMENT :</span> [◀] [▶] Flèches ou [Q] / [D]</div>
                <div className="bg-white/10 p-1 rounded"><span className="text-white">SAUTER :</span> [ESPACE] ou [HAUT]</div>
                <div className="bg-white/10 p-1 rounded"><span className="text-white">TIRER :</span> [X] ou [ENTRÉE]</div>
                <div className="text-[8px] sm:text-[10px] text-gray-400 mt-2 font-normal italic">*Sur mobile, utilisez les boutons à l'écran</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-2">
              <button
                onClick={onStartGame}
                className="px-6 py-4 bg-green-500 text-white border-4 border-black font-black text-xs sm:text-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-green-400 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
              >
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />
                🚀 Essaie-toi, tu vas voir,
              </button>
            </div>
          </div>
        </div>
      )}

      {isGameOver && (
        <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center p-4 text-center pointer-events-auto z-40">
          <div className="w-full max-w-sm bg-white border-4 border-black p-5 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-black">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center mb-3 text-lg sm:text-xl animate-bounce">
              💀
            </div>

            <h2 className="text-red-500 text-base sm:text-lg font-black tracking-wide mb-1 uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              CARRIÈRE BRISÉE !
            </h2>
            
            <p className="text-[8px] sm:text-[10px] text-gray-700 leading-relaxed mb-4 font-bold">
              "Ah non Isabelle! tu m'as manqué beaucoup  "
            </p>

            <div className="bg-yellow-100 border-2 border-black p-3 text-left w-full mb-4 space-y-1.5 text-[8px] sm:text-[9px] font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between">
                <span className="text-gray-600">Distance:</span>
                <span className="text-black font-black">{Math.floor(gameState.distance)} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Points accumulés:</span>
                <span className="text-green-600 font-black">{gameState.score} pts</span>
              </div>
              <div className="flex justify-between border-t border-black pt-1.5 text-[7px] sm:text-[8px]">
                <span className="text-gray-600">Record du père:</span>
                <span className="text-cyan-600 font-black">{gameState.highScore} pts</span>
              </div>
            </div>

            <button
              onClick={onRestartGame}
              className="px-5 py-3.5 bg-red-500 text-white border-2 sm:border-4 border-black font-black text-[9px] sm:text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-red-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              RECOMMENCER MA VIE
            </button>
          </div>
        </div>
      )}

      {isVictory && (
        <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-4 text-center pointer-events-auto z-40">
          <div className="w-full max-w-sm bg-white border-4 border-black p-5 sm:p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-black">
            <div className="w-12 h-12 bg-yellow-400 border-2 border-black rounded-none flex items-center justify-center mb-3 text-xl animate-bounce shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              👑
            </div>

            <h2 className="text-emerald-600 text-base sm:text-lg font-black tracking-wide mb-1 uppercase drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              Animatrice à CDKC !
            </h2>

            <p className="text-[8px] sm:text-[9px] text-green-700 italic font-black mb-3">
              Félicitations, t'as en emploi en radio communautaire  !
            </p>

            <p className="text-[7px] sm:text-[8px] text-gray-700 leading-relaxed mb-4 font-bold">
               N'oublie pas que la chanteuse Tina Tourné sera en spectacle au Madisson Square garden...
            </p>

            <div className="bg-yellow-100 border-2 border-black p-3 text-left w-full mb-4 space-y-1.5 text-[8px] sm:text-[9px] font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between text-black">
                <span>Score Légendaire:</span>
                <span className="font-black text-green-600">{gameState.score} PTS</span>
              </div>
              {isPregnant && (
                <div className="text-[7px] text-pink-600 border-t border-black pt-1.5 text-center font-black animate-pulse">
                  🤰 COMPLÉTÉ EN ÉTANT ENCEINTE ! EXPLOIT EXTRAORDINAIRE !
                </div>
              )}
            </div>

            <button
              onClick={onRestartGame}
              className="px-5 py-3.5 bg-yellow-400 text-black border-2 sm:border-4 border-black font-black text-[9px] sm:text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recommencer la vie
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-0 right-0 flex flex-col w-full z-50">
        {/* MOBILE CONTROLS OVERLAY - Compact, Transparent & Highly responsive */}
        {gameState.isPlaying && (
          <div className="w-full max-w-md mx-auto flex flex-col gap-1 pointer-events-auto md:hidden pb-2 px-1">
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onMouseDown={() => onPressLeft(true)}
                onMouseUp={() => onPressLeft(false)}
                onMouseLeave={() => onPressLeft(false)}
                onTouchStart={(e) => { e.preventDefault(); onPressLeft(true); }}
                onTouchEnd={(e) => { e.preventDefault(); onPressLeft(false); }}
                className="bg-white/80 border-2 border-black h-12 text-sm font-black rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black select-none flex items-center justify-center cursor-pointer"
              >
                ◀
              </button>
              
              <button
                onMouseDown={() => onPressShoot(true)}
                onMouseUp={() => onPressShoot(false)}
                onMouseLeave={() => onPressShoot(false)}
                onTouchStart={(e) => { e.preventDefault(); onPressShoot(true); }}
                onTouchEnd={(e) => { e.preventDefault(); onPressShoot(false); }}
                className="bg-red-500/80 border-2 border-black h-12 text-[9px] font-black rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-white select-none flex items-center justify-center cursor-pointer"
              >
                TIR
              </button>

              <button
                onMouseDown={() => onPressJump(true)}
                onMouseUp={() => onPressJump(false)}
                onMouseLeave={() => onPressJump(false)}
                onTouchStart={(e) => { e.preventDefault(); onPressJump(true); }}
                onTouchEnd={(e) => { e.preventDefault(); onPressJump(false); }}
                className="bg-yellow-400/80 border-2 border-black h-12 text-[9px] font-black rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black select-none flex items-center justify-center cursor-pointer"
              >
                SAUT
              </button>
              
              <button
                onMouseDown={() => onPressRight(true)}
                onMouseUp={() => onPressRight(false)}
                onMouseLeave={() => onPressRight(false)}
                onTouchStart={(e) => { e.preventDefault(); onPressRight(true); }}
                onTouchEnd={(e) => { e.preventDefault(); onPressRight(false); }}
                className="bg-white/80 border-2 border-black h-12 text-sm font-black rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-black select-none flex items-center justify-center cursor-pointer"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {/* Footer watermark */}
        <div className="w-full text-center text-[6px] sm:text-[7px] text-white/90 tracking-widest pointer-events-none pt-1 drop-shadow-[1px_1px_0px_rgba(0,0,0,1)] font-sans">
          Inspiré de François Pérusse &bull; Vibe codé en React + Three.js &bull; à
        </div>
      </div>

    </div>
  );
}
