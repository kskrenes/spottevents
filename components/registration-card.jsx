"use client";

import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { Country } from 'country-state-city';
import getSymbolFromCurrency from 'currency-symbol-map';
import { getCurrency } from 'locale-currency';
import { Calendar, CheckCircle, Clock, Loader2, Settings, Share2, Ticket, Users } from 'lucide-react';
import React, { useMemo, useState } from 'react'
import { Separator } from './ui/separator';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import RegisterModal from '@/app/(public)/events/[slug]/_components/register-modal';

const RegistrationCard = ({ event, user }) => {
  const router = useRouter();
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const { data: registration, isLoading } = useConvexQuery(
    api.registrations.checkRegistration,
    { eventId: event._id }
  );

  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const currencyCode = useMemo(() => {
    if (!event.country) return "";
    const countryObj = allCountries.find(c => c.name === event.country);
    if (!countryObj) return "";
    return getCurrency(countryObj.isoCode) ?? "";
  }, [event.country, allCountries]);

  const currencySymbol = useMemo(
    () => getSymbolFromCurrency(currencyCode) ?? "",
    [currencyCode]
  );

  const isEventFull = event.registrationCount >= event.capacity;
  const isEventPast = event.endDate < Date.now();
  const isOrganizer = user?._id === event.organizerId;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description.slice(0, 100) + "...",
          url: url,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleRegister = () => {
    if (!user) {
      toast.error("Please sign in to register");
      return;
    }
    setShowRegisterModal(true);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Price */}
      <div>
        <p className='text-sm text-muted-foreground'>Price</p>
        <p className='text-3xl font-bold my-1'>
          {event.ticketType === "paid" ? currencySymbol + event.ticketPrice : "Free"}
        </p>
        {event.ticketType === "paid" && event.locationType === "physical" && (
          <p className='text-xs text-muted-foreground'>Pay at event office</p>
        )}
      </div>
      <Separator />

      {/* Stats */}
      <div className='space-y-3'>
        {/* Attendees */}
        <div className="flex items-center justify-between">
          <div className='flex items-center gap-2 text-muted-foreground'>
            <Users className='w-4 h-4' />
            <span className='text-sm'>Attendees</span>
          </div>
          <p className='font-medium'>
            {event.registrationCount} / {event.capacity}
          </p>
        </div>

        {/* Date */}
        <div className="flex items-center justify-between">
          <div className='flex items-center gap-2 text-muted-foreground'>
            <Calendar className='w-4 h-4' />
            <span className='text-sm'>Date</span>
          </div>
          <p className='font-medium'>
            {format(event.startDate, "MMM dd")}
          </p>
        </div>

        {/* Time */}
        <div className="flex items-center justify-between">
          <div className='flex items-center gap-2 text-muted-foreground'>
            <Clock className='w-4 h-4' />
            <span className='text-sm'>Time</span>
          </div>
          <p className='font-medium'>
            {format(event.startDate, "h:mm a")}
          </p>
        </div>
      </div>
      <Separator />

      {/* Registration Button */}
      {registration && registration.status === "confirmed" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              You&apos;re registered!
            </span>
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => router.push("/my-tickets")}
          >
            <Ticket className="w-4 h-4" />
            View Ticket
          </Button>
        </div>
      ) : isEventPast ? (
        <Button className="w-full" disabled>
          Event Ended
        </Button>
      ) : isEventFull ? (
        <Button className="w-full" disabled>
          Event Full
        </Button>
      ) : isOrganizer ? (
        <>
          <Button className="w-full gap-2" onClick={handleRegister}>
            <Ticket className="w-4 h-4" />
            Register for Event
          </Button>
          <Button
            className="w-full"
            onClick={() => router.push(`/events/${event.slug}/manage`)}
          >
            <Settings className="w-4 h-4" />
            Manage Event
          </Button>
        </>
      ) : (
        <Button className="w-full gap-2" onClick={handleRegister}>
          <Ticket className="w-4 h-4" />
          Register for Event
        </Button>
      )}

      {/* Share Button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleShare}
      >
        <Share2 className="w-4 h-4" />
        Share Event
      </Button>

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterModal
          event={event}
          currencySymbol={currencySymbol}
          isOpen={showRegisterModal}
          onClose={() => setShowRegisterModal(false)}
        />
      )}
    </div>
  )
}

export default RegistrationCard