"use client";

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import React, { useState } from 'react'
import { toast } from 'sonner';

const AiEventCreator = ({ onEventGenerated }) => {

  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const generateEvent = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe your event");
      return;
    }

    setLoading(true);
    try {
      console.log("attempting POST to /api/generate-event");
      
      const response = await fetch("/api/generate-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate event");
      }
      
      onEventGenerated(data);
      toast.success("Event details generated! Review and customize below.");
      setIsOpen(false);
      setPrompt("");
    } catch (error) {
      toast.error("Failed to generate event. Please try again.");
      console.error("Failed to generate event: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' className='gap-2'>
          <Sparkles className='w-4 h-4' />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Sparkles className='w-5 h-5 text-purple-500' />
            AI Event Creator
          </DialogTitle>
          <DialogDescription>Describe your event idea and let AI create the details for you.</DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <Textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Example: A tech meetup about React 19 for developers in Denver. It should cover new features like Actions and use hook improvements...'
            rows={6}
            className='resize-none'
          />
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => setIsOpen(false)}
              className='flex-1'
            >
              Cancel
            </Button>

            <Button
              onClick={generateEvent}
              disabled={loading || !prompt.trim()}
              className='flex-1 gap-2'
            >
              {loading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className='w-4 h-4' />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AiEventCreator