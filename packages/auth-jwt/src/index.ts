import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar';
const EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export type Rol = 'ADMIN' | 'MEDICO' | 'ASISTENTE';

export interface JwtPayload {
  sub: string;        // id del usuario
  email: string;
  rol: Rol;
  nombre: string;
}

export function firmarToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions);
}

export function firmarRefresh(payload: Pick<JwtPayload, 'sub'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
}

export function verificarToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

/**
 * Middleware Fastify: exige JWT válido y opcionalmente uno de los roles dados.
 * Uso en una ruta:  { preHandler: requireAuth(['ADMIN','MEDICO']) }
 */
export function requireAuth(rolesPermitidos?: Rol[]) {
  return async (req: any, reply: any) => {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Token no provisto' });
    }
    try {
      const payload = verificarToken(header.slice(7));
      req.usuario = payload;
      if (rolesPermitidos && !rolesPermitidos.includes(payload.rol)) {
        return reply.code(403).send({ error: 'No autorizado para este recurso' });
      }
    } catch {
      return reply.code(401).send({ error: 'Token inválido o expirado' });
    }
  };
}
