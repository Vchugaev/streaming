import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import { resetIngresses } from "@/actions/ingress";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Получаем заголовки
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Получаем тело запроса
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Верификация вебхука
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  const eventType = evt.type;

  try {
    if (eventType === "user.created") {
      // Генерируем username с проверками
      const username = generateUsername(payload.data);
      
      // Создаем пользователя с обработкой возможных дубликатов
      await createUserWithFallback(payload.data, username);
    }

    if (eventType === "user.updated") {
      await updateUserSafely(payload.data);
    }

    if (eventType === "user.deleted") {
      await deleteUserSafely(payload.data.id);
    }

    return new Response("", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook event:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Вспомогательные функции

function generateUsername(data: any): string {
  return (
    data.username ||
    data.email_addresses?.[0]?.email_address?.split("@")[0] ||
    `user_${Math.random().toString(36).substring(2, 8)}`
  ).toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 20);
}

async function createUserWithFallback(data: any, username: string) {
  try {
    await db.user.create({
      data: {
        externalUserId: data.id,
        username: username,
        imageUrl: data.image_url,
        stream: {
          create: {
            name: `Стрим ${username}`,
          },
        },
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Пользователь уже существует, возможно обновляем
      await db.user.update({
        where: { externalUserId: data.id },
        data: {
          username: username,
          imageUrl: data.image_url,
        },
      });
    } else {
      throw error;
    }
  }
}

async function updateUserSafely(data: any) {
  try {
    await db.user.update({
      where: { externalUserId: data.id },
      data: {
        username: data.username,
        imageUrl: data.image_url,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Пользователь не найден, возможно создаем
      const username = generateUsername(data);
      await createUserWithFallback(data, username);
    } else {
      throw error;
    }
  }
}

async function deleteUserSafely(userId: string) {
  try {
    await resetIngresses(userId);
    await db.user.delete({
      where: { externalUserId: userId },
    });
  } catch (error: any) {
    if (error.code !== 'P2025') { // Игнорируем ошибку "не найден"
      throw error;
    }
  }
}