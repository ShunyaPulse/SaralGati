import type { GroundedAnswer } from '../answerGrounding';
import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  uiElements?: string[];
  /**
   * The language the elder chose. Both engines are asked for it in the prompt,
   * but the fine-tuned LoRA was trained on Hinglish, so arbitration has to
   * count an answer written in the wrong script as the weaker answer.
   */
  lang?: GuidanceLang;
  /**
   * How many times to sample the teacher engine (see `selfConsistencyScope`).
   * >1 turns on self-consistency voting (src/lib/ai/selfConsistency.ts): samples
   * are drawn at a sampling temperature and the plurality validated target
   * wins. Left at 1 where an elder is waiting; raised where a label is being
   * produced for training.
   */
  selfConsistency?: number;
  /**
   * Which engines that vote may draw from. Default 'teacher'.
   *
   * The two engines are not symmetric: Cloudflare Workers AI serves our own
   * LoRA adapter - the *student* the flywheel trains - while Gemini is a frozen
   * general model that never learns from these rows. Voting on the teacher
   * removes label noise (the published technique, applied where it belongs).
   * Voting on the student adds no outside information: the plurality of a
   * model's own opinions is still its own opinion, and teaching it back to the
   * adapter is self-distillation, which is how a fine-tune drifts and loses
   * diversity. 'all' exists for the interactive path, where nothing is being
   * trained and more samples simply means a better answer is likelier.
   */
  selfConsistencyScope?: 'teacher' | 'all';
  /** Decoder temperature for this call. 0 is the calm default. */
  temperature?: number;
}

/** Everything the arbiter can explain about why it picked what it picked. */
export interface AnswerGrounding {
  /** Validator verdict on the delivered answer. */
  status: GroundedAnswer['validation']['status'];
  score: number;
  reasons: string[];
  /** Both engines pointed at the same element: independent corroboration. */
  agreed: boolean;
  loraTargetIndex: number | null;
  geminiTargetIndex: number | null;
  /** The delivered sentence names a different element than it points at. */
  contradictsTarget: boolean;
}

export interface AIResponse {
  text: string;
  source: 'lora' | 'gemini';
  modelUsed?: string;
  confidence?: number;
  /** Element the delivered answer points at, after validation. */
  targetIndex?: number | null;
  grounding?: AnswerGrounding;
  /** Present when self-consistency voting was used for this engine. */
  consistency?: {
    sampleCount: number;
    agreeingSamples: number;
    isConsensus: boolean;
  };
  competingResults?: {
    loraConfidence?: number;
    geminiConfidence?: number;
    winner: 'lora' | 'gemini';
    /** Both engines validated the same element. */
    targetAgreement?: boolean;
    loraTargetIndex?: number | null;
    geminiTargetIndex?: number | null;
  };
}

