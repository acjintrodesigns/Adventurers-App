import Link from 'next/link';

export default function SongPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#2a5f8f] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="text-2xl font-bold text-[#1e3a5f] mb-2">The Adventurer Song</h1>
        <div className="w-16 h-1 bg-yellow-400 mx-auto mb-6 rounded-full" />

        <div className="bg-blue-50 rounded-xl p-6 text-left space-y-2">
          <p className="text-gray-700 leading-relaxed italic text-center">
            &ldquo;We are Adventurers, Keeping pure and true,
          </p>
          <p className="text-gray-700 leading-relaxed italic text-center">
            Striving ever onward, Jesus guides us through,
          </p>
          <p className="text-gray-700 leading-relaxed italic text-center">
            Building for the Master, Faithfully and well,
          </p>
          <p className="text-gray-700 leading-relaxed italic text-center">
            Living and giving, His story we will tell.&rdquo;
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Sing this song at every Adventurer Club meeting
        </p>

        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/pledge" className="text-sm text-[#1e3a5f] font-semibold hover:underline">
            Pledge &amp; Law →
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:underline">
            Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}
