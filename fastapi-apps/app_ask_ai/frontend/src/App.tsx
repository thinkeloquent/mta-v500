import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Command,
  Eye,
  Image as ImageIcon,
  MessageCircle,
  Paperclip,
  Send,
  Tag,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import appRegistry from './app-registry.json';

interface AttachedFile {
  id: string;
  name: string;
  content: string;
  tags: string[];
  priority: number;
  instruction?: string;
}

interface AttachedFileItemProps {
  file: AttachedFile;
  index: number;
  totalFiles: number;
  onRemove: (id: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onRemoveTag: (id: string, tag: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onPreview: (id: string) => void;
}

const AttachedFileItem = ({
  file,
  index,
  totalFiles,
  onRemove,
  onAddTag,
  onRemoveTag,
  onMoveUp,
  onMoveDown,
  onPreview,
}: AttachedFileItemProps) => {
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(file.id, newTag.trim());
      setNewTag('');
      setShowTagInput(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
      {/* Priority Controls */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className={`p-0.5 rounded ${
            index === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ArrowUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === totalFiles - 1}
          className={`p-0.5 rounded ${
            index === totalFiles - 1
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <button
            type="button"
            onClick={() => onPreview(file.id)}
            className="text-sm font-medium text-slate-700 hover:text-blue-600 truncate transition-colors"
          >
            {file.name}
          </button>
          <span className="text-xs text-slate-400">#{index + 1}</span>
          <button
            type="button"
            onClick={() => onPreview(file.id)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Preview content"
          >
            <Eye className="w-3 h-3" />
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1">
          {file.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveTag(file.id, tag)}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {showTagInput ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') {
                    setShowTagInput(false);
                    setNewTag('');
                  }
                }}
                placeholder="Tag name"
                className="w-20 px-2 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
            >
              <Tag className="w-3 h-3" />
              <span>Add tag</span>
            </button>
          )}
        </div>
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const AskAI = () => {
  const [query, setQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<AttachedFile | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'instruction'>('content');
  const [suggestedPage, setSuggestedPage] = useState(0);
  const [templatePage, setTemplatePage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check if it's a markdown or text file
      if (!file.name.match(/\.(md|txt|markdown)$/i)) {
        alert(
          `${file.name} is not a markdown or text file. Please upload .md, .txt, or .markdown files.`,
        );
        continue;
      }

      // Read file content
      const content = await file.text();

      const newFile: AttachedFile = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        content,
        tags: [],
        priority: attachedFiles.length,
      };

      setAttachedFiles((prev) => [...prev, newFile]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Add tag to file
  const addTag = (fileId: string, tag: string) => {
    setAttachedFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, tags: [...file.tags, tag] } : file)),
    );
  };

  // Remove tag from file
  const removeTag = (fileId: string, tagToRemove: string) => {
    setAttachedFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, tags: file.tags.filter((t) => t !== tagToRemove) } : file,
      ),
    );
  };

  // Remove file
  const removeFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  // Move file up in priority
  const moveFileUp = (index: number) => {
    if (index === 0) return;
    setAttachedFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
      return newFiles.map((file, idx) => ({ ...file, priority: idx }));
    });
  };

  // Move file down in priority
  const moveFileDown = (index: number) => {
    if (index === attachedFiles.length - 1) return;
    setAttachedFiles((prev) => {
      const newFiles = [...prev];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      return newFiles.map((file, idx) => ({ ...file, priority: idx }));
    });
  };

  // Handle file preview
  const handlePreview = (fileId: string) => {
    const file = attachedFiles.find((f) => f.id === fileId);
    if (file) {
      setPreviewFile(file);
      setActiveTab('content'); // Reset to content tab when opening preview
    }
  };

  // Update instruction for a file
  const updateInstruction = (fileId: string, instruction: string) => {
    setAttachedFiles((prev) =>
      prev.map((file) => (file.id === fileId ? { ...file, instruction } : file)),
    );
    // Also update preview file if it's the one being edited
    if (previewFile?.id === fileId) {
      setPreviewFile({ ...previewFile, instruction });
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      console.log('Submitting query:', query);
      console.log('Attached files:', attachedFiles);
      // Add your query processing logic here
      setQuery('');
      setAttachedFiles([]);
    }
  };

  // Handle quick action
  const handleQuickAction = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.15) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12 space-y-6">
            {/* Main Title Header */}
            <div className="mb-8">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
                <span className="text-slate-800">Intelligent Conversations</span>
                <br />
                <span className="text-amber-600">for Better AI Experiences</span>
                <br />
              </h1>
            </div>

            {/* Time & Status */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span>AI Mode Active</span>
              </div>
              <span className="mx-2">•</span>
              <span>
                {currentTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Main Heading with Animation */}
            <div className="space-y-4">
              <p className="text-xl lg:text-2xl text-slate-600 font-medium">
                Ask detailed questions for better responses
              </p>

              <div className="flex items-center justify-center gap-6 mt-6">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Powered by Advanced AI</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  <span>Natural Conversations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Input Section */}
          <div className="space-y-8">
            {/* Search Input */}
            <form onSubmit={handleSubmit} className="relative">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.markdown"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="bg-white rounded-xl shadow-lg border border-slate-200">
                {/* Input Field */}
                <div className="p-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask whatever you want..."
                    className="w-full text-base text-slate-700 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                {/* Bottom Bar */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                  {/* Left Side - Actions */}
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleQuickAction}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span>Add Attachment</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Use Image</span>
                    </button>
                  </div>

                  {/* Right Side - Counter and Submit */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{query.length}/1000</span>
                    <button
                      type="submit"
                      disabled={!query.trim()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        query.trim()
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Attached Files Display - Separate Section */}
              {attachedFiles.length > 0 && (
                <div className="mt-4 bg-white rounded-xl shadow-lg border border-slate-200 p-4 space-y-2">
                  {attachedFiles.map((file, index) => (
                    <AttachedFileItem
                      key={file.id}
                      file={file}
                      index={index}
                      totalFiles={attachedFiles.length}
                      onRemove={removeFile}
                      onAddTag={addTag}
                      onRemoveTag={removeTag}
                      onMoveUp={moveFileUp}
                      onMoveDown={moveFileDown}
                      onPreview={handlePreview}
                    />
                  ))}
                </div>
              )}
            </form>

            {/* App Launcher Style Suggestions Section */}
            <div className="space-y-8">
              {/* Suggested Prompts Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    </div>
                    <span className="font-medium">Suggested prompts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSuggestedPage((p) => Math.max(0, p - 1))}
                      disabled={suggestedPage === 0}
                      className={`p-1 rounded-lg transition-colors ${
                        suggestedPage === 0
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSuggestedPage((p) => p + 1)}
                      disabled={suggestedPage >= 1}
                      className={`p-1 rounded-lg transition-colors ${
                        suggestedPage >= 1
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {(() => {
                    const suggestedPrompts = [
                      {
                        title: 'Code Review',
                        subtitle: 'Analyze & improve code',
                        prompt:
                          'Review this code and suggest improvements for better performance and readability',
                      },
                      {
                        title: 'Data Analysis',
                        subtitle: 'Extract insights from data',
                        prompt:
                          'Help me analyze this dataset and find meaningful patterns and trends',
                      },
                      {
                        title: 'Content Writing',
                        subtitle: 'Create engaging content',
                        prompt:
                          'Write compelling content for my blog post about emerging technologies',
                      },
                      {
                        title: 'Problem Solving',
                        subtitle: 'Debug complex issues',
                        prompt: 'Help me troubleshoot this technical problem step by step',
                      },
                      {
                        title: 'Strategy Planning',
                        subtitle: 'Business insights',
                        prompt:
                          'Develop a strategic plan for launching a new product in the market',
                      },
                      {
                        title: 'Learning Path',
                        subtitle: 'Skill development',
                        prompt:
                          'Create a personalized learning roadmap for mastering machine learning',
                      },
                      {
                        title: 'API Design',
                        subtitle: 'RESTful architecture',
                        prompt:
                          'Design a scalable RESTful API with best practices for authentication and rate limiting',
                      },
                      {
                        title: 'Database Optimization',
                        subtitle: 'Query performance',
                        prompt:
                          'Optimize database queries and design efficient schema for high-traffic applications',
                      },
                      {
                        title: 'UI/UX Review',
                        subtitle: 'User experience audit',
                        prompt:
                          'Review this interface design and suggest UX improvements for better user engagement',
                      },
                      {
                        title: 'Test Coverage',
                        subtitle: 'Unit & integration tests',
                        prompt:
                          'Generate comprehensive test cases including edge cases and integration scenarios',
                      },
                      {
                        title: 'Security Audit',
                        subtitle: 'Vulnerability assessment',
                        prompt:
                          'Review code for security vulnerabilities and suggest remediation strategies',
                      },
                      {
                        title: 'DevOps Setup',
                        subtitle: 'CI/CD pipelines',
                        prompt:
                          'Design CI/CD pipeline with automated testing, deployment, and monitoring',
                      },
                    ];
                    const itemsPerPage = 6;
                    const startIndex = suggestedPage * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    return suggestedPrompts.slice(startIndex, endIndex).map((item, index) => (
                      <button
                        key={`suggested-${startIndex + index}`}
                        onClick={() => {
                          setQuery(item.prompt);
                          inputRef.current?.focus();
                        }}
                        className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 p-3 text-left"
                      >
                        <h4 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{item.subtitle}</p>
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Template Prompts Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    </div>
                    <span className="font-medium">Template Prompts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTemplatePage((p) => Math.max(0, p - 1))}
                      disabled={templatePage === 0}
                      className={`p-1 rounded-lg transition-colors ${
                        templatePage === 0
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTemplatePage((p) => p + 1)}
                      disabled={templatePage >= 1}
                      className={`p-1 rounded-lg transition-colors ${
                        templatePage >= 1
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {(() => {
                    const templatePrompts = [
                      {
                        title: 'Meeting Notes',
                        subtitle: 'Structured summaries',
                        prompt:
                          'Create professional meeting notes template with action items and key decisions',
                      },
                      {
                        title: 'Email Draft',
                        subtitle: 'Professional emails',
                        prompt:
                          'Draft a professional email template for client communication and proposals',
                      },
                      {
                        title: 'Project Plan',
                        subtitle: 'Task breakdown',
                        prompt:
                          'Generate a detailed project plan template with milestones and deliverables',
                      },
                      {
                        title: 'Report Template',
                        subtitle: 'Structured reports',
                        prompt:
                          'Create a comprehensive report template for quarterly business reviews',
                      },
                      {
                        title: 'Documentation',
                        subtitle: 'Technical guides',
                        prompt: 'Build a technical documentation template for API specifications',
                      },
                      {
                        title: 'Presentation',
                        subtitle: 'Slide outlines',
                        prompt:
                          'Design a presentation template for product launch and feature demos',
                      },
                      {
                        title: 'Sprint Retro',
                        subtitle: 'Team feedback',
                        prompt:
                          'Create sprint retrospective template with what went well, challenges, and action items',
                      },
                      {
                        title: 'User Story',
                        subtitle: 'Feature requirements',
                        prompt:
                          'Generate user story template with acceptance criteria and definition of done',
                      },
                      {
                        title: 'Bug Report',
                        subtitle: 'Issue tracking',
                        prompt:
                          'Design bug report template with reproduction steps, environment, and severity',
                      },
                      {
                        title: 'Release Notes',
                        subtitle: 'Version updates',
                        prompt:
                          'Create release notes template highlighting new features, fixes, and breaking changes',
                      },
                      {
                        title: 'RFP Response',
                        subtitle: 'Proposal writing',
                        prompt:
                          'Build RFP response template with company overview, solution approach, and pricing',
                      },
                      {
                        title: 'Status Update',
                        subtitle: 'Progress reports',
                        prompt:
                          'Generate status update template with achievements, blockers, and next steps',
                      },
                    ];
                    const itemsPerPage = 6;
                    const startIndex = templatePage * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    return templatePrompts.slice(startIndex, endIndex).map((item, index) => (
                      <button
                        key={`template-${startIndex + index}`}
                        onClick={() => {
                          setQuery(item.prompt);
                          inputRef.current?.focus();
                        }}
                        className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 p-3 text-left"
                      >
                        <h4 className="text-sm font-semibold text-slate-800 mb-1 line-clamp-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{item.subtitle}</p>
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* My Apps Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">My Appsss</h3>

                  <div className="flex items-center gap-3">
                    {/* Category Filter Dropdown */}
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300 transition-colors">
                      <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                      </div>
                      <span>Work</span>
                      <ChevronRight className="w-4 h-4 transform rotate-90" />
                    </button>

                    {/* Sort Button */}
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300 transition-colors">
                      <span>Sort</span>
                      <ChevronRight className="w-4 h-4 transform rotate-90" />
                    </button>
                  </div>
                </div>

                {/* App Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {(() => {
                    // Color mapping for apps
                    const colorMap: Record<string, string> = {
                      'react-component-esm': 'bg-blue-200',
                      'persona-editor': 'bg-green-200',
                      'chat-window': 'bg-purple-200',
                      'aws-s3-files': 'bg-orange-200',
                      'figma-component-inspector': 'bg-pink-200',
                      'ask-ai': 'bg-amber-200',
                    };

                    // Convert registry to app list
                    const apps = Object.entries(appRegistry.apps).map(
                      ([key, app]: [string, any]) => ({
                        name: app.displayName,
                        url: `/apps/${key}`,
                        color: colorMap[key] || 'bg-gray-200',
                      }),
                    );

                    return apps.map((app, index) => (
                      <button
                        key={`app-${index}`}
                        onClick={() => {
                          window.location.href = app.url;
                        }}
                        className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 aspect-square p-4"
                      >
                        {/* Three dots menu */}
                        <div className="absolute top-3 right-3 opacity-60 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-0.5">
                            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                          </div>
                        </div>

                        {/* App content */}
                        <div className="flex flex-col items-center justify-center h-full space-y-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <div className={`w-8 h-8 rounded-xl ${app.color}`}></div>
                          <div className="text-xs text-slate-700 font-medium text-center line-clamp-2">
                            {app.name}
                          </div>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Additional Features */}
            <div className="flex items-center justify-center gap-8 pt-8">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Command className="w-4 h-4" />
                <span>
                  Press <kbd className="px-2 py-1 text-xs bg-slate-200 rounded">⌘ + K</kbd> for
                  quick access
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500">
                <span>AI responses improve with context</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <Paperclip className="w-5 h-5 text-slate-500" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{previewFile.name}</h3>
                  <p className="text-sm text-slate-500">{previewFile.content.length} characters</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'content'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                File Content
              </button>
              <button
                onClick={() => setActiveTab('instruction')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'instruction'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                Instruction
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'content' ? (
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg border border-slate-200">
                  {previewFile.content}
                </pre>
              ) : (
                <div className="h-full">
                  <textarea
                    value={previewFile.instruction || ''}
                    onChange={(e) => updateInstruction(previewFile.id, e.target.value)}
                    placeholder="Add instructions for how this file should be used or processed..."
                    className="w-full h-full min-h-[300px] text-sm text-slate-700 placeholder-slate-400 bg-slate-50 p-4 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="flex flex-wrap items-center gap-2">
                {previewFile.tags.length > 0 ? (
                  <>
                    <span className="text-sm text-slate-500">Tags:</span>
                    {previewFile.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-sm text-slate-400">No tags</span>
                )}
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        kbd {
          box-shadow:
            0 1px 0 rgba(0, 0, 0, 0.2),
            inset 0 0 0 2px #fff;
        }
      `}</style>
    </div>
  );
};

export default AskAI;
