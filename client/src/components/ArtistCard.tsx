import React from 'react';
import { SpotifyArtist } from '../auth/spotifyAuth';
import { ExternalLink, Users } from 'lucide-react';

interface ArtistCardProps {
  artist: SpotifyArtist;
  rank: number;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, rank }) => {
  const handleSpotifyClick = () => {
    window.open(artist.external_urls.spotify, '_blank', 'noopener,noreferrer');
  };

  const formatFollowers = (followers: number): string => {
    if (followers >= 1000000) {
      return `${(followers / 1000000).toFixed(1)}M`;
    } else if (followers >= 1000) {
      return `${(followers / 1000).toFixed(0)}K`;
    }
    return followers.toString();
  };

  const getImageUrl = () => {
    return artist.images?.[0]?.url || 
           `https://via.placeholder.com/48x48/7c3aed/ffffff?text=${artist.name.charAt(0)}`;
  };

  const getGenreColors = (index: number) => {
    const colors = [
      'bg-blue-500/20 text-blue-300',
      'bg-purple-500/20 text-purple-300',
      'bg-green-500/20 text-green-300',
      'bg-pink-500/20 text-pink-300',
      'bg-yellow-500/20 text-yellow-300'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200 group cursor-pointer">
      {/* Rank */}
      <span className="text-purple-300 font-bold w-8 text-center group-hover:text-white transition-colors duration-200">
        {rank}
      </span>

      {/* Artist Image */}
      <div className="relative">
        <img 
          src={getImageUrl()} 
          alt={artist.name} 
          className="w-12 h-12 rounded-full shadow-md group-hover:shadow-lg transition-shadow duration-200" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      {/* Artist Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate group-hover:text-blue-300 transition-colors duration-200">
          {artist.name}
        </p>
        
        {/* Genres */}
        <div className="flex flex-wrap gap-1 mt-1 mb-1">
          {artist.genres.slice(0, 2).map((genre, index) => (
            <span 
              key={genre}
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getGenreColors(index)}`}
            >
              {genre}
            </span>
          ))}
          {artist.genres.length > 2 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300">
              +{artist.genres.length - 2}
            </span>
          )}
        </div>

        {/* Followers */}
        <div className="flex items-center space-x-1 text-purple-200 text-xs">
          <Users className="w-3 h-3" />
          <span>{formatFollowers(artist.followers.total)} followers</span>
        </div>
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
                  i < Math.ceil(artist.popularity / 20) 
                    ? 'bg-blue-400' 
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

export default ArtistCard;