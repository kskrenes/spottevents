"use client";

import OrganizerView from '@/components/organizer-view';
import RegistrationCard from '@/components/registration-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { getCategoryIcon, getCategoryLabel } from '@/lib/data';
import { DEFAULT_EVENT_COLOR } from '@/lib/layout-utils';
import { getCityStateString } from '@/lib/location-utils';
import { format } from 'date-fns';
import { Calendar, Clock, ExternalLink, Loader2, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

const EventPage = () => {
  
  const params = useParams();
  const { data: event, isLoading } = useConvexQuery(api.events.getEventBySlug, {
    slug: params.slug,
  });

  const { data: user } = useConvexQuery(api.users.getCurrentUser);

  const safeVenueUrl = (() => {
    try {
      const parsed = new URL(event.venue);
      return parsed.protocol === "http:" || parsed.protocol === "https:"
        ? parsed.href
        : null;
    } catch {
      return null;
    }
  })();

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  if (!event) {
    return (
      <div className='min-h-screen flex items-center justify-center text-muted-foreground'>
        Event not found
      </div>
    );
  }

  return (
    <div 
      style={{ backgroundColor: event.themeColor || DEFAULT_EVENT_COLOR }}
      className='min-h-screen py-8 -mt-6 md:-mt-16 lg:-mx-5'
    >
      {/* UI */}
      <div className='max-w-7xl mx-auto px-8'>
        <div className='mb-8'>
          {/* Category */}
          <Badge variant='secondary' className='mb-3'>
            {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
          </Badge>

          {/* Title */}
          <h1 className='text-4xl md:text-5xl font-bold mb-4'>{event.title}</h1>

          <div className='flex flex-wrap items-center gap-4 text-muted-foreground'>
            {/* Date */}
            <div className='flex items-center gap-2'>
              <Calendar className='w-5 h-5' />
              <span>{format(event.startDate, "EEEE, MMMM dd, yyyy")}</span>
            </div>

            {/* Time */}
            <div className='flex items-center gap-2'>
              <Clock className='w-5 h-5' />
              <span>
                {format(event.startDate, "h:mm a")} - {format(event.endDate, "h:mm a")}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        {event.coverImage && (
          <div className='relative h-[250px] md:h-[400px] rounded-2xl overflow-hidden mb-6'>
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              className='object-cover'
              priority
            />
          </div>
        )}

        <div className='grid lg:grid-cols-[1fr_380px] gap-8'>
          <div className='space-y-8'>
            {/* Description */}
            <div className='rounded-2xl bg-background/20 p-6'>
              <h2 className='text-xl font-bold mb-4'>About This Event</h2>
              <p className='text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed'>{event.description}</p>
            </div>

            {/* Location */}
            <div className='rounded-2xl bg-background/20 p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <MapPin className='w-6 h-6 text-purple-500' />
                <h2 className='text-xl font-bold'>Location</h2>
              </div>
              <div className='flex items-center gap-2 mb-4'>
                <span className='line-clamp-1 text-sm font-medium'>
                  {event.locationType === 'online' 
                    ? 'Online Event' 
                    : getCityStateString(event.city) + getCityStateString(event.state) + (event.country || '')}
                </span>
              </div>
              {event.address && (
                <p className='text-xs text-muted-foreground'>{event.address}</p>
              )}
              {safeVenueUrl && (
                <Button variant='outline' className='mt-3 text-xs' asChild>
                  <a 
                    href={safeVenueUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >  
                    View on Map
                    <ExternalLink className='w-4 h-4' />
                  </a>
                </Button>
              )}
            </div>

            {/* Organizer Info */}
            <div className='relative rounded-2xl bg-background/20 p-6'>
              <h2 className='text-xl font-bold mb-3'>Organizer</h2>
              <OrganizerView event={event} />
            </div>
          </div>

          {/* Sidebar - Registration Card */}
          <div className='lg:sticky lg:top-24 h-fit'>
            <div className='relative rounded-2xl bg-background/20 p-6'>
              <RegistrationCard event={event} user={user} />
            </div>
          </div>
        </div>
      </div>

      {/* Register Modal */}
    </div>
  )
}

export default EventPage