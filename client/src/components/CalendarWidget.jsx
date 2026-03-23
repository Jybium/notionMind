import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import './CalendarWidget.css';

const CalendarWidget = ({ events }) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="calendar-widget">
      <div className="calendar-widget-header">
        <Calendar size={16} />
        <span>Upcoming Events</span>
      </div>
      <div className="calendar-widget-list">
        {events.map((ev, i) => {
          const dateObj = new Date(ev.date || ev.start);
          const month = dateObj.toLocaleString('default', { month: 'short' });
          const day = dateObj.getDate();
          const time = ev.time || (ev.start ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

          return (
            <div key={i} className="calendar-event-card">
              <div className="event-date">
                <div className="event-month">{month}</div>
                <div className="event-day">{day}</div>
              </div>
              <div className="event-details">
                <div className="event-title">{ev.title || ev.summary}</div>
                {(time || ev.location) && (
                  <div className="event-meta">
                    {time && (
                      <div className="event-time">
                        <Clock size={12} />
                        <span>{time !== 'Invalid Date' ? time : 'All Day'}</span>
                      </div>
                    )}
                    {ev.location && (
                      <div className="event-location" title={ev.location}>
                        <MapPin size={12} />
                        <span>{ev.location}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarWidget;
