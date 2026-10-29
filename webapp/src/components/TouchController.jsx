import React, { useCallback } from 'react'

/* Retro touch controller — same button codes as libretro/EJS:
 * 0=B 1=Y 2=SELECT 3=START 4=UP 5=DOWN 6=LEFT 7=RIGHT 8=A 9=X 10=L 11=R */

function Pad({ btn, label, cls, pressed, onPress }) {
  const onDown = useCallback((e) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    onPress(btn, true);
  }, [btn, onPress]);
  const onUp = useCallback((e) => {
    e.preventDefault();
    onPress(btn, false);
  }, [btn, onPress]);
  return (
    <button type="button" className={'pad ' + cls + (pressed ? ' pressed' : '')}
            data-btn={btn} onPointerDown={onDown} onPointerUp={onUp}
            onPointerCancel={onUp} onLostPointerCapture={onUp}
            onContextMenu={(e) => e.preventDefault()}>
      {label}
    </button>
  );
}

export default function TouchController({ pressed, onPress }) {
  return (
    <div className="controller" id="touchController">
      <div className="pad-left">
        <div className="dpad">
          <Pad btn={4} label="▲" cls="dp-up" pressed={!!pressed[4]} onPress={onPress} />
          <Pad btn={6} label="◀" cls="dp-left" pressed={!!pressed[6]} onPress={onPress} />
          <Pad btn={7} label="▶" cls="dp-right" pressed={!!pressed[7]} onPress={onPress} />
          <Pad btn={5} label="▼" cls="dp-down" pressed={!!pressed[5]} onPress={onPress} />
          <div className="dp-center" />
        </div>
      </div>
      <div className="pad-mid">
        <Pad btn={10} label="L" cls="shoulder" pressed={!!pressed[10]} onPress={onPress} />
        <Pad btn={2} label="SELECT" cls="meta" pressed={!!pressed[2]} onPress={onPress} />
        <Pad btn={3} label="START" cls="meta" pressed={!!pressed[3]} onPress={onPress} />
        <Pad btn={11} label="R" cls="shoulder" pressed={!!pressed[11]} onPress={onPress} />
      </div>
      <div className="pad-right">
        <div className="face">
          <Pad btn={1} label="Y" cls="f-y" pressed={!!pressed[1]} onPress={onPress} />
          <Pad btn={0} label="B" cls="f-b" pressed={!!pressed[0]} onPress={onPress} />
          <Pad btn={9} label="X" cls="f-x" pressed={!!pressed[9]} onPress={onPress} />
          <Pad btn={8} label="A" cls="f-a" pressed={!!pressed[8]} onPress={onPress} />
        </div>
      </div>
    </div>
  )
}
