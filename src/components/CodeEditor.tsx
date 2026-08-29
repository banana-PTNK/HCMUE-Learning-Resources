import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Sparkles, Copy, Check, Upload, ClipboardPaste, Trash2, Palette, X } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import { useToast } from '../context/ToastContext';

export interface EditorTheme {
  id: string;
  name: string;
  badge: string;
  bg: string;
  headerBg: string;
  footerBg: string;
  lineNumbersBg: string;
  lineNumbersBorder: string;
  lineNumbersText: string;
  border: string;
  text: string;
  cursor: string;
  selection: string;
  colors: {
    keyword: string;
    directive: string;
    type: string;
    function: string;
    string: string;
    comment: string;
    number: string;
    operator: string;
    variable: string;
  };
}

export const EDITOR_THEMES: Record<string, EditorTheme> = {
  'vscode-dark': {
    id: 'vscode-dark',
    name: 'VS Code Dark+',
    badge: 'Mặc định',
    bg: '#1e1e1e',
    headerBg: '#252526',
    footerBg: '#252526',
    lineNumbersBg: '#1e1e1e',
    lineNumbersBorder: '#2d2d2d',
    lineNumbersText: '#858585',
    border: '#333333',
    text: '#d4d4d4',
    cursor: '#569cd6',
    selection: 'rgba(38, 79, 120, 0.55)',
    colors: {
      keyword: '#c586c0',
      directive: '#c586c0',
      type: '#4ec9b0',
      function: '#dcdcaa',
      string: '#ce9178',
      comment: '#6a9955',
      number: '#b5cea8',
      operator: '#d4d4d4',
      variable: '#9cdcfe'
    }
  },
  'one-dark-pro': {
    id: 'one-dark-pro',
    name: 'One Dark Pro (Atom)',
    badge: 'Atom',
    bg: '#282c34',
    headerBg: '#21252b',
    footerBg: '#21252b',
    lineNumbersBg: '#21252b',
    lineNumbersBorder: '#181a1f',
    lineNumbersText: '#5c6370',
    border: '#3e4451',
    text: '#abb2bf',
    cursor: '#528bff',
    selection: 'rgba(62, 68, 81, 0.65)',
    colors: {
      keyword: '#c678dd',
      directive: '#e06c75',
      type: '#e5c07b',
      function: '#61afef',
      string: '#98c379',
      comment: '#5c6370',
      number: '#d19a66',
      operator: '#56b6c2',
      variable: '#e06c75'
    }
  },
  'dracula': {
    id: 'dracula',
    name: 'Dracula',
    badge: 'Vampire',
    bg: '#282a36',
    headerBg: '#21222c',
    footerBg: '#21222c',
    lineNumbersBg: '#21222c',
    lineNumbersBorder: '#191a21',
    lineNumbersText: '#6272a4',
    border: '#44475a',
    text: '#f8f8f2',
    cursor: '#f8f8f0',
    selection: 'rgba(68, 71, 90, 0.65)',
    colors: {
      keyword: '#ff79c6',
      directive: '#ff79c6',
      type: '#8be9fd',
      function: '#50fa7b',
      string: '#f1fa8c',
      comment: '#6272a4',
      number: '#bd93f9',
      operator: '#ff79c6',
      variable: '#f8f8f2'
    }
  },
  'monokai': {
    id: 'monokai',
    name: 'Monokai',
    badge: 'Classic',
    bg: '#272822',
    headerBg: '#1e1f1c',
    footerBg: '#1e1f1c',
    lineNumbersBg: '#1e1f1c',
    lineNumbersBorder: '#171814',
    lineNumbersText: '#75715e',
    border: '#3e3d32',
    text: '#f8f8f2',
    cursor: '#f8f8f0',
    selection: 'rgba(73, 72, 62, 0.75)',
    colors: {
      keyword: '#f92672',
      directive: '#f92672',
      type: '#66d9ef',
      function: '#a6e22e',
      string: '#e6db74',
      comment: '#75715e',
      number: '#ae81ff',
      operator: '#f92672',
      variable: '#fd971f'
    }
  },
  'github-dark': {
    id: 'github-dark',
    name: 'GitHub Dark',
    badge: 'GitHub',
    bg: '#0d1117',
    headerBg: '#161b22',
    footerBg: '#161b22',
    lineNumbersBg: '#010409',
    lineNumbersBorder: '#21262d',
    lineNumbersText: '#8b949e',
    border: '#30363d',
    text: '#c9d1d9',
    cursor: '#58a6ff',
    selection: 'rgba(56, 139, 253, 0.4)',
    colors: {
      keyword: '#ff7b72',
      directive: '#ff7b72',
      type: '#79c0ff',
      function: '#d2a8ff',
      string: '#a5d6ff',
      comment: '#8b949e',
      number: '#79c0ff',
      operator: '#ff7b72',
      variable: '#ffa657'
    }
  }
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderPrismTokens(tokens: (string | Prism.Token)[], theme: EditorTheme): string {
  const { colors } = theme;
  return tokens
    .map((token) => {
      if (typeof token === 'string') {
        return escapeHtml(token);
      }
      const content = Array.isArray(token.content)
        ? renderPrismTokens(token.content, theme)
        : typeof token.content === 'object' && token.content !== null
        ? renderPrismTokens([token.content as Prism.Token], theme)
        : escapeHtml(String(token.content));

      let style = `color: ${theme.text}`;

      switch (token.type) {
        case 'comment':
        case 'prolog':
        case 'doctype':
        case 'cdata':
          style = `color: ${colors.comment}; font-style: italic;`;
          break;
        case 'keyword':
        case 'boolean':
        case 'important':
        case 'atrule':
          style = `color: ${colors.keyword}; font-weight: 600;`;
          break;
        case 'class-name':
        case 'type':
        case 'builtin':
          style = `color: ${colors.type};`;
          break;
        case 'function':
        case 'function-variable':
          style = `color: ${colors.function};`;
          break;
        case 'string':
        case 'char':
        case 'regex':
        case 'attr-value':
          style = `color: ${colors.string};`;
          break;
        case 'number':
          style = `color: ${colors.number};`;
          break;
        case 'operator':
          style = `color: ${colors.operator};`;
          break;
        case 'macro':
        case 'directive':
        case 'directive-hash':
        case 'property':
          style = `color: ${colors.directive}; font-weight: 600;`;
          break;
        case 'variable':
        case 'constant':
        case 'symbol':
        case 'entity':
          style = `color: ${colors.variable};`;
          break;
        case 'punctuation':
          style = `color: ${colors.operator || theme.text}; opacity: 0.9;`;
          break;
        default:
          style = `color: ${theme.text};`;
      }

      return `<span style="${style}">${content}</span>`;
    })
    .join('');
}

function highlightSyntax(rawCode: string, lang: string, theme: EditorTheme): string {
  if (!rawCode) return '';
  let grammar = Prism.languages.cpp;
  if (lang === 'python') {
    grammar = Prism.languages.python || Prism.languages.clike;
  } else if (lang === 'java') {
    grammar = Prism.languages.java || Prism.languages.clike;
  } else if (lang === 'javascript' || lang === 'js') {
    grammar = Prism.languages.javascript || Prism.languages.clike;
  } else if (lang === 'typescript' || lang === 'ts') {
    grammar = Prism.languages.typescript || Prism.languages.javascript || Prism.languages.clike;
  } else {
    grammar = Prism.languages.cpp || Prism.languages.clike;
  }

  try {
    const tokens = Prism.tokenize(rawCode, grammar);
    return renderPrismTokens(tokens, theme);
  } catch {
    return escapeHtml(rawCode);
  }
}

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const SAMPLE_ALGORITHMS: { [key: string]: { name: string; lang: string; code: string } } = {
  binarySearch: {
    name: 'Tìm kiếm nhị phân (Binary Search)',
    lang: 'cpp',
    code: `// Thuật toán Tìm kiếm Nhị phân - HCMUE FIT
#include <iostream>
#include <vector>
using namespace std;

int binarySearch(const vector<int>& arr, int target) {
    int left = 0;
    int right = arr.size() - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        if (arr[mid] == target) {
            return mid; // Tìm thấy phần tử tại vị trí mid
        } else if (arr[mid] < target) {
            left = mid + 1; // Tìm ở nửa bên phải
        } else {
            right = mid - 1; // Tìm ở nửa bên trái
        }
    }
    return -1; // Không tìm thấy phần tử
}`
  },
  quickSort: {
    name: 'Sắp xếp nhanh (QuickSort)',
    lang: 'cpp',
    code: `// Thuật toán QuickSort phân hoạch Lomuto
#include <vector>
#include <algorithm>
using namespace std;

int partition(vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = (low - 1);
    
    for (int j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[high]);
    return (i + 1);
}

void quickSort(vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}`
  },
  dijkstra: {
    name: 'Đường đi ngắn nhất (Dijkstra)',
    lang: 'cpp',
    code: `// Thuật toán Dijkstra tìm đường đi ngắn nhất đồ thị trọng số dương
#include <vector>
#include <queue>
using namespace std;

vector<int> dijkstra(int V, vector<vector<pair<int, int>>>& adj, int src) {
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    vector<int> dist(V, 1e9);
    
    dist[src] = 0;
    pq.push({0, src});
    
    while (!pq.empty()) {
        int u = pq.top().second;
        int d = pq.top().first;
        pq.pop();
        
        if (d > dist[u]) continue;
        
        for (auto& edge : adj[u]) {
            int v = edge.first;
            int weight = edge.second;
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}`
  },
  reverseList: {
    name: 'Đảo ngược danh sách liên kết',
    lang: 'python',
    code: `# Đảo ngược Single Linked List trong Python 3
class ListNode:
    def __init__(self, val: int = 0, next: 'ListNode' = None):
        self.val = val
        self.next = next

def reverseList(head: ListNode) -> ListNode:
    prev = None
    curr = head
    while curr:
        next_temp = curr.next
        curr.next = prev
        prev = curr
        curr = next_temp
    return prev`
  }
};

function detectLanguageFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'c':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'py':
    case 'pyw':
      return 'python';
    case 'java':
      return 'java';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'javascript';
    default:
      return 'cpp';
  }
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  language,
  onLanguageChange,
  onAnalyze,
  isAnalyzing
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem('hcmue_code_editor_theme') || 'vscode-dark';
  });

  const currentTheme: EditorTheme = EDITOR_THEMES[themeId] || EDITOR_THEMES['vscode-dark'];

  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
  const [pasteDialogText, setPasteDialogText] = useState('');

  const dragCounterRef = useRef(0);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleThemeChange = (newThemeId: string) => {
    setThemeId(newThemeId);
    localStorage.setItem('hcmue_code_editor_theme', newThemeId);
  };

  const handleCopy = () => {
    if (!code) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopied(true);
    toast.info('Đã sao chép mã nguồn!', 'Đoạn mã đã được lưu vào clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Safe Universal Clipboard Paste Handler
  const handlePasteClipboard = async () => {
    let directPasteSuccess = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onChange(text);
          toast.success('Đã dán mã nguồn thành công!', `Đã nạp ${text.split('\n').length} dòng mã.`);
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.scrollTop = 0;
          }
          directPasteSuccess = true;
          return;
        }
      }
    } catch {
      // Direct clipboard reading blocked by browser permission policy
    }

    // Always pop up the dedicated paste dialog if direct reading didn't occur
    if (!directPasteSuccess) {
      setIsPasteDialogOpen(true);
      setPasteDialogText('');
      setTimeout(() => {
        dialogTextareaRef.current?.focus();
      }, 50);
    }
  };

  const handleConfirmDialogPaste = () => {
    if (pasteDialogText.trim()) {
      onChange(pasteDialogText);
      toast.success('Đã nạp mã nguồn thành công!', `Đã thêm ${pasteDialogText.split('\n').length} dòng mã.`);
      setIsPasteDialogOpen(false);
      setPasteDialogText('');
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = 0;
      }
    } else {
      setIsPasteDialogOpen(false);
    }
  };

  const handleClearCode = () => {
    onChange('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Tệp quá lớn', 'Vui lòng chọn tệp mã nguồn nhỏ hơn 5MB.');
      return;
    }

    try {
      let content = '';
      if (typeof file.text === 'function') {
        content = await file.text();
      } else {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }

      if (typeof content === 'string') {
        const detectedLang = detectLanguageFromFileName(file.name);
        onChange(content);
        onLanguageChange(detectedLang);
        toast.success(
          `Đã tải lên tệp: ${file.name}`,
          `Tự động nhận diện [${detectedLang.toUpperCase()}] với ${content.split('\n').length} dòng mã.`
        );
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollTop = 0;
        }
      }
    } catch (err) {
      console.error('Lỗi khi đọc file:', err);
      toast.error('Lỗi đọc tệp', 'Không thể đọc nội dung tệp mã nguồn này.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingFile(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleSelectPreset = (key: string) => {
    if (SAMPLE_ALGORITHMS[key]) {
      onChange(SAMPLE_ALGORITHMS[key].code);
      onLanguageChange(SAMPLE_ALGORITHMS[key].lang);
      toast.info('Đã tải thuật toán mẫu', SAMPLE_ALGORITHMS[key].name);
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = 0;
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = scrollTop;
      highlightRef.current.scrollLeft = scrollLeft;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop;
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  }, [code, themeId, language]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '    ';

      const newCode = code.substring(0, start) + spaces + code.substring(end);
      onChange(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const highlightedHtml = useMemo(() => {
    return highlightSyntax(code, language, currentTheme);
  }, [code, language, currentTheme]);

  const lines = code ? code.split('\n') : [''];

  const codeStyles: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '13px',
    lineHeight: '24px',
    tabSize: 4,
    letterSpacing: '0px',
    whiteSpace: 'pre',
    wordBreak: 'normal',
    wordWrap: 'normal',
    padding: '16px',
    boxSizing: 'border-box',
    margin: 0,
  };

  return (
    <div
      className="flex flex-col flex-1 w-full min-h-[580px] lg:min-h-[640px] h-full rounded-2xl shadow-2xl overflow-hidden relative transition-colors duration-200"
      style={{
        backgroundColor: currentTheme.bg,
        borderColor: currentTheme.border,
        borderWidth: '1px'
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".cpp,.c,.cc,.cxx,.h,.hpp,.py,.pyw,.java,.js,.jsx,.ts,.tsx,.cs,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Fallback Paste Dialog Modal */}
      {isPasteDialogOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsPasteDialogOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <ClipboardPaste className="w-5 h-5 text-indigo-400" />
                <span>Khung dán mã nguồn</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteDialogOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Nhấn tổ hợp phím <strong className="text-indigo-400 font-mono">Ctrl + V</strong> (hoặc Cmd + V) vào khung dưới đây để nạp mã nguồn:
            </p>
            <textarea
              ref={dialogTextareaRef}
              rows={8}
              value={pasteDialogText}
              onChange={(e) => setPasteDialogText(e.target.value)}
              placeholder="// Dán đoạn mã nguồn của bạn vào đây..."
              className="w-full p-3 font-mono text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPasteDialogOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDialogPaste}
                disabled={!pasteDialogText.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition shadow-md shadow-indigo-600/30"
              >
                Nạp mã nguồn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-blue-950/95 border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-3 backdrop-blur-md pointer-events-none transition-all">
          <div className="p-4 rounded-full bg-blue-600/30 text-blue-300 animate-bounce">
            <Upload className="w-10 h-10" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-bold text-white">Thả tệp mã nguồn vào đây</p>
            <p className="text-xs text-blue-200">Hỗ trợ C++, Python, Java, JavaScript, TypeScript (.cpp, .py, .java, .js, .ts, .txt)</p>
          </div>
        </div>
      )}

      {/* Editor Header Bar */}
      <div
        className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 transition-colors duration-200"
        style={{
          backgroundColor: currentTheme.headerBg,
          borderColor: currentTheme.border
        }}
      >
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>

          <select
            id="code-language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="px-2.5 py-1 rounded-lg border text-xs font-medium focus:outline-hidden cursor-pointer"
            style={{
              backgroundColor: currentTheme.bg,
              borderColor: currentTheme.border,
              color: currentTheme.text
            }}
          >
            <option value="cpp">C++ (GCC 14 / Clang)</option>
            <option value="python">Python 3.12</option>
            <option value="java">Java 21</option>
            <option value="javascript">JavaScript / TypeScript</option>
          </select>

          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: currentTheme.bg,
                borderColor: currentTheme.border,
                color: currentTheme.text
              }}
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-slate-400">Theme:</span>
              <select
                id="code-theme-select"
                value={themeId}
                onChange={(e) => handleThemeChange(e.target.value)}
                className="bg-transparent border-none text-xs font-medium focus:outline-hidden cursor-pointer pr-1"
                style={{
                  color: currentTheme.text
                }}
              >
                {Object.values(EDITOR_THEMES).map((thm) => (
                  <option key={thm.id} value={thm.id} className="bg-slate-900 text-slate-100 py-1">
                    {thm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            id="upload-code-file-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Tải lên tệp mã nguồn từ máy tính"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-700/70 text-xs font-medium text-emerald-300 transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tải file</span>
          </button>

          <button
            type="button"
            id="paste-code-btn"
            onClick={handlePasteClipboard}
            title="Dán mã nguồn từ Clipboard hoặc mở khung dán"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/90 border border-blue-700/70 text-xs font-medium text-blue-300 transition-colors shadow-xs cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-blue-400" />
            <span>Dán code</span>
          </button>

          <select
            id="algorithm-preset-select"
            onChange={(e) => handleSelectPreset(e.target.value)}
            defaultValue=""
            className="px-2.5 py-1.5 rounded-lg border text-xs focus:outline-hidden cursor-pointer"
            style={{
              backgroundColor: currentTheme.bg,
              borderColor: currentTheme.border,
              color: currentTheme.text
            }}
          >
            <option value="" disabled>Mã mẫu...</option>
            <option value="binarySearch">Tìm kiếm nhị phân</option>
            <option value="quickSort">Sắp xếp QuickSort</option>
            <option value="dijkstra">Dijkstra đồ thị</option>
            <option value="reverseList">Đảo ngược DSLK</option>
          </select>

          <button
            type="button"
            id="copy-code-btn"
            onClick={handleCopy}
            title="Sao chép toàn bộ mã nguồn"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: currentTheme.text }}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {code && (
            <button
              type="button"
              id="clear-code-btn"
              onClick={handleClearCode}
              title="Xóa toàn bộ mã nguồn"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div
        className="relative flex flex-row h-[500px] min-h-[460px] w-full overflow-hidden font-mono text-xs"
        style={{ backgroundColor: currentTheme.bg }}
      >
        <div
          ref={lineNumbersRef}
          className="py-4 px-2.5 select-none text-right border-r w-12 shrink-0 font-mono text-[13px] leading-6 overflow-hidden pointer-events-none transition-colors duration-200"
          style={{
            backgroundColor: currentTheme.lineNumbersBg,
            borderColor: currentTheme.lineNumbersBorder,
            color: currentTheme.lineNumbersText
          }}
        >
          {lines.map((_, i) => (
            <div key={i} className="h-6">
              {i + 1}
            </div>
          ))}
        </div>

        <div className="relative flex-1 w-full h-full min-w-0 overflow-hidden">
          <pre
            ref={highlightRef}
            aria-hidden="true"
            className="w-full h-full overflow-hidden pointer-events-none absolute inset-0 border-0 z-0 select-none"
            style={{
              ...codeStyles,
              color: currentTheme.text,
              backgroundColor: 'transparent',
            }}
            dangerouslySetInnerHTML={{
              __html: highlightedHtml + (code.endsWith('\n') ? '\n ' : '')
            }}
          />

          <textarea
            ref={textareaRef}
            id="code-input-textarea"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            className="w-full h-full resize-none focus:outline-hidden overflow-y-auto overflow-x-auto border-0 focus:ring-0 absolute inset-0 z-10 bg-transparent selection:bg-indigo-500/40 selection:text-transparent"
            style={{
              ...codeStyles,
              color: code ? 'transparent' : currentTheme.lineNumbersText,
              caretColor: currentTheme.cursor || '#38bdf8',
              WebkitTextFillColor: code ? 'transparent' : currentTheme.lineNumbersText,
            }}
            placeholder="// Nhập hoặc dán mã nguồn trực tiếp vào đây, hoặc nhấn 'Dán code' / 'Tải file'..."
          />
        </div>
      </div>

      {/* Editor Footer */}
      <div
        className="px-4 py-3 border-t flex items-center justify-end shrink-0 transition-colors duration-200"
        style={{
          backgroundColor: currentTheme.footerBg,
          borderColor: currentTheme.border
        }}
      >
        <button
          id="run-ai-analyze-btn"
          onClick={onAnalyze}
          disabled={isAnalyzing || !code.trim()}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Đang phân tích thuật toán...' : '✨ Phân tích Mã nguồn'}</span>
        </button>
      </div>
    </div>
  );
};
