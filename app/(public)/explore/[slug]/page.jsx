"use client";

import EventCard from '@/components/event-card';
import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { CATEGORIES } from '@/lib/data';
import { COUNTRY_NAME, INVALID_LOCATION, parseLocationSlug } from '@/lib/location-utils';
import { Loader2 } from 'lucide-react';
import { notFound, useParams, useRouter } from 'next/navigation';
import React from 'react'

const DynamicExplorePage = () => {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug;

  console.log('slug:', slug);

  // check for valid category
  const categoryInfo = CATEGORIES.find(c => c.id === slug);
  const isCategory = !!categoryInfo;

  // validate location if isCategory is false
  const { city, state, isValid } = !isCategory 
    ? parseLocationSlug(slug) 
    : INVALID_LOCATION;

  // show 404 if invalid
  if (!isCategory && !isValid) {
    notFound();
  }

  const {data: events, isLoading} = useConvexQuery(
    isCategory
      ? api.events.getEventsByCategory
      : api.events.getEventsByLocation,
    isCategory
      ? { category: slug, limit: 50 }
      : city && state
        ? { city, state, limit: 50 }
        : 'skip'
  );

  const handleEventClick = (eventSlug) => {
    router.push(`/events/${eventSlug}`);
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  if (isCategory) {
    return (
      <>
        <div className='pb-5'>
          <div className='flex items-center gap-4 mb-4'>
            <div className='text-6xl'>{categoryInfo.icon}</div>
            <div>
              <h1 className='text-5xl md:text-6xl font-bold'>{categoryInfo.label}</h1>
              <p className='text-lg text-muted-foreground mt-2'>{categoryInfo.description}</p>
            </div>
          </div>

          {events && events.length > 0 && (
            <p className='text-muted-foreground'>
              {events.length} event{events.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
        
        {events && events.length > 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {events.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => handleEventClick(event.slug)} />
            ))}
          </div>
        ) : (
          <p className='text-muted-foreground'>No events found in this category.</p>
        )}
      </>
    )
  }

  return (
    <>
      <div className='pb-5'>
        <div className='flex items-center gap-4 mb-4'>
          <div className='text-6xl'>📍</div>
          <div>
            <h1 className='text-5xl md:text-6xl font-bold'>Events in {city}</h1>
            <p className='text-lg text-muted-foreground mt-2'>{state}, {COUNTRY_NAME}</p>
          </div>
        </div>

        {events && events.length > 0 && (
          <p className='text-muted-foreground'>
            {events.length} event{events.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>
      
      {events && events.length > 0 ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {events.map((event) => (
            <EventCard key={event.id} event={event} onClick={() => handleEventClick(event.slug)} />
          ))}
        </div>
      ) : (
        <p className='text-muted-foreground'>No events found in this category.</p>
      )}
    </>
  )
}

export default DynamicExplorePage