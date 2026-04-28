'use client';

interface Award {
  name: string;
  category: string;
  color: string;
  completed: boolean;
}

const classAwards: Record<string, Award[]> = {
  'Busy Bee': [
    { name: 'My Bible', category: 'My God', color: 'bg-blue-400', completed: true },
    { name: 'Prayer', category: 'My God', color: 'bg-blue-500', completed: true },
    { name: 'Health', category: 'My Self', color: 'bg-green-400', completed: false },
    { name: 'Exercise', category: 'My Self', color: 'bg-green-500', completed: true },
    { name: 'Cooking', category: 'My Family', color: 'bg-yellow-400', completed: false },
    { name: 'Chores', category: 'My Family', color: 'bg-yellow-500', completed: true },
    { name: 'Nature', category: 'My World', color: 'bg-orange-400', completed: true },
    { name: 'Art', category: 'My World', color: 'bg-orange-500', completed: false },
  ],
  'Sunbeam': [
    { name: 'My Bible', category: 'My God', color: 'bg-blue-400', completed: true },
    { name: 'Prayer', category: 'My God', color: 'bg-blue-500', completed: false },
    { name: 'Health', category: 'My Self', color: 'bg-green-400', completed: true },
    { name: 'Exercise', category: 'My Self', color: 'bg-green-500', completed: true },
    { name: 'Cooking', category: 'My Family', color: 'bg-yellow-400', completed: true },
    { name: 'Chores', category: 'My Family', color: 'bg-yellow-500', completed: false },
    { name: 'Nature', category: 'My World', color: 'bg-orange-400', completed: false },
    { name: 'Art', category: 'My World', color: 'bg-orange-500', completed: true },
  ],
};

const classes = Object.keys(classAwards);

export default function AwardsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Awards</h1>
      <p className="text-gray-500 text-sm mb-6">Full color = completed · Grayscale = incomplete</p>

      {classes.map((cls) => (
        <div key={cls} className="mb-8">
          <h2 className="text-lg font-bold text-[#1e3a5f] mb-4">{cls}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {classAwards[cls].map((award) => (
              <div
                key={award.name}
                className={`rounded-xl p-5 text-center transition-all ${award.completed ? '' : 'grayscale opacity-50'}`}
              >
                <div className={`w-16 h-16 rounded-full ${award.color} mx-auto flex items-center justify-center mb-3 shadow-md`}>
                  <span className="text-white text-2xl">🏅</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{award.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{award.category}</p>
                <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  award.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {award.completed ? 'Completed' : 'Incomplete'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
