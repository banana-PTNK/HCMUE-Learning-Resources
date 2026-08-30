import { CONTRIBUTIONS_FILE } from '../config/constants';
import { readJsonFileSafely, writeJsonFileSafely } from '../utils/fileStore';

export interface ContributionRecord {
  id: string;
  targetSubjectCode: string;
  customSubjectName?: string;
  assetType: string;
  driveUrl: string;
  filesCount: number;
  contributorName: string;
  studentId: string;
  className: string;
  email: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  adminFeedback?: string | null;
}

export class ContributionRepository {
  getAll(): ContributionRecord[] {
    return readJsonFileSafely<ContributionRecord[]>(CONTRIBUTIONS_FILE, []);
  }

  getById(id: string): ContributionRecord | null {
    const list = this.getAll();
    return list.find((item) => item.id === id) || null;
  }

  saveAll(records: ContributionRecord[]): void {
    writeJsonFileSafely(CONTRIBUTIONS_FILE, records);
  }

  upsert(record: ContributionRecord): ContributionRecord {
    const list = this.getAll();
    const filtered = list.filter((item) => item.id !== record.id);
    filtered.unshift(record);
    this.saveAll(filtered);
    return record;
  }

  updateById(id: string, updates: Partial<ContributionRecord>): ContributionRecord | null {
    const list = this.getAll();
    let updatedItem: ContributionRecord | null = null;
    const updatedList = list.map((item) => {
      if (item.id === id) {
        updatedItem = { ...item, ...updates };
        return updatedItem;
      }
      return item;
    });
    if (updatedItem) {
      this.saveAll(updatedList);
    }
    return updatedItem;
  }

  deleteById(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((item) => item.id !== id);
    if (filtered.length !== list.length) {
      this.saveAll(filtered);
      return true;
    }
    return false;
  }
}

export const contributionRepository = new ContributionRepository();
