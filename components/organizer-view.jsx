import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import React from 'react'

const OrganizerView = ({event}) => {
  
  const { data: organizer, isLoading } = useConvexQuery(
    api.users.getUserById,
    { userId: event.organizerId }
  );

  if (isLoading || !organizer) {
    return (
      <div className='flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      <Image src={organizer.imageUrl} alt={organizer.name} width={50} height={50} />
      <div className='-space-y-1'>
        <span className='line-clamp-1 text-sm'>{organizer.name}</span>
        <span className='text-xs text-muted-foreground'>Event Organizer</span>
      </div>
    </div>
  )
}

export default OrganizerView