import React from 'react';
import { nativeAlert } from '../utils/dialogs';

interface AboutViewProps {
  onNavigate: (screen: string) => void;
}

export default function AboutView({ onNavigate }: AboutViewProps) {
  return (
    <div className="space-y-6 pt-2">
      {/* Navigation Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 text-xs text-[#004ac6] font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Settings</span>
        </button>
        <button
          onClick={() => nativeAlert('Project share link copied to clipboard!')}
          className="material-symbols-outlined text-[#737686] hover:text-[#004ac6] p-2 hover:bg-white/50 rounded-full transition-colors active:scale-95"
        >
          share
        </button>
      </div>

      {/* Brand Identity Section */}
      <section className="flex flex-col items-center justify-center text-center py-4">
        <div className="w-20 h-20 bg-[#2563eb] rounded-3xl flex items-center justify-center shadow-md mb-4 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-white text-[44px] fill-icon">medication</span>
        </div>
        <h2 className="text-xl font-bold text-[#111c2d] tracking-tight">MedLink IoT</h2>
        <p className="text-xs font-semibold text-[#2563eb] mt-1">v1.0.0 Stable Build</p>
      </section>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Hardware Specs */}
        <div className="col-span-2 bg-white/70 backdrop-blur-md p-4 rounded-xl border border-[#c3c6d7]/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7cf994]/20 text-[#007230] flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">memory</span>
            </div>
            <div>
              <p className="text-[10px] text-[#737686] uppercase font-bold tracking-wider">ESP32 Firmware</p>
              <p className="text-sm font-bold text-[#111c2d] font-mono leading-none mt-1">v2.4.1-stable</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#006e2d] fill-icon text-lg">verified</span>
        </div>

        {/* Hackathon Info */}
        <div className="bg-white/70 backdrop-blur-md p-4 rounded-xl border border-[#c3c6d7]/30 shadow-sm flex flex-col justify-between">
          <span className="material-symbols-outlined text-[#2563eb] text-xl">workspace_premium</span>
          <div className="mt-3">
            <p className="text-[9px] text-[#737686] font-bold uppercase tracking-wider">Event</p>
            <p className="text-xs font-bold text-[#111c2d] mt-1">HealthTech Hack 2024</p>
          </div>
        </div>

        {/* Server Status */}
        <div className="bg-white/70 backdrop-blur-md p-4 rounded-xl border border-[#c3c6d7]/30 shadow-sm flex flex-col justify-between">
          <span className="material-symbols-outlined text-[#006e2d] text-xl">cloud_done</span>
          <div className="mt-3">
            <p className="text-[9px] text-[#737686] font-bold uppercase tracking-wider">Cloud API</p>
            <p className="text-xs font-bold text-[#111c2d] mt-1">Operational</p>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-[#111c2d] px-1">Development Team</h3>
        <div className="space-y-2.5">
          {/* Team Member 1 */}
          <div className="flex items-center p-2.5 bg-[#e7eeff] hover:bg-[#dee8ff] transition-all rounded-xl cursor-pointer group">
            <img
              className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-200"
              alt="Alex Rivera"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDruzTEc8uB0IvzP7p6VpkvLSUxn8UXNRWjNpSNNrZKRJm-ksZwWzUzMEsG2tX0CtAqA9HP8G-DaL4jMzfrb4shys6aA4DzlfZ-L2eBL2orf1g-C8FzdlugkkCYDiwD1kiNJxIeNVq8QKVt7HxVR535-zmaggbm331buv5-iyJxBWaGxsleq2y_70qsiVe_eGGLLrE-Dm9fZyN57evq_VnkQXZZxf_FlIFzL4TRaqykM5-9v-MPhtyIGg"
            />
            <div className="ml-3 flex-grow">
              <p className="text-xs font-bold text-[#111c2d]">Alex Rivera</p>
              <p className="text-[10px] text-[#737686] mt-0.5 font-medium">Full-Stack Lead</p>
            </div>
            <span className="material-symbols-outlined text-[#737686] group-hover:text-[#004ac6] text-sm transition-colors mr-1">alternate_email</span>
          </div>

          {/* Team Member 2 */}
          <div className="flex items-center p-2.5 bg-[#e7eeff] hover:bg-[#dee8ff] transition-all rounded-xl cursor-pointer group">
            <img
              className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-200"
              alt="Sarah Chen"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCtHr-dOPq9Rkqy4RL4HvXdrGYASJFy3fsooJn3ye_Kpi8ISX9qhtuyrqqqQjo3C1Y6TzxL-Hwx3SVbI1vXVQp8D0KfkPA1XEU8-i5gkP-dVa9_yEKRlkN_9d0yDLqSYomxI_tMeoxy4aXzvAaXez2kth6TUg63No0fp9jR7dA5p2HtIzbdHGIYZkui8drqSUwoH9WP_ShbKYMLTdn6bX4h2uMoJOF_8GFA1p8m46gxzOIe7NpR6RcAw"
            />
            <div className="ml-3 flex-grow">
              <p className="text-xs font-bold text-[#111c2d]">Sarah Chen</p>
              <p className="text-[10px] text-[#737686] mt-0.5 font-medium">IoT Hardware Architect</p>
            </div>
            <span className="material-symbols-outlined text-[#737686] group-hover:text-[#004ac6] text-sm transition-colors mr-1">alternate_email</span>
          </div>

          {/* Team Member 3 */}
          <div className="flex items-center p-2.5 bg-[#e7eeff] hover:bg-[#dee8ff] transition-all rounded-xl cursor-pointer group">
            <img
              className="w-11 h-11 rounded-full object-cover shrink-0 bg-gray-200"
              alt="Jordan Smith"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGja_dPoI5uZvOqRbIw8O2BBmnn3FVoe_knvbzVI7Hr8W9fPphGNgYsmmvTtzKH8mPaWbSzyrreEpywth0Qkzk_HYYxyjecoiLBk7m_IL9YzHmZNnkNI-xyyOA4vCXY7XX1pwqjLFhuwSFFxJcNw6NMoJyR3oQTucLZnMXXp1fyTG-h_rngAxldP9U_8dlDGVksi7dNtZxI8jZVF3kNVGnw1oRoV7ba644Q9uDmjzGpomI8zF3FnEmSg"
            />
            <div className="ml-3 flex-grow">
              <p className="text-xs font-bold text-[#111c2d]">Jordan Smith</p>
              <p className="text-[10px] text-[#737686] mt-0.5 font-medium">UI/UX Designer</p>
            </div>
            <span className="material-symbols-outlined text-[#737686] group-hover:text-[#004ac6] text-sm transition-colors mr-1">alternate_email</span>
          </div>
        </div>
      </section>

      {/* Hardware Showcase Image */}
      <section className="mt-2">
        <div className="relative w-full h-44 rounded-2xl overflow-hidden shadow-sm">
          <div
            className="w-full h-full bg-cover bg-center transition-transform hover:scale-105 duration-700"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAhqxsraLYcXf125TDbGfTWR0GvFG-h3et5EfJRFk0jxd4NfndAOlMn-iCFN2UfKEOhKKhz_JgDgDdzumuVaCAvr6Ejv4L9RgqkJL7cf4DwFpCTWzSLn3yQ1DcHfVGO3qm2FWJzuHzWnki5VgJnmyTBjTtPiZFVsUjqE3wPR83PyWqzjEQtcdP6fh09ZzvWx-8AjEcureRDHoF2SRnja3z6yTh4mxF9RVnCCdT_FLtAHHjDfuHgme7s5w')`
            }}
          />
          <div className="absolute bottom-0 left-0 w-full p-3.5 bg-gradient-to-t from-black/75 to-transparent">
            <p className="text-white text-xs font-semibold">SmartDispenser™ Mk-II Integration Hardware</p>
          </div>
        </div>
      </section>

      {/* Legal & Credits Footer */}
      <footer className="pt-4 pb-4 flex flex-col items-center gap-3 text-center border-t border-[#cbd5e1]/30">
        <div className="flex gap-3 text-[11px] font-semibold text-[#004ac6]">
          <a className="hover:underline" href="#" onClick={e => { e.preventDefault(); nativeAlert('Privacy Policy is aligned with HIPAA clinical directives.'); }}>Privacy Policy</a>
          <span className="text-[#c3c6d7]">•</span>
          <a className="hover:underline" href="#" onClick={e => { e.preventDefault(); nativeAlert('Terms of Service govern medical companion API nodes.'); }}>Terms of Service</a>
          <span className="text-[#c3c6d7]">•</span>
          <a className="hover:underline" href="#" onClick={e => { e.preventDefault(); nativeAlert('Open source repository links are licensed under Apache 2.0.'); }}>Open Source</a>
        </div>
        <p className="text-[10px] text-[#737686] max-w-xs leading-relaxed">
          © 2026 MedLink Technologies. Engineered for patient safety and healthcare resilience.
        </p>
      </footer>
    </div>
  );
}
