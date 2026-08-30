import { contributionRepository, ContributionRecord } from '../repositories/contribution.repository';
import { contributorService } from './contributor.service';

class ContributionService {
  getAll(): ContributionRecord[] {
    return contributionRepository.getAll();
  }

  create(body: Partial<ContributionRecord>): ContributionRecord {
    const newId = body.id || `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: ContributionRecord = {
      id: newId,
      targetSubjectCode: (body.targetSubjectCode || '').toUpperCase().trim(),
      customSubjectName: body.customSubjectName?.trim() || undefined,
      assetType: body.assetType || 'all',
      driveUrl: body.driveUrl || '',
      filesCount: Math.max(1, Number(body.filesCount) || 1),
      contributorName: (body.contributorName || 'Sinh viên').trim(),
      studentId: (body.studentId || '').trim(),
      className: (body.className || '').trim(),
      email: (body.email || '').trim().toLowerCase(),
      notes: (body.notes || '').trim(),
      status: (body.status as any) || 'pending',
      createdAt: body.createdAt || new Date().toISOString(),
      approvedAt: body.approvedAt || null,
      approvedBy: body.approvedBy || null,
      adminFeedback: body.adminFeedback || null
    };

    return contributionRepository.upsert(newEntry);
  }

  updateFilesCount(id: string, newCount: number): number {
    const count = Math.max(1, Number(newCount) || 1);
    contributionRepository.updateById(id, { filesCount: count });
    return count;
  }

  approve(id: string, options?: { customFilesCount?: number; adminName?: string }): ContributionRecord | null {
    const list = contributionRepository.getAll();
    const existing = list.find((item) => item.id === id);
    if (!existing) return null;

    const finalCount = options?.customFilesCount !== undefined ? Math.max(1, Number(options.customFilesCount)) : (existing.filesCount || 1);
    const updated = contributionRepository.updateById(id, {
      status: 'approved',
      filesCount: finalCount,
      approvedAt: new Date().toISOString(),
      approvedBy: options?.adminName || 'Admin'
    });

    if (updated) {
      contributorService.awardApprovedContribution(updated);
    }

    return updated;
  }

  reject(id: string, adminFeedback?: string): boolean {
    const feedback = adminFeedback || 'Tài liệu không phù hợp hoặc đã có sẵn.';
    const updated = contributionRepository.updateById(id, {
      status: 'rejected',
      adminFeedback: feedback
    });
    return !!updated;
  }

  delete(id: string): boolean {
    return contributionRepository.deleteById(id);
  }
}

export const contributionService = new ContributionService();
