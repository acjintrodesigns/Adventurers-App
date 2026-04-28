import Link from 'next/link';

export default function PhilosophyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2a5f8f] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📖</div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Philosophy &amp; Objectives</h1>
          <div className="w-16 h-1 bg-yellow-400 mx-auto mt-3 rounded-full" />
        </div>

        <div className="space-y-5">
          <div className="bg-blue-50 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1e3a5f] mb-2">Philosophy</h2>
            <p className="text-gray-700 leading-relaxed">
              The Adventurer Club meets the spiritual, physical, mental, and social needs of children in grades 1–4 (ages 6–9).
              It is a ministry of the local church designed to partner with parents to nurture their children&apos;s growth.
            </p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1e3a5f] mb-3">Core Objectives</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: '🙏', label: 'Spiritual Growth', desc: 'Build a personal relationship with Jesus' },
                { icon: '💪', label: 'Physical Wellness', desc: 'Develop healthy habits and active lifestyles' },
                { icon: '🧠', label: 'Mental Development', desc: 'Encourage curiosity, creativity, and learning' },
                { icon: '🤝', label: 'Social Skills', desc: 'Foster friendship, teamwork, and community' },
              ].map((obj) => (
                <div key={obj.label} className="bg-white rounded-lg p-4 shadow-sm">
                  <span className="text-2xl">{obj.icon}</span>
                  <p className="font-semibold text-[#1e3a5f] text-sm mt-1">{obj.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{obj.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-green-50 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1e3a5f] mb-2">Target Age Group</h2>
            <p className="text-gray-700">
              <strong>Grades 1–4</strong> · Ages <strong>6–9 years</strong>
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Organized into class levels: Little Lamb, Early Bird, Busy Bee, Sunbeam, Builder, and Helping Hand.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/uniform" className="text-sm text-[#1e3a5f] font-semibold hover:underline">
            Uniform Guide →
          </Link>
          <Link href="/pledge" className="text-sm text-gray-400 hover:underline">
            ← Pledge
          </Link>
        </div>
      </div>
    </div>
  );
}
