// Forçado como "/public" por padrão: todas as pastas de imagem (quartos,
// galeria) vivem dentro de public/, e o proxy reverso de produção só serve
// esses arquivos sob esse prefixo — diferente do `next dev` local, que serve
// public/ direto na raiz. Continua configurável via env var (inclusive para
// deixar em branco) caso algum ambiente precise do comportamento padrão do
// Next.js sem esse prefixo.
const UPLOADS_URL_PREFIX = (process.env.UPLOADS_URL_PREFIX ?? '/public').replace(/\/+$/, '');

export function toPublicUploadUrl(relativePath: string | null | undefined): string {
  if (!relativePath) {
    return '';
  }

  if (!UPLOADS_URL_PREFIX) {
    return relativePath;
  }

  if (relativePath.startsWith(UPLOADS_URL_PREFIX)) {
    return relativePath;
  }

  return `${UPLOADS_URL_PREFIX}${relativePath}`;
}
