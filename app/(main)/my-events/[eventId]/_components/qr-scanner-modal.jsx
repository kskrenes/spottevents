"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/convex/_generated/api';
import { useConvexMutation } from '@/hooks/use-convex-query';
import { Loader2, QrCode } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';

const QRScanerModal = ({ isOpen, onClose }) => {

  const [scannerReady, setScannerReady] = useState(false);
  const [error, setError] = useState(null);

  const { mutate: checkInAttendee } = useConvexMutation(
    api.registrations.checkInAttendee
  );

  const handleCheckIn = async (qrCode) => {
    try {
      const result = await checkInAttendee({
        qrCode,
      });
      if (result.success) {
        toast.success("Attendee checked in successfully");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error.message || "Failed to check in attendee");
    }
  };

  useEffect(() => {
    let scanner = null;
    let mounted = true;

    const initScanner = async () => {
      if (!isOpen) return;

      // reset states
      setError(null);
      setScannerReady(false);

      try {
        // check camera permissions
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((track) => track.stop());

          // console.log("Camera permission granted"); // TODO: remove logging

        } catch (permissionError) {
          console.error("Camera permission denied:", permissionError);
          setError("Camera permission denied. Please enable camera access.");
          return;
        }

        // import qr code scanner library
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!mounted) return;

        // console.log("Creating scanner instance..."); // TODO: remove logging
        
        scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            videoConstraints: {
              facingMode: "environment",  // use back camera on mobile
            },
          },
          false // verbose = true|false
        );

        const onScanSuccess = (decodedText) => {

          // console.log("QR code detected: ", decodedText); // TODO: remove logging

          if (scanner) {
            scanner.clear().catch(console.error);
          }
          handleCheckIn(decodedText);

          // reinitialize scanner after successful scan
          initScanner();
        };

        const onScanError = (error) => {
          // skip "no QR code found" messages
          if (error && !error.includes("NotFoundException")) {
            console.debug("Scan error:", error);
          }
        };

        scanner.render(onScanSuccess, onScanError);
        setScannerReady(true);
        setError(null);

        // console.log("Scanner rendered successfully"); // TODO: remove logging
        
      } catch (error) {
        console.error("Failed to initialize scanner:", error);
        setError(`Failed to start camera: ${error.message}`);
        toast.error("Camera failed. Please use the manual check-in option under Attendee Management.");
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (scanner) {

        // console.log("Cleaning up scanner..."); // TODO: remove logging

        scanner.clear().catch(console.error);
      }

      setScannerReady(false);
    };
  }, [isOpen]);

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

        {error ? (
          <div className='text-red-500 text-sm'>{error}</div>
        ) : (
          <>
            <div id='qr-reader' className='w-full' style={{ minHeight: '350px' }}></div>
            {!scannerReady && (
              <div className='flex items-center justify-center py-4'>
                <Loader2 className='w-6 h-6 animate-spin text-purple-500' />
                <span className='ml-2 text-sm text-muted-foreground'>Starting camera...</span>
              </div>
            )}
            <p className='text-sm text-muted-foreground text-center'>
              {scannerReady
                ? "Position the QR code within the frame"
                : "Please allow camera access when prompted"}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default QRScanerModal