"use client";

import { api } from '@/convex/_generated/api';
import { useConvexMutation, useConvexQuery } from '@/hooks/use-convex-query';
import { NUM_SEARCH_RESULTS } from '@/lib/layout-utils';
import { City, Country, State } from 'country-state-city';
import { Calendar, Loader2, MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from './ui/input';
import { debounce } from 'lodash';
import { getCategoryIcon } from '@/lib/data';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { createLocationSlug } from '@/lib/location-utils';

const SearchLocationBar = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const searchRef = useRef(null);
 
  const { data: currentUser, isLoading } = useConvexQuery(
    api.users.getCurrentUser
  );
  const { mutate: updateLocation } = useConvexMutation(
    api.users.completeOnboarding
  );
  const { data: searchResults, isLoading: searchLoading } = useConvexQuery(
    api.search.searchEvents,
    searchQuery.trim().length >= 2 ? { query: searchQuery, limit: NUM_SEARCH_RESULTS } : "skip"
  );

  useEffect(() => {
    if (currentUser?.location) {
      setSelectedCountry(currentUser.location.country || "");
      setSelectedState(currentUser.location.state || "");
      setSelectedCity(currentUser.location.city || "");
    }
  }, [currentUser, isLoading]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });

  const allCountries = useMemo(() => Country.getAllCountries(), []);

  const allStates = useMemo(() => {
    if (!selectedCountry) return [];
    const countryObj = allCountries.find(c => c.name === selectedCountry);
    if (!countryObj) return [];
    return State.getStatesOfCountry(countryObj.isoCode);
  }, [selectedCountry, allCountries]);

  const allCities = useMemo(() => {
    if (!selectedCountry || !selectedState) return [];
    const countryObj = allCountries.find(c => c.name === selectedCountry);
    if (!countryObj) return [];
    const stateObj = allStates.find(s => s.name === selectedState);
    if (!stateObj) return [];
    return City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode);
  }, [selectedCountry, selectedState, allStates, allCountries]);

  const debounceSetQuery = useRef(
    debounce((value) => setSearchQuery(value), 300)
  ).current;

  // cancel pending debounced calls when component unmounts
  useEffect(() => {
    return () => {
      debounceSetQuery.cancel();
    };
  }, [debounceSetQuery]);

  const handleSearchInput = (e) => {
    const value = e.target.value;
    debounceSetQuery(value);
    setShowSearchResults(value.length >= 2);
  };

  const handleEventClick = (slug) => {
    setShowSearchResults(false);
    setSearchQuery("");
    router.push(`/events/${slug}`);
  }

  const handleLocationSelect = async (city, state, country) => {
    try {
      if (currentUser?.interests && currentUser?.location) {
        await updateLocation({
          location: {city, state, country},
          interests: currentUser.interests,
        })
      }
      const slug = createLocationSlug(city, state, country);
      router.push(`/explore/${slug}`)
    } catch (error) {
      console.error("Failed to update location:", error);
    }
  }

  return (
    <div className='flex items-center'>
      <div className='relative flex w-full' ref={searchRef}>
        <div className='flex-1'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search events...' 
            className='pl-10 w-full h-9 rounded-none rounded-l-md'
            onFocus={() => {if (searchQuery.length >= 2) setShowSearchResults(true)}}
            onChange={handleSearchInput}
          />
        </div>

        {showSearchResults && (
          <div className='absolute top-full mt-2 w-96 bg-background border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto'>
            {searchLoading ? (
              <div className='p-4 flex items-center justify-center'>
                <Loader2 className='w-5 h-5 animate-spin text-purple-500' />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className='py-2'>
                <p className='px-4 py-2 text-xs font-semibold text-muted-foreground'>SEARCH RESULTS</p>
                {searchResults.map((event) => (
                  <button 
                    key={event._id} 
                    className='w-full px-4 py-3 hover:bg-muted/50 text-left transition-colors'
                    onClick={() => handleEventClick(event.slug)}
                  >
                    <div className='flex items-start gap-3'>
                      <div className='text-2xl mt-0.5'>
                        {getCategoryIcon(event.category)}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='font-medium mb-1 line-clamp-1'>
                          {event.title}
                        </p>
                        <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                          <span className='flex items-center gap-1'>
                            <Calendar className='w-3 h-3' />
                            {format(event.startDate, "MMM dd")}
                          </span>
                          <span className='flex items-center gap-1'>
                            <MapPin className='w-3 h-3' />
                            {event.city}
                          </span>
                        </div>
                      </div>
                      {event.ticketType === 'free' && (
                        <Badge variant="secondary" className="text-xs">
                          Free
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Select 
        value={selectedCountry} 
        onValueChange={(value) => {
          setSelectedCountry(value);
          setSelectedState("");
          setSelectedCity("");
        }}
      >
        <SelectTrigger id="country" className="w-32 h-9 border-l-0 rounded-none">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          {allCountries.map((country) => (
            <SelectItem key={country.isoCode} value={country.name}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    
      <Select 
        value={selectedState} 
        onValueChange={(value) => {
          setSelectedState(value);
          setSelectedCity("");
        }}
        disabled={!selectedCountry}
      >
        <SelectTrigger id="state" className="w-32 h-9 border-l-0 rounded-none">
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          {allStates.map((state) => (
            <SelectItem key={state.isoCode} value={state.name}>
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    
      <Select 
        value={selectedCity} 
        onValueChange={(value) => {
          setSelectedCity(value);
          if (value && selectedState && selectedCountry) {
            handleLocationSelect(value, selectedState, selectedCountry);
          }
        }}
        disabled={!selectedState}
      >
        <SelectTrigger id="city" className="w-32 h-9 border-l-0 rounded-none rounded-r-md">
          <SelectValue placeholder="City" />
        </SelectTrigger>
        <SelectContent>
          {allCities.length > 0 ? (
            allCities.map((city) => (
              <SelectItem key={city.name} value={city.name}>
                {city.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem key="no-cities" value="no-cities" disabled>
              No cities available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      
    </div>
  )
}

export default SearchLocationBar