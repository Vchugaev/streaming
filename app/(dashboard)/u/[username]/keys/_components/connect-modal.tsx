"use client";

import { toast } from "sonner";
import { useState, useTransition, useRef, ElementRef } from "react";
import { AlertTriangle } from "lucide-react";

import { createIngress } from "@/actions/ingress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Замените enum на строковые константы
const RTMP = "0"; // IngressInput.RTMP_INPUT обычно равно 0
const WHIP = "1"; // IngressInput.WHIP_INPUT обычно равно 1

type IngressType = typeof RTMP | typeof WHIP;

export const ConnectModal = () => {
  const closeRef = useRef<ElementRef<"button">>(null);
  const [isPending, startTransition] = useTransition();
  const [ingressType, setIngressType] = useState<IngressType>(RTMP);

  const onSubmit = () => {
    startTransition(() => {
      createIngress(parseInt(ingressType))
        .then(() => {
          toast.success("Ingress created");
          closeRef?.current?.click();
        })
        .catch(() => toast.error("Something went wrong"));
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">
          Сгенерировать подключение
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сгенерировать подключение</DialogTitle>
        </DialogHeader>
        <Select
          disabled={isPending}
          value={ingressType}
          onValueChange={(value) => setIngressType(value as IngressType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Ingress Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={RTMP}>RTMP</SelectItem>
            <SelectItem value={WHIP}>WHIP</SelectItem>
          </SelectContent>
        </Select>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Осторожно!</AlertTitle>
          <AlertDescription>
            Это действие сбросит все активные потоки, использующие текущее соединение.
          </AlertDescription>
        </Alert>
        <div className="flex justify-between">
          <DialogClose ref={closeRef} asChild>
            <Button variant="ghost">
              Отмена
            </Button>
          </DialogClose>
          <Button
            disabled={isPending}
            onClick={onSubmit}
            variant="primary"
          >
            Генерировать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};