import path from 'path';
import { ANNOUNCEMENTS_FILE, DATA_DIR } from '../config/constants';
import { readJsonFileSafely, writeJsonFileSafely } from '../utils/fileStore';

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  type?: string;
  createdAt?: string;
  author?: string;
  badge?: string;
  [key: string]: any;
}

export class AnnouncementRepository {
  private getInitialSeed(): AnnouncementRecord[] {
    const seedFile = path.join(DATA_DIR, 'announcements.json');
    return readJsonFileSafely<AnnouncementRecord[]>(seedFile, []);
  }

  getAll(): AnnouncementRecord[] {
    let list = readJsonFileSafely<AnnouncementRecord[]>(ANNOUNCEMENTS_FILE, []);
    if (list.length === 0) {
      list = this.getInitialSeed();
      if (list.length > 0) {
        this.saveAll(list);
      }
    }
    return list;
  }

  saveAll(records: AnnouncementRecord[]): void {
    writeJsonFileSafely(ANNOUNCEMENTS_FILE, records);
  }
}

export const announcementRepository = new AnnouncementRepository();
