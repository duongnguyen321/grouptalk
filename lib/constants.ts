export const DEVICE_ID_STORAGE_KEY = "grouptalk_device_id";
export const SESSION_DRAFT_STORAGE_KEY = "grouptalk-session-draft";
export const SESSION_CODE_LENGTH = 8;
export const SESSION_CODE_SEQ_KEY = "session:code:seq";
export const SESSION_CODE_MODULO = 100_000_000;
export const ANONYMOUS_DISPLAY_NAME = "Ẩn danh";
export const SESSION_CODE_PATTERN = /^\d{8}$/;
export const MIN_SESSION_PLAYERS = 2;
export const PLAYER_NAME_MAX_LENGTH = 24;
export const CRUSH_TOPIC_NAME = "Thích thầm";
export const CRUSH_GUARANTEED_TOPICS = ["Thích thầm", "Tình cảm"] as const;
export const CRUSH_TOPIC_WEIGHT_MAP: Readonly<Record<string, number>> = {
  "Thích thầm": 3,
  "Tình cảm": 3,
  "Kỷ niệm": 2,
} as const;
export const TEASER_CARD_COUNT = 3;
export const SESSION_LOCK_KEY_PREFIX = "lock:session:";
export const SESSION_LOCK_TTL_MS = 5000;
export const SESSION_LOCK_RELEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) end return 0`;
export const VOTE_HIDE_DELETE_RATIO = 0.3;
export const WHEEL_SPIN_MIN_MS = 2000;
export const WHEEL_SPIN_MAX_MS = 4000;
export const WHEEL_SPIN_EASING = [0.17, 0.67, 0.3, 0.99] as const;
export const WHEEL_EXTRA_TURNS_MIN = 5;
export const WHEEL_EXTRA_TURNS_MAX = 7;
export const WINNER_REVEAL_MS = 1500;
export const CARD_FLIP_MS = 500;
export const HIDE_TOAST_MS = 2000;
export const SPIN_BUSY_ERROR = "busy";
export const QUESTION_TITLE_MIN_LENGTH = 4;
export const QUESTION_TITLE_MAX_LENGTH = 280;
export const HISTORY_DELETED_LABEL = "câu hỏi này đã được gỡ khỏi hệ thống";
export const CONTRIBUTE_THANKS_TOAST = "Cảm ơn bạn đã đóng góp!";
export const PRIORITY_WEIGHT_STEPS = [1, 2, 3, 5] as const;
export const PRIORITY_DOT_COUNT = 3;
export const PRIORITY_LONG_PRESS_MS = 700;
export const QUESTIONS_PAGE_SIZE = 20;
