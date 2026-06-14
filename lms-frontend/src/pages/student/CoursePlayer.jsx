import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactPlayer from 'react-player';
import {
  ChevronLeft, ChevronDown, ChevronUp, CheckCircle, Circle,
  StickyNote, MessageSquare, Menu, X, Play, Lock, Award
} from 'lucide-react';
import { courseApi } from '../../api/courseApi';
import { enrollmentApi } from '../../api/enrollmentApi';
import { formatDuration } from '../../utils/formatters';
import { resolveUrl } from '../../api/axios';
import Loader from '../../components/common/Loader';
import StudentQuizPanel from '../../components/course/StudentQuizPanel';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const PROGRESS_SYNC_INTERVAL = 5000; // 5 seconds

export default function CoursePlayer() {
  const { courseId }  = useParams();
  const navigate      = useNavigate();
  const qc            = useQueryClient();
  const playerRef     = useRef(null);
  const syncTimer     = useRef(null);

  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [activeSections, setActiveSections]   = useState({ 0: true });
  const [activeTab, setActiveTab]             = useState('curriculum'); // 'curriculum' | 'notes'
  const [currentLecture, setCurrentLecture]   = useState(null);
  const [currentSection, setCurrentSection]   = useState(null);
  const [notes, setNotes]                     = useState('');
  const [savedNotes, setSavedNotes]           = useState({});
  const [playing, setPlaying]                 = useState(false);
  const [completedIds, setCompletedIds]       = useState(new Set());
  const [watchTime, setWatchTime]             = useState(0);
  const [lastPosition, setLastPosition]       = useState(0);

  /* ── Fetch course + progress ── */
  const { data: courseData, isLoading: loadingCourse } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.getById(courseId),
  });

  const { data: progressData } = useQuery({
    queryKey: ['progress', courseId],
    queryFn: () => enrollmentApi.getCourseProgress(courseId),
    enabled: !!courseId,
  });

  /* ── Init completed set + start lecture ── */
  useEffect(() => {
    if (!progressData?.progressRecords) return;
    const ids = new Set(progressData.progressRecords.filter(p => p.completed).map(p => String(p.lectureId)));
    setCompletedIds(ids);
  }, [progressData]);

  useEffect(() => {
    if (!courseData?.course) return;
    const enrollment = courseData.enrollment;
    const curriculum = courseData.course.curriculum ?? [];

    // Resume from last lecture if set
    if (enrollment?.currentLectureId) {
      for (const section of curriculum) {
        const lec = section.lectures?.find(l => String(l._id) === String(enrollment.currentLectureId));
        if (lec) { setCurrentLecture(lec); setCurrentSection(section); return; }
      }
    }

    // Otherwise start from first lecture
    const firstSection  = curriculum[0];
    const firstLecture  = firstSection?.lectures?.[0];
    if (firstLecture) { setCurrentLecture(firstLecture); setCurrentSection(firstSection); }
  }, [courseData]);

  /* ── Progress mutations ── */
  const updateProgressMutation = useMutation({
    mutationFn: (data) => enrollmentApi.updateProgress(data),
  });

  const completeMutation = useMutation({
    mutationFn: (data) => enrollmentApi.completeLecture(data),
    onSuccess: (data) => {
      if (currentLecture) setCompletedIds(prev => new Set([...prev, String(currentLecture._id)]));
      qc.invalidateQueries(['progress', courseId]);
      if (data.progress === 100) toast.success('🎉 Course completed! Certificate available.');
    },
  });

  /* ── Periodic progress sync ── */
  const syncProgress = useCallback(() => {
    if (!currentLecture || !currentSection) return;
    if (watchTime < 5) return;
    updateProgressMutation.mutate({
      courseId, lectureId: currentLecture._id,
      sectionId: currentSection._id,
      watchTime: Math.round(watchTime),
      lastPosition: Math.round(lastPosition),
    });
  }, [currentLecture, currentSection, courseId, watchTime, lastPosition]);

  useEffect(() => {
    syncTimer.current = setInterval(syncProgress, PROGRESS_SYNC_INTERVAL);
    return () => clearInterval(syncTimer.current);
  }, [syncProgress]);

  /* ── Player handlers ── */
  const handleProgress = ({ playedSeconds }) => {
    setLastPosition(playedSeconds);
    setWatchTime(prev => prev + 1);
  };

  const handleEnded = () => {
    if (!currentLecture || !currentSection) return;
    setPlaying(false);
    completeMutation.mutate({
      courseId, lectureId: currentLecture._id, sectionId: currentSection._id,
    });
  };

  const selectLecture = (lecture, section) => {
    syncProgress();
    setCurrentLecture(lecture);
    setCurrentSection(section);
    setWatchTime(0);
    setLastPosition(0);
    setPlaying(true);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const markComplete = () => {
    if (!currentLecture || !currentSection) return;
    completeMutation.mutate({
      courseId, lectureId: currentLecture._id, sectionId: currentSection._id,
    });
  };

  /* ── Navigation ── */
  const allLectures = courseData?.course?.curriculum?.flatMap(
    (s) => s.lectures?.map((l) => ({ lecture: l, section: s })) ?? []
  ) ?? [];

  const currentIdx = allLectures.findIndex(
    (x) => String(x.lecture._id) === String(currentLecture?._id)
  );

  const goToLecture = (delta) => {
    const next = allLectures[currentIdx + delta];
    if (next) selectLecture(next.lecture, next.section);
  };

  /* ── Notes ── */
  const saveNote = () => {
    if (!currentLecture) return;
    setSavedNotes(prev => ({ ...prev, [String(currentLecture._id)]: notes }));
    toast.success('Note saved!');
  };

  useEffect(() => {
    if (currentLecture) setNotes(savedNotes[String(currentLecture._id)] ?? '');
  }, [currentLecture]);

  /* ── Loading state ── */
  if (loadingCourse) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-900">
        <Loader size="lg" white />
      </div>
    );
  }

  if (!courseData?.course || !courseData.isEnrolled) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-900 text-white flex-col gap-4">
        <Lock className="w-12 h-12 text-stone-500" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-stone-400">Please enroll in this course to watch lectures.</p>
        <Link to={`/courses/${courseId}`} className="btn-primary mt-2">View Course</Link>
      </div>
    );
  }

  const { course, enrollment } = courseData;
  const curriculum = course.curriculum ?? [];
  const videoUrl = currentLecture?.videoUrl ? resolveUrl(currentLecture.videoUrl) : null;
  const isCompleted = completedIds.has(String(currentLecture?._id));
  const overallProgress = enrollment?.progress ?? 0;

  return (
    <div className="flex h-screen bg-stone-900 overflow-hidden">

      {/* ── Video + content area ── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 h-12 bg-stone-900 border-b border-stone-700 flex-shrink-0">
          <Link to="/student/my-learning" className="flex items-center gap-1.5 text-stone-400 hover:text-white text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>

          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{course.title}</p>
          </div>

          {/* Overall progress */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-1.5 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
            </div>
            <span className="text-xs text-stone-400">{overallProgress}%</span>
          </div>

          <button onClick={() => setSidebarOpen(v => !v)}
            className="text-stone-400 hover:text-white lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Video player */}
        <div className="bg-black flex-shrink-0">
          <div className="aspect-video max-h-[calc(100vh-12rem)] w-full mx-auto relative">
            {videoUrl ? (
              <ReactPlayer
                ref={playerRef}
                url={videoUrl}
                width="100%"
                height="100%"
                playing={playing}
                controls
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onProgress={handleProgress}
                onEnded={handleEnded}
                progressInterval={1000}
                config={{ youtube: { playerVars: { showinfo: 1 } } }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-stone-400 bg-stone-900">
                <div className="text-center">
                  <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No video available for this lecture</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom panel — lecture info + navigation */}
        <div className="flex-1 overflow-y-auto bg-stone-950">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-stone-800">
              {[['curriculum', 'Overview'], ['quizzes', 'Quizzes'], ['notes', 'Notes']].map(([id, label]) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === id ? 'border-brand-500 text-brand-400' : 'border-transparent text-stone-400 hover:text-stone-200')}>
                  {label}
                </button>
              ))}
            </div>

            {activeTab === 'curriculum' && (
              <div>
                {/* Lecture title */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-white font-bold text-xl">{currentLecture?.title}</h2>
                    {currentSection && <p className="text-stone-400 text-sm mt-1">{currentSection.title}</p>}
                  </div>
                  <button onClick={markComplete} disabled={isCompleted || completeMutation.isPending}
                    className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 transition-all', isCompleted ? 'bg-emerald-900/40 text-emerald-400 cursor-default' : 'bg-stone-800 text-stone-300 hover:bg-brand-700 hover:text-white')}>
                    {isCompleted ? <><CheckCircle className="w-4 h-4" /> Completed</> : completeMutation.isPending ? <Loader size="sm" white /> : <><Circle className="w-4 h-4" /> Mark Complete</>}
                  </button>
                </div>

                {currentLecture?.description && (
                  <p className="text-stone-400 text-sm leading-relaxed mb-6">{currentLecture.description}</p>
                )}

                {/* Prev / Next */}
                <div className="flex gap-3">
                  <button onClick={() => goToLecture(-1)} disabled={currentIdx <= 0}
                    className="btn-secondary bg-stone-800 border-stone-700 text-stone-300 hover:text-white disabled:opacity-30 flex-1">
                    ← Previous
                  </button>
                  <button onClick={() => goToLecture(1)} disabled={currentIdx >= allLectures.length - 1}
                    className="btn-primary disabled:opacity-30 flex-1">
                    Next →
                  </button>
                </div>

                {/* Completion CTA */}
                {overallProgress === 100 && (
                  <div className="mt-6 bg-emerald-900/30 border border-emerald-800 rounded-xl p-4 flex items-center gap-3">
                    <Award className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-emerald-300 font-semibold">Course Completed!</p>
                      <p className="text-emerald-400/70 text-sm">Your certificate is ready to download.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-3">
                <p className="text-stone-400 text-xs">Notes for: <span className="text-stone-200">{currentLecture?.title}</span></p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Write your notes here…"
                  rows={8}
                  className="w-full bg-stone-900 border border-stone-700 text-stone-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder-stone-600"
                />
                <button onClick={saveNote} className="btn-primary text-sm">Save Notes</button>
              </div>
            )}

            {activeTab === 'quizzes' && (
              <StudentQuizPanel courseId={courseId} />
            )}
          </div>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div className={clsx(
        'flex-shrink-0 bg-stone-900 border-l border-stone-700 transition-all duration-300 overflow-hidden flex flex-col',
        sidebarOpen ? 'w-80 lg:w-80' : 'w-0',
        'fixed right-0 top-0 h-full z-30 lg:relative lg:z-auto'
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-stone-700 flex-shrink-0">
          <span className="text-white text-sm font-semibold">Course Content</span>
          <button onClick={() => setSidebarOpen(false)} className="text-stone-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto">
          {curriculum.map((section, si) => (
            <div key={section._id ?? si} className="border-b border-stone-800">
              <button
                onClick={() => setActiveSections(p => ({ ...p, [si]: !p[si] }))}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{section.title}</p>
                  <p className="text-stone-500 text-[10px] mt-0.5">
                    {section.lectures?.filter(l => completedIds.has(String(l._id))).length ?? 0} / {section.lectures?.length ?? 0} done
                  </p>
                </div>
                {activeSections[si] ? <ChevronUp className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />}
              </button>

              {activeSections[si] && (
                <ul>
                  {section.lectures?.map((lec, li) => {
                    const isActive    = String(lec._id) === String(currentLecture?._id);
                    const isDone      = completedIds.has(String(lec._id));
                    return (
                      <li key={lec._id ?? li}>
                        <button
                          onClick={() => selectLecture(lec, section)}
                          className={clsx(
                            'w-full flex items-start gap-2.5 px-4 py-3 text-left transition-colors text-xs',
                            isActive ? 'bg-brand-900/50 border-r-2 border-brand-500' : 'hover:bg-stone-800/40'
                          )}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isDone
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              : isActive
                                ? <Play className="w-3.5 h-3.5 text-brand-400" />
                                : <Circle className="w-3.5 h-3.5 text-stone-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx('leading-snug truncate', isActive ? 'text-brand-300 font-semibold' : isDone ? 'text-stone-400' : 'text-stone-300')}>
                              {lec.title}
                            </p>
                            {lec.duration > 0 && (
                              <p className="text-stone-600 text-[10px] mt-0.5">{formatDuration(lec.duration)}</p>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile sidebar toggle when closed */}
      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 right-6 z-30 lg:hidden bg-brand-600 text-white p-3 rounded-full shadow-modal hover:bg-brand-700 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
