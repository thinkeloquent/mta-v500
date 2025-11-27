import { useState, useMemo, SVGProps } from 'react';

// --- Types ---
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

const CheckBadgeIcon = (props: SVGIconProps) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.78l1.06 1.06a1 1 0 0 0 1.41 0l1.06-1.06a4 4 0 0 1 4.78 4.78l-1.06 1.06a1 1 0 0 0 0 1.41l1.06 1.06a4 4 0 0 1-4.78 4.78l-1.06-1.06a1 1 0 0 0-1.41 0l-1.06 1.06a4 4 0 0 1-4.78-4.78l1.06-1.06a1 1 0 0 0 0-1.41z"/>
        <path d="m9 12 2 2 4-4"/>
    </svg>
);


// --- Mock Data ---
const mockData = [
  {
    type: 'Docker',
    name: 'postgres',
    description: 'The world\'s most advanced open source relational database.',
    stars: 15200,
    forks: 4100,
    health: 98,
    isVerified: true,
    isTrending: true,
    tags: ['database', 'sql', 'postgres', 'storage'],
  },
  {
    type: 'NPM',
    name: 'fastify',
    description: 'Fast and low overhead web framework, for Node.js.',
    stars: 29900,
    forks: 2200,
    health: 95,
    isVerified: true,
    isTrending: true,
    tags: ['web', 'framework', 'node', 'performance'],
  },
  {
    type: 'Python',
    name: 'pandas',
    description: 'Flexible and powerful data analysis / manipulation library for Python.',
    stars: 42100,
    forks: 17800,
    health: 99,
    isVerified: true,
    isTrending: false,
    tags: ['data-science', 'python', 'analysis', 'ml'],
  },
  {
    type: 'Docker',
    name: 'nginx',
    description: 'Official build of Nginx. High-performance HTTP server and reverse proxy.',
    stars: 19500,
    forks: 6700,
    health: 99,
    isVerified: true,
    isTrending: false,
    tags: ['web-server', 'proxy', 'load-balancer', 'http'],
  },
  {
    type: 'NPM',
    name: 'react',
    description: 'A JavaScript library for building user interfaces.',
    stars: 221000,
    forks: 45000,
    health: 92,
    isVerified: true,
    isTrending: true,
    tags: ['ui', 'frontend', 'javascript', 'library'],
  },
  {
    type: 'Python',
    name: 'scikit-learn',
    description: 'Machine learning in Python. Simple and efficient tools for predictive data analysis.',
    stars: 58300,
    forks: 25400,
    health: 96,
    isVerified: true,
    isTrending: true,
    tags: ['machine-learning', 'python', 'statistics', 'ml'],
  },
];

// --- Main App Component ---
function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    let data = mockData;
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
  }, [searchQuery, activeTag]);

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

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* --- Header --- */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tighter mb-2">Code Repository Hub</h1>
          <p className="text-lg text-gray-400">Discover and manage packages across your organization.</p>
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

        {/* --- Repository Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map((item) => {
            const styles = getTypeStyles(item.type);
            return (
              <div
                key={item.name}
                className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-blue-500/20 hover:border-blue-500/50 transform hover:-translate-y-1"
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
                <div className="p-4">
                  <p className="text-gray-400 text-sm mb-4 h-10">{item.description}</p>
                  
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
                    {item.tags.map(tag => (
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
        
        {filteredData.length === 0 && (
            <div className="text-center py-16">
                <p className="text-gray-400">No repositories found.</p>
                {(searchQuery || activeTag) && (
                    <button onClick={() => { setSearchQuery(''); setActiveTag(null); }} className="mt-4 text-blue-400 hover:text-blue-300">
                        Clear filters
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
