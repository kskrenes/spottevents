"use client";

import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { ArrowLeft, Calendar, CheckCircle, Clock, Download, Eye, Loader2, MapPin, QrCode, Search, TrendingUp, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import React, { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getCityStateString } from '@/lib/location-utils';
import { getCategoryIcon, getCategoryLabel } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';
import { Country } from 'country-state-city';
import { getCurrency } from 'locale-currency';
import getSymbolFromCurrency from 'currency-symbol-map';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import AttendeeCard from './_components/AttendeeCard';
import { toast } from 'sonner';
import QRScanerModal from './_components/qr-scanner-modal';

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

  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const currencyCode = useMemo(() => {
    if (!dashboardData || !dashboardData.event || !dashboardData.event.country) return "";
    const countryObj = allCountries.find(c => c.name === dashboardData.event.country);
    if (!countryObj) return "";
    return getCurrency(countryObj.isoCode) ?? "";
  }, [dashboardData]);

  const currencySymbol = useMemo(
    () => getSymbolFromCurrency(currencyCode) ?? "",
    [currencyCode]
  );

  if (isLoading || loadingRegistrations) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='w-8 h-8 animate-spin text-purple-500' />
      </div>
    );
  }

  if (!dashboardData || !registrations) {
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
        No data found.
      </div>
    )
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

  const handleExportCSV = () => {
    if (!registrations || registrations.length === 0) {
      toast.error("No registrations to export");
      return;
    }

    // escape characters that could corrupt CSV or become spreadsheet formulas
    const escapeCsvCell = (value) => {
      let cell = String(value ?? "");
      if (/^[=+\-@]/.test(cell)) {
        cell = `'${cell}`;
      }
      return `"${cell.replace(/"/g, '""')}"`;
    };

    const csvContent = [
      ["Name", "Email", "Registered At", "Checked In", "Checked In At", "QR Code"],
      ...registrations.map((reg) => [
        reg.attendeeName,
        reg.attendeeEmail,
        new Date(reg.registeredAt).toLocaleString(),
        reg.checkedIn ? "Yes" : "No",
        reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleString() : "-",
        reg.qrCode
      ])
    ]
      .map((row) => row.map(escapeCsvCell).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dashboardData?.event.title || "event"}_registrations.csv`;
    a.click();
    toast.success("CSV exported successfully");
  };

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

        {event.coverImage && (
          <div className='relative h-[350px] rounded-2xl overflow-hidden mb-6'>
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              className='object-cover'
              priority
            />
          </div>
        )}

        <div className='flex flex-col gap-5 sm:flex-row items-start justify-between mb-4'>
          <div className='flex-1'>
            <h1 className='text-3xl font-bold mb-3'>{event.title}</h1>
            <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
              <Badge variant='outline'>
                {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
              </Badge>

              <div className='flex items-center gap-1'>
                <Calendar className='w-4 h-4' />
                <span>{format(event.startDate, 'PPP')}</span>
              </div>

              <div className='flex items-center gap-1'>
                <MapPin className='w-4 h-4' />
                <span>{getCityStateString(event.city) + getCityStateString(event.state) + (event.country || '')}</span>
              </div>
            </div>
          </div>

          <div className='w-full sm:w-auto'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => router.push(`/events/${event.slug}`)}
              className='gap-2 flex-1'
            >
              <Eye className='w-4 h-4' />
              View
            </Button>
          </div>
        </div>

        {/* show QR scanner if event is today */}
        {stats.isEventToday && !stats.isEventPast && (
          <Button
            size='lg'
            className='mb-8 w-full gap-2 h-10 bg-linear-to-r from-orange-500 via-pink-500 to-red-500 text-white hover:scale-[1.02]'
            onClick={() => setShowQRScanner(true)}
          >
            <QrCode className='w-6 h-6' />
            Scan QR Code to Check In
          </Button>
        )}

        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
          <Card className='py-0'>
            <CardContent className='p-6 flex items-center gap-3'>
              <div className='p-3 bg-purple-100 rounded-lg'>
                <Users className='w-6 h-6 text-purple-600' />
              </div>
              <div>
                <p className='text-2xl font-bold'>{stats.totalRegistrations}/{stats.capacity}</p>
                <p className='text-sm text-muted-foreground'>Capacity</p>
              </div>
            </CardContent>
          </Card>

          <Card className='py-0'>
            <CardContent className='p-6 flex items-center gap-3'>
              <div className='p-3 bg-green-100 rounded-lg'>
                <CheckCircle className='w-6 h-6 text-green-600' />
              </div>
              <div>
                <p className='text-2xl font-bold'>{stats.checkedInCount}</p>
                <p className='text-sm text-muted-foreground'>Checked In</p>
              </div>
            </CardContent>
          </Card>

          {event.ticketType === "paid" ? (
            <Card className='py-0'>
              <CardContent className='p-6 flex items-center gap-3'>
                <div className='p-3 bg-blue-100 rounded-lg'>
                  <TrendingUp className='w-6 h-6 text-blue-600' />
                </div>
                <div>
                  <p className='text-2xl font-bold'>{currencySymbol}{stats.totalRevenue}</p>
                  <p className='text-sm text-muted-foreground'>Revenue</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className='py-0'>
              <CardContent className='p-6 flex items-center gap-3'>
                <div className='p-3 bg-orange-100 rounded-lg'>
                  <CheckCircle className='w-6 h-6 text-orange-600' />
                </div>
                <div>
                  <p className='text-2xl font-bold'>{stats.checkInRate}</p>
                  <p className='text-sm text-muted-foreground'>Check-In Rate</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className='py-0'>
            <CardContent className='p-6 flex items-center gap-3'>
              <div className='p-3 bg-amber-100 rounded-lg'>
                <Clock className='w-6 h-6 text-amber-600' />
              </div>
              <div>
                <p className='text-2xl font-bold'>
                  {stats.isEventPast 
                    ? 'Ended' 
                    : stats.hoursUntilEvent > 24
                      ? `${Math.floor(stats.hoursUntilEvent / 24)}d`
                      : stats.hoursUntilEvent > 0
                        ? `${Math.floor(stats.hoursUntilEvent)}h`
                        : `${Math.floor(stats.minsUntilEvent)}m`}
                </p>
                <p className='text-sm text-muted-foreground'>
                  {stats.isEventPast ? 'Event Over' : 'Time Left'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendee Management */}
        <h2 className='text-2xl font-bold mb-4'>Attendee Management</h2>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className='mb-4'>
            <TabsTrigger value='all'>
              All ({stats.totalRegistrations})
            </TabsTrigger>
            <TabsTrigger value='checked-in'>
              Checked In ({stats.checkedInCount})
            </TabsTrigger>
            <TabsTrigger value='pending'>
              Pending ({stats.pendingCount})
            </TabsTrigger>
          </TabsList>

          {/* Search and Actions */}
          <div className='flex gap-3 mb-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input 
                placeholder='Search by name, email, or QR code...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>

            <Button
              variant='outline'
              onClick={handleExportCSV}
              className='gap-2'
            >
              <Download className='w-4 h-4' />
              Export CSV
            </Button>
          </div>

          <TabsContent value={activeTab} className='space-y-3 mt-0'>
            {filteredRegistrations && filteredRegistrations.length > 0 ? (
              filteredRegistrations.map((reg) => (
                <AttendeeCard key={reg._id} registration={reg} />
              ))
            ) : (
              <div className='text-center py-12 text-muted-foreground'>No attendees found</div>
            )}
          </TabsContent>
        </Tabs>

      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanerModal isOpen={showQRScanner} onClose={() => setShowQRScanner(false)}/>
      )}
    </div>
  )
};

export default EventDashboard;