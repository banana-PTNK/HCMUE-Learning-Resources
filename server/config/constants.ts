import path from 'path';

export const PORT = Number(process.env.PORT) || 3000;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
export const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 hours valid session

export const DATA_DIR = path.join(process.cwd(), 'src', 'data');
export const CONTRIBUTIONS_FILE = path.join(DATA_DIR, 'contributionsStore.json');
export const CONTRIBUTORS_FILE = path.join(DATA_DIR, 'contributorsStore.json');
export const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcementsStore.json');
export const FEEDBACKS_FILE = path.join(DATA_DIR, 'feedbacksStore.json');
export const MASTER_SCHEDULE_SAMPLE_FILE = path.join(DATA_DIR, 'masterScheduleSample.json');
