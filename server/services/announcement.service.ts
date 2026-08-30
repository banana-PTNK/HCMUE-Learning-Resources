import { announcementRepository, AnnouncementRecord } from '../repositories/announcement.repository';

class AnnouncementService {
  getAll(): AnnouncementRecord[] {
    return announcementRepository.getAll();
  }

  createOrUpdate(body: Partial<AnnouncementRecord>): AnnouncementRecord[] {
    let list = announcementRepository.getAll();
    const id = body.id || `ann_${Date.now()}`;

    let found = false;
    list = list.map((item) => {
      if (item.id === id) {
        found = true;
        return { ...item, ...body, id } as AnnouncementRecord;
      }
      return item;
    });

    if (!found) {
      list.unshift({ ...body, id } as AnnouncementRecord);
    }

    announcementRepository.saveAll(list);
    return list;
  }

  delete(id: string): AnnouncementRecord[] {
    let list = announcementRepository.getAll();
    list = list.filter((item) => item.id !== id);
    announcementRepository.saveAll(list);
    return list;
  }
}

export const announcementService = new AnnouncementService();
