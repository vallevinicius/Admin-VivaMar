import { getDb } from '@/lib/db';

/**
 * Resolve o tenant usado pelas rotas públicas (`/api/public/**`, consumidas
 * pela landing page externa, sem sessão). Centralizado aqui para que
 * listagem de quartos, validação de cupom e criação de reserva pública
 * sempre concordem sobre qual tenant estão servindo — antes, cada rota
 * resolvia isso de um jeito diferente (algumas tinham `tenantId: 1`
 * hardcoded), o que quebrava a criação de reserva sempre que o tenant real
 * não era o de id 1.
 */
export async function resolvePublicTenantId(request: Request): Promise<number | null> {
  const { searchParams } = new URL(request.url);
  const fromQuery = searchParams.get('tenantId');
  const fromEnv = process.env.PUBLIC_ROOMS_TENANT_ID;

  const parsedQuery = fromQuery ? Number(fromQuery) : NaN;
  if (Number.isInteger(parsedQuery) && parsedQuery > 0) {
    return parsedQuery;
  }

  const parsedEnv = fromEnv ? Number(fromEnv) : NaN;
  if (Number.isInteger(parsedEnv) && parsedEnv > 0) {
    return parsedEnv;
  }

  const { Room } = await getDb();
  const firstRoom = await Room.findOne({
    attributes: ['tenantId'],
    order: [
      ['tenantId', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  if (firstRoom?.tenantId) {
    return firstRoom.tenantId;
  }

  return null;
}
