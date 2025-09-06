import React from 'react';
import { Wifi, WifiOff, Loader } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected';
  error?: string | null;
  className?: string;
  showDetails?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  status, 
  error, 
  className = '', 
  showDetails = false 
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-400/50',
          text: 'Connected',
          description: 'Real-time connection active'
        };
      case 'connecting':
        return {
          icon: Loader,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-400/50',
          text: 'Connecting',
          description: 'Establishing connection...'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-400/50',
          text: 'Disconnected',
          description: error || 'No connection to server'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  if (!showDetails && status === 'connected') {
    // Minimal indicator when connected
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full bg-green-400 animate-pulse`}></div>
        <span className="text-green-400 text-sm">Live</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor} ${className}`}>
      <Icon 
        className={`w-5 h-5 ${statusInfo.color} ${status === 'connecting' ? 'animate-spin' : ''}`} 
      />
      <div className="flex-1 min-w-0">
        <div className={`font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </div>
        {showDetails && (
          <div className="text-sm text-purple-200 truncate">
            {statusInfo.description}
          </div>
        )}
      </div>
      
      {status === 'connected' && (
        <div className="flex space-x-1">
          <div className="w-1 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <div className="w-1 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-1 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;