export default function LoginPatterns({ variant = 'dark' }) {
  const isDark = variant === 'dark'

  return (
    <div className='pointer-events-none absolute inset-0 overflow-hidden' aria-hidden>
      {isDark ? (
        <>
          <div className='absolute -top-40 -left-24 size-[28rem] rounded-full bg-cyan-400/25 blur-3xl' />
          <div className='absolute top-1/3 -right-24 size-[22rem] rounded-full bg-sky-500/15 blur-3xl' />
          <div className='absolute -bottom-32 left-1/4 size-[24rem] rounded-full bg-cyan-300/10 blur-3xl' />
        </>
      ) : (
        <>
          <div className='absolute -top-32 right-[-6rem] size-[22rem] rounded-full bg-cyan-400/15 blur-3xl' />
          <div className='absolute bottom-[-8rem] left-[-4rem] size-[20rem] rounded-full bg-zinc-400/20 blur-3xl' />
        </>
      )}

      <div
        className={isDark ? 'absolute inset-0 opacity-[0.14]' : 'absolute inset-0 opacity-[0.35]'}
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(to right, rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.55) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(24,24,27,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,.08) 1px, transparent 1px)',
          backgroundSize: '56px 56px'
        }}
      />
      <div
        className={isDark ? 'absolute inset-0 opacity-30' : 'absolute inset-0 opacity-40'}
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle, rgba(34,211,238,.55) 1px, transparent 1.5px)'
            : 'radial-gradient(circle, rgba(14,116,144,.22) 1px, transparent 1.5px)',
          backgroundSize: '22px 22px'
        }}
      />

      <svg className='absolute inset-0 h-full w-full' viewBox='0 0 800 900' fill='none' preserveAspectRatio='xMidYMid slice'>
        <g stroke={isDark ? 'rgba(103,232,249,0.18)' : 'rgba(8,145,178,0.12)'} strokeWidth='1.2'>
          <circle cx='140' cy='460' r='90' />
          <circle cx='140' cy='460' r='160' />
          <circle cx='140' cy='460' r='240' />
          <circle cx='140' cy='460' r='330' />
        </g>

        <g opacity={isDark ? '0.45' : '0.28'} fill={isDark ? '#22d3ee' : '#0e7490'}>
          <rect x='628' y='98' width='2' height='134' />
          <rect x='620' y='120' width='18' height='90' rx='2' />
          <rect x='662' y='62' width='2' height='176' />
          <rect x='652' y='86' width='22' height='128' rx='2' />
          <rect x='695' y='128' width='2' height='116' />
          <rect x='688' y='150' width='16' height='72' rx='2' />
          <rect x='727' y='86' width='2' height='152' />
          <rect x='718' y='108' width='20' height='108' rx='2' />
        </g>

        <g opacity={isDark ? '0.22' : '0.14'} fill={isDark ? '#67e8f9' : '#155e75'}>
          <path d='M-20 760 L180 700 L220 760 L20 820 Z' />
          <path d='M40 820 L240 760 L280 820 L80 880 Z' />
        </g>
      </svg>

      <div
        className={
          isDark
            ? 'absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent'
            : 'absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/70'
        }
      />
    </div>
  )
}
