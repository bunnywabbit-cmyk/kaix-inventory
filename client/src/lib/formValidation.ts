// Shared red-highlight styling for required fields left empty after a submit
// attempt. Forms stay clickable at all times — clicking with something
// missing flips `attempted` to true, which lights up whichever fields are
// still invalid, rather than silently disabling the submit button.
export const invalidInputClass =
  'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 dark:border-red-500'
export const invalidBoxClass = 'border-red-500 dark:border-red-500'
export const invalidRingClass = 'ring-1 ring-red-500 rounded-lg'
