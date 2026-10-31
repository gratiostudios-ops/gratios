import { agentIconKeys } from './agent-icon-keys';
import type { StickerKey } from '../agent-icons';
export const marketplaceArtworkOptions = [
  { asset: 'brief', label: 'Notes', sticker: 'sticker-notes' },
  { asset: 'calendar', label: 'Calendar', sticker: 'sticker-calendar' },
  { asset: 'flight', label: 'Travel', sticker: 'sticker-flight' },
  { asset: 'video', label: 'Video', sticker: 'sticker-video' },
  { asset: 'mail', label: 'Email', sticker: 'sticker-email' },
  { asset: 'gym', label: 'Fitness', sticker: 'sticker-fitness' },
] as const;
export type MarketplaceArtworkKey = typeof marketplaceArtworkOptions[number]['asset'] | StickerKey;
export type MarketplaceArtwork = { asset: MarketplaceArtworkKey; mediaId?: never; uri?: never } | { mediaId: string; uri?: string; asset?: never };
export type MarketplaceCover = { mediaId: string; uri?: string; asset?: never };
export function isMarketplaceArtwork(value: unknown): value is MarketplaceArtwork {
  if (!value || typeof value !== 'object') return false;
  const image = value as { asset?: unknown; mediaId?: unknown; uri?: unknown };
  const keys = Object.keys(value);
  if (typeof image.mediaId === 'string') return /^[0-9a-f-]{36}$/i.test(image.mediaId) && keys.every(key => ['mediaId', 'uri'].includes(key));
  return keys.length === 1 && typeof image.asset === 'string' && (marketplaceArtworkOptions.some(option => option.asset === image.asset) || agentIconKeys.some(key => key === image.asset));
}

export type MarketVersion = {
  id: string; version_number: number; name: string; description: string; artwork: MarketplaceArtwork;
  cover?: MarketplaceCover | null; instructions: string; required_tools: string[]; published_at: string | null;
};
export type MarketListing = {
  id: string; name: string; description: string; artwork: MarketplaceArtwork;
  creator_user_id: string | null; latest_published_version_id: string | null;
  cover?: MarketplaceCover | null; install_count?: number; featured_order?: number | null;
};
export type CreatorListing = MarketListing & { source_agent_id: string; status: 'draft' | 'published' | 'unpublished' };
export type OwnListing = CreatorListing & { versions: MarketVersion[] };
export type Installation = {
  id: string; agent_id: string; marketplace_agent_id: string; version_id: string;
  name: string; enabled: boolean; missing_setup: string[]; latest_published_version_id: string;
};
export type SetupResult = { agentId: string; enabled: boolean; missingSetup: string[] };
export type InstallResult = { agentId: string; installationId: string; versionId: string; missingSetup: string[]; enabled?: boolean; existing?: boolean };
export type UpdateResult = SetupResult & { installationId: string; versionId: string };
export type MarketDetail = { listing: MarketListing; versions: MarketVersion[] };
export type DraftResult = { listing: CreatorListing; draft: MarketVersion };
export type DraftChanges = Pick<MarketVersion, 'name' | 'description' | 'artwork' | 'instructions'> & { requiredTools: string[]; cover?: MarketplaceCover | null };
export type MarketTransport = { request<T>(path: string, init?: RequestInit): Promise<T> };
const root = '/gateway/marketplace';
const segment = (value: string) => encodeURIComponent(value);
export function createMarketplaceClient(transport: MarketTransport) {
  const mutate = <T>(path: string, method: string, body?: unknown) => transport.request<T>(root + path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return {
    catalog: (sort: 'top' | 'featured' | 'newest', query = '', offset = 0) => transport.request<{ agents: MarketListing[]; limit: number; offset: number }>(root + '?sort=' + sort + '&q=' + encodeURIComponent(query) + '&limit=20&offset=' + offset),
    mine: () => transport.request<{ listings: OwnListing[] }>(root + '/mine'),
    installations: () => transport.request<{ installations: Installation[] }>(root + '/installations'),
    detail: (id: string) => transport.request<MarketDetail>(root + '/' + segment(id)),
    createDraft: (agentId: string) => mutate<DraftResult>('/drafts', 'POST', { agentId }),
    nextDraft: (id: string) => mutate<{ draft: MarketVersion }>('/' + segment(id) + '/draft', 'POST', {}),
    saveDraft: async (id: string, changes: DraftChanges) => {
      if (!isMarketplaceArtwork(changes.artwork)) throw new Error('Choose one of the supported publishing artworks.');
      return mutate<{ draft: MarketVersion }>('/' + segment(id) + '/draft', 'PATCH', { ...changes, artwork: changes.artwork.mediaId ? { mediaId: changes.artwork.mediaId } : changes.artwork, ...(changes.cover === undefined ? {} : { cover: changes.cover ? { mediaId: changes.cover.mediaId } : null }) });
    },
    publish: (id: string, versionId: string) => mutate('/' + segment(id) + '/publish', 'POST', { versionId }),
    unpublish: (id: string) => mutate('/' + segment(id) + '/unpublish', 'POST', {}),
    install: (id: string, acceptedTools: string[], preferences: string) => mutate<InstallResult>('/' + segment(id) + '/install', 'POST', { acceptedTools, preferences }),
    enable: (id: string, enabled: boolean) => mutate<SetupResult>('/installations/' + segment(id), 'PATCH', { enabled }),
    update: (id: string, versionId: string, acceptedTools: string[]) => mutate<UpdateResult>('/installations/' + segment(id) + '/update', 'POST', { versionId, acceptedTools }),
    uninstall: (id: string) => mutate('/installations/' + segment(id), 'DELETE'),
  };
}
export function publishedVersion(detail: MarketDetail) {
  return detail.versions.find(version => version.id === detail.listing.latest_published_version_id);
}
export function toolLabel(name: string) {
  const labels: Record<string, string> = { reply_chat: 'Reply in chat', create_home_card: 'Update agent cards', request_notification: 'Request notifications', gmail_read: 'Read Gmail', gmail_search: 'Search Gmail', calendar_list: 'Read Calendar', calendar_create: 'Create calendar events', calendar_update: 'Edit calendar events', calendar_delete: 'Delete calendar events', task_create: 'Create tasks', task_complete: 'Complete tasks', agenda_list: 'Read your agenda', schedule_self: 'Schedule agent runs', update_schedule: 'Change schedules', cancel_schedule: 'Cancel schedules' };
  return labels[name] ?? name.replaceAll('_', ' ');
}
export function setupLabel(value: string) {
  if (value.includes('permission:')) return 'Allow ' + toolLabel(value.split('permission:')[1]);
  if (/gmail/i.test(value)) return 'Connect Gmail with read access';
  if (/calendar|task_/i.test(value)) return 'Connect Google Calendar and Tasks';
  return value.replaceAll('_', ' ').replaceAll(':', ': ');
}
