/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

export type On = true | false | "t" | "f";
export type ColItem = number;

export interface CreateResponse {
  id: string;
}
export interface EffectField {
  key: string;
  label: string;
}
export interface EffectsItem {
  id: number;
  value: string;
  fields: EffectField[];
  uses_palette: boolean;
  colors: string[];
}
export interface ExecuteRandomRequest {
  sleep_time: number;
}
export interface ExecuteSequenceRequest {
  host_id: string;
  sequence: LedSequence;
}
export interface LedSequence {
  /**
   * Repeat the sequence until changed.
   */
  repeat?: boolean;
  /**
   * Execute items in a random order.
   */
  random?: boolean;
  /**
   * An array of sequence elements.
   */
  elements?: WledSequenceElement[];
  [k: string]: unknown;
}

export interface VisualSegItem extends Omit<
  SegItem,
  "id" | "start" | "stop" | "startY" | "stopY" | "len" | "grp" | "spc"
> {
  segments: Segment[];
}

export type VisualWledState = Omit<WledState, "seg"> & {
  seg?: VisualSegItem[];
};

export type VisualSequenceElement = Omit<WledSequenceElement, "state"> & {
  state?: VisualWledState;
};

export interface VisualLedSequence extends Omit<LedSequence, "elements"> {
  elements?: VisualSequenceElement[];
}
export interface WledSequenceElement {
  /**
   * Reference another sequence by Id.
   */
  $ref?: string | null;
  /**
   * The WLED JSON API state object. See: https://kno.wled.ge/interfaces/json-api/
   */
  state?: WledState | null;
  /**
   * How long the sequence item should be displayed until the next item is displayed.
   */
  sleep_time?: number;
  [k: string]: unknown;
}
export interface WledState {
  /**
   * On/Off state of the light. You can also use 't' to toggle.
   */
  on?: On | null;
  /**
   * Brightness of the light (0–255).
   */
  bri?: number | null;
  /**
   * Default transition time in tenths of a second.
   */
  transition?: number | null;
  /**
   * Temporary transition time for next change only.
   */
  tt?: number | null;
  /**
   * Preset ID to apply.
   */
  ps?: number | null;
  /**
   * Save current state to given preset ID.
   */
  psave?: number | null;
  /**
   * Nightlight configuration.
   */
  nl?: Nl | null;
  /**
   * UDP sync configuration.
   */
  udpn?: Udpn | null;
  /**
   * Enable or disable live data mode.
   */
  live?: boolean | null;
  /**
   * Live data override mode: 0=off, 1=until live ends, 2=until reboot.
   */
  lor?: number | null;
  /**
   * Set system time (Unix timestamp).
   */
  time?: number | null;
  /**
   * Index of the main segment.
   */
  mainseg?: number | null;
  /**
   * Array of segment objects.
   */
  seg?: SegItem[] | null;
}
export interface Nl {
  /**
   * Turn nightlight on or off.
   */
  on?: boolean | null;
  /**
   * Duration in minutes.
   */
  dur?: number | null;
  /**
   * Mode: 0=instant, 1=fade, 2=color fade, 3=sunrise.
   */
  mode?: number | null;
  /**
   * Target brightness at the end.
   */
  tbri?: number | null;
}
export interface Udpn {
  /**
   * Enable UDP send.
   */
  send?: boolean | null;
  /**
   * Enable UDP receive.
   */
  recv?: boolean | null;
  /**
   * Send group.
   */
  sgrp?: number | null;
  /**
   * Receive group.
   */
  rgrp?: number | null;
  /**
   * Do not send notifications.
   */
  nn?: boolean | null;
}
export interface SegItem {
  /**
   * Segment ID.
   */
  id?: number | null;
  /**
   * Start LED index.
   */
  start?: number | null;
  /**
   * Stop LED index (exclusive).
   */
  stop?: number | null;
  /**
   * Start row (2D mode).
   */
  startY?: number | null;
  /**
   * Stop row (2D mode).
   */
  stopY?: number | null;
  /**
   * Length (stop - start).
   */
  len?: number | null;
  /**
   * LEDs per group.
   */
  grp?: number | null;
  /**
   * LEDs to skip between groups.
   */
  spc?: number | null;
  /**
   * Offset/rotation amount.
   */
  of?: number | null;
  /**
   * Reverse horizontally (1D) or X-axis (2D).
   */
  rev?: boolean | null;
  /**
   * Reverse vertically (2D).
   */
  rY?: boolean | null;
  /**
   * Enable/disable this segment.
   */
  on?: boolean | null;
  /**
   * Segment brightness.
   */
  bri?: number | null;
  /**
   * Mirror horizontally (1D).
   */
  mi?: boolean | null;
  /**
   * Mirror vertically (2D).
   */
  mY?: boolean | null;
  /**
   * Transpose (swap X/Y axes in 2D).
   */
  tp?: boolean | null;
  /**
   * Color temperature (0–255).
   */
  cct?: number | null;
  /**
   * Colors: up to 3 [R,G,B] or [R,G,B,W] arrays or hex strings.
   */
  col?:
    | [ColItem[] | string]
    | [ColItem[] | string, ColItem[] | string]
    | [ColItem[] | string, ColItem[] | string, ColItem[] | string]
    | null;
  /**
   * Effect ID or special code (~, ~-, r).
   */
  fx?: number | string | null;
  /**
   * Effect speed or code.
   */
  sx?: number | string | null;
  /**
   * Effect intensity or code.
   */
  ix?: number | string | null;
  /**
   * Custom parameter 1.
   */
  c1?: number | null;
  /**
   * Custom parameter 2.
   */
  c2?: number | null;
  /**
   * Custom parameter 3.
   */
  c3?: number | null;
  /**
   * Custom boolean 1.
   */
  o1?: boolean | null;
  /**
   * Custom boolean 2.
   */
  o2?: boolean | null;
  /**
   * Custom boolean 3.
   */
  o3?: boolean | null;
  /**
   * Palette ID or 'r' for random.
   */
  pal?: number | string | null;
  /**
   * Select this segment.
   */
  sel?: boolean | null;
  /**
   * Matrix expand mode (0=pixels, 1=bar, 2=arc, 3=corner, etc).
   */
  m12?: number | null;
  /**
   * Load default parameters from effect.
   */
  fxdef?: boolean | null;
  /**
   * Segment group/set index.
   */
  set?: number | null;
  /**
   * Repeat this segment pattern to fill LEDs.
   */
  rpt?: boolean | null;
}
export interface PlaylistRequest {
  name: string;
  repeat: boolean;
  shuffle: boolean;
  track_time: number | null;
  tracks: Track[];
}
export interface Track {
  id: string;
  sequence_id: string;
  name: string;
  overrides: TrackOverrides;
}
export interface TrackOverrides {
  track_time?: number | null;
  repeat?: boolean | null;
  [k: string]: unknown;
}
export interface PlaylistResponse {
  id: string;
  name: string;
  repeat: boolean;
  shuffle: boolean;
  track_time?: number | null;
  tracks: Track[];
}
export interface Segment {
  id: number;
  name: string;
  start: number;
  stop?: number | null;
  start_y?: number | null;
  stop_y?: number | null;
  length?: number | null;
  grouping?: number | null;
  spacing?: number | null;
}
export interface SegmentSetRequest {
  host_id: string;
  name: string;
  segments: Segment[];
}
export interface SegmentSetResponse {
  host_id: string;
  name: string;
  segments: Segment[];
  id: string;
  host: string;
}
export interface SequenceListItem {
  id: string;
  host_id: string;
  host: string;
  segment_set_id: string;
  name: string;
}
export interface SequenceRequest {
  host_id: string;
  segment_set_id: string;
  name: string;
  sequence: LedSequence;
}
export interface SequenceResponse {
  id: string;
  host_id: string;
  host: string;
  segment_set_id: string;
  name: string;
  sequence: LedSequence;
}
export interface WledHostRequest {
  url: string;
}
export interface WledHostResponse {
  id: string;
  url: string;
  segment_sets: SegmentSetResponse[];
}
