
import { SavedAnalysis } from "../types";

const STORAGE_KEY = 'tubethumb_saved_reports';
const API_KEY_STORAGE_NAME = 'tubethumb_api_key_v3';

export const getApiKey = (): string => {
  return localStorage.getItem(API_KEY_STORAGE_NAME) || '';
};

export const saveApiKey = (key: string) => {
  localStorage.setItem(API_KEY_STORAGE_NAME, key);
};

export const removeApiKey = () => {
  localStorage.removeItem(API_KEY_STORAGE_NAME);
};

export const saveReport = (report: SavedAnalysis) => {
  const existing = getSavedReports();
  const filtered = existing.filter(r => r.video.id !== report.video.id);
  const updated = [report, ...filtered];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 50))); // Limit to 50 saved reports
};

export const getSavedReports = (): SavedAnalysis[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const deleteReport = (videoId: string) => {
  const existing = getSavedReports();
  const updated = existing.filter(r => r.video.id !== videoId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const exportReportToJSON = (report: SavedAnalysis) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
  downloadFile(dataStr, `TubeThumb-Report-${report.video.id}.json`);
};

export const exportReportToExcel = (report: SavedAnalysis) => {
  const { video, analysis } = report;
  
  // Header and rows for CSV
  // Using \ufeff (BOM) to support Vietnamese characters in Excel
  let csvContent = "\ufeff";
  csvContent += "Thông số,Giá trị\n";
  csvContent += `Tiêu đề,"${video.title.replace(/"/g, '""')}"\n`;
  csvContent += `Kênh,"${video.channelTitle}"\n`;
  csvContent += `Ngày đăng,"${new Date(video.publishedAt).toLocaleString('vi-VN')}"\n`;
  csvContent += `Lượt xem,${video.viewCountRaw}\n`;
  csvContent += `Lượt thích,${video.likeCountRaw}\n`;
  csvContent += `Bình luận,${video.commentCountRaw}\n`;
  csvContent += `Tỉ lệ tương tác,${video.engagementRate}%\n`;
  csvContent += `Thời lượng,${video.duration}\n`;
  csvContent += `Độ phân giải,${video.definition?.toUpperCase()}\n`;
  csvContent += `Ngôn ngữ audio,${video.defaultAudioLanguage || 'N/A'}\n`;
  csvContent += `Chủ đề,"${(video.topicCategories || []).map(t => t.split('/').pop()).join(', ')}"\n`;
  csvContent += `Dành cho trẻ em,${video.madeForKids ? 'Có' : 'Không'}\n`;
  csvContent += `Thẻ Tags,"${(video.tags || []).join(', ')}"\n`;
  
  if (analysis) {
    csvContent += `\nPHÂN TÍCH AI,\n`;
    csvContent += `Kết luận hiệu suất,"${analysis.performanceVerdict.replace(/"/g, '""')}"\n`;
    csvContent += `Cơ chế thu hút,"${analysis.audienceHook.replace(/"/g, '""')}"\n`;
    csvContent += `Chiến lược giữ chân,"${analysis.retentionStrategy.replace(/"/g, '""')}"\n`;
    csvContent += `Tiềm năng tăng trưởng,"${analysis.growthPotential.replace(/"/g, '""')}"\n`;
    csvContent += `\nDỰ ĐOÁN NHÂN KHẨU HỌC,\n`;
    csvContent += `Nhóm tuổi,"${analysis.predictedDemographics.ageGroups}"\n`;
    csvContent += `Giới tính,"${analysis.predictedDemographics.genderDistribution}"\n`;
    csvContent += `Quốc gia,"${analysis.predictedDemographics.targetLocations}"\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, `TubeThumb-Excel-${video.id}.csv`);
};

export const exportReportToWord = (report: SavedAnalysis) => {
  const { video, analysis } = report;
  
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Báo cáo Video Chi Tiết</title>
    <style>
      body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
      h1 { color: #cc0000; border-bottom: 2px solid #cc0000; padding-bottom: 10px; }
      h2 { color: #1a1a1a; margin-top: 25px; background: #f0f0f0; padding: 10px; border-left: 5px solid #cc0000; }
      .stat-grid { display: table; width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .stat-row { display: table-row; border-bottom: 1px solid #eee; }
      .stat-label { display: table-cell; font-weight: bold; width: 35%; padding: 10px; background: #fafafa; }
      .stat-value { display: table-cell; padding: 10px; }
      .tags { color: #444; font-size: 11px; background: #f9f9f9; padding: 10px; border: 1px dashed #ccc; }
      .ai-box { border: 2px solid #e0e0e0; padding: 20px; background: #ffffff; margin-top: 15px; border-radius: 8px; }
      .topic-list { font-size: 12px; color: #555; }
    </style>
    </head>
    <body>
      <h1>BÁO CÁO PHÂN TÍCH VIDEO YOUTUBE CHI TIẾT</h1>
      <p>Báo cáo chuyên sâu được trích xuất bởi <strong>TubeThumb Analytics</strong> vào lúc ${new Date().toLocaleString('vi-VN')}</p>
      
      <h2>1. THÔNG TIN CHUNG & KỸ THUẬT</h2>
      <div class="stat-grid">
        <div class="stat-row"><div class="stat-label">Tiêu đề:</div><div class="stat-value">${video.title}</div></div>
        <div class="stat-row"><div class="stat-label">Kênh:</div><div class="stat-value">${video.channelTitle}</div></div>
        <div class="stat-row"><div class="stat-label">ID Video:</div><div class="stat-value">${video.id}</div></div>
        <div class="stat-row"><div class="stat-label">Ngày đăng:</div><div class="stat-value">${new Date(video.publishedAt).toLocaleString('vi-VN')}</div></div>
        <div class="stat-row"><div class="stat-label">Độ phân giải:</div><div class="stat-value">${video.definition?.toUpperCase()}</div></div>
        <div class="stat-row"><div class="stat-label">Phụ đề (Captions):</div><div class="stat-value">${video.caption === 'true' ? 'Có sẵn' : 'Không'}</div></div>
        <div class="stat-row"><div class="stat-label">Dạng trình chiếu:</div><div class="stat-value">${video.projection}</div></div>
        <div class="stat-row"><div class="stat-label">Bản quyền (Licensed):</div><div class="stat-value">${video.licensedContent ? 'Có' : 'Không'}</div></div>
        <div class="stat-row"><div class="stat-label">Ngôn ngữ mặc định:</div><div class="stat-value">${video.defaultLanguage || video.defaultAudioLanguage || 'N/A'}</div></div>
        <div class="stat-row"><div class="stat-label">Dành cho trẻ em:</div><div class="stat-value">${video.madeForKids ? 'Có' : 'Không'}</div></div>
        <div class="stat-row"><div class="stat-label">Địa điểm quay:</div><div class="stat-value">${video.recordingLocation || 'Không công khai'}</div></div>
      </div>

      <h2>2. CHỦ ĐỀ & PHÂN LOẠI (TOPICS)</h2>
      <p class="topic-list">${(video.topicCategories || []).map(t => `• ${t.split('/').pop()}`).join('<br>')}</p>

      <h2>3. CHỈ SỐ HIỆU SUẤT TRỰC QUAN</h2>
      <div class="stat-grid">
        <div class="stat-row"><div class="stat-label">Lượt xem:</div><div class="stat-value">${video.viewCountRaw?.toLocaleString()}</div></div>
        <div class="stat-row"><div class="stat-label">Lượt thích:</div><div class="stat-value">${video.likeCountRaw?.toLocaleString()}</div></div>
        <div class="stat-row"><div class="stat-label">Bình luận:</div><div class="stat-value">${video.commentCountRaw?.toLocaleString()}</div></div>
        <div class="stat-row"><div class="stat-label">Tỉ lệ tương tác (ER):</div><div class="stat-value">${video.engagementRate}%</div></div>
        <div class="stat-row"><div class="stat-label">Thời lượng:</div><div class="stat-value">${video.duration}</div></div>
      </div>

      <h2>4. CHIẾN LƯỢC TỪ KHOÁ (TAGS)</h2>
      <p class="tags">${(video.tags || []).join(', ')}</p>

      ${analysis ? `
        <h2>5. PHÂN TÍCH CHUYÊN SÂU TỪ AI (GEMINI)</h2>
        <div class="ai-box">
          <h3>Dự đoán Nhân khẩu học khán giả:</h3>
          <ul>
            <li><strong>Nhóm tuổi mục tiêu:</strong> ${analysis.predictedDemographics.ageGroups}</li>
            <li><strong>Tỉ lệ giới tính:</strong> ${analysis.predictedDemographics.genderDistribution}</li>
            <li><strong>Thị trường tiềm năng:</strong> ${analysis.predictedDemographics.targetLocations}</li>
          </ul>
          <hr>
          <p><strong>Bản kết luận hiệu suất:</strong><br>${analysis.performanceVerdict}</p>
          <p><strong>Cơ chế thu hút (Audience Hook):</strong><br>${analysis.audienceHook}</p>
          <p><strong>Chiến lược giữ chân (Retention):</strong><br>${analysis.retentionStrategy}</p>
          <p><strong>Dư địa tăng trưởng:</strong><br>${analysis.growthPotential}</p>
        </div>
      ` : '<p><i>Dữ liệu phân tích AI chưa được khởi tạo.</i></p>'}

      <div style="margin-top: 50px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px;">
        <p style="color: #cc0000; font-weight: bold; font-size: 14px;">TubeThumb Analytics - Data Powering Creators</p>
        <p style="color: #666; font-size: 10px;">ID Báo cáo: ${video.id}-${Date.now()}</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  downloadFile(url, `TubeThumb-FullReport-${video.id}.doc`);
};

const downloadFile = (url: string, filename: string) => {
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", url);
  downloadAnchorNode.setAttribute("download", filename);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
