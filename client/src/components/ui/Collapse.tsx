import type { ReactNode } from 'react'

interface CollapseProps {
  open: boolean
  children: ReactNode
  className?: string
}

// Kept in sync with the `duration-300` class below — callers that need to
// defer clearing state until a close animation finishes (so content doesn't
// vanish before it's done shrinking) can time a setTimeout off this.
export const COLLAPSE_DURATION_MS = 300

// Animates height purely with CSS (no JS measuring) via the grid-template-rows
// 0fr/1fr trick: a 1-row grid tweens between "collapsed" and "content's natural
// height" smoothly, while the inner `overflow-hidden` clips it mid-transition.
function Collapse({ open, children, className = '' }: CollapseProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      } ${className}`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

export default Collapse
