import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { Loader2 } from 'lucide-react';
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const OrganizerView = ({ event }) => {
  
  const { data: organizer, isLoading } = useConvexQuery(
    api.users.getUserById,
    { userId: event.organizerId }
  );

  if (isLoading) {
    return (
      <div className='flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className='text-sm text-muted-foreground'>
        Organizer information unavailable
      </div>
    )
  }

  return (
    <div className='flex items-center gap-3'>
      <Avatar className='w-12 h-12'>
        <AvatarImage 
          src={organizer.imageUrl} 
          alt={organizer.name ? `${organizer.name} profile picture` : 'Organizer profile picture'}
        />
        <AvatarFallback>
          {(organizer.name?.charAt(0) || "?").toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className='-space-y-1'>
        <span className='line-clamp-1 text-sm font-medium'>{organizer.name}</span>
        <span className='text-xs text-muted-foreground'>Event Organizer</span>
      </div>
    </div>
  )
}

export default OrganizerView