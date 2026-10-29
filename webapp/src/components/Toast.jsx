import React, { useEffect } from 'react'

export default function Toast({ msg, ms, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, ms || 2600);
    return () => clearTimeout(t);
  }, [msg, ms, onDone])
  return <div id="toast" className="toast">{msg}</div>
}
