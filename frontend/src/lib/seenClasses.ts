import type { ClassItem } from './api';

const SEEN_VIDEOS_KEY = 'classboard_seen_videos';
const VISITED_CLASSES_KEY = 'classboard_visited_classes';
const BASELINE_KEY = 'classboard_seen_classes_baseline';
const CHANGE_EVENT = 'classboard:seen-classes-changed';

export interface ClassNotification {
  item: ClassItem;
  isNewClass: boolean;
  unseenVideoCount: number;
}

function videoKeysFor(item: Pick<ClassItem, 'videoUrl' | 'extraVideos'>): string[] {
  const keys: string[] = [];
  if (item.videoUrl) keys.push('main');
  for (const v of item.extraVideos ?? []) keys.push(v.id);
  return keys;
}

function compositeKey(classId: string, videoKey: string): string {
  return `${classId}::${videoKey}`;
}

function getStringSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveStringSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

export const seenClasses = {
  // On a visitor's very first-ever visit, mark every video currently on
  // every upcoming class as already seen — otherwise all existing content
  // would show up as "new" notifications the first time someone loads the
  // site.
  ensureBaseline(classes: ClassItem[]) {
    if (localStorage.getItem(BASELINE_KEY)) return;
    const seenVideos = getStringSet(SEEN_VIDEOS_KEY);
    for (const item of classes) {
      for (const key of videoKeysFor(item)) seenVideos.add(compositeKey(item.id, key));
    }
    saveStringSet(SEEN_VIDEOS_KEY, seenVideos);
    localStorage.setItem(BASELINE_KEY, '1');
  },
  // Call when a visitor opens a class's detail page — marks that class,
  // and every video currently on it, as seen. If the admin later adds
  // another video to the same class, only that new video will be unseen.
  markClassVisited(item: Pick<ClassItem, 'id' | 'videoUrl' | 'extraVideos'>) {
    const visited = getStringSet(VISITED_CLASSES_KEY);
    visited.add(item.id);
    saveStringSet(VISITED_CLASSES_KEY, visited);

    const seenVideos = getStringSet(SEEN_VIDEOS_KEY);
    for (const key of videoKeysFor(item)) seenVideos.add(compositeKey(item.id, key));
    saveStringSet(SEEN_VIDEOS_KEY, seenVideos);

    window.dispatchEvent(new Event(CHANGE_EVENT));
  },
  getNotifications(classes: ClassItem[]): ClassNotification[] {
    const seenVideos = getStringSet(SEEN_VIDEOS_KEY);
    const visited = getStringSet(VISITED_CLASSES_KEY);
    const notifications: ClassNotification[] = [];
    for (const item of classes) {
      const unseenVideoCount = videoKeysFor(item).filter(
        (key) => !seenVideos.has(compositeKey(item.id, key)),
      ).length;
      if (unseenVideoCount === 0) continue;
      notifications.push({ item, isNewClass: !visited.has(item.id), unseenVideoCount });
    }
    return notifications;
  },
  onChange(listener: () => void): () => void {
    window.addEventListener(CHANGE_EVENT, listener);
    return () => window.removeEventListener(CHANGE_EVENT, listener);
  },
};
