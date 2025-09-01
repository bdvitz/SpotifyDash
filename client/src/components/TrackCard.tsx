import React from 'react';
import { SpotifyTrack } from '../auth/spotifyAuth';
import { Play, ExternalLink } from 'lucide-react';

interface TrackCardProps {
  track: SpotifyTrack;
  rank: number;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, rank }) => {
  const handleSpotifyClick = () => {
    window.open(track.external_urls.spotify, '_blank', 'noopener,noreferrer');
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getImageUrl = () => {
    return track.album.images?.[0]?.url || 
           `https://via.placeholder.com/48x48/7c3aed/ffffff?text=${track.name.charAt(0)}`;
  };

  return (
    <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200 group cursor-pointer">
      {/* Rank */}
      <span className="text-purple-300 font-bold w-8 text-center group-hover:text-white transition-colors duration-200">
        {rank}
      </span>

      {/* Album Art */}
      <div className="relative">
        <img 
          src={getImageUrl()} 
          alt={track.album.name} 
          className="w-12 h-12 rounded-lg shadow-md group-hover:shadow-lg transition-shadow duration-200" 
        />
        {track.preview_url && (
          <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate group-hover:text-green-300 transition-colors duration-200">
          {track.name}
        </p>
        <p className="text-purple-200 text-sm truncate">
          {track.artists.map(artist => artist.name).join(', ')}
        </p>
        <p className="text-purple-300 text-xs">
          {track.album.name} • {formatDuration(track.duration_ms)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Popularity indicator */}
        <div className="hidden sm:flex items-center space-x-1">
          <div className="flex space-x-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`w-1 h-4 rounded-full ${
                  i < Math.ceil(track.popularity / 20) 
                    ? 'bg-green-400' 
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Spotify Link */}
        <button
          onClick={handleSpotifyClick}
          className="p-2 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors duration-200"
          title="Open in Spotify"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default TrackCard;