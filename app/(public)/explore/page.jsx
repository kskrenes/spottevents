"use client";

import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, Loader2, MapPin, Users } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { format } from 'date-fns';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useRef } from 'react'
import { Button } from '@/components/ui/button';
import { createLocationSlug } from '@/lib/location-utils';
import EventCard from '@/components/event-card';
import { CATEGORIES } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';

const ExplorePage = () => {

  const plugin = useRef(Autoplay({delay: 5000, stopOnInteraction: true}));
  const router = useRouter();

  const {data: currentUser} = useConvexQuery(
    api.users.getCurrentUser
  );

  const { data: featuredEvents, isLoading: loadingFeatured } = useConvexQuery(
    api.events.getFeaturedEvents,
    { limit: 3 }
  );

  const { data: localEvents, isLoading: loadingLocal } = useConvexQuery(
    api.events.getEventsByLocation,
    { 
      city: currentUser?.location?.city || "Gurgaon",
      state: currentUser?.location?.state || "Haryana",
      limit: 4,
    }
  );

  const { data: popularEvents, isLoading: loadingPopular } = useConvexQuery(
    api.events.getPopularEvents,
    { limit: 6 }
  );

  const { data: categoryCounts } = useConvexQuery(
    api.events.getCategoryCounts
  );

  const categoriesWithCounts = CATEGORIES.map((category) => {
    return { ...category, count: categoryCounts?.[category.id] || 0 };
  });

  const isLoading = loadingFeatured || loadingLocal || loadingPopular;

  const handleEventClick = (slug) => {
    router.push(`/events/${slug}`);
  };

  const handleCategoryClick = (categoryId) => {
    router.push(`/events/${categoryId}`);
  };

  const handleViewLocalEvents = () => {
    const city = currentUser?.location?.city || "Gurgaon";
    const state = currentUser?.location?.state || "Haryana";
    const slug = createLocationSlug(city, state);
    router.push(`/explore/${slug}`);
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  return (
    <>
      <div className='pb-12 text-center'>
        <h1 className='text-5xl md:text-6xl font-bold mb-4'>Discover Events</h1>
        <p className='text-lg text-muted-foreground max-w-3xl mx-auto'>Explore featured events, find what&apos;s happening locally, or browse events across India</p>
      </div>

      {/* Featured Carousel */}
      {featuredEvents && featuredEvents.length > 0 && (
        <div className='mb-16'>
          <Carousel className="w-full" plugins={[plugin.current]} onMouseEnter={plugin.current.stop} onMouseLeave={plugin.current.reset}>
            <CarouselContent>
              {featuredEvents.map((event) => (
                <CarouselItem key={event._id}>
                  <div onClick={() => handleEventClick(event.slug)} className='relative h-[400px] rounded-xl overflow-hidden cursor-pointer'>
                    {event.coverImage ? (
                      <Image src={event.coverImage} alt={event.title} fill className='object-cover' />
                    ) : (
                      <div className='absolute inset-0' style={{backgroundColor: event.themeColor}} />
                    )}
                    <div className='absolute inset-0 bg-gradient-to-r from-black/60 to-black/30' />
                    <div className='relative h-full flex flex-col justify-end p-8 md:p-12'>
                      <Badge className="w-fit mb-4" variant='secondary'>
                        {event.city}, {event.state || event.country}
                      </Badge>

                      <h2 className='text-3xl md:text-5xl font-bold text-white mb-3'>{event.title}</h2>
                      <p className='text-lg text-white/90 mb-4 max-w-2xl line-clamp-2'>{event.description}</p>

                      <div className='flex items-center gap-4 text-white/80'>
                        <div className='flex items-center gap-2'>
                          <Calendar className="w-4 h-4" />
                          <span className='text-sm'>{format(event.startDate, "PPP")}</span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <MapPin className="w-4 h-4" />
                          <span className='text-sm'>{event.city}</span>
                        </div>

                        <div className='flex items-center gap-2'>
                          <Users className="w-4 h-4" />
                          <span className='text-sm'>{event.registrationCount} registered</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      {/* Local Events */}
      {localEvents && localEvents.length > 0 && (
        <div className='mb-16'>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='text-3xl font-bold mb-1'>Events Near You</h2>
              <p className='text-muted-foreground'>
                Happening in {currentUser?.location?.city || "your area"}
              </p>
            </div>
            <Button variant='outline' className='gap-2' onClick={handleViewLocalEvents}>
              View All <ArrowRight className='w-4 h-4' />
            </Button>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {localEvents.map((event) => (
              <EventCard key={event._id} event={event} variant='grid' onClick={() => handleEventClick(event.slug)} />
            ))}
          </div>
        </div>
      )}

      {/* Browse by Category */}
      <div className='mb-16'>
        <h2 className='text-3xl font-bold mb-6'>Browse by Category</h2>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {categoriesWithCounts.map((category) => (
            <Card 
              key={category.id} 
              className='py-2 group cursor-pointer hover:shadow-lg transition-all hover:border-purple-500/50'
              onClick={() => handleCategoryClick(category.id)}
            >
              <CardContent className='px-3 sm:p-6 flex items-center gap-3'>
                <div className='text-3xl sm:text-4xl'>{category.icon}</div>
                <div className='flex-1 min-w-0'>
                  <h3 className='font-semibold mb-1 group-hover:text-purple-400 transition-colors'>
                    {category.label}
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    {category.count} Event{category.count !== 1 && "s"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Popular Events Across Country */}
      {/* Empty State */}
    </>
  )
}

export default ExplorePage