import Link from 'next/link';

const uniformItems = [
  {
    gender: 'Boys & Girls',
    items: [
      { name: 'White Shirt', desc: 'Plain white collared shirt, neatly tucked' },
      { name: 'Navy Blue Pants / Skirt', desc: 'Navy blue trousers for boys, navy blue skirt for girls' },
      { name: 'Adventurer Sash', desc: 'Official club sash worn over the left shoulder' },
      { name: 'Club Neckerchief', desc: 'Blue and gold neckerchief with the club woggle' },
      { name: 'Black Shoes', desc: 'Clean, polished black closed shoes' },
      { name: 'White Socks', desc: 'Plain white socks, pulled up neatly' },
    ],
  },
];

const badges = [
  { name: 'Club Badge', desc: 'Worn on the left chest pocket', color: 'bg-blue-400' },
  { name: 'Class Badge', desc: 'Identifies which class level the child is in', color: 'bg-yellow-400' },
  { name: 'Achievement Badges', desc: 'Earned awards displayed on the sash', color: 'bg-green-400' },
  { name: 'Staff Badge', desc: 'Worn by teachers and directors', color: 'bg-purple-400' },
];

export default function UniformPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2a5f8f] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👕</div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Uniform Guide</h1>
          <div className="w-16 h-1 bg-yellow-400 mx-auto mt-3 rounded-full" />
        </div>

        <div className="space-y-5">
          {uniformItems.map((section) => (
            <div key={section.gender} className="bg-blue-50 rounded-xl p-6">
              <h2 className="text-base font-bold text-[#1e3a5f] mb-3">{section.gender} Uniform</h2>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div key={item.name} className="flex gap-3 bg-white rounded-lg p-3 shadow-sm">
                    <span className="text-lg">👕</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-yellow-50 rounded-xl p-6">
            <h2 className="text-base font-bold text-[#1e3a5f] mb-3">Badges &amp; Insignia</h2>
            <div className="grid grid-cols-2 gap-3">
              {badges.map((badge) => (
                <div key={badge.name} className="bg-white rounded-lg p-3 shadow-sm flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-full ${badge.color} flex-shrink-0`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{badge.name}</p>
                    <p className="text-xs text-gray-500">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-5">
          Uniforms should be worn to all official Bassonia Adventurer Club meetings and events.
        </p>

        <div className="mt-4 flex gap-3 justify-center">
          <Link href="/philosophy" className="text-sm text-gray-400 hover:underline">
            ← Philosophy
          </Link>
          <Link href="/login" className="text-sm text-[#1e3a5f] font-semibold hover:underline">
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}
