import { useState, useEffect, useCallback } from 'react';
import type { Event } from '../types';
import {
  loadEvents,
  addEvent,
  updateEvent as updateEventInStorage,
  removeEvent,
} from '../utils/eventsStorage';

export function useEvents(userId: string) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const list = await loadEvents(userId);
      setEvents(list);
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createEvent = async (payload: Partial<Event>): Promise<Event> => {
    try {
      const event = await addEvent(userId, { ...payload, userId } as Event);
      setEvents(prev => [event, ...prev]);
      return event;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to save event.');
    }
  };

  const updateEvent = async (id: string, changes: Partial<Event>): Promise<Event | null> => {
    try {
      const updated = await updateEventInStorage(userId, id, changes);
      if (updated) setEvents(prev => prev.map(e => (e.id === id ? updated : e)));
      return updated;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to update event.');
    }
  };

  const deleteEvent = async (id: string): Promise<void> => {
    try {
      await removeEvent(userId, id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to delete event.');
    }
  };

  return { events, isLoading, refetch: load, createEvent, updateEvent, deleteEvent };
}
