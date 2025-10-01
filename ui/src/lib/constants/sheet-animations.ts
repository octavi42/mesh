export const SHEET_ANIMATIONS = {
  backdrop: {
    opacity: [0, 0.3] as [number, number],
  },
  rightPanel: {
    stackingAnimation: {
      translateX: ({ progress }: { progress: number }) =>
        progress <= 1 ? progress * -10 + "px" : "calc(-12.5px + 2.5px *" + progress + ")",
      scale: [1, 0.933] as [number, number],
      transformOrigin: "0 50%" as const,
    },
  },
  centerPanel: {
    travelAnimation: {
      opacity: ({ progress }: { progress: number }) => Math.min(progress * 0.2, 0.2),
    },
  },
} as const