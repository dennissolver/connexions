// app/components/VoiceAvatar.tsx
'use client';

import Image from 'next/image';

interface VoiceAvatarProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function VoiceAvatar({ 
  isActive = false, 
  isSpeaking = false,
  size = 'lg',
  label
}: VoiceAvatarProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="relative">
        {/* Pulse ring when active */}
        {isActive && (
          <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse opacity-50`} 
               style={{ transform: 'scale(1.15)' }} />
        )}
        
        {/* Speaking animation rings */}
        {isSpeaking && (
          <>
            <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 border-green-400 animate-ping opacity-30`} />
            <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full border-2 border-green-400 animate-pulse opacity-50`} />
          </>
        )}
        
        {/* Avatar image */}
        <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-4 ${
          isSpeaking ? 'border-green-500 shadow-green-500/40' : 
          isActive ? 'border-purple-500 shadow-purple-500/40' : 
          'border-slate-700'
        } shadow-xl transition-all duration-300`}>
          <Image
            src="/avatar.jpeg"
            alt="AI Interviewer"
            fill
            className="object-cover" sizes="128px"
            priority
          />
        </div>

        {/* Status indicator dot */}
        {isActive && (
          <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-slate-950 flex items-center justify-center ${
            isSpeaking ? 'bg-green-500' : 'bg-purple-500'
          }`}>
            <div className={`w-2 h-2 bg-white rounded-full ${isSpeaking ? 'animate-pulse' : ''}`} />
          </div>
        )}
      </div>

      {/* Label text */}
      {label && (
        <p className={`mt-3 text-sm font-medium ${
          isSpeaking ? 'text-green-400' : 
          isActive ? 'text-purple-400' : 
          'text-slate-400'
        }`}>
          {label}
        </p>
      )}
    </div>
  );
}
