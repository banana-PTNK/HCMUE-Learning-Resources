import { contributorRepository, ContributorRecord } from '../repositories/contributor.repository';
import { isSameMssv } from '../utils/mssv.utils';

export function calculateBadgeTitle(filesCount: number): string {
  if (filesCount >= 50) return 'Đại Hiệp Sĩ Học Liệu';
  if (filesCount >= 30) return 'Hiệp Sĩ Học Liệu';
  if (filesCount >= 15) return 'Chuyên Gia Chia Sẻ';
  if (filesCount >= 5) return 'Người Cống Hiến';
  return 'Đóng góp viên Tích cực';
}

class ContributorService {
  getAll(): ContributorRecord[] {
    return contributorRepository.getAll();
  }

  saveOrUpdate(body: Partial<ContributorRecord>): ContributorRecord[] {
    let list = contributorRepository.getAll();
    const id = body.id || body.studentId || `contrib_${Date.now()}`;

    let found = false;
    list = list.map((item) => {
      if (item.id === id || isSameMssv(item.studentId, body.studentId) || isSameMssv(item.id, body.studentId)) {
        found = true;
        const newFiles = body.filesCount !== undefined ? Number(body.filesCount) : item.filesCount;
        return {
          ...item,
          ...body,
          id: item.id || id,
          filesCount: newFiles,
          badgeTitle: calculateBadgeTitle(newFiles)
        };
      }
      return item;
    });

    if (!found) {
      const filesCount = Number(body.filesCount) || 1;
      const newItem: ContributorRecord = {
        id,
        name: body.name || 'Sinh viên',
        studentId: body.studentId || '',
        className: body.className || '',
        email: body.email || '',
        filesCount,
        entriesCount: Number(body.entriesCount) || 1,
        rank: list.length + 1,
        department: body.department || 'Khoa Công nghệ Thông tin',
        avatarUrl: body.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(body.name || 'HCMUE')}`,
        badgeTitle: body.badgeTitle || calculateBadgeTitle(filesCount),
        specialty: body.specialty || 'Chuyên đề CNTT',
        recentUpload: body.recentUpload || 'Đóng góp tài liệu',
        isTopContributor: false,
        lastActive: 'Vừa xong'
      };
      list.push(newItem);
    }

    list.sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));
    list = list.map((item, idx) => ({ ...item, rank: idx + 1 }));
    contributorRepository.saveAll(list);
    return list;
  }

  adjustPoints(id: string, delta: number): ContributorRecord[] {
    let list = contributorRepository.getAll();
    list = list.map((item) => {
      if (item.id === id || isSameMssv(item.studentId, id) || isSameMssv(item.id, id)) {
        const newCount = Math.max(0, (item.filesCount || 0) + delta);
        return {
          ...item,
          filesCount: newCount,
          badgeTitle: calculateBadgeTitle(newCount)
        };
      }
      return item;
    });

    list.sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));
    list = list.map((item, idx) => ({ ...item, rank: idx + 1 }));
    contributorRepository.saveAll(list);
    return list;
  }

  awardApprovedContribution(targetItem: {
    studentId?: string;
    contributorName?: string;
    targetSubjectCode?: string;
    filesCount?: number;
    className?: string;
    email?: string;
  }): void {
    const rawContribs = contributorRepository.getAll();
    const mssv = (targetItem.studentId || '').trim();
    const contribName = (targetItem.contributorName || 'Sinh viên').trim();
    const pointsToAdd = targetItem.filesCount || 1;

    let matched = false;
    let updatedContributors = rawContribs.map((c) => {
      const matchMssv = isSameMssv(c.studentId, mssv) || (c.id && isSameMssv(c.id, mssv));
      const matchName = !mssv && c.name && c.name.trim().toLowerCase() === contribName.toLowerCase();
      if (matchMssv || matchName) {
        matched = true;
        const newFiles = (c.filesCount || 0) + pointsToAdd;
        return {
          ...c,
          filesCount: newFiles,
          entriesCount: (c.entriesCount || 0) + 1,
          badgeTitle: calculateBadgeTitle(newFiles),
          recentUpload: targetItem.targetSubjectCode ? `Đóng góp môn ${targetItem.targetSubjectCode}` : (c.recentUpload || 'Đóng góp tài liệu học tập'),
          lastActive: 'Vừa xong'
        };
      }
      return c;
    });

    if (!matched) {
      const newContributor: ContributorRecord = {
        id: mssv || `contributor_${Date.now()}`,
        name: contribName,
        studentId: mssv,
        className: targetItem.className || '',
        email: targetItem.email || '',
        filesCount: pointsToAdd,
        entriesCount: 1,
        rank: rawContribs.length + 1,
        department: 'Khoa Công nghệ Thông tin',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(contribName)}`,
        badgeTitle: calculateBadgeTitle(pointsToAdd),
        specialty: targetItem.targetSubjectCode ? `Chuyên đề ${targetItem.targetSubjectCode}` : 'Tài liệu CNTT',
        recentUpload: targetItem.targetSubjectCode ? `Đóng góp môn ${targetItem.targetSubjectCode}` : 'Tài liệu học tập',
        isTopContributor: false,
        lastActive: 'Vừa xong'
      };
      updatedContributors.push(newContributor);
    }

    updatedContributors.sort((a, b) => (b.filesCount || 0) - (a.filesCount || 0));
    updatedContributors = updatedContributors.map((item, idx) => ({ ...item, rank: idx + 1 }));
    contributorRepository.saveAll(updatedContributors);
  }
}

export const contributorService = new ContributorService();
