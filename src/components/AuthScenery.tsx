/** Decorative school illustration shared by both portals. */
export function AuthScenery() {
  return (
    <svg className="auth-scenery" viewBox="0 0 1000 320" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="school-wall" x2="0" y2="1"><stop stopColor="#eaf7ff"/><stop offset="1" stopColor="#89bce6"/></linearGradient>
        <linearGradient id="school-wave" x2="1" y2="1"><stop stopColor="#0089ff" stopOpacity=".2"/><stop offset="1" stopColor="#00dce0" stopOpacity=".65"/></linearGradient>
        <g id="school-window"><path fill="#5298d1" d="M0 0h22v35H0z"/><path stroke="#cceaff" strokeWidth="2" d="M11 0v35M0 17h22"/></g>
        <g id="school-palm" fill="#5badd5"><path d="M-5 0 0-92 5 0z"/><path d="M0-89C-35-137-65-107-62-98c22-11 41-2 62 9M0-89c-5-57-43-58-45-45 21 4 32 22 45 45M0-89c20-55 52-42 51-30-23 0-37 13-51 30M0-89c44-28 65-2 61 9-20-15-40-15-61-9M0-89c-40-13-57 13-51 22 14-18 31-23 51-22M0-89c26-8 44 19 36 28-7-17-21-24-36-28"/></g>
      </defs>
      <g className="auth-school">
        <use href="#school-palm" transform="translate(100 238)"/><use href="#school-palm" transform="translate(900 238) scale(-1 1)"/>
        <path fill="url(#school-wall)" stroke="#c5e5fa" strokeWidth="4" d="M170 160h660v105H170z"/>
        {Array.from({length: 12}, (_, i) => <use key={i} href="#school-window" x={190 + i * 51} y="177"/>)}
        {Array.from({length: 12}, (_, i) => <use key={i} href="#school-window" x={190 + i * 51} y="222"/>)}
        <path fill="url(#school-wall)" stroke="#d7efff" strokeWidth="5" d="M407 130h186v138H407z"/>
        <path fill="#ecf8ff" d="M398 125h204v12H398zM423 144h15v119h-15zM562 144h15v119h-15z"/>
        <path fill="#4c8dbe" d="M457 158h86v103h-86z"/><path stroke="#bfdef2" strokeWidth="5" d="M500 158v103M457 194h86M457 226h86"/>
        <path stroke="#a2c9e5" strokeWidth="4" d="M500 126V45"/>
        <path fill="#fff" d="M503 45c20-8 34 13 58 5v39c-24 8-38-13-58-5z"/><path fill="#d85161" d="M503 45c20-8 34 13 58 5v13c-24 8-38-13-58-5z"/><path fill="#24394f" d="M503 71c20-8 34 13 58 5v13c-24 8-38-13-58-5z"/><path stroke="#25865f" strokeWidth="3" d="m521 65 4 3 4-3 4 3 4-3 4 3"/>
        <path fill="#d2ebfc" d="M395 265h210v7H395zM382 272h236v7H382z"/>
      </g>
      <path fill="url(#school-wave)" d="M0 212c230 25 369 166 640 70 150-54 250-62 360-88v126H0z"/>
      <path fill="#008cf3" fillOpacity=".12" stroke="#76dcff" strokeOpacity=".5" d="M0 270c290-2 400 103 650 17 156-54 256-25 350-19v52H0z"/>
    </svg>
  )
}
