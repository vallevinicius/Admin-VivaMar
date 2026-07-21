import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getVerifiedTenantSession, hasFeatureAccess } from "@/lib/tenant-session";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 10;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function isFileLike(input: FormDataEntryValue): input is File {
  return (
    typeof input === "object" &&
    input !== null &&
    "arrayBuffer" in input &&
    "type" in input &&
    "size" in input
  );
}

function getUploadsDirectory() {
  return path.join(process.cwd(), "public", "uploads", "rooms");
}

function slugifyRoomName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export async function POST(request: Request) {
  try {
    const session = await getVerifiedTenantSession();
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (!hasFeatureAccess(session, "rooms")) {
      return NextResponse.json({ error: "Sem permissão para esta ação." }, { status: 403 });
    }

    const formData = await request.formData();
    const rawRoomName = String(formData.get("roomName") ?? "").trim();

    if (!rawRoomName) {
      return NextResponse.json(
        { error: "Nome do quarto é obrigatório para upload" },
        { status: 400 },
      );
    }

    const roomFolderName = slugifyRoomName(rawRoomName) || "quarto";

    const filesFromPhotos = formData.getAll("photos");
    const singlePhoto = formData.get("photo");
    const uploadedItems = filesFromPhotos.length > 0 ? filesFromPhotos : singlePhoto ? [singlePhoto] : [];

    const files = uploadedItems.filter((item): item is File => isFileLike(item));

    if (files.length === 0) {
      return NextResponse.json({ error: "Envie ao menos uma foto" }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_FILES_PER_REQUEST} fotos por envio` },
        { status: 400 },
      );
    }

    const uploadDir = path.join(getUploadsDirectory(), roomFolderName);
    await mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          {
            error: `Tipo de arquivo não permitido: ${file.type || "desconhecido"}. Use JPG, PNG, WEBP ou GIF.`,
          },
          { status: 400 },
        );
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Arquivo ${file.name} excede 5MB` },
          { status: 400 },
        );
      }

      const extension = EXTENSION_BY_MIME[file.type] ?? ".jpg";
      const filename = `${Date.now()}-${randomUUID()}${extension}`;
      const filepath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);

      urls.push(`/uploads/rooms/${roomFolderName}/${filename}`);
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao fazer upload de fotos do quarto:", error);
    return NextResponse.json({ error: error?.message || "Erro ao fazer upload" }, { status: 500 });
  }
}
