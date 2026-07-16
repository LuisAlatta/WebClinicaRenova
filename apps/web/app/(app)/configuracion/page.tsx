'use client';
import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader';
import { getUsuario } from '../../../lib/api';
import { useToast } from '../../../components/Toast';

const CLAVE = 'renova_config';

interface Config {
  nombreClinica: string;
  zonaHoraria: string;
  idioma: string;
  registrosPorPagina: string;
  notifEmail: boolean;
  alertaStock: boolean;
  recordatorioCitas: boolean;
  confirmarEliminar: boolean;
  animaciones: boolean;
}

const POR_DEFECTO: Config = {
  nombreClinica: 'Clínica Renova',
  zonaHoraria: 'America/Lima',
  idioma: 'es',
  registrosPorPagina: '25',
  notifEmail: true,
  alertaStock: true,
  recordatorioCitas: true,
  confirmarEliminar: true,
  animaciones: true,
};

const ZONAS = ['America/Lima', 'America/Bogota', 'America/Mexico_City', 'America/Santiago', 'America/Buenos_Aires'];

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2,
        background: checked ? 'var(--primary)' : 'var(--border)', transition: 'background .2s',
        display: 'inline-flex', alignItems: 'center',
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'block',
        transform: checked ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)',
      }} />
    </button>
  );
}

function Fila({ titulo, desc, children }: { titulo: string; desc?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '.85rem 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{titulo}</div>
        {desc && <div style={{ color: 'var(--muted)', fontSize: '.82rem', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const usuario = getUsuario();
  const toast = useToast();
  const [cfg, setCfg] = useState<Config>(POR_DEFECTO);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) setCfg({ ...POR_DEFECTO, ...JSON.parse(raw) });
    } catch { /* ignora config corrupta */ }
  }, []);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((c) => ({ ...c, [k]: v }));

  function guardar() {
    localStorage.setItem(CLAVE, JSON.stringify(cfg));
    toast.ok('Configuración guardada', 'Tus preferencias se guardaron en este navegador.');
  }
  function restablecer() {
    setCfg(POR_DEFECTO);
    localStorage.removeItem(CLAVE);
    toast.info('Configuración restablecida', 'Se restauraron los valores por defecto.');
  }

  const selectStyle = { maxWidth: 220 } as const;

  return (
    <>
      <PageHeader title="Configuración" />

      <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 760 }}>
        {/* Preferencias generales */}
        <div className="card">
          <div className="section-title">Preferencias generales</div>
          <Fila titulo="Nombre de la institución" desc="Se muestra en encabezados y comprobantes.">
            <input className="input" style={selectStyle} value={cfg.nombreClinica} onChange={(e) => set('nombreClinica', e.target.value)} />
          </Fila>
          <Fila titulo="Zona horaria" desc="Para fechas y horas del sistema.">
            <select className="input" style={selectStyle} value={cfg.zonaHoraria} onChange={(e) => set('zonaHoraria', e.target.value)}>
              {ZONAS.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </Fila>
          <Fila titulo="Idioma" desc="Idioma de la interfaz.">
            <select className="input" style={selectStyle} value={cfg.idioma} onChange={(e) => set('idioma', e.target.value)}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </Fila>
          <Fila titulo="Registros por página" desc="Cantidad de filas en las tablas.">
            <select className="input" style={selectStyle} value={cfg.registrosPorPagina} onChange={(e) => set('registrosPorPagina', e.target.value)}>
              <option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option>
            </select>
          </Fila>
        </div>

        {/* Notificaciones */}
        <div className="card">
          <div className="section-title">Notificaciones</div>
          <Fila titulo="Notificaciones por correo" desc="Enviar avisos a los pacientes por email.">
            <Switch checked={cfg.notifEmail} onChange={(v) => set('notifEmail', v)} />
          </Fila>
          <Fila titulo="Alertas de stock bajo" desc="Avisar cuando un medicamento baje del mínimo.">
            <Switch checked={cfg.alertaStock} onChange={(v) => set('alertaStock', v)} />
          </Fila>
          <Fila titulo="Recordatorio de citas" desc="Recordar a los pacientes sus consultas próximas.">
            <Switch checked={cfg.recordatorioCitas} onChange={(v) => set('recordatorioCitas', v)} />
          </Fila>
        </div>

        {/* Interfaz */}
        <div className="card">
          <div className="section-title">Interfaz</div>
          <Fila titulo="Confirmar antes de eliminar" desc="Pedir confirmación en acciones destructivas.">
            <Switch checked={cfg.confirmarEliminar} onChange={(v) => set('confirmarEliminar', v)} />
          </Fila>
          <Fila titulo="Animaciones" desc="Mostrar transiciones y efectos en la interfaz.">
            <Switch checked={cfg.animaciones} onChange={(v) => set('animaciones', v)} />
          </Fila>
        </div>

        {/* Sesión */}
        <div className="card">
          <div className="section-title">Cuenta y sesión</div>
          <Fila titulo="Usuario actual" desc={usuario?.email || '—'}>
            <span className="badge" style={{ background: 'var(--sidebar-active)', color: 'var(--brand-d)' }}>{usuario?.rol || '—'}</span>
          </Fila>
          {usuario?.rol === 'ADMIN' && (
            <Fila titulo="Gestión de usuarios" desc="Crear, editar y eliminar cuentas del sistema.">
              <a className="btn btn-outline btn-sm" href="/usuarios">Ir a Usuarios</a>
            </Fila>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={restablecer}>Restablecer</button>
          <button className="btn" onClick={guardar}>Guardar cambios</button>
        </div>
      </div>
    </>
  );
}
