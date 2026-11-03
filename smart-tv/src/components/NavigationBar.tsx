import React from 'react';
import { Tv, Film, Clapperboard, Settings, Power } from 'lucide-react';

export type MainSection = 'live' | 'vod' | 'series' | 'settings';

interface NavigationBarProps {
  currentSection: MainSection;
  onSelectSection: (section: MainSection) => void;
  isFocused?: boolean;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentSection,
  onSelectSection,
  isFocused = false
}) => {
  const menuItems: { id: MainSection; label: string; icon: any }[] = [
    { id: 'live', label: 'Canais Ao Vivo', icon: Tv },
    { id: 'vod', label: 'Filmes', icon: Film },
    { id: 'series', label: 'Séries', icon: Clapperboard },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside className={`w-64 h-full bg-[#121722] border-r border-[#2a3449] flex flex-col justify-between p-5 select-none transition-all ${isFocused ? 'ring-2 ring-emerald-500/50' : ''}`}>
      <div>
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
            <Tv className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="font-extrabold text-white text-lg tracking-wide">
              ZYVERON <span className="text-emerald-400">PLAY</span>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Smart TV
            </div>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium text-sm transition text-left ${
                  isSelected
                    ? 'bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20'
                    : 'text-slate-300 hover:bg-[#1b2234] hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? 'text-black' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 px-2 text-xs text-slate-500">
        <div>Controle Remoto:</div>
        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
          [▲▼◀▶] Navegar | [OK] Abrir
        </div>
      </div>
    </aside>
  );
};

