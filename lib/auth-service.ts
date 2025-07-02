import { currentUser } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { getNormalizedCurrentUser } from "./auth-rofls";

// Вспомогательная функция для получения username из данных пользователя
function getNormalizedUsername(user: any): string {
  if (user.username) return user.username;
  
  // Берем первый email, если username нет
  const email = user.emailAddresses?.[0]?.emailAddress || user.emailAddress;
  if (email) {
    return email.split('@')[0];
  }
  
  throw new Error("Cannot determine username - no username or email available");
}

export const getSelf = async () => {
  const self = await getNormalizedCurrentUser();

  if (!self) {
    throw new Error("Unauthorized");
  }

  // Получаем нормализованный username
  const username = getNormalizedUsername(self);

  const user = await db.user.findUnique({
    where: { externalUserId: self.id },
  });

  if (!user) {
    throw new Error("Not found");
  }

  return user;
};

export const getSelfByUsername = async (username: string) => {
  const self = await getNormalizedCurrentUser();

  if (!self) {
    throw new Error("Unauthorized");
  }

  // Получаем нормализованный username текущего пользователя
  const currentUsername = getNormalizedUsername(self);

  const user = await db.user.findUnique({
    where: { username }
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Сравниваем с нормализованным username
  if (currentUsername !== user.username) {
    throw new Error("Unauthorized");
  }

  return user;
};