import { feedbackRepository, FeedbackRecord } from '../repositories/feedback.repository';

class FeedbackService {
  getAll(): FeedbackRecord[] {
    return feedbackRepository.getAll();
  }

  create(body: Partial<FeedbackRecord>): FeedbackRecord {
    const list = feedbackRepository.getAll();
    const newFeedback: FeedbackRecord = {
      id: body.id || `fb_${Date.now()}`,
      type: body.type || 'general',
      title: body.title || '',
      content: body.content || '',
      userName: body.userName || 'Sinh viên ẩn danh',
      userEmail: body.userEmail || '',
      userPhone: body.userPhone || '',
      rating: Number(body.rating) || 5,
      status: body.status || 'unread',
      createdAt: body.createdAt || new Date().toISOString()
    };
    list.unshift(newFeedback);
    feedbackRepository.saveAll(list);
    return newFeedback;
  }

  updateStatus(id: string, status: string): boolean {
    const list = feedbackRepository.getAll();
    let found = false;
    const updated = list.map((item) => {
      if (item.id === id) {
        found = true;
        return { ...item, status: status || item.status };
      }
      return item;
    });
    if (found) {
      feedbackRepository.saveAll(updated);
    }
    return found;
  }

  delete(id: string): boolean {
    const list = feedbackRepository.getAll();
    const updated = list.filter((item) => item.id !== id);
    if (updated.length !== list.length) {
      feedbackRepository.saveAll(updated);
      return true;
    }
    return false;
  }
}

export const feedbackService = new FeedbackService();
