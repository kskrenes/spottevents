"use client";

import EventCard from '@/components/event-card';
import { api } from '@/convex/_generated/api';
import { useConvexMutation, useConvexQuery } from '@/hooks/use-convex-query';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { toast } from 'sonner';

const MyTickets = () => {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const router = useRouter();

  const { data: registrations, isLoading } = useConvexQuery(
    api.registrations.getMyRegistrations
  );

  const { mutate: cancelRegistration, isLoading: isCancelling } = useConvexMutation(
    api.registrations.cancelRegistration
  );

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  const now = Date.now();

  const upcomingTickets = registrations?.filter(
    (reg) => reg.event && reg.event.startDate >= now && reg.status === "confirmed"
  );

  const pastTickets = registrations?.filter(
    (reg) => reg.event && (reg.event.startDate < now || reg.status === "cancelled")
  );

  const handleCancelRegistration = async (registrationId) => {
    if (!window.confirm("Are you sure you want to cancel this registration?"))
      return;

    try {
      await cancelRegistration({ registrationId });
      toast.success("Registration cancelled successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to cancel registration.");
    }
  }

  return (
    <div className='min-h-screen pb-20 px-4'>
      <div className='max-w-7xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-4xl font-bold mb-2'>My Tickets</h1>
          <p className='text-muted-foreground'>View and manage your event registrations</p>
        </div>

        {/* Upcoming Tickets */}
        {upcomingTickets.length > 0 && (
          <div className='mb-12'>
            <h2 className='text-2xl font-semibold mb-4'>Upcoming Events</h2>
            <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {upcomingTickets.map((registration) => (
                <EventCard 
                  key={registration._id} 
                  event={registration.event} 
                  action="ticket" 
                  onClick={() => setSelectedTicket(registration)}
                  onDelete={() => handleCancelRegistration(registration._id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Tickets */}
        {pastTickets.length > 0 && (
          <div className='mb-12'>
            <h2 className='text-2xl font-semibold mb-4'>Past Events</h2>
            <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {pastTickets.map((registration) => (
                <EventCard 
                  key={registration._id} 
                  event={registration.event} 
                  className='opacity-60'
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
      </div>

      {/* QR Code Modal */}
    </div>
  )
}

export default MyTickets