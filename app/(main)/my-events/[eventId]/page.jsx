"use client";

import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { notFound, useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react'

const EventDashboard = () => {
  const params = useParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);

  const eventId = params.eventId;

  const { data: dashboardData, isLoading } = useConvexQuery(
    api.dashboard.getEventDashboard,
    { eventId }
  );

  const { data: registrations, isLoading: loadingRegistrations } = useConvexQuery(
    api.registrations.getEventRegistrations, 
    { eventId }
  );

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  if (!dashboardData) {
    notFound(); // TODO: Fail more gracefully to the user, inform and allow a way back
  }

  const { event, stats } = dashboardData;

  // filter registrations based on active tab and search
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch = 
      reg.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.attendeeEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.qrCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch && reg.status === "confirmed";
    if (activeTab === "checked-in") return matchesSearch && reg.checkedIn && reg.status === "confirmed";
    if (activeTab === "pending") return matchesSearch && !reg.checkedIn && reg.status === "confirmed";

    return matchesSearch;
  });

  return (
    <div className='min-h-screen pb-20 px-4'>
      <div className='max-2-7xl mx-auto'>
        <div className='mb-6'>
          <Button
            variant='ghost'
            onClick={() => router.push("/my-events")}
            className='gap-2 -ml-2'
          >
            <ArrowLeft className='w-4 h-4' />
            Back to My Events
          </Button>
        </div>
      </div>
      {/* QR Scanner Modal */}
    </div>
  )
};

export default EventDashboard;