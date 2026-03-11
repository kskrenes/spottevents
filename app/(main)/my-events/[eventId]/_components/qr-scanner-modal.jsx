"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';
import React from 'react'

const QRScanerModal = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <QrCode className='w-5 h-5 text-purple-500' />Check In Attendee
          </DialogTitle>
          <DialogDescription>
            Scan QR code or enter ticket ID manually
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

export default QRScanerModal