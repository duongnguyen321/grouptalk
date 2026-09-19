export const PHASE_EASE = [0.22, 1, 0.36, 1] as const;
export const PHASE_DURATION_S = 0.28;
export const CARD_STAGGER_S = 0.08;
export const MENU_DURATION_S = 0.26;
export const DIGIT_STAGGER_S = 0.05;
export const FORM_STAGGER_S = 0.06;
export const LIST_STAGGER_S = 0.05;
export const TAP_SCALE = 0.97;

export const phaseTransition = {
  duration: PHASE_DURATION_S,
  ease: PHASE_EASE,
};

export const phaseEnter = { opacity: 0, y: 18 };
export const phaseCenter = { opacity: 1, y: 0 };
export const phaseExit = { opacity: 0, y: -14 };

export const screenContainer = {
  hidden: {},
  show: { transition: { staggerChildren: FORM_STAGGER_S } },
};

export const screenItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: PHASE_DURATION_S, ease: PHASE_EASE },
  },
};
