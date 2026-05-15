/**
 * ChessBoard - Premium animated chess board with neon cyber theme
 * Features: drag & drop, legal move indicators, check highlights, animations
 */
import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chess, Square, Color, PieceSymbol } from 'chess.js';

// Unicode chess pieces mapping
const PIECE_UNICODE: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

export type BoardTheme = 'cyber-neon' | 'classic-wood' | 'dark-pro' | 'space';

const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; name: string }> = {
  'cyber-neon': {
    light: 'bg-[#1a2744]/60',
    dark: 'bg-[#0d1a33]/80',
    name: 'Cyber Neon',
  },
  'classic-wood': {
    light: 'bg-[#f0d9b5]',
    dark: 'bg-[#b58863]',
    name: 'Classic Wood',
  },
  'dark-pro': {
    light: 'bg-[#2d2d2d]',
    dark: 'bg-[#1a1a1a]',
    name: 'Dark Pro',
  },
  'space': {
    light: 'bg-[#1e1b4b]/60',
    dark: 'bg-[#0f0a3c]/80',
    name: 'Space',
  },
};

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square, promotion?: string) => boolean;
  flipped?: boolean;
  boardTheme?: BoardTheme;
  disabled?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  hintSquare?: Square | null;
  hintTarget?: Square | null;
  playerColor?: Color;
}

export default function ChessBoard({
  game,
  onMove,
  flipped = false,
  boardTheme = 'cyber-neon',
  disabled = false,
  lastMove = null,
  hintSquare = null,
  hintTarget = null,
  playerColor = 'w',
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionData, setPromotionData] = useState<{ from: Square; to: Square } | null>(null);
  const [dragPiece, setDragPiece] = useState<{ square: Square; x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const theme = BOARD_THEMES[boardTheme];
  const fen = game.fen();
  const board = game.board();
  const inCheck = game.inCheck();
  const turn = game.turn();

  // Get king square for check highlight
  const kingSquare = useMemo(() => {
    if (!inCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (piece && piece.type === 'k' && piece.color === turn) {
          return (String.fromCharCode(97 + f) + (8 - r)) as Square;
        }
      }
    }
    return null;
  }, [board, inCheck, turn]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (disabled) return;

      if (selectedSquare) {
        // Try to move
        if (legalMoves.includes(square)) {
          // Check for promotion
          const piece = game.get(selectedSquare);
          if (
            piece &&
            piece.type === 'p' &&
            ((piece.color === 'w' && square[1] === '8') ||
              (piece.color === 'b' && square[1] === '1'))
          ) {
            setPromotionData({ from: selectedSquare, to: square });
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
          }

          onMove(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoves([]);
        } else {
          // Select new piece
          selectPiece(square);
        }
      } else {
        selectPiece(square);
      }
    },
    [selectedSquare, legalMoves, game, disabled, onMove]
  );

  const selectPiece = useCallback(
    (square: Square) => {
      const piece = game.get(square);
      if (piece && piece.color === turn) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setLegalMoves(moves.map((m) => m.to as Square));
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    },
    [game, turn]
  );

  const handlePromotion = (piece: string) => {
    if (promotionData) {
      onMove(promotionData.from, promotionData.to, piece);
      setPromotionData(null);
    }
  };

  // Generate board squares
  const squares = useMemo(() => {
    const result: {
      square: Square;
      rank: number;
      file: number;
      piece: { type: PieceSymbol; color: Color } | null;
      isLight: boolean;
    }[] = [];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const displayRank = flipped ? rank : 7 - rank;
        const displayFile = flipped ? 7 - file : file;
        const square = (String.fromCharCode(97 + displayFile) + (displayRank + 1)) as Square;
        const piece = board[7 - displayRank][displayFile];
        const isLight = (displayRank + displayFile) % 2 === 0;

        result.push({ square, rank, file, piece, isLight });
      }
    }
    return result;
  }, [fen, flipped]);

  return (
    <div className="relative select-none">
      {/* Board container */}
      <div
        ref={boardRef}
        className="grid grid-cols-8 rounded-xl overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.15)] relative"
        style={{ aspectRatio: '1/1' }}
      >
        {squares.map(({ square, rank, file, piece, isLight }) => {
          const isSelected = selectedSquare === square;
          const isLegalTarget = legalMoves.includes(square);
          const isLastMoveSquare =
            lastMove && (lastMove.from === square || lastMove.to === square);
          const isCheckSquare = kingSquare === square;
          const isHintFrom = hintSquare === square;
          const isHintTo = hintTarget === square;
          const hasPiece = !!piece;

          return (
            <motion.div
              key={square}
              className={`relative flex items-center justify-center cursor-pointer transition-all duration-150
                ${isLight ? theme.light : theme.dark}
                ${isSelected ? 'ring-2 ring-cyan-400 ring-inset z-10' : ''}
                ${isLastMoveSquare ? 'bg-cyan-500/20 !important' : ''}
                ${isCheckSquare ? 'bg-red-500/40 shadow-[inset_0_0_20px_rgba(239,68,68,0.5)]' : ''}
                ${isHintFrom ? 'ring-2 ring-emerald-400/80 ring-inset' : ''}
                ${isHintTo ? 'ring-2 ring-emerald-400/80 ring-inset' : ''}
              `}
              onClick={() => handleSquareClick(square)}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.97 } : {}}
            >
              {/* Last move highlight */}
              {isLastMoveSquare && (
                <div className="absolute inset-0 bg-cyan-400/15 pointer-events-none" />
              )}

              {/* Legal move indicator */}
              {isLegalTarget && !hasPiece && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute w-[30%] h-[30%] rounded-full bg-cyan-400/40 shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                />
              )}

              {/* Legal capture indicator */}
              {isLegalTarget && hasPiece && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-[5%] rounded-full border-[3px] border-red-400/60 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                />
              )}

              {/* Hint glow */}
              {(isHintFrom || isHintTo) && (
                <motion.div
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-emerald-400/20 pointer-events-none"
                />
              )}

              {/* Piece */}
              {piece && (
                <motion.span
                  key={`${square}-${piece.color}${piece.type}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-[clamp(1.5rem,5vw,3.5rem)] leading-none drop-shadow-lg pointer-events-none
                    ${piece.color === 'w' ? 'text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]' : 'text-amber-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'}
                    ${isSelected ? 'drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]' : ''}
                  `}
                >
                  {PIECE_UNICODE[`${piece.color}${piece.type}`]}
                </motion.span>
              )}

              {/* Rank labels */}
              {file === 0 && (
                <span className="absolute top-0.5 left-1 text-[0.55rem] font-display font-bold text-cyan-400/50 pointer-events-none">
                  {flipped ? rank + 1 : 8 - rank}
                </span>
              )}

              {/* File labels */}
              {rank === 7 && (
                <span className="absolute bottom-0 right-1 text-[0.55rem] font-display font-bold text-cyan-400/50 pointer-events-none">
                  {String.fromCharCode(flipped ? 104 - file : 97 + file)}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Promotion dialog */}
      <AnimatePresence>
        {promotionData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl"
          >
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.7 }}
              className="bg-card/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,255,255,0.2)]"
            >
              <p className="text-center text-sm font-display text-cyan-400 mb-3 tracking-wider">PROMOTE PAWN</p>
              <div className="flex gap-2">
                {['q', 'r', 'b', 'n'].map((p) => (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.15, y: -3 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePromotion(p)}
                    className="w-14 h-14 rounded-xl bg-gradient-to-b from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-3xl hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
                  >
                    {PIECE_UNICODE[`${turn}${p}`]}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
