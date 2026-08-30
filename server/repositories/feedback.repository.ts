import { FEEDBACKS_FILE } from '../config/constants';
import { readJsonFileSafely, writeJsonFileSafely } from '../utils/fileStore';

export interface FeedbackRecord {
  id: string;
  type: string;
  title: string;
  content: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  rating: number;
  status: 'unread' | 'read' | 'resolved' | string;
  createdAt: string;
}

export class FeedbackRepository {
  getAll(): FeedbackRecord[] {
    return readJsonFileSafely<FeedbackRecord[]>(FEEDBACKS_FILE, []);
  }

  saveAll(records: FeedbackRecord[]): void {
    writeJsonFileSafely(FEEDBACKS_FILE, records);
  }
}

export const feedbackRepository = new FeedbackRepository();
