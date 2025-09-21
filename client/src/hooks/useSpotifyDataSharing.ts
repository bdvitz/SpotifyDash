import { useState, useEffect } from 'react';
import { fetchTopTracks, fetchTopArtists, SpotifyTrack, SpotifyArtist } from '../auth/spotifyAuth';
import { apiPost } from '../utils/api';

interface MusicData {
  topTracks: SpotifyTrack[];
  topArtists: SpotifyArtist[];
  preferences: {
    genres: string[];
    acousticness: number;
    danceability: number;
    energy: number;
    valence: number;
  };
  lastUpdated: number;
}

interface UseSpotifyDataSharingReturn {
  isSharing: boolean;
  musicData: MusicData | null;
  shareDataToRoom: (roomCode: string, spotifyId: string) => Promise<boolean>;
  error: string | null;
}

export function useSpotifyDataSharing(): UseSpotifyDataSharingReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [musicData, setMusicData] = useState<MusicData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate user's music data profile
  const generateMusicData = async (): Promise<MusicData> => {
    try {
      console.log('Generating music data profile...');
      
      // Fetch user's top music data
      const [tracks, artists] = await Promise.all([
        fetchTopTracks(50, 'medium_term'),
        fetchTopArtists(20, 'medium_term')
      ]);

      // Extract genres from artists
      const allGenres = artists.flatMap(artist => artist.genres);
      const genreCounts = allGenres.reduce((acc, genre) => {
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topGenres = Object.entries(genreCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([genre]) => genre);

      // Calculate audio feature preferences (simplified)
      // In a real implementation, you'd fetch audio features for tracks
      const preferences = {
        genres: topGenres,
        acousticness: Math.random() * 0.5 + 0.25, // Placeholder
        danceability: Math.random() * 0.5 + 0.4,  // Placeholder  
        energy: Math.random() * 0.6 + 0.3,        // Placeholder
        valence: Math.random() * 0.7 + 0.2        // Placeholder
      };

      const musicData: MusicData = {
        topTracks: tracks,
        topArtists: artists,
        preferences,
        lastUpdated: Date.now()
      };

      console.log(`Generated music profile: ${tracks.length} tracks, ${artists.length} artists, ${topGenres.length} genres`);
      return musicData;

    } catch (error) {
      console.error('Failed to generate music data:', error);
      throw new Error('Failed to analyze your music preferences');
    }
  };

  // Share music data to a specific room
  const shareDataToRoom = async (roomCode: string, spotifyId: string): Promise<boolean> => {
    setIsSharing(true);
    setError(null);

    try {
      // Generate fresh music data if needed
      let dataToShare = musicData;
      
      if (!dataToShare || Date.now() - dataToShare.lastUpdated > 24 * 60 * 60 * 1000) {
        console.log('Generating fresh music data...');
        dataToShare = await generateMusicData();
        setMusicData(dataToShare);
      }

      // Share data with room via API
      const response = await apiPost(`/api/rooms/${roomCode}/share-data`, {
        spotifyId,
        musicData: dataToShare
      });

      if (response.success) {
        console.log(`Music data shared to room ${roomCode}`);
        return true;
      } else {
        throw new Error(response.error || 'Failed to share music data');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share music data';
      setError(errorMessage);
      console.error('Error sharing music data:', error);
      return false;
    } finally {
      setIsSharing(false);
    }
  };

  // Load cached music data on mount
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cached = localStorage.getItem('inclew_music_data');
        if (cached) {
          const parsed: MusicData = JSON.parse(cached);
          // Check if data is less than 24 hours old
          if (Date.now() - parsed.lastUpdated < 24 * 60 * 60 * 1000) {
            setMusicData(parsed);
            console.log('Loaded cached music data');
            return;
          }
        }
        
        // Generate fresh data if no valid cache
        console.log('No valid cached data, generating fresh music profile...');
        const freshData = await generateMusicData();
        setMusicData(freshData);
        localStorage.setItem('inclew_music_data', JSON.stringify(freshData));
        
      } catch (error) {
        console.error('Failed to load music data:', error);
        setError('Failed to load your music preferences');
      }
    };

    loadCachedData();
  }, []);

  return {
    isSharing,
    musicData,
    shareDataToRoom,
    error
  };
}