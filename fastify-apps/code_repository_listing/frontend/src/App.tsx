import { useState, useMemo, useEffect, SVGProps, ChangeEvent, FormEvent } from 'react';

// --- Types ---
interface Repository {
  name: string;
  description: string;
  type: string;
  stars: number;
  forks: number;
  health: number;
  isVerified?: boolean;
  isTrending?: boolean;
  tags: string[];
}

interface RepoFormData {
  name: string;
  description: string;
  type: string;
  tags: string;
}

interface RepoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  setError: (error: string | null) => void;
  repoToEdit: Repository | null;
}

type SVGIconProps = SVGProps<SVGSVGElement> & { title?: string };

// --- Helper Components & Icons ---

const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const StarIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const GitForkIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="18" r="3"></circle>
    <circle cx="6" cy="6" r="3"></circle>
    <circle cx="18" cy="6" r="3"></circle>
    <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"></path>
    <path d="M12 12v3"></path>
  </svg>
);

const TrashIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
);

const CheckBadgeIcon = (props: SVGIconProps) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.78l1.06 1.06a1 1 0 0 0 1.41 0l1.06-1.06a4 4 0 0 1 4.78 4.78l-1.06 1.06a1 1 0 0 0 0 1.41l1.06 1.06a4 4 0 0 1-4.78 4.78l-1.06-1.06a1 1 0 0 0-1.41 0l-1.06 1.06a4 4 0 0 1-4.78-4.78l1.06-1.06a1 1 0 0 0 0-1.41z"/>
        <path d="m9 12 2 2 4-4"/>
    </svg>
);

const PlusCircleIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
);

const PencilIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
        <path d="m15 5 4 4"/>
    </svg>
);


// --- Repo Editor Modal ---
const RepoEditorModal = ({ isOpen, onClose, onSave, setError, repoToEdit }: RepoEditorModalProps) => {
    const [repo, setRepo] = useState<RepoFormData | null>(null);
    const isEditMode = !!repoToEdit;

    useEffect(() => {
        if (isOpen) {
            // Set initial state when modal opens
            setRepo(repoToEdit ? { ...repoToEdit, tags: (repoToEdit.tags || []).join(', ') } : {
                name: '',
                description: '',
                type: 'NPM',
                tags: ''
            });
        }
    }, [isOpen, repoToEdit]);

    if (!isOpen || !repo) return null;

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setRepo(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!repo.name || !repo.description || !repo.type) {
            alert('Please fill all fields.');
            return;
        }

        const repoData = {
            ...repo,
            tags: repo.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
        };

        const url = isEditMode 
            ? `/api/code-repository-listing/repositories/${repoToEdit.name}` 
            : '/api/code-repository-listing/repositories';
        
        const method = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(repoData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            onSave(); // Trigger data refetch and close modal
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An error occurred');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-lg border border-gray-700" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Repository' : 'Create New Repository'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                        <input type="text" name="name" value={repo.name} onChange={handleChange} required disabled={isEditMode} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                        <textarea name="description" value={repo.description} onChange={handleChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                        <select name="type" value={repo.type} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option>NPM</option>
                            <option>Docker</option>
                            <option>Python</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Tags (comma-separated)</label>
                        <input type="text" name="tags" value={repo.tags} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-semibold">{isEditMode ? 'Save Changes' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Main App Component ---
function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  const fetchData = async () => {
    try {
      const response = await fetch('/api/code-repository-listing/repositories');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRepositories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, []);

  const handleDelete = async (repoName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${repoName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/code-repository-listing/repositories/${repoName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete repository. Status: ${response.status}`);
      }
      await fetchData(); // Refetch data to update the list
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    }
  };

  const handleOpenCreate = () => {
    setEditingRepo(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (repo: Repository) => {
    setEditingRepo(repo);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsModalOpen(false);
    setEditingRepo(null);
    setIsLoading(true); // Show loading indicator while refetching
    await fetchData();
  };

  const filteredData = useMemo(() => {
    let data = repositories;
    if (activeTag) {
      data = data.filter(item => item.tags.includes(activeTag));
    }
    if (searchQuery) {
      data = data.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return data;
  }, [searchQuery, activeTag, repositories]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'Docker':
        return {
          gradient: 'from-blue-500 to-sky-600',
          icon: '🐳',
        };
      case 'NPM':
        return {
          gradient: 'from-red-500 to-pink-600',
          icon: '📦',
        };
      case 'Python':
        return {
          gradient: 'from-yellow-400 to-amber-500',
          icon: '🐍',
        };
      default:
        return {
          gradient: 'from-gray-500 to-gray-600',
          icon: '📁',
        };
    }
  };

  const getHealthColor = (health: number) => {
    if (health > 95) return 'text-green-400';
    if (health > 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center py-16 text-gray-400">Loading repositories...</div>;
    }

    if (error) {
      return <div className="text-center py-16 text-red-400">Error: {error}</div>;
    }

    if (filteredData.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-gray-400">No repositories found.</p>
          {(searchQuery || activeTag) && (
            <button onClick={() => { setSearchQuery(''); setActiveTag(null); }} className="mt-4 text-blue-400 hover:text-blue-300">
              Clear filters
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((item) => {
          const styles = getTypeStyles(item.type);
          return (
            <div
              key={item.name}
              className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-blue-500/20 hover:border-blue-500/50 transform hover:-translate-y-1 group"
            >
              {/* --- Card Header --- */}
              <div className={`p-4 bg-gradient-to-br ${styles.gradient} flex justify-between items-start`}>
                <div>
                  <span className="text-2xl mr-2">{styles.icon}</span>
                  <span className="text-xl font-bold">{item.name}</span>
                </div>
                <div className="flex gap-2 items-center">
                  {item.isTrending && (
                      <span className="text-xs font-semibold bg-white/20 text-white px-2 py-1 rounded-full animate-pulse">🔥 Trending</span>
                  )}
                  {item.isVerified && (
                      <CheckBadgeIcon className="w-6 h-6 text-white" title="Verified"/>
                  )}
                </div>
              </div>

              {/* --- Card Body --- */}
              <div className="p-4 relative">
                 <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 bg-gray-700/50 rounded-full text-gray-400 hover:bg-blue-500/50 hover:text-white"
                      title={`Edit ${item.name}`}
                    >
                      <PencilIcon className="w-4 h-4"/>
                    </button>
                    <button 
                      onClick={() => handleDelete(item.name)}
                      className="p-1.5 bg-gray-700/50 rounded-full text-gray-400 hover:bg-red-500/50 hover:text-white"
                      title={`Delete ${item.name}`}
                    >
                      <TrashIcon className="w-4 h-4"/>
                    </button>
                </div>

                <p className="text-gray-400 text-sm mb-4 h-10 pr-8">{item.description}</p>
                
                {/* --- Stats --- */}
                <div className="flex justify-between items-center text-sm mb-4 border-t border-b border-gray-700 py-2">
                  <div className="flex items-center gap-1.5">
                    <StarIcon className="w-4 h-4 text-yellow-400" />
                    <span className="font-semibold">{(item.stars / 1000).toFixed(1)}k</span>
                    <span className="text-gray-500">stars</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <GitForkIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold">{(item.forks / 1000).toFixed(1)}k</span>
                    <span className="text-gray-500">forks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-full ${getHealthColor(item.health).replace('text-','bg-')}`}></div>
                    <span className={`${getHealthColor(item.health)} font-semibold`}>{item.health}%</span>
                    <span className="text-gray-500">health</span>
                  </div>
                </div>

                {/* --- Tags --- */}
                <div className="flex flex-wrap gap-2">
                  {(item.tags || []).map(tag => (
                    <button
                      key={tag}
                      onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        activeTag === tag
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <RepoEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        setError={setError}
        repoToEdit={editingRepo}
      />
      <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* --- Header --- */}
          <header className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold tracking-tighter mb-2">Code Repository Hub</h1>
                <p className="text-lg text-gray-400">Discover and manage packages across your organization.</p>
              </div>
              <button 
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 transition-colors"
              >
                <PlusCircleIcon className="w-5 h-5"/>
                <span>Create New</span>
              </button>
            </div>
          </header>

          {/* --- Search and Filter --- */}
          <div className="mb-8 relative">
            <SearchIcon className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* --- Render Content --- */}
          {renderContent()}
        </div>
      </div>
    </>
  );
}

export default App;
