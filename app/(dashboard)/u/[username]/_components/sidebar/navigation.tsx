"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { 
  Fullscreen,
  KeyRound,
  MessageSquare,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { NavItem, NavItemSkeleton } from "./nav-item";

// Вспомогательная функция для клиентских компонентов
const getNormalizedUsername = (user: any) => {
  if (!user) return null;
  
  // Сначала пробуем взять username
  if (user.username) return user.username;
  
  // Если username нет, берем email
  const email = user.primaryEmailAddress?.emailAddress || 
               user.emailAddresses?.[0]?.emailAddress;
  
  if (email) {
    return email.split('@')[0];
  }
  
  return null;
};

export const Navigation = () => {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [username, setUsername] = useState<string | null>(null);

  // Эффект для вычисления username
  useEffect(() => {
    if (user) {
      const normalizedUsername = getNormalizedUsername(user);
      setUsername(normalizedUsername);
    }
  }, [user]);

  const routes = [
    {
      label: "Стрим",
      href: username ? `/u/${username}` : "#",
      icon: Fullscreen,
    },
    {
      label: "Ключи",
      href: username ? `/u/${username}/keys` : "#",
      icon: KeyRound,
    },
    {
      label: "Чат",
      href: username ? `/u/${username}/chat` : "#",
      icon: MessageSquare,
    },
    {
      label: "Пользователи",
      href: username ? `/u/${username}/community` : "#",
      icon: Users,
    },
  ];

  // Показываем скелетоны если данные еще загружаются
  if (!isLoaded || !username) {
    return (
      <ul className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <NavItemSkeleton key={i} />
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2 px-2 pt-4 lg:pt-0">
      {routes.map((route) => (
        <NavItem
          key={route.href}
          label={route.label}
          icon={route.icon}
          href={route.href}
          isActive={pathname === route.href}
        />
      ))}
    </ul>
  );
};