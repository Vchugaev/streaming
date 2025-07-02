"use server";

import {
  IngressAudioEncodingPreset,
  IngressInput,
  IngressClient,
  IngressVideoEncodingPreset,
  RoomServiceClient,
  TrackSource,
  type CreateIngressOptions,
} from "livekit-server-sdk";


import { db } from "@/lib/db";
import { getSelf } from "@/lib/auth-service";
import { revalidatePath } from "next/cache";

const roomService = new RoomServiceClient(
  process.env.LIVEKIT_API_URL!,
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!,
);

const ingressClient = new IngressClient(process.env.LIVEKIT_API_URL!);

export const resetIngresses = async (hostIdentity: string) => {
  const ingresses = await ingressClient.listIngress({
    roomName: hostIdentity,
  });

  const rooms = await roomService.listRooms([hostIdentity]);

  for (const room of rooms) {
    await roomService.deleteRoom(room.name);
  }

  for (const ingress of ingresses) {
    if (ingress.ingressId) {
      await ingressClient.deleteIngress(ingress.ingressId);
    }
  }
};

export const createIngress = async (ingressType: IngressInput) => {
  const self = await getSelf();

  // await resetIngresses(self.id);
  
  await resetAllIngressesAndRooms();
  const options: any = {
    name: self.username,
    roomName: self.id,
    participantName: self.username,
    participantIdentity: self.id,
  };

  if (ingressType === IngressInput.WHIP_INPUT) {
    options.bypassTranscoding = true;
  } else {
    options.video = {
      source: TrackSource.CAMERA,
      preset: IngressVideoEncodingPreset.H264_1080P_30FPS_3_LAYERS,
    };
    options.audio = {
      source: TrackSource.MICROPHONE,
      preset: IngressAudioEncodingPreset.OPUS_STEREO_96KBPS
    };
  };

  const ingress = await ingressClient.createIngress(
    ingressType,
    options,
  );

  if (!ingress || !ingress.url || !ingress.streamKey) {
    throw new Error("Failed to create ingress");
  }

  await db.stream.update({
    where: { userId: self.id },
    data: {
      ingressId: ingress.ingressId,
      serverUrl: ingress.url,
      streamKey: ingress.streamKey,
    },
  });

  revalidatePath(`/u/${self.username}/keys`);
  return ingress;
};









export const resetAllIngressesAndRooms = async () => {
  try {
    // 1. Удаляем все ingress-объекты
    const allIngresses = await ingressClient.listIngress();
    await Promise.all(
      allIngresses.map(ingress => 
        ingress.ingressId ? ingressClient.deleteIngress(ingress.ingressId) : Promise.resolve()
      )
    );

    // 2. Удаляем все комнаты
    const allRooms = await roomService.listRooms();
    await Promise.all(
      allRooms.map(room => roomService.deleteRoom(room.name))
    );

    console.log("All ingresses and rooms have been deleted");
    return { success: true };
  } catch (error) {
    console.error("Error resetting all ingresses and rooms:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};