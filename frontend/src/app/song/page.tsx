import Link from 'next/link';

export default function SongPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3f7fd] to-[#e7effa] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <img
            src="/adventurer-logo.png"
            alt="Adventurer badge"
            className="w-16 h-16 mx-auto mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Adventurer Song</h1>
          <div className="w-16 h-1 bg-yellow-400 mx-auto mt-3 rounded-full" />
        </div>

        <div className="bg-blue-50 rounded-xl p-6 space-y-2">
          <h2 className="text-base font-bold text-[#1e3a5f] mb-3">The Adventurer Song</h2>
          <p className="text-gray-700 leading-relaxed italic text-center text-lg">
            &ldquo;We are Adventurers, at home, at school, at play.
          </p>
          <p className="text-gray-700 leading-relaxed italic text-center text-lg">
            We are Adventurers, we&apos;re learning every day -
          </p>
          <p className="text-gray-700 leading-relaxed italic text-center text-lg">
            To be honest, kind and true, to be like Jesus through and through.
          </p>
          <p className="text-gray-700 leading-relaxed italic text-center text-lg">
            We are Adventurers!&rdquo;
          </p>

          <div className="mt-5 border border-blue-100 rounded-lg bg-white p-3">
            <p className="text-xs font-semibold text-[#1e3a5f] mb-2">Listen to the song</p>
            <audio controls preload="metadata" className="w-full h-10">
              <source src="/audio/adventurer-song.mp3" type="audio/mpeg" />
              Your browser does not support the audio player.
            </audio>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Sing this song at every Bassonia Adventurer Club meeting
        </p>

        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/pledge" className="text-sm text-[#1e3a5f] font-semibold hover:underline">
            Pledge &amp; Law →
          </Link>
          <Link href="/philosophy" className="text-sm text-gray-400 hover:underline">
            ← Philosophy
          </Link>
        </div>
      </div>
    </div>
  );
}
