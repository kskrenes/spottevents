"use client";

import EventCard from '@/components/event-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/convex/_generated/api';
import { useConvexMutation, useConvexQuery } from '@/hooks/use-convex-query';
import { Loader2, Ticket } from 'lucide-react';
import Link from 'next/link';
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
        <div className='mb-12'>
          <h2 className='text-2xl font-semibold mb-4'>Upcoming Events</h2>
          {!upcomingTickets || upcomingTickets.length === 0 ? (
            <Card className='p-12 text-center'>
              <div className='ma-w-md mx-auto space-y-4'>
                <div className='text-6xl mb-4'>🎟️</div>
                <h2 className='text-2xl font-semibold'>No Tickets Found</h2>
                <p className='text-muted-foreground'>Register for events to see your tickets here</p>
                <Button asChild className='gap-2'>
                  <Link href='/explore'>
                    <Ticket className='w-4 h-4' />
                    Browse Events
                  </Link>
                </Button>
              </div>
            </Card>
          ) : (
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
          )}
        </div>

        {/* Past Tickets */}
        {pastTickets && pastTickets.length > 0 && (
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