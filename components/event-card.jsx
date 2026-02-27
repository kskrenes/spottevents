import React from 'react'
import { Card, CardContent } from './ui/card'
import Image from 'next/image'
import { getCategoryIcon, getCategoryLabel } from '@/lib/data'
import { format } from 'date-fns'
import { Calendar, Eye, MapPin, QrCode, Trash2, Users, X } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { getCityStateString } from '@/lib/location-utils'

const EventCard = ({
  event,
  onClick,
  onDelete,
  variant = 'grid', // "grid" | "list"
  action = null,    // "event" | "ticket" | "cancelled" | null
  className = '',
  priority = false,
}) => {
  if (variant === 'list') {
    return (
      <Card 
        className={`py-0 group ${onClick ? 'cursor-pointer hover:shadow-lg transition-all hover:border-purple-500/50' : ''} ${className}`}
        onClick={onClick}
        {...(onClick && {
          tabIndex: 0,
          role: "button",
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }
        })}
      >
        <CardContent className='p-3 flex gap-3'>
          <div className='w-20 h-20 relative rounded-lg shrink-0 overflow-hidden'>
            {event.coverImage ? (
              <Image 
                src={event.coverImage} 
                alt={event.title} 
                fill 
                sizes='80px'
                fetchPriority={priority ? 'high' : 'low'}
                className='object-cover' 
              />
            ) : (
              <div 
                className='absolute inset-0 flex items-center justify-center text-3xl' 
                style={{backgroundColor: event.themeColor}}
              >
                {getCategoryIcon(event.category)}
              </div>
            )}
          </div>

          <div className='flex-1 min-w-0'>
            <h3 className='text-sm font-semibold mb-1 group-hover:text-purple-400 transition-colors line-clamp-2'>
              {event.title}
            </h3>
            <p className='text-xs text-muted-foreground mb-1'>
              {event.startDate ? format(event.startDate, "EEE, dd MMM, HH:mm") : 'Date TBD'}
            </p>
            <div className='flex items-center gap-1 text-xs text-muted-foreground mb-1'>
              <MapPin className='w-3 h-3' />
              <span className='line-clamp-1'>
                {event.locationType === 'online' ? 'Online Event' : event.city}
              </span>
            </div>
            <div className='flex items-center gap-1 text-xs text-muted-foreground'>
              <Users className='w-3 h-3' />
              <span>{event.registrationCount} registered</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={`overflow-hidden group pt-0 ${onClick ? 'cursor-pointer hover:shadow-lg transition-all hover:border-purple-500/50' : ''} ${className}`}
      onClick={onClick}
      {...(onClick && {
        tabIndex: 0,
        role: "button",
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }
      })}
    >
      <div className='relative h-48 overflow-hidden'>
        {event.coverImage ? (
          <Image 
            src={event.coverImage} 
            alt={event.title} 
            fill 
            sizes='(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
            fetchPriority={priority ? 'high' : 'low'}
            className='w-full h-full object-cover group-hover:scale-105 transition-transform' 
          />
        ) : (
          <div 
            className='w-full h-full flex items-center justify-center text-4xl' 
            style={{backgroundColor: event.themeColor}}
          >
            {getCategoryIcon(event.category)}
          </div>
        )}
        <div className='absolute top-3 right-3'>
          <Badge variant='secondary'>
            {event.ticketType === 'free' ? 'Free' : 'Paid'}
          </Badge>
        </div>
      </div>

      <CardContent className='space-y-3'>
        <div>
          <Badge variant='outline' className='mb-2'>
            {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
          </Badge>
          <h3 className='text-lg font-semibold line-clamp-2 group-hover:text-purple-400 transition-colors'>
            {event.title}
          </h3>
        </div>
        <div className='space-y-2 text-sm text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <Calendar className='w-4 h-4' />
            <span>
              {event.startDate 
                ? format(event.startDate, "PPP") 
                : 'Date TBD'}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <MapPin className='w-4 h-4' />
            <span className='line-clamp-1'>
              {event.locationType === 'online' 
                ? 'Online Event' 
                : getCityStateString(event.city) + getCityStateString(event.state) + (event.country || '')}
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <Users className='w-4 h-4' />
            <span>
              {event.capacity 
                ? `${event.registrationCount} / ${event.capacity} registered` 
                : `${event.registrationCount} registered`}
            </span>
          </div>
        </div>

        {action && (
          <div className='flex items-center gap-2'>
            <Button 
              variant='outline' 
              size='sm' 
              className='flex-1' 
              onClick={(e) => {e.stopPropagation(); onClick?.(e);}}
            >
              {action === "event" || action === "cancelled" ? (
                <>
                  <Eye className='w-4 h-4' />
                  View Event
                </>
              ) : (
                <>
                  <QrCode className='w-4 h-4' />
                  Show Ticket
                </>
              )}
            </Button>
            {onDelete && (action === "event" || action === "ticket") && (
              <Button 
                variant='outline' 
                size='sm' 
                className='text-red-500 hover:text-red-600 hover:bg-red-50' 
                aria-label={action === "event" ? "Delete event" : "Cancel ticket"}
                title={action === "event" ? "Delete event" : "Cancel ticket"}
                onClick={(e) => {e.stopPropagation(); onDelete(event._id);}}
              >
                {action === "event" ? <Trash2 className='w-4 h-4' /> : <X className='w-4 h-4' />}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EventCard