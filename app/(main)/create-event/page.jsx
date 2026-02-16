"use client";

import { api } from '@/convex/_generated/api';
import { useConvexMutation, useConvexQuery } from '@/hooks/use-convex-query';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { City, Country, State } from 'country-state-city';
import { DEFAULT_EVENT_COLOR, PRO_EVENT_COLORS } from '@/lib/layout-utils';
import UpgradeModal from '@/components/upgrade-modal';
import Image from 'next/image';
import UnsplashImagePicker from '@/components/unsplash-image-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar1Icon, Crown, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/lib/data';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const eventSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().min(20, "Description must be at least 20 characters long"),
  category: z.string().min(1, "Please select a category"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  startTime: z.string().regex(timeRegex, "Start time must be HH:MM"),
  endTime: z.string().regex(timeRegex, "End time must be HH:MM"),
  locationType: z.enum(["physical", "online"]).default("physical"),
  venue: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  ticketType: z.enum(["free", "paid"]).default("free"),
  ticketPrice: z.number().optional(),
  coverImage: z.string().optional(),
  themeColor: z.string().default(DEFAULT_EVENT_COLOR),
});

const CreateEvent = () => {

  const router = useRouter();
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("limit");

  const { has } = useAuth();
  const hasPro = has?.({ plan: "pro" });

  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const { mutate: createEvent, isLoading } = useConvexMutation(api.events.createEvent);

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      locationType: "physical",
      ticketType: "free",
      capacity: 50,
      themeColor: DEFAULT_EVENT_COLOR,
      category: "",
      country: "",
      state: "",
      city: "",
      startTime: "",
      endTime: "",
    }
  })

  const themeColor = watch("themeColor");
  const ticketType = watch("ticketType");
  const selectedCountry = watch("country");
  const selectedState = watch("state");
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const coverImage = watch("coverImage");

  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const anguilla = useMemo(() => {
    const countryObj = allCountries.find(c => c.name === "Anguilla");
    console.log("Anguilla States: ", State.getStatesOfCountry(countryObj.isoCode));
    console.log("Anguilla Cities: ", City.getCitiesOfCountry(countryObj.isoCode));
    return countryObj;
  }, [allCountries]);
  
  const allStates = useMemo(() => {
    const noState = [{
      name: "[No State]",
      isoCode: "[No State]",
      countryCode: "[No State]",
      latitude: "[No State]",
      longitude: "[No State]"
    }];
    if (!selectedCountry) return noState;
    const countryObj = allCountries.find(c => c.name === selectedCountry);
    if (!countryObj) return noState;
    const states = State.getStatesOfCountry(countryObj.isoCode);
    if (states?.length === 0) return noState;
    return states;
  }, [selectedCountry, allCountries]);

  const allCities = useMemo(() => {
    const noCity = [{
      name: "[No City]",
      stateCode: "[No City]",
      countryCode: "[No City]",
      latitude: "[No City]",
      longitude: "[No City]"
    }];
    if (!selectedCountry) return noCity;
    const countryObj = allCountries.find(c => c.name === selectedCountry);
    if (!countryObj) return noCity;
    // If country has no states, get cities directly from country
    const states = State.getStatesOfCountry(countryObj.isoCode);
    if (states.length === 0) {
      const countryCities = City.getCitiesOfCountry(countryObj.isoCode) || noCity;
      if (countryCities.length === 0) return noCity;
      return countryCities;
    }
    const stateObj = states.find(s => s.name === selectedState);
    if (!stateObj) return noCity;

    const stateCities = City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode);
    if (stateCities.length === 0) return noCity
    return stateCities;
  }, [selectedCountry, selectedState, allStates, allCountries]);

  // color presets - show all for pro, only default for free
  const colorPresets = [
    DEFAULT_EVENT_COLOR,
    ...(hasPro ? PRO_EVENT_COLORS : []),
  ]

  const handleColorClick = (color) => {
    // check for pro if color selected is not the default color
    if (color !== DEFAULT_EVENT_COLOR && !hasPro) {
      setUpgradeReason("color");
      setShowUpgradeModal(true);
      return;
    }
    setValue("themeColor", color);
  }

  const combineDateTime = (date, time) => {
    if (!date || !time) return null;
    const [hh, mm] = time.split(":").map(Number);

    const d = new Date(date);
    d.setHours(hh, mm, 0, 0);
    return d;
  }

  const onSubmit = async (data) => {
    try {
      const start = combineDateTime(data.startDate, data.startTime);
      const end = combineDateTime(data.endDate, data.endTime);

      if (!start || !end) {
        toast.error("Please select both date and time for start and end.");
        return;
      }

      if (end.getTime() <= start.getTime()) {
        toast.error("end date/time must be after start date/time.");
        return;
      }

      if (!hasPro && currentUser?.freeEventsCreated >= 1) {
        setUpgradeReason("limit");
        setShowUpgradeModal(true);
        return;
      }

      if (data.themeColor !== DEFAULT_EVENT_COLOR && !hasPro) {
        setUpgradeReason("color");
        setShowUpgradeModal(true);
        return;
      }

      await createEvent({
        title: data.title,
        description: data.description,
        category: data.category,
        tags: [data.category],
        startDate: start.getTime(),
        endDate: end.getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locationType: data.locationType,
        venue: data.venue || undefined,
        address: data.address || undefined,
        city: data.city,
        state: data.state || undefined,
        country: data.country,
        capacity: data.capacity,
        ticketType: data.ticketType,
        ticketPrice: data.ticketPrice || undefined,
        coverImage: data.coverImage || undefined,
        themeColor: data.themeColor,
        hasPro: hasPro,
      });

      toast.success("Event created successfully! 🎉")
      router.push("/my-events");
    } catch (error) {
      toast.error(error.message || "Failed to create event");
    }
  }

  return (
    <div 
      style={{ backgroundColor: themeColor }}
      className='min-h-screen transition-colors duration-300 px-6 py-8 -mt-16 lg:rounded-md'
    >
      <div className='max-w-6xl mx-auto flex flex-col gap-5 md:flex-row justify-between mb-10'>
        <div>
          <h1 className='text-4xl font-bold'>Create Event</h1>
          {!hasPro && (
            <p className='text-sm text-muted-foreground mt-2'>
              Free: {currentUser?.freeEventsCreated || 0}/1 events created
            </p>
          )}
        </div>

        {/* Ai Event Creator */}
      </div>

      <div className='max-w-6xl mx-auto grid md:grid-cols-[320px_1fr] gap-10'>
        <div className='space-y-6'>
          <div 
            className='aspect-square w-full rounded-xl overflow-hidden flex items-center justify-center cursor-pointer border'
            onClick={() => setShowImagePicker(true)}
          >
            {coverImage ? (
              <Image 
                src={coverImage}
                alt="Cover"
                className='w-full h-full object-cover'
                width={500}
                height={500}
              />
            ) : (
              <span className='opacity-60 text-sm'>
                Add cover image
              </span>
            )}
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-sm'>Theme Color</Label>
              {!hasPro && (
                <Badge variant='secondary' className='text-xs gap-1'>
                  <Crown className='w-3 h-3' />
                  Pro
                </Badge>
              )}
            </div>

            <div className='flex gap-2 flex-wrap'>
              {colorPresets.map((color) => (
                <button 
                  key={color}
                  type='button'
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    !hasPro && color !== DEFAULT_EVENT_COLOR
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:scale-110'
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: themeColor === color ? 'white' : 'transparent',
                  }}
                  onClick={() => handleColorClick(color)}
                  title={
                    !hasPro && color !== DEFAULT_EVENT_COLOR
                      ? 'Upgrade to Pro for custom colors'
                      : ''
                  }
                />
              ))}

              {!hasPro && (
                <button
                  type='button'
                  onClick={() => {
                    setUpgradeReason('color');
                    setShowUpgradeModal(true);
                  }}
                  className='w-10 h-10 rounded-full border-2 border-dashed border-purple-300 flex items-center justify-center hover:border-purple-500 transition-colors'
                  title='Unlock more colors with Pro'
                >
                  <Sparkles className='w-5 h-5 text-purple-400' />
                </button>
              )}
            </div>
            {!hasPro && (
              <p className='text-xs text-muted-foreground'>
                Upgrade to Pro to unlock custom theme colors
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-8'>
          <div>
            <Input 
              {...register("title")}
              placeholder='Event Name'
              className='text-3xl font-semibold bg-transparent border-none focus-visible:ring-0'
            />
            {errors.title && (
              <p className='text-sm text-red-400 mt-1'>
                {errors.title.message}
              </p>
            )}
          </div>
 
          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-2'>
              <Label className='text-sm'>Start</Label>
              <div className='grid grid-cols-[1fr_auto] gap-2'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant='outline' className='w-full justify-between'>
                      {startDate ? format(startDate, "PPP") : "Choose date"}
                      <Calendar1Icon className='w-4 h-4 opacity-60' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='p-0'>
                    <Calendar 
                      mode='single' 
                      selected={startDate} 
                      onSelect={(date) => setValue("startDate", date)} 
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type='time'
                  {...register("startTime")}
                  placeholder='hh:mm'
                />
              </div>
              {(errors.startDate || errors.startTime) && (
                <p className='text-sm text-red-400'>
                  {errors.startDate?.message || errors.startTime?.message}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label className='text-sm'>End</Label>
              <div className='grid grid-cols-[1fr_auto] gap-2'>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant='outline' className='w-full justify-between'>
                      {endDate ? format(endDate, "PPP") : "Choose date"}
                      <Calendar1Icon className='w-4 h-4 opacity-60' />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='p-0'>
                    <Calendar 
                      mode='single' 
                      selected={endDate} 
                      onSelect={(date) => setValue("endDate", date)} 
                      disabled={(date) => date < (startDate || new Date())}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type='time'
                  {...register("endTime")}
                  placeholder='hh:mm'
                />
              </div>
              {(errors.endDate || errors.endTime) && (
                <p className='text-sm text-red-400'>
                  {errors.endDate?.message || errors.endTime?.message}
                </p>
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Category</Label>
            <Controller
              control={control}
              name='category'
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select category' />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p className='text-sm text-red-400'>{errors.category.message}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Location</Label>

            <div className='grid grid-cols-3 gap-4'>
              <Controller
                control={control}
                name='country'
                render={({ field }) => (
                  <Select 
                    value={field.value} 
                    onValueChange={(val) => {
                      field.onChange(val);
                      setValue("state", "");
                      setValue("city", "");
                    }}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select country' />
                    </SelectTrigger>
                    <SelectContent>
                      {allCountries.map((country) => (
                        <SelectItem key={country.isoCode} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name='state'
                render={({ field }) => (
                  <Select 
                    value={field.value} 
                    onValueChange={(val) => {
                      field.onChange(val);
                      setValue("city", "");
                    }}
                    disabled={!selectedCountry}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder={selectedCountry ? 'Select state' : 'Select country first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {allStates.map((state) => (
                        <SelectItem key={state.isoCode} value={state.name}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name='city'
                render={({ field }) => (
                  <Select 
                    value={field.value} 
                    onValueChange={(val) => field.onChange(val)}
                    disabled={!selectedState && allCities.length === 0}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder={selectedState ? 'Select city' : 'Select state first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {allCities.map((city) => (
                        <SelectItem key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className='space-y-2 mt-6'>
              <Label className='text-sm'>Venue Details</Label>

              <Input 
                {...register("venue")}
                placeholder="Venue link (Google Maps Link)"
                type="url"
              />

              {errors.venue && (
                <p className='text-sm text-red-400'>{errors.venue.message}</p>
              )}

              <Input
                {...register("address")}
                placeholder="Full address / street / building (optional)"
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Description</Label>
            <Textarea
              {...register("description")}
              placeholder='Tell people about your event...'
              rows={4}
            />
            {errors.description && (
              <p className='text-sm text-red-400'>{errors.description.message}</p>
            )}
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Tickets</Label>

            <div className='flex items-center gap-6'>
              <label className='flex items-center gap-2'>
                <input
                  type='radio'
                  value='free'
                  {...register("ticketType")}
                  defaultChecked
                />
                Free
              </label>
              <label className='flex items-center gap-2'>
                <input
                  type='radio'
                  value='paid'
                  {...register("ticketType")}
                />
                Paid
              </label>
            </div>

            {ticketType === "paid" && (
              <Input
                type='number'
                placeholder='Ticket price'
                {...register("ticketPrice", { valueAsNumber: true })}
              />
            )}
          </div>

          <div className='space-y-2'>
            <Label className='text-sm'>Capacity</Label>
            <Input
              type='number'
              {...register("capacity", { valueAsNumber: true })}
              placeholder='Ex: 100'
            />
            {errors.capacity && (
              <p className='text-sm text-red-400'>{errors.capacity.message}</p>
            )}
          </div>

          <Button
            type='submit'
            disabled={isLoading}
            className='w-full py-6 text-lg rounded-xl'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' /> Creating...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </div>
      
      {showImagePicker && (
        <UnsplashImagePicker 
          isOpen={showImagePicker}
          onClose={() => setShowImagePicker(false)}
          onSelect={(url) => {
            setValue("coverImage", url);
            setShowImagePicker(false);
          }}
        />
      )}

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger={upgradeReason}
      />
    </div>
  )
}

export default CreateEvent