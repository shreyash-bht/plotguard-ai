import { coreApi } from "@/services/api-client";
import type { Content, Season, StoryUnit } from "@/types/content";

/** GET /api/v1/contents */
export function listContents(signal?: AbortSignal): Promise<Content[]> {
  return coreApi.get<Content[]>("/v1/contents", signal);
}

/** GET /api/v1/contents/{contentId} */
export function getContent(
  contentId: string,
  signal?: AbortSignal,
): Promise<Content> {
  return coreApi.get<Content>(`/v1/contents/${contentId}`, signal);
}

/** GET /api/v1/contents/{contentId}/seasons */
export function listSeasons(
  contentId: string,
  signal?: AbortSignal,
): Promise<Season[]> {
  return coreApi.get<Season[]>(`/v1/contents/${contentId}/seasons`, signal);
}

/** GET /api/v1/contents/{contentId}/story-units */
export function listStoryUnits(
  contentId: string,
  signal?: AbortSignal,
): Promise<StoryUnit[]> {
  return coreApi.get<StoryUnit[]>(`/v1/contents/${contentId}/story-units`, signal);
}
