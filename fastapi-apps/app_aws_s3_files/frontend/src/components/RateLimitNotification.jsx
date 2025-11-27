import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { cn } from '../utils/cn.js';

let notificationQueue = [];
let notificationListener = null;

// Global function to show rate limit notifications
export const showRateLimitNotification = (message, retryAfter = 60) => {
  const notification = {
    id: Date.now(),
    message,
    retryAfter,
    timestamp: Date.now()
  };
  
  notificationQueue.push(notification);
  
  if (notificationListener) {
    notificationListener(notificationQueue);
  }
};

export const RateLimitNotification = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Set up global function for other components to use
    window.showRateLimitNotification = showRateLimitNotification;
    
    notificationListener = setNotifications;
    setNotifications([...notificationQueue]);
    
    return () => {
      notificationListener = null;
      delete window.showRateLimitNotification;
    };
  }, []);

  const dismissNotification = (id) => {
    notificationQueue = notificationQueue.filter(n => n.id !== id);
    setNotifications([...notificationQueue]);
  };

  const dismissAll = () => {
    notificationQueue = [];
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.slice(0, 3).map((notification) => {
        const secondsLeft = Math.max(0, Math.ceil((notification.retryAfter * 1000 - (Date.now() - notification.timestamp)) / 1000));
        
        return (
          <div
            key={notification.id}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Rate Limited
                  </h4>
                  <button
                    onClick={() => dismissNotification(notification.id)}
                    className="text-yellow-400 hover:text-yellow-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-xs text-yellow-700 mt-1">
                  Too many image requests. Gallery images will load slowly to prevent server overload.
                </p>
                
                {secondsLeft > 0 && (
                  <div className="flex items-center space-x-1 mt-2 text-xs text-yellow-600">
                    <Clock className="w-3 h-3" />
                    <span>Rate limit resets in {secondsLeft}s</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      {notifications.length > 3 && (
        <div className="bg-gray-100 rounded-lg p-2 text-center">
          <button
            onClick={dismissAll}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            +{notifications.length - 3} more • Dismiss All
          </button>
        </div>
      )}
    </div>
  );
};