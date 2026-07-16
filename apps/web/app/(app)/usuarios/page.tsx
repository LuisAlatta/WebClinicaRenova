'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, getUsuario } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';

interface Usuario {
  id: string; email: string; nombres: string; apellidos: string;
  rol: string; rol_nombre?: string; activo: boolean; creado_en?: string;
}
interface Rol { id: number; codigo: string; nombre: string; descripcion?: string }

const COLOR_ROL: Record<string, string> = {
  ADMIN: '#6d5ae6', MEDICO: '#0ea5a3', ASISTENTE: '#3b82f6',
  FARMACEUTICO: '#f0a23b', LABORATORISTA: '#8b5cf6',
};
const colorRol = (c: string) => COLOR_ROL[c] || '#64748b';

const FORM_VACIO = { nombres: '', apellidos: '', email: '', rol: '', password: '', activo: true };

export default function UsuariosPage() {
  const yo = getUsuario();
  const esAdmin = yo?.rol === 'ADMIN';

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [busca, setBusca] = useState('');
  const [cargando, setCargando] = useState(true);
  const toast = useToast();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [aEliminar, setAEliminar] = useState<Usuario | null>(null);

  async function cargar() {
    setCargando(true);
    try {
      const [u, r] = await Promise.all([api('/api/auth/usuarios'), api('/api/auth/roles')]);
      setUsuarios(u.data || []);
      setRoles(r.data || []);
    } catch (e: any) { toast.error('No se pudo cargar', e.message); }
    finally { setCargando(false); }
  }
  useEffect(() => { if (esAdmin) cargar(); /* eslint-disable-next-line */ }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      `${u.nombres} ${u.apellidos}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.rol_nombre || u.rol).toLowerCase().includes(q));
  }, [usuarios, busca]);

  function abrirNuevo() {
    setEditando(null);
    setForm({ ...FORM_VACIO, rol: roles[0]?.codigo || '' });
    setModalAbierto(true);
  }
  function abrirEditar(u: Usuario) {
    setEditando(u);
    setForm({ nombres: u.nombres, apellidos: u.apellidos, email: u.email, rol: u.rol, password: '', activo: u.activo });
    setModalAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.email.trim() || !form.rol) {
      toast.error('Datos incompletos', 'Completa nombres, apellidos, correo y rol.'); return;
    }
    if (!editando && form.password.length < 6) {
      toast.error('Contraseña inválida', 'La contraseña debe tener al menos 6 caracteres.'); return;
    }
    setGuardando(true);
    try {
      if (editando) {
        const body: any = {
          nombres: form.nombres, apellidos: form.apellidos, email: form.email,
          rol: form.rol, activo: form.activo,
        };
        if (form.password.trim()) body.password = form.password;
        await api(`/api/auth/usuarios/${editando.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast.ok('Usuario actualizado', 'Los cambios se guardaron correctamente.');
      } else {
        await api('/api/auth/usuarios', {
          method: 'POST',
          body: JSON.stringify({
            nombres: form.nombres, apellidos: form.apellidos, email: form.email,
            rol: form.rol, password: form.password,
          }),
        });
        toast.ok('Usuario creado', 'El usuario se registró correctamente.');
      }
      setModalAbierto(false);
      cargar();
    } catch (err: any) { toast.error('No se pudo guardar', err.message); }
    finally { setGuardando(false); }
  }

  async function alternarActivo(u: Usuario) {
    try {
      await api(`/api/auth/usuarios/${u.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !u.activo }) });
      toast.ok(u.activo ? 'Usuario desactivado' : 'Usuario activado', `${u.nombres} ${u.apellidos}`);
      cargar();
    } catch (e: any) { toast.error('No se pudo cambiar el estado', e.message); }
  }

  async function eliminar() {
    if (!aEliminar) return;
    try {
      await api(`/api/auth/usuarios/${aEliminar.id}`, { method: 'DELETE' });
      toast.ok('Usuario eliminado', `${aEliminar.nombres} ${aEliminar.apellidos} fue eliminado.`);
      setAEliminar(null);
      cargar();
    } catch (e: any) { toast.error('No se pudo eliminar', e.message); setAEliminar(null); }
  }

  if (!esAdmin) {
    return (
      <>
        <PageHeader title="Usuarios" />
        <div className="card"><p style={{ color: 'var(--muted)', margin: 0 }}>Solo el administrador puede gestionar usuarios.</p></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Gestión de usuarios" />

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="search" style={{ flex: 1, minWidth: 240, maxWidth: 420 }}>
          <input className="input" placeholder="Buscar por nombre, correo o rol…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-outline" onClick={cargar}>↻ Actualizar</button>
        <button className="btn" onClick={abrirNuevo}>+ Nuevo usuario</button>
      </div>

      <div className="card table-card">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem' }}>Cargando…</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem' }}>Sin usuarios</td></tr>
            ) : filtrados.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>
                  {u.nombres} {u.apellidos}
                  {u.id === yo?.sub && <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '.78rem' }}> (tú)</span>}
                </td>
                <td>{u.email}</td>
                <td><span className="badge" style={{ background: colorRol(u.rol), color: '#fff' }}>{u.rol_nombre || u.rol}</span></td>
                <td>
                  <span className={`badge ${u.activo ? 'ok' : 'soft'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(u)}>Editar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => alternarActivo(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      disabled={u.id === yo?.sub} title={u.id === yo?.sub ? 'No puedes eliminar tu propia cuenta' : ''}
                      onClick={() => setAEliminar(u)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      <Modal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={editando ? 'Editar usuario' : 'Nuevo usuario'}
        subtitle={editando ? `${editando.nombres} ${editando.apellidos}` : 'Completa los datos del nuevo usuario'}
      >
        <form onSubmit={guardar}>
          <div className="form-row"><label className="label">Nombres</label>
            <input className="input" value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} /></div>
          <div className="form-row"><label className="label">Apellidos</label>
            <input className="input" value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} /></div>
          <div className="form-row"><label className="label">Correo</label>
            <input className="input" type="email" placeholder="usuario@renova.pe" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="form-row"><label className="label">Rol</label>
            <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              <option value="">Seleccione un rol…</option>
              {roles.map((r) => <option key={r.id} value={r.codigo}>{r.nombre}</option>)}
            </select>
          </div>
          <div className="form-row"><label className="label">{editando ? 'Nueva contraseña' : 'Contraseña'}</label>
            <input className="input" type="password" autoComplete="new-password"
              placeholder={editando ? 'Dejar en blanco para no cambiarla' : 'Mínimo 6 caracteres'}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {editando && (
            <div className="form-row"><label className="label">Estado</label>
              <select className="input" value={form.activo ? '1' : '0'} onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })}>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn" disabled={guardando}>{guardando ? 'Guardando…' : (editando ? 'Guardar cambios' : 'Crear usuario')}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!aEliminar}
        title="¿Eliminar este usuario?"
        message={aEliminar ? `Se eliminará a ${aEliminar.nombres} ${aEliminar.apellidos} (${aEliminar.email}). Esta acción no se puede deshacer.` : ''}
        confirmLabel="Sí, eliminar"
        onConfirm={eliminar}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
