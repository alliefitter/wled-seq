import type {
  CreateResponse,
  LedSequence,
  ListPlaylistFilters,
  ListResponse,
  ListSegmentSetFilters,
  ListSequenceFilters,
  PlaylistResponse,
  Segment,
  SegmentSetResponse,
  SequenceListItem,
  SequenceResponse,
  Track,
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

export const stopWledHost = async (hostId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/wled-host/${hostId}/stop`, {
    method: "POST",
  });
  await handleError(response);
};

export const powerOffWledHost = async (hostId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/wled-host/${hostId}/power-off`, {
    method: "POST",
  });
  await handleError(response);
};

export const listSequences = async (
  filters: ListSequenceFilters,
  limit: number,
  cursor: string | null = null,
): Promise<ListResponse<SequenceListItem[]>> => {
  const url = `${API_URL}/sequence`;
  const params = new URLSearchParams();
  params.append("size", limit.toString());
  if (cursor) {
    params.append("cursor", cursor);
  }
  if (filters?.hosts) {
    filters.hosts.forEach((h) => params.append("hostId", h));
  }
  if (filters?.name) {
    params.append("name", filters.name);
  }
  const response = await fetch(`${url}?${params}`, {
    method: "GET",
  });
  await handleError(response);
  return response.json();
};

export const executeSequence = async (
  hostId: string,
  sequence: LedSequence,
  segmentSetId: string,
): Promise<void> => {
  const response = await fetch(`${API_URL}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      host_id: hostId,
      sequence: sequence,
      segment_set_id: segmentSetId,
    }),
  });
  await handleError(response);
};

export const executeSequenceById = async (id: string) => {
  const response = await fetch(`${API_URL}/sequence/${id}/execute`, {
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
  segmentSetId: string,
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
      segment_set_id: segmentSetId,
      sequence: sequence,
    }),
  });
  await handleError(response);

  return response.json();
};

export const updateSequence = async (
  id: string,
  hostId: string,
  segmentSetId: string,
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
      segment_set_id: segmentSetId,
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

export const createPlaylist = async (
  name: string,
  repeat: boolean,
  shuffle: boolean,
  trackTime: number | null,
  tracks: Track[],
): Promise<CreateResponse> => {
  const response = await fetch(`${API_URL}/playlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      repeat: repeat,
      shuffle: shuffle,
      track_time: trackTime,
      tracks: tracks,
    }),
  });
  await handleError(response);

  return response.json();
};

export const updatePlaylist = async (
  id: string,
  name: string,
  repeat: boolean,
  shuffle: boolean,
  trackTime: number | null,
  tracks: Track[],
): Promise<void> => {
  const response = await fetch(`${API_URL}/playlist/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      repeat: repeat,
      shuffle: shuffle,
      track_time: trackTime,
      tracks: tracks,
    }),
  });
  await handleError(response);
};

export const executePlaylistId = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/playlist/${id}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  await handleError(response);
};

export const executePlaylist = async (
  name: string,
  repeat: boolean,
  shuffle: boolean,
  trackTime: number | null,
  tracks: Track[],
): Promise<CreateResponse> => {
  const response = await fetch(`${API_URL}/executePlaylist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      repeat: repeat,
      shuffle: shuffle,
      track_time: trackTime,
      tracks: tracks,
    }),
  });
  await handleError(response);

  return response.json();
};

export const getPlaylist = async (id: string): Promise<PlaylistResponse> => {
  const response = await fetch(`${API_URL}/playlist/${id}`);
  await handleError(response);

  return response.json();
};

export const listPlaylists = async (
  filters: ListPlaylistFilters,
  limit: number,
  cursor: string | null,
): Promise<ListResponse<PlaylistResponse[]>> => {
  const params = new URLSearchParams();
  params.append("size", limit.toString());
  if (cursor) {
    params.append("cursor", cursor);
  }
  if (filters.name) {
    params.append("name", filters.name);
  }
  const response = await fetch(`${API_URL}/playlist?${params}`);
  await handleError(response);

  return response.json();
};

export const deletePlaylist = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/playlist/${id}`, {
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

export const getSegmentSet = async (
  id: string,
): Promise<SegmentSetResponse> => {
  const response = await fetch(`${API_URL}/segment-set/${id}`);
  await handleError(response);

  return response.json();
};

export const listSegmentSets = async (
  filters: ListSegmentSetFilters,
  limit: number,
  cursor: string | null,
): Promise<ListResponse<SegmentSetResponse[]>> => {
  const params = new URLSearchParams();
  params.append("size", limit.toString());
  if (cursor) {
    params.append("cursor", cursor);
  }
  if (filters?.hosts) {
    filters.hosts.forEach((h) => params.append("hostId", h));
  }
  if (filters?.name) {
    params.append("name", filters.name);
  }
  const response = await fetch(`${API_URL}/segment-set?${params}`);
  await handleError(response);

  return response.json();
};

export const listWledHostSegmentSets = async (
  hostId: string,
): Promise<SegmentSetResponse[]> => {
  const response = await fetch(`${API_URL}/wled-host/${hostId}/segment-set`);
  await handleError(response);

  return response.json();
};

export const createSegmentSet = async (
  name: string,
  hostId: string,
  segments: Segment[],
): Promise<CreateResponse> => {
  const response = await fetch(`${API_URL}/segment-set`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      host_id: hostId,
      segments,
    }),
  });
  await handleError(response);

  return response.json();
};

export const updateSegmentSet = async (
  id: string,
  name: string,
  hostId: string,
  segments: Segment[],
): Promise<void> => {
  const response = await fetch(`${API_URL}/segment-set/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      host_id: hostId,
      segments,
    }),
  });
  await handleError(response);
};

export const deleteSegmentSet = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/segment-set/${id}`, {
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
