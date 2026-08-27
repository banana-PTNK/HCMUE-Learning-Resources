import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Calendar,
  BookOpen,
  PlusCircle,
  ArrowRight,
  GraduationCap,
  LayoutGrid,
  Code2,
  Award,
  Bell,
  ChevronRight
} from 'lucide-react';
import subjectsData from '../data/subjects.json';
import { Subject, Announcement } from '../types';
import {
  fetchAnnouncements,
  getStoredAnnouncements,
  ANNOUNCEMENTS_UPDATED_EVENT
} from '../services/announcementService';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenContributeModal?: (code?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenContributeModal
}) => {
  const subjects = subjectsData as Subject[];
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredAnnouncements());

  useEffect(() => {
    fetchAnnouncements().then((data) => {
      if (data && data.length > 0) {
        setAnnouncements(data);
      }
    });

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setAnnouncements(e.detail);
      } else {
        setAnnouncements(getStoredAnnouncements());
      }
    };

    window.addEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(ANNOUNCEMENTS_UPDATED_EVENT, handleUpdate);
  }, []);

  const recentAnnouncements = announcements.slice(0, 2);

  // Counts by category
  const countGeneral = subjects.filter(s => s.category === 'general').length;
  const countFoundation = subjects.filter(s => s.category === 'foundation').length;
  const countSpecialized = subjects.filter(s => s.category === 'specialized').length;
  const countElective = subjects.filter(s => s.category === 'elective').length;
  const countCapstone = subjects.filter(s => s.category === 'capstone').length;

  const trainingCategories = [
    {
      id: 'general',
      path: '/category/general',
      label: 'Môn học đại cương',
      desc: 'Toán cao cấp, Vật lý đại cương, Pháp luật, Triết học và Kỹ năng mềm',
      icon: GraduationCap,
      count: countGeneral,
      color: 'from-blue-500/10 to-indigo-500/10 border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400'
    },
    {
      id: 'foundation',
      path: '/category/foundation',
      label: 'Môn học cơ sở ngành',
      desc: 'Cơ sở dữ liệu, Cấu trúc dữ liệu & Giải thuật, OOP, Mạng máy tính, Hệ điều hành',
      icon: LayoutGrid,
      count: countFoundation,
      color: 'from-indigo-500/10 to-purple-500/10 border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400'
    },
    {
      id: 'specialized',
      path: '/category/specialized',
      label: 'Môn học chuyên ngành',
      desc: 'Trí tuệ nhân tạo, Phát triển Web, Công nghệ phần mềm, An toàn thông tin',
      icon: Code2,
      count: countSpecialized,
      color: 'from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-900/50 text-purple-600 dark:text-purple-400'
    },
    {
      id: 'elective',
      path: '/category/elective',
      label: 'Môn học tự chọn',
      desc: 'Xử lý ảnh, Học máy, Điện toán đám mây, Lập trình di động iOS/Android',
      icon: BookOpen,
      count: countElective,
      color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'capstone',
      path: '/category/capstone',
      label: 'Đồ án & Khóa luận',
      desc: 'Đồ án cơ sở, Đồ án chuyên ngành, Thực tập doanh nghiệp và Khóa luận tốt nghiệp',
      icon: Award,
      count: countCapstone,
      color: 'from-amber-500/10 to-orange-500/10 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400'
    }
  ];

  // Quick Action Cards
  const quickActions = [
    {
      id: 'ai-assistant',
      path: '/ai-assistant',
      title: 'Trợ Lý Phân Tích Code',
      subtitle: 'Đồng hành cùng sinh viên phân tích và giải thích thuật toán trực quan, phát hiện lỗi mã nguồn và nâng cao tư duy lập trình hiệu quả.',
      icon: Bot,
      accent: 'from-indigo-600/10 to-blue-600/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-400'
    },
    {
      id: 'ai-schedule',
      path: '/ai-schedule',
      title: 'Trợ Lý Xếp Thời Khóa Biểu',
      subtitle: 'Hỗ trợ sinh viên tự động lập và tối ưu thời khóa biểu thông minh, loại bỏ hoàn toàn trùng lịch và tiết kiệm tối đa thời gian đăng ký môn học.',
      icon: Calendar,
      accent: 'from-blue-600/10 to-cyan-600/10 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800/60 hover:border-blue-400'
    },
    {
      id: 'curriculum',
      path: '/category/foundation',
      title: 'Kho Môn Học & Đề Thi',
      subtitle: 'Tra cứu hơn 40+ môn học chuyên ngành với slide bài giảng, đề thi cuối kỳ qua các năm, bài tập lab và tài liệu ôn tập chuẩn tín chỉ.',
      icon: BookOpen,
      accent: 'from-purple-600/10 to-indigo-600/10 text-purple-600 dark:text-purple-400 border-purple-200/80 dark:border-purple-800/60 hover:border-purple-400'
    },
    {
      id: 'contribute',
      path: '/contribute',
      title: 'Đóng Góp & Vinh Danh',
      subtitle: 'Chia sẻ tài liệu, slide, đề thi mới cùng cộng đồng sinh viên FIT HCMUE và tích lũy điểm cống hiến trên Bảng xếp hạng học thuật.',
      icon: PlusCircle,
      accent: 'from-emerald-600/10 to-teal-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60 hover:border-emerald-400'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* 1. Hero Banner Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0e172e] to-[#121c3b] text-white p-6 sm:p-10 lg:p-12 border border-slate-800 shadow-xl">
        {/* Subtle decorative background glowing orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6 max-w-3xl">
          {/* Main Hero Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Sổ Tay Sinh Viên & <br />
              <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Kho Học Liệu CNTT HCMUE
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed pt-2 font-normal border-l-2 border-indigo-400 pl-3.5 py-0.5 max-w-2xl">
              Nền tảng tra cứu học liệu, đề thi, bài giảng và bộ công cụ Trợ lý thông minh hỗ trợ sinh viên lập thời khóa biểu tối ưu, giải thích thuật toán và nâng cao kết quả học tập.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              id="hero-explore-btn"
              onClick={() => onNavigate('/category/foundation')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-base font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-200 cursor-pointer active:scale-98"
            >
              <BookOpen className="w-4.5 h-4.5" />
              <span>Khám phá môn học</span>
              <ArrowRight className="w-4.5 h-4.5 ml-1" />
            </button>

            <button
              id="hero-ai-schedule-btn"
              onClick={() => onNavigate('/ai-schedule')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-white text-base font-medium border border-slate-700 transition-all duration-200 cursor-pointer hover:border-slate-600 active:scale-98"
            >
              <Calendar className="w-4.5 h-4.5 text-cyan-400" />
              <span>Xếp TKB Thông Minh</span>
            </button>

            <button
              id="hero-ai-assistant-btn"
              onClick={() => onNavigate('/ai-assistant')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-white text-base font-medium border border-slate-700 transition-all duration-200 cursor-pointer hover:border-slate-600 active:scale-98"
            >
              <Bot className="w-4.5 h-4.5 text-indigo-400" />
              <span>Trợ lý Code & Big-O</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Key Numbers & Metrics Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-2xl sm:text-4xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {subjects.length}+
          </div>
          <div className="mt-1.5 space-y-0.5">
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Môn học tích hợp</div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">5 khối kiến thức chuẩn tín chỉ</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-2xl sm:text-4xl font-black font-mono text-blue-600 dark:text-blue-400">
            500+
          </div>
          <div className="mt-1.5 space-y-0.5">
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Tài liệu & Đề thi</div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Slide, bài tập lab và đề thi các năm</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-2xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            100%
          </div>
          <div className="mt-1.5 space-y-0.5">
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Giải thuật TKB Tự Động</div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Tối ưu CSP không trùng lịch học</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-2xl sm:text-4xl font-black font-mono text-purple-600 dark:text-purple-400">
            24/7
          </div>
          <div className="mt-1.5 space-y-0.5">
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Trợ Lý Đồng Hành Lập Trình</div>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Phân tích Big-O & mô phỏng code</div>
          </div>
        </div>
      </section>

      {/* 3. Section: "Hôm nay bạn cần mình giúp gì nào? ✨" */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Hôm nay bạn cần mình giúp gì nào?</span>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
              Chọn nhanh công cụ học tập hoặc tra cứu nội dung bạn đang tìm kiếm
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                id={`home-action-${action.id}`}
                onClick={() => onNavigate(action.path)}
                className="group relative p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600/80 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between gap-5 min-h-[220px]"
              >
                <div className="space-y-4">
                  <div className="w-13 h-13 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <Icon className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-base sm:text-[17px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      {action.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-base font-semibold text-indigo-600 dark:text-indigo-400 pt-1">
                  <span>Mở ngay</span>
                  <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Curriculum Category Directory */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Chương Trình Đào Tạo Khoa CNTT</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              Phân loại 5 khối kiến thức từ đại cương đến chuyên ngành và đồ án
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {trainingCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.id}
                id={`home-cat-${cat.id}`}
                onClick={() => onNavigate(cat.path)}
                className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200 cursor-pointer group flex flex-col justify-between gap-4 shadow-xs hover:shadow-sm min-h-[220px]"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {cat.count} môn
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                      {cat.label}
                    </h3>
                    <p className="text-base sm:text-[17px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-base text-indigo-600 dark:text-indigo-400 font-semibold pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <span>Xem danh sách môn</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Latest Announcements & Academic Notices */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-500" />
              <span>Thông Báo Học Vụ & Tin Tức Mới</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
              Cập nhật lịch thi, đăng ký học phần và các hoạt động học thuật của Khoa CNTT
            </p>
          </div>
          <button
            onClick={() => onNavigate('/announcements')}
            className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Xem tất cả thông báo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {recentAnnouncements.map((ann) => (
            <div
              key={ann.id}
              onClick={() => onNavigate('/announcements')}
              className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800/80 transition cursor-pointer group shadow-xs flex flex-col justify-between gap-4 min-h-[220px]"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className={`px-2.5 py-0.5 rounded-md font-mono text-xs font-bold ${
                    ann.type === 'important'
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60'
                  }`}>
                    {ann.type === 'important' ? 'Quan trọng' : 'Học vụ'}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-xs sm:text-sm">
                    {ann.date}
                  </span>
                </div>

                <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-2">
                  {ann.title}
                </h4>

                <p className="text-base text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {ann.summary}
                </p>
              </div>

              <div className="text-sm sm:text-base text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <span>Xem chi tiết thông báo</span>
                <ChevronRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}

          {/* Quick Contribute Callout Box */}
          <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/60 flex flex-col justify-between gap-4 shadow-xs min-h-[220px]">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-base sm:text-lg">
                <PlusCircle className="w-5 h-5" />
                <span>Bạn có đề thi hoặc bài giảng mới?</span>
              </div>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Đóng góp vào kho tài liệu chung để giúp đỡ các thế hệ sinh viên tiếp theo nhé!
              </p>
            </div>
            <button
              id="home-contribute-btn"
              onClick={() => {
                if (onOpenContributeModal) {
                  onOpenContributeModal();
                } else {
                  onNavigate('/contribute');
                }
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition cursor-pointer shadow-xs active:scale-98"
            >
              Chia sẻ tài liệu ngay
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
