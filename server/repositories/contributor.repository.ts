import path from 'path';
import { CONTRIBUTORS_FILE, DATA_DIR } from '../config/constants';
import { readJsonFileSafely, writeJsonFileSafely } from '../utils/fileStore';

export interface ContributorRecord {
  id: string;
  name: string;
  studentId?: string;
  className?: string;
  email?: string;
  filesCount: number;
  entriesCount: number;
  rank: number;
  department: string;
  avatarUrl: string;
  badgeTitle: string;
  specialty: string;
  recentUpload: string;
  isTopContributor: boolean;
  lastActive: string;
}

export class ContributorRepository {
  private getInitialSeed(): ContributorRecord[] {
    const seedFile = path.join(DATA_DIR, 'contributors.json');
    return readJsonFileSafely<ContributorRecord[]>(seedFile, []);
  }

  getAll(): ContributorRecord[] {
    let list = readJsonFileSafely<ContributorRecord[]>(CONTRIBUTORS_FILE, []);
    if (list.length === 0) {
      list = this.getInitialSeed();
      if (list.length > 0) {
        this.saveAll(list);
      }
    }
    return list;
  }

  saveAll(records: ContributorRecord[]): void {
    writeJsonFileSafely(CONTRIBUTORS_FILE, records);
  }
}

export const contributorRepository = new ContributorRepository();
