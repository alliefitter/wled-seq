import type {
  CreateResponse,
  LedSequence,
  SequenceListItem,
  SequenceResponse,
  WledHostResponse,
} from "./types/api";
import { getConfig } from "./config.ts";

const API_URL = getConfig("API_URL");

const handleError = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    console.error(response.status, text);
    throw new Error(text);
  }
};

export const listWledHosts = async (): Promise<WledHostResponse[]> => {
  const response = await fetch(`${API_URL}/wled-host`, {
    method: "GET",
  });
  await handleError(response);
  return response.json();
};

export const listSequences = async (
  hostId: string | null = null,
): Promise<SequenceListItem[]> => {
  let url = `${API_URL}/sequence`;
  if (hostId) {
    url = `${url}?hostId=${hostId}`;
  }
  const response = await fetch(url, {
    method: "GET",
  });
  await handleError(response);
  return response.json();
};

export const executeSequence = async (
  hostId: string,
  sequence: LedSequence,
): Promise<void> => {
  const response = await fetch(`${API_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      host_id: hostId,
      sequence: sequence,
    }),
  });
  await handleError(response);
};

export const executeSequenceById = async (id: string) => {
  const response = await fetch(`${API_URL}/execute/by-id/${id}`, {
    method: "post",
  });
  await handleError(response);
};

export const executeRandom = async (hostId: string, sleep_time: number) => {
  const response = await fetch(
    `${API_URL}/wled-host/${hostId}/execute-random`,
    {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sleep_time: sleep_time }),
    },
  );
  await handleError(response);
};

export const createSequence = async (
  hostId: string,
  name: string,
  sequence: LedSequence,
): Promise<CreateResponse> => {
  const response = await fetch(`${API_URL}/sequence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      host_id: hostId,
      name: name,
      sequence: sequence,
    }),
  });
  await handleError(response);

  return response.json();
};

export const updateSequence = async (
  id: string,
  hostId: string,
  name: string,
  sequence: LedSequence,
): Promise<void> => {
  const response = await fetch(`${API_URL}/sequence/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      host_id: hostId,
      name: name,
      sequence: sequence,
    }),
  });
  await handleError(response);
};

export const getSequence = async (id: string): Promise<SequenceResponse> => {
  const response = await fetch(`${API_URL}/sequence/${id}`);
  await handleError(response);

  return response.json();
};

export const deleteSequence = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/sequence/${id}`, {
    method: "delete",
  });
  await handleError(response);
};

export const createWledHost = async (url: string): Promise<CreateResponse> => {
  const response = await fetch(`${API_URL}/wled-host`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
    }),
  });
  await handleError(response);

  return response.json();
};

export const updateWledHost = async (
  id: string,
  url: string,
): Promise<CreateResponse> => {
  const response = await fetch(`${API_URL}/wled-host/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
    }),
  });
  await handleError(response);

  return response.json();
};

export const deleteWledHost = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/wled-host/${id}`, {
    method: "delete",
  });
  await handleError(response);
};

export type Palettes = {
  id: number;
  value: string;
};

export type EffectField = {
  key: string;
  label: string;
};

export type Effects = {
  id: number;
  value: string;
  fields: EffectField[];
  uses_palette: boolean;
  colors: string[];
};

const processPalettes = (data: string[]) => {
  const processedData = data.map((d, i) => [i, d]);
  const sortedData = processedData.sort((a, b) => {
    if (a[1] === b[1]) {
      return 0;
    } else {
      return a[1] < b[1] ? -1 : 1;
    }
  });
  return sortedData.map(([i, d]) => {
    return { id: i as number, value: d as string };
  });
};

export const getEffects = async (hostId: string): Promise<Effects[]> => {
  const response = await fetch(`${API_URL}/wled-host/${hostId}/effects`);
  await handleError(response);

  const effects: Effects[] = await response.json();
  return effects.sort((a, b) => {
    if (a.value === b.value) {
      return 0;
    } else {
      return a.value < b.value ? -1 : 1;
    }
  });
};

export const getPalettes = async (hostId: string): Promise<Palettes[]> => {
  const response = await fetch(`${API_URL}/wled-host/${hostId}/palettes`);
  await handleError(response);

  return processPalettes(await response.json());
};
