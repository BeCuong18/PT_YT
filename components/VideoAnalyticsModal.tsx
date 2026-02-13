
import React, { useState, useEffect } from 'react';
import { VideoData, SingleVideoAnalysis, GEMINI_MODELS } from '../types';
import { analyzeSingleVideoAnalytics } from '../services/geminiService';
import { saveReport, exportReportToJSON, exportReportToExcel, exportReportToWord } from '../services/storageService';

interface VideoAnalyticsModalProps {
  video: VideoData;
  onClose: () => void;
  geminiModel: string;
}

const VideoAnalyticsModal: React.FC<VideoAnalyticsModalProps> = ({ video, onClose, geminiModel }) => {
  const [analysis, setAnalysis] = useState<SingleVideoAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const getAiAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzeSingleVideoAnalytics(video, geminiModel);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    saveReport({
      video,
      analysis,
      savedAt: new Date().toISOString()
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleExportJSON = () => {
    exportReportToJSON({
      video,
      analysis,
      savedAt: new Date().toISOString()
    });
  };

  const handleExportExcel = () => {
    exportReportToExcel({
      video,
      analysis,
      savedAt: new Date().toISOString()
    });
  };

  const handleExportWord = () => {
    exportReportToWord({
      video,
      analysis,
      savedAt: new Date().toISOString()
    });
  };

  useEffect(() => {
    getAiAnalysis();
  }, [video.id]);

  const stats = [
    { label: 'Lượt xem', value: video.viewCountRaw?.toLocaleString(), icon: '👁️', color: 'text-blue-400' },
    { label: 'Lượt thích', value: video.likeCountRaw?.toLocaleString(), icon: '👍', color: 'text-red-400' },
    { label: 'Bình luận', value: video.commentCountRaw?.toLocaleString(), icon: '💬', color: 'text-green-400' },
    { label: 'Tỉ lệ tương tác', value: `${video.engagementRate}%`, icon: '📈', color: 'text-purple-400' },
    { label: 'Thời lượng', value: video.duration, icon: '⏱️', color: 'text-yellow-400' },
    { label: 'Ngày đăng', value: new Date(video.publishedAt).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }), icon: '📅', color: 'text-gray-400' },
  ];

  const technicalData = [
    { label: 'Chất lượng', value: video.definition?.toUpperCase() || 'N/A', icon: '📽️' },
    { label: 'Phụ đề', value: video.caption === 'true' ? 'Có' : 'Không', icon: '📝' },
    { label: 'Bản quyền', value: video.licensedContent ? 'Có' : 'Không', icon: '⚖️' },
    { label: 'Trình chiếu', value: video.projection === 'rectangular' ? 'Thường' : video.projection, icon: '🌐' },
    { label: 'Audio', value: video.defaultAudioLanguage || 'N/A', icon: '🔊' },
    { label: 'For Kids', value: video.madeForKids ? 'Có' : 'Không', icon: '👶' },
    { label: 'Nhúng (Embed)', value: video.embeddable ? 'Có' : 'Không', icon: '🔗' },
    { label: 'Vị trí', value: video.recordingLocation ? 'Đã ghim' : 'N/A', icon: '📍' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="bg-[#121212] w-full max-w-7xl max-h-[95vh] rounded-[2.5rem] overflow-hidden border border-[#2a2a2a] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-[#222] bg-[#1a1a1a]/50">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.3)] animate-pulse-slow">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .6-.03 1.29-.1 2.09-.06.8-.15 1.43-.28 1.9-.13.47-.29.81-.48 1.01-.19.2-.43.32-.72.36-.53.08-1.5.11-2.92.11H6.5c-1.42 0-2.39-.03-2.92-.11-.29-.04-.53-.16-.72-.36-.19-.2-.35-.54-.48-1.01-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-.6.03-1.29.1-2.09.06-.8.15-1.43.28-1.9.13-.47.29-.81.48-1.01.19-.2.43-.32.72-.36.53-.08 1.5-.11 2.92-.11h11c1.42 0 2.39.03 2.92.11.29.04.53.16.72.36.19.2.35.54.48 1.01z"/></svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white leading-tight max-w-2xl line-clamp-1">{video.title}</h2>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-red-500 font-bold text-sm tracking-widest uppercase">{video.channelTitle}</span>
                <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                <span className="text-gray-400 text-sm font-medium">{video.id}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-6 border-r border-[#333] pr-6">
                <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white rounded-xl transition-all font-bold text-xs" title="Excel Report">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    EXCEL
                </button>
                <button onClick={handleExportWord} className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all font-bold text-xs" title="Word Report">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    WORD
                </button>
            </div>

            <button 
                onClick={handleSave}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-black text-sm ${isSaved ? 'bg-green-600 text-white' : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#333]'}`}
            >
                <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                {isSaved ? "SAVED" : "SAVE"}
            </button>
            
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar bg-gradient-to-b from-[#121212] to-black">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Sidebar (Left Column) */}
            <div className="lg:col-span-4 space-y-8">
              {/* HQ Thumbnail Display */}
              <div className="rounded-[2rem] overflow-hidden border border-[#222] shadow-2xl relative group">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full aspect-video object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase text-white border border-white/10">{video.definition?.toUpperCase()}</span>
                    {video.caption === 'true' && <span className="bg-white/90 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase">CC</span>}
                </div>
                <div className="absolute bottom-4 right-4 bg-red-600 px-3 py-1 rounded-full text-xs font-black text-white">{video.duration}</div>
              </div>

              {/* Real-time Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((s, i) => (
                  <div key={i} className="bg-[#1a1a1a] p-5 rounded-3xl border border-[#222] hover:border-[#333] transition-all group">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl group-hover:scale-125 transition-transform">{s.icon}</span>
                      <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest">{s.label}</span>
                    </div>
                    <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Technical Specifications (New Detail) */}
              <div className="bg-[#1a1a1a] rounded-[2rem] p-6 border border-[#222]">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Technical Metadata
                </h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  {technicalData.map((tech, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tight">{tech.label}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">{tech.icon}</span>
                            <span className="text-xs font-bold text-gray-300">{tech.value}</span>
                        </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categorization & Topics (New Detail) */}
              <div className="bg-[#1a1a1a] rounded-[2rem] p-6 border border-[#222]">
                 <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Topic Classification
                </h3>
                <div className="flex flex-wrap gap-2">
                    {video.topicCategories && video.topicCategories.length > 0 ? (
                        video.topicCategories.map((topic, i) => {
                            const name = topic.split('/').pop()?.replace(/_/g, ' ');
                            return (
                                <span key={i} className="bg-green-600/10 text-green-500 text-[10px] font-black px-3 py-1.5 rounded-full border border-green-500/20 uppercase tracking-tighter">
                                    {name}
                                </span>
                            );
                        })
                    ) : (
                        <span className="text-gray-600 italic text-xs">No topics identified</span>
                    )}
                </div>
              </div>
            </div>

            {/* Main Area (Right Column) */}
            <div className="lg:col-span-8 space-y-8">
              {/* AI Analysis Master Panel */}
              <div className="bg-[#1a1a1a] rounded-[2.5rem] p-8 border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.05)]">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
                            <span className="text-2xl">✨</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Gemini Insight Engine</h3>
                            <p className="text-xs text-gray-500 font-medium">Deep analysis using full video metadata</p>
                        </div>
                    </div>
                    {loading && (
                         <div className="flex items-center gap-3 bg-purple-600/10 px-4 py-2 rounded-full text-[10px] font-black text-purple-400 uppercase tracking-widest animate-pulse">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
                            Analyzing Video DNA...
                        </div>
                    )}
                </div>

                {analysis ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
                        <div className="space-y-8">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                                    Performance Verdict
                                </h4>
                                <p className="text-sm text-gray-300 leading-relaxed font-medium">{analysis.performanceVerdict}</p>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                                    Audience Hook Mechanics
                                </h4>
                                <p className="text-sm text-gray-300 leading-relaxed font-medium">{analysis.audienceHook}</p>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                                <h4 className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                                    Retention Strategy
                                </h4>
                                <p className="text-sm text-gray-300 leading-relaxed font-medium">{analysis.retentionStrategy}</p>
                            </div>
                            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                                <h4 className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-yellow-400 rounded-full"></span>
                                    Scaling Potential
                                </h4>
                                <p className="text-sm text-gray-300 leading-relaxed font-medium">{analysis.growthPotential}</p>
                            </div>
                        </div>

                        {/* Demographics Integration */}
                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#333]">
                            <div className="bg-blue-600/5 p-6 rounded-3xl border border-blue-500/10">
                                <span className="text-[9px] text-blue-500 font-black uppercase block mb-1">Age Brackets</span>
                                <p className="text-lg font-black text-white">{analysis.predictedDemographics.ageGroups}</p>
                            </div>
                            <div className="bg-pink-600/5 p-6 rounded-3xl border border-pink-500/10">
                                <span className="text-[9px] text-pink-500 font-black uppercase block mb-1">Gender Bias</span>
                                <p className="text-lg font-black text-white">{analysis.predictedDemographics.genderDistribution}</p>
                            </div>
                            <div className="bg-emerald-600/5 p-6 rounded-3xl border border-emerald-500/10">
                                <span className="text-[9px] text-emerald-500 font-black uppercase block mb-1">Top Geographies</span>
                                <p className="text-lg font-black text-white">{analysis.predictedDemographics.targetLocations}</p>
                            </div>
                        </div>
                   </div>
                ) : !loading && (
                    <div className="text-center py-20 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                         <button onClick={getAiAnalysis} className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-sm font-black transition-all shadow-2xl shadow-purple-900/40 hover:-translate-y-1">REGENERATE AI ANALYSIS</button>
                    </div>
                )}
              </div>

              {/* Tags Master Panel */}
              <div className="bg-[#1a1a1a] rounded-[2.5rem] p-8 border border-[#222]">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-6 flex items-center justify-between">
                    Keywords & Strategy
                    <span className="text-[10px] font-bold bg-[#333] px-3 py-1 rounded-full">{video.tags?.length || 0} TAGS</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {video.tags && video.tags.length > 0 ? video.tags.map((tag, i) => (
                    <span key={i} className="bg-[#111] text-[11px] px-4 py-2 rounded-xl border border-[#222] text-gray-300 hover:border-red-500 transition-colors cursor-default font-medium">
                      {tag}
                    </span>
                  )) : <span className="text-gray-600 italic">No tags specified by creator</span>}
                </div>
              </div>

              {/* Full Description Display */}
              <div className="bg-[#1a1a1a] rounded-[2.5rem] p-8 border border-[#222]">
                 <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] mb-6">Original Description</h3>
                 <div className="text-sm text-gray-400 whitespace-pre-line leading-relaxed max-h-[400px] overflow-y-auto pr-6 custom-scrollbar font-medium">
                    {video.description || "No description provided."}
                 </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                <a 
                    href={`https://www.youtube.com/watch?v=${video.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 text-white text-center py-5 rounded-[1.5rem] font-black transition-all flex items-center justify-center gap-3 shadow-2xl shadow-red-900/40 group"
                >
                    <svg className="w-6 h-6 transition-transform group-hover:scale-125" fill="currentColor" viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 .6-.03 1.29-.1 2.09-.06.8-.15 1.43-.28 1.9-.13.47-.29.81-.48 1.01-.19.2-.43.32-.72.36-.53.08-1.5.11-2.92.11H6.5c-1.42 0-2.39-.03-2.92-.11-.29-.04-.53-.16-.72-.36-.19-.2-.35-.54-.48-1.01-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-.6.03-1.29.1-2.09.06-.8.15-1.43.28-1.9.13-.47.29-.81.48-1.01.19-.2.43-.32.72-.36.53-.08 1.5-.11 2.92-.11h11c1.42 0 2.39.03 2.92.11.29.04.53.16.72.36.19.2.35.54.48 1.01z"/></svg>
                    WATCH ON YOUTUBE
                </a>
                <div className="w-full sm:flex-1 flex gap-4">
                    <button 
                        onClick={() => window.open(video.thumbnailUrl, '_blank')}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white py-5 rounded-[1.5rem] font-black transition-all border border-white/5 flex items-center justify-center gap-2"
                    >
                        IMAGE
                    </button>
                    <button 
                        onClick={handleExportWord}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.5rem] font-black transition-all flex items-center justify-center gap-2 shadow-2xl shadow-blue-900/40"
                    >
                        DOCX
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoAnalyticsModal;
