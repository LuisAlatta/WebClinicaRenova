export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 34 H26 L34 14 L46 50 L56 28 L62 34 H72"
        stroke="var(--brand)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
      <path
        d="M74 24 c4-6 14-4 14 4 c0 7-10 12-14 16 c-4-4-14-9-14-16 c0-8 10-10 14-4 z"
        fill="var(--brand)"
      />
    </svg>
  );
}

export function LogoFull({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem' }}>
      <LogoMark size={compact ? 38 : 64} />
      <div style={{ fontWeight: 800, color: 'var(--brand)', fontSize: compact ? '1.25rem' : '2rem', lineHeight: 1 }}>
        Renova
      </div>
      {!compact && (
        <div style={{ letterSpacing: '4px', color: '#3a4a63', fontWeight: 600, fontSize: '.7rem' }}>
          CLÍNICA DE SALUD
        </div>
      )}
    </div>
  );
}
