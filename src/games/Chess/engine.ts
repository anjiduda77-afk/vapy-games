/**
 * Chess AI Engine - Minimax with Alpha-Beta Pruning
 * Supports 6 difficulty levels from Beginner to Grandmaster
 */
import { Chess, Square, Move } from 'chess.js';

// Piece values for evaluation
const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
};

// Piece-square tables for positional evaluation
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MID_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

const PST: Record<string, number[]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_MID_TABLE
};

function getSquareIndex(square: Square, isWhite: boolean): number {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;
  if (isWhite) {
    return (7 - rank) * 8 + file;
  }
  return rank * 8 + file;
}

/** Evaluate the board from white's perspective */
function evaluateBoard(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -99999 : 99999;
  }
  if (game.isDraw() || game.isStalemate()) return 0;

  let score = 0;
  const board = game.board();

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (!piece) continue;

      const isWhite = piece.color === 'w';
      const pieceValue = PIECE_VALUES[piece.type] || 0;
      const square = (String.fromCharCode(97 + file) + (8 - rank)) as Square;
      const pstIdx = getSquareIndex(square, isWhite);
      const pstValue = PST[piece.type]?.[pstIdx] || 0;

      if (isWhite) {
        score += pieceValue + pstValue;
      } else {
        score -= pieceValue + pstValue;
      }
    }
  }

  // Mobility bonus
  const moves = game.moves().length;
  score += (game.turn() === 'w' ? 1 : -1) * moves * 2;

  return score;
}

/** Order moves for better alpha-beta pruning */
function orderMoves(game: Chess, moves: Move[]): Move[] {
  return moves.sort((a, b) => {
    let scoreA = 0, scoreB = 0;
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece];
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece];
    if (a.promotion) scoreA += PIECE_VALUES[a.promotion];
    if (b.promotion) scoreB += PIECE_VALUES[b.promotion];
    if (game.isCheck()) scoreA += 50;
    return scoreB - scoreA;
  });
}

/** Minimax with Alpha-Beta pruning */
function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = orderMoves(game, game.moves({ verbose: true }));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const evaluation = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' | 'grandmaster';

export interface AIConfig {
  depth: number;
  randomness: number; // 0.0 = perfect, 1.0 = fully random
  blunderChance: number; // Chance of making a deliberately bad move
  thinkTimeMs: [number, number]; // [min, max] milliseconds
  label: string;
  xpReward: number;
}

export const AI_CONFIGS: Record<DifficultyLevel, AIConfig> = {
  beginner:    { depth: 1, randomness: 0.7,  blunderChance: 0.4,  thinkTimeMs: [500, 1200],   label: '🌱 Beginner',     xpReward: 5 },
  easy:        { depth: 2, randomness: 0.5,  blunderChance: 0.25, thinkTimeMs: [800, 2000],   label: '⚡ Easy',         xpReward: 10 },
  medium:      { depth: 3, randomness: 0.25, blunderChance: 0.1,  thinkTimeMs: [1000, 3000],  label: '🎯 Medium',      xpReward: 20 },
  hard:        { depth: 4, randomness: 0.1,  blunderChance: 0.03, thinkTimeMs: [1500, 4000],  label: '🔥 Hard',        xpReward: 35 },
  expert:      { depth: 5, randomness: 0.03, blunderChance: 0.01, thinkTimeMs: [2000, 5000],  label: '💀 Expert',      xpReward: 60 },
  grandmaster: { depth: 6, randomness: 0.0,  blunderChance: 0.0,  thinkTimeMs: [2500, 6000],  label: '👑 Grandmaster', xpReward: 100 },
};

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  'beginner', 'easy', 'medium', 'hard', 'expert', 'grandmaster'
];

/** Get the best move for the AI based on difficulty */
export function getAIMove(fen: string, difficulty: DifficultyLevel): Move | null {
  const game = new Chess(fen);
  const config = AI_CONFIGS[difficulty];
  const moves = game.moves({ verbose: true });

  if (moves.length === 0) return null;

  // Blunder: pick a random (possibly bad) move
  if (Math.random() < config.blunderChance) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Random factor: mix random moves with best moves
  if (Math.random() < config.randomness) {
    // Sort moves and pick from top half with some randomness
    const evaluated = moves.map(move => {
      game.move(move);
      const score = evaluateBoard(game);
      game.undo();
      return { move, score };
    });

    // AI plays black, so lower score is better for black
    const isWhite = game.turn() === 'w';
    evaluated.sort((a, b) => isWhite ? b.score - a.score : a.score - b.score);

    // Pick from top 60% of moves
    const topCount = Math.max(1, Math.floor(evaluated.length * 0.6));
    const idx = Math.floor(Math.random() * topCount);
    return evaluated[idx].move;
  }

  // Full minimax search
  let bestMove = moves[0];
  let bestScore = game.turn() === 'w' ? -Infinity : Infinity;
  const isMaximizing = game.turn() === 'w';

  for (const move of orderMoves(game, moves)) {
    game.move(move);
    const score = minimax(game, config.depth - 1, -Infinity, Infinity, !isMaximizing);
    game.undo();

    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/** Get a hint for the player */
export function getHint(fen: string): Move | null {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = game.turn() === 'w' ? -Infinity : Infinity;
  const isMaximizing = game.turn() === 'w';

  for (const move of orderMoves(game, moves)) {
    game.move(move);
    const score = minimax(game, 3, -Infinity, Infinity, !isMaximizing);
    game.undo();

    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
