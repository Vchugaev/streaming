import { currentUser } from "@clerk/nextjs";

export interface NormalizedUser {
  id: string;
  username: string;
  imageUrl: string;
  email?: string;
  // другие необходимые поля
}

export const getNormalizedCurrentUser = async (): Promise<NormalizedUser> => {
  const user = await currentUser();

  if (!user) {
    return null
  }

  // Получаем username (из username или email)
  let username = user.username;
  if (!username) {
    const email = user.emailAddresses?.[0]?.emailAddress || user.emailAddress;
    if (!email)
      throw new Error("Cannot determine username - no username or email");
    username = email.split("@")[0];
  }

  // Нормализуем username (опционально)
  username = username.toLowerCase().replace(/[^a-z0-9_]/g, "_");

  return {
    id: user.id,
    username,
    imageUrl: user.imageUrl,
    email: user.emailAddresses?.[0]?.emailAddress || user.emailAddress,
    // другие нужные поля
  };
};
